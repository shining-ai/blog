import AffiliateBanner from '@site/src/components/AffiliateBanner';

# セグメンテーション

## セグメンテーションとは

> セグメンテーション（Segmentation）とは、画像中の**各ピクセルにラベルを割り当てる**タスクである。物体検出が Bounding Box で物体を囲むのに対し、セグメンテーションはピクセル単位で「何がどこにあるか」を判定するため、より精細な空間理解が可能になる。

---

## セグメンテーションの種類

| 種類 | 説明 | 特徴 |
|---|---|---|
| Semantic Segmentation | 各ピクセルをクラスに分類 | 同じクラスの物体を区別しない |
| Instance Segmentation | 物体ごとに個別にセグメント | 同クラスでも個別に識別 |
| Panoptic Segmentation | Semantic + Instance の統合 | 全ピクセルを網羅的に分類 |

### 違いのイメージ

```
元画像: 人が2人、背景に建物

Semantic:  人=赤, 建物=青（2人を区別しない）
Instance:  人A=赤, 人B=緑（個人を区別, 背景はラベルなし）
Panoptic:  人A=赤, 人B=緑, 建物=青（全ピクセルにラベル）
```

---

## 主要アーキテクチャ比較

| モデル | 種類 | 主な特徴 |
|---|---|---|
| FCN | Semantic | 全畳み込み、初期の端到端モデル |
| U-Net | Semantic | Skip Connection、医療画像で活躍 |
| DeepLab v3+ | Semantic | Atrous Convolution、ASPP |
| Mask R-CNN | Instance | Faster R-CNN + Mask Head |
| Panoptic FPN | Panoptic | FPN ベース統合モデル |

---

## FCN（Fully Convolutional Network）

FCN は全結合層を除き、全て畳み込み層で構成することで、任意サイズの入力に対応したセマンティックセグメンテーションの先駆けとなったモデルである。

### FCN の構造

```
入力画像
  ↓
CNN（畳み込みで特徴抽出 + 空間解像度の削減）
  ↓
1×1 畳み込み（クラス数チャンネルへ変換）
  ↓
転置畳み込み（Transposed Convolution）でアップサンプリング
  ↓
ピクセルごとのクラス予測
```

**FCN の問題点:** Stride によるダウンサンプリングで細部情報が失われ、境界が不明瞭になる。これを解決するのが Skip Connection である。

---

## U-Net

U-Net は医療画像セグメンテーションのために開発されたアーキテクチャで、エンコーダ・デコーダ構造と Skip Connection により、高精度なセグメンテーションを少ないデータで実現する。

### U-Net の構造

```
エンコーダ（下り）              デコーダ（上り）
  入力 (572×572)
    ↓ Conv × 2                        ↑ 出力 (388×388)
  64ch (568×568) ─────────────────→  ↑ Conv × 2
    ↓ MaxPool                        ↑ Up-conv
  128ch (284×284) ────────────────→  ↑ Conv × 2
    ↓ MaxPool                        ↑ Up-conv
  256ch (142×142) ────────────────→  ↑ Conv × 2
    ↓ MaxPool                        ↑ Up-conv
  512ch (71×71) ──────────────────→  ↑ Conv × 2
    ↓ MaxPool                        ↑ Up-conv
  1024ch (35×35) ← ボトルネック ──────→

矢印（→）: Skip Connection（エンコーダの特徴マップをデコーダに連結）
```

### Skip Connection の役割

Skip Connection により、エンコーダで失われた**細かい空間情報**をデコーダに直接渡すことができる。これにより境界の精度が向上する。

---

## PyTorch による実装

### U-Net の実装

```python
import torch
import torch.nn as nn
import torch.nn.functional as F


class DoubleConv(nn.Module):
    """U-Net の基本ブロック: Conv → BN → ReLU を2回"""
    def __init__(self, in_channels, out_channels):
        super().__init__()
        self.net = nn.Sequential(
            nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
        )

    def forward(self, x):
        return self.net(x)


class UNet(nn.Module):
    def __init__(self, in_channels=3, num_classes=2, features=[64, 128, 256, 512]):
        super().__init__()
        self.encoders = nn.ModuleList()
        self.pool = nn.MaxPool2d(kernel_size=2, stride=2)
        self.decoders = nn.ModuleList()
        self.ups = nn.ModuleList()

        # エンコーダ
        ch = in_channels
        for f in features:
            self.encoders.append(DoubleConv(ch, f))
            ch = f

        # ボトルネック
        self.bottleneck = DoubleConv(features[-1], features[-1] * 2)

        # デコーダ
        for f in reversed(features):
            self.ups.append(
                nn.ConvTranspose2d(f * 2, f, kernel_size=2, stride=2)
            )
            self.decoders.append(DoubleConv(f * 2, f))

        # 出力層
        self.final_conv = nn.Conv2d(features[0], num_classes, kernel_size=1)

    def forward(self, x):
        skip_connections = []

        # エンコーダ
        for encoder in self.encoders:
            x = encoder(x)
            skip_connections.append(x)
            x = self.pool(x)

        # ボトルネック
        x = self.bottleneck(x)

        # デコーダ（skip_connections を逆順に使用）
        skip_connections = skip_connections[::-1]
        for i, (up, decoder) in enumerate(zip(self.ups, self.decoders)):
            x = up(x)
            skip = skip_connections[i]

            # サイズが合わない場合にリサイズ
            if x.shape != skip.shape:
                x = F.interpolate(x, size=skip.shape[2:])

            x = torch.cat([skip, x], dim=1)
            x = decoder(x)

        return self.final_conv(x)


# モデルの確認
model = UNet(in_channels=3, num_classes=21)  # PASCAL VOC: 21クラス
x = torch.randn(2, 3, 256, 256)
out = model(x)
print(f"入力: {x.shape}")    # [2, 3, 256, 256]
print(f"出力: {out.shape}")  # [2, 21, 256, 256]
```

