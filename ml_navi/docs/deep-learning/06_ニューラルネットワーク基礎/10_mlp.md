import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 多層パーセプトロン（MLP）

単純パーセプトロンが抱えていた「線形分離不可能な問題を解けない」という限界を乗り越えるために、隠れ層を積み重ねた多層パーセプトロン（MLP: Multilayer Perceptron）が生まれた。現代の深層学習の基本構造である全結合ニューラルネットワークそのものである。

## 多層パーセプトロンとは

> 多層パーセプトロン（MLP）は、入力層・1つ以上の隠れ層・出力層から構成され、各層がすべての前層のユニットと結合（全結合）したニューラルネットワークである。非線形活性化関数を組み合わせることで、任意の複雑な関数を近似できる。

---

## 隠れ層と順伝播の計算

### ネットワーク構造

```
入力層 → 隠れ層1 → 隠れ層2 → ... → 出力層
 x         h1         h2               y
```

各層 $l$ の計算：

$$
\mathbf{z}^{(l)} = \mathbf{W}^{(l)} \mathbf{a}^{(l-1)} + \mathbf{b}^{(l)}
$$
$$
\mathbf{a}^{(l)} = f(\mathbf{z}^{(l)})
$$

- $\mathbf{W}^{(l)}$: 重み行列
- $\mathbf{b}^{(l)}$: バイアスベクトル
- $f(\cdot)$: 活性化関数（ReLU, Sigmoid など）

### 順伝播の Python 実装（NumPy）

```python
import numpy as np


def relu(x: np.ndarray) -> np.ndarray:
    return np.maximum(0, x)


def sigmoid(x: np.ndarray) -> np.ndarray:
    return 1 / (1 + np.exp(-np.clip(x, -500, 500)))


def softmax(x: np.ndarray) -> np.ndarray:
    e_x = np.exp(x - np.max(x, axis=-1, keepdims=True))
    return e_x / e_x.sum(axis=-1, keepdims=True)


class MLP:
    """NumPy による MLP の手動実装"""

    def __init__(self, layer_sizes: list[int]):
        """
        layer_sizes: [入力次元, 隠れ層1サイズ, ..., 出力次元]
        例: [784, 256, 128, 10] → MNIST 分類器
        """
        self.layer_sizes = layer_sizes
        self.weights = []
        self.biases = []

        # Xavier 初期化
        for i in range(len(layer_sizes) - 1):
            fan_in = layer_sizes[i]
            fan_out = layer_sizes[i + 1]
            std = np.sqrt(2.0 / (fan_in + fan_out))
            W = np.random.randn(fan_in, fan_out) * std
            b = np.zeros(fan_out)
            self.weights.append(W)
            self.biases.append(b)

    def forward(self, X: np.ndarray) -> tuple[np.ndarray, list]:
        """
        順伝播
        Returns: (出力, 中間値リスト) ※バックプロパゲーション用
        """
        activations = [X]
        a = X

        for i, (W, b) in enumerate(zip(self.weights, self.biases)):
            z = a @ W + b
            if i < len(self.weights) - 1:
                a = relu(z)           # 隠れ層: ReLU
            else:
                a = softmax(z)        # 出力層: Softmax
            activations.append(a)

        return a, activations

    def predict(self, X: np.ndarray) -> np.ndarray:
        output, _ = self.forward(X)
        return np.argmax(output, axis=1)


# 動作確認
np.random.seed(42)
mlp = MLP([4, 8, 8, 3])   # Iris 分類想定
X_dummy = np.random.randn(10, 4)
output, activations = mlp.forward(X_dummy)
print("入力形状:", X_dummy.shape)
print("出力形状:", output.shape)
print("出力（確率分布）:\n", output.round(3))
print("予測クラス:", mlp.predict(X_dummy))
```

---

## ユニバーサル近似定理

> **ユニバーサル近似定理（Universal Approximation Theorem）**: 1つの隠れ層を持つ MLP は、ユニットの数が十分に多ければ、コンパクトな集合上の任意の連続関数を任意の精度で近似できる。

この定理は MLP の表現力の理論的根拠であるが、「近似できる」ことと「学習できる」ことは異なる点に注意が必要である。

| 側面 | 内容 |
|------|------|
| 証明者 | Cybenko（1989）、Hornik（1991） |
| 必要条件 | 非線形な活性化関数を使用すること |
| 実用上の含意 | 十分に広い MLP は複雑な関数を表現できる |
| 実用上の限界 | 1層でも原理上は可能だが、深い構造の方が効率的 |

