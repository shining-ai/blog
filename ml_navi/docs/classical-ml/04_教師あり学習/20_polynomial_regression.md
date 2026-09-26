import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 多項式回帰

## 多項式回帰とは

> 多項式回帰（Polynomial Regression）とは、元の特徴量から多項式の基底関数（$x, x^2, x^3, \ldots$）を生成し、それらを説明変数として線形回帰を適用することで、非線形な関係をモデル化する手法である。見かけ上は非線形だが、変換後の特徴量に対しては線形回帰であるため、線形モデルの枠組みで解析できる。

---

## 特徴量変換のアイデア

1次元の入力 $x$ に対して、$d$ 次の多項式特徴量を生成する。

$$
\phi(x) = [1, x, x^2, \ldots, x^d]
$$

これにより、モデルは次のような形になる。

$$
\hat{y} = w_0 + w_1 x + w_2 x^2 + \cdots + w_d x^d
$$

複数の特徴量 $(x_1, x_2)$ の場合、交差項も含まれる。

$$
\phi(x_1, x_2) = [1, x_1, x_2, x_1^2, x_1 x_2, x_2^2, \ldots]
$$

| 次数 | 1特徴量の項数 | 2特徴量の項数（交差項含む） |
|------|-------------|--------------------------|
| 1    | 2           | 3                         |
| 2    | 3           | 6                         |
| 3    | 4           | 10                        |
| 4    | 5           | 15                        |
| $d$  | $d+1$       | $\binom{p+d}{d}$          |

特徴量数 $p$ が大きいと特徴量次元が爆発的に増加するため注意が必要。

---

## 過学習と次数の選択

多項式の次数を上げると訓練データへの当てはまりは良くなるが、汎化性能が低下する（過学習）。

| 次数が低い | 次数が適切 | 次数が高い |
|-----------|-----------|-----------|
| アンダーフィッティング | バランスが良い | オーバーフィッティング |
| 高バイアス・低分散 | バイアス・分散のトレードオフが最適 | 低バイアス・高分散 |

---

## Python実装

### 多項式特徴量の生成と比較

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.preprocessing import PolynomialFeatures
from sklearn.linear_model import LinearRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_squared_error

# データ生成（非線形：sinカーブ）
np.random.seed(42)
n = 40
X_raw = np.sort(np.random.uniform(0, 2 * np.pi, n))
y = np.sin(X_raw) + np.random.randn(n) * 0.3

X = X_raw.reshape(-1, 1)
X_plot = np.linspace(0, 2 * np.pi, 300).reshape(-1, 1)

degrees = [1, 3, 5, 9, 15]
fig, axes = plt.subplots(1, len(degrees), figsize=(18, 4), sharey=True)

for ax, deg in zip(axes, degrees):
    model = Pipeline([
        ("poly", PolynomialFeatures(degree=deg, include_bias=False)),
        ("lr",   LinearRegression()),
    ])
    model.fit(X, y)
    y_plot = model.predict(X_plot)
    train_mse = mean_squared_error(y, model.predict(X))

    ax.scatter(X_raw, y, s=20, color="steelblue", label="data")
    ax.plot(X_plot, np.sin(X_plot), "g--", linewidth=1.5, label="真の関数")
    ax.plot(X_plot, y_plot, "r-", linewidth=2, label=f"deg={deg}")
    ax.set_ylim(-2.5, 2.5)
    ax.set_title(f"次数={deg}\nMSE={train_mse:.3f}")
    ax.legend(fontsize=7)

plt.suptitle("多項式回帰：次数による過学習の比較", y=1.02)
plt.tight_layout()
plt.savefig("polynomial_degrees.png", dpi=120)
plt.show()
```

### バイアス・分散トレードオフの可視化

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.preprocessing import PolynomialFeatures
from sklearn.linear_model import LinearRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import cross_val_score

np.random.seed(0)
n = 60
X = np.sort(np.random.uniform(0, 1, n)).reshape(-1, 1)
y = np.sin(4 * np.pi * X.ravel()) + np.random.randn(n) * 0.3

degrees = list(range(1, 16))
train_errors, val_errors = [], []

for deg in degrees:
    model = Pipeline([
        ("poly", PolynomialFeatures(degree=deg)),
        ("lr",   LinearRegression()),
    ])
    model.fit(X, y)
    train_pred = model.predict(X)
    train_errors.append(np.mean((y - train_pred) ** 2))

    cv_scores = cross_val_score(
        model, X, y, cv=5, scoring="neg_mean_squared_error"
    )
    val_errors.append(-cv_scores.mean())

plt.figure(figsize=(8, 5))
plt.plot(degrees, train_errors, "b-o", markersize=5, label="訓練誤差")
plt.plot(degrees, val_errors,   "r-o", markersize=5, label="検証誤差（5-fold CV）")
best_deg = degrees[np.argmin(val_errors)]
plt.axvline(best_deg, color="gray", linestyle="--", label=f"最適次数={best_deg}")
plt.xlabel("多項式の次数")
plt.ylabel("MSE")
plt.title("バイアス・分散トレードオフ")
plt.legend()
plt.yscale("log")
plt.tight_layout()
plt.savefig("bias_variance_tradeoff.png", dpi=120)
plt.show()
print(f"最適多項式次数: {best_deg}")
```

