import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 転移学習とファインチューニング

## 転移学習とは

> 転移学習（Transfer Learning）とは、あるタスクや領域で学習した**知識（重み）を別のタスクに再利用する**手法である。大規模データセットで事前学習されたモデルの特徴表現を活用することで、少ないデータ・少ない計算資源で高い性能を実現できる。

ImageNet（120万枚以上の画像）で学習した CNN は、低レベルな特徴（エッジ、テクスチャ）から高レベルな特徴（物体のパーツ、形状）まで汎用的な表現を学習しており、様々なタスクへの転用に優れている。

---

## 転移学習のアプローチ

| アプローチ | 概要 | 適用条件 |
|---|---|---|
| 特徴抽出（Feature Extraction） | 事前学習済み重みを固定し、出力層のみ学習 | 小規模データ、元ドメインに近い |
| ファインチューニング（Fine-tuning） | 事前学習済み重みを初期値として全体を再学習 | 中〜大規模データ |
| 段階的ファインチューニング | 後半層から順次解凍して学習 | データが中程度 |
| ドメイン適応（Domain Adaptation） | ソース・ターゲットドメイン間の分布差を縮小 | ドメインが異なる場合 |

---

## 特徴抽出 vs ファインチューニング

```
特徴抽出:
  [事前学習済みBackbone: 重みを固定(freeze)] → [新しい分類器: 学習]
  
  利点: 過学習しにくい、計算コスト小
  欠点: ターゲットタスクへの適応が限定的

ファインチューニング:
  [事前学習済みBackbone: 重みを更新(低lr)] → [新しい分類器: 学習(高lr)]
  
  利点: ターゲットタスクへ十分に適応
  欠点: データが少ないと過学習のリスク
```

---

## 学習率の設定戦略

ファインチューニングでは層によって異なる学習率を設定する（Discriminative Learning Rate）。

| 層の深さ | 学習率の目安 | 理由 |
|---|---|---|
| 入力に近い層（低レベル特徴） | 非常に小さい（1e-5 程度）または固定 | 汎用的な特徴を壊さない |
| 中間層 | 小さい（1e-4 程度） | 一般的な特徴を微調整 |
| 出力に近い層（高レベル特徴） | 大きめ（1e-3 程度） | タスク固有の特徴を学習 |
| 新規追加した出力層 | 最大（1e-2 程度） | ゼロから学習 |

---

## PyTorch による実装

### 特徴抽出（Feature Extraction）

```python
import torch
import torch.nn as nn
import torchvision.models as models


def create_feature_extractor(num_classes: int, freeze_backbone: bool = True):
    """
    ResNet50 を使った特徴抽出モデルを作成する
    Args:
        num_classes: 分類クラス数
        freeze_backbone: True の場合、Backbone の重みを固定
    """
    # 事前学習済み ResNet50 の読み込み
    model = models.resnet50(weights="IMAGENET1K_V2")

    if freeze_backbone:
        # Backbone の全パラメータを固定
        for param in model.parameters():
            param.requires_grad = False

    # 出力層を新しいタスク用に置き換え
    in_features = model.fc.in_features  # ResNet50: 2048
    model.fc = nn.Sequential(
        nn.Dropout(p=0.5),
        nn.Linear(in_features, 256),
        nn.ReLU(),
        nn.Linear(256, num_classes)
    )
    # 新しい出力層は requires_grad=True がデフォルトで有効

    # 学習対象パラメータの確認
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total = sum(p.numel() for p in model.parameters())
    print(f"学習対象パラメータ: {trainable:,} / 全体: {total:,} ({100*trainable/total:.1f}%)")

    return model


# 使用例
model = create_feature_extractor(num_classes=10, freeze_backbone=True)
```

### ファインチューニング（段階的解凍）

