import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 階層的クラスタリング

## 階層的クラスタリングとは

階層的クラスタリングとは、

> データ点を段階的に統合（または分割）することでクラスタの階層構造を構築し、デンドログラムとして可視化できるクラスタリング手法

です。

k-means と異なりクラスタ数を事前に決める必要がなく、デンドログラムを見ながら事後的に切断位置を選べる柔軟性があります。

## 凝集型と分割型の比較

| 種類 | 方向 | 計算量 | 特徴 |
|------|------|--------|------|
| 凝集型（Agglomerative） | 下から上（各点 → 1クラスタ） | $O(n^2 \log n)$ | 実用的で広く使われる |
| 分割型（Divisive） | 上から下（1クラスタ → 各点） | $O(2^n)$ | 計算コストが高い |

## リンケージ法の比較

| リンケージ | 距離の定義 | 特徴 |
|------------|------------|------|
| Ward | クラスタ内分散の増加量 | コンパクトなクラスタ・外れ値に敏感 |
| Complete | クラスタ間の最大距離 | コンパクト・外れ値に敏感 |
| Average（UPGMA） | クラスタ間の平均距離 | Wardと単連結の中間的性質 |
| Single | クラスタ間の最小距離 | 細長いクラスタ・チェーン効果に注意 |

## 基本実装

```python
import numpy as np
from sklearn.datasets import make_blobs
from sklearn.cluster import AgglomerativeClustering
from sklearn.metrics import silhouette_score
from scipy.cluster.hierarchy import dendrogram, linkage
from scipy.spatial.distance import pdist

np.random.seed(42)
X, y_true = make_blobs(n_samples=150, centers=3, cluster_std=0.8, random_state=42)

# 凝集型クラスタリング（Ward リンケージ）
agg = AgglomerativeClustering(n_clusters=3, linkage='ward')
labels = agg.fit_predict(X)

print(f"クラスタリング結果（Ward リンケージ）:")
print(f"  クラスタ数: {agg.n_clusters_}")
print(f"  各クラスタのサンプル数: {np.bincount(labels)}")
print(f"  シルエットスコア: {silhouette_score(X, labels):.4f}")
```

## リンケージ法の比較

```python
import numpy as np
from sklearn.datasets import make_blobs, make_moons
from sklearn.cluster import AgglomerativeClustering
from sklearn.metrics import silhouette_score

np.random.seed(42)

# 球状クラスタ
X_blobs, _ = make_blobs(n_samples=200, centers=3, cluster_std=0.8, random_state=42)
# 非球状クラスタ
X_moons, _ = make_moons(n_samples=200, noise=0.05, random_state=42)

linkages = ['ward', 'complete', 'average', 'single']

print("=== 球状クラスタ（3クラスタ）===")
print(f"{'リンケージ':<12} {'シルエットスコア':>18}")
print('-' * 32)
for link in linkages:
    if link == 'ward':
        agg = AgglomerativeClustering(n_clusters=3, linkage=link)
    else:
        agg = AgglomerativeClustering(n_clusters=3, linkage=link)
    labels = agg.fit_predict(X_blobs)
    score = silhouette_score(X_blobs, labels)
    print(f"{link:<12} {score:>18.4f}")

print("\n=== 非球状クラスタ（moon形状、2クラスタ）===")
print(f"{'リンケージ':<12} {'シルエットスコア':>18}")
print('-' * 32)
for link in linkages:
    agg = AgglomerativeClustering(n_clusters=2, linkage=link)
    labels = agg.fit_predict(X_moons)
    score = silhouette_score(X_moons, labels)
    print(f"{link:<12} {score:>18.4f}")

print("\n→ single リンケージは非球状クラスタに強いが、チェーン効果に注意")
```

## デンドログラムの構築と読み方

