import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 微分と勾配

## 微分と勾配とは

微分と勾配とは、

> 関数の変化率を表す数学的概念であり、機械学習における損失関数の最小化（パラメータの更新方向の決定）の理論的基盤

です。

スカラー値関数の「勾配（gradient）」は最急降下方向の逆方向を指し、これを使ってパラメータを繰り返し更新することで損失を最小化します。

## 微分の基礎

### 1変数の微分

関数 $f(x)$ の微分（導関数）$f'(x)$ は、$x$ を微小量だけ変化させたときの $f$ の変化率です。

$$f'(x) = \frac{df}{dx} = \lim_{h \to 0} \frac{f(x+h) - f(x)}{h}$$

```python
import numpy as np

# 数値微分（有限差分法）
def numerical_diff(f, x, h=1e-5):
    """中心差分法による数値微分"""
    return (f(x + h) - f(x - h)) / (2 * h)

# 例1: f(x) = x^2 → f'(x) = 2x
f1 = lambda x: x**2
x = 3.0
approx_deriv = numerical_diff(f1, x)
exact_deriv = 2 * x
print(f"f(x) = x^2 at x=3:")
print(f"  数値微分: {approx_deriv:.8f}")
print(f"  解析的微分: {exact_deriv:.8f}")

# 例2: f(x) = sin(x) → f'(x) = cos(x)
f2 = np.sin
x = np.pi / 4
approx_deriv2 = numerical_diff(f2, x)
exact_deriv2 = np.cos(x)
print(f"\nf(x) = sin(x) at x=π/4:")
print(f"  数値微分: {approx_deriv2:.8f}")
print(f"  解析的微分: {exact_deriv2:.8f}")
```

### よく使う微分の公式

| 関数 | 微分 | 機械学習での用途 |
|------|------|----------------|
| $x^n$ | $nx^{n-1}$ | 多項式回帰 |
| $e^x$ | $e^x$ | ソフトマックス・指数族分布 |
| $\ln x$ | $1/x$ | 対数尤度 |
| $\sigma(x) = 1/(1+e^{-x})$ | $\sigma(x)(1-\sigma(x))$ | シグモイド活性化関数 |
| $\max(0, x)$ | $0$ または $1$ | ReLU活性化関数 |

```python
import numpy as np

# 活性化関数とその微分
def sigmoid(x):
    return 1 / (1 + np.exp(-x))

def sigmoid_deriv(x):
    s = sigmoid(x)
    return s * (1 - s)

def relu(x):
    return np.maximum(0, x)

def relu_deriv(x):
    return (x > 0).astype(float)

x = np.linspace(-5, 5, 100)

# 各関数と微分の値確認
x_test = np.array([-2.0, -1.0, 0.0, 1.0, 2.0])
print("x:", x_test)
print("sigmoid(x):", sigmoid(x_test).round(4))
print("sigmoid'(x):", sigmoid_deriv(x_test).round(4))
print("relu(x):", relu(x_test))
print("relu'(x):", relu_deriv(x_test))
```

## 偏微分

多変数関数 $f(x_1, x_2, \ldots, x_n)$ において、他の変数を定数として1つの変数のみで微分したものを偏微分と呼びます。

$$\frac{\partial f}{\partial x_i} = \lim_{h \to 0} \frac{f(x_1, \ldots, x_i + h, \ldots, x_n) - f(x_1, \ldots, x_i, \ldots, x_n)}{h}$$

```python
import numpy as np

# 数値偏微分
def numerical_partial_diff(f, x, i, h=1e-5):
    """変数 x[i] に関する偏微分"""
    x_plus = x.copy()
    x_minus = x.copy()
    x_plus[i] += h
    x_minus[i] -= h
    return (f(x_plus) - f(x_minus)) / (2 * h)

# f(x1, x2) = x1^2 + 2*x1*x2 + x2^3
def f(x):
    return x[0]**2 + 2*x[0]*x[1] + x[1]**3

x = np.array([2.0, 3.0])

# ∂f/∂x1 = 2*x1 + 2*x2
# ∂f/∂x2 = 2*x1 + 3*x2^2
partial_x1 = numerical_partial_diff(f, x, 0)
partial_x2 = numerical_partial_diff(f, x, 1)

exact_x1 = 2*x[0] + 2*x[1]     # = 4 + 6 = 10
exact_x2 = 2*x[0] + 3*x[1]**2  # = 4 + 27 = 31

print(f"∂f/∂x1: 数値={partial_x1:.6f}, 解析={exact_x1}")
print(f"∂f/∂x2: 数値={partial_x2:.6f}, 解析={exact_x2}")
```

