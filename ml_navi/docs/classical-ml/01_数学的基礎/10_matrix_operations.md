import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 行列の演算と性質

## 行列の演算と性質とは

行列の演算と性質とは、

> 行列に対して定義される積・転置・逆行列・行列式・固有値分解などの操作とその数学的な意味

です。

これらは機械学習の理論的基盤であり、主成分分析（PCA）・線形回帰の最小二乗解・ニューラルネットワークの最適化に直接活用されます。

## 行列の積の性質

行列の積には次の重要な性質があります。

| 性質 | 式 | 備考 |
|------|-----|------|
| 結合律 | $(AB)C = A(BC)$ | 成立する |
| 分配律 | $A(B+C) = AB + AC$ | 成立する |
| 交換律 | $AB \neq BA$（一般に） | 成立しない |
| 転置の積 | $(AB)^T = B^T A^T$ | 順序が逆転 |

```python
import numpy as np

np.random.seed(42)
A = np.random.randn(3, 4)
B = np.random.randn(4, 5)
C = np.random.randn(5, 2)

# 結合律の確認
left = (A @ B) @ C
right = A @ (B @ C)
print("結合律 (AB)C = A(BC):", np.allclose(left, right))  # True

# 転置の積の確認
AB = A @ B
transpose_check = np.allclose((A @ B).T, B.T @ A.T)
print("転置の積 (AB)^T = B^T A^T:", transpose_check)  # True

# 交換律が成立しない例
X = np.array([[1, 2], [3, 4]])
Y = np.array([[5, 6], [7, 8]])
print("\nXY:\n", X @ Y)
print("YX:\n", Y @ X)
print("XY = YX?", np.allclose(X @ Y, Y @ X))  # False
```

## 転置行列

転置行列 $A^T$ は $A$ の行と列を入れ替えたものです。

$$A \in \mathbb{R}^{m \times n} \Rightarrow A^T \in \mathbb{R}^{n \times m}$$

### 対称行列

$A^T = A$ を満たす行列を**対称行列**と呼びます。共分散行列・グラム行列は必ず対称行列になります。

```python
import numpy as np

# 対称行列の生成（任意の行列 A から A^T A を作ると対称行列になる）
A = np.random.randn(4, 3)
S = A.T @ A  # 3x3 対称行列

print("S:\n", S.round(3))
print("対称行列の確認 S = S^T:", np.allclose(S, S.T))  # True

# グラム行列（内積行列）も対称行列
X = np.random.randn(5, 3)
G = X @ X.T  # 5x5 グラム行列
print("\nグラム行列 G = X X^T の形状:", G.shape)
print("対称行列の確認:", np.allclose(G, G.T))  # True
```

## 逆行列

正方行列 $A$ の逆行列 $A^{-1}$ は $AA^{-1} = A^{-1}A = I$（単位行列）を満たします。

$$Ax = b \Rightarrow x = A^{-1}b$$

逆行列は正方行列でかつ行列式が0でない場合のみ存在します（正則行列）。

```python
import numpy as np

A = np.array([[2.0, 1.0],
              [5.0, 3.0]])

# 逆行列の計算
A_inv = np.linalg.inv(A)
print("A:\n", A)
print("\nA の逆行列:\n", A_inv)

# 確認: A @ A^{-1} = I
I = A @ A_inv
print("\nA @ A^{-1}:\n", I.round(10))  # 単位行列になる

# 線形方程式系の解: Ax = b
b = np.array([4.0, 7.0])
x = A_inv @ b
print(f"\nAx = b の解 x: {x}")
print(f"検証 Ax = {A @ x}")  # b に一致

# 注意: 逆行列が存在しない場合（特異行列）
B = np.array([[1.0, 2.0],
              [2.0, 4.0]])  # 2行目は1行目の2倍

try:
    B_inv = np.linalg.inv(B)
except np.linalg.LinAlgError as e:
    print(f"\n特異行列の逆行列: エラー → {e}")

# 実用的には linalg.solve を使う（より数値的に安定）
x_solve = np.linalg.solve(A, b)
print(f"\nlinalg.solve による解: {x_solve}")
```