### セマンティックセグメンテーションの学習

```python
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader


def train_segmentation(model, train_loader, val_loader, num_epochs=50):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = model.to(device)

    # Cross Entropy Loss（ピクセルごとのクラス分類）
    criterion = nn.CrossEntropyLoss(ignore_index=255)  # 無効ピクセルを無視
    optimizer = optim.Adam(model.parameters(), lr=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=num_epochs)

    for epoch in range(num_epochs):
        # 学習フェーズ
        model.train()
        train_loss = 0.0
        for images, masks in train_loader:
            images = images.to(device)   # [B, C, H, W]
            masks = masks.to(device)     # [B, H, W] ← long型のクラスインデックス

            optimizer.zero_grad()
            outputs = model(images)      # [B, num_classes, H, W]
            loss = criterion(outputs, masks)
            loss.backward()
            optimizer.step()
            train_loss += loss.item()

        # 検証フェーズ
        model.eval()
        miou = evaluate_miou(model, val_loader, device)
        scheduler.step()

        print(f"Epoch {epoch+1}: Loss={train_loss/len(train_loader):.4f}, mIoU={miou:.4f}")


def evaluate_miou(model, loader, device, num_classes=21):
    """mIoU（mean Intersection over Union）の計算"""
    intersection = torch.zeros(num_classes)
    union = torch.zeros(num_classes)

    with torch.no_grad():
        for images, masks in loader:
            images = images.to(device)
            masks = masks.to(device)
            outputs = model(images)
            preds = outputs.argmax(dim=1)  # [B, H, W]

            for cls in range(num_classes):
                pred_mask = (preds == cls)
                true_mask = (masks == cls)
                intersection[cls] += (pred_mask & true_mask).sum().float()
                union[cls] += (pred_mask | true_mask).sum().float()

    iou_per_class = intersection / (union + 1e-6)
    return iou_per_class.mean().item()
```

### torchvision の DeepLab を使う場合

```python
from torchvision.models.segmentation import deeplabv3_resnet101

# 事前学習済みモデルの読み込み
model = deeplabv3_resnet101(weights="DEFAULT")
model.eval()

# カスタムクラス数へのファインチューニング
from torchvision.models.segmentation.deeplabv3 import DeepLabHead
num_classes = 10
model.classifier = DeepLabHead(2048, num_classes)

# 推論
import torch
x = torch.randn(1, 3, 520, 520)
with torch.no_grad():
    output = model(x)["out"]  # [1, num_classes, 520, 520]
    pred = output.argmax(dim=1)  # [1, 520, 520]
```

---

## Mask R-CNN（Instance Segmentation）

Mask R-CNN は Faster R-CNN にマスク予測ヘッドを追加したモデルで、各検出物体に対してバイナリマスクを生成する。

```
Faster R-CNN の出力
  ↓
RoI Align（より精確な特徴切り出し）
  ↓
Mask Head（FCN ベースのマスク予測）
  ↓
各物体ごとの[クラス, BBox, バイナリマスク]
```

```python
from torchvision.models.detection import maskrcnn_resnet50_fpn

model = maskrcnn_resnet50_fpn(weights="DEFAULT")
model.eval()

image_tensor = torch.randn(3, 480, 640)
with torch.no_grad():
    predictions = model([image_tensor])

masks = predictions[0]["masks"]   # [N, 1, H, W] 確率マスク
labels = predictions[0]["labels"] # [N]
scores = predictions[0]["scores"] # [N]

# 閾値でバイナリマスクに変換
binary_masks = (masks > 0.5).squeeze(1)  # [N, H, W]
```

---

## 使用場面

- **医療画像**: 腫瘍・臓器のセグメンテーション（U-Net が特に有効）
- **自動運転**: 道路・歩行者・車線の領域分割
- **衛星画像**: 土地利用分類・建物検出
- **ロボット工学**: 把持対象の形状認識
- **映像編集**: 背景除去・コンポジット処理

---

## 参考文献

- Long et al., "Fully Convolutional Networks for Semantic Segmentation" (2015)
- Ronneberger et al., "U-Net: Convolutional Networks for Biomedical Image Segmentation" (2015)
- He et al., "Mask R-CNN" (2017)
- Chen et al., "Encoder-Decoder with Atrous Separable Convolution for Semantic Image Segmentation" (2018)

<AffiliateBanner site="ml_intro" />
