import AffiliateBanner from '@site/src/components/AffiliateBanner';

# オートエンコーダによる異常検知

## オートエンコーダによる異常検知とは

オートエンコーダによる異常検知とは、

> 正常データを用いて入力を圧縮・復元するオートエンコーダを学習し、新しいデータの再構成誤差（入力と復元の差）を異常スコアとして使う手法

です。

オートエンコーダは正常データのパターンを学習するため、正常データは小さな再構成誤差で復元できる一方、学習時に見たことのない異常データは復元がうまくいかず誤差が大きくなります。

## エンコーダ・デコーダの構造

| 構成要素 | 役割 | 典型的な実装 |
|----------|------|-------------|
| エンコーダ | 入力 → 潜在表現（圧縮） | 全結合層 / CNN |
| ボトルネック | 低次元の潜在空間 | 線形 / 活性化関数 |
| デコーダ | 潜在表現 → 再構成（復元） | 転置畳み込み / 全結合層 |
| 損失関数 | 再構成誤差 | MSE / BCE |

## 基本実装（PyTorch）

```python
import numpy as np

try:
    import torch
    import torch.nn as nn
    import torch.optim as optim
    from torch.utils.data import DataLoader, TensorDataset

    # 再現性のための乱数固定
    torch.manual_seed(42)
    np.random.seed(42)

    # ============================
    # データの準備（正常のみで学習）
    # ============================
    n_normal = 1000
    n_features = 20

    # 正常データ（低次元の多様体上に分布）
    latent_normal = np.random.randn(n_normal, 4)
    W = np.random.randn(4, n_features)
    X_normal = latent_normal @ W + np.random.randn(n_normal, n_features) * 0.1

    # 異常データ（正常データの多様体から逸脱）
    X_anomaly = np.random.randn(100, n_features) * 3

    # 標準化
    mean = X_normal.mean(axis=0)
    std  = X_normal.std(axis=0) + 1e-8
    X_normal_scaled  = (X_normal - mean) / std
    X_anomaly_scaled = (X_anomaly - mean) / std

    X_train_tensor = torch.FloatTensor(X_normal_scaled[:800])
    X_val_tensor   = torch.FloatTensor(X_normal_scaled[800:])
    X_test_normal  = torch.FloatTensor(X_normal_scaled)
    X_test_anomaly = torch.FloatTensor(X_anomaly_scaled)

    # ============================
    # オートエンコーダのモデル定義
    # ============================
    class AutoEncoder(nn.Module):
        def __init__(self, input_dim: int, latent_dim: int):
            super().__init__()
            self.encoder = nn.Sequential(
                nn.Linear(input_dim, 64),
                nn.ReLU(),
                nn.Linear(64, 32),
                nn.ReLU(),
                nn.Linear(32, latent_dim),
            )
            self.decoder = nn.Sequential(
                nn.Linear(latent_dim, 32),
                nn.ReLU(),
                nn.Linear(32, 64),
                nn.ReLU(),
                nn.Linear(64, input_dim),
            )

        def forward(self, x: torch.Tensor) -> torch.Tensor:
            z = self.encoder(x)
            return self.decoder(z)

        def reconstruction_error(self, x: torch.Tensor) -> torch.Tensor:
            """サンプルごとの再構成誤差（MSE）を返す"""
            x_recon = self.forward(x)
            return ((x - x_recon) ** 2).mean(dim=1)

    # ============================
    # 学習
    # ============================
    model = AutoEncoder(input_dim=n_features, latent_dim=4)
    optimizer = optim.Adam(model.parameters(), lr=1e-3)
    criterion = nn.MSELoss()

    train_loader = DataLoader(TensorDataset(X_train_tensor), batch_size=64, shuffle=True)

    print("=== オートエンコーダの学習 ===")
    for epoch in range(50):
        model.train()
        train_losses = []
        for (batch_x,) in train_loader:
            optimizer.zero_grad()
            recon = model(batch_x)
            loss = criterion(recon, batch_x)
            loss.backward()
            optimizer.step()
            train_losses.append(loss.item())

        if (epoch + 1) % 10 == 0:
            model.eval()
            with torch.no_grad():
                val_loss = criterion(model(X_val_tensor), X_val_tensor).item()
            print(f"  Epoch {epoch+1:>3}: Train Loss={np.mean(train_losses):.6f}, Val Loss={val_loss:.6f}")

except ImportError:
    print("PyTorch が未インストールです。pip install torch でインストールしてください。")
```

