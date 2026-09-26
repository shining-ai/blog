import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ベクトルと行列

## ベクトルと行列とは

ベクトルと行列とは、

> 数値の集まりを構造化して表現するための数学的オブジェクトであり、機械学習におけるデータとモデルパラメータの基本表現形式

です。

機械学習では、データサンプル・重みパラメータ・画像・テキストなど、ほぼすべてのものをベクトルや行列として表現します。

## スカラー・ベクトル・行列・テンソル

### スカラー（Scalar）

スカラーとは単一の数値です。学習率・損失値・精度などはスカラーです。

$$a = 3.14, \quad b = -2, \quad c = 0.001$$

### ベクトル（Vector）

ベクトルとは数値の1次元の配列です。機械学習では特徴量ベクトルや重みベクトルとして使います。

$$\mathbf{x} = \begin{pmatrix} x_1 \\ x_2 \\ x_3 \end{pmatrix} = \begin{pmatrix} 1.5 \\ -0.3 \\ 2.1 \end{pmatrix}$$

- **列ベクトル**: 縦に並べたもの（デフォルト表記）
- **行ベクトル**: 横に並べたもの（列ベクトルの転置）

### 行列（Matrix）

行列とは数値の2次元の配列です。複数サンプルのデータセット・重み行列として使います。

$$A = \begin{pmatrix} 1 & 2 & 3 \\ 4 & 5 & 6 \end{pmatrix}$$

行列 $A$ が $m$ 行 $n$ 列のとき、$A \in \mathbb{R}^{m \times n}$ と書きます。

### テンソル（Tensor）

テンソルとは3次元以上の多次元配列です。画像データ（高さ×幅×チャンネル）やバッチデータに使います。

| 次元数 | 呼び名 | 機械学習での例 |
|--------|--------|--------------|
| 0次元 | スカラー | 損失値 0.42 |
| 1次元 | ベクトル | 特徴量ベクトル [1.2, -0.5, 3.1] |
| 2次元 | 行列 | データセット (N×D)、重み行列 |
| 3次元 | テンソル | 時系列データ (N×T×D)、RGB画像 |
| 4次元 | テンソル | 画像バッチ (N×C×H×W) |

## NumPy による実装

```python
import numpy as np

# --- スカラー ---
a = 3.14
b = np.float64(2.71)
print(f"スカラー a: {a}, 型: {type(a)}")
print(f"スカラー b: {b}, 型: {b.dtype}")

# --- ベクトル ---
# 列ベクトル（1D配列として表現）
v = np.array([1.5, -0.3, 2.1])
print(f"\nベクトル v: {v}")
print(f"形状: {v.shape}, 次元数: {v.ndim}")

# 明示的な列ベクトル（2D）
v_col = v.reshape(-1, 1)
print(f"\n列ベクトル:\n{v_col}")
print(f"形状: {v_col.shape}")

# --- 行列 ---
A = np.array([[1, 2, 3],
              [4, 5, 6]])
print(f"\n行列 A:\n{A}")
print(f"形状: {A.shape}  ({A.shape[0]}行 x {A.shape[1]}列)")

# --- テンソル ---
# 3チャンネル4x4画像の例
image_tensor = np.random.randn(3, 4, 4)
print(f"\n3D テンソル（画像）の形状: {image_tensor.shape}")

# バッチ画像（8枚の3チャンネル32x32画像）
batch_images = np.random.randn(8, 3, 32, 32)
print(f"4D テンソル（バッチ画像）の形状: {batch_images.shape}")
```

## ベクトルの演算

### 基本演算

```python
import numpy as np

a = np.array([1.0, 2.0, 3.0])
b = np.array([4.0, 5.0, 6.0])

# 加算・減算
print("加算:", a + b)         # [5. 7. 9.]
print("減算:", a - b)         # [-3. -3. -3.]

# スカラー倍
print("2倍:", 2 * a)          # [2. 4. 6.]
print("1/3倍:", a / 3)        # [0.333 0.667 1.0]

# 要素ごとの積（アダマール積）
print("要素ごとの積:", a * b) # [4. 10. 18.]
```

### 内積（ドット積）

$$\mathbf{a} \cdot \mathbf{b} = \sum_{i=1}^{n} a_i b_i = a_1 b_1 + a_2 b_2 + \cdots + a_n b_n$$

```python
import numpy as np

a = np.array([1.0, 2.0, 3.0])
b = np.array([4.0, 5.0, 6.0])

# 内積の計算（3種類の方法）
dot1 = np.dot(a, b)
dot2 = a @ b
dot3 = sum(ai * bi for ai, bi in zip(a, b))

print(f"内積（np.dot）: {dot1}")   # 32.0
print(f"内積（@演算子）: {dot2}")  # 32.0
print(f"内積（手計算）: {dot3}")   # 32.0

# 内積の幾何学的意味: a・b = |a||b|cos(θ)
norm_a = np.linalg.norm(a)
norm_b = np.linalg.norm(b)
cos_theta = dot1 / (norm_a * norm_b)
theta_deg = np.degrees(np.arccos(cos_theta))
print(f"|a| = {norm_a:.3f}, |b| = {norm_b:.3f}")
print(f"なす角: {theta_deg:.2f}度")
```

