import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ロジスティック回帰

## ロジスティック回帰とは

> ロジスティック回帰（Logistic Regression）とは、線形モデルの出力にシグモイド関数を適用することで、2値分類問題（またはその多クラス拡張）に対する確率を出力する分類アルゴリズムである。「回帰」という名前がついているが、本質的には分類手法であり、モデルの解釈性の高さから統計学・医学・金融など多くの分野で広く使われる。

---

## シグモイド関数

線形スコア $z = \mathbf{w}^\top \mathbf{x}$ を確率 $p \in (0, 1)$ にマッピングする。

$$
\sigma(z) = \frac{1}{1 + e^{-z}}
$$

| $z$ | $\sigma(z)$ |
|-----|------------|
| $-\infty$ | 0 |
| $-2$ | 0.119 |
| $0$ | 0.500 |
| $+2$ | 0.881 |
| $+\infty$ | 1 |

モデルの予測確率：

$$
P(y=1 \mid \mathbf{x}) = \sigma(\mathbf{w}^\top \mathbf{x}) = \frac{1}{1 + e^{-\mathbf{w}^\top \mathbf{x}}}
$$

---

## 交差エントロピー損失

最大尤度推定により、以下の対数尤度を最大化（= 負の対数尤度を最小化）する。

$$
\mathcal{L}(\mathbf{w}) = -\sum_{i=1}^n \left[ y_i \log \hat{p}_i + (1 - y_i) \log(1 - \hat{p}_i) \right]
$$

この損失関数は**凸関数**であるため、局所最適解が存在しない（大域最適解が保証される）。

---

## 決定境界

分類境界は $P(y=1|\mathbf{x}) = 0.5$ となる超平面、すなわち $\mathbf{w}^\top \mathbf{x} = 0$ で定まる。

$$
\text{predict}(\mathbf{x}) = \begin{cases} 1 & \text{if } \mathbf{w}^\top \mathbf{x} \geq 0 \\ 0 & \text{otherwise} \end{cases}
$$

---

## Python実装

### 基本的な二値分類

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import make_classification
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    classification_report, confusion_matrix, roc_auc_score, roc_curve
)
from sklearn.preprocessing import StandardScaler

# データ生成
X, y = make_classification(
    n_samples=500, n_features=2, n_redundant=0,
    n_informative=2, random_state=42, n_clusters_per_class=1
)

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.25, random_state=0
)

scaler = StandardScaler()
X_train_sc = scaler.fit_transform(X_train)
X_test_sc = scaler.transform(X_test)

# モデル学習
model = LogisticRegression(C=1.0, random_state=42)
model.fit(X_train_sc, y_train)

y_pred = model.predict(X_test_sc)
y_prob = model.predict_proba(X_test_sc)[:, 1]

print("=== 分類レポート ===")
print(classification_report(y_test, y_pred))
print(f"AUC: {roc_auc_score(y_test, y_prob):.4f}")
print(f"\n係数: {model.coef_[0]}")
print(f"切片: {model.intercept_[0]:.4f}")
```

### 決定境界の可視化

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler

def plot_decision_boundary(model, X, y, scaler=None, ax=None):
    h = 0.02
    x_min, x_max = X[:, 0].min() - 0.5, X[:, 0].max() + 0.5
    y_min, y_max = X[:, 1].min() - 0.5, X[:, 1].max() + 0.5
    xx, yy = np.meshgrid(np.arange(x_min, x_max, h),
                          np.arange(y_min, y_max, h))
    grid = np.c_[xx.ravel(), yy.ravel()]
    if scaler:
        grid = scaler.transform(grid)
    proba = model.predict_proba(grid)[:, 1].reshape(xx.shape)

    if ax is None:
        fig, ax = plt.subplots(figsize=(7, 5))
    ax.contourf(xx, yy, proba, levels=25, cmap="RdBu_r", alpha=0.6)
    ax.contour(xx, yy, proba, levels=[0.5], colors="black", linewidths=2)
    scatter = ax.scatter(X[:, 0], X[:, 1], c=y, cmap="RdBu", edgecolors="k", s=30)
    plt.colorbar(scatter, ax=ax, label="クラス")
    ax.set_title("ロジスティック回帰 決定境界")
    return ax

# 実行例
from sklearn.datasets import make_classification
X, y = make_classification(
    n_samples=300, n_features=2, n_redundant=0,
    n_informative=2, random_state=3, n_clusters_per_class=1
)
scaler = StandardScaler()
X_sc = scaler.fit_transform(X)
model = LogisticRegression(C=1.0).fit(X_sc, y)

fig, ax = plt.subplots(figsize=(8, 6))
plot_decision_boundary(model, X, y, scaler=scaler, ax=ax)
plt.tight_layout()
plt.savefig("logistic_boundary.png", dpi=120)
plt.show()
```

