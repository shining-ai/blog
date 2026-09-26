import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ハイパーパラメータチューニング

## ハイパーパラメータチューニングとは

ハイパーパラメータチューニングとは、

> 学習前に人間が設定するパラメータ（学習率・木の深さ・正則化係数など）を系統的に探索し、モデルの汎化性能を最大化するプロセス

です。

モデルのパラメータ（重み）は学習データから自動的に更新されますが、ハイパーパラメータは学習アルゴリズムの外側で設定します。適切なチューニングはモデル性能を大きく左右します。

## 手法の比較

| 手法 | 探索方法 | 計算効率 | 適用スケール | 特徴 |
|------|----------|----------|--------------|------|
| グリッドサーチ | 全組み合わせ | 低 | 小 | 確実だが指数的に増大 |
| ランダムサーチ | ランダムサンプリング | 中 | 中 | 重要パラメータに効果的 |
| ベイズ最適化 | 獲得関数で誘導 | 高 | 大 | 評価回数が少なくて済む |
| Hyperband | 早期打ち切り | 高 | 大 | リソース効率が高い |

## グリッドサーチ

すべてのパラメータ組み合わせを網羅的に試す方法です。

```python
import numpy as np
from sklearn.datasets import load_breast_cancer
from sklearn.svm import SVC
from sklearn.model_selection import GridSearchCV, train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

# データ準備
data = load_breast_cancer()
X_train, X_test, y_train, y_test = train_test_split(
    data.data, data.target, test_size=0.2, random_state=42
)

# パイプライン（スケーリング + SVM）
pipeline = Pipeline([
    ('scaler', StandardScaler()),
    ('svm', SVC(random_state=42))
])

# 探索グリッドの定義
param_grid = {
    'svm__C':     [0.1, 1.0, 10.0],
    'svm__gamma': ['scale', 'auto', 0.01],
    'svm__kernel': ['rbf', 'linear']
}

# GridSearchCV: 5-fold交差検証
grid_search = GridSearchCV(
    pipeline,
    param_grid,
    cv=5,
    scoring='accuracy',
    n_jobs=-1,
    verbose=1
)
grid_search.fit(X_train, y_train)

print(f"最適パラメータ: {grid_search.best_params_}")
print(f"CV 最高スコア: {grid_search.best_score_:.4f}")
print(f"テストスコア: {grid_search.score(X_test, y_test):.4f}")
print(f"探索した組み合わせ数: {len(grid_search.cv_results_['params'])}")
```

## ランダムサーチ

パラメータ空間からランダムにサンプリングする方法です。Bergstra & Bengio (2012) が示したように、重要なパラメータが少数の場合はグリッドサーチより効率的です。

```python
import numpy as np
from sklearn.datasets import load_breast_cancer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import RandomizedSearchCV, train_test_split
from scipy.stats import randint, uniform

data = load_breast_cancer()
X_train, X_test, y_train, y_test = train_test_split(
    data.data, data.target, test_size=0.2, random_state=42
)

# 連続値・離散値の分布を定義
param_dist = {
    'n_estimators':      randint(50, 500),
    'max_depth':         [None, 5, 10, 20, 30],
    'min_samples_split': randint(2, 20),
    'min_samples_leaf':  randint(1, 10),
    'max_features':      uniform(0.1, 0.9),  # 連続値で探索
}

rf = RandomForestClassifier(random_state=42)

random_search = RandomizedSearchCV(
    rf,
    param_distributions=param_dist,
    n_iter=50,          # 50パターンをランダムに試す
    cv=5,
    scoring='accuracy',
    n_jobs=-1,
    random_state=42,
    verbose=1
)
random_search.fit(X_train, y_train)

print(f"最適パラメータ: {random_search.best_params_}")
print(f"CV 最高スコア: {random_search.best_score_:.4f}")
print(f"テストスコア: {random_search.score(X_test, y_test):.4f}")
```

## ベイズ最適化（Optuna）

過去の評価結果を活用して次に試すパラメータを賢く選ぶ方法です。Tree-structured Parzen Estimator (TPE) アルゴリズムが広く使われます。

```python
import numpy as np
from sklearn.datasets import load_breast_cancer
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import cross_val_score, train_test_split

data = load_breast_cancer()
X_train, X_test, y_train, y_test = train_test_split(
    data.data, data.target, test_size=0.2, random_state=42
)

try:
    import optuna
    optuna.logging.set_verbosity(optuna.logging.WARNING)

    def objective(trial):
        """Optuna の目的関数: CV スコアを最大化する"""
        params = {
            'n_estimators':      trial.suggest_int('n_estimators', 50, 300),
            'max_depth':         trial.suggest_int('max_depth', 2, 8),
            'learning_rate':     trial.suggest_float('learning_rate', 1e-3, 0.3, log=True),
            'subsample':         trial.suggest_float('subsample', 0.5, 1.0),
            'min_samples_split': trial.suggest_int('min_samples_split', 2, 20),
        }
        model = GradientBoostingClassifier(**params, random_state=42)
        scores = cross_val_score(model, X_train, y_train, cv=3, scoring='accuracy')
        return scores.mean()

    study = optuna.create_study(direction='maximize')
    study.optimize(objective, n_trials=50)

    print(f"最適パラメータ: {study.best_params}")
    print(f"最高 CV スコア: {study.best_value:.4f}")

    # 最適パラメータでテスト
    best_model = GradientBoostingClassifier(**study.best_params, random_state=42)
    best_model.fit(X_train, y_train)
    print(f"テストスコア: {best_model.score(X_test, y_test):.4f}")

    # 最適化履歴の確認
    print(f"\n試行回数: {len(study.trials)}")
    print(f"最適解を発見したトライアル: {study.best_trial.number}")

except ImportError:
    print("Optuna が未インストールです。pip install optuna でインストールしてください。")
```