## 行列式（Determinant）

行列式 $\det(A)$ または $|A|$ は正方行列に定義されるスカラー値で、線形変換の「体積変換率」を表します。

$$\det(A) = 0 \Leftrightarrow A \text{ は特異行列（逆行列が存在しない）}$$

```python
import numpy as np

A = np.array([[3.0, 1.0],
              [2.0, 4.0]])

det_A = np.linalg.det(A)
print(f"det(A) = {det_A}")  # 10.0

# 2x2行列の場合の手計算: det([[a,b],[c,d]]) = ad - bc
a, b, c, d = A[0,0], A[0,1], A[1,0], A[1,1]
manual_det = a*d - b*c
print(f"手計算: {manual_det}")  # 10.0

# 行列式の性質
B = 2 * A
print(f"\ndet(2A) = {np.linalg.det(B):.4f}")        # 40.0 = 2^2 * 10
print(f"det(A^T) = {np.linalg.det(A.T):.4f}")       # 10.0 = det(A)
print(f"det(A)^2 = {det_A**2:.4f}")                  # 100.0

# 行列式と体積: 基底ベクトルが変換後にどれだけの面積を張るか
# det = 10 → 面積が10倍になる変換
```

## 固有値と固有ベクトル

正方行列 $A$ に対して $Av = \lambda v$ を満たす $v \neq 0$ を固有ベクトル、$\lambda$ を固有値と呼びます。

固有値・固有ベクトルは「行列変換において方向が変わらないベクトル（方向は変わらず倍率のみ変わる）」を表します。

$$Av = \lambda v$$

```python
import numpy as np

# 対称行列の固有値分解
A = np.array([[4.0, 2.0],
              [2.0, 3.0]])

eigenvalues, eigenvectors = np.linalg.eigh(A)  # 対称行列向け

print("固有値:", eigenvalues)
print("固有ベクトル（列ベクトル）:\n", eigenvectors)

# 確認: Av = λv
for i, (lam, v) in enumerate(zip(eigenvalues, eigenvectors.T)):
    Av = A @ v
    lambda_v = lam * v
    print(f"\n固有値 λ={lam:.4f}: Av = {Av.round(4)}, λv = {lambda_v.round(4)}")
    print(f"  Av = λv?", np.allclose(Av, lambda_v))

# 行列のトレース = 固有値の和
print(f"\ntr(A) = {np.trace(A)}")
print(f"固有値の和 = {eigenvalues.sum():.4f}")

# 行列式 = 固有値の積
print(f"det(A) = {np.linalg.det(A):.4f}")
print(f"固有値の積 = {np.prod(eigenvalues):.4f}")
```

### 固有値分解（Eigendecomposition）

対称行列 $A$ は $A = Q \Lambda Q^T$ と分解できます（$Q$: 固有ベクトルの行列、$\Lambda$: 固有値の対角行列）。

```python
import numpy as np

A = np.array([[4.0, 2.0, 1.0],
              [2.0, 5.0, 3.0],
              [1.0, 3.0, 6.0]])

eigenvalues, Q = np.linalg.eigh(A)
Lambda = np.diag(eigenvalues)

# A = Q Λ Q^T の確認
A_reconstructed = Q @ Lambda @ Q.T
print("元の行列 A:\n", A)
print("\n再構成 Q Λ Q^T:\n", A_reconstructed.round(10))
print("再構成精度:", np.allclose(A, A_reconstructed))  # True
```

## 特異値分解（SVD）

任意の行列 $A \in \mathbb{R}^{m \times n}$ は次のように分解できます。

$$A = U \Sigma V^T$$

