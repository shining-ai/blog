import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 活性化関数

ニューラルネットワークに非線形性を与えるのが活性化関数の役割である。活性化関数がなければ、何層積み重ねても結果は線形変換の合成にすぎず、単一の線形変換と等価になってしまう。適切な活性化関数の選択は、学習の安定性と最終的な性能に大きく影響する。

## 活性化関数とは

> 活性化関数は、ニューラルネットワークの各ニューロンの出力を決定する非線形関数である。線形変換だけでは表現できない複雑なパターンを学習可能にし、深いネットワークでの勾配の伝播挙動に直接影響を与える。

---

## 主要な活性化関数の一覧

| 関数名 | 式 | 出力範囲 | 主な用途 |
|--------|------|---------|---------|
| Sigmoid | $\sigma(x) = \frac{1}{1+e^{-x}}$ | (0, 1) | 2値分類の出力層 |
| Tanh | $\tanh(x) = \frac{e^x - e^{-x}}{e^x + e^{-x}}$ | (-1, 1) | RNN の隠れ状態 |
| ReLU | $\max(0, x)$ | [0, ∞) | 隠れ層の標準 |
| Leaky ReLU | $\max(0.01x, x)$ | (-∞, ∞) | 死んだReLU対策 |
| GELU | $x \cdot \Phi(x)$ | (-∞, ∞) | Transformer |
| Softmax | $\frac{e^{x_i}}{\sum_j e^{x_j}}$ | (0, 1)、和=1 | 多値分類の出力層 |

---

## 各活性化関数の詳細

### Sigmoid

$$
\sigma(x) = \frac{1}{1 + e^{-x}}, \quad \sigma'(x) = \sigma(x)(1 - \sigma(x))
$$

- 出力を確率として解釈できる（0〜1）
- **問題点**: $|x|$ が大きいと勾配が 0 に近づく（**勾配消失**）
- 中心が 0.5 にずれている（zero-centered でない）

### Tanh

$$
\tanh(x) = \frac{e^x - e^{-x}}{e^x + e^{-x}}, \quad \tanh'(x) = 1 - \tanh^2(x)
$$

- Sigmoid を [-1, 1] にスケーリングしたもの
- zero-centered（原点対称）のため Sigmoid より学習が安定
- 勾配消失問題は依然として存在

### ReLU（Rectified Linear Unit）

$$
\text{ReLU}(x) = \max(0, x), \quad \text{ReLU}'(x) = \begin{cases} 1 & x > 0 \\ 0 & x \leq 0 \end{cases}
$$

- 計算が非常に高速
- 正の領域で勾配が 1 のため、深いネットワークでも勾配消失しにくい
- **問題点**: 負の入力では勾配が 0 になる（**Dying ReLU 問題**）

### Leaky ReLU

$$
\text{LeakyReLU}(x) = \max(\alpha x, x), \quad \alpha \approx 0.01
$$

- 負の領域でも小さな勾配を維持し、Dying ReLU を回避
- ハイパーパラメータ $\alpha$ の設定が必要

### GELU（Gaussian Error Linear Unit）

$$
\text{GELU}(x) = x \cdot \Phi(x) \approx 0.5x\left(1 + \tanh\left[\sqrt{\frac{2}{\pi}}\left(x + 0.044715x^3\right)\right]\right)
$$

- $\Phi(x)$ は標準正規分布の累積分布関数
- BERT、GPT 系の Transformer で標準的に使用
- ReLU より滑らかで、実験的に高い性能を示す

### Softmax

$$
\text{softmax}(x_i) = \frac{e^{x_i}}{\sum_{j=1}^{K} e^{x_j}}
$$

- 出力の総和が 1 になる確率分布を生成
- 多値分類の出力層で使用
- 数値安定のため $e^{x_i - \max(\mathbf{x})}$ を使うことが重要

---

## Python 実装と可視化

```python
import numpy as np
import matplotlib.pyplot as plt


# ----- 活性化関数の実装 -----
def sigmoid(x):
    return 1 / (1 + np.exp(-np.clip(x, -500, 500)))


def sigmoid_grad(x):
    s = sigmoid(x)
    return s * (1 - s)


def tanh(x):
    return np.tanh(x)


def tanh_grad(x):
    return 1 - np.tanh(x) ** 2


def relu(x):
    return np.maximum(0, x)


def relu_grad(x):
    return np.where(x > 0, 1.0, 0.0)


def leaky_relu(x, alpha=0.01):
    return np.where(x > 0, x, alpha * x)


def leaky_relu_grad(x, alpha=0.01):
    return np.where(x > 0, 1.0, alpha)


def gelu(x):
    return 0.5 * x * (1 + np.tanh(np.sqrt(2 / np.pi) * (x + 0.044715 * x**3)))


def gelu_grad(x):
    # 近似微分
    h = 1e-5
    return (gelu(x + h) - gelu(x - h)) / (2 * h)


def softmax(x):
    e_x = np.exp(x - np.max(x))
    return e_x / e_x.sum()


# ----- 可視化 -----
x = np.linspace(-4, 4, 200)

fig, axes = plt.subplots(2, 3, figsize=(15, 8))
functions = [
    ("Sigmoid", sigmoid, sigmoid_grad),
    ("Tanh", tanh, tanh_grad),
    ("ReLU", relu, relu_grad),
    ("Leaky ReLU", leaky_relu, leaky_relu_grad),
    ("GELU", gelu, gelu_grad),
]

for ax, (name, fn, grad_fn) in zip(axes.flat, functions):
    y = fn(x)
    dy = grad_fn(x)
    ax.plot(x, y, label=f"{name}", color="blue", linewidth=2)
    ax.plot(x, dy, label="勾配", color="orange", linestyle="--", linewidth=1.5)
    ax.axhline(0, color="k", linewidth=0.5)
    ax.axvline(0, color="k", linewidth=0.5)
    ax.set_title(name)
    ax.legend()
    ax.set_ylim(-1.5, 2.5)
    ax.grid(True, alpha=0.3)

# Softmax の可視化
ax = axes[1, 2]
x_soft = np.linspace(-3, 3, 5)
y_soft = softmax(x_soft)
ax.bar(range(5), y_soft, color="steelblue")
ax.set_title("Softmax（5クラス入力例）")
ax.set_ylabel("確率")
ax.set_xlabel("クラスインデックス")
ax.grid(True, alpha=0.3, axis="y")

plt.suptitle("主要な活性化関数とその勾配", fontsize=14)
plt.tight_layout()
plt.savefig("activation_functions.png", dpi=150)
plt.show()
```

