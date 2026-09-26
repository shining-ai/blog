import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 最適化アルゴリズム

ニューラルネットワークの学習は、損失関数を最小化するパラメータを見つける最適化問題である。単純な勾配降下法から始まり、モメンタム・適応学習率など様々な改良が生まれた。最適化アルゴリズムの選択は学習速度・安定性・最終精度に大きく影響する。

## 最適化アルゴリズムとは

> 最適化アルゴリズム（オプティマイザ）は、損失関数の勾配情報を用いてニューラルネットワークのパラメータを反復的に更新し、損失を最小化する手順である。単純な勾配降下法から、学習率を適応的に調整する高度な手法まで多様なアルゴリズムが存在する。

---

## 主要な最適化アルゴリズム一覧

| アルゴリズム | 特徴 | 主な用途 |
|------------|------|---------|
| SGD | 最も基本的 | SVM、シンプルなモデル |
| SGD + Momentum | 振動を抑制 | CNN の学習 |
| RMSprop | 適応学習率 | RNN の学習 |
| Adam | Momentum + RMSprop | 汎用的（最も広く使用） |
| AdamW | Adam + 正しい重み減衰 | Transformer 系 |
| Lion | 符号ベースの更新 | 大規模モデル |

---

## 各アルゴリズムの詳細

### SGD（確率的勾配降下法）

$$
\theta \leftarrow \theta - \eta \nabla_\theta L(\theta)
$$

- バッチ全体ではなくミニバッチで更新
- 学習率 $\eta$ の設定が重要
- 鞍点（saddle point）に陥りやすい

### Momentum

$$
v \leftarrow \beta v - \eta \nabla_\theta L
$$
$$
\theta \leftarrow \theta + v
$$

- 過去の勾配の指数移動平均を加速度として利用
- 典型値: $\beta = 0.9$
- 振動を抑制し、収束を加速

### RMSprop

$$
G \leftarrow \rho G + (1 - \rho)(\nabla_\theta L)^2
$$
$$
\theta \leftarrow \theta - \frac{\eta}{\sqrt{G + \epsilon}} \nabla_\theta L
$$

- パラメータごとに学習率を適応調整
- 勾配の大きいパラメータは学習率を下げる
- RNN の学習に有効

### Adam

$$
m \leftarrow \beta_1 m + (1 - \beta_1) \nabla_\theta L \quad \text{（1次モーメント）}
$$
$$
v \leftarrow \beta_2 v + (1 - \beta_2)(\nabla_\theta L)^2 \quad \text{（2次モーメント）}
$$
$$
\hat{m} = \frac{m}{1 - \beta_1^t}, \quad \hat{v} = \frac{v}{1 - \beta_2^t} \quad \text{（バイアス補正）}
$$
$$
\theta \leftarrow \theta - \frac{\eta \hat{m}}{\sqrt{\hat{v}} + \epsilon}
$$

- 典型値: $\beta_1=0.9$, $\beta_2=0.999$, $\epsilon=10^{-8}$
- ほとんどのタスクで良好な初期パフォーマンス

### AdamW

Adam の重み減衰（L2正則化）を正しく実装したもの。

$$
\theta \leftarrow \theta - \frac{\eta \hat{m}}{\sqrt{\hat{v}} + \epsilon} - \eta \lambda \theta
$$

- 通常の Adam は L2 正則化が適応学習率と相互作用する問題がある
- AdamW は重み減衰を勾配更新と分離
- Transformer・BERT・GPT 系モデルの標準

---

## Python 実装

