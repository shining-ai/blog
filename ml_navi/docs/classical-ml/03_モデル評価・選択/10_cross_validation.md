import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 交差検証

テストセットを一度だけ使う単純なホールドアウト法では、データの分割方法によって評価結果が大きく変動することがある。交差検証はデータをより効率的に使い、より信頼性の高い性能評価を実現する手法である。

## 交差検証とは

> **交差検証（Cross-Validation, CV）** とは、データを複数の部分集合（フォールド）に分割し、フォールドを順番に検証セットとして使いながら残りで訓練することを繰り返す評価手法である。全サンプルが一度は検証セットになるため、ホールドアウト法に比べてモデル性能の推定が安定する。

---

## K-Fold 交差検証

```python
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import (
    KFold, StratifiedKFold, LeaveOneOut, LeavePOut,
    RepeatedStratifiedKFold, GroupKFold, TimeSeriesSplit,
    cross_val_score, cross_validate
)
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import roc_auc_score

# サンプルデータ（乳癌データセット）
data = load_breast_cancer()
X, y = data.data, data.target
print(f"データ形状: {X.shape}, クラス比率: {np.bincount(y)}")
```

### K-Fold の仕組み

```python
def visualize_kfold(X, y, cv, title: str) -> None:
    """KFold の分割パターンを可視化する"""
    fig, ax = plt.subplots(figsize=(12, 4))

    n_splits = cv.get_n_splits(X, y)
    colors = {'訓練': 'steelblue', '検証': 'coral'}

    for fold, (train_idx, val_idx) in enumerate(cv.split(X, y)):
        ax.scatter(train_idx, [fold] * len(train_idx),
                   c='steelblue', marker='s', s=2, alpha=0.5)
        ax.scatter(val_idx, [fold] * len(val_idx),
                   c='coral', marker='s', s=2, alpha=0.9)

    patches = [mpatches.Patch(color=c, label=l) for l, c in colors.items()]
    ax.legend(handles=patches, loc='upper right')
    ax.set_yticks(range(n_splits))
    ax.set_yticklabels([f'Fold {i+1}' for i in range(n_splits)])
    ax.set_xlabel('サンプルインデックス')
    ax.set_title(title)
    plt.tight_layout()
    plt.savefig(f'cv_{title}.png', bbox_inches='tight')
    plt.show()


visualize_kfold(X, y, KFold(n_splits=5, shuffle=True, random_state=42), 'K-Fold (k=5)')
```

### 基本的な KFold CV

```python
clf_pipeline = Pipeline([
    ('scaler', StandardScaler()),
    ('clf',    LogisticRegression(random_state=42, max_iter=1000)),
])

kf = KFold(n_splits=5, shuffle=True, random_state=42)
scores = cross_val_score(clf_pipeline, X, y, cv=kf, scoring='roc_auc')

print(f"K-Fold CV (k=5)")
print(f"  各フォールド AUC: {scores.round(4)}")
print(f"  平均 AUC: {scores.mean():.4f}")
print(f"  標準偏差: {scores.std():.4f}")
print(f"  95% CI: [{scores.mean() - 1.96*scores.std():.4f}, "
      f"{scores.mean() + 1.96*scores.std():.4f}]")
```

---

## 層化 K-Fold（Stratified K-Fold）

各フォールドでクラス比率が元のデータと一致するよう保証する。不均衡データで特に重要。

```python
skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
scores_skf = cross_val_score(clf_pipeline, X, y, cv=skf, scoring='roc_auc')

print(f"\nStratified K-Fold CV (k=5)")
print(f"  平均 AUC: {scores_skf.mean():.4f}")
print(f"  標準偏差: {scores_skf.std():.4f}")

# 各フォールドのクラス比率確認
print("\n各フォールドのクラス比率:")
for fold, (train_idx, val_idx) in enumerate(skf.split(X, y)):
    pos_ratio = y[val_idx].mean()
    print(f"  Fold {fold+1}: 検証セットの陽性率 = {pos_ratio:.3f}")
```

---

## 繰り返し交差検証（Repeated CV）

KFold を複数回繰り返し、乱数の影響を平均化する。

```python
rskf = RepeatedStratifiedKFold(n_splits=5, n_repeats=10, random_state=42)
scores_rskf = cross_val_score(clf_pipeline, X, y, cv=rskf, scoring='roc_auc')

print(f"\nRepeated Stratified K-Fold (5x10=50 回)")
print(f"  平均 AUC: {scores_rskf.mean():.4f}")
print(f"  標準偏差: {scores_rskf.std():.4f}")
print(f"  推定の安定性: std比較 KFold={scores_skf.std():.4f} vs Repeated={scores_rskf.std():.4f}")
```

---

## Leave-One-Out CV（LOO-CV）

k = n（全サンプル数）の極端な形。各サンプルが一度ずつ検証セットになる。

```python
# LOO は計算コストが高いため小さなデータセットで実施
X_small, y_small = X[:50], y[:50]

loo = LeaveOneOut()
scores_loo = cross_val_score(clf_pipeline, X_small, y_small, cv=loo, scoring='accuracy')

print(f"\nLeave-One-Out CV (n=50)")
print(f"  平均精度: {scores_loo.mean():.4f}")
print(f"  評価回数: {len(scores_loo)}")
print(f"  各評価のスコアは 0 or 1 の二値（1サンプルのみ検証）")
```

| 手法 | 分割数 | 計算コスト | 適用場面 |
|------|-------|-----------|---------|
| K-Fold | k（通常5〜10） | 中程度 | 一般的な設定 |
| Stratified K-Fold | k | 中程度 | 分類タスク全般 |
| LOO-CV | n | 高 | データが極端に少ない場合 |
| Repeated CV | k × 繰り返し数 | 高 | 評価の安定性が重要な場合 |

