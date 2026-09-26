import AffiliateBanner from '@site/src/components/AffiliateBanner';

# バックプロパゲーション

バックプロパゲーション（誤差逆伝播法）は、ニューラルネットワークの学習を可能にした核心的なアルゴリズムである。1986年に Rumelhart らが発表し、深層学習の実用化に決定的な役割を果たした。損失関数の各パラメータに対する偏微分（勾配）を効率的に計算する手法である。

## バックプロパゲーションとは

> バックプロパゲーションは、連鎖律（Chain Rule）を用いて、損失関数の各パラメータに対する勾配を出力層から入力層に向かって逆方向に伝播させ、効率的に計算するアルゴリズムである。

---

## 連鎖律（Chain Rule）

合成関数の微分の基礎となる連鎖律：

$$
\frac{\partial L}{\partial x} = \frac{\partial L}{\partial y} \cdot \frac{\partial y}{\partial x}
$$

複数の層が連鎖する場合：

$$
\frac{\partial L}{\partial w^{(1)}} = \frac{\partial L}{\partial a^{(3)}} \cdot \frac{\partial a^{(3)}}{\partial z^{(3)}} \cdot \frac{\partial z^{(3)}}{\partial a^{(2)}} \cdot \frac{\partial a^{(2)}}{\partial z^{(2)}} \cdot \frac{\partial z^{(2)}}{\partial w^{(2)}} \cdots
$$

---

## 計算グラフによる理解

計算グラフは計算の依存関係を有向グラフで表現したものである。順伝播で値を計算し、逆伝播で勾配を伝播させる。

```
順伝播:  x → [×w] → z → [ReLU] → a → [×W₂] → y → [Loss] → L
逆伝播:  ∂L/∂x ← ∂L/∂z ← ∂L/∂a ← ∂L/∂y ← ∂L/∂L(=1)
```

---

## NumPy によるバックプロパゲーションの手動実装

```python
import numpy as np


class LinearLayer:
    """全結合層（順伝播・逆伝播の手動実装）"""

    def __init__(self, in_features: int, out_features: int):
        # He 初期化
        self.W = np.random.randn(in_features, out_features) * np.sqrt(2.0 / in_features)
        self.b = np.zeros(out_features)
        self.dW = None
        self.db = None
        self._input = None

    def forward(self, x: np.ndarray) -> np.ndarray:
        self._input = x          # バックパスで使用
        return x @ self.W + self.b

    def backward(self, dout: np.ndarray) -> np.ndarray:
        """
        dout: 上流からの勾配 (batch, out_features)
        return: 下流への勾配 (batch, in_features)
        """
        self.dW = self._input.T @ dout          # (in, out)
        self.db = dout.sum(axis=0)              # (out,)
        return dout @ self.W.T                  # (batch, in)


class ReLULayer:
    def __init__(self):
        self._mask = None

    def forward(self, x: np.ndarray) -> np.ndarray:
        self._mask = x > 0
        return x * self._mask

    def backward(self, dout: np.ndarray) -> np.ndarray:
        return dout * self._mask


class SoftmaxCrossEntropy:
    """Softmax + Cross Entropy の合算（勾配計算が簡単になる）"""

    def __init__(self):
        self._y_pred = None
        self._y_true = None

    @staticmethod
    def _softmax(x: np.ndarray) -> np.ndarray:
        e_x = np.exp(x - x.max(axis=1, keepdims=True))
        return e_x / e_x.sum(axis=1, keepdims=True)

    def forward(self, logits: np.ndarray, y_true: np.ndarray) -> float:
        """y_true: クラスインデックス"""
        self._y_pred = self._softmax(logits)
        self._y_true = y_true
        n = len(y_true)
        log_prob = -np.log(self._y_pred[np.arange(n), y_true] + 1e-7)
        return log_prob.mean()

    def backward(self) -> np.ndarray:
        n = len(self._y_true)
        dout = self._y_pred.copy()
        dout[np.arange(n), self._y_true] -= 1   # ∂(CE)/∂(softmax出力)
        return dout / n


class ManualMLP:
    """手動バックプロパゲーションの MLP"""

    def __init__(self, layer_sizes: list[int]):
        self.layers = []
        for i in range(len(layer_sizes) - 1):
            self.layers.append(LinearLayer(layer_sizes[i], layer_sizes[i + 1]))
            if i < len(layer_sizes) - 2:
                self.layers.append(ReLULayer())
        self.loss_fn = SoftmaxCrossEntropy()

    def forward(self, x: np.ndarray, y: np.ndarray) -> float:
        for layer in self.layers:
            x = layer.forward(x)
        return self.loss_fn.forward(x, y)

    def backward(self):
        dout = self.loss_fn.backward()
        for layer in reversed(self.layers):
            dout = layer.backward(dout)

    def update(self, lr: float = 0.01):
        for layer in self.layers:
            if isinstance(layer, LinearLayer):
                layer.W -= lr * layer.dW
                layer.b -= lr * layer.db


# ===== 学習ループ =====
np.random.seed(42)

# XOR データ
X = np.array([[0,0],[0,1],[1,0],[1,1]], dtype=float)
y = np.array([0, 1, 1, 0])

model = ManualMLP([2, 8, 8, 2])

print("=== XOR 学習 ===")
for epoch in range(1, 1001):
    loss = model.forward(X, y)
    model.backward()
    model.update(lr=0.1)

    if epoch % 200 == 0:
        # 予測確率
        out = X.copy()
        for layer in model.layers:
            out = layer.forward(out)
        preds = np.argmax(out, axis=1)
        print(f"Epoch {epoch:4d} | Loss: {loss:.4f} | Preds: {preds}")
```

