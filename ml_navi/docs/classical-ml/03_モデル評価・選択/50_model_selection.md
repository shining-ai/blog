import AffiliateBanner from '@site/src/components/AffiliateBanner';

# モデル選択の考え方

## モデル選択の考え方とは

モデル選択の考え方とは、

> 問題の種類・データの性質・解釈可能性・計算コストなどを総合的に考慮して、与えられたタスクに最適なモデルを選ぶ意思決定プロセス

です。

「どのモデルが最も良いか」という問いに普遍的な答えはありません。No Free Lunch 定理が示すように、すべての問題で最良となるアルゴリズムは存在しないため、問題特性を理解したうえで選択することが重要です。

## 問題の種類と代表的モデル

| タスク | 代表的モデル | 選択のポイント |
|--------|-------------|----------------|
| 二値分類 | ロジスティック回帰・SVM・勾配ブースティング | 線形分離可能か、解釈性が必要か |
| 多クラス分類 | ランダムフォレスト・XGBoost・NN | クラス数・クラス不均衡 |
| 回帰 | 線形回帰・Ridge・Lasso・GBT | 外れ値の有無・特徴量の多重共線性 |
| 時系列予測 | ARIMA・Prophet・LSTM | 周期性・長期依存性 |
| クラスタリング | k-means・DBSCAN・GMM | クラスタ形状・ノイズ耐性 |
| 次元削減 | PCA・t-SNE・UMAP | 線形/非線形・可視化目的か否か |

## No Free Lunch 定理

```python
import numpy as np
from sklearn.datasets import make_classification, make_moons, make_circles
from sklearn.model_selection import cross_val_score
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier

np.random.seed(42)

# 異なる性質のデータセットを生成
datasets = {
    '線形分離可能': make_classification(n_samples=300, n_features=2,
                                        n_informative=2, n_redundant=0,
                                        random_state=42),
    '非線形（moon）': make_moons(n_samples=300, noise=0.2, random_state=42),
    '非線形（circle）': make_circles(n_samples=300, noise=0.1, random_state=42),
}

models = {
    'ロジスティック回帰': LogisticRegression(random_state=42),
    '決定木':             DecisionTreeClassifier(max_depth=5, random_state=42),
    'SVM(RBF)':           SVC(kernel='rbf', C=1.0, random_state=42),
    'kNN(k=5)':           KNeighborsClassifier(n_neighbors=5),
}

print("=== No Free Lunch 定理のデモ ===")
print(f"{'モデル':<18}", end='')
for name in datasets:
    print(f"{name:>16}", end='')
print()
print('-' * 66)

for model_name, model in models.items():
    print(f"{model_name:<18}", end='')
    for (X, y) in datasets.values():
        scores = cross_val_score(model, X, y, cv=5, scoring='accuracy')
        print(f"{scores.mean():>15.4f}", end='')
    print()

print("\n→ すべての問題で最強のモデルはない（No Free Lunch 定理）")
```

## モデル比較の手順

### 1. ベースラインの設定

```python
import numpy as np
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.dummy import DummyClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

data = load_breast_cancer()
X_train, X_test, y_train, y_test = train_test_split(
    data.data, data.target, test_size=0.2, random_state=42
)

# まず最も単純なベースラインを確立する
baseline = DummyClassifier(strategy='most_frequent')
baseline_scores = cross_val_score(baseline, X_train, y_train, cv=5, scoring='f1')
print(f"ベースライン（最頻値予測）: F1 = {baseline_scores.mean():.4f}")

# 次に線形モデル（解釈可能・計算高速）を試す
lr = Pipeline([
    ('scaler', StandardScaler()),
    ('clf',    LogisticRegression(max_iter=1000, random_state=42))
])
lr_scores = cross_val_score(lr, X_train, y_train, cv=5, scoring='f1')
print(f"ロジスティック回帰:        F1 = {lr_scores.mean():.4f}")
print(f"  → ベースラインからの改善: +{lr_scores.mean() - baseline_scores.mean():.4f}")
```

### 2. 複数モデルの系統的比較

```python
import numpy as np
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

data = load_breast_cancer()
X_train, X_test, y_train, y_test = train_test_split(
    data.data, data.target, test_size=0.2, random_state=42
)

# 比較するモデルを定義（スケーリングが必要なものはパイプラインに含める）
candidates = {
    'LogisticRegression': Pipeline([('sc', StandardScaler()),
                                     ('clf', LogisticRegression(max_iter=1000, random_state=42))]),
    'DecisionTree':        DecisionTreeClassifier(max_depth=5, random_state=42),
    'RandomForest':        RandomForestClassifier(n_estimators=100, random_state=42),
    'GradientBoosting':    GradientBoostingClassifier(n_estimators=100, random_state=42),
    'SVM(RBF)':            Pipeline([('sc', StandardScaler()),
                                     ('clf', SVC(kernel='rbf', probability=True, random_state=42))]),
}

print(f"{'モデル':<22} {'CV F1平均':>10} {'CV F1標準偏差':>14}")
print('-' * 50)

results = {}
for name, model in candidates.items():
    scores = cross_val_score(model, X_train, y_train, cv=5, scoring='f1', n_jobs=-1)
    results[name] = scores
    print(f"{name:<22} {scores.mean():>10.4f} {scores.std():>14.4f}")

# 最良モデルでテスト評価
best_name = max(results, key=lambda k: results[k].mean())
best_model = candidates[best_name]
best_model.fit(X_train, y_train)
print(f"\n最良モデル: {best_name}")
print(f"テスト F1: {best_model.score(X_test, y_test):.4f}")
```

