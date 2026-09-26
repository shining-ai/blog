import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 最適化の基礎

## 最適化とは

最適化とは、

> ある目的関数（損失関数）を最小化（または最大化）するパラメータを見つけるプロセス

です。

機械学習では「モデルの予測値と正解値の差を表す損失関数 $L(\theta)$ を最小化するパラメータ $\theta$ を求める」問題として定式化されます。

$$\theta^* = \arg\min_\theta L(\theta)$$

## 最小化問題の定式化

### 損失関数の例

| 問題 | 損失関数 | 式 |
|------|---------|-----|
| 回帰 | MSE（平均二乗誤差） | $\frac{1}{N}\sum_{i=1}^N (y_i - \hat{y}_i)^2$ |
| 二値分類 | 二値交差エントロピー | $-\frac{1}{N}\sum_i [y_i \log \hat{y}_i + (1-y_i)\log(1-\hat{y}_i)]$ |
| 多値分類 | カテゴリカル交差エントロピー | $-\frac{1}{N}\sum_i \sum_k y_{ik} \log \hat{y}_{ik}$ |
| 正則化あり | リッジ（L2） | $L(\theta) + \lambda \|\theta\|_2^2$ |

```python
import numpy as np

# 各損失関数の実装
def mse_loss(y_true, y_pred):
    """平均二乗誤差"""
    return np.mean((y_true - y_pred)**2)

def binary_crossentropy(y_true, y_pred, eps=1e-8):
    """二値交差エントロピー"""
    y_pred = np.clip(y_pred, eps, 1 - eps)
    return -np.mean(y_true * np.log(y_pred) + (1 - y_true) * np.log(1 - y_pred))

def categorical_crossentropy(y_true_onehot, y_pred, eps=1e-8):
    """カテゴリカル交差エントロピー"""
    y_pred = np.clip(y_pred, eps, 1.0)
    return -np.mean(np.sum(y_true_onehot * np.log(y_pred), axis=1))

# 使用例
y_true_reg = np.array([2.0, 3.5, 1.0, 4.0])
y_pred_reg = np.array([2.1, 3.2, 1.3, 3.8])
print(f"MSE: {mse_loss(y_true_reg, y_pred_reg):.4f}")

y_true_bin = np.array([1, 0, 1, 1])
y_pred_bin = np.array([0.9, 0.2, 0.7, 0.8])
print(f"Binary CrossEntropy: {binary_crossentropy(y_true_bin, y_pred_bin):.4f}")
```

## 勾配降下法（Gradient Descent）

勾配降下法は、勾配の逆方向にパラメータを更新することで損失を最小化する手法です。

$$\theta \leftarrow \theta - \eta \nabla_\theta L(\theta)$$

- $\eta$: 学習率（ステップサイズ）
- $\nabla_\theta L$: 損失の勾配

```python
import numpy as np

def gradient_descent_demo():
    """勾配降下法の基本動作デモ"""
    
    # 損失関数: L(w) = (w - 3)^2 + 2  （最小値は w=3 で L=2）
    def loss(w):
        return (w - 3)**2 + 2
    
    def grad_loss(w):
        return 2 * (w - 3)
    
    w = 0.0    # 初期値
    lr = 0.1   # 学習率
    
    history = [{'step': 0, 'w': w, 'loss': loss(w)}]
    
    for step in range(1, 21):
        grad = grad_loss(w)
        w = w - lr * grad
        history.append({'step': step, 'w': w, 'loss': loss(w)})
    
    print("勾配降下法の収束:")
    for h in history[::5]:
        print(f"  Step {h['step']:2d}: w={h['w']:.4f}, L={h['loss']:.6f}")
    
    return w

final_w = gradient_descent_demo()
print(f"\n最終値: w={final_w:.6f} (理論的最小値: w=3.0)")

gradient_descent_demo()
```

### 学習率の影響

```python
import numpy as np

def loss(w):
    return (w - 3)**2 + 2

def grad_loss(w):
    return 2 * (w - 3)

# 異なる学習率での挙動
learning_rates = [0.01, 0.1, 0.5, 1.0, 1.1]

print("学習率による収束の違い（10ステップ後のw）:")
print(f"{'学習率':<10} {'w':<12} {'損失':<12} {'収束'}")
print("-" * 45)

for lr in learning_rates:
    w = 0.0
    for _ in range(10):
        w = w - lr * grad_loss(w)
    status = "収束" if abs(w - 3) < 0.1 else ("発散" if abs(w) > 100 else "未収束")
    print(f"{lr:<10.2f} {w:<12.4f} {loss(w):<12.4f} {status}")
```

