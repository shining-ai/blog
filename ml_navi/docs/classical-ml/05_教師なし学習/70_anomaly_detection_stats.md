import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 統計的異常検知

## 統計的異常検知とは

統計的異常検知とは、

> データの統計的性質（平均・分散・分布）から逸脱した点を異常として検出する手法であり、正規性の仮定や距離指標をもとに外れ値スコアを計算する

です。

機械学習ベースの複雑な手法と比べて解釈が容易で、少数サンプルでも適用できる点が実務上の強みです。

## 手法の比較

| 手法 | 仮定 | 変量 | 計算量 | 特徴 |
|------|------|------|--------|------|
| 3σルール | 正規分布 | 一変量 | $O(n)$ | 最も単純・解釈しやすい |
| Z-score | 正規分布 | 一変量 | $O(n)$ | 3σの標準化版 |
| 箱ひげ図（IQR法） | 分布によらない | 一変量 | $O(n \log n)$ | ノンパラメトリックで頑健 |
| マハラノビス距離 | 多変量正規分布 | 多変量 | $O(n \cdot d^2)$ | 特徴量間の相関を考慮 |

## 3σルール

```python
import numpy as np
from scipy import stats

np.random.seed(42)

# 正常データ（正規分布）+ 外れ値
X_normal = np.random.normal(50, 5, 500)
X_outliers = np.array([20.0, 75.0, 80.0, 15.0])
X = np.concatenate([X_normal, X_outliers])

# 3σルールによる外れ値検出
mu    = X.mean()
sigma = X.std()

lower = mu - 3 * sigma
upper = mu + 3 * sigma

anomalies_3sigma = X[(X < lower) | (X > upper)]
print(f"=== 3σルール ===")
print(f"平均: {mu:.2f}, 標準偏差: {sigma:.2f}")
print(f"正常範囲: [{lower:.2f}, {upper:.2f}]")
print(f"検出された外れ値数: {len(anomalies_3sigma)}")
print(f"検出された外れ値: {np.sort(anomalies_3sigma)}")

# 真の外れ値との比較
true_outlier_indices = np.arange(len(X_normal), len(X))
predicted_outlier_indices = np.where((X < lower) | (X > upper))[0]
tp = len(set(predicted_outlier_indices) & set(true_outlier_indices))
print(f"真の外れ値 {len(X_outliers)} 件のうち {tp} 件を正確に検出")
```

## Z-score 法

```python
import numpy as np
from scipy import stats

np.random.seed(42)

# Z-score = (x - mean) / std（3σルールの標準化版）
X = np.concatenate([
    np.random.normal(0, 1, 200),
    np.array([5.0, -5.5, 4.8, -6.0])  # 外れ値
])

z_scores = np.abs(stats.zscore(X))

print("=== Z-score 法 ===")
print(f"{'インデックス':>12} {'値':>8} {'|Z-score|':>12} {'異常判定':>10}")
print('-' * 46)

threshold = 3.0
for i, (x, z) in enumerate(zip(X, z_scores)):
    if z > 2.5:  # 2.5以上の点を表示
        flag = "異常" if z > threshold else "正常"
        print(f"{i:>12} {x:>8.3f} {z:>12.4f} {flag:>10}")

# Robust Z-score（中央値・MAD を使用して外れ値に対して頑健）
def robust_zscore(X: np.ndarray) -> np.ndarray:
    """中央値と MAD（中央絶対偏差）を使ったロバスト Z-score"""
    median = np.median(X)
    mad = np.median(np.abs(X - median))
    return 0.6745 * np.abs(X - median) / (mad + 1e-10)

robust_z = robust_zscore(X)
n_anomalies_robust = (robust_z > 3.5).sum()
print(f"\nRobust Z-score（MAD ベース）で検出: {n_anomalies_robust} 件")
print("→ 外れ値自体が平均・標準偏差を歪める問題を軽減")
```

## 箱ひげ図（IQR 法）

```python
import numpy as np

np.random.seed(42)

# 非対称な分布でも使えるノンパラメトリック手法
X_lognormal = np.random.lognormal(0, 0.5, 300)
X_outliers  = np.array([20.0, 25.0, 0.001, 30.0])
X = np.concatenate([X_lognormal, X_outliers])

Q1  = np.percentile(X, 25)
Q3  = np.percentile(X, 75)
IQR = Q3 - Q1

# IQR × 1.5 が標準的な閾値（1.5 = Tukey のフェンス）
lower_fence = Q1 - 1.5 * IQR
upper_fence = Q3 + 1.5 * IQR

# 極端な外れ値には × 3.0 を使う（"far out"）
lower_far = Q1 - 3.0 * IQR
upper_far = Q3 + 3.0 * IQR

anomalies_mild    = X[(X < lower_fence) | (X > upper_fence)]
anomalies_extreme = X[(X < lower_far)   | (X > upper_far)]

print("=== 箱ひげ図（IQR 法）===")
print(f"Q1={Q1:.4f}, Q3={Q3:.4f}, IQR={IQR:.4f}")
print(f"通常フェンス（×1.5）: [{lower_fence:.4f}, {upper_fence:.4f}]")
print(f"極端フェンス（×3.0）: [{lower_far:.4f}, {upper_far:.4f}]")
print(f"通常外れ値: {len(anomalies_mild)} 件")
print(f"極端外れ値: {len(anomalies_extreme)} 件")
print(f"\n利点: 正規分布を仮定しない → 歪んだ分布（対数正規など）に強い")
```

