import AffiliateBanner from '@site/src/components/AffiliateBanner';

# t-SNE

## t-SNEとは

t-SNEとは、

> t-distributed Stochastic Neighbor Embedding の略で、高次元データの局所的な構造（近傍関係）を保ちながら2〜3次元に可視化するための非線形次元削減手法

です。

Maaten & Hinton (2008) が提案した手法で、クラスタの分離が視覚的に鮮明で機械学習の結果を説明する際に広く使われます。ただし、距離や大域的な構造は保存されないため解釈に注意が必要です。

## PCA と t-SNE の比較

| 特性 | PCA | t-SNE |
|------|-----|-------|
| 手法の種類 | 線形 | 非線形 |
| 目的 | 分散最大化 | 局所的近傍関係の保存 |
| 距離の保存 | グローバル（ある程度） | ローカルのみ |
| 計算量 | $O(n \cdot d^2)$ | $O(n^2)$（Barnes-Hut: $O(n \log n)$） |
| 再現性 | あり（決定論的） | なし（確率的・要 random_state） |
| 新データへの適用 | 可能 | 不可（fit のみ） |
| 用途 | 前処理・圧縮 | 可視化専用 |

## 基本実装

```python
import numpy as np
from sklearn.manifold import TSNE
from sklearn.datasets import load_digits
from sklearn.preprocessing import StandardScaler

# 手書き数字データ（64次元）
digits = load_digits()
X = digits.data
y = digits.target

# 標準化
X_scaled = StandardScaler().fit_transform(X)

# t-SNE で 2 次元に圧縮
tsne = TSNE(
    n_components=2,
    perplexity=30,
    learning_rate='auto',
    n_iter=1000,
    random_state=42,
    init='pca'   # PCA で初期化すると収束が安定する
)
X_tsne = tsne.fit_transform(X_scaled)

print(f"圧縮前: {X_scaled.shape} → 圧縮後: {X_tsne.shape}")
print(f"KL ダイバージェンス（損失）: {tsne.kl_divergence_:.4f}")

# 各クラスの重心を確認
for label in range(10):
    mask = y == label
    center = X_tsne[mask].mean(axis=0)
    print(f"  数字 {label}: 重心 = ({center[0]:.2f}, {center[1]:.2f}), n={mask.sum()}")
```

## perplexity パラメータの影響

```python
import numpy as np
from sklearn.manifold import TSNE
from sklearn.datasets import make_blobs
from sklearn.preprocessing import StandardScaler

np.random.seed(42)
X, y = make_blobs(n_samples=300, centers=4, cluster_std=0.5, random_state=42)
X_scaled = StandardScaler().fit_transform(X)

print("perplexity の影響:")
print(f"{'perplexity':>12} {'KL損失':>10} {'意味'}")
print('-' * 60)

descriptions = {
    5:    '近すぎる局所構造を重視（小さなクラスタを分離しすぎる）',
    10:   '小〜中規模の局所構造',
    30:   '標準的な設定（5〜50が推奨範囲）',
    50:   '中規模の局所構造',
    100:  '大域的な構造を重視（クラスタが潰れやすい）',
}

for perp in [5, 10, 30, 50, 100]:
    tsne = TSNE(n_components=2, perplexity=perp,
                learning_rate='auto', n_iter=500, random_state=42)
    tsne.fit_transform(X_scaled)
    desc = descriptions.get(perp, '')
    print(f"{perp:>12} {tsne.kl_divergence_:>10.4f}  {desc}")

print("\n推奨: perplexity = sqrt(n) 程度（n: サンプル数）")
print(f"  このデータでは sqrt({len(X)}) ≈ {len(X)**0.5:.1f}")
```

## t 分布によるアウトライア処理

```python
import numpy as np
from scipy.stats import norm, t

# t-SNE が t 分布を使う理由を概念的に説明
# 高次元空間での近傍 → 正規分布でモデル化
# 低次元空間での近傍 → t 分布（自由度1=コーシー分布）でモデル化

x = np.linspace(-6, 6, 1000)

# 正規分布 vs t 分布の裾の重さ比較
gaussian_pdf = norm.pdf(x, 0, 1)
t_df1_pdf    = t.pdf(x, df=1)   # コーシー分布（裾が重い）
t_df3_pdf    = t.pdf(x, df=3)

print("t-SNE が t 分布を使う理由（裾の重さの比較）:")
print(f"{'x':>6} {'正規分布':>12} {'t分布(df=1)':>14} {'t/正規 比':>12}")
print('-' * 48)
for xi, g, td in zip(x[::100], gaussian_pdf[::100], t_df1_pdf[::100]):
    ratio = td / g if g > 1e-10 else float('inf')
    print(f"{xi:>6.2f} {g:>12.6f} {td:>14.6f} {ratio:>12.2f}")

print("""
裾が重い t 分布を低次元で使う利点:
  1. 高次元で遠い点どうしは、低次元では距離が「さらに遠く」広がる
  2. 異なるクラスタが重なりにくくなり、分離が鮮明になる
  3. 混雑問題（Crowding Problem）を緩和できる
""")
```

