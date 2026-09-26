import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 拡散モデル（Diffusion Models）

## 拡散モデルとは

> 拡散モデル（Diffusion Models）とは、データに**徐々にノイズを加えていく前向きプロセス（Forward Process）** と、そのノイズを**段階的に除去して元データを復元する逆プロセス（Reverse Process）** を学習する生成モデルである。画像生成において GAN を上回る品質と多様性を実現し、テキストから画像を生成する Stable Diffusion 等の基盤技術となっている。

---

## 全体の仕組み

```
前向きプロセス（Noising）: データ → ノイズ
  x_0 → x_1 → x_2 → ... → x_T ≈ N(0, I)
  （各ステップで少量のガウスノイズを加える）

逆プロセス（Denoising）: ノイズ → データ
  x_T → x_{T-1} → ... → x_1 → x_0
  （各ステップでノイズ除去ネットワークを適用）

生成時:
  z ~ N(0, I) → 逆プロセスを T ステップ実行 → 生成画像 x_0
```

---

## 前向きプロセス（Forward Process）

各ステップで少量のガウスノイズを加えることを繰り返す。ノイズスケジュール β_t により加えるノイズ量を制御する。

```
前向きプロセスの定義:
  q(x_t | x_{t-1}) = N(x_t; √(1-β_t) × x_{t-1}, β_t × I)

閉じた形での計算（x_0 から直接 x_t を得る）:
  ᾱ_t = Π_{s=1}^{t} (1 - β_s)（累積積）
  q(x_t | x_0) = N(x_t; √ᾱ_t × x_0, (1-ᾱ_t) × I)

  → x_t = √ᾱ_t × x_0 + √(1-ᾱ_t) × ε  （ε ~ N(0, I)）

この性質により、任意の時刻 t の x_t を1ステップで計算できる。
```

### ノイズスケジュール

| スケジュール | β_t の設定 | 特徴 |
|---|---|---|
| Linear | β_1 から β_T まで線形増加 | 元の DDPM の設定 |
| Cosine | cos 関数ベース | 高解像度で安定した学習 |
| Quadratic | 二次関数的増加 | 特定のタスクに有効 |

---

## 逆プロセス（Reverse Process）

逆プロセスはニューラルネットワーク（通常 U-Net）でノイズを予測し、段階的に除去する。

```
逆プロセスの定義:
  p_θ(x_{t-1} | x_t) = N(x_{t-1}; μ_θ(x_t, t), Σ_θ(x_t, t))

学習目標（DDPM）:
  L = E_{t, x_0, ε} [ ||ε - ε_θ(x_t, t)||^2 ]

  ε_θ: ノイズを予測するニューラルネットワーク
  t:   時刻（1 ～ T）
  ε:   加えたノイズ（正解）
  x_t: t ステップ後のノイズあり画像

デノイジングの計算:
  x_{t-1} = (1/√α_t) × (x_t - β_t/√(1-ᾱ_t) × ε_θ(x_t, t)) + σ_t × z
  （α_t = 1 - β_t, z ~ N(0, I)）
```

---

## DDPM（Denoising Diffusion Probabilistic Models）

Ho et al. (2020) が提案した拡散モデルの基本形。T=1000 ステップのノイズ除去で高品質な画像を生成する。

| 設定 | 値 |
|---|---|
| ステップ数 T | 1000 |
| β_1 | 0.0001 |
| β_T | 0.02 |
| アーキテクチャ | U-Net + Self-Attention |
| 学習目標 | ノイズ ε の予測 |

---

## スコアマッチング（Score Matching）

スコアベース生成モデルは、確率分布の対数密度勾配（スコア）を学習するアプローチで、拡散モデルと深く関連する。

```
スコア関数:
  s_θ(x, t) ≈ ∇_x log p_t(x)

Langevin ダイナミクスでサンプリング:
  x_{i+1} = x_i + ε × s_θ(x_i, t) + √(2ε) × z

拡散モデルとの関係:
  ε_θ(x_t, t) ≈ -√(1-ᾱ_t) × s_θ(x_t, t)
  （ノイズ予測とスコア予測は等価）
```

---

## PyTorch による実装

### ノイズスケジュールの計算