```python
import numpy as np
import matplotlib.pyplot as plt
from typing import Dict


class Optimizer:
    """最適化アルゴリズムの基底クラス"""

    def __init__(self, lr: float):
        self.lr = lr

    def update(self, params: Dict, grads: Dict) -> None:
        raise NotImplementedError


class SGD(Optimizer):
    def update(self, params: Dict, grads: Dict) -> None:
        for key in params:
            params[key] -= self.lr * grads[key]


class SGDMomentum(Optimizer):
    def __init__(self, lr: float, momentum: float = 0.9):
        super().__init__(lr)
        self.momentum = momentum
        self.velocity = {}

    def update(self, params: Dict, grads: Dict) -> None:
        for key in params:
            if key not in self.velocity:
                self.velocity[key] = np.zeros_like(params[key])
            v = self.velocity[key]
            v *= self.momentum
            v -= self.lr * grads[key]
            params[key] += v


class RMSprop(Optimizer):
    def __init__(self, lr: float = 0.001, rho: float = 0.9, eps: float = 1e-8):
        super().__init__(lr)
        self.rho = rho
        self.eps = eps
        self.cache = {}

    def update(self, params: Dict, grads: Dict) -> None:
        for key in params:
            if key not in self.cache:
                self.cache[key] = np.zeros_like(params[key])
            self.cache[key] = self.rho * self.cache[key] + (1 - self.rho) * grads[key]**2
            params[key] -= self.lr * grads[key] / (np.sqrt(self.cache[key]) + self.eps)


class Adam(Optimizer):
    def __init__(self, lr: float = 0.001, beta1: float = 0.9,
                 beta2: float = 0.999, eps: float = 1e-8):
        super().__init__(lr)
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps
        self.m = {}
        self.v = {}
        self.t = 0

    def update(self, params: Dict, grads: Dict) -> None:
        self.t += 1
        for key in params:
            if key not in self.m:
                self.m[key] = np.zeros_like(params[key])
                self.v[key] = np.zeros_like(params[key])

            self.m[key] = self.beta1 * self.m[key] + (1 - self.beta1) * grads[key]
            self.v[key] = self.beta2 * self.v[key] + (1 - self.beta2) * grads[key]**2

            m_hat = self.m[key] / (1 - self.beta1 ** self.t)
            v_hat = self.v[key] / (1 - self.beta2 ** self.t)
            params[key] -= self.lr * m_hat / (np.sqrt(v_hat) + self.eps)


# ===== Rosenbrock 関数での最適化経路比較 =====

def rosenbrock(x, y, a=1, b=100):
    """Rosenbrock 関数: 最小値 (a, a²) = (1, 1)"""
    return (a - x)**2 + b * (y - x**2)**2


def rosenbrock_grad(x, y, a=1, b=100):
    dfdx = -2*(a - x) - 4*b*x*(y - x**2)
    dfdy = 2*b*(y - x**2)
    return dfdx, dfdy


def optimize_rosenbrock(optimizer, n_steps=500, start=(-1.0, 1.0)):
    params = {"x": np.array(start[0]), "y": np.array(start[1])}
    trajectory = [start]

    for _ in range(n_steps):
        gx, gy = rosenbrock_grad(params["x"], params["y"])
        grads = {"x": gx, "y": gy}
        optimizer.update(params, grads)
        trajectory.append((float(params["x"]), float(params["y"])))

    return trajectory


optimizers = {
    "SGD": SGD(lr=0.001),
    "Momentum": SGDMomentum(lr=0.001, momentum=0.9),
    "RMSprop": RMSprop(lr=0.01),
    "Adam": Adam(lr=0.01),
}

trajectories = {}
for name, opt in optimizers.items():
    traj = optimize_rosenbrock(opt, n_steps=300)
    trajectories[name] = traj
    final = traj[-1]
    print(f"{name:10s}: 最終点=({final[0]:.3f}, {final[1]:.3f}), "
          f"損失={rosenbrock(final[0], final[1]):.6f}")
```

---

## PyTorch での実装

