import AffiliateBanner from '@site/src/components/AffiliateBanner';

# スタッキング

## スタッキングとは

スタッキングとは、

> 複数の異なるモデル（Level-0 学習器）の予測を特徴量として、メタ学習器（Level-1）が最終予測を行うアンサンブル手法であり、各モデルの強みを組み合わせて汎化性能を向上させる

です。

単純な多数決（バギング）や加重平均（ブースティング）と異なり、スタッキングは「どのモデルをどの程度信頼するか」をデータから自動的に学習します。

## アンサンブル手法の比較

| 手法 | 仕組み | 特徴 | 代表例 |
|------|--------|------|--------|
| バギング | 並列学習・平均集約 | 分散を低減 | ランダムフォレスト |
| ブースティング | 逐次学習・重み付き集約 | バイアスを低減 | XGBoost・LightGBM |
| スタッキング | Level-0 予測をメタ特徴に変換 | バイアス・分散を両方低減 | StackingClassifier |
| ブレンディング | holdout セットで重み学習 | 実装が簡単だがデータ効率が低い | 手動加重平均 |

## Level-0 / Level-1 の構造

```
[入力特徴量]
     │
     ├── [Level-0 モデル 1: ロジスティック回帰]─── 予測1
     ├── [Level-0 モデル 2: ランダムフォレスト]─── 予測2
     ├── [Level-0 モデル 3: SVM]───────────────── 予測3
     └── [Level-0 モデル 4: GBT]───────────────── 予測4
                                                      │
                                      [Level-1 メタ学習器]
                                               │
                                          [最終予測]
```

## Out-of-Fold によるメタ特徴の生成

データリークを防ぐために、Level-0 の予測には Out-of-Fold (OOF) 予測を使います。

```python
import numpy as np
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import KFold, train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import roc_auc_score

data = load_breast_cancer()
X, y = data.data, data.target

# train / test に分割（test はスタッキング全体の最終評価のみに使用）
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Level-0 モデルの定義
level0_models = {
    'LogisticRegression': Pipeline([('sc', StandardScaler()),
                                     ('clf', LogisticRegression(max_iter=1000, random_state=42))]),
    'RandomForest':        RandomForestClassifier(n_estimators=100, random_state=42),
    'GradientBoosting':    GradientBoostingClassifier(n_estimators=100, random_state=42),
    'SVM':                 Pipeline([('sc', StandardScaler()),
                                     ('clf', SVC(probability=True, random_state=42))]),
}

n_splits = 5
kf = KFold(n_splits=n_splits, shuffle=True, random_state=42)

# OOF メタ特徴行列の初期化
oof_meta_train = np.zeros((len(X_train), len(level0_models)))
meta_test      = np.zeros((len(X_test), len(level0_models)))

print("=== Level-0: OOF メタ特徴の生成 ===")
for col_idx, (name, model) in enumerate(level0_models.items()):
    fold_test_preds = np.zeros((len(X_test), n_splits))

    for fold, (train_idx, val_idx) in enumerate(kf.split(X_train, y_train)):
        model.fit(X_train[train_idx], y_train[train_idx])
        oof_meta_train[val_idx, col_idx] = model.predict_proba(X_train[val_idx])[:, 1]
        fold_test_preds[:, fold] = model.predict_proba(X_test)[:, 1]

    meta_test[:, col_idx] = fold_test_preds.mean(axis=1)
    oof_auc = roc_auc_score(y_train, oof_meta_train[:, col_idx])
    print(f"  {name:<22}: OOF AUC = {oof_auc:.4f}")

# Level-1 メタ学習器の学習
print("\n=== Level-1: メタ学習器 ===")
meta_learner = LogisticRegression(C=1.0, random_state=42)
meta_learner.fit(oof_meta_train, y_train)

stacking_pred = meta_learner.predict_proba(meta_test)[:, 1]
stacking_auc = roc_auc_score(y_test, stacking_pred)
print(f"スタッキング最終 AUC: {stacking_auc:.4f}")

# 各 Level-0 モデルとの比較
print("\n=== 比較: 単体 vs スタッキング ===")
for col_idx, name in enumerate(level0_models.keys()):
    single_auc = roc_auc_score(y_test, meta_test[:, col_idx])
    print(f"  {name:<22}: {single_auc:.4f}")
print(f"  {'スタッキング':<22}: {stacking_auc:.4f}")
```

## sklearn の StackingClassifier

```python
import numpy as np
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import (StackingClassifier, RandomForestClassifier,
                               GradientBoostingClassifier)
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import roc_auc_score

data = load_breast_cancer()
X_train, X_test, y_train, y_test = train_test_split(
    data.data, data.target, test_size=0.2, random_state=42
)

# Level-0 推定器
estimators = [
    ('rf',  RandomForestClassifier(n_estimators=100, random_state=42)),
    ('gb',  GradientBoostingClassifier(n_estimators=100, random_state=42)),
    ('svm', Pipeline([('sc', StandardScaler()),
                      ('clf', SVC(probability=True, random_state=42))])),
]

# StackingClassifier（内部で OOF 予測を自動的に行う）
stacking = StackingClassifier(
    estimators=estimators,
    final_estimator=LogisticRegression(random_state=42),
    cv=5,
    passthrough=False,  # True にすると元の特徴量もメタ特徴に追加
    n_jobs=-1
)

stacking.fit(X_train, y_train)
stacking_auc = roc_auc_score(y_test, stacking.predict_proba(X_test)[:, 1])
print(f"StackingClassifier AUC: {stacking_auc:.4f}")

# passthrough=True との比較
stacking_pt = StackingClassifier(
    estimators=estimators,
    final_estimator=LogisticRegression(random_state=42),
    cv=5,
    passthrough=True,
    n_jobs=-1
)
stacking_pt.fit(X_train, y_train)
pt_auc = roc_auc_score(y_test, stacking_pt.predict_proba(X_test)[:, 1])
print(f"StackingClassifier (passthrough=True) AUC: {pt_auc:.4f}")
```

