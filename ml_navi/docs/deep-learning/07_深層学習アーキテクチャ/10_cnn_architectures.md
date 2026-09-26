import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 代表的な CNN アーキテクチャ

ImageNet 大規模視覚認識チャレンジ（ILSVRC）を通じて、CNN アーキテクチャは急速に進化してきた。LeNet から始まり、AlexNet・VGG・ResNet・EfficientNet へと続く進化の歴史は、深層学習の発展そのものである。

## CNN アーキテクチャの進化とは

> CNN アーキテクチャの進化は、ネットワークの深さ・幅・効率性の向上を追求してきた歴史である。残差接続・Bottleneck 構造・Neural Architecture Search など様々な技術革新により、精度とモデルサイズの両面で継続的な改善が実現されてきた。

---

## アーキテクチャの進化の概要

| モデル | 年 | ImageNet Top-1 | パラメータ数 | 主な革新 |
|--------|----|--------------:|----------:|---------|
| LeNet-5 | 1998 | -(MNIST用) | 0.06M | 畳み込みNNの原型 |
| AlexNet | 2012 | 63.3% | 61M | ReLU, Dropout, GPU学習 |
| VGG-16 | 2014 | 71.5% | 138M | 3×3フィルタの統一 |
| GoogLeNet | 2014 | 74.8% | 7M | Inception モジュール |
| ResNet-50 | 2015 | 76.1% | 25M | 残差接続 |
| DenseNet-121 | 2016 | 74.9% | 8M | 密結合 |
| MobileNetV2 | 2018 | 72.0% | 3.4M | 逆残差ブロック |
| EfficientNet-B0 | 2019 | 77.1% | 5.3M | Compound Scaling |

---

## 各アーキテクチャの詳細

### LeNet-5（1998）

```
入力(32×32×1) → Conv(6@5×5) → Pool → Conv(16@5×5) → Pool → FC120 → FC84 → 出力(10)
```

### AlexNet（2012）- 深層学習ブームの口火

- 5層畳み込み + 3層全結合
- ReLU の採用（Sigmoid より高速収束）
- Dropout による正則化
- GPU 並列学習（2GPU）
- Data Augmentation

### VGG（2014）- シンプルで深い設計

- すべて 3×3 フィルタ（2つの 3×3 = 1つの 5×5 の受容野）
- 深さを 16〜19 層に増加
- シンプルで移植しやすいが、パラメータが多い

### ResNet（2015）- 残差接続による超深層化

- 残差接続（skip connection）により 100 層超が可能に
- BatchNorm + ReLU + Conv の積み上げ
- He 初期化との組み合わせが重要

---

## PyTorch による ResNet の実装

```python
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models
import numpy as np


# ===== ResNet の Bottleneck ブロック =====
class Bottleneck(nn.Module):
    """
    ResNet-50/101/152 で使用される Bottleneck ブロック
    1×1 → 3×3 → 1×1 の3層構成でパラメータを削減
    """
    expansion = 4   # 出力チャンネルは入力の4倍

    def __init__(self, in_channels: int, mid_channels: int, stride: int = 1):
        super().__init__()
        out_channels = mid_channels * self.expansion

        # 1×1 畳み込み（チャンネル削減）
        self.conv1 = nn.Conv2d(in_channels, mid_channels, kernel_size=1, bias=False)
        self.bn1 = nn.BatchNorm2d(mid_channels)

        # 3×3 畳み込み（空間的特徴抽出）
        self.conv2 = nn.Conv2d(mid_channels, mid_channels, kernel_size=3,
                               stride=stride, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(mid_channels)

        # 1×1 畳み込み（チャンネル拡張）
        self.conv3 = nn.Conv2d(mid_channels, out_channels, kernel_size=1, bias=False)
        self.bn3 = nn.BatchNorm2d(out_channels)

        # ショートカット（次元が異なる場合）
        self.shortcut = nn.Sequential()
        if stride != 1 or in_channels != out_channels:
            self.shortcut = nn.Sequential(
                nn.Conv2d(in_channels, out_channels, kernel_size=1,
                          stride=stride, bias=False),
                nn.BatchNorm2d(out_channels),
            )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        identity = x
        out = F.relu(self.bn1(self.conv1(x)))
        out = F.relu(self.bn2(self.conv2(out)))
        out = self.bn3(self.conv3(out))
        out += self.shortcut(identity)
        return F.relu(out)


class ResNet50(nn.Module):
    """ResNet-50 の実装"""

    def __init__(self, num_classes: int = 1000):
        super().__init__()
        # ステム
        self.stem = nn.Sequential(
            nn.Conv2d(3, 64, kernel_size=7, stride=2, padding=3, bias=False),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=3, stride=2, padding=1),
        )

        # 4つのステージ: (mid_ch, n_blocks, stride)
        self.layer1 = self._make_stage(64,  64,  n_blocks=3, stride=1)
        self.layer2 = self._make_stage(256, 128, n_blocks=4, stride=2)
        self.layer3 = self._make_stage(512, 256, n_blocks=6, stride=2)
        self.layer4 = self._make_stage(1024, 512, n_blocks=3, stride=2)

        self.gap = nn.AdaptiveAvgPool2d(1)
        self.fc = nn.Linear(512 * Bottleneck.expansion, num_classes)

        # He 初期化
        self._initialize_weights()

    def _make_stage(self, in_channels, mid_channels, n_blocks, stride):
        layers = [Bottleneck(in_channels, mid_channels, stride=stride)]
        out_channels = mid_channels * Bottleneck.expansion
        for _ in range(1, n_blocks):
            layers.append(Bottleneck(out_channels, mid_channels, stride=1))
        return nn.Sequential(*layers)

    def _initialize_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Conv2d):
                nn.init.kaiming_normal_(m.weight, mode="fan_out", nonlinearity="relu")
            elif isinstance(m, nn.BatchNorm2d):
                nn.init.ones_(m.weight)
                nn.init.zeros_(m.bias)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.stem(x)
        x = self.layer1(x)
        x = self.layer2(x)
        x = self.layer3(x)
        x = self.layer4(x)
        x = self.gap(x)
        x = x.view(x.size(0), -1)
        return self.fc(x)


# 動作確認
model = ResNet50(num_classes=1000)
x = torch.randn(2, 3, 224, 224)
print("ResNet-50 出力:", model(x).shape)
print("パラメータ数:", f"{sum(p.numel() for p in model.parameters()):,}")
```