---

## PyTorch の自動微分（autograd）

PyTorch は計算グラフを動的に構築し、`backward()` を呼ぶだけで自動的に勾配を計算する。

```python
import torch
import torch.nn as nn
import torch.optim as optim


# ===== autograd の基本 =====
x = torch.tensor([2.0, 3.0], requires_grad=True)
y = x[0] ** 2 + 2 * x[1] ** 3   # y = x₀² + 2x₁³
y.backward()

print("x =", x.data)
print("dy/dx =", x.grad)  # [2x₀, 6x₁²] = [4, 54]


# ===== 計算グラフの可視化的理解 =====
a = torch.tensor(3.0, requires_grad=True)
b = torch.tensor(4.0, requires_grad=True)

c = a * b           # c = ab
d = c + a           # d = ab + a
e = d ** 2          # e = (ab + a)²
e.backward()

print(f"\na={a.item()}, b={b.item()}")
print(f"e = (a*b + a)² = (ab + a)² = ({a.item()*b.item() + a.item()})² = {e.item()}")
print(f"de/da = 2(ab+a)(b+1) = {2*(a.item()*b.item()+a.item())*(b.item()+1)}")
print(f"autograd de/da = {a.grad.item()}")
print(f"de/db = 2(ab+a)a = {2*(a.item()*b.item()+a.item())*a.item()}")
print(f"autograd de/db = {b.grad.item()}")


# ===== PyTorch MLP の学習 =====
class MLPNet(nn.Module):
    def __init__(self):
        super().__init__()
        self.fc1 = nn.Linear(2, 8)
        self.fc2 = nn.Linear(8, 8)
        self.fc3 = nn.Linear(8, 2)

    def forward(self, x):
        x = torch.relu(self.fc1(x))
        x = torch.relu(self.fc2(x))
        return self.fc3(x)


X_xor = torch.tensor([[0,0],[0,1],[1,0],[1,1]], dtype=torch.float)
y_xor = torch.tensor([0, 1, 1, 0])

net = MLPNet()
optimizer = optim.Adam(net.parameters(), lr=0.01)
criterion = nn.CrossEntropyLoss()

for epoch in range(1, 1001):
    optimizer.zero_grad()           # 勾配をゼロ化
    logits = net(X_xor)             # 順伝播
    loss = criterion(logits, y_xor)  # 損失計算
    loss.backward()                 # 逆伝播（autograd が自動計算）
    optimizer.step()                # パラメータ更新

    if epoch % 200 == 0:
        preds = logits.argmax(dim=1)
        acc = (preds == y_xor).float().mean()
        print(f"Epoch {epoch:4d} | Loss: {loss.item():.4f} | Acc: {acc.item():.2f}")


# ===== 勾配の確認 =====
print("\n=== 最終的な勾配 ===")
for name, param in net.named_parameters():
    if param.grad is not None:
        print(f"{name}: grad.norm={param.grad.norm().item():.6f}")
```

---

## バックプロパゲーションの計算量

| フェーズ | 計算量 | メモリ |
|---------|--------|--------|
| 順伝播 | $O(W)$ | 各層の中間値を保存 |
| 逆伝播 | $O(W)$（順伝播と同程度） | 勾配テンソルを保存 |
| 合計 | $O(W)$ | パラメータ数の約2〜3倍 |

$W$: ネットワークのパラメータ総数

---

## よくある問題と対策

| 問題 | 原因 | 対策 |
|------|------|------|
| 勾配消失 | Sigmoid/Tanh の飽和 | ReLU 系の使用・残差接続 |
| 勾配爆発 | 深い層での勾配の乗算 | Gradient Clipping |
| NaN の発生 | ゼロ除算・log(0) | 数値安定化・eps 追加 |
| メモリ不足 | 中間値の保存 | Gradient Checkpointing |

---

## 使用場面

バックプロパゲーションはニューラルネットワークの学習に必須のアルゴリズムであり、すべての深層学習モデルの学習プロセスの基盤である。PyTorch や TensorFlow などのフレームワークはこれを自動微分（autograd）として内部に組み込んでいる。手動実装の価値は理解の深化にあり、デバッグやカスタム損失関数の実装に役立つ。

---

## 参考文献

- Rumelhart, D. E., Hinton, G. E., & Williams, R. J. (1986). "Learning representations by back-propagating errors." *Nature*, 323, 533–536.
- Goodfellow, I., Bengio, Y., & Courville, A. (2016). *Deep Learning*, Chapter 6. MIT Press.
- PyTorch autograd: https://pytorch.org/docs/stable/autograd.html

<AffiliateBanner site="ml_intro" />
