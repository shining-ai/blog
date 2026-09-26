import AffiliateBanner from '@site/src/components/AffiliateBanner';

# k最近傍法（k-NN）

## k最近傍法とは

> k最近傍法（k-Nearest Neighbors, k-NN）とは、新しいデータ点について予測を行う際、訓練データの中から最も距離の近い $k$ 個の点を探し、その多数決（分類）または平均（回帰）を出力する、インスタンスベースの学習アルゴリズムである。明示的なモデルパラメータをもたず、訓練データ自体がモデルとなる「怠惰学習（lazy learning）」の代表例である。

---

## アルゴリズムの手順

1. 訓練データを全て保持する
2. 新しいデータ点 $\mathbf{x}$ が与えられたとき、各訓練データ点との距離を計算する
3. 距離が小さい順に $k$ 個の点を選択する
4. 分類：$k$ 個のラベルの多数決を予測クラスとする
5. 回帰：$k$ 個の目的変数の平均（または重み付き平均）を予測値とする

---

## 距離指標

| 距離 | 式 | 用途 |
|------|----|------|
| ユークリッド距離 | $\sqrt{\sum_j (x_j - x'_j)^2}$ | 最も一般的 |
| マンハッタン距離 | $\sum_j |x_j - x'_j|$ | 外れ値に頑健 |
| チェビシェフ距離 | $\max_j |x_j - x'_j|$ | 格子状の空間 |
| ミンコフスキー距離 | $\left(\sum_j |x_j - x'_j|^p\right)^{1/p}$ | 一般化形式 |
| コサイン類似度 | $1 - \frac{\mathbf{x} \cdot \mathbf{x}'}{\|\mathbf{x}\|\|\mathbf{x}'\|}$ | テキスト・高次元 |

---

## パラメータ k の選び方

| $k$ が小さい | $k$ が大きい |
|-------------|-------------|
| 決定境界が複雑（局所的） | 決定境界が滑らか（大域的） |
| 低バイアス・高分散 | 高バイアス・低分散 |
| $k=1$：訓練誤差ゼロ | $k=N$：常に多数派クラス |
| 過学習しやすい | 過少学習しやすい |

一般的には $k = \sqrt{n}$ （$n$：訓練データ数）が初期値として使われることが多い。交差検証によるチューニングが推奨。

---

## Python実装

### 基本的な分類と決定境界

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import make_classification, make_moons
from sklearn.neighbors import KNeighborsClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report

# 月形の非線形データ
X, y = make_moons(n_samples=400, noise=0.3, random_state=42)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.25, random_state=0
)

scaler = StandardScaler()
X_train_sc = scaler.fit_transform(X_train)
X_test_sc = scaler.transform(X_test)

# 異なるkで比較
k_values = [1, 3, 7, 15, 31]
fig, axes = plt.subplots(1, len(k_values), figsize=(20, 4), sharey=True)

for ax, k in zip(axes, k_values):
    model = KNeighborsClassifier(n_neighbors=k)
    model.fit(X_train_sc, y_train)

    h = 0.05
    x_min, x_max = X[:, 0].min() - 0.5, X[:, 0].max() + 0.5
    y_min, y_max = X[:, 1].min() - 0.5, X[:, 1].max() + 0.5
    xx, yy = np.meshgrid(np.arange(x_min, x_max, h),
                          np.arange(y_min, y_max, h))
    grid_sc = scaler.transform(np.c_[xx.ravel(), yy.ravel()])
    Z = model.predict(grid_sc).reshape(xx.shape)

    ax.contourf(xx, yy, Z, alpha=0.4, cmap="RdBu")
    ax.scatter(X_train[:, 0], X_train[:, 1], c=y_train,
               cmap="RdBu", edgecolors="gray", s=20)
    acc = model.score(X_test_sc, y_test)
    ax.set_title(f"k={k}\nAcc={acc:.3f}")

plt.suptitle("k-NN 決定境界の比較", y=1.01)
plt.tight_layout()
plt.savefig("knn_decision_boundaries.png", dpi=120)
plt.show()
```

### 最適なkの選択（クロスバリデーション）

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import load_breast_cancer
from sklearn.neighbors import KNeighborsClassifier
from sklearn.model_selection import cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

# 乳癌データセット
data = load_breast_cancer()
X, y = data.data, data.target

k_range = range(1, 51)
cv_scores_mean = []
cv_scores_std = []

for k in k_range:
    model = Pipeline([
        ("scaler", StandardScaler()),
        ("knn",    KNeighborsClassifier(n_neighbors=k)),
    ])
    scores = cross_val_score(model, X, y, cv=10, scoring="accuracy")
    cv_scores_mean.append(scores.mean())
    cv_scores_std.append(scores.std())

cv_scores_mean = np.array(cv_scores_mean)
cv_scores_std = np.array(cv_scores_std)
best_k = k_range[np.argmax(cv_scores_mean)]

plt.figure(figsize=(10, 5))
plt.plot(k_range, cv_scores_mean, "b-o", markersize=4)
plt.fill_between(k_range,
                 cv_scores_mean - cv_scores_std,
                 cv_scores_mean + cv_scores_std,
                 alpha=0.2)
plt.axvline(best_k, color="red", linestyle="--", label=f"最適k={best_k}")
plt.xlabel("k（近傍数）")
plt.ylabel("正解率 (10-fold CV)")
plt.title("k-NN: 近傍数と精度の関係")
plt.legend()
plt.tight_layout()
plt.savefig("knn_k_selection.png", dpi=120)
plt.show()
print(f"最適k: {best_k}, CV精度: {cv_scores_mean[best_k-1]:.4f}")
```

### k-NN回帰

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.neighbors import KNeighborsRegressor
from sklearn.preprocessing import StandardScaler

np.random.seed(42)
n = 100
X_raw = np.sort(np.random.uniform(0, 10, n))
y = np.sin(X_raw) + 0.5 * np.random.randn(n)
X = X_raw.reshape(-1, 1)

X_plot = np.linspace(0, 10, 500).reshape(-1, 1)

fig, axes = plt.subplots(2, 2, figsize=(12, 8))
k_values = [1, 3, 10, 30]

for ax, k in zip(axes.ravel(), k_values):
    model = KNeighborsRegressor(n_neighbors=k)
    model.fit(X, y)
    y_pred = model.predict(X_plot)

    ax.scatter(X_raw, y, s=20, color="steelblue", alpha=0.6, label="データ")
    ax.plot(X_plot, np.sin(X_plot), "g--", linewidth=1.5, label="真の関数")
    ax.plot(X_plot, y_pred, "r-", linewidth=2, label=f"k-NN (k={k})")
    ax.set_title(f"k = {k}")
    ax.legend(fontsize=8)

plt.suptitle("k-NN回帰: 近傍数による平滑化の違い")
plt.tight_layout()
plt.savefig("knn_regression.png", dpi=120)
plt.show()
```

### 計算量の比較とKD木・Ball木

```python
import numpy as np
import time
from sklearn.neighbors import KNeighborsClassifier

np.random.seed(0)
n_train = 10000
p = 20
X_train = np.random.randn(n_train, p)
y_train = (X_train[:, 0] > 0).astype(int)
X_test = np.random.randn(100, p)

results = []
for algorithm in ["ball_tree", "kd_tree", "brute"]:
    model = KNeighborsClassifier(
        n_neighbors=5, algorithm=algorithm
    )
    t0 = time.time()
    model.fit(X_train, y_train)
    t_fit = time.time() - t0

    t0 = time.time()
    model.predict(X_test)
    t_pred = time.time() - t0

    results.append((algorithm, t_fit * 1000, t_pred * 1000))
    print(f"{algorithm:12s}: fit={t_fit*1000:.2f}ms, predict={t_pred*1000:.2f}ms")
```

---

## 計算量

| フェーズ | Brute Force | KD木 | Ball木 |
|---------|------------|------|--------|
| 訓練 | $O(1)$ | $O(n \log n)$ | $O(n \log n)$ |
| 予測（1点） | $O(np)$ | $O(\log n)$ ～ $O(np)$ | $O(\log n)$ ～ $O(np)$ |
| メモリ | $O(np)$ | $O(np)$ | $O(np)$ |

- **$p < 20$**：KD木が効果的
- **$p \geq 20$**：次元の呪いにより Brute Force と変わらなくなる

---

## 次元の呪い

高次元空間では、全ての点が互いに等距離になる傾向があり（距離の集中）、近傍の概念が崩壊する。

- 10次元球の体積は同じ半径の正方形（超立方体）の約0.2%しかない
- **対策**：PCAや特徴選択で次元を削減してからk-NNを適用する

---

## 特徴量スケールの重要性

k-NNは距離に基づくため、**スケールが大きい特徴量が支配的**になる。

```python
# 悪い例：スケールが異なる特徴量をそのまま使う
# → 単位が大きい特徴量（例: 収入）が距離を支配する

# 良い例：StandardScalerで標準化
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.neighbors import KNeighborsClassifier

pipeline = Pipeline([
    ("scaler", StandardScaler()),
    ("knn", KNeighborsClassifier(n_neighbors=7)),
])
```

---

## 使用場面

| シーン | 理由 |
|--------|------|
| 少量データの分類・回帰 | シンプルで過学習しにくい |
| 異常検知 | 近傍との距離が大きい点を異常とみなせる |
| レコメンデーション（協調フィルタリング） | ユーザー間・アイテム間の類似度に基づく推薦 |
| 画像認識（初期モデル） | ピクセル空間での類似度が有効な場合 |
| 欠損値補完 | 近傍の平均で補完するKNN Imputer |

---

## 参考文献

- Cover, T. M., & Hart, P. E. (1967). Nearest neighbor pattern classification. *IEEE Transactions on Information Theory*, 13(1), 21–27.
- scikit-learn 公式ドキュメント: [KNeighborsClassifier](https://scikit-learn.org/stable/modules/generated/sklearn.neighbors.KNeighborsClassifier.html)
- Friedman, J., Bentley, J., & Finkel, R. (1977). An algorithm for finding best matches in logarithmic expected time. *ACM Transactions on Mathematical Software*, 3(3), 209–226.

<AffiliateBanner site="ml_intro" />
