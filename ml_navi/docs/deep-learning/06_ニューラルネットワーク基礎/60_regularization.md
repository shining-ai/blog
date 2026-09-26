import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 正則化テクニック

深層ニューラルネットワークは表現力が高い反面、訓練データに過適合（過学習）しやすい。正則化テクニックはこの過学習を抑制し、未見データへの汎化性能を高めるための手法群である。現代の深層学習では複数の正則化手法を組み合わせて使用するのが標準的である。

## 正則化とは

> 正則化（Regularization）は、モデルが訓練データに過学習することを防ぐための手法の総称である。モデルの複雑さに対するペナルティを追加したり、学習プロセスにランダム性を導入したりすることで、汎化性能を向上させる。

---

## 主要な正則化手法の比較

| 手法 | 適用場所 | 主なメカニズム |
|------|---------|-------------|
| Dropout | 隠れ層 | ランダムにニューロンを無効化 |
| Batch Normalization | 各層の出力 | ミニバッチ内で正規化 |
| Layer Normalization | 各層の出力 | サンプル内で正規化 |
| Weight Decay (L2) | 損失関数 | 大きな重みにペナルティ |
| Early Stopping | 学習ループ | 過学習前に学習を停止 |
| Data Augmentation | データ | 訓練データを人工的に増加 |

---

## Dropout

ニューロンをランダムに無効化することで、特定の特徴量への依存を防ぐ。

$$
\tilde{a}_i = \begin{cases} a_i / p & \text{確率 } p \text{ でアクティブ（inverted dropout）} \\ 0 & \text{確率 } 1-p \text{ で無効化} \end{cases}
$$

- 訓練時のみ適用（評価時は全ニューロンを使用）
- inverted dropout: 訓練時にスケールすることで推論時に補正不要
- 典型値: 全結合層 $p=0.5$、入力層 $p=0.8$

```python
import numpy as np
import torch
import torch.nn as nn


# ===== NumPy による Dropout の手動実装 =====
class ManualDropout:
    def __init__(self, p: float = 0.5):
        """p: ドロップする確率（1-p の確率でアクティブ）"""
        self.p = p
        self.mask = None
        self.training = True

    def forward(self, x: np.ndarray) -> np.ndarray:
        if not self.training or self.p == 0:
            return x
        # inverted dropout
        self.mask = np.random.rand(*x.shape) > self.p
        return x * self.mask / (1 - self.p)


# 動作確認
x = np.ones((2, 8))
dropout = ManualDropout(p=0.5)
print("訓練時（Dropout on）:", dropout.forward(x))
dropout.training = False
print("推論時（Dropout off）:", dropout.forward(x))


# ===== PyTorch の Dropout =====
class MLPWithDropout(nn.Module):
    def __init__(self, input_dim, hidden_dim, output_dim, dropout_rate=0.5):
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(p=dropout_rate),     # 隠れ層に Dropout
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(p=dropout_rate),
            nn.Linear(hidden_dim, output_dim),
        )

    def forward(self, x):
        return self.network(x)


model = MLPWithDropout(10, 64, 5, dropout_rate=0.3)
x = torch.randn(4, 10)

model.train()
out_train = model(x)
print("\nDropout 訓練時:", out_train)

model.eval()
out_eval = model(x)
print("Dropout 推論時:", out_eval)   # 決定論的な出力
```

---

## Batch Normalization

ミニバッチ内の各特徴量を正規化し、学習を安定化させる。

$$
\hat{x}_i = \frac{x_i - \mu_B}{\sqrt{\sigma_B^2 + \epsilon}}
$$
$$
y_i = \gamma \hat{x}_i + \beta
$$

- $\mu_B$: ミニバッチの平均、$\sigma_B^2$: ミニバッチの分散
- $\gamma, \beta$: 学習可能なスケールとシフト
- 学習率を大きく設定可能になり、収束が速まる
- 推論時は訓練中に蓄積した移動平均・分散を使用