---

## PyTorch による MLP 実装

```python
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import numpy as np


# ----- モデル定義 -----
class MLPClassifier(nn.Module):
    def __init__(self, input_dim: int, hidden_dims: list[int], output_dim: int,
                 dropout_rate: float = 0.3):
        super().__init__()
        layers = []
        in_dim = input_dim

        for hidden_dim in hidden_dims:
            layers.extend([
                nn.Linear(in_dim, hidden_dim),
                nn.BatchNorm1d(hidden_dim),
                nn.ReLU(),
                nn.Dropout(dropout_rate),
            ])
            in_dim = hidden_dim

        layers.append(nn.Linear(in_dim, output_dim))
        self.network = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.network(x)


# ----- データ準備 -----
iris = load_iris()
X, y = iris.data.astype(np.float32), iris.target

scaler = StandardScaler()
X = scaler.fit_transform(X)

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

X_train_t = torch.tensor(X_train)
y_train_t = torch.tensor(y_train, dtype=torch.long)
X_test_t = torch.tensor(X_test)
y_test_t = torch.tensor(y_test, dtype=torch.long)

train_dataset = TensorDataset(X_train_t, y_train_t)
train_loader = DataLoader(train_dataset, batch_size=16, shuffle=True)

# ----- 学習 -----
model = MLPClassifier(input_dim=4, hidden_dims=[64, 32], output_dim=3)
criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.parameters(), lr=1e-3, weight_decay=1e-4)
scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=50)

def train_epoch(model, loader, criterion, optimizer):
    model.train()
    total_loss, correct = 0.0, 0
    for X_batch, y_batch in loader:
        optimizer.zero_grad()
        logits = model(X_batch)
        loss = criterion(logits, y_batch)
        loss.backward()
        optimizer.step()
        total_loss += loss.item() * len(X_batch)
        correct += (logits.argmax(dim=1) == y_batch).sum().item()
    n = len(loader.dataset)
    return total_loss / n, correct / n


def evaluate(model, X, y):
    model.eval()
    with torch.no_grad():
        logits = model(X)
        preds = logits.argmax(dim=1)
        acc = (preds == y).float().mean().item()
    return acc


for epoch in range(1, 51):
    loss, train_acc = train_epoch(model, train_loader, criterion, optimizer)
    scheduler.step()
    if epoch % 10 == 0:
        test_acc = evaluate(model, X_test_t, y_test_t)
        print(f"Epoch {epoch:3d} | Loss: {loss:.4f} | "
              f"Train Acc: {train_acc:.3f} | Test Acc: {test_acc:.3f}")
```

---

## MLP の設計ガイドライン

| 設計要素 | 推奨事項 |
|---------|---------|
| 隠れ層の数 | タスクの複雑さに応じて 2〜5 層程度 |
| 各層のユニット数 | 入力層から出力層に向かって段階的に縮小 |
| 活性化関数 | 隠れ層は ReLU 系、出力層はタスク依存 |
| 正規化 | Batch Normalization または Layer Normalization |
| 正則化 | Dropout（rate=0.2〜0.5）や Weight Decay |
| 初期化 | Xavier（Sigmoid/Tanh 用）または He（ReLU 用） |

---

## 使用場面

| タスク | MLP の使用例 |
|--------|------------|
| 表形式データの分類・回帰 | 最も基本的な用途 |
| 特徴量エンジニアリング後の予測 | 他のモデルとのアンサンブル |
| 埋め込み表現の変換 | Word2Vec の出力変換など |
| 強化学習の価値関数近似 | DQN の Q ネットワーク |
| 推薦システム | ユーザー・アイテム埋め込みの結合 |

MLP は構造化データ（テーブルデータ）に対して非常に強力であり、CNN や Transformer のサブコンポーネントとしても広く使用されている。データが構造的で特徴量として整形されている場合は、まず MLP を試すことが推奨される。

---

## 参考文献

- Cybenko, G. (1989). "Approximation by superpositions of a sigmoidal function." *Mathematics of Control, Signals, and Systems*, 2(4), 303–314.
- Goodfellow, I., Bengio, Y., & Courville, A. (2016). *Deep Learning*. MIT Press.
- PyTorch 公式ドキュメント: https://pytorch.org/docs/stable/nn.html

<AffiliateBanner site="ml_intro" />