```python
import numpy as np
from sklearn.datasets import make_blobs
from scipy.cluster.hierarchy import dendrogram, linkage, fcluster

np.random.seed(42)
# 少数サンプルで視覚化しやすくする
X, _ = make_blobs(n_samples=20, centers=3, cluster_std=0.5, random_state=42)

# scipy による階層的クラスタリング
Z = linkage(X, method='ward')  # Z は (n-1, 4) の結合行列

print("結合行列 Z の構造（最初の5行）:")
print("  [クラスタ1, クラスタ2, 距離, サンプル数]")
for row in Z[:5]:
    print(f"  [{row[0]:.0f}, {row[1]:.0f}, {row[2]:.4f}, {row[3]:.0f}]")

# 閾値で切断してクラスタを得る
distance_threshold = Z[-2, 2]  # 上から2番目の統合距離
labels = fcluster(Z, t=3, criterion='maxclust')  # クラスタ数=3で切断
print(f"\n距離閾値 {distance_threshold:.4f} でのクラスタ割り当て:")
print(f"  ラベル: {labels}")
print(f"  クラスタ数: {len(np.unique(labels))}")

# デンドログラムの情報をテキストで表現
print("\nデンドログラムの読み方:")
print("  ├── y軸（高さ）= クラスタを統合したときの距離")
print("  ├── 高い位置での統合 → 2クラスタが離れている")
print("  ├── 低い位置での統合 → 2クラスタが近い")
print("  └── 水平線で切断 → その高さに応じたクラスタ数が得られる")
```

## 距離指定によるクラスタリング

```python
import numpy as np
from sklearn.datasets import make_blobs
from sklearn.cluster import AgglomerativeClustering
from sklearn.metrics import silhouette_score

np.random.seed(42)
X, _ = make_blobs(n_samples=200, centers=3, cluster_std=0.8, random_state=42)

# クラスタ数を指定しない場合: 距離閾値で制御
print("距離閾値によるクラスタ数の制御 (Ward リンケージ):")
print(f"{'閾値':>8} {'クラスタ数':>12} {'シルエットスコア':>18}")
print('-' * 42)

for threshold in [1.0, 2.0, 3.0, 5.0, 8.0, 15.0]:
    agg = AgglomerativeClustering(
        n_clusters=None,
        distance_threshold=threshold,
        linkage='ward'
    )
    labels = agg.fit_predict(X)
    n_clusters = len(np.unique(labels))
    if n_clusters > 1:
        score = silhouette_score(X, labels)
        print(f"{threshold:>8.1f} {n_clusters:>12} {score:>18.4f}")
    else:
        print(f"{threshold:>8.1f} {n_clusters:>12} {'—（1クラスタ）':>18}")
```

## 大規模データへの対応

```python
import numpy as np
from sklearn.cluster import AgglomerativeClustering
from sklearn.neighbors import kneighbors_graph
import time

np.random.seed(42)

# 大規模データでの connectivity 行列を使った高速化
n_samples = 5000
X = np.random.randn(n_samples, 10)

# connectivity なし（遅い: O(n^2)）
start = time.time()
agg_naive = AgglomerativeClustering(n_clusters=5, linkage='ward')
agg_naive.fit(X)
t_naive = time.time() - start
print(f"connectivity なし: {t_naive:.3f}s")

# k近傍グラフを connectivity として使用（高速化）
start = time.time()
connectivity = kneighbors_graph(X, n_neighbors=10, include_self=False, n_jobs=-1)
agg_conn = AgglomerativeClustering(n_clusters=5, linkage='ward', connectivity=connectivity)
agg_conn.fit(X)
t_conn = time.time() - start
print(f"k近傍 connectivity: {t_conn:.3f}s  (高速化: {t_naive/t_conn:.1f}x)")
```

## 使用場面

- **遺伝子発現データの解析**: 類似した発現パターンを持つ遺伝子のグループを階層的に発見
- **文書クラスタリング**: トピックの粒度を事後的に決定できる柔軟性を活用
- **顧客行動分析**: クラスタ間の階層関係（大分類→中分類→小分類）の把握
- **画像のセグメンテーション**: ピクセルの空間的近傍を考慮した connectivity による高速化
- **市場の構造分析**: 金融商品の類似度行列から階層的なグループを可視化

## 参考文献

<AffiliateBanner site="ml_intro" />

- Ward, J.H. (1963). Hierarchical grouping to optimize an objective function. *Journal of the American Statistical Association*, 58, 236–244.
- [scipy.cluster.hierarchy](https://docs.scipy.org/doc/scipy/reference/cluster.hierarchy.html)
- [scikit-learn: Agglomerative Clustering](https://scikit-learn.org/stable/modules/clustering.html#hierarchical-clustering)