## バッチ勾配降下法・ミニバッチ・確率的勾配降下法

| 手法 | 1回の更新で使うデータ | 特徴 |
|------|---------------------|------|
| バッチGD | 全データ | 安定・低速 |
| ミニバッチGD | 一部（32〜256件） | バランスが良い（実用的） |
| 確率的GD（SGD） | 1件 | 高速・ノイズ多い |

```python
import numpy as np
from sklearn.datasets import make_regression

np.random.seed(42)
X, y = make_regression(n_samples=1000, n_features=5, noise=10, random_state=42)
X = np.column_stack([np.ones(len(X)), X])  # バイアス項追加

def mse_gradient(w, X_batch, y_batch):
    """MSE損失の勾配"""
    N = len(y_batch)
    y_pred = X_batch @ w
    error = y_pred - y_batch
    return (2 / N) * X_batch.T @ error

def mse_loss_batch(w, X, y):
    return np.mean((X @ w - y)**2)

# ミニバッチ確率的勾配降下法
def minibatch_sgd(X, y, batch_size=32, lr=0.01, n_epochs=5):
    n_samples = len(y)
    w = np.zeros(X.shape[1])
    
    for epoch in range(n_epochs):
        # データをシャッフル
        indices = np.random.permutation(n_samples)
        X_shuffled = X[indices]
        y_shuffled = y[indices]
        
        epoch_loss = 0.0
        n_batches = 0
        
        for start in range(0, n_samples, batch_size):
            X_batch = X_shuffled[start:start + batch_size]
            y_batch = y_shuffled[start:start + batch_size]
            
            grad = mse_gradient(w, X_batch, y_batch)
            w = w - lr * grad
            
            epoch_loss += mse_loss_batch(w, X_batch, y_batch)
            n_batches += 1
        
        avg_loss = epoch_loss / n_batches
        print(f"Epoch {epoch+1}: 平均損失 = {avg_loss:.4f}")
    
    return w

print("ミニバッチSGD:")
w_final = minibatch_sgd(X, y, batch_size=32, lr=0.001, n_epochs=5)
print(f"\n全データでの最終損失: {mse_loss_batch(w_final, X, y):.4f}")
```

## 発展的な最適化アルゴリズム

### モーメンタム（Momentum）

前のステップの勾配の「慣性」を利用して、振動を抑え収束を速めます。

$$v \leftarrow \beta v + \nabla_\theta L(\theta)$$
$$\theta \leftarrow \theta - \eta v$$

### Adam（Adaptive Moment Estimation）

勾配の1次モーメント（平均）と2次モーメント（分散）を追跡し、パラメータごとに適応的な学習率を使います。深層学習で最もよく使われる最適化アルゴリズムです。

```python
import numpy as np

class Adam:
    """Adam最適化アルゴリズムの実装"""
    def __init__(self, lr=0.001, beta1=0.9, beta2=0.999, eps=1e-8):
        self.lr = lr
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps
        self.m = None  # 1次モーメント（勾配の指数移動平均）
        self.v = None  # 2次モーメント（勾配の二乗の指数移動平均）
        self.t = 0     # ステップ数
    
    def update(self, params, grads):
        if self.m is None:
            self.m = np.zeros_like(params)
            self.v = np.zeros_like(params)
        
        self.t += 1
        
        # モーメントの更新
        self.m = self.beta1 * self.m + (1 - self.beta1) * grads
        self.v = self.beta2 * self.v + (1 - self.beta2) * grads**2
        
        # バイアス補正
        m_hat = self.m / (1 - self.beta1**self.t)
        v_hat = self.v / (1 - self.beta2**self.t)
        
        # パラメータ更新
        params = params - self.lr * m_hat / (np.sqrt(v_hat) + self.eps)
        return params

# デモ
def loss_fn(w):
    return (w[0] - 3)**2 + (w[1] + 2)**2

def grad_fn(w):
    return np.array([2*(w[0] - 3), 2*(w[1] + 2)])

# Adamで最適化
w = np.array([0.0, 0.0])
optimizer = Adam(lr=0.1)

print("Adamによる最適化:")
for step in range(1, 51):
    grad = grad_fn(w)
    w = optimizer.update(w, grad)
    if step % 10 == 0:
        print(f"  Step {step:2d}: w={w.round(4)}, loss={loss_fn(w):.6f}")

print(f"\n最終値: w={w.round(4)} (理論的最小値: [3., -2.])")
```

