import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 混合ガウスモデル（GMM）

## 混合ガウスモデル（GMM）とは

混合ガウスモデル（GMM）とは、

> データが複数のガウス分布（正規分布）の混合から生成されたと仮定する確率的クラスタリングモデルであり、各データ点が各クラスタに属する確率（所属確率）を出力するソフトクラスタリング手法

です。

k-means は各データ点を1つのクラスタに強制的に割り当てる「ハードクラスタリング」ですが、GMM はどのクラスタにも確率的に属することができる「ソフトクラスタリング」を実現します。

## k-means との比較

| 特性 | k-means | GMM |
|------|---------|-----|
| 割り当て方式 | ハード（確率0か1） | ソフト（0〜1の確率） |
| クラスタ形状 | 球状のみ | 楕円形（共分散行列で柔軟に対応） |
| 確率的解釈 | なし | あり（生成モデル） |
| モデル選択 | エルボー法・シルエット | AIC / BIC |
| 学習アルゴリズム | 重心更新 | EM アルゴリズム |
| 計算量 | $O(n \cdot k \cdot d)$ | $O(n \cdot k \cdot d^2)$ |

## EM アルゴリズム

GMM の学習は Expectation-Maximization (EM) アルゴリズムで行います。

```python
import numpy as np
from sklearn.mixture import GaussianMixture
from sklearn.datasets import make_blobs

np.random.seed(42)

# 2クラスタのデータ（異なる分散を持つ）
X1 = np.random.multivariate_normal([0, 0], [[1, 0.5], [0.5, 1]], 150)
X2 = np.random.multivariate_normal([4, 4], [[2, -0.5], [-0.5, 0.5]], 100)
X = np.vstack([X1, X2])

# GMM の学習
gmm = GaussianMixture(n_components=2, covariance_type='full',
                       n_init=5, max_iter=100, random_state=42)
gmm.fit(X)

print("=== GMM 学習結果 ===")
print(f"収束までのイテレーション: {gmm.n_iter_}")
print(f"\n混合係数（各クラスタの重み）:")
for i, w in enumerate(gmm.weights_):
    print(f"  クラスタ {i}: {w:.4f}")

print(f"\n平均ベクトル:")
for i, mu in enumerate(gmm.means_):
    print(f"  クラスタ {i}: {mu}")

print(f"\n共分散行列:")
for i, cov in enumerate(gmm.covariances_):
    print(f"  クラスタ {i}:\n{cov}")
```

## ソフトクラスタリングの実装

```python
import numpy as np
from sklearn.mixture import GaussianMixture
from sklearn.cluster import KMeans

np.random.seed(42)

# クラスタ境界付近のデータを生成
X_center = np.random.multivariate_normal([0, 0], [[1, 0], [0, 1]], 200)
X_right  = np.random.multivariate_normal([3, 0], [[1, 0], [0, 1]], 200)
X = np.vstack([X_center, X_right])

# GMM: ソフトクラスタリング（確率出力）
gmm = GaussianMixture(n_components=2, covariance_type='full', random_state=42)
gmm.fit(X)

proba = gmm.predict_proba(X)  # shape: (n_samples, n_components)
hard_labels_gmm = gmm.predict(X)

# k-means: ハードクラスタリング
km = KMeans(n_clusters=2, n_init=10, random_state=42)
hard_labels_km = km.fit_predict(X)

# クラスタ境界付近のサンプルの比較
# x座標が 1.0 〜 2.0 の間（中間地帯）にある点を抽出
boundary_mask = (X[:, 0] > 1.0) & (X[:, 0] < 2.0)
print(f"境界付近のサンプル数: {boundary_mask.sum()}")
print("\n境界付近サンプルの確率（上位5件）:")
print(f"  {'x':>6} {'y':>6} {'P(クラスタ0)':>14} {'P(クラスタ1)':>14}")
for x, prob in zip(X[boundary_mask][:5], proba[boundary_mask][:5]):
    print(f"  {x[0]:>6.3f} {x[1]:>6.3f} {prob[0]:>14.4f} {prob[1]:>14.4f}")

# 不確実性の高いサンプル（エントロピーが高い点）
entropy = -np.sum(proba * np.log(proba + 1e-10), axis=1)
most_uncertain = np.argsort(entropy)[-5:][::-1]
print(f"\n最も不確実な点（エントロピー上位5位）:")
for idx in most_uncertain:
    print(f"  x={X[idx,0]:.3f}, P0={proba[idx,0]:.4f}, P1={proba[idx,1]:.4f}, H={entropy[idx]:.4f}")
```

## 共分散の種類

