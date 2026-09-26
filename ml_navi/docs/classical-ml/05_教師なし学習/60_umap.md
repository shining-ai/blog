import AffiliateBanner from '@site/src/components/AffiliateBanner';

# UMAP

## UMAPとは

UMAPとは、

> Uniform Manifold Approximation and Projection の略で、位相的データ解析（TDA）に基づく数学的理論から導出された非線形次元削減手法であり、t-SNE と比較して大域的な構造も保ちながら高速に次元削減を行う

です。

McInnes ら (2018) が提案した手法で、t-SNE の主要な欠点（計算速度・大域的構造の喪失・新データへの適用不可）を改善しています。

## t-SNE との比較

| 特性 | t-SNE | UMAP |
|------|-------|------|
| 数学的基盤 | 確率論的（KL ダイバージェンス） | 位相的データ解析（リーマン幾何学） |
| 局所構造の保存 | 優れている | 優れている |
| 大域構造の保存 | 弱い | 比較的良い |
| 計算速度 | $O(n \log n)$（Barnes-Hut） | $O(n^{1.14})$（実測） |
| 新データへの適用 | 不可 | 可（transform()） |
| パラメータ | perplexity | n_neighbors, min_dist |
| メモリ効率 | 低い | 高い |

## 基本実装

```python
import numpy as np
from sklearn.datasets import load_digits
from sklearn.preprocessing import StandardScaler

# 手書き数字データ（64次元）
digits = load_digits()
X = digits.data
y = digits.target
X_scaled = StandardScaler().fit_transform(X)

try:
    import umap

    # UMAP で 2 次元に圧縮
    reducer = umap.UMAP(
        n_components=2,
        n_neighbors=15,   # 局所/大域のバランス（小さい→局所重視）
        min_dist=0.1,     # 埋め込みの密集度（0に近い→点が密集）
        metric='euclidean',
        random_state=42
    )
    X_umap = reducer.fit_transform(X_scaled)

    print(f"圧縮前: {X_scaled.shape} → 圧縮後: {X_umap.shape}")
    print(f"\n各クラスの重心:")
    for label in range(10):
        mask = y == label
        center = X_umap[mask].mean(axis=0)
        print(f"  数字 {label}: ({center[0]:>7.3f}, {center[1]:>7.3f}), n={mask.sum()}")

    # 新データへの射影（transform は再学習なし）
    X_new = X_scaled[:10]
    X_new_transformed = reducer.transform(X_new)
    print(f"\n新データの変換: {X_new.shape} → {X_new_transformed.shape}")
    print("（t-SNE と異なり、transform() で新データに適用可能）")

except ImportError:
    print("umap-learn が未インストールです。pip install umap-learn でインストールしてください。")
```

## n_neighbors パラメータの影響

```python
import numpy as np
from sklearn.datasets import make_blobs
from sklearn.preprocessing import StandardScaler

np.random.seed(42)
X, y = make_blobs(n_samples=500, centers=5, cluster_std=0.5, random_state=42)
X_scaled = StandardScaler().fit_transform(X)

try:
    import umap
    import time

    print("n_neighbors の影響:")
    print(f"{'n_neighbors':>12} {'計算時間s':>12} {'意味'}")
    print('-' * 60)

    descriptions = {
        2:   '極端に局所的（過学習的な分割）',
        5:   '局所的な構造を重視',
        15:  '標準的な設定（局所/大域のバランス）',
        30:  '中規模の構造を考慮',
        100: '大域的な構造を重視（クラスタが潰れやすい）',
    }

    for n_nb in [2, 5, 15, 30, 100]:
        start = time.time()
        reducer = umap.UMAP(n_components=2, n_neighbors=n_nb,
                             random_state=42, verbose=False)
        reducer.fit_transform(X_scaled)
        elapsed = time.time() - start
        desc = descriptions.get(n_nb, '')
        print(f"{n_nb:>12} {elapsed:>12.3f}  {desc}")

    print("\n推奨: n_neighbors = 15（デフォルト）. データサイズで調整: sqrt(n) 程度")

except ImportError:
    print("umap-learn が未インストールのためスキップ")
```

## min_dist パラメータの影響

```python
import numpy as np
from sklearn.datasets import make_blobs
from sklearn.preprocessing import StandardScaler

np.random.seed(42)
X, y = make_blobs(n_samples=300, centers=3, cluster_std=0.5, random_state=42)
X_scaled = StandardScaler().fit_transform(X)

try:
    import umap

    print("min_dist の影響（クラスタの密集度）:")
    print(f"{'min_dist':>10} {'クラスタ内分散':>16} {'意味'}")
    print('-' * 60)

    for md in [0.0, 0.1, 0.3, 0.5, 0.9]:
        reducer = umap.UMAP(n_components=2, min_dist=md,
                             n_neighbors=15, random_state=42)
        X_emb = reducer.fit_transform(X_scaled)
        # クラスタ内の分散を計算
        intra_var = np.mean([X_emb[y == c].var() for c in np.unique(y)])
        desc = '点が密集' if md < 0.2 else ('中程度' if md < 0.6 else '点が分散')
        print(f"{md:>10.1f} {intra_var:>16.4f}  {desc}")

    print("\nmin_dist = 0.0: クラスタ内の点が密集して見やすい")
    print("min_dist = 0.9: 点が均等に広がり大域構造が見やすい")

except ImportError:
    print("umap-learn が未インストールのためスキップ")
```

