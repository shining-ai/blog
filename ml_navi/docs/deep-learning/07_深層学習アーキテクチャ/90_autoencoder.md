import AffiliateBanner from '@site/src/components/AffiliateBanner';

# オートエンコーダ

## オートエンコーダとは

> オートエンコーダ（Autoencoder）とは、**入力データを低次元の潜在表現に圧縮（エンコード）し、その潜在表現から元の入力を復元（デコード）する**ことを学習するニューラルネットワークである。ラベルを必要とせず自己教師あり学習の一種であり、次元削減、特徴抽出、異常検知、ノイズ除去などに活用される。

---

## エンコーダ・ボトルネック・デコーダ構造

```
入力 x ∈ R^n
    ↓
[ エンコーダ（Encoder） ]
  x → h_1 → h_2 → z
                   ↑
            ボトルネック層（潜在空間）
            z ∈ R^d（d << n）
    ↓
[ デコーダ（Decoder） ]
  z → h_2' → h_1' → x̂
    ↓
再構成出力 x̂ ∈ R^n

学習目標: L = ||x - x̂||^2（再構成誤差の最小化）
```

ボトルネック層の次元数 d を入力次元 n より大幅に小さくすることで、ネットワークは**データの本質的な特徴のみを保持する圧縮表現**を学習する。

---

## オートエンコーダの種類

| 種類 | 概要 | 主な用途 |
|---|---|---|
| Vanilla AE | 基本的なAE | 次元削減、特徴学習 |
| Denoising AE (DAE) | ノイズを加えた入力から元を復元 | ノイズ除去、頑健な表現学習 |
| Sparse AE | 潜在表現にスパース性制約 | 特徴選択、解釈可能な表現 |
| Contractive AE | 局所的ロバスト性を正則化 | 頑健な特徴抽出 |
| Variational AE (VAE) | 潜在空間を確率分布とする | 生成モデル（別記事参照） |
| Masked AE | 入力の一部をマスクして復元 | BERT、MAE 等の自己教師あり学習 |

---

## 次元削減としてのオートエンコーダ

オートエンコーダによる次元削減は PCA（主成分分析）の非線形版と見なせる。

| 比較 | PCA | オートエンコーダ |
|---|---|---|
| 変換の種類 | 線形 | 非線形 |
| 潜在表現 | 直交基底 | 制約なし |
| 計算 | 固有値分解 | 勾配法 |
| 表現力 | 低い | 高い |
| 解釈性 | 高い | 低い |

---

## ノイズ除去オートエンコーダ（Denoising AE）

```
学習時:
  入力 x にノイズを加える: x̃ = x + ε（ε ~ N(0, σ^2)）
  ネットワークに x̃ を入力し、x を予測させる

推論時:
  ノイズのある入力 x̃ → クリーンな x̂ を出力

効果:
  - ノイズに対して頑健な潜在表現を学習
  - 通常の AE より汎化性能が高い
```

---

## PyTorch による実装

### 基本的なオートエンコーダ

```python
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, transforms


class Autoencoder(nn.Module):
    """全結合層を使ったオートエンコーダ"""
    def __init__(self, input_dim: int = 784, latent_dim: int = 64):
        super().__init__()

        # エンコーダ
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 512),
            nn.ReLU(),
            nn.BatchNorm1d(512),
            nn.Linear(512, 256),
            nn.ReLU(),
            nn.BatchNorm1d(256),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Linear(128, latent_dim),
        )

        # デコーダ（エンコーダの逆構造）
        self.decoder = nn.Sequential(
            nn.Linear(latent_dim, 128),
            nn.ReLU(),
            nn.Linear(128, 256),
            nn.ReLU(),
            nn.BatchNorm1d(256),
            nn.Linear(256, 512),
            nn.ReLU(),
            nn.BatchNorm1d(512),
            nn.Linear(512, input_dim),
            nn.Sigmoid(),  # 入力が 0-1 の場合
        )

    def encode(self, x: torch.Tensor) -> torch.Tensor:
        return self.encoder(x)

    def decode(self, z: torch.Tensor) -> torch.Tensor:
        return self.decoder(z)

    def forward(self, x: torch.Tensor):
        z = self.encode(x)
        x_recon = self.decode(z)
        return x_recon, z


# 動作確認
model = Autoencoder(input_dim=784, latent_dim=32)
x = torch.randn(16, 784)
x_recon, z = model(x)
print(f"入力: {x.shape}")         # [16, 784]
print(f"潜在表現: {z.shape}")     # [16, 32]
print(f"再構成: {x_recon.shape}") # [16, 784]
```

### 畳み込みオートエンコーダ（Convolutional AE）