```python
import torch
import torch.nn as nn
import torch.optim as optim


# モデルとデータの準備
model = nn.Sequential(nn.Linear(4, 64), nn.ReLU(), nn.Linear(64, 3))
X = torch.randn(100, 4)
y = torch.randint(0, 3, (100,))

# ----- SGD -----
opt_sgd = optim.SGD(model.parameters(), lr=0.01, momentum=0.9, weight_decay=1e-4)

# ----- Adam -----
opt_adam = optim.Adam(model.parameters(), lr=1e-3, betas=(0.9, 0.999), weight_decay=1e-4)

# ----- AdamW（推奨） -----
opt_adamw = optim.AdamW(model.parameters(), lr=1e-3, betas=(0.9, 0.999), weight_decay=0.01)

# ----- RMSprop -----
opt_rms = optim.RMSprop(model.parameters(), lr=1e-3, alpha=0.9)


# ===== 学習率スケジューリング =====
optimizer = optim.AdamW(model.parameters(), lr=1e-3)

# StepLR: 一定ステップごとに減衰
sched_step = optim.lr_scheduler.StepLR(optimizer, step_size=10, gamma=0.5)

# CosineAnnealingLR: コサイン曲線で減衰
sched_cos = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=100, eta_min=1e-6)

# OneCycleLR: ウォームアップ付き（FastAI 発祥）
sched_one = optim.lr_scheduler.OneCycleLR(
    optimizer, max_lr=1e-2, steps_per_epoch=10, epochs=100
)

# LinearWarmup + CosineDecay（手動実装）
class WarmupCosineScheduler:
    def __init__(self, optimizer, warmup_steps, total_steps, min_lr=1e-6):
        self.optimizer = optimizer
        self.warmup_steps = warmup_steps
        self.total_steps = total_steps
        self.min_lr = min_lr
        self.base_lr = optimizer.param_groups[0]["lr"]
        self.current_step = 0

    def step(self):
        self.current_step += 1
        if self.current_step <= self.warmup_steps:
            lr = self.base_lr * self.current_step / self.warmup_steps
        else:
            progress = (self.current_step - self.warmup_steps) / (
                self.total_steps - self.warmup_steps
            )
            lr = self.min_lr + 0.5 * (self.base_lr - self.min_lr) * (
                1 + np.cos(np.pi * progress)
            )
        for pg in self.optimizer.param_groups:
            pg["lr"] = lr
        return lr


import numpy as np
optimizer2 = optim.AdamW(model.parameters(), lr=1e-3)
scheduler = WarmupCosineScheduler(optimizer2, warmup_steps=10, total_steps=100)

# 学習率スケジュールの確認
lrs = [scheduler.step() for _ in range(100)]
print("学習率スケジュール（最初10ステップ）:", [f"{lr:.6f}" for lr in lrs[:10]])
print("学習率スケジュール（最後10ステップ）:", [f"{lr:.6f}" for lr in lrs[-10:]])


# ===== 標準的な学習ループ =====
criterion = nn.CrossEntropyLoss()
dataset = torch.utils.data.TensorDataset(X, y)
loader = torch.utils.data.DataLoader(dataset, batch_size=16, shuffle=True)

optimizer_final = optim.AdamW(model.parameters(), lr=1e-3, weight_decay=0.01)
scheduler_final = optim.lr_scheduler.CosineAnnealingLR(
    optimizer_final, T_max=20, eta_min=1e-6
)

for epoch in range(1, 21):
    model.train()
    total_loss = 0.0
    for X_batch, y_batch in loader:
        optimizer_final.zero_grad()
        logits = model(X_batch)
        loss = criterion(logits, y_batch)
        loss.backward()
        # Gradient Clipping（勾配爆発対策）
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer_final.step()
        total_loss += loss.item()
    scheduler_final.step()

    if epoch % 5 == 0:
        current_lr = optimizer_final.param_groups[0]["lr"]
        print(f"Epoch {epoch:2d} | Loss: {total_loss/len(loader):.4f} | LR: {current_lr:.6f}")
```

---

## 学習率スケジューリングの比較

| スケジューラ | 特徴 | 推奨場面 |
|------------|------|---------|
| StepLR | 一定ステップ後に減衰 | シンプルな学習 |
| ExponentialLR | 毎エポック指数減衰 | 細かい制御が不要 |
| CosineAnnealingLR | コサイン曲線で滑らかに減衰 | 汎用的・推奨 |
| ReduceLROnPlateau | 検証損失が改善しない場合に減衰 | 過学習対策 |
| OneCycleLR | ウォームアップ後に減衰 | FastAI スタイル |
| Linear Warmup + Cosine | Transformer の標準 | BERT/GPT 系 |

---

## 使用場面

| タスク | 推奨オプティマイザ |
|--------|-----------------|
| 画像分類（ResNet等） | SGD + Momentum + CosineAnnealing |
| 自然言語処理（Transformer） | AdamW + Linear Warmup |
| 時系列・RNN | Adam または RMSprop |
| GAN の学習 | Adam（低い β₁=0.5 など） |
| 強化学習 | Adam または RMSprop |
| 一般的な深層学習 | AdamW（デフォルト推奨） |

---

## 参考文献

- Kingma, D. P., & Ba, J. (2014). "Adam: A method for stochastic optimization." *ICLR 2015*.
- Loshchilov, I., & Hutter, F. (2017). "Decoupled weight decay regularization." *ICLR 2019*.
- Loshchilov, I., & Hutter, F. (2016). "SGDR: Stochastic gradient descent with warm restarts." *ICLR 2017*.

<AffiliateBanner site="ml_intro" />
