import AffiliateBanner from '@site/src/components/AffiliateBanner';

# パーセプトロン

ニューラルネットワークの起源は、1958年にフランク・ローゼンブラットが提案したパーセプトロンにある。生物の神経細胞（ニューロン）の動作を数学的にモデル化したもので、現代の深層学習の礎となった概念である。

## パーセプトロンとは

> パーセプトロンは、複数の入力を受け取り、それぞれに重みを掛けて合計し、閾値（しきい値）を超えたら 1、そうでなければ 0 を出力する、最も単純なニューラルネットワーク単位である。

---

## 単純パーセプトロンの仕組み

### 数学的定義

入力ベクトル $\mathbf{x} = (x_1, x_2, \ldots, x_n)$、重みベクトル $\mathbf{w} = (w_1, w_2, \ldots, w_n)$、バイアス $b$ に対して：

$$
y = \begin{cases} 1 & \text{if } \mathbf{w} \cdot \mathbf{x} + b > 0 \\ 0 & \text{otherwise} \end{cases}
$$

| 要素 | 役割 |
|------|------|
| 入力 $x_i$ | 外部からのシグナル |
| 重み $w_i$ | 各入力の重要度 |
| バイアス $b$ | 決定境界のオフセット |
| 活性化関数 | ステップ関数（0 or 1） |

### パーセプトロンの Python 実装

```python
import numpy as np
import matplotlib.pyplot as plt


class Perceptron:
    """単純パーセプトロンの実装"""

    def __init__(self, learning_rate: float = 0.1, max_epochs: int = 100):
        self.lr = learning_rate
        self.max_epochs = max_epochs
        self.weights = None
        self.bias = None
        self.errors_per_epoch = []

    def _step(self, x: np.ndarray) -> np.ndarray:
        """ステップ関数（活性化関数）"""
        return np.where(x >= 0, 1, 0)

    def predict(self, X: np.ndarray) -> np.ndarray:
        linear = X @ self.weights + self.bias
        return self._step(linear)

    def fit(self, X: np.ndarray, y: np.ndarray) -> "Perceptron":
        n_samples, n_features = X.shape
        self.weights = np.zeros(n_features)
        self.bias = 0.0

        for epoch in range(self.max_epochs):
            errors = 0
            for xi, yi in zip(X, y):
                prediction = self._step(xi @ self.weights + self.bias)
                delta = self.lr * (yi - prediction)
                self.weights += delta * xi
                self.bias += delta
                errors += int(delta != 0)
            self.errors_per_epoch.append(errors)
            if errors == 0:
                print(f"収束: epoch={epoch + 1}")
                break
        return self


# AND ゲートの学習
X_and = np.array([[0, 0], [0, 1], [1, 0], [1, 1]])
y_and = np.array([0, 0, 0, 1])

p = Perceptron(learning_rate=0.1, max_epochs=100)
p.fit(X_and, y_and)
print("AND 予測:", p.predict(X_and))  # [0, 0, 0, 1]

# OR ゲートの学習
y_or = np.array([0, 1, 1, 1])
p_or = Perceptron()
p_or.fit(X_and, y_or)
print("OR 予測:", p_or.predict(X_and))   # [0, 1, 1, 1]
```

---

## パーセプトロンの学習則

パーセプトロン学習則は「予測が間違ったときだけ重みを更新する」シンプルなルールである。

$$
w_i \leftarrow w_i + \eta (y - \hat{y}) x_i
$$
$$
b \leftarrow b + \eta (y - \hat{y})
$$

- $\eta$: 学習率（learning rate）
- $y$: 正解ラベル
- $\hat{y}$: 予測値

### 収束定理

> 訓練データが線形分離可能であれば、パーセプトロン学習則は有限回の更新で必ず収束する（パーセプトロン収束定理）。

---

## XOR 問題と線形分離不可能性

パーセプトロンの致命的な限界は **XOR（排他的論理和）** を学習できないことである。

| $x_1$ | $x_2$ | XOR |
|--------|--------|-----|
| 0 | 0 | 0 |
| 0 | 1 | 1 |
| 1 | 0 | 1 |
| 1 | 1 | 0 |

XOR のデータ点は1本の直線では分離できない（非線形分離）。

