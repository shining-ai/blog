import AffiliateBanner from '@site/src/components/AffiliateBanner';

# サポートベクターマシン（SVM）

## サポートベクターマシンとは

> サポートベクターマシン（Support Vector Machine, SVM）とは、クラス間の**マージン（余白）を最大化**する決定超平面を求めることで分類を行うアルゴリズムである。マージンを決定づけるデータ点（サポートベクター）のみに依存するため、汎化性能が高く、特に高次元データや少数サンプルで有効である。カーネルトリックにより非線形な決定境界も扱える。

---

## マージン最大化

線形分類器 $\mathbf{w}^\top \mathbf{x} + b = 0$ に対して、各クラスの最近傍点（サポートベクター）との距離（マージン）を最大化する。

$$
\text{マージン} = \frac{2}{\|\mathbf{w}\|}
$$

最適化問題：

$$
\min_{\mathbf{w}, b} \frac{1}{2}\|\mathbf{w}\|^2 \quad \text{s.t.} \quad y_i(\mathbf{w}^\top \mathbf{x}_i + b) \geq 1 \quad \forall i
$$

---

## ソフトマージンSVM（スラック変数）

完全に線形分離できないデータに対してスラック変数 $\xi_i \geq 0$ を導入する。

$$
\min_{\mathbf{w}, b, \xi} \frac{1}{2}\|\mathbf{w}\|^2 + C \sum_{i=1}^n \xi_i
$$

| $C$ の値 | 挙動 |
|---------|------|
| $C$ が大きい | マージン小・分類誤りを許容しない → 過学習リスク |
| $C$ が小さい | マージン大・分類誤りを許容する → 過少学習リスク |

---

## カーネルトリック

元の特徴空間で非線形なデータを高次元（無限次元）の特徴空間に写像し、その空間で線形分離する。

$$
K(\mathbf{x}, \mathbf{x}') = \phi(\mathbf{x})^\top \phi(\mathbf{x}')
$$

実際には $\phi(\mathbf{x})$ を明示的に計算せず、カーネル関数 $K$ のみを使う（カーネルトリック）。

