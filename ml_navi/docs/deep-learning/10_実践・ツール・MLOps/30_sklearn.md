import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Scikit-learn

## Scikit-learnとは

> Scikit-learn（sklearn）は Python の機械学習ライブラリであり、前処理・モデル学習・評価・パイプライン構築を統一されたAPIで提供する。`fit` / `predict` / `transform` という一貫したインターフェースにより、異なるアルゴリズムを簡単に切り替えられる。

## 主要モジュール

| モジュール | 内容 |
|----------|------|
| `preprocessing` | スケーリング・エンコーディング・正規化 |
| `model_selection` | 交差検証・グリッドサーチ・データ分割 |
| `pipeline` | 前処理とモデルの一連の流れを定義 |
| `compose` | ColumnTransformer（列ごとの変換） |
| `metrics` | 評価指標（精度・F1・ROC-AUC など） |
| `linear_model` | 線形回帰・ロジスティック回帰・Ridge など |
| `ensemble` | ランダムフォレスト・GBM など |

## Estimator の統一 API

| メソッド | 用途 |
|---------|------|
| `fit(X, y)` | 学習データでモデルを訓練 |
| `predict(X)` | 学習済みモデルで予測 |
| `transform(X)` | データ変換（前処理器） |
| `fit_transform(X, y)` | 学習と変換を同時に実行 |
| `score(X, y)` | デフォルト評価指標でスコアを返す |

## Python実装

```python
import numpy as np
import pandas as pd
from sklearn.datasets import fetch_california_housing, make_classification
from sklearn.model_selection import (
    train_test_split, cross_val_score, GridSearchCV, StratifiedKFold
)
from sklearn.preprocessing import (
    StandardScaler, MinMaxScaler, OneHotEncoder, LabelEncoder,
    PolynomialFeatures
)
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.svm import SVC
from sklearn.metrics import (
    accuracy_score, classification_report, confusion_matrix,
    roc_auc_score, mean_squared_error, r2_score
)
import warnings
warnings.filterwarnings("ignore")

# ==============================
# データ準備
# ==============================
X, y = make_classification(
    n_samples=1000, n_features=20, n_informative=10,
    n_redundant=5, n_classes=2, random_state=42
)

# 意図的に欠損値と文字列列を追加したサンプルデータ
np.random.seed(42)
n = 500
df = pd.DataFrame({
    "age": np.random.randint(20, 60, n).astype(float),
    "income": np.random.exponential(50000, n),
    "education": np.random.choice(["high_school", "bachelor", "master", "phd"], n),
    "experience": np.random.randint(0, 30, n).astype(float),
    "target": np.random.randint(0, 2, n),
})
# 欠損値を意図的に追加
df.loc[np.random.choice(n, 50, replace=False), "age"] = np.nan
df.loc[np.random.choice(n, 30, replace=False), "income"] = np.nan

# ==============================
# 前処理の定義
# ==============================
numeric_features = ["age", "income", "experience"]
categorical_features = ["education"]

# 数値列: 欠損値を中央値で補完 → 標準化
numeric_transformer = Pipeline([
    ("imputer", SimpleImputer(strategy="median")),
    ("scaler", StandardScaler()),
])

# カテゴリ列: 欠損値をモードで補完 → One-Hot エンコーディング
categorical_transformer = Pipeline([
    ("imputer", SimpleImputer(strategy="most_frequent")),
    ("encoder", OneHotEncoder(drop="first", sparse_output=False)),
])

# ColumnTransformer で列ごとに変換を適用
preprocessor = ColumnTransformer(
    transformers=[
        ("num", numeric_transformer, numeric_features),
        ("cat", categorical_transformer, categorical_features),
    ],
    remainder="drop",
)

# ==============================
# Pipeline の構築
# ==============================
# 前処理 + モデルを一つのパイプラインに
pipeline = Pipeline([
    ("preprocessor", preprocessor),
    ("classifier", RandomForestClassifier(n_estimators=100, random_state=42)),
])

X_df = df.drop("target", axis=1)
y_df = df["target"]
X_train, X_test, y_train, y_test = train_test_split(
    X_df, y_df, test_size=0.2, random_state=42, stratify=y_df
)

pipeline.fit(X_train, y_train)
y_pred = pipeline.predict(X_test)
y_prob = pipeline.predict_proba(X_test)[:, 1]

print("=== モデル評価 ===")
print(f"Accuracy:  {accuracy_score(y_test, y_pred):.4f}")
print(f"ROC-AUC:   {roc_auc_score(y_test, y_prob):.4f}")
print("\n分類レポート:")
print(classification_report(y_test, y_pred))

# ==============================
# cross_val_score
# ==============================
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
cv_scores = cross_val_score(pipeline, X_df, y_df, cv=cv, scoring="roc_auc")
print(f"\n5-fold CV ROC-AUC: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

# ==============================
# GridSearchCV によるハイパーパラメータ探索
# ==============================
param_grid = {
    "classifier__n_estimators": [50, 100],
    "classifier__max_depth": [None, 5, 10],
    "classifier__min_samples_split": [2, 5],
}

grid_search = GridSearchCV(
    pipeline, param_grid, cv=3, scoring="roc_auc",
    n_jobs=-1, verbose=0
)
grid_search.fit(X_train, y_train)

print("\n=== GridSearchCV 結果 ===")
print("最良パラメータ:", grid_search.best_params_)
print(f"CV スコア: {grid_search.best_score_:.4f}")

best_model = grid_search.best_estimator_
y_pred_best = best_model.predict(X_test)
print(f"テスト精度:  {accuracy_score(y_test, y_pred_best):.4f}")

# ==============================
# 複数モデルの比較
# ==============================
models = {
    "Logistic Regression": LogisticRegression(max_iter=1000),
    "Random Forest": RandomForestClassifier(n_estimators=100, random_state=42),
    "Gradient Boosting": GradientBoostingClassifier(random_state=42),
    "SVM": SVC(probability=True),
}

print("\n=== モデル比較（5-fold CV ROC-AUC）===")
for name, model in models.items():
    pipe = Pipeline([("preprocessor", preprocessor), ("classifier", model)])
    scores = cross_val_score(pipe, X_df, y_df, cv=cv, scoring="roc_auc")
    print(f"{name:25s}: {scores.mean():.4f} ± {scores.std():.4f}")

# ==============================
# 特徴量重要度の取得
# ==============================
rf_pipeline = Pipeline([
    ("preprocessor", preprocessor),
    ("classifier", RandomForestClassifier(n_estimators=100, random_state=42)),
])
rf_pipeline.fit(X_train, y_train)

feature_names = (
    numeric_features
    + list(rf_pipeline.named_steps["preprocessor"]
           .named_transformers_["cat"]["encoder"]
           .get_feature_names_out(categorical_features))
)
importances = rf_pipeline.named_steps["classifier"].feature_importances_
feat_imp = pd.Series(importances, index=feature_names).sort_values(ascending=False)
print("\n特徴量重要度:")
print(feat_imp.round(4))
```

## 使用場面

- 機械学習の標準的な前処理からモデル評価までの一連のワークフロー
- 本番環境向けの再現性のある Pipeline 構築
- 複数モデルの比較・ハイパーパラメータ最適化
- 特徴量エンジニアリングとモデルの統合管理

## 参考文献

- Scikit-learn 公式ドキュメント: https://scikit-learn.org/stable/
- Müller, A. C., & Guido, S. (2016). *Introduction to Machine Learning with Python*. O'Reilly.
- Géron, A. (2022). *Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow* (3rd ed.)

<AffiliateBanner site="ml_intro" />
