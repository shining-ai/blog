import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Isolation Forest

## Isolation Forestとは

Isolation Forestとは、

> 異常なデータ点は正常なデータ点と比べてランダム分割によって孤立しやすいという直感に基づき、分割木（Isolation Tree）の平均的な孤立コストを異常スコアとして使う異常検知アルゴリズム

です。

Liu ら (2008) が提案した手法で、「外れ値は少数かつ異質」という特性を利用することで、正常データの密度を推定する既存手法とは逆のアプローチを取ります。

## アルゴリズムの仕組み

| 手順 | 内容 |
|------|------|
| 1. ランダム木の構築 | データから部分サンプルを取り、ランダムに特徴量と分割点を選ぶ |
| 2. 孤立コストの計算 | 各データ点を孤立させるのに要した分割回数（木の深さ）を記録 |
| 3. 異常スコア | 全ての木にわたる平均深さを正規化した値（0〜1）。低いほど異常 |

## 基本実装

```python
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.datasets import make_blobs

np.random.seed(42)

# 正常データ + 外れ値
X_normal = np.random.randn(300, 2) * 2
X_outliers = np.random.uniform(-15, 15, (30, 2))
X = np.vstack([X_normal, X_outliers])
# 真のラベル（1=正常, -1=異常）
y_true = np.concatenate([np.ones(300), -np.ones(30)])

# Isolation Forest
iso_forest = IsolationForest(
    n_estimators=100,       # 木の数
    max_samples='auto',     # サブサンプルサイズ（デフォルト: min(256, n)）
    contamination=0.1,      # 異常の割合の事前推定
    random_state=42
)
iso_forest.fit(X)

# 予測（1=正常, -1=異常）と異常スコア（低いほど異常）
y_pred    = iso_forest.predict(X)
scores    = iso_forest.score_samples(X)  # 負の異常スコア

# 評価
from sklearn.metrics import classification_report
print("=== Isolation Forest の評価 ===")
print(classification_report(y_true, y_pred, target_names=['異常(-1)', '正常(+1)']))

# 異常スコアの分布
normal_scores  = scores[y_true == 1]
outlier_scores = scores[y_true == -1]
print(f"正常点のスコア: {normal_scores.mean():.4f} ± {normal_scores.std():.4f}")
print(f"外れ値のスコア: {outlier_scores.mean():.4f} ± {outlier_scores.std():.4f}")
```

## ランダム分割木の仕組み

```python
import numpy as np

def isolation_tree_depth(x_target: np.ndarray,
                          X_subset: np.ndarray,
                          max_depth: int = 10) -> int:
    """
    1本の孤立木で x_target を孤立させるのに要した深さを返す（簡易実装）
    """
    if len(X_subset) <= 1 or max_depth == 0:
        # 停止条件: 孤立した or 最大深さに達した
        return 0

    # ランダムに特徴量と分割点を選ぶ
    feature = np.random.randint(0, X_subset.shape[1])
    feat_min, feat_max = X_subset[:, feature].min(), X_subset[:, feature].max()

    if feat_min == feat_max:
        return 0  # 全て同じ値なら分割できない

    split_val = np.random.uniform(feat_min, feat_max)

    # x_target が左右どちらに属するか
    if x_target[feature] < split_val:
        X_sub = X_subset[X_subset[:, feature] < split_val]
    else:
        X_sub = X_subset[X_subset[:, feature] >= split_val]

    return 1 + isolation_tree_depth(x_target, X_sub, max_depth - 1)

np.random.seed(42)
X_demo = np.random.randn(256, 2)

# 正常点と外れ値の平均孤立深さを比較
normal_point  = np.array([0.0, 0.0])    # データの中心
outlier_point = np.array([10.0, 10.0])  # 明らかな外れ値

depths_normal  = [isolation_tree_depth(normal_point, X_demo)  for _ in range(100)]
depths_outlier = [isolation_tree_depth(outlier_point, X_demo) for _ in range(100)]

print(f"正常点の平均孤立深さ:  {np.mean(depths_normal):.2f}")
print(f"外れ値の平均孤立深さ: {np.mean(depths_outlier):.2f}")
print(f"→ 外れ値は少ない分割で孤立する（深さが浅い）")
```

## contamination パラメータの影響

```python
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.metrics import f1_score, precision_score, recall_score

np.random.seed(42)

# データの真の外れ値率 = 10%
X_normal   = np.random.randn(450, 2)
X_outliers = np.random.uniform(-8, 8, (50, 2))  # 50/500 = 10%
X = np.vstack([X_normal, X_outliers])
y_true = np.concatenate([np.ones(450), -np.ones(50)])

print("contamination パラメータと性能の関係:")
print(f"{'contamination':>15} {'Precision':>10} {'Recall':>8} {'F1':>8}")
print('-' * 46)
for contamination in [0.01, 0.05, 0.10, 0.15, 0.20, 0.30]:
    iso = IsolationForest(n_estimators=100, contamination=contamination, random_state=42)
    y_pred = iso.fit_predict(X)
    p = precision_score(y_true, y_pred, pos_label=-1, zero_division=0)
    r = recall_score(y_true, y_pred, pos_label=-1)
    f = f1_score(y_true, y_pred, pos_label=-1)
    marker = " ← 真の割合" if abs(contamination - 0.10) < 0.001 else ""
    print(f"{contamination:>15.2f} {p:>10.4f} {r:>8.4f} {f:>8.4f}{marker}")
```

