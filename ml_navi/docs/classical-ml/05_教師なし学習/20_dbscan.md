import AffiliateBanner from '@site/src/components/AffiliateBanner';

# DBSCAN

## DBSCANとは

DBSCANとは、

> Density-Based Spatial Clustering of Applications with Noise の略で、密度が高い領域をクラスタとみなし、密度が低い領域をノイズとして扱う密度ベースのクラスタリングアルゴリズム

です。

Ester ら (1996) が提案したアルゴリズムで、k-means と異なりクラスタ数を事前に指定する必要がなく、任意の形状のクラスタを発見できます。

## コア点・境界点・ノイズ点

| 点の種類 | 条件 | 役割 |
|----------|------|------|
| コア点（Core point） | 半径 eps 内に minPts 個以上の点がある | クラスタの核となる点 |
| 境界点（Border point） | コア点の半径 eps 内にあるが自身は条件を満たさない | クラスタの縁にある点 |
| ノイズ点（Noise point） | いずれのコア点の eps 近傍にも属さない | 外れ値・異常値として扱う |

## 基本実装

```python
import numpy as np
from sklearn.datasets import make_moons, make_blobs
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score

np.random.seed(42)

# 非球状クラスタ（k-means が苦手な形状）
X, _ = make_moons(n_samples=300, noise=0.05, random_state=42)

# DBSCAN のフィッティング
dbscan = DBSCAN(eps=0.2, min_samples=5, metric='euclidean')
labels = dbscan.fit_predict(X)

n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
n_noise = np.sum(labels == -1)

print(f"検出されたクラスタ数: {n_clusters}")
print(f"ノイズ点の数: {n_noise} ({n_noise/len(X)*100:.1f}%)")
print(f"各クラスタのサンプル数: {np.bincount(labels[labels >= 0])}")
if n_clusters > 1:
    print(f"シルエットスコア: {silhouette_score(X, labels):.4f}")

# コア点・境界点・ノイズ点の分類
core_mask     = np.zeros(len(X), dtype=bool)
core_mask[dbscan.core_sample_indices_] = True
noise_mask    = labels == -1
border_mask   = ~core_mask & ~noise_mask

print(f"\nコア点: {core_mask.sum()}, 境界点: {border_mask.sum()}, ノイズ点: {noise_mask.sum()}")
```

## eps と minPts の選び方

```python
import numpy as np
from sklearn.datasets import make_moons
from sklearn.cluster import DBSCAN
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler

np.random.seed(42)
X, _ = make_moons(n_samples=300, noise=0.05, random_state=42)

# k-距離グラフによる eps の推定
# k = minPts - 1 番目の最近傍距離をソートしてプロット
k = 5  # = minPts
nbrs = NearestNeighbors(n_neighbors=k).fit(X)
distances, _ = nbrs.kneighbors(X)
k_distances = np.sort(distances[:, -1])[::-1]  # k番目の近傍距離を降順に並べる

# 「肘」の部分が適切な eps の目安
print("k-距離グラフ（eps 推定）:")
print("  インデックスが小さい = 密な点, 大きい = 疎な点")
print(f"  推奨 eps の目安: {k_distances[len(k_distances)//5]:.4f} 付近（上位20%の変化点）")

# eps の変化による影響
print("\neps と minPts の組み合わせ効果:")
print(f"{'eps':>6} {'minPts':>8} {'クラスタ数':>12} {'ノイズ率%':>10}")
print('-' * 40)
for eps in [0.1, 0.2, 0.3, 0.5]:
    for min_s in [3, 5, 10]:
        db = DBSCAN(eps=eps, min_samples=min_s)
        lbl = db.fit_predict(X)
        n_cl = len(set(lbl)) - (1 if -1 in lbl else 0)
        noise_r = (lbl == -1).sum() / len(X) * 100
        print(f"{eps:>6.1f} {min_s:>8} {n_cl:>12} {noise_r:>10.1f}")
```

## 任意形状クラスタの検出

```python
import numpy as np
from sklearn.datasets import make_moons, make_circles, make_blobs
from sklearn.cluster import DBSCAN, KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score

np.random.seed(42)

datasets = {
    'Moon形状':   make_moons(n_samples=200, noise=0.05, random_state=42),
    'Ring形状':   make_circles(n_samples=200, noise=0.05, factor=0.5, random_state=42),
    '球状クラスタ': make_blobs(n_samples=200, centers=3, cluster_std=0.5, random_state=42),
}

print("DBSCAN vs k-means（シルエットスコア）:")
print(f"{'データ形状':<14} {'DBSCAN':>10} {'k-means':>10}")
print('-' * 38)

for name, (X_raw, y) in datasets.items():
    X = StandardScaler().fit_transform(X_raw)
    n_true = len(np.unique(y))

    # DBSCAN
    db = DBSCAN(eps=0.3, min_samples=5)
    db_labels = db.fit_predict(X)
    db_n = len(set(db_labels)) - (1 if -1 in db_labels else 0)
    if db_n > 1 and (db_labels != -1).sum() > 1:
        db_score = silhouette_score(X[db_labels != -1], db_labels[db_labels != -1])
    else:
        db_score = float('nan')

    # k-means
    km = KMeans(n_clusters=n_true, n_init=10, random_state=42)
    km_labels = km.fit_predict(X)
    km_score = silhouette_score(X, km_labels)

    print(f"{name:<14} {db_score:>10.4f} {km_score:>10.4f}")
```