### 正則化との組み合わせ（過学習防止）

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.preprocessing import PolynomialFeatures, StandardScaler
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.pipeline import Pipeline

np.random.seed(5)
n = 25
X_train = np.sort(np.random.uniform(0, 1, n)).reshape(-1, 1)
y_train = np.sin(2 * np.pi * X_train.ravel()) + np.random.randn(n) * 0.2

X_plot = np.linspace(0, 1, 300).reshape(-1, 1)

fig, axes = plt.subplots(1, 3, figsize=(15, 4), sharey=True)
configs = [
    ("多項式（次数9, 正則化なし）", LinearRegression(), 9),
    ("多項式（次数9, Ridge α=0.001）", Ridge(alpha=0.001), 9),
    ("多項式（次数9, Ridge α=1.0）", Ridge(alpha=1.0), 9),
]

for ax, (title, regressor, deg) in zip(axes, configs):
    model = Pipeline([
        ("poly",   PolynomialFeatures(degree=deg)),
        ("scaler", StandardScaler()),
        ("model",  regressor),
    ])
    model.fit(X_train, y_train)
    y_pred = model.predict(X_plot)

    ax.scatter(X_train, y_train, color="steelblue", s=25, label="訓練データ")
    ax.plot(X_plot, np.sin(2 * np.pi * X_plot), "g--", label="真の関数")
    ax.plot(X_plot, y_pred, "r-", linewidth=2, label="予測")
    ax.set_ylim(-3, 3)
    ax.set_title(title, fontsize=9)
    ax.legend(fontsize=7)

plt.tight_layout()
plt.savefig("poly_regularization.png", dpi=120)
plt.show()
```

### 多変量多項式特徴量

```python
import numpy as np
from sklearn.preprocessing import PolynomialFeatures

# 2特徴量の例
X_sample = np.array([[2, 3]])
for degree in [1, 2, 3]:
    poly = PolynomialFeatures(degree=degree, include_bias=True)
    X_transformed = poly.fit_transform(X_sample)
    print(f"次数={degree}, 特徴量数={X_transformed.shape[1]}")
    print(f"  特徴量名: {poly.get_feature_names_out(['x1', 'x2'])}")
    print()
```

出力例：

```
次数=1, 特徴量数=3
  特徴量名: ['1' 'x1' 'x2']

次数=2, 特徴量数=6
  特徴量名: ['1' 'x1' 'x2' 'x1^2' 'x1 x2' 'x2^2']

次数=3, 特徴量数=10
  特徴量名: ['1' 'x1' 'x2' 'x1^2' 'x1 x2' 'x2^2' 'x1^3' 'x1^2 x2' 'x1 x2^2' 'x2^3']
```

---

## 実務上の注意点

| 注意点 | 対策 |
|--------|------|
| 特徴量のスケール差が大きくなる | `StandardScaler` で標準化してから多項式化 |
| 次数が高いと数値的に不安定 | 正則化（Ridge/Lasso）と組み合わせる |
| 解釈性が低下する | 次数は最小限に留める |
| 特徴量数が多いと組み合わせが爆発 | 重要な特徴量のみに適用 |
| 外挿性能が悪い | 訓練データ範囲外の予測には注意 |

---

## 他の非線形手法との比較

| 手法 | 利点 | 欠点 |
|------|------|------|
| 多項式回帰 | シンプル、解釈可能 | 高次で不安定、外挿が危険 |
| スプライン回帰 | 局所的に柔軟、外挿安定 | 結節点の選択が必要 |
| 決定木 | 非線形に強い | 連続性がない |
| カーネル回帰 | 柔軟性が高い | 計算コストが高い |
| ニューラルネット | 非常に柔軟 | 解釈困難、大量データが必要 |

---

## 使用場面

| シーン | 理由 |
|--------|------|
| 単純な非線形関係のモデル化 | 2〜3次程度で十分対応可能 |
| データ量が少ない場合の非線形モデル | ニューラルネットより過学習しにくい |
| 特定の物理・経済モデルへの当てはめ | 理論式が多項式形の場合 |
| 線形モデルのベースラインを超えたい | まず多項式を試す |

---

## 参考文献

- James, G., Witten, D., Hastie, T., & Tibshirani, R. (2013). *An Introduction to Statistical Learning*. Springer.
- Bishop, C. M. (2006). *Pattern Recognition and Machine Learning*. Springer. (Chapter 3)
- scikit-learn 公式ドキュメント: [PolynomialFeatures](https://scikit-learn.org/stable/modules/generated/sklearn.preprocessing.PolynomialFeatures.html)

<AffiliateBanner site="ml_intro" />