```python
class ConvAutoencoder(nn.Module):
    """畳み込みを使ったオートエンコーダ（画像向け）"""
    def __init__(self, latent_dim: int = 128):
        super().__init__()

        # エンコーダ: 畳み込みで空間を圧縮
        self.encoder_conv = nn.Sequential(
            nn.Conv2d(1, 32, kernel_size=3, stride=2, padding=1),   # 28→14
            nn.ReLU(),
            nn.Conv2d(32, 64, kernel_size=3, stride=2, padding=1),  # 14→7
            nn.ReLU(),
            nn.Conv2d(64, 128, kernel_size=7),                       # 7→1
            nn.ReLU(),
        )
        self.encoder_fc = nn.Linear(128, latent_dim)

        # デコーダ: 転置畳み込みで空間を復元
        self.decoder_fc = nn.Linear(latent_dim, 128)
        self.decoder_conv = nn.Sequential(
            nn.ConvTranspose2d(128, 64, kernel_size=7),              # 1→7
            nn.ReLU(),
            nn.ConvTranspose2d(64, 32, kernel_size=3, stride=2,
                               padding=1, output_padding=1),         # 7→14
            nn.ReLU(),
            nn.ConvTranspose2d(32, 1, kernel_size=3, stride=2,
                               padding=1, output_padding=1),         # 14→28
            nn.Sigmoid(),
        )

    def encode(self, x):
        x = self.encoder_conv(x)       # [B, 128, 1, 1]
        x = x.view(x.size(0), -1)      # [B, 128]
        return self.encoder_fc(x)      # [B, latent_dim]

    def decode(self, z):
        x = self.decoder_fc(z)         # [B, 128]
        x = x.view(-1, 128, 1, 1)      # [B, 128, 1, 1]
        return self.decoder_conv(x)    # [B, 1, 28, 28]

    def forward(self, x):
        z = self.encode(x)
        return self.decode(z), z
```

### ノイズ除去オートエンコーダの学習

```python
class DenoisingAutoencoder(nn.Module):
    """ノイズ除去オートエンコーダ"""
    def __init__(self, base_ae: nn.Module, noise_factor: float = 0.3):
        super().__init__()
        self.ae = base_ae
        self.noise_factor = noise_factor

    def add_noise(self, x: torch.Tensor) -> torch.Tensor:
        """ガウシアンノイズを加える"""
        noise = torch.randn_like(x) * self.noise_factor
        return (x + noise).clamp(0.0, 1.0)

    def forward(self, x: torch.Tensor, add_noise: bool = True):
        x_noisy = self.add_noise(x) if add_noise else x
        x_recon, z = self.ae(x_noisy)
        return x_recon, z, x_noisy


def train_autoencoder(model, train_loader, num_epochs=50, denoising=False):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = model.to(device)
    optimizer = optim.Adam(model.parameters(), lr=1e-3)
    criterion = nn.MSELoss()

    for epoch in range(num_epochs):
        model.train()
        total_loss = 0.0

        for images, _ in train_loader:
            images = images.view(images.size(0), -1).to(device)  # flatten
            optimizer.zero_grad()

            if denoising:
                # ノイズありの入力 → クリーンな出力
                noisy = images + 0.3 * torch.randn_like(images)
                noisy = noisy.clamp(0, 1)
                x_recon, _ = model(noisy)
            else:
                x_recon, _ = model(images)

            # 再構成誤差（元画像との比較）
            loss = criterion(x_recon, images)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()

        if (epoch + 1) % 10 == 0:
            print(f"Epoch {epoch+1}: Loss={total_loss/len(train_loader):.6f}")

    return model


def extract_features(model, data_loader, device):
    """学習済みエンコーダで特徴抽出"""
    model.eval()
    all_features = []
    all_labels = []

    with torch.no_grad():
        for images, labels in data_loader:
            images = images.view(images.size(0), -1).to(device)
            _, z = model(images)
            all_features.append(z.cpu())
            all_labels.append(labels)

    return torch.cat(all_features), torch.cat(all_labels)


# MNIST での使用例
transform = transforms.ToTensor()
train_dataset = datasets.MNIST(root='./data', train=True,
                               transform=transform, download=True)
train_loader = DataLoader(train_dataset, batch_size=256, shuffle=True)

ae_model = Autoencoder(input_dim=784, latent_dim=32)
trained_model = train_autoencoder(ae_model, train_loader, num_epochs=30)

# 特徴抽出（下流タスクへの活用）
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
features, labels = extract_features(trained_model, train_loader, device)
print(f"特徴量: {features.shape}")  # [60000, 32]
```

---

## 異常検知への応用

```python
def detect_anomalies(model, data_loader, threshold_percentile=95):
    """
    再構成誤差を用いた異常検知
    正常データの再構成誤差が小さく、異常データは大きくなる
    """
    model.eval()
    device = next(model.parameters()).device
    reconstruction_errors = []

    with torch.no_grad():
        for images, _ in data_loader:
            images = images.view(images.size(0), -1).to(device)
            x_recon, _ = model(images)
            # サンプルごとの再構成誤差
            errors = ((x_recon - images) ** 2).mean(dim=1)
            reconstruction_errors.extend(errors.cpu().tolist())

    # 閾値の設定（学習データのパーセンタイル）
    threshold = torch.tensor(reconstruction_errors).quantile(threshold_percentile / 100)
    print(f"異常検知閾値 ({threshold_percentile}パーセンタイル): {threshold:.6f}")
    return threshold
```

---

## 使用場面

- **次元削減・可視化**: 高次元データの 2D/3D 可視化（t-SNE の前処理）
- **異常検知**: 正常データで学習し、高再構成誤差を異常とみなす
- **ノイズ除去**: 画像・音声のノイズ除去処理
- **推薦システム**: 協調フィルタリングの特徴表現
- **事前学習**: ラベルなしデータで表現を学習し、下流タスクに活用

---

## 参考文献

- Hinton & Salakhutdinov, "Reducing the Dimensionality of Data with Neural Networks" (2006)
- Vincent et al., "Denoising Autoencoders" (2008)
- Rifai et al., "Contractive Auto-Encoders" (2011)
- He et al., "Masked Autoencoders Are Scalable Vision Learners" (2021)

<AffiliateBanner site="ml_intro" />