---

## 勾配消失問題との関係

深いネットワークでは、誤差逆伝播時に勾配が何層にもわたって乗算される。活性化関数の微分値が 1 未満だと、指数的に勾配が小さくなる。

```python
import numpy as np
import matplotlib.pyplot as plt


def simulate_gradient_flow(activation_name: str, depth: int = 20):
    """深いネットワークでの勾配消失をシミュレート"""
    np.random.seed(42)
    x = np.random.randn(1000)   # 初期勾配信号

    gradients = [np.abs(x).mean()]

    if activation_name == "sigmoid":
        # Sigmoid の勾配は最大 0.25
        for _ in range(depth):
            # 典型的な Sigmoid 勾配（0.1〜0.25）
            x = x * np.random.uniform(0.1, 0.25, size=x.shape)
            gradients.append(np.abs(x).mean())

    elif activation_name == "relu":
        # ReLU の勾配は 0 または 1（約50%がアクティブ）
        for _ in range(depth):
            mask = np.random.rand(len(x)) > 0.5
            x = x * mask.astype(float)
            gradients.append(np.abs(x).mean())

    return gradients


sigmoid_grads = simulate_gradient_flow("sigmoid", depth=20)
relu_grads = simulate_gradient_flow("relu", depth=20)

fig, ax = plt.subplots(figsize=(8, 5))
ax.semilogy(sigmoid_grads, label="Sigmoid（勾配消失）", color="red", marker="o")
ax.semilogy(relu_grads, label="ReLU（比較的安定）", color="green", marker="s")
ax.set_xlabel("層の深さ")
ax.set_ylabel("勾配の大きさ（対数スケール）")
ax.set_title("活性化関数と勾配消失の関係")
ax.legend()
ax.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig("gradient_vanishing.png", dpi=150)
plt.show()
```

---

## 活性化関数の選択ガイド

| レイヤーの種類 | 推奨関数 | 理由 |
|--------------|---------|------|
| 隠れ層（一般） | ReLU | 計算速度・勾配消失耐性 |
| 隠れ層（Transformer） | GELU | 滑らかで高性能 |
| 隠れ層（RNN） | Tanh | zero-centered、ゲートとの相性 |
| 2値分類の出力 | Sigmoid | 確率出力 (0〜1) |
| 多値分類の出力 | Softmax | 確率分布 |
| 回帰の出力 | なし（恒等写像） | 実数値を直接出力 |

---

## PyTorch での使用例

```python
import torch
import torch.nn as nn

# PyTorch の活性化関数
x = torch.randn(4, 8)

print("ReLU:      ", nn.ReLU()(x).shape)
print("LeakyReLU: ", nn.LeakyReLU(negative_slope=0.01)(x).shape)
print("GELU:      ", nn.GELU()(x).shape)
print("Sigmoid:   ", nn.Sigmoid()(x).shape)
print("Tanh:      ", nn.Tanh()(x).shape)
print("Softmax:   ", nn.Softmax(dim=-1)(x).shape)

# モデル内での使用
model = nn.Sequential(
    nn.Linear(8, 32),
    nn.GELU(),           # または nn.ReLU()
    nn.Linear(32, 16),
    nn.ReLU(),
    nn.Linear(16, 3),
    # 出力層の活性化関数は損失関数と合わせる
    # CrossEntropyLoss を使う場合は Softmax 不要
)
```

---

## 使用場面

| タスク | 推奨する活性化関数 |
|--------|-----------------|
| 画像認識（CNN） | ReLU または Leaky ReLU |
| 自然言語処理（Transformer） | GELU |
| 時系列・系列データ（RNN） | Tanh（内部）、Sigmoid（ゲート） |
| 生成モデル（GAN/VAE） | ReLU（隠れ層）、Tanh（出力） |
| 2値分類の出力 | Sigmoid |
| 多値分類の出力 | Softmax |

---

## 参考文献

- Nair, V., & Hinton, G. E. (2010). "Rectified linear units improve restricted boltzmann machines." *ICML*.
- Maas, A. L., et al. (2013). "Rectifier nonlinearities improve neural network acoustic models." *ICML*.
- Hendrycks, D., & Gimpel, K. (2016). "Gaussian error linear units (GELUs)." *arXiv:1606.08415*.

<AffiliateBanner site="ml_intro" />