```python
import numpy as np
import matplotlib.pyplot as plt


def visualize_xor_problem():
    """XOR が線形分離不可能であることを可視化"""
    X_xor = np.array([[0, 0], [0, 1], [1, 0], [1, 1]])
    y_xor = np.array([0, 1, 1, 0])

    colors = ["blue" if label == 0 else "red" for label in y_xor]
    markers = ["o" if label == 0 else "^" for label in y_xor]

    fig, ax = plt.subplots(figsize=(6, 5))
    for i, (point, color, marker) in enumerate(zip(X_xor, colors, markers)):
        ax.scatter(*point, color=color, marker=marker, s=200, zorder=5)
        ax.annotate(
            f"({point[0]},{point[1]}) → {y_xor[i]}",
            point,
            textcoords="offset points",
            xytext=(10, 5),
        )

    # 分離線が引けないことを示す試み
    x_line = np.linspace(-0.5, 1.5, 100)
    ax.plot(x_line, 0.5 * np.ones_like(x_line), "g--", label="水平線（不可能）")
    ax.plot(0.5 * np.ones_like(x_line), x_line, "m--", label="垂直線（不可能）")

    ax.set_xlim(-0.5, 1.5)
    ax.set_ylim(-0.5, 1.5)
    ax.set_xlabel("$x_1$")
    ax.set_ylabel("$x_2$")
    ax.set_title("XOR 問題：線形分離不可能")
    ax.legend()
    plt.tight_layout()
    plt.savefig("xor_problem.png", dpi=150)
    plt.show()


# XOR をパーセプトロンで学習しようとすると収束しない
X_xor = np.array([[0, 0], [0, 1], [1, 0], [1, 1]])
y_xor = np.array([0, 1, 1, 0])

p_xor = Perceptron(learning_rate=0.1, max_epochs=50)
p_xor.fit(X_xor, y_xor)
print("XOR 予測（失敗）:", p_xor.predict(X_xor))  # 正しく学習できない
print("エラー数推移:", p_xor.errors_per_epoch[:10])
```

---

## 多層パーセプトロンへの拡張の必要性

XOR 問題を解くには **隠れ層** を追加する必要がある。隠れ層を持つネットワークは非線形な決定境界を形成できる。

```python
import numpy as np


def xor_mlp_manual():
    """手動で設計した多層ネットワークで XOR を解く"""
    # 手動で決定した重みとバイアス
    # 隠れ層: AND と NAND の組み合わせ
    W1 = np.array([[1, 1], [1, 1]])    # 形状: (hidden, input)
    b1 = np.array([-1.5, -0.5])        # バイアス
    W2 = np.array([[1, 1]])            # 形状: (output, hidden)
    b2 = np.array([-1.5])

    def step(x):
        return np.where(x >= 0, 1, 0)

    X = np.array([[0, 0], [0, 1], [1, 0], [1, 1]])

    # 順伝播
    z1 = X @ W1.T + b1          # (4, 2)
    h1 = step(z1)               # 隠れ層の出力
    z2 = h1 @ W2.T + b2         # (4, 1)
    output = step(z2).flatten()

    print("隠れ層出力:")
    for i, (inp, h) in enumerate(zip(X, h1)):
        print(f"  入力={inp} → 隠れ層={h}")
    print("最終出力:", output)
    # 期待値: [0, 1, 1, 0]


xor_mlp_manual()
```

### 単純パーセプトロン vs 多層パーセプトロン

| 特性 | 単純パーセプトロン | 多層パーセプトロン |
|------|------------------|------------------|
| 層数 | 1層（入出力のみ） | 2層以上 |
| 決定境界 | 線形（直線・平面） | 非線形 |
| 表現力 | 線形分離可能なみ | 任意の関数を近似可能 |
| 学習アルゴリズム | パーセプトロン則 | 誤差逆伝播法 |
| XOR 学習 | 不可能 | 可能 |

---

## 使用場面

| 場面 | 適用可否 | 説明 |
|------|---------|------|
| 線形分離可能な2値分類 | 適用可 | 単純パーセプトロンで十分 |
| XOR などの非線形問題 | 不可 | 多層構造が必要 |
| 教育・理論学習 | 推奨 | NN の基礎を理解するのに最適 |
| 大規模データの分類 | 不可 | MLP や深層モデルを使用 |

パーセプトロンは現代の実用的な問題には使えないが、ニューラルネットワークの動作原理を理解する上で不可欠な概念である。重みの更新ルール、活性化関数の役割、線形分離の限界といった核心的な概念はすべてここに凝縮されている。

---

## 参考文献

- Rosenblatt, F. (1958). "The perceptron: A probabilistic model for information storage and organization in the brain." *Psychological Review*, 65(6), 386–408.
- Minsky, M., & Papert, S. (1969). *Perceptrons: An Introduction to Computational Geometry*. MIT Press.
- 岡谷貴之 (2022). 『深層学習 改訂第2版』. 講談社.

<AffiliateBanner site="ml_intro" />
