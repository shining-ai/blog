import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 損失関数

損失関数（Loss Function）は、モデルの予測値と正解値の「ズレ」を定量化する関数である。学習はこの損失を最小化する方向に重みを更新する最適化問題であり、タスクの特性に合った損失関数を選ぶことが重要である。

## 損失関数とは

> 損失関数（コスト関数）は、モデルの予測 $\hat{y}$ と真の値 $y$ との乖離を測るスカラー値を返す関数である。学習アルゴリズムはこの値を勾配降下法によって最小化することで、モデルのパラメータを最適化する。

---

## 回帰タスクの損失関数

### MSE（平均二乗誤差）

$$
\text{MSE} = \frac{1}{n} \sum_{i=1}^{n} (y_i - \hat{y}_i)^2
$$

- 外れ値の影響を大きく受ける（二乗のため）
- 微分が滑らかで最適化しやすい
- RMSE（平方根）を取ると単位が元データと一致する

### MAE（平均絶対誤差）

$$
\text{MAE} = \frac{1}{n} \sum_{i=1}^{n} |y_i - \hat{y}_i|
$$

- 外れ値に対してロバスト
- 原点で微分不可（解決策: Huber Loss）

### Huber Loss

$$
L_\delta(y, \hat{y}) = \begin{cases}
\frac{1}{2}(y - \hat{y})^2 & \text{if } |y - \hat{y}| \leq \delta \\
\delta|y - \hat{y}| - \frac{\delta^2}{2} & \text{otherwise}
\end{cases}
$$

- MSE と MAE のハイブリッド
- $\delta$ 内は MSE、外は MAE の性質を持つ

---

## 分類タスクの損失関数

### Binary Cross Entropy（2値分類）

$$
\text{BCE} = -\frac{1}{n}\sum_{i=1}^{n} \left[ y_i \log \hat{y}_i + (1 - y_i) \log(1 - \hat{y}_i) \right]
$$

### Categorical Cross Entropy（多値分類）

$$
\text{CE} = -\frac{1}{n}\sum_{i=1}^{n} \sum_{k=1}^{K} y_{ik} \log \hat{y}_{ik}
$$

- $y_{ik}$: クラス $k$ の one-hot ラベル
- $\hat{y}_{ik}$: Softmax 後の予測確率

### Focal Loss

クラス不均衡問題（正例が少ない検出タスク）で有効。

$$
\text{FL}(p_t) = -\alpha_t (1 - p_t)^\gamma \log(p_t)
$$

- $(1 - p_t)^\gamma$: 簡単なサンプルの重みを下げるフォーカスパラメータ
- $\gamma = 0$ のとき通常の Cross Entropy と等価
- 物体検出（RetinaNet）で導入

---

## Python 実装

```python
import numpy as np
import matplotlib.pyplot as plt
import torch
import torch.nn as nn
import torch.nn.functional as F


# ===== NumPy 実装 =====

def mse_loss(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    return np.mean((y_true - y_pred) ** 2)


def mae_loss(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    return np.mean(np.abs(y_true - y_pred))


def huber_loss(y_true: np.ndarray, y_pred: np.ndarray, delta: float = 1.0) -> float:
    residual = np.abs(y_true - y_pred)
    return np.where(
        residual <= delta,
        0.5 * residual ** 2,
        delta * residual - 0.5 * delta ** 2,
    ).mean()


def binary_cross_entropy(y_true: np.ndarray, y_pred: np.ndarray,
                          eps: float = 1e-7) -> float:
    y_pred = np.clip(y_pred, eps, 1 - eps)
    return -np.mean(y_true * np.log(y_pred) + (1 - y_true) * np.log(1 - y_pred))


def categorical_cross_entropy(y_true: np.ndarray, y_pred: np.ndarray,
                               eps: float = 1e-7) -> float:
    """y_true: one-hot, y_pred: softmax 出力"""
    y_pred = np.clip(y_pred, eps, 1.0)
    return -np.mean(np.sum(y_true * np.log(y_pred), axis=1))


# 動作確認
np.random.seed(42)
y_true_reg = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
y_pred_reg = np.array([1.1, 1.9, 3.5, 3.8, 5.2])

print("=== 回帰損失 ===")
print(f"MSE:   {mse_loss(y_true_reg, y_pred_reg):.4f}")
print(f"MAE:   {mae_loss(y_true_reg, y_pred_reg):.4f}")
print(f"Huber: {huber_loss(y_true_reg, y_pred_reg):.4f}")

y_true_cls = np.array([0, 1, 1, 0])
y_pred_cls = np.array([0.1, 0.9, 0.8, 0.3])

print("\n=== 分類損失 ===")
print(f"BCE: {binary_cross_entropy(y_true_cls, y_pred_cls):.4f}")


# ===== Focal Loss の実装 =====

class FocalLoss(nn.Module):
    """Focal Loss for Class Imbalance"""

    def __init__(self, alpha: float = 0.25, gamma: float = 2.0):
        super().__init__()
        self.alpha = alpha
        self.gamma = gamma

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        """
        logits: (B,) - 2値分類の生スコア
        targets: (B,) - 0 または 1
        """
        probs = torch.sigmoid(logits)
        bce = F.binary_cross_entropy_with_logits(logits, targets.float(),
                                                   reduction="none")
        p_t = probs * targets + (1 - probs) * (1 - targets)
        alpha_t = self.alpha * targets + (1 - self.alpha) * (1 - targets)
        focal_weight = alpha_t * (1 - p_t) ** self.gamma
        return (focal_weight * bce).mean()


# ===== PyTorch の標準損失関数 =====

print("\n=== PyTorch 損失関数 ===")

# 回帰
y_true_t = torch.tensor([1.0, 2.0, 3.0, 4.0, 5.0])
y_pred_t = torch.tensor([1.1, 1.9, 3.5, 3.8, 5.2])
print(f"MSE (PyTorch):   {nn.MSELoss()(y_pred_t, y_true_t):.4f}")
print(f"MAE (PyTorch):   {nn.L1Loss()(y_pred_t, y_true_t):.4f}")
print(f"Huber (PyTorch): {nn.HuberLoss(delta=1.0)(y_pred_t, y_true_t):.4f}")

# 多値分類
logits = torch.randn(8, 5)   # バッチサイズ8, クラス5
labels = torch.randint(0, 5, (8,))
print(f"\nCrossEntropy (PyTorch): {nn.CrossEntropyLoss()(logits, labels):.4f}")
# PyTorch の CrossEntropyLoss は Softmax + NLLLoss を内包している

# 2値分類
logits_bin = torch.randn(8)
labels_bin = torch.randint(0, 2, (8,)).float()
print(f"BCE with logits:        {nn.BCEWithLogitsLoss()(logits_bin, labels_bin):.4f}")

# Focal Loss
focal = FocalLoss(alpha=0.25, gamma=2.0)
print(f"Focal Loss:             {focal(logits_bin, labels_bin.long()):.4f}")
```