## マハラノビス距離

```python
import numpy as np
from scipy.spatial.distance import mahalanobis
from scipy.stats import chi2

np.random.seed(42)

# 多変量外れ値の検出
# 一変量では正常に見えても多変量では異常な点を検出できる
mean = np.array([0.0, 0.0])
cov  = np.array([[1.0, 0.8], [0.8, 1.0]])  # 強い正の相関

X_normal = np.random.multivariate_normal(mean, cov, 300)
# 一変量では正常範囲だが多変量では外れた点
X_outlier_multi = np.array([[2.0, -2.0], [-2.0, 2.0]])  # 相関に反する点
X_outlier_uni   = np.array([[4.0, 4.0]])                 # 一変量でも外れた点
X = np.vstack([X_normal, X_outlier_multi, X_outlier_uni])

# マハラノビス距離の計算
cov_est = np.cov(X.T)
mean_est = X.mean(axis=0)
cov_inv  = np.linalg.inv(cov_est)

def mahal_dist(x, mean, cov_inv):
    diff = x - mean
    return np.sqrt(diff @ cov_inv @ diff)

distances = np.array([mahal_dist(x, mean_est, cov_inv) for x in X])

# χ² 分布による閾値（自由度 = 次元数, 有意水準 0.05）
n_features = 2
threshold = np.sqrt(chi2.ppf(0.975, df=n_features))

print("=== マハラノビス距離 ===")
print(f"異常判定閾値（χ², p=0.025）: {threshold:.4f}")
print(f"\n検出された外れ値:")
for i, (x, d) in enumerate(zip(X, distances)):
    if d > threshold:
        in_3sigma = all(np.abs(x) < 3)
        print(f"  idx={i:>3}: ({x[0]:>6.3f}, {x[1]:>6.3f}), "
              f"Mahal={d:.4f}, 一変量3σ内={'Yes' if in_3sigma else 'No '}")

# 多変量での外れ値が一変量では見えにくいことを確認
n_detected = (distances > threshold).sum()
print(f"\n検出数: {n_detected} 件 / 全 {len(X)} 件")
print(f"（追加した外れ値 {len(X_outlier_multi)+len(X_outlier_uni)} 件）")
```

## 一変量・多変量の比較

```python
import numpy as np
from scipy.stats import chi2
from scipy.spatial.distance import mahalanobis

np.random.seed(42)

# 実際のデータで一変量・多変量の違いを示す
# 特徴量: 身長(cm)・体重(kg)  ← 強い相関を持つ
height = np.random.normal(170, 8, 200)
weight = 0.5 * height - 20 + np.random.normal(0, 3, 200)  # 身長と相関

X = np.column_stack([height, weight])

# 外れ値を追加
# ケース1: 身長も体重も大きい（一変量でも多変量でも外れ値）
X = np.vstack([X, [200, 80]])
# ケース2: 身長大・体重小（相関に反する → 多変量でのみ外れ値）
X = np.vstack([X, [190, 45]])
# ケース3: 身長小・体重大（相関に反する → 多変量でのみ外れ値）
X = np.vstack([X, [150, 90]])

cov_inv = np.linalg.inv(np.cov(X.T))
mean_est = X.mean(axis=0)
threshold_mahal = np.sqrt(chi2.ppf(0.975, df=2))

# 一変量 3σ での外れ値
z_h = np.abs((X[:, 0] - X[:, 0].mean()) / X[:, 0].std())
z_w = np.abs((X[:, 1] - X[:, 1].mean()) / X[:, 1].std())
univariate_anomaly = (z_h > 3) | (z_w > 3)

# 多変量マハラノビス距離での外れ値
mahal_distances = np.array([
    np.sqrt((x - mean_est) @ cov_inv @ (x - mean_est)) for x in X
])
multivariate_anomaly = mahal_distances > threshold_mahal

print("比較: 一変量 vs 多変量 外れ値検出")
print(f"{'idx':>5} {'身長':>6} {'体重':>6} {'一変量3σ':>10} {'マハラノビス':>12}")
print('-' * 40)
for i in range(len(X)-3, len(X)):  # 追加した外れ値のみ表示
    u = "外れ値" if univariate_anomaly[i] else "正常 "
    m = "外れ値" if multivariate_anomaly[i] else "正常 "
    print(f"{i:>5} {X[i,0]:>6.1f} {X[i,1]:>6.1f} {u:>10} {m:>12}")
```

## 使用場面

- **製造業の品質管理**: センサー値の 3σ・マハラノビス距離で製品不良を早期検出
- **金融不正検知**: 取引金額・頻度の Z-score による異常取引の自動検出
- **医療データ**: 検査値の箱ひげ図（IQR 法）による外れ値の除去
- **時系列データの監視**: 一変量の 3σ ルールで指標の急変を検知
- **データクレンジング**: 学習データから外れ値を除去してモデル性能を向上

## 参考文献

<AffiliateBanner site="ml_intro" />

- Tukey, J.W. (1977). *Exploratory Data Analysis*. Addison-Wesley.
- Mahalanobis, P.C. (1936). On the generalised distance in statistics. *Proceedings of the National Institute of Sciences of India*, 2(1), 49–55.
- [scikit-learn: Outlier Detection](https://scikit-learn.org/stable/modules/outlier_detection.html)