## Hyperband（早期打ち切り）

計算資源を効率的に使うために、成績が悪い設定を早期に打ち切る方法です。

```python
import numpy as np
from sklearn.datasets import load_digits
from sklearn.neural_network import MLPClassifier
from sklearn.model_selection import train_test_split

# Hyperband の概念を簡易実装で説明
def hyperband_simple(configs, max_iter=81, eta=3):
    """
    Hyperband の簡易デモ
    - configs: パラメータ設定のリスト
    - max_iter: 最大エポック数
    - eta: 打ち切り割合の逆数
    """
    import math
    s_max = int(math.log(max_iter, eta))
    results = []

    print(f"Hyperband: s_max={s_max}, max_iter={max_iter}, eta={eta}")
    for s in range(s_max, -1, -1):
        n = int(math.ceil(len(configs) / max_iter / (s + 1)) * eta ** s)
        r = max_iter * eta ** (-s)
        current_configs = configs[:min(n, len(configs))]

        print(f"\n  ブラケット s={s}: 設定数={len(current_configs)}, 初期イテレーション={r:.0f}")

        for i in range(s + 1):
            n_i = int(n * eta ** (-i))
            r_i = int(r * eta ** i)
            # ここで各設定を r_i エポック訓練し、成績上位 1/eta を残す
            print(f"    ラウンド {i+1}: {len(current_configs)} 設定 × {r_i} iter → 上位 {max(1, n_i//eta)} 設定に絞り込み")
            current_configs = current_configs[:max(1, len(current_configs) // eta)]

    return results

# サンプルパラメータ設定の生成
np.random.seed(42)
sample_configs = [
    {'lr': 10**np.random.uniform(-4, -1), 'hidden': np.random.choice([64, 128, 256])}
    for _ in range(27)
]

hyperband_simple(sample_configs, max_iter=27, eta=3)
```

## チューニングのベストプラクティス

```python
import numpy as np
from sklearn.model_selection import cross_val_score, KFold

# 評価プロセスの正しい設計
# 1. データを train / validation / test に分割（テストは最後まで使わない）
# 2. ハイパーパラメータ探索は train + validation（CV）のみで行う
# 3. 最終評価のみ test を使用する

from sklearn.datasets import load_wine
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

data = load_wine()
# holdout テストセットを先に分離
X_dev, X_test, y_dev, y_test = train_test_split(
    data.data, data.target, test_size=0.2, random_state=42
)

# ハイパーパラメータ候補
param_candidates = [
    {'n_estimators': 100, 'max_depth': 5},
    {'n_estimators': 200, 'max_depth': 10},
    {'n_estimators': 100, 'max_depth': None},
]

# X_dev のみで CV によるパラメータ比較
print("パラメータ比較（CV スコア）:")
best_score, best_params = 0, None
for params in param_candidates:
    model = RandomForestClassifier(**params, random_state=42)
    cv_scores = cross_val_score(model, X_dev, y_dev, cv=5, scoring='accuracy')
    mean_score = cv_scores.mean()
    print(f"  {params}: CV = {mean_score:.4f} ± {cv_scores.std():.4f}")
    if mean_score > best_score:
        best_score, best_params = mean_score, params

# 最適パラメータで全 dev データを使って再学習
final_model = RandomForestClassifier(**best_params, random_state=42)
final_model.fit(X_dev, y_dev)

print(f"\n最終テストスコア: {final_model.score(X_test, y_test):.4f}  ← これが真の性能推定")
print("（テストスコアはパラメータ選択に使わないこと）")
```

## 使用場面

- **アルゴリズム選定後の性能向上**: グリッドサーチ・ランダムサーチは実装が簡単で小〜中規模に適する
- **深層学習モデルの学習率・バッチサイズ調整**: Optuna のベイズ最適化が評価コストの高い場面で有効
- **AutoML パイプライン**: Auto-sklearn・TPOT などがハイパーパラメータ探索を自動化
- **産業応用**: Hyperband・BOHB は計算資源が限られる本番環境で有利
- **Kaggle コンペティション**: CV スコアを目的関数として Optuna で最終モデルをチューニング

## 参考文献

<AffiliateBanner site="ml_intro" />

- Bergstra, J. & Bengio, Y. (2012). Random search for hyper-parameter optimization. *JMLR*, 13, 281–305.
- Akiba, T., et al. (2019). Optuna: A next-generation hyperparameter optimization framework. *KDD*.
- Li, L., et al. (2018). Hyperband: A novel bandit-based approach to hyperparameter optimization. *JMLR*, 18, 1–52.
- [Optuna 公式ドキュメント](https://optuna.readthedocs.io/)