```python
def create_finetune_model(num_classes: int):
    """段階的ファインチューニング用モデルの作成"""
    model = models.resnet50(weights="IMAGENET1K_V2")

    # まず全層を固定
    for param in model.parameters():
        param.requires_grad = False

    # 出力層の置き換え
    in_features = model.fc.in_features
    model.fc = nn.Linear(in_features, num_classes)

    return model


def unfreeze_layers(model, num_layers_to_unfreeze: int):
    """
    後ろから指定した数の層を解凍する
    ResNet50 の主要レイヤー: layer1, layer2, layer3, layer4, fc
    """
    # 全パラメータをリスト化
    all_params = list(model.named_parameters())

    # 後ろから num_layers_to_unfreeze 分を解凍
    unfreeze_threshold = len(all_params) - num_layers_to_unfreeze * 10
    for i, (name, param) in enumerate(all_params):
        if i >= unfreeze_threshold:
            param.requires_grad = True
            print(f"  解凍: {name}")


def train_with_progressive_unfreezing(model, train_loader, num_epochs=30):
    """段階的ファインチューニングの学習ループ"""
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = model.to(device)
    criterion = nn.CrossEntropyLoss()

    # フェーズ1: 出力層のみ学習（初期 5 エポック）
    print("=== Phase 1: 出力層のみ学習 ===")
    optimizer = torch.optim.Adam(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=1e-3
    )
    _train_loop(model, train_loader, criterion, optimizer, device, epochs=5)

    # フェーズ2: layer4 + fc を解凍
    print("\n=== Phase 2: 上位層を解凍 ===")
    for name, param in model.named_parameters():
        if "layer4" in name or "fc" in name:
            param.requires_grad = True

    optimizer = torch.optim.Adam([
        {"params": model.layer4.parameters(), "lr": 1e-4},
        {"params": model.fc.parameters(), "lr": 1e-3},
    ])
    _train_loop(model, train_loader, criterion, optimizer, device, epochs=10)

    # フェーズ3: 全体をファインチューニング（低学習率）
    print("\n=== Phase 3: 全層ファインチューニング ===")
    for param in model.parameters():
        param.requires_grad = True

    optimizer = torch.optim.Adam([
        {"params": model.layer1.parameters(), "lr": 1e-5},
        {"params": model.layer2.parameters(), "lr": 1e-5},
        {"params": model.layer3.parameters(), "lr": 1e-4},
        {"params": model.layer4.parameters(), "lr": 1e-4},
        {"params": model.fc.parameters(), "lr": 1e-3},
    ])
    _train_loop(model, train_loader, criterion, optimizer, device, epochs=15)

    return model


def _train_loop(model, loader, criterion, optimizer, device, epochs):
    model.train()
    for epoch in range(epochs):
        total_loss = 0.0
        correct = 0
        total = 0
        for images, labels in loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            total_loss += loss.item()
            correct += (outputs.argmax(1) == labels).sum().item()
            total += labels.size(0)

        acc = correct / total
        print(f"  Epoch {epoch+1}/{epochs}: Loss={total_loss/len(loader):.4f}, Acc={acc:.4f}")
```

### Hugging Face Transformers を使った転移学習

```python
from transformers import AutoModelForImageClassification, AutoFeatureExtractor
import torch
from torch.optim import AdamW

# 事前学習済み ViT の読み込み
model_name = "google/vit-base-patch16-224"
feature_extractor = AutoFeatureExtractor.from_pretrained(model_name)
model = AutoModelForImageClassification.from_pretrained(
    model_name,
    num_labels=10,          # カスタムクラス数
    ignore_mismatched_sizes=True  # 出力層のサイズ変更を許可
)

# 分類ヘッドだけ学習する場合
for name, param in model.named_parameters():
    if "classifier" not in name:
        param.requires_grad = False

# 学習
optimizer = AdamW(
    filter(lambda p: p.requires_grad, model.parameters()),
    lr=2e-5
)
```

---

## ドメイン適応

### ドメイン適応のシナリオ

```
Source Domain: 大量のラベル付きデータ（例：合成画像）
Target Domain: 少量またはラベルなしデータ（例：実世界画像）

課題: 両ドメイン間の分布のシフト（Covariate Shift）
```

### 主なアプローチ

| 手法 | 概要 |
|---|---|
| Feature Alignment | 両ドメインの特徴分布を揃える |
| DANN（Domain Adversarial NN） | ドメイン識別器を騙す特徴を学習 |
| BatchNorm 統計の更新 | ターゲットドメインの統計量で BN を更新 |
| Data Augmentation | ソースデータをターゲットに近づける変換を加える |

---

## 実践的なヒント

| 状況 | 推奨アプローチ |
|---|---|
| データが非常に少ない（< 100枚） | 特徴抽出のみ（Backbone 固定） |
| データが少ない（100〜1000枚） | 最終数層のみファインチューニング |
| データが中程度（1000〜10000枚） | 段階的ファインチューニング |
| データが大量（> 10000枚） | 全体をファインチューニング |
| ドメインが非常に異なる | より多くの層を解凍して学習 |

---

## 使用場面

- **医療画像**: ImageNet 事前学習モデルを病理画像分類にファインチューニング
- **工業検査**: 一般物体認識モデルを製品不良検出に転用
- **自然言語処理**: BERT を文書分類・固有表現認識にファインチューニング
- **音声認識**: Wav2Vec2 を少言語の音声認識に適用
- **化学・創薬**: タンパク質構造予測モデルの転用

---

## 参考文献

- Yosinski et al., "How transferable are features in deep neural networks?" (2014)
- Howard & Ruder, "Universal Language Model Fine-tuning for Text Classification" (2018)
- Kornblith et al., "Do Better ImageNet Models Transfer Better?" (2019)
- He et al., "Masked Autoencoders Are Scalable Vision Learners" (2021)

<AffiliateBanner site="ml_intro" />