## ブレンディングとの違い

```python
import numpy as np
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import roc_auc_score

data = load_breast_cancer()
X, y = data.data, data.target

# ブレンディング: データを train / blend / test に 3 分割
X_train, X_temp, y_train, y_temp = train_test_split(X, y, test_size=0.4, random_state=42)
X_blend, X_test, y_blend, y_test = train_test_split(X_temp, y_temp, test_size=0.5, random_state=42)

print(f"データ分割: train={len(X_train)}, blend={len(X_blend)}, test={len(X_test)}")

level0_models = [
    RandomForestClassifier(n_estimators=100, random_state=42),
    GradientBoostingClassifier(n_estimators=100, random_state=42),
    Pipeline([('sc', StandardScaler()), ('clf', SVC(probability=True, random_state=42))]),
]

# Level-0: train で学習 → blend に予測
blend_meta = np.column_stack([
    m.fit(X_train, y_train).predict_proba(X_blend)[:, 1]
    for m in level0_models
])
test_meta = np.column_stack([
    m.predict_proba(X_test)[:, 1]
    for m in level0_models
])

# Level-1: blend で学習
meta = LogisticRegression(random_state=42)
meta.fit(blend_meta, y_blend)
blending_auc = roc_auc_score(y_test, meta.predict_proba(test_meta)[:, 1])
print(f"ブレンディング AUC: {blending_auc:.4f}")

print("\n【スタッキング vs ブレンディングの比較】")
print("スタッキング:")
print("  + データを有効活用（OOF で全データを利用）")
print("  + 汎化性能が高い")
print("  - 実装が複雑")
print("\nブレンディング:")
print("  + 実装が簡単")
print("  + データリークのリスクが少ない")
print("  - データ分割でサンプル数が減る")
```

## 多層スタッキング

```python
import numpy as np
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import KFold, train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.metrics import roc_auc_score

def oof_predictions(models, X_train, y_train, X_test, n_splits=5):
    """複数モデルの OOF 予測を返す"""
    kf = KFold(n_splits=n_splits, shuffle=True, random_state=42)
    oof = np.zeros((len(X_train), len(models)))
    test_preds = np.zeros((len(X_test), len(models)))

    for i, model in enumerate(models):
        fold_test = np.zeros((len(X_test), n_splits))
        for fold, (tr_idx, val_idx) in enumerate(kf.split(X_train)):
            model.fit(X_train[tr_idx], y_train[tr_idx])
            oof[val_idx, i] = model.predict_proba(X_train[val_idx])[:, 1]
            fold_test[:, fold] = model.predict_proba(X_test)[:, 1]
        test_preds[:, i] = fold_test.mean(axis=1)

    return oof, test_preds

data = load_breast_cancer()
X_train, X_test, y_train, y_test = train_test_split(
    data.data, data.target, test_size=0.2, random_state=42
)

# Layer 1
layer1_models = [
    RandomForestClassifier(n_estimators=50, random_state=42),
    GradientBoostingClassifier(n_estimators=50, random_state=42),
    GaussianNB(),
]
layer1_oof, layer1_test = oof_predictions(layer1_models, X_train, y_train, X_test)

# Layer 2
layer2_models = [
    LogisticRegression(random_state=42),
    RandomForestClassifier(n_estimators=50, random_state=1),
]
layer2_oof, layer2_test = oof_predictions(layer2_models, layer1_oof, y_train, layer1_test)

# Layer 3（最終メタ学習器）
final_meta = LogisticRegression(random_state=42)
final_meta.fit(layer2_oof, y_train)
final_pred = final_meta.predict_proba(layer2_test)[:, 1]
print(f"3層スタッキング AUC: {roc_auc_score(y_test, final_pred):.4f}")
```

## 使用場面

- **Kaggle・コンペ上位解法**: 複数のモデルを組み合わせることで単体モデルを超える精度を目指す
- **アンサンブルで性能改善**: 単体モデルが頭打ちになったとき最後の一手として利用
- **多様なモデルの組み合わせ**: 線形モデル・ツリー系・NN など異なる帰納バイアスのモデルをまとめる
- **異なる特徴量セットの統合**: 特徴量エンジニアリングの異なるバージョンを Level-0 に投入

## 参考文献

<AffiliateBanner site="ml_intro" />

- Wolpert, D.H. (1992). Stacked generalization. *Neural Networks*, 5(2), 241–259.
- Breiman, L. (1996). Stacked regressions. *Machine Learning*, 24, 49–64.
- [scikit-learn: StackingClassifier](https://scikit-learn.org/stable/modules/ensemble.html#stacked-generalization)
- Džeroski, S. & Ženko, B. (2004). Is combining classifiers with stacking better than selecting the best one? *Machine Learning*, 54, 255–273.