```python
import numpy as np
from sklearn.mixture import GaussianMixture
from sklearn.metrics import silhouette_score

np.random.seed(42)

# 楕円形クラスタを含むデータ
X1 = np.random.multivariate_normal([0, 0], [[3, 2], [2, 2]], 100)
X2 = np.random.multivariate_normal([6, 0], [[1, 0], [0, 3]], 100)
X = np.vstack([X1, X2])

covariance_types = ['full', 'tied', 'diag', 'spherical']

print("共分散タイプの比較:")
print(f"{'タイプ':<12} {'対数尤度':>12} {'シルエットスコア':>18} {'説明'}")
print('-' * 70)

descriptions = {
    'full':      '各クラスタが独立の共分散行列を持つ（最も柔軟）',
    'tied':      '全クラスタが同一の共分散行列を共有',
    'diag':      '対角共分散行列（特徴量間の相関なし）',
    'spherical': '等方的な球状共分散',
}

for cov_type in covariance_types:
    gmm = GaussianMixture(n_components=2, covariance_type=cov_type,
                           n_init=5, random_state=42)
    gmm.fit(X)
    labels = gmm.predict(X)
    score = silhouette_score(X, labels) if len(np.unique(labels)) > 1 else float('nan')
    ll = gmm.score(X)
    print(f"{cov_type:<12} {ll:>12.4f} {score:>18.4f}  {descriptions[cov_type]}")
```

## BIC / AIC によるモデル選択

```python
import numpy as np
from sklearn.mixture import GaussianMixture

np.random.seed(42)

# 真のクラスタ数 = 3 のデータ
means = [[0, 0], [5, 5], [0, 8]]
covs  = [[[1, 0], [0, 1]], [[1.5, 0.5], [0.5, 1]], [[0.5, 0], [0, 2]]]
X = np.vstack([
    np.random.multivariate_normal(m, c, 100)
    for m, c in zip(means, covs)
])

print("クラスタ数の選択（BIC / AIC）:")
print(f"{'k':>4} {'BIC':>12} {'AIC':>12} {'対数尤度':>12}")
print('-' * 44)

bic_scores = []
aic_scores = []
for k in range(1, 8):
    gmm = GaussianMixture(n_components=k, covariance_type='full',
                           n_init=5, random_state=42)
    gmm.fit(X)
    bic = gmm.bic(X)
    aic = gmm.aic(X)
    ll  = gmm.score(X)
    bic_scores.append(bic)
    aic_scores.append(aic)
    bic_marker = " ← BIC最小" if bic == min(bic_scores) else ""
    print(f"{k:>4} {bic:>12.2f} {aic:>12.2f} {ll:>12.4f}{bic_marker}")

best_k_bic = np.argmin(bic_scores) + 1
best_k_aic = np.argmin(aic_scores) + 1
print(f"\nBIC が選ぶ最適クラスタ数: {best_k_bic}")
print(f"AIC が選ぶ最適クラスタ数: {best_k_aic}")
print(f"（真のクラスタ数 = 3）")
```

## 異常検知への応用

```python
import numpy as np
from sklearn.mixture import GaussianMixture

np.random.seed(42)

# 正常データで GMM を学習し、低確率の点を異常とみなす
X_normal = np.random.multivariate_normal([0, 0], [[1, 0.5], [0.5, 1]], 500)

gmm = GaussianMixture(n_components=2, covariance_type='full',
                       n_init=5, random_state=42)
gmm.fit(X_normal)

# 正常データの対数確率密度のパーセンタイルで閾値を設定
log_probs_train = gmm.score_samples(X_normal)
threshold = np.percentile(log_probs_train, 5)  # 下位5%を外れ値とみなす

# テストデータ（正常 + 外れ値混合）
X_test_normal  = np.random.multivariate_normal([0, 0], [[1, 0.5], [0.5, 1]], 100)
X_test_outlier = np.random.uniform(-8, 8, (20, 2))  # 外れ値
X_test = np.vstack([X_test_normal, X_test_outlier])
true_labels = np.array([0]*100 + [1]*20)  # 0=正常, 1=異常

log_probs_test = gmm.score_samples(X_test)
pred_anomaly = (log_probs_test < threshold).astype(int)

tp = ((pred_anomaly == 1) & (true_labels == 1)).sum()
fp = ((pred_anomaly == 1) & (true_labels == 0)).sum()
fn = ((pred_anomaly == 0) & (true_labels == 1)).sum()

precision = tp / (tp + fp) if (tp + fp) > 0 else 0
recall    = tp / (tp + fn) if (tp + fn) > 0 else 0
print(f"GMM 異常検知結果（閾値: {threshold:.2f}）:")
print(f"  Precision: {precision:.4f}")
print(f"  Recall:    {recall:.4f}")
```

## 使用場面

- **音声認識**: 音響モデルとして各音素をガウス混合でモデリング
- **異常検知**: 正常データの密度モデルを学習し、低確率の点を異常として検出
- **生成モデル**: データの確率分布を推定してサンプリングに利用
- **クラスタリング**: 不確実性を伴う判断が必要な境界付近の扱いに有用
- **画像生成**: ピクセルの色分布のモデリング（VAE の前身的な考え方）

## 参考文献

<AffiliateBanner site="ml_intro" />

- Dempster, A.P., Laird, N.M. & Rubin, D.B. (1977). Maximum likelihood from incomplete data via the EM algorithm. *JRSS-B*, 39(1), 1–38.
- Bishop, C.M. (2006). *Pattern Recognition and Machine Learning*, Chapter 9. Springer.
- [scikit-learn: GaussianMixture](https://scikit-learn.org/stable/modules/mixture.html)