### ROC曲線とAUC

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import make_classification
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_curve, auc
from sklearn.preprocessing import StandardScaler

X, y = make_classification(n_samples=1000, n_features=10, random_state=42)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=0
)
scaler = StandardScaler()
X_train_sc = scaler.fit_transform(X_train)
X_test_sc = scaler.transform(X_test)

# 異なる正則化強度での比較
Cs = [0.01, 0.1, 1.0, 10.0]
plt.figure(figsize=(8, 6))

for C in Cs:
    model = LogisticRegression(C=C, max_iter=1000)
    model.fit(X_train_sc, y_train)
    y_prob = model.predict_proba(X_test_sc)[:, 1]
    fpr, tpr, _ = roc_curve(y_test, y_prob)
    roc_auc = auc(fpr, tpr)
    plt.plot(fpr, tpr, label=f"C={C}  AUC={roc_auc:.3f}")

plt.plot([0, 1], [0, 1], "k--", label="ランダム")
plt.xlabel("偽陽性率 (FPR)")
plt.ylabel("真陽性率 (TPR)")
plt.title("ROC曲線の比較（異なる正則化強度）")
plt.legend()
plt.tight_layout()
plt.savefig("roc_curves.png", dpi=120)
plt.show()
```

### 多クラス分類（ソフトマックス回帰）

```python
import numpy as np
from sklearn.datasets import load_iris
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns

# Iris データセット（3クラス）
iris = load_iris()
X, y = iris.data, iris.target
class_names = iris.target_names

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42
)

scaler = StandardScaler()
X_train_sc = scaler.fit_transform(X_train)
X_test_sc = scaler.transform(X_test)

# multi_class='multinomial': ソフトマックス回帰
model = LogisticRegression(
    multi_class="multinomial",
    solver="lbfgs",
    C=1.0,
    max_iter=500
)
model.fit(X_train_sc, y_train)
y_pred = model.predict(X_test_sc)

print("=== 多クラス分類レポート ===")
print(classification_report(y_test, y_pred, target_names=class_names))

# 混同行列
cm = confusion_matrix(y_test, y_pred)
plt.figure(figsize=(6, 5))
sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
            xticklabels=class_names, yticklabels=class_names)
plt.xlabel("予測クラス")
plt.ylabel("真のクラス")
plt.title("混同行列（Iris データセット）")
plt.tight_layout()
plt.savefig("confusion_matrix_iris.png", dpi=120)
plt.show()
```

---

## 正則化パラメータ C

scikit-learn の `LogisticRegression` では、正則化強度を $C = 1/\lambda$ で指定する。

| $C$ の値 | 正則化 | 挙動 |
|---------|--------|------|
| $C \ll 1$ | 強い | 過少学習になりやすい |
| $C = 1$ | 中程度（デフォルト） | バランスが良い |
| $C \gg 1$ | 弱い | 過学習になりやすい |

---

## 多クラス分類戦略

| 戦略 | 内容 | 向いている場面 |
|------|------|--------------|
| One-vs-Rest (OvR) | $K$ 個の二値分類器を訓練 | クラス数が多い場合 |
| Multinomial (Softmax) | 全クラスを同時に最適化 | クラス間が相互排他的 |

$$
\text{Softmax}: P(y=k|\mathbf{x}) = \frac{e^{\mathbf{w}_k^\top \mathbf{x}}}{\sum_{j=1}^K e^{\mathbf{w}_j^\top \mathbf{x}}}
$$

---

## 係数の解釈

- 係数 $w_j > 0$：$x_j$ が増加すると $P(y=1)$ が増加
- 係数 $w_j < 0$：$x_j$ が増加すると $P(y=1)$ が減少
- オッズ比：$\exp(w_j)$ が1より大きければ正の影響、小さければ負の影響

$$
\log\left(\frac{P(y=1)}{P(y=0)}\right) = \mathbf{w}^\top \mathbf{x} \quad \text{（対数オッズ）}
$$

---

## 使用場面

| シーン | 理由 |
|--------|------|
| スパムメール分類 | 確率出力と解釈性が有用 |
| 疾患リスク予測（医療） | 係数のオッズ比解釈が重要 |
| 信用スコアリング | 規制上の説明責任への対応 |
| 多クラス文書分類の初期モデル | 速く学習でき、ベースラインとして機能 |
| クリック率予測の基礎モデル | 確率キャリブレーションが重要な場面 |

---

## 参考文献

- Hosmer, D. W., & Lemeshow, S. (2000). *Applied Logistic Regression* (2nd ed.). Wiley.
- Bishop, C. M. (2006). *Pattern Recognition and Machine Learning*. Springer. (Chapter 4)
- scikit-learn 公式ドキュメント: [LogisticRegression](https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.LogisticRegression.html)

<AffiliateBanner site="ml_intro" />