## t-SNE の注意点

```python
import numpy as np
from sklearn.manifold import TSNE
from sklearn.preprocessing import StandardScaler

np.random.seed(42)

# 注意点 1: 結果の再現性（random_state を固定する必要がある）
X = np.random.randn(200, 10)
X[:100] += 3  # 2クラスタのデータ

tsne_run1 = TSNE(n_components=2, perplexity=30, n_iter=500, random_state=42)
tsne_run2 = TSNE(n_components=2, perplexity=30, n_iter=500, random_state=123)

X1 = tsne_run1.fit_transform(X)
X2 = tsne_run2.fit_transform(X)

# 2回の実行での座標差（random_state が違うと異なる結果）
print("注意点 1: 再現性")
print(f"  random_state=42 の範囲: x[{X1[:,0].min():.2f}, {X1[:,0].max():.2f}]")
print(f"  random_state=123 の範囲: x[{X2[:,0].min():.2f}, {X2[:,0].max():.2f}]")
print(f"  → 座標は毎回異なるが、クラスタの形状は類似")

# 注意点 2: クラスタ間の距離は意味を持たない
print("\n注意点 2: t-SNE の距離は信頼できない")
print("  - t-SNE はクラスタ内の相対距離を保存する")
print("  - クラスタ間の距離（離れ具合）は情報を持たない")
print("  - 「t-SNE でクラスタA とB が近いから似ている」は誤り")

# 注意点 3: 新データへの射影不可
print("\n注意点 3: 新データへの変換不可")
print("  - fit_transform() は訓練データのみに適用")
print("  - transform() メソッドが存在しない（新データには再学習が必要）")
print("  - 代替: UMAP は transform() をサポート")

# 注意点 4: 大規模データへの適用
print("\n注意点 4: 計算量")
print(f"  n=1000:   計算量 O(n^2) ≈ 10^6")
print(f"  n=10000:  計算量 O(n^2) ≈ 10^8  (Barnes-Hut で O(n log n) に軽減)")
print(f"  n=100000: O(n^2) は現実的でない → まず PCA で圧縮してから t-SNE を推奨")
```

## 大規模データへの対応

```python
import numpy as np
from sklearn.manifold import TSNE
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from sklearn.datasets import load_digits
import time

digits = load_digits()
X_scaled = StandardScaler().fit_transform(digits.data)

# 方法 1: PCA で次元削減してから t-SNE（推奨）
start = time.time()
X_pca_50 = PCA(n_components=50).fit_transform(X_scaled)
tsne = TSNE(n_components=2, perplexity=30, n_iter=1000,
            random_state=42, learning_rate='auto')
X_tsne_pca = tsne.fit_transform(X_pca_50)
t_pca_tsne = time.time() - start
print(f"PCA(50次元) → t-SNE: {t_pca_tsne:.2f}s, KL={tsne.kl_divergence_:.4f}")

# 方法 2: 直接 t-SNE（64次元）
start = time.time()
tsne2 = TSNE(n_components=2, perplexity=30, n_iter=1000,
             random_state=42, learning_rate='auto')
X_tsne_direct = tsne2.fit_transform(X_scaled)
t_direct = time.time() - start
print(f"直接 t-SNE (64次元): {t_direct:.2f}s, KL={tsne2.kl_divergence_:.4f}")

print(f"\n推奨: 高次元データは先に PCA で 50 次元程度に圧縮してから t-SNE を適用")
```

## 使用場面

- **クラスタリング結果の可視化**: k-means・GMM の結果を2次元でプロットして確認
- **埋め込みベクトルの可視化**: Word2Vec・BERT の単語/文章埋め込みを2D に投影
- **異常検知の可視化**: 正常データと異常データが分離されているか確認
- **深層学習の特徴量解釈**: 中間層の活性化を2Dにして学習状況を把握
- **生物情報学（scRNA-seq）**: 細胞ごとの遺伝子発現プロファイルを2Dに可視化

## 参考文献

<AffiliateBanner site="ml_intro" />

- van der Maaten, L. & Hinton, G. (2008). Visualizing data using t-SNE. *JMLR*, 9, 2579–2605.
- Wattenberg, M., Viégas, F. & Johnson, I. (2016). How to use t-SNE effectively. *Distill*.
- [scikit-learn: t-SNE](https://scikit-learn.org/stable/modules/manifold.html#t-sne)
