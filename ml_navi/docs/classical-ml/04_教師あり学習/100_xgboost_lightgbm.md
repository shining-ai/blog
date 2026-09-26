import AffiliateBanner from '@site/src/components/AffiliateBanner';

# XGBoost / LightGBM

## XGBoost / LightGBMとは

XGBoost / LightGBMとは、

> 勾配ブースティング（Gradient Boosting）を高速化・高精度化した決定木アンサンブルライブラリであり、Kaggle コンペや産業応用で最も広く使われる機械学習アルゴリズムのひとつ

です。

XGBoost（eXtreme Gradient Boosting）は Chen & Guestrin (2016) が提案し、その後 Microsoft が LightGBM を開発してさらなる高速化を実現しました。

## XGBoost と LightGBM の比較

| 特性 | XGBoost | LightGBM |
|------|---------|----------|
| 木の成長方向 | Level-wise（深さ優先） | Leaf-wise（損失削減優先） |
| ヒストグラム法 | あり（v1.0+） | デフォルト |
| カテゴリ変数 | 手動でエンコード | ネイティブサポート |
| 大規模データ | 良好 | より高速 |
| メモリ使用量 | 中 | 少ない |
| GPU サポート | あり | あり |
| 正則化 | L1, L2 | L1, L2 |

## 基本的な使い方

```python
import numpy as np
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score

data = load_breast_cancer()
X_train, X_test, y_train, y_test = train_test_split(
    data.data, data.target, test_size=0.2, random_state=42
)

# XGBoost
try:
    import xgboost as xgb

    xgb_model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        use_label_encoder=False,
        eval_metric='logloss',
        random_state=42
    )
    xgb_model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False
    )
    xgb_pred = xgb_model.predict(X_test)
    xgb_prob = xgb_model.predict_proba(X_test)[:, 1]
    print(f"XGBoost  精度: {accuracy_score(y_test, xgb_pred):.4f}, AUC: {roc_auc_score(y_test, xgb_prob):.4f}")
except ImportError:
    print("xgboost が未インストールです。pip install xgboost でインストールしてください。")

# LightGBM
try:
    import lightgbm as lgb

    lgb_model = lgb.LGBMClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        verbose=-1
    )
    lgb_model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
    )
    lgb_pred = lgb_model.predict(X_test)
    lgb_prob = lgb_model.predict_proba(X_test)[:, 1]
    print(f"LightGBM 精度: {accuracy_score(y_test, lgb_pred):.4f}, AUC: {roc_auc_score(y_test, lgb_prob):.4f}")
except ImportError:
    print("lightgbm が未インストールです。pip install lightgbm でインストールしてください。")
```

## ヒストグラム法と Leaf-wise 成長

LightGBM の高速化の鍵となる 2 つの技術を概念的に説明します。

```python
import numpy as np

# ヒストグラム法の概念: 連続値を離散ビンにまとめてしきい値探索を高速化
def histogram_split_demo(values: np.ndarray, n_bins: int = 255):
    """
    ヒストグラム法による分割点探索のデモ
    通常の方法: O(n) の候補点を総当たり
    ヒストグラム法: O(n_bins) の探索で済む
    """
    min_v, max_v = values.min(), values.max()
    bins = np.linspace(min_v, max_v, n_bins + 1)
    hist, edges = np.histogram(values, bins=bins)

    print(f"データ点数: {len(values)}")
    print(f"通常の分割点候補数: {len(values) - 1}")
    print(f"ヒストグラム法の候補数: {n_bins}  (削減率: {(len(values)-1)/n_bins:.1f}x)")
    return hist, edges

np.random.seed(42)
data_values = np.random.randn(100_000)
hist, edges = histogram_split_demo(data_values)

# Leaf-wise vs Level-wise の違い
print("\n=== 木の成長戦略の比較 ===")
print("Level-wise (XGBoost デフォルト):")
print("  - 同一深さのすべてのノードを展開してから次の深さへ")
print("  - 過学習しにくい・安定した結果")
print("  - バランスの取れた木")
print("\nLeaf-wise (LightGBM デフォルト):")
print("  - 損失削減量が最大の葉のみを選んで展開")
print("  - 少ない木数で高精度を達成しやすい")
print("  - 浅いデータで過学習しやすい → num_leaves で制御")
```

## 正則化パラメータ

```python
try:
    import lightgbm as lgb
    import numpy as np
    from sklearn.datasets import load_boston  # type: ignore
    from sklearn.model_selection import cross_val_score, train_test_split
    from sklearn.metrics import mean_squared_error
    import warnings

    np.random.seed(42)
    # 回帰データでの正則化効果を確認
    from sklearn.datasets import fetch_california_housing
    housing = fetch_california_housing()
    X_train, X_test, y_train, y_test = train_test_split(
        housing.data, housing.target, test_size=0.2, random_state=42
    )

    print("LightGBM 正則化パラメータの比較（California Housing）:")
    print(f"{'設定':>30} {'RMSE':>8}")
    print('-' * 42)

    configs = {
        '正則化なし':              {'reg_alpha': 0.0, 'reg_lambda': 0.0, 'min_child_samples': 1},
        'L1正則化 (alpha=1.0)':   {'reg_alpha': 1.0, 'reg_lambda': 0.0},
        'L2正則化 (lambda=1.0)':  {'reg_alpha': 0.0, 'reg_lambda': 1.0},
        'min_child_samples=50':   {'reg_alpha': 0.1, 'reg_lambda': 0.1, 'min_child_samples': 50},
    }

    for config_name, params in configs.items():
        model = lgb.LGBMRegressor(
            n_estimators=100, learning_rate=0.1, random_state=42, verbose=-1, **params
        )
        model.fit(X_train, y_train)
        rmse = np.sqrt(mean_squared_error(y_test, model.predict(X_test)))
        print(f"{config_name:>30} {rmse:>8.4f}")

except ImportError:
    print("lightgbm が未インストールのためスキップ")
```

