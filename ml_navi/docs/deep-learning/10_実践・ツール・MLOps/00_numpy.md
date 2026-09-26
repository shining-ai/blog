import AffiliateBanner from '@site/src/components/AffiliateBanner';

# NumPy

## NumPyとは

> NumPy（Numerical Python）は、Python における高性能数値計算ライブラリである。多次元配列（ndarray）を基盤とし、C言語で実装された低レベル演算によってループを排除したベクトル化演算を実現する。科学技術計算・機械学習の事実上の標準基盤である。

## ndarray の基本属性

| 属性 | 説明 | 例 |
|------|------|-----|
| `shape` | 各次元のサイズ | `(100, 784)` |
| `dtype` | データ型 | `float32`, `int64` |
| `ndim` | 次元数 | `2` |
| `size` | 全要素数 | `78400` |
| `itemsize` | 1要素のバイト数 | `4`（float32）|

## ブロードキャストのルール

| ルール | 例 |
|--------|-----|
| 次元数が異なる場合、小さい側の左に 1 を補う | `(3,)` → `(1, 3)` |
| サイズ 1 の次元は任意のサイズに拡張される | `(1, 3)` と `(4, 3)` → `(4, 3)` |
| それ以外のサイズ不一致はエラー | `(3,)` と `(4,)` → エラー |

## Python実装

```python
import numpy as np

# ==============================
# 配列の作成
# ==============================
a = np.array([1, 2, 3, 4, 5], dtype=np.float32)
b = np.zeros((3, 4))               # ゼロ行列
c = np.ones((2, 3, 4))            # 1の配列
d = np.eye(4)                      # 単位行列
e = np.arange(0, 10, 2)           # [0, 2, 4, 6, 8]
f = np.linspace(0, 1, 11)         # [0.0, 0.1, ..., 1.0]
g = np.random.randn(100, 10)      # 標準正規分布

# ==============================
# インデックスとスライス
# ==============================
arr = np.arange(24).reshape(4, 6)
print(arr[1, 3])          # 要素アクセス: 9
print(arr[1:3, 2:5])      # スライス
print(arr[:, -1])         # 最後の列
print(arr[arr > 10])      # ブール配列でフィルタ
print(arr[[0, 2], :])     # ファンシーインデックス

# ==============================
# ブロードキャスト
# ==============================
x = np.array([[1, 2, 3], [4, 5, 6]])   # shape: (2, 3)
y = np.array([10, 20, 30])             # shape: (3,) → (1, 3)
print(x + y)               # shape: (2, 3) 各行に y を加算

# 標準化（平均0, 分散1）
X = np.random.randn(100, 5)
X_norm = (X - X.mean(axis=0)) / X.std(axis=0)  # ブロードキャスト活用

# ==============================
# ベクトル化演算（ループ排除）
# ==============================
def sigmoid_loop(x):
    result = []
    for xi in x:
        result.append(1 / (1 + np.exp(-xi)))
    return np.array(result)

def sigmoid_vectorized(x):
    return 1 / (1 + np.exp(-x))  # ufunc による要素ごとの演算

x = np.linspace(-5, 5, 10000)
# vectorized 版は loop 版より大幅に高速

# ==============================
# 線形代数
# ==============================
A = np.array([[2, 1], [1, 3]], dtype=float)
b = np.array([5, 7], dtype=float)

# 連立方程式 Ax = b を解く
x = np.linalg.solve(A, b)
print("解:", x)

# 固有値・固有ベクトル
eigenvalues, eigenvectors = np.linalg.eig(A)
print("固有値:", eigenvalues)

# 行列積（matmul vs dot）
B = np.random.randn(3, 4)
C = np.random.randn(4, 5)
D = np.matmul(B, C)   # shape: (3, 5)
D2 = B @ C            # Python 3.5 以降の演算子

# 特異値分解（SVD）
U, S, Vt = np.linalg.svd(B)
print(f"U: {U.shape}, S: {S.shape}, Vt: {Vt.shape}")

# 行列のランクとノルム
print("ランク:", np.linalg.matrix_rank(B))
print("フロベニウスノルム:", np.linalg.norm(B, 'fro'))

# ==============================
# 乱数生成
# ==============================
rng = np.random.default_rng(seed=42)  # 再現性のある乱数生成
x = rng.normal(0, 1, size=(100, 5))  # 正規分布
y = rng.integers(0, 10, size=50)      # 整数の一様乱数
shuffle_idx = rng.permutation(100)    # シャッフルインデックス

# ==============================
# 実用的なデータ処理
# ==============================
# ソフトマックス関数（数値安定版）
def softmax(x: np.ndarray, axis: int = -1) -> np.ndarray:
    x_shifted = x - x.max(axis=axis, keepdims=True)
    exp_x = np.exp(x_shifted)
    return exp_x / exp_x.sum(axis=axis, keepdims=True)

logits = np.random.randn(10, 5)
probs = softmax(logits)
print("各行の合計（1になるはず）:", probs.sum(axis=1).round(6))

# バッチ処理での畳み込み（相関）
def batch_normalize(X: np.ndarray, eps: float = 1e-8) -> np.ndarray:
    mean = X.mean(axis=0, keepdims=True)
    var = X.var(axis=0, keepdims=True)
    return (X - mean) / np.sqrt(var + eps)

X = np.random.randn(32, 128)  # バッチサイズ32, 特徴量128
X_bn = batch_normalize(X)
print("バッチ正規化後の平均（≈0）:", X_bn.mean(axis=0)[:3].round(4))

# one-hot エンコーディング
def to_one_hot(labels: np.ndarray, n_classes: int) -> np.ndarray:
    one_hot = np.zeros((len(labels), n_classes))
    one_hot[np.arange(len(labels)), labels] = 1
    return one_hot

labels = np.array([0, 2, 1, 3])
print(to_one_hot(labels, n_classes=4))
```

## 使用場面

- 機械学習ライブラリ（PyTorch, TensorFlow, scikit-learn）の基盤
- 数値シミュレーション・信号処理・画像処理の前処理
- 特徴量エンジニアリングでの配列演算
- 行列計算・線形代数演算の高速実行
- ループを排除した高速なバッチ処理

## 参考文献

- NumPy 公式ドキュメント: https://numpy.org/doc/stable/
- Harris, C. R., et al. (2020). Array programming with NumPy. *Nature*, 585, 357-362.
- VanderPlas, J. (2016). *Python Data Science Handbook*. O'Reilly.

<AffiliateBanner site="ml_intro" />