| カーネル | 式 | 特徴 |
|---------|-----|------|
| 線形 | $\mathbf{x}^\top \mathbf{x}'$ | 高次元テキストに有効 |
| 多項式 | $(\gamma \mathbf{x}^\top \mathbf{x}' + r)^d$ | 非線形関係、次数 $d$ で制御 |
| RBF（ガウシアン） | $\exp(-\gamma \|\mathbf{x}-\mathbf{x}'\|^2)$ | 最も汎用的、局所的 |
| シグモイド | $\tanh(\gamma \mathbf{x}^\top \mathbf{x}' + r)$ | ニューラルネット的 |

---

## Python実装

### 基本的な分類（線形・非線形）

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import make_classification, make_moons, make_circles
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

def plot_svm_boundary(model, X, y, ax, title):
    h = 0.02
    x_min, x_max = X[:, 0].min() - 0.5, X[:, 0].max() + 0.5
    y_min, y_max = X[:, 1].min() - 0.5, X[:, 1].max() + 0.5
    xx, yy = np.meshgrid(np.arange(x_min, x_max, h),
                          np.arange(y_min, y_max, h))
    Z = model.predict(np.c_[xx.ravel(), yy.ravel()]).reshape(xx.shape)
    ax.contourf(xx, yy, Z, alpha=0.3, cmap="RdBu")
    ax.scatter(X[:, 0], X[:, 1], c=y, cmap="RdBu",
               edgecolors="k", s=30, zorder=3)
    # サポートベクターを強調
    sv = model.support_vectors_
    ax.scatter(sv[:, 0], sv[:, 1], s=120, facecolors="none",
               edgecolors="k", linewidths=2, zorder=4, label="SV")
    ax.set_title(title)
    ax.legend(fontsize=8)

datasets = [
    (make_classification(n_samples=200, n_features=2, n_redundant=0,
                          n_informative=2, random_state=1,
                          n_clusters_per_class=1), "Linear SVM", SVC(kernel="linear", C=1.0)),
    (make_moons(n_samples=200, noise=0.2, random_state=0),
     "RBF SVM (moons)",   SVC(kernel="rbf", C=1.0, gamma="scale")),
    (make_circles(n_samples=200, noise=0.1, random_state=2),
     "RBF SVM (circles)", SVC(kernel="rbf", C=1.0, gamma="scale")),
]

fig, axes = plt.subplots(1, 3, figsize=(16, 5))
scaler = StandardScaler()

for ax, ((X, y), title, model) in zip(axes, datasets):
    X_sc = scaler.fit_transform(X)
    model.fit(X_sc, y)
    plot_svm_boundary(model, X_sc, y, ax, title)
    acc = model.score(X_sc, y)
    ax.set_xlabel(f"Acc={acc:.3f}")

plt.suptitle("SVM: 線形・非線形カーネルの比較")
plt.tight_layout()
plt.savefig("svm_kernels.png", dpi=120)
plt.show()
```

### Cとγのグリッドサーチによるチューニング

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import load_breast_cancer
from sklearn.svm import SVC
from sklearn.model_selection import GridSearchCV, train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
import seaborn as sns

data = load_breast_cancer()
X, y = data.data, data.target

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

pipeline = Pipeline([
    ("scaler", StandardScaler()),
    ("svm",    SVC(kernel="rbf", probability=True, random_state=0)),
])

param_grid = {
    "svm__C":     [0.01, 0.1, 1, 10, 100],
    "svm__gamma": [0.001, 0.01, 0.1, 1, "scale"],
}

grid_search = GridSearchCV(
    pipeline, param_grid, cv=5, scoring="accuracy", n_jobs=-1
)
grid_search.fit(X_train, y_train)

print(f"最適パラメータ: {grid_search.best_params_}")
print(f"CV精度: {grid_search.best_score_:.4f}")
print(f"テスト精度: {grid_search.score(X_test, y_test):.4f}")

# ヒートマップ
results = grid_search.cv_results_
scores = results["mean_test_score"].reshape(5, 5)
C_labels = [0.01, 0.1, 1, 10, 100]
gamma_labels = [0.001, 0.01, 0.1, 1, "scale"]

plt.figure(figsize=(8, 5))
sns.heatmap(scores, annot=True, fmt=".3f", cmap="YlOrRd",
            xticklabels=gamma_labels, yticklabels=C_labels)
plt.xlabel("gamma")
plt.ylabel("C")
plt.title("SVM (RBF) グリッドサーチ結果")
plt.tight_layout()
plt.savefig("svm_gridsearch.png", dpi=120)
plt.show()
```

### SVR（サポートベクター回帰）

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.svm import SVR
from sklearn.preprocessing import StandardScaler

np.random.seed(0)
X_raw = np.sort(np.random.uniform(0, 10, 100))
y = np.sin(X_raw) + np.random.randn(100) * 0.3
X = X_raw.reshape(-1, 1)

scaler_X = StandardScaler()
scaler_y = StandardScaler()
X_sc = scaler_X.fit_transform(X)
y_sc = scaler_y.fit_transform(y.reshape(-1, 1)).ravel()

X_plot = np.linspace(0, 10, 300).reshape(-1, 1)
X_plot_sc = scaler_X.transform(X_plot)

epsilons = [0.01, 0.1, 0.5]
fig, axes = plt.subplots(1, 3, figsize=(15, 4), sharey=True)

for ax, eps in zip(axes, epsilons):
    svr = SVR(kernel="rbf", C=1.0, epsilon=eps, gamma="scale")
    svr.fit(X_sc, y_sc)
    y_pred_sc = svr.predict(X_plot_sc)
    y_pred = scaler_y.inverse_transform(y_pred_sc.reshape(-1, 1)).ravel()

    ax.scatter(X_raw, y, s=15, alpha=0.6, color="steelblue")
    ax.plot(X_plot, np.sin(X_plot), "g--", label="真の関数")
    ax.plot(X_plot, y_pred, "r-", linewidth=2, label=f"SVR ε={eps}")
    ax.set_title(f"SVR (epsilon={eps})")
    ax.legend(fontsize=8)

plt.suptitle("SVR: ε-insensitive tube の影響")
plt.tight_layout()
plt.savefig("svr_epsilon.png", dpi=120)
plt.show()
```

---

## 線形SVMの特徴量重要度

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import load_breast_cancer
from sklearn.svm import LinearSVC
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

data = load_breast_cancer()
X, y = data.data, data.target

pipeline = Pipeline([
    ("scaler", StandardScaler()),
    ("svm",    LinearSVC(C=1.0, max_iter=5000, random_state=0)),
])
pipeline.fit(X, y)

coefs = pipeline.named_steps["svm"].coef_[0]
indices = np.argsort(np.abs(coefs))[::-1]
top_n = 15

plt.figure(figsize=(10, 4))
colors = ["red" if c < 0 else "steelblue" for c in coefs[indices[:top_n]]]
plt.bar(range(top_n), coefs[indices[:top_n]], color=colors)
plt.xticks(range(top_n),
           [data.feature_names[i] for i in indices[:top_n]],
           rotation=45, ha="right")
plt.xlabel("特徴量")
plt.ylabel("係数（正: クラス1方向, 負: クラス0方向）")
plt.title("Linear SVM 係数（特徴量重要度）")
plt.tight_layout()
plt.savefig("svm_coefficients.png", dpi=120)
plt.show()
```

---

## SVM vs ロジスティック回帰

| 観点 | SVM | ロジスティック回帰 |
|------|-----|-----------------|
| 損失関数 | ヒンジ損失 | 対数損失 |
| 出力 | クラスラベル（確率は近似） | 確率 |
| マージン | 最大化 | なし |
| カーネル | 容易に利用可能 | 非線形拡張が必要 |
| 外れ値への感度 | 低い（サポートベクターのみ） | 高め |
| 大規模データ | 遅い | 速い |

---

## 計算量の目安

| データ規模 | 推奨アルゴリズム |
|-----------|----------------|
| $n < 10,000$ | `SVC`（SMO最適化） |
| $n \geq 10,000$ | `LinearSVC`または`SGDClassifier` |
| テキスト分類 | `LinearSVC`が高速 |

---

## 使用場面

| シーン | 理由 |
|--------|------|
| 高次元テキスト分類 | Linear SVMがスパース高次元に強い |
| 少量データの分類 | マージン最大化による高い汎化性能 |
| 画像認識（少量サンプル） | カーネルで非線形境界を捉える |
| 生物情報学（遺伝子発現） | 高次元・少サンプル問題に適す |

---

## 参考文献

- Cortes, C., & Vapnik, V. (1995). Support-vector networks. *Machine Learning*, 20(3), 273–297.
- Schölkopf, B., & Smola, A. J. (2002). *Learning with Kernels*. MIT Press.
- scikit-learn 公式ドキュメント: [SVM](https://scikit-learn.org/stable/modules/svm.html)

<AffiliateBanner site="ml_intro" />
