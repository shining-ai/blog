import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 正則化回帰

## 正則化回帰とは

> 正則化回帰（Regularized Regression）とは、通常の最小二乗法の損失関数に係数の大きさを制約するペナルティ項を加えることで、過学習を防ぎ汎化性能を高める回帰手法の総称である。代表的なものとして Ridge（L2正則化）、Lasso（L1正則化）、ElasticNet（L1+L2の組み合わせ）がある。

---

## 正則化の目的

通常の線形回帰は訓練データに対して最適な係数を求めるが、以下の問題が生じやすい。

- **過学習**：高次元データや多重共線性があると係数が非常に大きくなり、汎化性能が低下する
- **不安定な係数推定**：特徴量間に強い相関があると $(X^\top X)$ が特異行列に近づき、係数推定が不安定になる

正則化はペナルティ項により係数の大きさを抑制し、これらの問題を緩和する。

---

## 各手法の損失関数

| 手法 | 損失関数 | ペナルティ |
|------|----------|-----------|
| Ridge | $\text{RSS} + \lambda \sum w_j^2$ | L2ノルム（係数を0に近づける） |
| Lasso | $\text{RSS} + \lambda \sum |w_j|$ | L1ノルム（係数を正確に0にする） |
| ElasticNet | $\text{RSS} + \lambda_1 \sum |w_j| + \lambda_2 \sum w_j^2$ | L1+L2の組み合わせ |

### Ridge（L2正則化）

$$
\mathcal{L}_{\text{Ridge}} = \|y - Xw\|^2 + \lambda \|w\|^2
$$

解析解：$w^* = (X^\top X + \lambda I)^{-1} X^\top y$

- 全ての係数を縮小するが、正確に0にはしない
- 多重共線性に強い（$\lambda I$ を加えることで逆行列が安定）

### Lasso（L1正則化）

$$
\mathcal{L}_{\text{Lasso}} = \|y - Xw\|^2 + \lambda \sum_{j=1}^p |w_j|
$$

- 一部の係数を正確に0にする（スパース解）→ **自動的な特徴選択**
- 高次元かつ真に重要な特徴量が少ない場合に有効

### ElasticNet

$$
\mathcal{L}_{\text{EN}} = \|y - Xw\|^2 + \lambda_1 \|w\|_1 + \lambda_2 \|w\|_2^2
$$

- RidgeとLassoの利点を組み合わせる
- 相関した特徴量グループを同時に選択・棄却できる

---

## Python実装

### 基本的な使い方（scikit-learn）

```python
import numpy as np
from sklearn.linear_model import Ridge, Lasso, ElasticNet
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error

# データ生成（スパースな真の係数）
np.random.seed(42)
n, p = 200, 50
X = np.random.randn(n, p)
true_w = np.zeros(p)
true_w[:5] = [3.0, -2.0, 1.5, -1.0, 2.5]  # 5つだけ重要な特徴量
y = X @ true_w + np.random.randn(n) * 0.5

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=0
)

scaler = StandardScaler()
X_train_sc = scaler.fit_transform(X_train)
X_test_sc = scaler.transform(X_test)

# 各モデルの比較
models = {
    "Ridge (α=1.0)":      Ridge(alpha=1.0),
    "Lasso (α=0.1)":      Lasso(alpha=0.1),
    "ElasticNet (α=0.1)": ElasticNet(alpha=0.1, l1_ratio=0.5),
}

for name, model in models.items():
    model.fit(X_train_sc, y_train)
    y_pred = model.predict(X_test_sc)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    n_nonzero = np.sum(model.coef_ != 0)
    print(f"{name:30s}  RMSE={rmse:.4f}  非ゼロ係数={n_nonzero:2d}")
```

### 正則化係数 α のチューニング（クロスバリデーション）

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.linear_model import RidgeCV, LassoCV
from sklearn.preprocessing import StandardScaler

np.random.seed(0)
n, p = 300, 20
X = np.random.randn(n, p)
true_w = np.zeros(p)
true_w[:8] = np.random.uniform(-3, 3, 8)
y = X @ true_w + np.random.randn(n)

scaler = StandardScaler()
X_sc = scaler.fit_transform(X)

# RidgeCV: 交差検証で alpha を自動選択
alphas = np.logspace(-4, 4, 100)
ridge_cv = RidgeCV(alphas=alphas, cv=5)
ridge_cv.fit(X_sc, y)
print(f"RidgeCV 最適 alpha: {ridge_cv.alpha_:.4f}")

