import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 畳み込み層とプーリング層

畳み込みニューラルネットワーク（CNN）は、画像認識を中心に革命を起こした深層学習アーキテクチャである。画像の空間的な構造を効率的に処理するために設計された畳み込み層とプーリング層を核とする。

## 畳み込み層とは

> 畳み込み層は、学習可能なフィルタ（カーネル）を入力に適用し、局所的な特徴（エッジ、テクスチャなど）を検出する層である。パラメータを空間的に共有することで、全結合層と比べてパラメータ数を大幅に削減しながら、画像の並進不変性を実現する。

---

## 畳み込みの仕組み

### 基本的な畳み込み演算

入力特徴マップ $X$（$H \times W \times C_{\text{in}}$）にフィルタ $K$（$k_H \times k_W \times C_{\text{in}} \times C_{\text{out}}$）を適用：

$$
\text{Output}[i, j, c] = \sum_{di=0}^{k_H-1} \sum_{dj=0}^{k_W-1} \sum_{c'=0}^{C_{\text{in}}-1} X[i \cdot s + di, j \cdot s + dj, c'] \cdot K[di, dj, c', c]
$$

出力サイズ：

$$
H_{\text{out}} = \left\lfloor \frac{H_{\text{in}} + 2P - k_H}{S} \right\rfloor + 1
$$

- $P$: パディング量
- $S$: ストライド（移動量）
- $k_H$: カーネルサイズ

| パラメータ | 役割 | 典型値 |
|----------|------|--------|
| カーネルサイズ $k$ | 受容野のサイズ | 3×3, 5×5 |
| ストライド $S$ | フィルタの移動量 | 1（通常）, 2（ダウンサンプル） |
| パディング $P$ | 境界の処理 | 0（バリッド）, k//2（セーム） |
| フィルタ数 $C_{\text{out}}$ | 出力チャンネル数 | 32, 64, 128, ... |

---

## 特徴マップと受容野

```python
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import matplotlib.pyplot as plt


# ===== 畳み込みの手動実装 =====
def conv2d_manual(x: np.ndarray, kernel: np.ndarray,
                  stride: int = 1, padding: int = 0) -> np.ndarray:
    """
    2D 畳み込みの手動実装（単チャンネル・単フィルタ）
    x: (H, W), kernel: (kH, kW)
    """
    if padding > 0:
        x = np.pad(x, padding, mode="constant")

    H, W = x.shape
    kH, kW = kernel.shape
    H_out = (H - kH) // stride + 1
    W_out = (W - kW) // stride + 1

    output = np.zeros((H_out, W_out))
    for i in range(H_out):
        for j in range(W_out):
            patch = x[i*stride:i*stride+kH, j*stride:j*stride+kW]
            output[i, j] = (patch * kernel).sum()
    return output


# エッジ検出フィルタの例
image = np.array([
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 1, 1, 1, 0, 0],
    [0, 0, 1, 1, 1, 0, 0],
    [0, 0, 1, 1, 1, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
], dtype=float)

# Sobel フィルタ（横方向エッジ検出）
sobel_x = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], dtype=float)
# Laplacian フィルタ（全方向エッジ）
laplacian = np.array([[0, 1, 0], [1, -4, 1], [0, 1, 0]], dtype=float)

edge_x = conv2d_manual(image, sobel_x, padding=1)
edge_lap = conv2d_manual(image, laplacian, padding=1)

fig, axes = plt.subplots(1, 3, figsize=(12, 4))
axes[0].imshow(image, cmap="gray")
axes[0].set_title("入力画像")
axes[1].imshow(np.abs(edge_x), cmap="gray")
axes[1].set_title("Sobel X（横エッジ）")
axes[2].imshow(np.abs(edge_lap), cmap="gray")
axes[2].set_title("Laplacian（全方向エッジ）")
for ax in axes:
    ax.axis("off")
plt.tight_layout()
plt.savefig("conv_filters.png", dpi=150)
plt.show()


# ===== PyTorch での畳み込み =====
# Same padding の計算
def same_padding(kernel_size: int, dilation: int = 1) -> int:
    return (kernel_size - 1) // 2 * dilation


x = torch.randn(1, 3, 32, 32)   # (batch, channels, H, W)
conv = nn.Conv2d(3, 16, kernel_size=3, stride=1, padding=same_padding(3))
out = conv(x)
print(f"入力: {x.shape} → 出力: {out.shape}")  # (1, 16, 32, 32) Same padding

conv_s2 = nn.Conv2d(3, 16, kernel_size=3, stride=2, padding=1)
out_s2 = conv_s2(x)
print(f"ストライド2: {x.shape} → {out_s2.shape}")  # (1, 16, 16, 16)

# Depthwise Separable Convolution（パラメータ削減）
class DepthwiseSeparableConv(nn.Module):
    """MobileNet 系の軽量畳み込み"""
    def __init__(self, in_ch, out_ch, stride=1):
        super().__init__()
        self.depthwise = nn.Conv2d(in_ch, in_ch, kernel_size=3, stride=stride,
                                   padding=1, groups=in_ch, bias=False)
        self.pointwise = nn.Conv2d(in_ch, out_ch, kernel_size=1, bias=False)
        self.bn = nn.BatchNorm2d(out_ch)

    def forward(self, x):
        x = self.depthwise(x)
        x = self.pointwise(x)
        return F.relu(self.bn(x))


# パラメータ比較
std_conv = nn.Conv2d(32, 64, kernel_size=3, padding=1)
dw_sep = DepthwiseSeparableConv(32, 64)

std_params = sum(p.numel() for p in std_conv.parameters())
dw_params = sum(p.numel() for p in dw_sep.parameters())
print(f"\n標準畳み込みパラメータ数: {std_params:,}")
print(f"深度方向分離畳み込み:      {dw_params:,}（{dw_params/std_params:.1%}）")
```

---

## プーリング層

プーリング層は特徴マップをダウンサンプリングし、空間的な不変性を高める。

### 最大プーリング（Max Pooling）

```
入力 (4×4):           Max Pool 2×2, stride=2:
1 2 3 4               6 8
5 6 7 8     →         14 16
9 10 11 12
13 14 15 16
```

$$
\text{MaxPool}(i, j) = \max_{di, dj \in \text{window}} X[i+di, j+dj]
$$

### 平均プーリング（Average Pooling）

$$
\text{AvgPool}(i, j) = \frac{1}{k^2} \sum_{di, dj \in \text{window}} X[i+di, j+dj]
$$

### グローバル平均プーリング（GAP）

特徴マップ全体を1つのスカラーに集約。最終層で全結合層の代わりに使用。

```python
import torch
import torch.nn as nn


# プーリングの比較
x = torch.arange(1, 17, dtype=float).view(1, 1, 4, 4).float()
print("入力:\n", x[0, 0])

max_pool = nn.MaxPool2d(kernel_size=2, stride=2)
avg_pool = nn.AvgPool2d(kernel_size=2, stride=2)
gap = nn.AdaptiveAvgPool2d(1)      # Global Average Pooling

print("\nMax Pooling:\n", max_pool(x)[0, 0])
print("Avg Pooling:\n", avg_pool(x)[0, 0])
print("Global Avg Pooling:\n", gap(x))
```

---

## 受容野（Receptive Field）

深い畳み込み層ほど広い受容野を持ち、より大きな文脈を捉えられる。

```python
def calc_receptive_field(layers: list[dict]) -> list[int]:
    """
    layers: [{"kernel": k, "stride": s, "padding": p}, ...]
    各層後の受容野サイズを計算
    """
    rf = 1
    stride_product = 1
    results = [rf]

    for layer in layers:
        k = layer.get("kernel", 1)
        s = layer.get("stride", 1)
        rf = rf + (k - 1) * stride_product
        stride_product *= s
        results.append(rf)

    return results


# VGG-like アーキテクチャの受容野
vgg_layers = [
    {"kernel": 3, "stride": 1},  # conv1
    {"kernel": 3, "stride": 1},  # conv2
    {"kernel": 2, "stride": 2},  # pool1
    {"kernel": 3, "stride": 1},  # conv3
    {"kernel": 3, "stride": 1},  # conv4
    {"kernel": 2, "stride": 2},  # pool2
]

rfs = calc_receptive_field(vgg_layers)
layer_names = ["入力"] + ["conv1", "conv2", "pool1", "conv3", "conv4", "pool2"]
print("受容野の変化:")
for name, rf in zip(layer_names, rfs):
    print(f"  {name:10s}: 受容野 = {rf}×{rf}")
```

---

## 完全な CNN の構築

```python
import torch
import torch.nn as nn
import torch.nn.functional as F


class SimpleCNN(nn.Module):
    """MNIST/CIFAR 用のシンプルな CNN"""

    def __init__(self, in_channels: int = 1, num_classes: int = 10):
        super().__init__()
        # 特徴抽出部
        self.features = nn.Sequential(
            # ブロック1: (1, 28, 28) → (32, 28, 28)
            nn.Conv2d(in_channels, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            # (32, 28, 28) → (32, 14, 14)
            nn.MaxPool2d(2, 2),

            # ブロック2: (32, 14, 14) → (64, 14, 14)
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            # (64, 14, 14) → (64, 7, 7)
            nn.MaxPool2d(2, 2),

            # ブロック3: (64, 7, 7) → (128, 7, 7)
            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
        )

        # 分類部: Global Average Pooling → FC
        self.gap = nn.AdaptiveAvgPool2d(1)
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(128, 256),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(256, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.features(x)
        x = self.gap(x)
        return self.classifier(x)


# 動作確認
model = SimpleCNN(in_channels=1, num_classes=10)
x = torch.randn(8, 1, 28, 28)
logits = model(x)
print("CNN 出力形状:", logits.shape)
print("パラメータ数:", sum(p.numel() for p in model.parameters()))

# 中間特徴マップの形状確認
with torch.no_grad():
    x_temp = torch.randn(1, 1, 28, 28)
    for i, layer in enumerate(model.features):
        x_temp = layer(x_temp)
        print(f"layer {i:2d} ({layer.__class__.__name__:20s}): {tuple(x_temp.shape)}")
```

---

## 畳み込みのパラメータ数比較

| 層の種類 | パラメータ数 | 特徴 |
|---------|------------|------|
| 全結合 (1024→1024) | 1,048,576 | 全入力と全出力が接続 |
| 畳み込み (32ch→64ch, 3×3) | 18,496 | 空間的重み共有 |
| Depthwise + Pointwise | 2,336 | 更に軽量化 |
| 1×1 畳み込み (32→64) | 2,048 | チャンネル変換のみ |

---

## 使用場面

| タスク | CNN の役割 |
|--------|----------|
| 画像分類 | 特徴抽出 + 分類器 |
| 物体検出 | バックボーン（特徴抽出器） |
| セグメンテーション | エンコーダの特徴抽出 |
| 音声認識 | スペクトログラムの特徴抽出 |
| 医療画像解析 | X線・MRI の異常検出 |
| 自然言語処理 | テキストの局所パターン抽出 |

---

## 参考文献

- LeCun, Y., et al. (1998). "Gradient-based learning applied to document recognition." *Proceedings of the IEEE*, 86(11), 2278–2324.
- He, K., et al. (2016). "Deep residual learning for image recognition." *CVPR*.
- Howard, A. G., et al. (2017). "MobileNets: Efficient convolutional neural networks for mobile vision applications." *arXiv:1704.04861*.

<AffiliateBanner site="ml_intro" />