## 勾配ベクトル

多変数関数 $f: \mathbb{R}^n \to \mathbb{R}$ の勾配は、各変数についての偏微分をまとめたベクトルです。

$$\nabla f = \begin{pmatrix} \frac{\partial f}{\partial x_1} \\ \frac{\partial f}{\partial x_2} \\ \vdots \\ \frac{\partial f}{\partial x_n} \end{pmatrix}$$

**重要性質**: 勾配 $\nabla f$ は $f$ が最も急速に増加する方向を指します。したがって **$-\nabla f$** の方向に進めば $f$ を減らすことができます（勾配降下法の原理）。

```python
import numpy as np

def compute_gradient(f, x, h=1e-5):
    """数値勾配の計算"""
    grad = np.zeros_like(x)
    for i in range(len(x)):
        x_plus = x.copy()
        x_minus = x.copy()
        x_plus[i] += h
        x_minus[i] -= h
        grad[i] = (f(x_plus) - f(x_minus)) / (2 * h)
    return grad

# 損失関数（MSE の簡略版）: f(w) = (w1 - 2)^2 + (w2 - 3)^2
# 最小値は w = [2, 3]
def loss(w):
    return (w[0] - 2)**2 + (w[1] - 3)**2

# 初期パラメータ
w = np.array([0.0, 0.0])
print(f"初期パラメータ: {w}")
print(f"初期損失: {loss(w):.4f}")

# 勾配降下法
lr = 0.1
for step in range(20):
    grad = compute_gradient(loss, w)
    w = w - lr * grad
    if step % 5 == 4:
        print(f"Step {step+1}: w={w.round(4)}, loss={loss(w):.6f}")

print(f"\n最終パラメータ: {w.round(4)}")
print(f"最小値の理論値: [2. 3.]")
```

## ヤコビアン（Jacobian）

ベクトル値関数 $f: \mathbb{R}^n \to \mathbb{R}^m$ の微分はヤコビアン行列で表されます。

$$J = \frac{\partial \mathbf{f}}{\partial \mathbf{x}} = \begin{pmatrix} \frac{\partial f_1}{\partial x_1} & \cdots & \frac{\partial f_1}{\partial x_n} \\ \vdots & \ddots & \vdots \\ \frac{\partial f_m}{\partial x_1} & \cdots & \frac{\partial f_m}{\partial x_n} \end{pmatrix}$$

```python
import numpy as np

# ヤコビアンの数値計算
def jacobian(f, x, h=1e-5):
    """f: R^n → R^m のヤコビアン行列"""
    f0 = f(x)
    m = len(f0)
    n = len(x)
    J = np.zeros((m, n))
    for j in range(n):
        x_plus = x.copy()
        x_minus = x.copy()
        x_plus[j] += h
        x_minus[j] -= h
        J[:, j] = (f(x_plus) - f(x_minus)) / (2 * h)
    return J

# f(x1, x2) = [x1^2 + x2, x1*x2]
def f_vec(x):
    return np.array([x[0]**2 + x[1], x[0]*x[1]])

x = np.array([2.0, 3.0])
J = jacobian(f_vec, x)
print("ヤコビアン J at x=[2,3]:")
print(J.round(6))
# 解析解: [[2*x1, 1], [x2, x1]] = [[4, 1], [3, 2]]

print("\n解析解:")
print(f"[[2*x1, 1], [x2, x1]] = [[{2*x[0]:.0f}, 1], [{x[1]:.0f}, {x[0]:.0f}]]")
```

## 連鎖律（Chain Rule）

合成関数の微分に関する連鎖律は、バックプロパゲーションの理論的基盤です。

$$\frac{d}{dx} f(g(x)) = f'(g(x)) \cdot g'(x)$$

多変数の場合：

$$\frac{\partial z}{\partial x} = \frac{\partial z}{\partial y} \cdot \frac{\partial y}{\partial x}$$