---

## 損失関数の可視化

```python
import numpy as np
import matplotlib.pyplot as plt


def plot_regression_losses():
    """回帰損失関数の比較可視化"""
    residuals = np.linspace(-4, 4, 200)

    mse = 0.5 * residuals ** 2
    mae = np.abs(residuals)
    huber = np.where(
        np.abs(residuals) <= 1.0,
        0.5 * residuals ** 2,
        np.abs(residuals) - 0.5,
    )

    fig, ax = plt.subplots(figsize=(8, 5))
    ax.plot(residuals, mse, label="MSE (×0.5)", linewidth=2)
    ax.plot(residuals, mae, label="MAE", linewidth=2, linestyle="--")
    ax.plot(residuals, huber, label="Huber (δ=1)", linewidth=2, linestyle="-.")
    ax.set_xlabel("残差 (y - ŷ)")
    ax.set_ylabel("損失値")
    ax.set_title("回帰損失関数の比較")
    ax.legend()
    ax.set_ylim(0, 6)
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig("regression_losses.png", dpi=150)
    plt.show()


def plot_focal_loss():
    """Focal Loss のγ依存性可視化"""
    p = np.linspace(0.01, 0.99, 200)
    bce = -np.log(p)

    fig, ax = plt.subplots(figsize=(8, 5))
    ax.plot(p, bce, label="γ=0 (CrossEntropy)", linewidth=2)
    for gamma in [0.5, 1.0, 2.0, 5.0]:
        focal = (1 - p) ** gamma * bce
        ax.plot(p, focal, label=f"γ={gamma}", linewidth=1.5, linestyle="--")

    ax.set_xlabel("予測確率 $p_t$")
    ax.set_ylabel("損失値")
    ax.set_title("Focal Loss のγによる変化")
    ax.legend()
    ax.set_ylim(0, 5)
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig("focal_loss.png", dpi=150)
    plt.show()


plot_regression_losses()
plot_focal_loss()
```

---

## タスクに合わせた損失関数の選択指針

| タスク | 推奨損失関数 | 備考 |
|--------|------------|------|
| 回帰（外れ値少） | MSE / L2 | 滑らかな勾配 |
| 回帰（外れ値多） | MAE / Huber | ロバスト |
| 2値分類 | BCE with Logits | 数値安定 |
| 多値分類 | Cross Entropy | Softmax 込み |
| クラス不均衡 | Focal Loss | 検出タスク |
| 確率分布の回帰 | KL Divergence | VAE, 知識蒸留 |
| ランキング | Contrastive / Triplet | 類似度学習 |

---

## 使用場面

| シナリオ | 損失関数 |
|---------|---------|
| 株価・温度などの数値予測 | MSE または Huber |
| メールのスパム判定 | BCE with Logits |
| 画像の多クラス分類 | CrossEntropyLoss |
| 物体検出（背景が多い） | Focal Loss |
| 生成モデルの再構成損失 | MSE または BCE |
| 言語モデルの次トークン予測 | CrossEntropyLoss |

---

## 参考文献

- Lin, T. Y., et al. (2017). "Focal loss for dense object detection." *ICCV*. (RetinaNet)
- Huber, P. J. (1964). "Robust estimation of a location parameter." *The Annals of Mathematical Statistics*.
- PyTorch 公式: https://pytorch.org/docs/stable/nn.html#loss-functions

<AffiliateBanner site="ml_intro" />