```python
import torch
import torch.nn as nn
import numpy as np


# ===== Batch Normalization の手動実装 =====
class ManualBatchNorm1d:
    def __init__(self, num_features: int, eps: float = 1e-5, momentum: float = 0.1):
        self.eps = eps
        self.momentum = momentum
        self.gamma = np.ones(num_features)
        self.beta = np.zeros(num_features)
        # 推論時用の移動統計量
        self.running_mean = np.zeros(num_features)
        self.running_var = np.ones(num_features)
        self.training = True

    def forward(self, x: np.ndarray) -> np.ndarray:
        if self.training:
            mean = x.mean(axis=0)
            var = x.var(axis=0)
            # 移動平均の更新
            self.running_mean = (1 - self.momentum) * self.running_mean + self.momentum * mean
            self.running_var = (1 - self.momentum) * self.running_var + self.momentum * var
        else:
            mean = self.running_mean
            var = self.running_var

        x_norm = (x - mean) / np.sqrt(var + self.eps)
        return self.gamma * x_norm + self.beta


# 動作確認
np.random.seed(42)
x = np.random.randn(8, 4) * 5 + 3   # 平均3、標準偏差5のデータ
bn = ManualBatchNorm1d(4)
x_norm = bn.forward(x)
print("BN後の平均:", x_norm.mean(axis=0).round(3))   # ≈ 0
print("BN後の分散:", x_norm.var(axis=0).round(3))    # ≈ 1


# ===== Layer Normalization =====
class ManualLayerNorm:
    """Layer Norm: 各サンプルの特徴量次元で正規化"""

    def __init__(self, normalized_shape: int, eps: float = 1e-5):
        self.eps = eps
        self.gamma = np.ones(normalized_shape)
        self.beta = np.zeros(normalized_shape)

    def forward(self, x: np.ndarray) -> np.ndarray:
        mean = x.mean(axis=-1, keepdims=True)
        var = x.var(axis=-1, keepdims=True)
        x_norm = (x - mean) / np.sqrt(var + self.eps)
        return self.gamma * x_norm + self.beta


# BN vs LN の比較
x = np.random.randn(4, 8)
bn = ManualBatchNorm1d(8)
ln = ManualLayerNorm(8)

print("\nBN後（各特徴量の平均≈0）:", bn.forward(x).mean(axis=0).round(3))
print("LN後（各サンプルの平均≈0）:", ln.forward(x).mean(axis=1).round(3))
```

---

## Batch Normalization vs Layer Normalization

| 特性 | Batch Normalization | Layer Normalization |
|------|--------------------|--------------------|
| 正規化方向 | バッチ方向（各特徴量） | 特徴量方向（各サンプル） |
| バッチサイズ依存 | 大きいほど安定 | なし |
| 主な用途 | CNN | Transformer・RNN |
| 推論時の挙動 | 移動平均を使用 | 同じ計算 |

---

## Weight Decay（L2 正則化）

損失関数に重みの L2 ノルムのペナルティを追加する。

$$
L_{\text{total}} = L_{\text{task}} + \frac{\lambda}{2} \sum_{w} w^2
$$

更新式：

$$
w \leftarrow w - \eta \nabla_w L - \eta \lambda w = w(1 - \eta\lambda) - \eta \nabla_w L
$$

- 大きな重みを抑制し、モデルをシンプルに保つ
- 典型値: $\lambda = 10^{-4}$ 〜 $10^{-2}$

```python
import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
import matplotlib.pyplot as plt


# Weight Decay の効果確認
def train_with_wd(weight_decay: float, epochs: int = 100):
    model = nn.Sequential(nn.Linear(10, 64), nn.ReLU(), nn.Linear(64, 1))
    optimizer = optim.AdamW(model.parameters(), lr=1e-3, weight_decay=weight_decay)
    criterion = nn.MSELoss()

    # 小さなデータセット（過学習が起きやすい設定）
    np.random.seed(42)
    X = torch.randn(20, 10)
    y = torch.randn(20, 1)
    X_val = torch.randn(100, 10)
    y_val = torch.randn(100, 1)

    train_losses, val_losses = [], []
    for _ in range(epochs):
        model.train()
        optimizer.zero_grad()
        loss = criterion(model(X), y)
        loss.backward()
        optimizer.step()
        train_losses.append(loss.item())

        model.eval()
        with torch.no_grad():
            val_losses.append(criterion(model(X_val), y_val).item())

    return train_losses, val_losses


train_loss_0, val_loss_0 = train_with_wd(0.0)
train_loss_wd, val_loss_wd = train_with_wd(0.01)
print(f"WD=0.00 最終 Train/Val: {train_loss_0[-1]:.4f}/{val_loss_0[-1]:.4f}")
print(f"WD=0.01 最終 Train/Val: {train_loss_wd[-1]:.4f}/{val_loss_wd[-1]:.4f}")
```