```python
import numpy as np

# 連鎖律の例: ニューラルネットワークの1層を模擬
# z = w^T x + b (線形変換)
# a = sigmoid(z)  (活性化)
# L = (a - y)^2  (損失)

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

# フォワードパス
np.random.seed(42)
x = np.array([1.0, 2.0, 3.0])
w = np.array([0.5, -0.3, 0.8])
b = 0.1
y = 1.0  # 正解ラベル

z = w @ x + b
a = sigmoid(z)
L = (a - y)**2

print(f"z = w^T x + b = {z:.4f}")
print(f"a = sigmoid(z) = {a:.4f}")
print(f"L = (a - y)^2 = {L:.4f}")

# バックワードパス（連鎖律）
# ∂L/∂a = 2(a - y)
dL_da = 2 * (a - y)

# ∂a/∂z = sigmoid(z)(1 - sigmoid(z))
da_dz = a * (1 - a)

# ∂z/∂w = x
dz_dw = x

# ∂z/∂b = 1
dz_db = 1.0

# 連鎖律で合成
dL_dz = dL_da * da_dz        # ∂L/∂z = ∂L/∂a * ∂a/∂z
dL_dw = dL_dz * dz_dw        # ∂L/∂w = ∂L/∂z * ∂z/∂w
dL_db = dL_dz * dz_db        # ∂L/∂b = ∂L/∂z * ∂z/∂b

print(f"\nバックワードパス（連鎖律）:")
print(f"∂L/∂a = {dL_da:.4f}")
print(f"∂a/∂z = {da_dz:.4f}")
print(f"∂L/∂z = {dL_dz:.4f}")
print(f"∂L/∂w = {dL_dw.round(4)}")
print(f"∂L/∂b = {dL_db:.4f}")

# 数値微分で確認
def compute_loss(w, b, x, y):
    z = w @ x + b
    a = sigmoid(z)
    return (a - y)**2

h = 1e-5
dL_dw_numerical = np.array([
    (compute_loss(w + h * np.eye(3)[i], b, x, y) -
     compute_loss(w - h * np.eye(3)[i], b, x, y)) / (2 * h)
    for i in range(3)
])
print(f"\n数値微分 ∂L/∂w: {dL_dw_numerical.round(4)}")
print(f"解析的微分 ∂L/∂w: {dL_dw.round(4)}")
print(f"一致:", np.allclose(dL_dw, dL_dw_numerical, atol=1e-5))
```

## 自動微分（AutoDiff）

現代の深層学習フレームワークは自動微分（Automatic Differentiation）を使い、連鎖律を自動で計算します。

```python
# PyTorchを使った自動微分の例
import torch

# テンソルの作成（requires_grad=True で勾配を追跡）
x = torch.tensor([1.0, 2.0, 3.0], requires_grad=True)
w = torch.tensor([0.5, -0.3, 0.8], requires_grad=True)
b = torch.tensor(0.1, requires_grad=True)
y = torch.tensor(1.0)

# フォワードパス
z = w @ x + b
a = torch.sigmoid(z)
L = (a - y)**2

print(f"Loss: {L.item():.4f}")

# バックワードパス（自動的に連鎖律が適用される）
L.backward()

print(f"\n自動微分による勾配:")
print(f"∂L/∂w = {w.grad.numpy().round(4)}")
print(f"∂L/∂b = {b.grad.item():.4f}")
```

## 使用場面

- **勾配降下法**: $w \leftarrow w - \eta \nabla_w L$ によるパラメータ更新
- **バックプロパゲーション**: 連鎖律を用いた多層ネットワークの勾配計算
- **正則化の勾配**: L1/L2正則化項の微分（重みの更新に加算）
- **ハイパーパラメータの勾配**: メタ学習・アーキテクチャ探索
- **物理シミュレーション**: 微分可能なシミュレータの開発

## 参考文献

<AffiliateBanner site="ml_intro" />

- [PyTorch Autograd](https://pytorch.org/docs/stable/autograd.html)
- Goodfellow, I., Bengio, Y., & Courville, A. (2016). *Deep Learning*, Chapter 4. MIT Press.
- 斎藤康毅 (2016). *ゼロから作るDeep Learning*, 第4章. オライリー・ジャパン.