---

## torchvision の事前学習済みモデル

```python
import torch
import torchvision.models as models
from torchvision import transforms
from PIL import Image


# ----- 事前学習済みモデルの読み込み -----
# ResNet-50
resnet50 = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V2)

# EfficientNet
efficient_b0 = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT)

# モデル情報の表示
for name, model in [("ResNet-50", resnet50), ("EfficientNet-B0", efficient_b0)]:
    params = sum(p.numel() for p in model.parameters())
    print(f"{name:20s}: {params:,} パラメータ")


# ----- ファインチューニング用の設定 -----
def setup_resnet_finetune(num_classes: int, pretrained: bool = True) -> nn.Module:
    """転移学習用 ResNet のセットアップ"""
    if pretrained:
        model = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V2)
    else:
        model = models.resnet50(weights=None)

    # 最終 FC 層を置き換え
    in_features = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Dropout(0.5),
        nn.Linear(in_features, num_classes),
    )
    return model


# カスタムクラス数でのセットアップ
model_ft = setup_resnet_finetune(num_classes=10)
print("\nファインチューニング用モデル最終層:", model_ft.fc)
```

---

## EfficientNet: Compound Scaling

EfficientNet は幅（チャンネル数）・深さ（層数）・解像度を均一に拡大するスケーリング手法を提案。

$$
\text{depth}: d = \alpha^\phi, \quad \text{width}: w = \beta^\phi, \quad \text{resolution}: r = \gamma^\phi
$$

制約: $\alpha \cdot \beta^2 \cdot \gamma^2 \approx 2$（計算量が $2^\phi$ 倍）

| モデル | 入力解像度 | パラメータ数 | Top-1 |
|--------|----------|----------:|------:|
| B0 | 224 | 5.3M | 77.1% |
| B1 | 240 | 7.8M | 79.1% |
| B4 | 380 | 19M | 82.6% |
| B7 | 600 | 66M | 84.3% |

---

## VGG vs ResNet: 構造の比較

```python
import torch
import torch.nn as nn


def count_params(model: nn.Module) -> int:
    return sum(p.numel() for p in model.parameters())


# シンプルな VGG-like
class MiniVGG(nn.Module):
    def __init__(self):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(3, 64, 3, padding=1), nn.ReLU(),
            nn.Conv2d(64, 64, 3, padding=1), nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(64, 128, 3, padding=1), nn.ReLU(),
            nn.Conv2d(128, 128, 3, padding=1), nn.ReLU(),
            nn.MaxPool2d(2),
        )
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(128 * 8 * 8, 512), nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(512, 10),
        )

    def forward(self, x):
        return self.classifier(self.features(x))


# 比較
mini_vgg = MiniVGG()
x = torch.randn(4, 3, 32, 32)
print("MiniVGG:", mini_vgg(x).shape, f"({count_params(mini_vgg):,} params)")

# torchvision から比較
import torchvision.models as tv_models
print("VGG-16:  ", count_params(tv_models.vgg16(weights=None)), "params")
print("ResNet-50:", count_params(tv_models.resnet50(weights=None)), "params")
print("EfficientNet-B0:", count_params(tv_models.efficientnet_b0(weights=None)), "params")
```

---

## アーキテクチャ選択ガイド

| 用途 | 推奨モデル | 理由 |
|------|----------|------|
| リソース制約あり（モバイル） | MobileNetV3, EfficientNet-B0 | 軽量・高効率 |
| 精度優先（サーバー） | ResNet-50, EfficientNet-B4 | 高精度・汎用性 |
| 転移学習ベース | ResNet-50, EfficientNet | 事前学習の品質 |
| 研究・実験 | ResNet-18/34 | シンプルで修改しやすい |
| リアルタイム推論 | MobileNet, EfficientNet-B0 | 速度優先 |

---

## 使用場面

| タスク | 推奨アーキテクチャ |
|--------|-----------------|
| 画像分類（精度優先） | EfficientNet-B4 以上 |
| 画像分類（速度優先） | MobileNetV3, EfficientNet-B0 |
| 物体検出のバックボーン | ResNet-50, EfficientNet |
| 医療画像（少データ） | ResNet-18 + 転移学習 |
| 教育・プロトタイプ | ResNet-18 または ResNet-34 |

---

## 参考文献

- LeCun, Y. (1998). "Gradient-based learning applied to document recognition." *IEEE*.
- Krizhevsky, A., Sutskever, I., & Hinton, G. E. (2012). "ImageNet classification with deep convolutional neural networks." *NeurIPS*.
- Simonyan, K., & Zisserman, A. (2014). "Very deep convolutional networks for large-scale image recognition." *ICLR 2015*.
- He, K., et al. (2016). "Deep residual learning for image recognition." *CVPR*.
- Tan, M., & Le, Q. (2019). "EfficientNet: Rethinking model scaling for convolutional neural networks." *ICML*.

<AffiliateBanner site="ml_intro" />