```python
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np


def get_linear_beta_schedule(timesteps: int, beta_start=1e-4, beta_end=0.02):
    """線形ノイズスケジュール"""
    return torch.linspace(beta_start, beta_end, timesteps)


def get_cosine_beta_schedule(timesteps: int, s=0.008):
    """コサインノイズスケジュール（Nichol & Dhariwal, 2021）"""
    steps = timesteps + 1
    x = torch.linspace(0, timesteps, steps)
    alphas_cumprod = torch.cos(((x / timesteps) + s) / (1 + s) * torch.pi * 0.5) ** 2
    alphas_cumprod = alphas_cumprod / alphas_cumprod[0]
    betas = 1 - (alphas_cumprod[1:] / alphas_cumprod[:-1])
    return torch.clamp(betas, min=0, max=0.999)


class DiffusionSchedule:
    """拡散プロセスのスケジュール管理"""
    def __init__(self, timesteps: int = 1000, schedule: str = "linear"):
        self.T = timesteps

        if schedule == "linear":
            betas = get_linear_beta_schedule(timesteps)
        else:
            betas = get_cosine_beta_schedule(timesteps)

        alphas = 1.0 - betas
        alphas_cumprod = torch.cumprod(alphas, dim=0)

        # 各変数を登録
        self.betas = betas
        self.alphas = alphas
        self.alphas_cumprod = alphas_cumprod
        self.sqrt_alphas_cumprod = torch.sqrt(alphas_cumprod)
        self.sqrt_one_minus_alphas_cumprod = torch.sqrt(1 - alphas_cumprod)

    def q_sample(self, x_0: torch.Tensor, t: torch.Tensor,
                 noise: torch.Tensor = None) -> torch.Tensor:
        """
        前向きプロセス: x_0 から x_t を生成
        x_t = √ᾱ_t × x_0 + √(1-ᾱ_t) × ε
        """
        if noise is None:
            noise = torch.randn_like(x_0)

        device = x_0.device
        sqrt_alphas = self.sqrt_alphas_cumprod[t].to(device)
        sqrt_one_minus = self.sqrt_one_minus_alphas_cumprod[t].to(device)

        # 次元を合わせる: [B] → [B, 1, 1, 1]
        sqrt_alphas = sqrt_alphas[:, None, None, None]
        sqrt_one_minus = sqrt_one_minus[:, None, None, None]

        return sqrt_alphas * x_0 + sqrt_one_minus * noise
```

### U-Net ベースのノイズ予測ネットワーク

```python
class SinusoidalTimeEmbedding(nn.Module):
    """時刻 t のサイン波埋め込み"""
    def __init__(self, dim: int):
        super().__init__()
        self.dim = dim

    def forward(self, t: torch.Tensor) -> torch.Tensor:
        device = t.device
        half_dim = self.dim // 2
        emb = np.log(10000) / (half_dim - 1)
        emb = torch.exp(torch.arange(half_dim, device=device) * -emb)
        emb = t[:, None].float() * emb[None, :]
        return torch.cat([emb.sin(), emb.cos()], dim=-1)


class ResBlock(nn.Module):
    """時刻埋め込みを持つ残差ブロック"""
    def __init__(self, in_ch: int, out_ch: int, time_dim: int):
        super().__init__()
        self.norm1 = nn.GroupNorm(8, in_ch)
        self.conv1 = nn.Conv2d(in_ch, out_ch, 3, padding=1)
        self.time_emb = nn.Linear(time_dim, out_ch)
        self.norm2 = nn.GroupNorm(8, out_ch)
        self.conv2 = nn.Conv2d(out_ch, out_ch, 3, padding=1)
        self.res_conv = nn.Conv2d(in_ch, out_ch, 1) if in_ch != out_ch else nn.Identity()

    def forward(self, x, t_emb):
        h = self.conv1(F.silu(self.norm1(x)))
        h = h + self.time_emb(F.silu(t_emb))[:, :, None, None]
        h = self.conv2(F.silu(self.norm2(h)))
        return h + self.res_conv(x)


class SimpleUNet(nn.Module):
    """拡散モデル用のシンプルな U-Net"""
    def __init__(self, in_channels: int = 3, base_channels: int = 64,
                 time_dim: int = 256):
        super().__init__()
        self.time_mlp = nn.Sequential(
            SinusoidalTimeEmbedding(base_channels),
            nn.Linear(base_channels, time_dim),
            nn.SiLU(),
            nn.Linear(time_dim, time_dim),
        )

        # エンコーダ
        self.enc1 = ResBlock(in_channels, base_channels, time_dim)
        self.down1 = nn.Conv2d(base_channels, base_channels, 3, stride=2, padding=1)
        self.enc2 = ResBlock(base_channels, base_channels * 2, time_dim)
        self.down2 = nn.Conv2d(base_channels * 2, base_channels * 2, 3, stride=2, padding=1)

        # ボトルネック
        self.mid = ResBlock(base_channels * 2, base_channels * 2, time_dim)

        # デコーダ
        self.up2 = nn.ConvTranspose2d(base_channels * 2, base_channels * 2, 2, stride=2)
        self.dec2 = ResBlock(base_channels * 4, base_channels, time_dim)
        self.up1 = nn.ConvTranspose2d(base_channels, base_channels, 2, stride=2)
        self.dec1 = ResBlock(base_channels * 2, base_channels, time_dim)

        self.out = nn.Conv2d(base_channels, in_channels, 1)

    def forward(self, x: torch.Tensor, t: torch.Tensor) -> torch.Tensor:
        t_emb = self.time_mlp(t)

        e1 = self.enc1(x, t_emb)
        e2 = self.enc2(self.down1(e1), t_emb)
        m = self.mid(self.down2(e2), t_emb)

        d2 = self.dec2(torch.cat([self.up2(m), e2], dim=1), t_emb)
        d1 = self.dec1(torch.cat([self.up1(d2), e1], dim=1), t_emb)

        return self.out(d1)
```

