import AffiliateBanner from '@site/src/components/AffiliateBanner';

# k-means法

## k-means法とは

k-means法とは、

> データを k 個のクラスタに分割するアルゴリズムであり、各クラスタの重心（セントロイド）との距離を最小化するように繰り返し割り当てを更新する教師なし学習の代表的手法

です。

1967年に MacQueen が提案した単純ながら強力なアルゴリズムで、現在でも大規模データのクラスタリングに広く使われています。

## アルゴリズムの手順

| ステップ | 内容 |
|----------|------|
| 1. 初期化 | k 個のセントロイドをランダムに選択（または k-means++ で賢く初期化） |
| 2. 割り当て | 各データ点を最も近いセントロイドのクラスタに割り当てる |
| 3. 更新 | 各クラスタのデータ点の平均値を新しいセントロイドとする |
| 4. 収束判定 | セントロイドが変化しなくなるまで 2〜3 を繰り返す |

## 基本実装

```python
import numpy as np
from sklearn.datasets import make_blobs
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

np.random.seed(42)

# サンプルデータ: 3クラスタ
X, y_true = make_blobs(n_samples=300, centers=3, cluster_std=0.8, random_state=42)

# k-means のフィッティング
kmeans = KMeans(n_clusters=3, init='k-means++', n_init=10, max_iter=300, random_state=42)
labels = kmeans.fit_predict(X)

print(f"クラスタ中心:\n{kmeans.cluster_centers_}")
print(f"\n各クラスタのサンプル数: {np.bincount(labels)}")
print(f"慣性（Inertia）: {kmeans.inertia_:.4f}")
print(f"シルエットスコア: {silhouette_score(X, labels):.4f}")
print(f"収束までのイテレーション数: {kmeans.n_iter_}")
```

## k-means++ による初期化

ランダム初期化は局所最適に陥るリスクがあります。k-means++ は最初のセントロイドから遠いデータ点を次のセントロイドとして選ぶことで初期値問題を軽減します。

```python
import numpy as np
from sklearn.datasets import make_blobs
from sklearn.cluster import KMeans

np.random.seed(42)
X, _ = make_blobs(n_samples=500, centers=5, cluster_std=1.0, random_state=42)

# ランダム初期化 vs k-means++
results = {}
for init_method in ['random', 'k-means++']:
    inertias = []
    for seed in range(20):
        km = KMeans(n_clusters=5, init=init_method, n_init=1,
                    max_iter=300, random_state=seed)
        km.fit(X)
        inertias.append(km.inertia_)
    results[init_method] = inertias
    print(f"{init_method:>10}: 平均慣性 = {np.mean(inertias):.2f} ± {np.std(inertias):.2f}")
    print(f"             最悪慣性 = {np.max(inertias):.2f}")

# k-means++ は慣性の分散が小さく安定していることを確認
```

## クラスタ数の選び方

### エルボー法

```python
import numpy as np
from sklearn.datasets import make_blobs
from sklearn.cluster import KMeans

np.random.seed(42)
X, _ = make_blobs(n_samples=300, centers=4, cluster_std=0.8, random_state=42)

# k=1〜10 の慣性をプロット
inertias = []
k_range = range(1, 11)
for k in k_range:
    km = KMeans(n_clusters=k, init='k-means++', n_init=10, random_state=42)
    km.fit(X)
    inertias.append(km.inertia_)

print("エルボー法（慣性の変化）:")
print(f"{'k':>4} {'慣性':>12} {'減少量':>10} {'減少率':>8}")
print('-' * 38)
for i, (k, inertia) in enumerate(zip(k_range, inertias)):
    if i == 0:
        print(f"{k:>4} {inertia:>12.2f} {'—':>10} {'—':>8}")
    else:
        diff = inertias[i-1] - inertia
        rate = diff / inertias[i-1] * 100
        marker = " ← エルボー点" if k == 4 else ""
        print(f"{k:>4} {inertia:>12.2f} {diff:>10.2f} {rate:>7.1f}%{marker}")
```

### シルエット係数

```python
import numpy as np
from sklearn.datasets import make_blobs
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score, silhouette_samples

np.random.seed(42)
X, _ = make_blobs(n_samples=300, centers=4, cluster_std=0.8, random_state=42)

print("シルエット係数によるクラスタ数評価:")
print(f"{'k':>4} {'シルエットスコア':>18}")
print('-' * 26)
for k in range(2, 9):
    km = KMeans(n_clusters=k, init='k-means++', n_init=10, random_state=42)
    labels = km.fit_predict(X)
    score = silhouette_score(X, labels)
    marker = " ← 最大" if k == 4 else ""
    print(f"{k:>4} {score:>18.4f}{marker}")

print("\nシルエット係数 s(i):")
print("  s(i) ≈ +1: 適切なクラスタに割り当てられている")
print("  s(i) ≈  0: クラスタ境界付近")
print("  s(i) ≈ -1: 誤ったクラスタに割り当てられている")
```

## 計算量の特性

```python
import numpy as np
import time
from sklearn.cluster import KMeans, MiniBatchKMeans

np.random.seed(42)

# データサイズと計算時間の比較
print("計算時間の比較（k=5）:")
print(f"{'データ数':>10} {'KMeans':>12} {'MiniBatchKMeans':>16}")
print('-' * 42)

for n in [1_000, 10_000, 100_000]:
    X = np.random.randn(n, 10)

    # KMeans: O(n * k * d * iter)
    start = time.time()
    KMeans(n_clusters=5, n_init=3, max_iter=100, random_state=42).fit(X)
    t_km = time.time() - start

    # MiniBatchKMeans: ミニバッチで高速化
    start = time.time()
    MiniBatchKMeans(n_clusters=5, n_init=3, max_iter=100, random_state=42).fit(X)
    t_mb = time.time() - start

    print(f"{n:>10,} {t_km:>11.3f}s {t_mb:>15.3f}s")

print("\n→ MiniBatchKMeans は大規模データで圧倒的に高速")
print("  計算量: KMeans O(n·k·d·T)  vs  MiniBatchKMeans O(b·k·d·T) (b: バッチサイズ)")
```

## 使用場面

- **顧客セグメンテーション**: 購買行動・属性に基づく顧客グループの発見
- **画像の色量子化**: 画像ピクセルを k 色にまとめて圧縮
- **文書クラスタリング**: TF-IDF ベクトルを k-means でトピックごとに分類
- **異常検知の前処理**: クラスタ重心から遠いデータ点を候補として抽出
- **強化学習**: 連続状態空間を k 個の代表状態に量子化

## 参考文献

<AffiliateBanner site="ml_intro" />

- MacQueen, J. (1967). Some methods for classification and analysis of multivariate observations. *Proceedings of the 5th Berkeley Symposium*.
- Arthur, D. & Vassilvitskii, S. (2007). k-means++: The advantages of careful seeding. *SODA*.
- [scikit-learn: KMeans](https://scikit-learn.org/stable/modules/clustering.html#k-means)