## カテゴリ変数の扱い

```python
import numpy as np
import pandas as pd

# LightGBM はカテゴリ変数をネイティブに処理できる
try:
    import lightgbm as lgb
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score

    np.random.seed(42)
    n = 1000

    # カテゴリ変数を含むデータの生成
    df = pd.DataFrame({
        'age':      np.random.randint(18, 70, n),
        'income':   np.random.exponential(50000, n),
        'city':     np.random.choice(['Tokyo', 'Osaka', 'Nagoya', 'Sapporo'], n),
        'job_type': np.random.choice(['正社員', '契約社員', 'パート', 'フリーランス'], n),
    })
    # 目的変数（ローン承認: 年収と都市に依存）
    df['approved'] = ((df['income'] > 40000) & (df['city'].isin(['Tokyo', 'Osaka']))).astype(int)

    X = df.drop('approved', axis=1)
    y = df['approved']

    # カテゴリ列を category 型に変換
    cat_cols = ['city', 'job_type']
    X[cat_cols] = X[cat_cols].astype('category')

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = lgb.LGBMClassifier(n_estimators=100, random_state=42, verbose=-1)
    model.fit(X_train, y_train)
    print(f"LightGBM（カテゴリ変数ネイティブ処理）精度: {accuracy_score(y_test, model.predict(X_test)):.4f}")

    # 特徴量重要度
    importance = pd.Series(model.feature_importances_, index=X.columns)
    print("\n特徴量重要度:")
    for feat, imp in importance.sort_values(ascending=False).items():
        print(f"  {feat}: {imp}")

except ImportError:
    print("lightgbm が未インストールのためスキップ")
```

## 実務での使い方

```python
try:
    import lightgbm as lgb
    import numpy as np
    from sklearn.datasets import load_breast_cancer
    from sklearn.model_selection import StratifiedKFold
    from sklearn.metrics import roc_auc_score

    data = load_breast_cancer()
    X, y = data.data, data.target

    # 早期停止（Early Stopping）を使ったトレーニング
    X_train, X_val = X[:400], X[400:]
    y_train, y_val = y[:400], y[400:]

    model = lgb.LGBMClassifier(
        n_estimators=1000,       # 多めに設定しておく
        learning_rate=0.05,
        num_leaves=31,
        random_state=42,
        verbose=-1
    )

    callbacks = [lgb.early_stopping(stopping_rounds=50, verbose=False),
                 lgb.log_evaluation(period=-1)]

    model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        callbacks=callbacks,
    )

    print(f"最適な木の数（早期停止）: {model.best_iteration_}")
    print(f"検証 AUC: {roc_auc_score(y_val, model.predict_proba(X_val)[:, 1]):.4f}")

    # Out-of-Fold 予測（Kaggle でよく使われる手法）
    print("\nOut-of-Fold (OOF) 予測:")
    oof_preds = np.zeros(len(X))
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    for fold, (train_idx, val_idx) in enumerate(skf.split(X, y)):
        fold_model = lgb.LGBMClassifier(n_estimators=100, random_state=42, verbose=-1)
        fold_model.fit(X[train_idx], y[train_idx])
        oof_preds[val_idx] = fold_model.predict_proba(X[val_idx])[:, 1]
        print(f"  Fold {fold+1}: AUC = {roc_auc_score(y[val_idx], oof_preds[val_idx]):.4f}")

    print(f"OOF AUC（全体）: {roc_auc_score(y, oof_preds):.4f}")

except ImportError:
    print("lightgbm が未インストールのためスキップ")
```

## 使用場面

- **Kaggle・データ分析コンペ**: 表形式データのデファクトスタンダード。多くの上位解法で採用
- **不正検知**: 高次元かつ不均衡データでの二値分類
- **広告クリック予測**: 大規模カテゴリ変数を含むデータ
- **金融リスク評価**: 解釈可能性が求められる場面での SHAP 値との組み合わせ
- **センサーデータの異常検知**: 時系列特徴量を手動抽出して分類/回帰に適用

## 参考文献

<AffiliateBanner site="ml_intro" />

- Chen, T. & Guestrin, C. (2016). XGBoost: A scalable tree boosting system. *KDD*, 785–794.
- Ke, G., et al. (2017). LightGBM: A highly efficient gradient boosting decision tree. *NeurIPS*.
- [XGBoost 公式ドキュメント](https://xgboost.readthedocs.io/)
- [LightGBM 公式ドキュメント](https://lightgbm.readthedocs.io/)