# LassoCV: 交差検証で alpha を自動選択
lasso_cv = LassoCV(cv=5, max_iter=10000)
lasso_cv.fit(X_sc, y)
print(f"LassoCV 最適 alpha: {lasso_cv.alpha_:.4f}")
print(f"Lasso 非ゼロ係数数: {np.sum(lasso_cv.coef_ != 0)}")
```

### 正則化パスの可視化

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.linear_model import lasso_path, ridge_regression
from sklearn.preprocessing import StandardScaler

np.random.seed(7)
n, p = 100, 10
X = np.random.randn(n, p)
y = X[:, 0] * 3 + X[:, 1] * (-2) + np.random.randn(n)

scaler = StandardScaler()
X_sc = scaler.fit_transform(X)

# Lasso パス
alphas_lasso, coefs_lasso, _ = lasso_path(X_sc, y, eps=1e-3)

# Ridge パス
alphas_ridge = np.logspace(-2, 3, 100)
coefs_ridge = []
for a in alphas_ridge:
    w = ridge_regression(X_sc, y, alpha=a)
    coefs_ridge.append(w)
coefs_ridge = np.array(coefs_ridge).T

fig, axes = plt.subplots(1, 2, figsize=(14, 5))

for i in range(p):
    axes[0].plot(-np.log10(alphas_lasso), coefs_lasso[i], label=f"w{i}")
axes[0].set_xlabel("-log10(alpha)")
axes[0].set_ylabel("係数の値")
axes[0].set_title("Lasso 正則化パス")
axes[0].axhline(0, color="black", linestyle="--", linewidth=0.8)

for i in range(p):
    axes[1].semilogx(alphas_ridge, coefs_ridge[i])
axes[1].set_xlabel("alpha")
axes[1].set_ylabel("係数の値")
axes[1].set_title("Ridge 正則化パス")
axes[1].axhline(0, color="black", linestyle="--", linewidth=0.8)
axes[1].invert_xaxis()

plt.tight_layout()
plt.savefig("regularization_path.png", dpi=120)
plt.show()
```

### L1とL2の幾何学的比較

```python
import numpy as np
import matplotlib.pyplot as plt

fig, axes = plt.subplots(1, 2, figsize=(12, 5))

# L1（Lasso）: 菱形の制約領域
theta = np.linspace(0, 2 * np.pi, 500)
# L1 ball: |w1| + |w2| <= 1
t = np.linspace(0, 1, 200)
l1_corners = np.array([[1, 0], [0, 1], [-1, 0], [0, -1], [1, 0]])

# L2（Ridge）: 円の制約領域
circle_x = np.cos(theta)
circle_y = np.sin(theta)

# 等高線（楕円形の損失関数）
w1, w2 = np.meshgrid(np.linspace(-2, 2, 300), np.linspace(-2, 2, 300))
loss = (w1 - 1.5) ** 2 + 2 * (w2 - 0.5) ** 2

for ax, title in zip(axes, ["Lasso (L1): スパース解", "Ridge (L2): 縮小解"]):
    ax.contour(w1, w2, loss, levels=15, cmap="RdYlGn_r", alpha=0.7)
    if title.startswith("Lasso"):
        ax.fill(l1_corners[:, 0], l1_corners[:, 1], alpha=0.3, color="steelblue")
        ax.plot(l1_corners[:, 0], l1_corners[:, 1], "steelblue")
        ax.scatter([0], [1], color="red", s=80, zorder=5, label="解（頂点）")
    else:
        ax.fill(circle_x, circle_y, alpha=0.3, color="steelblue")
        ax.plot(circle_x, circle_y, "steelblue")
        ax.scatter([0.9], [0.45], color="red", s=80, zorder=5, label="解")
    ax.set_xlim(-2, 2)
    ax.set_ylim(-2, 2)
    ax.set_xlabel("w1")
    ax.set_ylabel("w2")
    ax.set_title(title)
    ax.axhline(0, color="gray", lw=0.5)
    ax.axvline(0, color="gray", lw=0.5)
    ax.legend()

plt.tight_layout()
plt.savefig("l1_vs_l2.png", dpi=120)
plt.show()
```

---

## 各手法の比較まとめ

| 観点 | Ridge | Lasso | ElasticNet |
|------|-------|-------|------------|
| スパース性 | なし | あり（自動特徴選択） | あり |
| 多重共線性 | 強い | 弱い（1つだけ選ぶ） | 中程度 |
| 解析解 | あり | なし（座標降下法） | なし |
| 計算コスト | 低 | 中 | 中 |
| 適した場面 | 全特徴量が多少重要 | 重要特徴量が少数 | グループ構造がある |

---

## ハイパーパラメータ α の選び方

1. **クロスバリデーション**（`RidgeCV`, `LassoCV`）：最も信頼性が高い
2. **情報量基準**（AIC/BIC）：Lassoで利用可能
3. **正則化パスの確認**：係数が安定化する点を視覚的に確認

---

## 使用場面

| シーン | 推奨手法 | 理由 |
|--------|---------|------|
| 特徴量数 >> サンプル数 | Lasso | スパース解で次元圧縮 |
| 多重共線性がある | Ridge | 係数の安定化 |
| 相関した特徴量グループ | ElasticNet | グループ単位での選択 |
| 特徴量選択が必要 | Lasso | 不要な係数を0に |
| 全特徴量を活用したい | Ridge | 係数を縮小しつつ保持 |

---

## 参考文献

- Tibshirani, R. (1996). Regression shrinkage and selection via the lasso. *JRSS-B*, 58(1), 267–288.
- Zou, H., & Hastie, T. (2005). Regularization and variable selection via the elastic net. *JRSS-B*, 67(2), 301–320.
- scikit-learn 公式ドキュメント: [Ridge](https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.Ridge.html), [Lasso](https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.Lasso.html)

<AffiliateBanner site="ml_intro" />