## 局所最適解と鞍点

### 問題の種類

| 問題点 | 説明 | 深層学習での影響 |
|--------|------|----------------|
| 局所最適解 | 近傍では最小だが大域的には最小でない | 勾配がゼロになる点。浅いモデルでは問題になることも |
| 鞍点（saddle point） | ある方向では最小、別の方向では最大 | 高次元では局所最適解より多く存在。SGDが脱出しやすい |
| 勾配消失 | 深い層で勾配が極小になる | ReLUや適切な初期化で対処 |
| 勾配爆発 | 勾配が発散する | 勾配クリッピングで対処 |

```python
import numpy as np

# 鞍点の例: f(x, y) = x^2 - y^2
# (0, 0) は x 方向では最小、y 方向では最大

def saddle_point_fn(params):
    x, y = params
    return x**2 - y**2

def saddle_point_grad(params):
    x, y = params
    return np.array([2*x, -2*y])

# 鞍点近くからの挙動
start_points = [
    [0.1, 0.1],   # 鞍点に非常に近い
    [1.0, 0.5],   # 鞍点から離れた点
]

for start in start_points:
    w = np.array(start, dtype=float)
    print(f"\n初期点: {w}")
    for step in range(20):
        grad = saddle_point_grad(w)
        w = w - 0.1 * grad
    print(f"20ステップ後: w={w.round(4)}, f={saddle_point_fn(w):.4f}")
    note = "（鞍点付近で停止）" if abs(saddle_point_fn(w)) < 0.01 else "（離れた最適値へ）"
    print(f"  → {note}")
```

## 学習率スケジューリング

```python
import numpy as np

class LRScheduler:
    """学習率スケジューラの例"""
    
    @staticmethod
    def step_decay(initial_lr, epoch, drop=0.5, epochs_drop=10):
        """ステップ減衰: 一定エポックごとに学習率を半減"""
        return initial_lr * (drop ** (epoch // epochs_drop))
    
    @staticmethod
    def cosine_annealing(initial_lr, epoch, n_epochs):
        """コサインアニーリング"""
        return initial_lr * (1 + np.cos(np.pi * epoch / n_epochs)) / 2
    
    @staticmethod
    def warmup_cosine(initial_lr, epoch, warmup_epochs, n_epochs):
        """ウォームアップ + コサインアニーリング（Transformerでよく使用）"""
        if epoch < warmup_epochs:
            return initial_lr * epoch / warmup_epochs
        return LRScheduler.cosine_annealing(
            initial_lr, epoch - warmup_epochs, n_epochs - warmup_epochs
        )

# スケジューリングの確認
n_epochs = 50
initial_lr = 0.1
epochs = np.arange(n_epochs)

step_lrs = [LRScheduler.step_decay(initial_lr, e) for e in epochs]
cosine_lrs = [LRScheduler.cosine_annealing(initial_lr, e, n_epochs) for e in epochs]
warmup_lrs = [LRScheduler.warmup_cosine(initial_lr, e, 5, n_epochs) for e in epochs]

print("学習率スケジューリングの例（エポック0, 10, 25, 49）:")
print(f"{'エポック':<10} {'ステップ減衰':<15} {'コサイン':<15} {'ウォームアップ'}")
for e in [0, 10, 25, 49]:
    print(f"{e:<10} {step_lrs[e]:<15.6f} {cosine_lrs[e]:<15.6f} {warmup_lrs[e]:.6f}")
```

## 使用場面

- **深層学習**: Adamを使ったニューラルネットワークの学習（最も一般的）
- **勾配ブースティング**: 各ブースティングステップの学習率（shrinkage）
- **ハイパーパラメータ最適化**: ベイズ最適化・グリッドサーチ・ランダムサーチ
- **強化学習**: 方策勾配法・Q学習での価値関数の最適化
- **ファインチューニング**: 事前学習モデルの微調整（小さい学習率を使用）

## 参考文献

<AffiliateBanner site="ml_intro" />

- [PyTorch Optim](https://pytorch.org/docs/stable/optim.html)
- Kingma, D.P. & Ba, J. (2015). *Adam: A Method for Stochastic Optimization*. ICLR 2015.
- Goodfellow, I., Bengio, Y., & Courville, A. (2016). *Deep Learning*, Chapter 8. MIT Press.
