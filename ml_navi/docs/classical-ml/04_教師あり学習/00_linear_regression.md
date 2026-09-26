import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 線形回帰

## 線形回帰とは

> 線形回帰（Linear Regression）とは、目的変数（出力）と1つ以上の説明変数（入力）の間に線形の関係を仮定し、データに最もよく当てはまる直線（または超平面）を求める手法である。最もシンプルかつ解釈性の高い機械学習アルゴリズムの1つであり、予測・推論の両面で広く使われる。

---

## 数学的定義

$n$ 個のデータ点 $(x_i, y_i)$ に対して、以下のモデルを仮定する。

$$
\hat{y} = w_0 + w_1 x_1 + w_2 x_2 + \cdots + w_p x_p = \mathbf{w}^\top \mathbf{x}
$$

目的は、残差二乗和（RSS）を最小化するパラメータ $\mathbf{w}$ を求めることである。

$$
\mathcal{L}(\mathbf{w}) = \sum_{i=1}^{n} (y_i - \hat{y}_i)^2 = \|\mathbf{y} - X\mathbf{w}\|^2
$$

---

## 解法：正規方程式と最急降下法

### 正規方程式（Closed-form Solution）

解析的に解を求める方法。計算量は $O(p^3)$（$p$：特徴量数）。

$$
\mathbf{w}^* = (X^\top X)^{-1} X^\top \mathbf{y}
$$

| 手法 | 計算量 | 特徴 |
|------|--------|------|
| 正規方程式 | $O(p^3 + np^2)$ | 小〜中規模に適す、逆行列が必要 |
| 最急降下法 | $O(np)$ × イテレーション数 | 大規模データに適す、学習率の調整が必要 |
| 確率的勾配降下法（SGD） | $O(p)$ × イテレーション数 | 非常に大規模なデータに有効 |

### 最急降下法（Gradient Descent）

$$
\mathbf{w} \leftarrow \mathbf{w} - \alpha \nabla_{\mathbf{w}} \mathcal{L}
$$

$$
\nabla_{\mathbf{w}} \mathcal{L} = -2X^\top(\mathbf{y} - X\mathbf{w})
$$

---

## Python実装

### NumPyによるスクラッチ実装

```python
import numpy as np
import matplotlib.pyplot as plt

# データ生成
np.random.seed(42)
n = 100
X_raw = np.random.uniform(0, 10, n)
y = 2.5 * X_raw + 1.0 + np.random.randn(n) * 2

# 計画行列 X（切片項を追加）
X = np.column_stack([np.ones(n), X_raw])

# --- 正規方程式 ---
w_ols = np.linalg.solve(X.T @ X, X.T @ y)
print(f"正規方程式: w0={w_ols[0]:.4f}, w1={w_ols[1]:.4f}")

# --- 最急降下法 ---
def gradient_descent(X, y, lr=0.001, n_iter=1000):
    w = np.zeros(X.shape[1])
    n = len(y)
    losses = []
    for _ in range(n_iter):
        residual = y - X @ w
        grad = -2 * X.T @ residual / n
        w -= lr * grad
        losses.append(np.mean(residual**2))
    return w, losses

w_gd, losses = gradient_descent(X, y, lr=0.001, n_iter=2000)
print(f"最急降下法: w0={w_gd[0]:.4f}, w1={w_gd[1]:.4f}")

# 可視化
fig, axes = plt.subplots(1, 2, figsize=(12, 4))

axes[0].scatter(X_raw, y, alpha=0.5, label="data")
x_line = np.linspace(0, 10, 200)
axes[0].plot(x_line, w_ols[0] + w_ols[1] * x_line, "r-", label="OLS fit")
axes[0].set_xlabel("x")
axes[0].set_ylabel("y")
axes[0].set_title("線形回帰フィッティング")
axes[0].legend()

axes[1].plot(losses)
axes[1].set_xlabel("Iteration")
axes[1].set_ylabel("MSE")
axes[1].set_title("学習曲線（最急降下法）")

plt.tight_layout()
plt.savefig("linear_regression.png", dpi=120)
plt.show()
```

### scikit-learnによる実装