## 異常値への強さ

```python
import numpy as np
from sklearn.cluster import DBSCAN, KMeans
from sklearn.preprocessing import StandardScaler

np.random.seed(42)

# 正常データ + 外れ値を含むデータ
n_normal = 200
X_normal = np.random.randn(n_normal, 2)

# 明らかな外れ値を追加
outliers = np.array([[10, 10], [-10, 10], [10, -10], [-10, -10],
                      [5, 8], [-8, 5]])
X = np.vstack([X_normal, outliers])
X_scaled = StandardScaler().fit_transform(X)

# DBSCAN: 外れ値を -1 として識別
dbscan = DBSCAN(eps=0.5, min_samples=5)
db_labels = dbscan.fit_predict(X_scaled)
db_outliers = np.where(db_labels == -1)[0]

print(f"DBSCAN が検出した外れ値インデックス: {db_outliers[db_outliers >= n_normal]}")
print(f"  追加した外れ値 {len(outliers)} 点のうち {(db_outliers >= n_normal).sum()} 点を検出")
print(f"  誤検出（正常データを外れ値と判定）: {(db_outliers < n_normal).sum()} 点")

# k-means: 外れ値の影響を受けてセントロイドがずれる
km = KMeans(n_clusters=1, n_init=10, random_state=42)
km.fit(X_scaled)
centroid_with_outliers = km.cluster_centers_[0]

km2 = KMeans(n_clusters=1, n_init=10, random_state=42)
km2.fit(X_scaled[:n_normal])
centroid_without_outliers = km2.cluster_centers_[0]

print(f"\nk-means セントロイドのずれ（外れ値の影響）:")
print(f"  外れ値あり:  {centroid_with_outliers}")
print(f"  外れ値なし:  {centroid_without_outliers}")
print(f"  ずれ量: {np.linalg.norm(centroid_with_outliers - centroid_without_outliers):.4f}")
```

## 高次元データへの対応

```python
import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA

np.random.seed(42)

# 高次元では「次元の呪い」により euclidean 距離が機能しにくい
# → PCA で次元削減してから DBSCAN を適用

n_samples = 300
X_high_dim = np.random.randn(n_samples, 50)
# 最初の2次元にクラスタ構造を埋め込む
X_high_dim[:100, :2] += [3, 3]
X_high_dim[100:200, :2] += [-3, 3]
# 残りはノイズ

# 直接 DBSCAN（高次元）
db_raw = DBSCAN(eps=8.0, min_samples=5)
labels_raw = db_raw.fit_predict(StandardScaler().fit_transform(X_high_dim))
n_cl_raw = len(set(labels_raw)) - (1 if -1 in labels_raw else 0)

# PCA 後に DBSCAN
X_pca = PCA(n_components=10).fit_transform(StandardScaler().fit_transform(X_high_dim))
db_pca = DBSCAN(eps=2.0, min_samples=5)
labels_pca = db_pca.fit_predict(X_pca)
n_cl_pca = len(set(labels_pca)) - (1 if -1 in labels_pca else 0)

print(f"高次元データ (50次元) での DBSCAN:")
print(f"  直接適用:    クラスタ数={n_cl_raw}, ノイズ率={((labels_raw==-1).sum()/n_samples*100):.1f}%")
print(f"  PCA(10次元): クラスタ数={n_cl_pca}, ノイズ率={((labels_pca==-1).sum()/n_samples*100):.1f}%")
print("→ 高次元ではPCA等で次元削減してから適用することを推奨")
```

## 使用場面

- **地理データのクラスタリング**: GPS 座標から商圏・交通渋滞スポットを自動発見
- **異常検知**: ノイズ点（-1 ラベル）を外れ値として活用
- **画像のセグメンテーション**: ピクセルの色・位置情報を特徴量としたクラスタリング
- **ネットワーク分析**: コミュニティ検出でノイズノードを明示的に扱う
- **生物情報学**: タンパク質のクラスタリング（球状以外の構造を扱うため）

## 参考文献

<AffiliateBanner site="ml_intro" />

- Ester, M., Kriegel, H.-P., Sander, J. & Xu, X. (1996). A density-based algorithm for discovering clusters in large spatial databases with noise. *KDD*, 226–231.
- [scikit-learn: DBSCAN](https://scikit-learn.org/stable/modules/clustering.html#dbscan)
- Schubert, E., et al. (2017). DBSCAN revisited, revisited: Why and how you should (still) use DBSCAN. *ACM TODS*, 42(3).