### DDPM の学習と生成

```python
def train_ddpm(model, schedule, dataloader, num_epochs=500):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = model.to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=2e-4)

    for epoch in range(num_epochs):
        model.train()
        total_loss = 0.0

        for images, _ in dataloader:
            images = images.to(device)  # [-1, 1] に正規化済み
            batch_size = images.size(0)

            # ランダムな時刻 t をサンプリング
            t = torch.randint(0, schedule.T, (batch_size,), device=device)

            # ノイズのサンプリング
            noise = torch.randn_like(images)

            # 前向きプロセスで x_t を計算
            x_t = schedule.q_sample(images, t, noise)

            # ネットワークでノイズを予測
            noise_pred = model(x_t, t)

            # MSE 損失
            loss = F.mse_loss(noise_pred, noise)

            optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            total_loss += loss.item()

        if (epoch + 1) % 50 == 0:
            print(f"Epoch {epoch+1}: Loss={total_loss/len(dataloader):.6f}")


@torch.no_grad()
def ddpm_sample(model, schedule, image_size, num_samples=4, channels=3):
    """DDPM によるサンプリング（逆プロセス）"""
    device = next(model.parameters()).device
    model.eval()

    # x_T: 純粋なノイズから開始
    x = torch.randn(num_samples, channels, image_size, image_size, device=device)

    betas = schedule.betas.to(device)
    alphas = schedule.alphas.to(device)
    alphas_cumprod = schedule.alphas_cumprod.to(device)

    for t in reversed(range(schedule.T)):
        t_batch = torch.full((num_samples,), t, device=device, dtype=torch.long)
        noise_pred = model(x, t_batch)

        alpha_t = alphas[t]
        alpha_bar_t = alphas_cumprod[t]
        beta_t = betas[t]

        # x_{t-1} の計算
        coef1 = 1 / torch.sqrt(alpha_t)
        coef2 = beta_t / torch.sqrt(1 - alpha_bar_t)
        x = coef1 * (x - coef2 * noise_pred)

        if t > 0:
            noise = torch.randn_like(x)
            x = x + torch.sqrt(beta_t) * noise

    return x.clamp(-1, 1)
```

---

## Stable Diffusion の概要

Stable Diffusion は潜在空間（Latent Space）で拡散プロセスを行う**Latent Diffusion Model**であり、テキスト条件付き生成が可能。

```
アーキテクチャ概要:
  テキスト入力
       ↓
  Text Encoder（CLIP）
       ↓ テキスト埋め込み
       
  画像入力（学習時）
       ↓
  VAE Encoder
       ↓ 潜在表現 z（低次元）
       ↓ ノイズ付加
       ↓
  U-Net（拡散モデル）← テキスト埋め込みを Cross-Attention で条件付け
       ↓ ノイズ予測・除去
       ↓
  VAE Decoder
       ↓
  生成画像

効率性: ピクセル空間ではなく潜在空間で処理するため
  例: 512×512 → 64×64 の潜在空間（1/64 の計算量）
```

---

## 拡散モデルの優位性

| 比較 | GAN | VAE | 拡散モデル |
|---|---|---|---|
| 画像品質 | 高い | 中程度 | 最高水準 |
| 多様性 | Mode Collapse あり | 高い | 非常に高い |
| 学習安定性 | 不安定 | 安定 | 安定 |
| サンプリング速度 | 高速 | 高速 | 遅い（多ステップ） |
| テキスト条件付け | 難しい | 難しい | 容易 |
| 評価指標（FID） | 良好 | 劣る | 最良 |

---

## 使用場面

- **テキストから画像生成**: Stable Diffusion、DALL-E 2、Midjourney
- **画像編集**: インペインティング、アウトペインティング
- **超解像・修復**: 低品質画像の高品質化
- **音声合成**: WaveGrad、DiffWave（音声波形の生成）
- **分子設計**: タンパク質・薬剤分子構造の生成

---

## 参考文献

- Ho et al., "Denoising Diffusion Probabilistic Models (DDPM)" (2020)
- Song et al., "Score-Based Generative Modeling through SDEs" (2021)
- Nichol & Dhariwal, "Improved Denoising Diffusion Probabilistic Models" (2021)
- Rombach et al., "High-Resolution Image Synthesis with Latent Diffusion Models" (2022)
- Ho et al., "Classifier-Free Diffusion Guidance" (2022)

<AffiliateBanner site="ml_intro" />