- $U \in \mathbb{R}^{m \times m}$: 左特異ベクトル（直交行列）
- $\Sigma \in \mathbb{R}^{m \times n}$: 特異値の対角行列（非負・降順）
- $V \in \mathbb{R}^{n \times n}$: 右特異ベクトル（直交行列）

```python
import numpy as np

# データ行列（5サンプル、4特徴量）
np.random.seed(42)
A = np.random.randn(5, 4)

U, sigma, Vt = np.linalg.svd(A)

print(f"A の形状: {A.shape}")
print(f"U の形状: {U.shape}")
print(f"sigma の形状: {sigma.shape}")
print(f"Vt の形状: {Vt.shape}")
print(f"\n特異値: {sigma.round(4)}")

# 再構成: A = U Σ V^T
Sigma = np.zeros(A.shape)
Sigma[:len(sigma), :len(sigma)] = np.diag(sigma)
A_reconstructed = U @ Sigma @ Vt
print(f"\n再構成精度: {np.allclose(A, A_reconstructed)}")  # True

# --- 低ランク近似（次元削減の原理）---
k = 2  # 上位2つの特異値のみ使用
A_approx = U[:, :k] @ np.diag(sigma[:k]) @ Vt[:k, :]

# 近似誤差
error = np.linalg.norm(A - A_approx, 'fro')
print(f"\nk={k} での近似誤差（フロベニウスノルム）: {error:.4f}")

# 情報保持率
info_ratio = sigma[:k].sum() / sigma.sum()
print(f"情報保持率: {info_ratio:.3f}")

# --- SVDを使ったPCA ---
from sklearn.preprocessing import StandardScaler

np.random.seed(42)
X = np.random.randn(100, 5)
X_centered = X - X.mean(axis=0)

U_pca, s_pca, Vt_pca = np.linalg.svd(X_centered, full_matrices=False)

# 主成分スコア
n_components = 2
Z = U_pca[:, :n_components] * s_pca[:n_components]
print(f"\nPCA結果の形状: {Z.shape}")
```

## 擬似逆行列

$A^+$（ムーア・ペンローズ擬似逆行列）は逆行列が存在しない場合でも定義できる「逆行列の一般化」です。最小二乗解の計算に使います。

$$x = A^+ b = \arg\min_x \|Ax - b\|_2$$

```python
import numpy as np

# 過決定系（方程式が変数より多い場合）
A = np.array([[1.0, 1.0],
              [2.0, 1.0],
              [3.0, 1.0]])  # 3x2行列（逆行列なし）

b = np.array([2.0, 3.5, 5.0])

# 擬似逆行列で最小二乗解
A_pinv = np.linalg.pinv(A)
x_ls = A_pinv @ b
print(f"最小二乗解 x: {x_ls.round(4)}")
print(f"残差: {np.linalg.norm(A @ x_ls - b):.6f}")

# np.linalg.lstsq を使う方法（推奨）
x_lstsq, residuals, rank, sv = np.linalg.lstsq(A, b, rcond=None)
print(f"\nlstsq による解: {x_lstsq.round(4)}")
```

## 使用場面

- **線形回帰の解析解**: $w = (X^T X)^{-1} X^T y$（擬似逆行列・正規方程式）
- **主成分分析（PCA）**: 共分散行列の固有値分解または SVD
- **推薦システム**: SVD による行列分解（Matrix Factorization）
- **安定性の評価**: 条件数（最大特異値/最小特異値）による行列の数値的安定性の確認
- **白色化変換**: 共分散行列の固有値分解を用いたデータの前処理

## 参考文献

<AffiliateBanner site="ml_intro" />

- [NumPy Linear Algebra](https://numpy.org/doc/stable/reference/routines.linalg.html)
- Strang, G. (2016). *Introduction to Linear Algebra* (5th ed.). Wellesley-Cambridge Press.
- Goodfellow, I., Bengio, Y., & Courville, A. (2016). *Deep Learning*, Chapter 2. MIT Press.