## 再構成誤差による異常スコアと閾値設定

```python
import numpy as np

try:
    import torch
    from sklearn.metrics import roc_auc_score, precision_recall_curve

    # 前のセルのモデルと変数を引き継ぐ前提

    model.eval()
    with torch.no_grad():
        errors_normal  = model.reconstruction_error(X_test_normal).numpy()
        errors_anomaly = model.reconstruction_error(X_test_anomaly).numpy()

    print("=== 再構成誤差の分布 ===")
    print(f"正常データ:  mean={errors_normal.mean():.4f}, std={errors_normal.std():.4f}")
    print(f"異常データ:  mean={errors_anomaly.mean():.4f}, std={errors_anomaly.std():.4f}")

    # 閾値設定：検証用正常データの95パーセンタイルを使用
    with torch.no_grad():
        val_errors = model.reconstruction_error(X_val_tensor).numpy()
    threshold = np.percentile(val_errors, 95)
    print(f"\n閾値（正常データの95パーセンタイル）: {threshold:.4f}")

    # 評価
    all_errors = np.concatenate([errors_normal, errors_anomaly])
    all_labels  = np.concatenate([np.zeros(len(errors_normal)), np.ones(len(errors_anomaly))])

    auc = roc_auc_score(all_labels, all_errors)
    pred = (all_errors > threshold).astype(int)
    tp = ((pred == 1) & (all_labels == 1)).sum()
    fp = ((pred == 1) & (all_labels == 0)).sum()
    fn = ((pred == 0) & (all_labels == 1)).sum()

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall    = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1        = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0

    print(f"\nROC-AUC:   {auc:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall:    {recall:.4f}")
    print(f"F1:        {f1:.4f}")

except (ImportError, NameError):
    print("PyTorch が未インストールまたは前のセルが未実行のためスキップ")
```

## 変分オートエンコーダ（VAE）との比較

```python
import numpy as np

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F

    class VAE(nn.Module):
        """変分オートエンコーダ（VAE）の実装"""
        def __init__(self, input_dim: int, latent_dim: int):
            super().__init__()
            # エンコーダ: 平均と対数分散を出力
            self.fc_enc = nn.Sequential(
                nn.Linear(input_dim, 64),
                nn.ReLU(),
                nn.Linear(64, 32),
                nn.ReLU(),
            )
            self.fc_mu     = nn.Linear(32, latent_dim)
            self.fc_logvar = nn.Linear(32, latent_dim)

            # デコーダ
            self.decoder = nn.Sequential(
                nn.Linear(latent_dim, 32),
                nn.ReLU(),
                nn.Linear(32, 64),
                nn.ReLU(),
                nn.Linear(64, input_dim),
            )

        def encode(self, x):
            h = self.fc_enc(x)
            return self.fc_mu(h), self.fc_logvar(h)

        def reparameterize(self, mu, logvar):
            """再パラメータ化トリック: z = mu + eps * std"""
            std = torch.exp(0.5 * logvar)
            eps = torch.randn_like(std)
            return mu + eps * std

        def forward(self, x):
            mu, logvar = self.encode(x)
            z = self.reparameterize(mu, logvar)
            return self.decoder(z), mu, logvar

        def vae_loss(self, x, x_recon, mu, logvar):
            """再構成損失 + KL ダイバージェンス"""
            recon_loss = F.mse_loss(x_recon, x, reduction='sum')
            kl_loss = -0.5 * torch.sum(1 + logvar - mu.pow(2) - logvar.exp())
            return recon_loss + kl_loss

    print("=== VAE の学習 ===")
    vae = VAE(input_dim=20, latent_dim=4)
    optimizer_vae = torch.optim.Adam(vae.parameters(), lr=1e-3)

    for epoch in range(30):
        vae.train()
        total_loss = 0
        for (batch_x,) in DataLoader(TensorDataset(X_train_tensor), batch_size=64, shuffle=True):
            optimizer_vae.zero_grad()
            x_recon, mu, logvar = vae(batch_x)
            loss = vae.vae_loss(batch_x, x_recon, mu, logvar)
            loss.backward()
            optimizer_vae.step()
            total_loss += loss.item()

        if (epoch + 1) % 10 == 0:
            print(f"  Epoch {epoch+1:>3}: Total Loss={total_loss/len(X_train_tensor):.4f}")

    print("\n【AE vs VAE の違い】")
    print("AE:  決定論的な潜在表現 z = Encoder(x)")
    print("VAE: 確率的な潜在表現 z ~ N(mu, sigma^2)")
    print("     → KL ダイバージェンス正則化で潜在空間が正規分布に近くなる")
    print("     → 補間・サンプリングが意味を持つ生成モデルとして使える")
    print("     → 異常スコア = 再構成誤差 + KL ダイバージェンス（ELBO ベース）")

except (ImportError, NameError):
    print("PyTorch が未インストールまたは前のセルが未実行のためスキップ")
```