## 計算量の優位性

```python
import numpy as np
import time
from sklearn.ensemble import IsolationForest
from sklearn.covariance import EllipticEnvelope
from sklearn.neighbors import LocalOutlierFactor

np.random.seed(42)

print("異常検知手法の計算時間比較:")
print(f"{'手法':>25} {'n=1000':>10} {'n=5000':>10} {'n=10000':>10}")
print('-' * 60)

for n in [1000, 5000, 10000]:
    X = np.random.randn(n, 10)

    times = {}
    # Isolation Forest: O(n * t * h) where t=trees, h=height
    start = time.time()
    IsolationForest(n_estimators=100, random_state=42).fit_predict(X)
    times['IsolationForest'] = time.time() - start

    # LOF: O(n^2) kNN 探索が必要
    start = time.time()
    LocalOutlierFactor(n_neighbors=20, novelty=False).fit_predict(X)
    times['LocalOutlierFactor'] = time.time() - start

    # EllipticEnvelope: O(n * d^2) 共分散行列の推定
    try:
        start = time.time()
        EllipticEnvelope(support_fraction=0.9, random_state=42).fit_predict(X)
        times['EllipticEnvelope'] = time.time() - start
    except Exception:
        times['EllipticEnvelope'] = float('nan')

    for method, t in times.items():
        if n == 1000:
            print(f"{method:>25} {t:>10.4f}", end='')
        else:
            print(f" {t:>10.4f}", end='')
    if n == 10000:
        print()
```

## 特徴量の重要度分析（SHAP との組み合わせ）

```python
import numpy as np
from sklearn.ensemble import IsolationForest

np.random.seed(42)

# どの特徴量が異常判定に寄与しているかを確認
n_features = 5
feature_names = ['温度', '圧力', '流量', '振動', '電流']

# 正常データ
X_normal = np.random.randn(400, n_features)

# 特定の特徴量に外れ値を持つサンプルを追加
X_outliers = np.random.randn(20, n_features)
X_outliers[:10, 0] += 5   # 温度だけ異常
X_outliers[10:, 1] += 5   # 圧力だけ異常

X = np.vstack([X_normal, X_outliers])

# Isolation Forest の学習
iso = IsolationForest(n_estimators=200, contamination=0.05, random_state=42)
iso.fit(X)

scores = iso.score_samples(X)
pred   = iso.predict(X)

# 検出された外れ値の特徴量値を確認
detected_outliers = X[pred == -1]
print("検出された異常サンプルの特徴量値（上位10件）:")
print(f"{'サンプル':>8} " + " ".join(f"{n:>8}" for n in feature_names))
print('-' * 50)
for i, (x, s) in enumerate(zip(detected_outliers[:10], scores[pred == -1][:10])):
    row = f"{i:>8} " + " ".join(f"{v:>8.3f}" for v in x)
    print(f"{row}  スコア={s:.3f}")

# 各特徴量の平均|z-score|による寄与度（近似的な解釈）
normal_mean = X_normal.mean(axis=0)
normal_std  = X_normal.std(axis=0)
outlier_z   = np.abs((detected_outliers - normal_mean) / normal_std).mean(axis=0)
print("\n検出異常サンプルの特徴量ごとの平均|Z-score|:")
for name, z in zip(feature_names, outlier_z):
    bar = '█' * int(z * 3)
    print(f"  {name}: {z:.3f} {bar}")
```

## 使用場面

- **製造業の設備監視**: センサーデータのリアルタイム異常検知（計算が軽量で産業 IoT に適する）
- **ネットワークセキュリティ**: 侵入検知システム（IDS）での不審なパケットの検出
- **金融不正検知**: クレジットカード不正利用の検出
- **医療診断支援**: バイタルサインの急変や医療機器の異常検知
- **ログ解析**: 大量のシステムログから異常なアクセスパターンを検出

## 参考文献

<AffiliateBanner site="ml_intro" />

- Liu, F.T., Ting, K.M. & Zhou, Z.-H. (2008). Isolation forest. *ICDM*, 413–422.
- Liu, F.T., Ting, K.M. & Zhou, Z.-H. (2012). Isolation-based anomaly detection. *ACM TKDD*, 6(1).
- [scikit-learn: IsolationForest](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.IsolationForest.html)