```python
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler

# データ生成
np.random.seed(0)
n = 200
X = np.random.randn(n, 3)
true_w = np.array([2.0, -1.5, 0.8])
y = X @ true_w + 3.0 + np.random.randn(n) * 0.5

# 分割
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# 標準化
scaler = StandardScaler()
X_train_sc = scaler.fit_transform(X_train)
X_test_sc = scaler.transform(X_test)

# モデル学習
model = LinearRegression()
model.fit(X_train_sc, y_train)

# 評価
y_pred = model.predict(X_test_sc)
print(f"MSE  : {mean_squared_error(y_test, y_pred):.4f}")
print(f"RMSE : {np.sqrt(mean_squared_error(y_test, y_pred)):.4f}")
print(f"R²   : {r2_score(y_test, y_pred):.4f}")
print(f"切片  : {model.intercept_:.4f}")
print(f"係数  : {model.coef_}")
```

### 残差診断プロット

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.linear_model import LinearRegression

np.random.seed(1)
n = 150
X = np.random.randn(n, 1)
y = 3 * X.ravel() + np.random.randn(n)

model = LinearRegression().fit(X, y)
y_pred = model.predict(X)
residuals = y - y_pred

fig, axes = plt.subplots(1, 3, figsize=(15, 4))

# 残差 vs 予測値
axes[0].scatter(y_pred, residuals, alpha=0.5)
axes[0].axhline(0, color="red", linestyle="--")
axes[0].set_xlabel("予測値")
axes[0].set_ylabel("残差")
axes[0].set_title("残差 vs 予測値")

# 残差のヒストグラム
axes[1].hist(residuals, bins=20, edgecolor="black")
axes[1].set_xlabel("残差")
axes[1].set_ylabel("頻度")
axes[1].set_title("残差の分布")

# QQプロット
from scipy import stats
stats.probplot(residuals, plot=axes[2])
axes[2].set_title("QQプロット（正規性確認）")

plt.tight_layout()
plt.savefig("residual_diagnosis.png", dpi=120)
plt.show()
```

---

## 前提仮定

線形回帰が有効に機能するための主な仮定を整理する。

| 仮定 | 内容 | 違反時の問題 |
|------|------|-------------|
| 線形性 | 目的変数と説明変数の関係が線形 | バイアスが大きくなる |
| 独立性 | 残差が互いに独立 | 係数の標準誤差が偏る |
| 等分散性 | 残差の分散が一定（ホモスケダスティシティ） | 信頼区間・検定が無効化 |
| 正規性 | 残差が正規分布に従う | 小サンプルで推定が不安定 |
| 多重共線性がない | 説明変数間に強い相関がない | 係数の推定が不安定 |

---

## 評価指標

| 指標 | 式 | 説明 |
|------|----|------|
| MSE | $\frac{1}{n}\sum(y_i - \hat{y}_i)^2$ | 外れ値に敏感 |
| RMSE | $\sqrt{\text{MSE}}$ | 目的変数と同じスケール |
| MAE | $\frac{1}{n}\sum|y_i - \hat{y}_i|$ | 外れ値に頑健 |
| $R^2$ | $1 - \frac{\text{RSS}}{\text{TSS}}$ | 1に近いほど良い（0〜1） |
| Adjusted $R^2$ | $1 - (1-R^2)\frac{n-1}{n-p-1}$ | 特徴量数を補正したR² |

---

## 解釈性

線形回帰の最大の強みは**係数の解釈可能性**にある。

- 係数 $w_j$ は「$x_j$ が1単位増加したとき、他の変数を固定した場合に $y$ が $w_j$ 変化する」と解釈できる
- 標準化した変数の係数を比較することで、各特徴量の相対的な重要度がわかる
- ただし因果関係を示すものではなく、あくまでも相関・予測の関係であることに注意する

---

## 使用場面

| シーン | 理由 |
|--------|------|
| 不動産価格の予測 | 面積・築年数などとの線形関係が近似的に成立 |
| 需要予測の初期モデル | シンプルなベースラインとして活用 |
| 係数の解釈が必要な分析 | 規制産業・医療では説明責任が重要 |
| 特徴量選択のプロキシ | 係数の大きさで重要度を概観できる |
| データ数が少ない場合 | 複雑なモデルより汎化性能が高いことがある |

---

## 参考文献

- Bishop, C. M. (2006). *Pattern Recognition and Machine Learning*. Springer.
- Hastie, T., Tibshirani, R., & Friedman, J. (2009). *The Elements of Statistical Learning* (2nd ed.). Springer.
- scikit-learn 公式ドキュメント: [LinearRegression](https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.LinearRegression.html)

<AffiliateBanner site="ml_intro" />