### ノルム（大きさ）

$$\|\mathbf{x}\|_2 = \sqrt{\sum_{i=1}^{n} x_i^2}$$

```python
import numpy as np

x = np.array([3.0, 4.0])

# L1ノルム（マンハッタン距離）
l1_norm = np.linalg.norm(x, ord=1)
print(f"L1ノルム: {l1_norm}")  # 7.0

# L2ノルム（ユークリッド距離）
l2_norm = np.linalg.norm(x, ord=2)
print(f"L2ノルム: {l2_norm}")  # 5.0

# 正規化（単位ベクトル化）
x_normalized = x / l2_norm
print(f"正規化ベクトル: {x_normalized}")
print(f"正規化後のノルム: {np.linalg.norm(x_normalized):.6f}")  # 1.0
```

## 行列の演算

### 行列の加算・スカラー倍

```python
import numpy as np

A = np.array([[1, 2], [3, 4]])
B = np.array([[5, 6], [7, 8]])

print("A + B:\n", A + B)
print("\n3 * A:\n", 3 * A)
```

### 行列の積

$$C = AB \quad \Rightarrow \quad C_{ij} = \sum_{k=1}^{n} A_{ik} B_{kj}$$

行列の積では次元の対応が重要です: $(m \times k)$ と $(k \times n)$ の積は $(m \times n)$

```python
import numpy as np

A = np.array([[1, 2, 3],
              [4, 5, 6]])     # 2x3行列

B = np.array([[7, 8],
              [9, 10],
              [11, 12]])      # 3x2行列

C = A @ B  # または np.dot(A, B)
print(f"A の形状: {A.shape}")  # (2, 3)
print(f"B の形状: {B.shape}")  # (3, 2)
print(f"A @ B の形状: {C.shape}")  # (2, 2)
print(f"A @ B:\n{C}")
# [[58  64]
#  [139 154]]

# 行列×ベクトル（線形変換）
x = np.array([1.0, 2.0, 3.0])
result = A @ x
print(f"\nA @ x:\n{result}")  # [14. 32.]
```

### 転置行列

$$A^T_{ij} = A_{ji}$$

```python
import numpy as np

A = np.array([[1, 2, 3],
              [4, 5, 6]])

print("A の形状:", A.shape)   # (2, 3)
print("A^T の形状:", A.T.shape)  # (3, 2)
print("A^T:\n", A.T)
```

## 機械学習でのベクトル・行列の使い方

```python
import numpy as np

# --- 線形回帰の予測 ---
# y = X @ w + b（行列とベクトルの積）

np.random.seed(42)
n_samples, n_features = 100, 5

# データ行列 X: (n_samples x n_features)
X = np.random.randn(n_samples, n_features)

# 重みベクトル w: (n_features,)
w = np.array([1.5, -0.5, 2.0, 0.8, -1.2])

# バイアス
b = 0.5

# 予測: (n_samples,)
y_pred = X @ w + b
print(f"データ行列 X の形状: {X.shape}")
print(f"重みベクトル w の形状: {w.shape}")
print(f"予測値の形状: {y_pred.shape}")
print(f"予測値（最初の5件）: {y_pred[:5].round(3)}")

# --- コサイン類似度（推薦システムなどで使用）---
def cosine_similarity_matrix(A, B):
    """行列間のコサイン類似度を計算"""
    # 正規化
    A_norm = A / np.linalg.norm(A, axis=1, keepdims=True)
    B_norm = B / np.linalg.norm(B, axis=1, keepdims=True)
    return A_norm @ B_norm.T

# アイテムの特徴ベクトル（例: 3つのアイテム、4次元特徴）
items = np.array([
    [1.0, 0.0, 1.0, 0.5],
    [0.8, 0.1, 0.9, 0.6],
    [0.0, 1.0, 0.0, 0.9],
])

sim_matrix = cosine_similarity_matrix(items, items)
print(f"\nコサイン類似度行列:\n{sim_matrix.round(3)}")
```

## 使用場面

- **データ表現**: データセットは行列 $X \in \mathbb{R}^{N \times D}$（N: サンプル数, D: 特徴量次元数）
- **線形変換**: ニューラルネットワークの全結合層は $y = Wx + b$
- **類似度計算**: コサイン類似度による文書・アイテムの比較
- **画像データ**: RGB画像はテンソル $(C, H, W)$ として表現
- **埋め込み表現**: 単語・文章は固定次元のベクトルとして表現

## 参考文献

<AffiliateBanner site="ml_intro" />

- [NumPy 公式ドキュメント](https://numpy.org/doc/stable/)
- Strang, G. (2016). *Introduction to Linear Algebra* (5th ed.). Wellesley-Cambridge Press.
- 深津貴之 et al. (2020). *Pythonで動かして学ぶ！あたらしい機械学習の教科書*. 翔泳社.