## 大域的構造の保存能力

```python
import numpy as np
from sklearn.datasets import load_digits
from sklearn.manifold import TSNE
from sklearn.preprocessing import StandardScaler
import time

digits = load_digits()
X_scaled = StandardScaler().fit_transform(digits.data)
y = digits.target

# クラスタ間の相対的な位置関係を評価する指標
def cluster_structure_score(X_emb, y):
    """
    クラスタ重心間の平均距離の保存率を測定（大域的構造の評価）
    元の空間のクラスタ間距離ランキングと埋め込み後のランキングのSpearman相関
    """
    from scipy.stats import spearmanr

    unique_labels = np.unique(y)
    k = len(unique_labels)

    # 標準化された高次元空間でのクラスタ重心
    centers_orig = np.array([X_scaled[y == l].mean(axis=0) for l in unique_labels])
    centers_emb  = np.array([X_emb[y == l].mean(axis=0)   for l in unique_labels])

    # 全クラスタ対間の距離
    from scipy.spatial.distance import cdist
    dist_orig = cdist(centers_orig, centers_orig, 'euclidean').flatten()
    dist_emb  = cdist(centers_emb,  centers_emb,  'euclidean').flatten()

    corr, _ = spearmanr(dist_orig, dist_emb)
    return corr

# t-SNE
start = time.time()
tsne = TSNE(n_components=2, perplexity=30, n_iter=1000,
            random_state=42, learning_rate='auto')
X_tsne = tsne.fit_transform(X_scaled)
t_tsne = time.time() - start
corr_tsne = cluster_structure_score(X_tsne, y)
print(f"t-SNE:  時間={t_tsne:.2f}s, クラスタ構造相関={corr_tsne:.4f}")

# UMAP
try:
    import umap
    start = time.time()
    reducer = umap.UMAP(n_components=2, n_neighbors=15, random_state=42)
    X_umap = reducer.fit_transform(X_scaled)
    t_umap = time.time() - start
    corr_umap = cluster_structure_score(X_umap, y)
    print(f"UMAP:   時間={t_umap:.2f}s, クラスタ構造相関={corr_umap:.4f}")
    print(f"\n速度比: t-SNE / UMAP = {t_tsne/t_umap:.1f}x")
    print(f"大域構造相関: UMAP が{'高い' if corr_umap > corr_tsne else '低い'}")
except ImportError:
    print("umap-learn が未インストールのためスキップ")
```

## 機械学習パイプラインへの統合

```python
import numpy as np
from sklearn.datasets import load_digits
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score

digits = load_digits()
X_train, X_test, y_train, y_test = train_test_split(
    digits.data, digits.target, test_size=0.2, random_state=42
)

try:
    import umap

    # UMAP は sklearn のパイプラインに組み込める
    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('umap',   umap.UMAP(n_components=10, n_neighbors=15,
                              random_state=42, verbose=False)),
        ('clf',    LogisticRegression(max_iter=1000, random_state=42)),
    ])
    pipeline.fit(X_train, y_train)
    acc = accuracy_score(y_test, pipeline.predict(X_test))
    print(f"UMAP(10次元) + LogisticRegression: 精度 = {acc:.4f}")

    # 次元圧縮なしとの比較
    pipeline_no_umap = Pipeline([
        ('scaler', StandardScaler()),
        ('clf',    LogisticRegression(max_iter=1000, random_state=42)),
    ])
    pipeline_no_umap.fit(X_train, y_train)
    acc_no_umap = accuracy_score(y_test, pipeline_no_umap.predict(X_test))
    print(f"次元圧縮なし (64次元): 精度 = {acc_no_umap:.4f}")

except ImportError:
    print("umap-learn が未インストールのためスキップ")
```

## 使用場面

- **高次元データの可視化**: t-SNE よりも大規模データで高速に可視化
- **前処理・特徴量圧縮**: transform() で訓練データ以外にも適用可能なためパイプライン組み込みが容易
- **scRNA-seq 解析**: 細胞の遺伝子発現データの2D/3D可視化
- **推薦システム**: ユーザー・アイテム埋め込みの構造把握
- **異常検知**: 高次元特徴量を圧縮して境界面を視覚的に確認

## 参考文献

<AffiliateBanner site="ml_intro" />

- McInnes, L., Healy, J. & Melville, J. (2018). UMAP: Uniform manifold approximation and projection for dimension reduction. *arXiv:1802.03426*.
- [UMAP 公式ドキュメント](https://umap-learn.readthedocs.io/)
- [How UMAP Works（公式解説）](https://umap-learn.readthedocs.io/en/latest/how_umap_works.html)