---

## cross_validate による詳細な評価

`cross_val_score` は1指標のみだが、`cross_validate` は複数指標・訓練スコアも取得できる。

```python
from sklearn.metrics import make_scorer, f1_score, average_precision_score

cv_results = cross_validate(
    clf_pipeline,
    X, y,
    cv=StratifiedKFold(5, shuffle=True, random_state=42),
    scoring={
        'AUC':       'roc_auc',
        'F1':        'f1',
        'Accuracy':  'accuracy',
        'AP':        'average_precision',
    },
    return_train_score=True,
    return_estimator=True,
)

print("\ncross_validate の詳細結果:")
for metric in ['AUC', 'F1', 'Accuracy', 'AP']:
    train = cv_results[f'train_{metric}']
    val   = cv_results[f'test_{metric}']
    print(f"  {metric:10s}: 訓練={train.mean():.4f}±{train.std():.4f}  "
          f"検証={val.mean():.4f}±{val.std():.4f}")

# 訓練スコアと検証スコアのギャップで過学習を診断
print(f"\n  ギャップ (過学習の指標):")
print(f"  AUC ギャップ: {cv_results['train_AUC'].mean() - cv_results['test_AUC'].mean():.4f}")
```

---

## 時系列データでの交差検証

時系列では「未来のデータが過去の学習に使われない」ことを保証する必要がある。

```python
# 時系列データのシミュレーション
np.random.seed(42)
n_ts = 300
X_ts = np.random.randn(n_ts, 5)
y_ts = (X_ts[:, 0] + 0.5 * X_ts[:, 1] + np.random.randn(n_ts) * 0.5 > 0).astype(int)

tscv = TimeSeriesSplit(n_splits=5, gap=0)
scores_ts = cross_val_score(clf_pipeline, X_ts, y_ts, cv=tscv, scoring='roc_auc')

print(f"\nTimeSeriesSplit CV (k=5)")
print(f"  各フォールド AUC: {scores_ts.round(4)}")
print(f"  平均 AUC: {scores_ts.mean():.4f}")
print(f"  標準偏差: {scores_ts.std():.4f}")

print("\n各フォールドのサンプル数:")
for fold, (tr_idx, val_idx) in enumerate(tscv.split(X_ts)):
    print(f"  Fold {fold+1}: 訓練={len(tr_idx)}, 検証={len(val_idx)}")
```

---

## k の選び方

```python
def compare_k_values(X, y, k_values=[3, 5, 10, 20]):
    """k の値が評価結果に与える影響を確認する"""
    results = []
    for k in k_values:
        cv = StratifiedKFold(n_splits=k, shuffle=True, random_state=42)
        scores = cross_val_score(clf_pipeline, X, y, cv=cv, scoring='roc_auc')
        results.append({
            'k': k,
            '平均AUC': scores.mean(),
            '標準偏差': scores.std(),
            '評価回数': k,
            '検証サイズ(%)': round(100 / k, 1),
        })

    print("k の値による比較:")
    print(pd.DataFrame(results).to_string(index=False))


compare_k_values(X, y)
```

**k の選択ガイドライン:**

| データ量 | 推奨 k |
|---------|-------|
| < 100 | LOO-CV or k=10 |
| 100〜1000 | k=10 |
| 1000〜10000 | k=5 |
| > 10000 | k=3〜5（計算コスト削減） |

---

## ネスト交差検証（Nested CV）

ハイパーパラメータチューニングと性能評価を分離し、過楽観的な評価を防ぐ。

```python
from sklearn.model_selection import GridSearchCV

# 外側ループ：性能評価
# 内側ループ：ハイパーパラメータ選択
outer_cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
inner_cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)

param_grid = {'clf__C': [0.01, 0.1, 1.0, 10.0]}

nested_scores = []
for fold, (train_idx, test_idx) in enumerate(outer_cv.split(X, y)):
    X_tr, X_te = X[train_idx], X[test_idx]
    y_tr, y_te = y[train_idx], y[test_idx]

    # 内側 CV でハイパーパラメータ選択
    gs = GridSearchCV(clf_pipeline, param_grid, cv=inner_cv, scoring='roc_auc')
    gs.fit(X_tr, y_tr)

    # 外側 CV でスコア評価
    score = roc_auc_score(y_te, gs.predict_proba(X_te)[:, 1])
    nested_scores.append(score)
    print(f"Fold {fold+1}: best C={gs.best_params_['clf__C']}, AUC={score:.4f}")

print(f"\nNested CV 平均 AUC: {np.mean(nested_scores):.4f} ± {np.std(nested_scores):.4f}")
```

---

## 使用場面

- **モデル選択**: 複数のモデルを比較するとき、単一の train/test 分割より信頼性が高い評価が得られる
- **ハイパーパラメータチューニング**: GridSearch/RandomSearch のスコアとして CV を使う（ネスト CV を推奨）
- **特徴量選択**: 特徴量の有無によるスコア変化を CV で安定的に比較する
- **データが少ない場合**: LOO-CV または k=10 の Stratified CV で評価する

---

## 参考文献

- Kohavi, R. (1995). A study of cross-validation and bootstrap for accuracy estimation and model selection. *IJCAI*, 14(2), 1137-1145.
- Arlot, S., & Celisse, A. (2010). A survey of cross-validation procedures for model selection. *Statistics Surveys*, 4, 40-79.
- scikit-learn. *Cross-validation: evaluating estimator performance*. https://scikit-learn.org/stable/modules/cross_validation.html

<AffiliateBanner site="ml_intro" />