## sklearn の AutoEncoder（比較用: 簡易実装）

```python
import numpy as np
from sklearn.neural_network import MLPRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score

np.random.seed(42)

# sklearn の MLPRegressor でオートエンコーダを近似実装
n_features = 20
X_normal   = np.random.randn(800, n_features)
X_anomaly  = np.random.randn(100, n_features) * 4

scaler = StandardScaler()
X_train = scaler.fit_transform(X_normal[:700])
X_val   = scaler.transform(X_normal[700:])
X_test_n = scaler.transform(X_normal)
X_test_a = scaler.transform(X_anomaly)

# 入力と出力が同じ（再構成タスク）
ae_sklearn = MLPRegressor(
    hidden_layer_sizes=(32, 8, 32),  # ボトルネック構造
    activation='relu',
    max_iter=200,
    random_state=42,
    early_stopping=True,
    validation_fraction=0.1
)
ae_sklearn.fit(X_train, X_train)  # 入力 = ターゲット

# 再構成誤差の計算
recon_errors_n = np.mean((X_test_n - ae_sklearn.predict(X_test_n))**2, axis=1)
recon_errors_a = np.mean((X_test_a - ae_sklearn.predict(X_test_a))**2, axis=1)

all_errors = np.concatenate([recon_errors_n, recon_errors_a])
all_labels  = np.concatenate([np.zeros(len(recon_errors_n)), np.ones(len(recon_errors_a))])
auc = roc_auc_score(all_labels, all_errors)

print(f"sklearn MLPRegressor ベースの AE:")
print(f"  正常の再構成誤差: {recon_errors_n.mean():.4f}")
print(f"  異常の再構成誤差: {recon_errors_a.mean():.4f}")
print(f"  ROC-AUC: {auc:.4f}")
```

## 使用場面

- **製造業の異常検知**: 高次元センサーデータのパターンから設備の異常を検出
- **ネットワーク侵入検知**: 正常トラフィックのパターンを学習し、異常な通信を特定
- **医療画像の異常検知**: 正常画像のみで学習し、病変部位を再構成誤差マップで可視化
- **テキストの異常検知**: 正常文書のパターンから逸脱したテキストを検出
- **時系列異常検知**: LSTM-AE を使った時系列データの異常区間検出

## 参考文献

<AffiliateBanner site="ml_intro" />

- Kingma, D.P. & Welling, M. (2014). Auto-encoding variational Bayes. *ICLR*.
- An, J. & Cho, S. (2015). Variational autoencoder based anomaly detection using reconstruction probability. *Workshop on Statistical Machine Learning*.
- Goodfellow, I., Bengio, Y. & Courville, A. (2016). *Deep Learning*, Chapter 14. MIT Press.
- [PyTorch AutoEncoder チュートリアル](https://pytorch.org/tutorials/)