## AIC / BIC によるモデル選択

### 定義

$$\text{AIC} = 2k - 2\ln(\hat{L}), \quad \text{BIC} = k\ln(n) - 2\ln(\hat{L})$$

ここで $k$ はパラメータ数、$\hat{L}$ は最大尤度、$n$ はサンプル数です。小さい値ほど良いモデルです。

```python
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures
from sklearn.pipeline import Pipeline

np.random.seed(42)

# 真の関係: y = 2x + x^2 + noise
n = 100
X = np.linspace(-3, 3, n).reshape(-1, 1)
y = 2 * X.ravel() + X.ravel()**2 + np.random.normal(0, 1, n)

def compute_aic_bic(model, X, y):
    """線形モデルの AIC と BIC を計算する"""
    y_pred = model.predict(X)
    residuals = y - y_pred
    n = len(y)
    # モデルのパラメータ数（切片含む）
    if hasattr(model[-1], 'coef_'):
        k = len(model[-1].coef_) + 1
    else:
        k = len(model.coef_) + 1
    # 最大対数尤度（正規誤差を仮定）
    sigma2 = np.var(residuals, ddof=0)
    log_likelihood = -n/2 * np.log(2 * np.pi * sigma2) - np.sum(residuals**2) / (2 * sigma2)
    aic = 2 * k - 2 * log_likelihood
    bic = k * np.log(n) - 2 * log_likelihood
    return aic, bic

print(f"{'次数':>4} {'AIC':>10} {'BIC':>10} {'R²':>8}")
print('-' * 36)
for degree in range(1, 8):
    poly_model = Pipeline([
        ('poly', PolynomialFeatures(degree=degree, include_bias=False)),
        ('lr',   LinearRegression())
    ])
    poly_model.fit(X, y)
    aic, bic = compute_aic_bic(poly_model, X, y)
    r2 = poly_model.score(X, y)
    marker = " ← AIC/BIC最小" if degree == 2 else ""
    print(f"{degree:>4} {aic:>10.2f} {bic:>10.2f} {r2:>8.4f}{marker}")

print("\n→ AIC/BICは複雑すぎるモデルにペナルティを課し、真の次数（2次）を選択する")
```

## 統計的仮説検定によるモデル比較

```python
import numpy as np
from scipy import stats
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import cross_val_score
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier

data = load_breast_cancer()
X, y = data.data, data.target

np.random.seed(42)
rf = RandomForestClassifier(n_estimators=100, random_state=42)
gb = GradientBoostingClassifier(n_estimators=100, random_state=42)

# 同一 CV 分割を使って公平に比較
from sklearn.model_selection import KFold
kf = KFold(n_splits=10, shuffle=True, random_state=42)

scores_rf = cross_val_score(rf, X, y, cv=kf, scoring='accuracy')
scores_gb = cross_val_score(gb, X, y, cv=kf, scoring='accuracy')

print(f"RandomForest:     {scores_rf.mean():.4f} ± {scores_rf.std():.4f}")
print(f"GradientBoosting: {scores_gb.mean():.4f} ± {scores_gb.std():.4f}")

# 対応のある t 検定（同一分割を使っているため）
t_stat, p_value = stats.ttest_rel(scores_rf, scores_gb)
print(f"\n対応のある t 検定: t={t_stat:.4f}, p={p_value:.4f}")
if p_value < 0.05:
    winner = "RandomForest" if scores_rf.mean() > scores_gb.mean() else "GradientBoosting"
    print(f"有意差あり（p<0.05）: {winner} が統計的に優れている")
else:
    print("有意差なし（p>=0.05）: 2モデルに統計的な差はない")
```

## 使用場面

- **プロジェクト初期段階**: ベースライン設定と複数モデルの素早い比較でアプローチを絞り込む
- **特徴量エンジニアリングの評価**: モデル変更前後の AIC/BIC 比較で特徴量の効果を測定
- **学術論文**: 複数手法の統計的な優劣検定で主張に根拠を与える
- **解釈性が必要な場面**: 精度がわずかに低くてもロジスティック回帰・決定木を選ぶ判断基準
- **リソース制約がある場面**: 計算コスト・推論時間・メモリを考慮したモデル選択

## 参考文献

<AffiliateBanner site="ml_intro" />

- Wolpert, D.H. (1996). The lack of a priori distinctions between learning algorithms. *Neural Computation*, 8(7), 1341–1390.
- Burnham, K.P. & Anderson, D.R. (2002). *Model Selection and Multimodel Inference*. Springer.
- Hastie, T., Tibshirani, R. & Friedman, J. (2009). *The Elements of Statistical Learning* (2nd ed.). Springer.
- [scikit-learn: Model Selection](https://scikit-learn.org/stable/model_selection.html)