---

## Early Stopping

```python
import numpy as np
import torch
import torch.nn as nn


class EarlyStopping:
    """検証損失が改善しない場合に学習を早期終了"""

    def __init__(self, patience: int = 10, min_delta: float = 1e-4,
                 restore_best: bool = True):
        self.patience = patience
        self.min_delta = min_delta
        self.restore_best = restore_best
        self.best_loss = float("inf")
        self.counter = 0
        self.best_weights = None
        self.stopped_epoch = 0

    def __call__(self, val_loss: float, model: nn.Module) -> bool:
        """True を返すと学習を停止する"""
        if val_loss < self.best_loss - self.min_delta:
            self.best_loss = val_loss
            self.counter = 0
            if self.restore_best:
                import copy
                self.best_weights = copy.deepcopy(model.state_dict())
        else:
            self.counter += 1
            if self.counter >= self.patience:
                if self.restore_best and self.best_weights is not None:
                    model.load_state_dict(self.best_weights)
                return True
        return False


# 使用例
model = nn.Sequential(nn.Linear(4, 16), nn.ReLU(), nn.Linear(16, 1))
optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
early_stopping = EarlyStopping(patience=5, min_delta=1e-4)

for epoch in range(200):
    # 模擬的な検証損失（途中から増加）
    if epoch < 50:
        val_loss = 1.0 - epoch * 0.01
    else:
        val_loss = 0.5 + (epoch - 50) * 0.005

    if early_stopping(val_loss, model):
        print(f"Early stopping at epoch {epoch}, best val_loss={early_stopping.best_loss:.4f}")
        break
```

---

## 正則化の組み合わせ例

```python
import torch
import torch.nn as nn


class RegularizedNet(nn.Module):
    """実践的な正則化の組み合わせ例"""

    def __init__(self, input_dim: int, output_dim: int):
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(input_dim, 256),
            nn.BatchNorm1d(256),        # Batch Normalization
            nn.GELU(),
            nn.Dropout(p=0.3),          # Dropout

            nn.Linear(256, 128),
            nn.BatchNorm1d(128),
            nn.GELU(),
            nn.Dropout(p=0.3),

            nn.Linear(128, 64),
            nn.BatchNorm1d(64),
            nn.GELU(),
            nn.Dropout(p=0.2),          # 出力層に近いほど弱く

            nn.Linear(64, output_dim),
        )

    def forward(self, x):
        return self.network(x)


model = RegularizedNet(input_dim=20, output_dim=5)
# Weight Decay を AdamW で適用
optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-2)
print("パラメータ数:", sum(p.numel() for p in model.parameters()))
```

---

## 使用場面

| 正則化手法 | 有効な場面 |
|---------|----------|
| Dropout | 大規模全結合層、少データ |
| Batch Normalization | CNN、大バッチ学習 |
| Layer Normalization | Transformer、RNN、小バッチ |
| Weight Decay | 汎用的（常に適用推奨） |
| Early Stopping | 訓練時間を短縮したい場合 |
| Data Augmentation | 画像・音声など |

---

## 参考文献

- Srivastava, N., et al. (2014). "Dropout: A simple way to prevent neural networks from overfitting." *JMLR*, 15, 1929–1958.
- Ioffe, S., & Szegedy, C. (2015). "Batch normalization: Accelerating deep network training by reducing internal covariate shift." *ICML*.
- Ba, J. L., Kiros, J. R., & Hinton, G. E. (2016). "Layer normalization." *arXiv:1607.06450*.

<AffiliateBanner site="ml_intro" />
