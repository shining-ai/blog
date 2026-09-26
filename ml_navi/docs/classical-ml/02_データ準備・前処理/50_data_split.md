import AffiliateBanner from '@site/src/components/AffiliateBanner';

# データ分割

機械学習モデルの汎化性能を正しく評価するには、データの分割方法が極めて重要である。誤った分割はデータリークを引き起こし、本番環境では使い物にならないモデルを「高精度」に見せてしまう。本記事では、正しいデータ分割の考え方と実装を解説する。

## データ分割とは

> **データ分割（Data Splitting）** とは、機械学習のプロセスにおいて、学習・モデル選択・最終評価の目的に応じてデータセットを複数の部分集合に分けることである。適切な分割により、モデルが未知のデータに対しても有効であることを（データリークなく）検証できる。

---

## 分割の基本概念

### 3分割の役割

| 分割 | 役割 | 一般的な割合 |
|------|------|------------|
| 訓練データ（Train） | モデルのパラメータを学習する | 60〜70% |
| 検証データ（Validation） | ハイパーパラメータ調整・モデル選択 | 10〜20% |
| テストデータ（Test） | 最終的な汎化性能評価（一度だけ使用） | 10〜20% |

テストデータは最後の一回だけ使用し、繰り返し参照することで生じる「テストセットオーバーフィッティング」を防ぐ。

---

## 基本的な分割

```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import seaborn as sns
from sklearn.model_selection import (
    train_test_split, StratifiedShuffleSplit,
    KFold, StratifiedKFold, TimeSeriesSplit,
    GroupKFold, GroupShuffleSplit
)

np.random.seed(42)
n = 1000

df = pd.DataFrame({
    'feature1': np.random.randn(n),
    'feature2': np.random.randn(n),
    'label':    np.random.choice([0, 1], n, p=[0.7, 0.3]),
    'date':     pd.date_range('2020-01-01', periods=n, freq='D'),
    'user_id':  np.random.randint(1, 101, n),
})

X = df[['feature1', 'feature2']].values
y = df['label'].values
```

### ホールドアウト法

```python
# 訓練・テスト分割
X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,
    random_state=42,
    shuffle=True,
    stratify=y  # クラス比率を保持（重要！）
)

print(f"訓練データ: {len(X_train)} サンプル")
print(f"テストデータ: {len(X_test)} サンプル")
print(f"\n訓練セットのクラス比率: {np.bincount(y_train) / len(y_train)}")
print(f"テストセットのクラス比率: {np.bincount(y_test) / len(y_test)}")

# 検証セットをさらに分割
X_train_final, X_val, y_train_final, y_val = train_test_split(
    X_train, y_train,
    test_size=0.2,
    random_state=42,
    stratify=y_train
)

print(f"\n最終訓練: {len(X_train_final)} / 検証: {len(X_val)} / テスト: {len(X_test)}")
```

---

## データリークの種類と防止

データリークは、テスト時には入手できない情報が訓練データに混入することで生じる。

```python
# === 悪い例: スケーリングでのデータリーク ===
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression

# NG: 全データでfitしてからsplit（テストの情報が訓練に漏れる）
scaler_bad = StandardScaler()
X_scaled_bad = scaler_bad.fit_transform(X)  # 全データで統計量を計算
X_train_bad, X_test_bad, y_train_bad, y_test_bad = train_test_split(
    X_scaled_bad, y, test_size=0.2, random_state=42
)

# OK: splitしてからfitはtrainのみに適用
X_train_ok, X_test_ok, y_train_ok, y_test_ok = train_test_split(
    X, y, test_size=0.2, random_state=42
)
scaler_ok = StandardScaler()
X_train_scaled = scaler_ok.fit_transform(X_train_ok)  # trainのみでfit
X_test_scaled  = scaler_ok.transform(X_test_ok)        # testにはtransformのみ

print("データリーク防止: Pipelineを使うとより安全")


# === Pipeline を使った安全な実装 ===
from sklearn.pipeline import Pipeline

safe_pipeline = Pipeline([
    ('scaler',     StandardScaler()),
    ('classifier', LogisticRegression(random_state=42, max_iter=1000)),
])

# Pipeline は cv の各フォールド内で fit → transform を自動的に適用
from sklearn.model_selection import cross_val_score
scores = cross_val_score(safe_pipeline, X, y, cv=5, scoring='roc_auc')
print(f"Pipeline CV AUC: {scores.mean():.4f} ± {scores.std():.4f}")
```

### よくあるリークのパターン

```python
# パターン1: ターゲットエンコーディングを全データで行う
# → 交差検証の各フォールド内で fit すること

# パターン2: 重複行が訓練・テストに分かれる
# → split 前に重複削除

# パターン3: 時系列データをランダムに split する
# → 未来のデータが過去の学習に混入（後述の時系列分割を使う）

# パターン4: グループデータを無視してsplit する
# → 同一ユーザーが訓練・テストに分かれてしまう（後述のGroupKFoldを使う）

def check_leakage_duplicates(X_train, X_test):
    """訓練・テスト間の重複を確認する"""
    train_df = pd.DataFrame(X_train)
    test_df  = pd.DataFrame(X_test)
    duplicates = pd.merge(train_df, test_df, how='inner')
    print(f"訓練・テスト間の重複行数: {len(duplicates)}")
    return len(duplicates) == 0


check_leakage_duplicates(X_train_ok, X_test_ok)
```

---

## 層化抽出（Stratified Split）

クラス比率がデータ全体と各分割で一致するよう保証する。

```python
sss = StratifiedShuffleSplit(n_splits=1, test_size=0.2, random_state=42)

for train_idx, test_idx in sss.split(X, y):
    X_train_s, X_test_s = X[train_idx], X[test_idx]
    y_train_s, y_test_s = y[train_idx], y[test_idx]

print("層化抽出後のクラス比率確認:")
print(f"  全体:   {np.bincount(y) / len(y)}")
print(f"  訓練:   {np.bincount(y_train_s) / len(y_train_s)}")
print(f"  テスト: {np.bincount(y_test_s) / len(y_test_s)}")
```

---

## 時系列データの分割

時系列データは過去から未来へという方向性があるため、ランダム分割は禁止。

```python
def plot_timeseries_split(dates: pd.Series, n_splits: int = 5) -> None:
    """時系列分割を可視化する"""
    tscv = TimeSeriesSplit(n_splits=n_splits)
    X_dummy = np.arange(len(dates)).reshape(-1, 1)

    fig, ax = plt.subplots(figsize=(12, 5))
    colors = plt.cm.Set1(np.linspace(0, 0.8, n_splits))

    for fold, (train_idx, test_idx) in enumerate(tscv.split(X_dummy)):
        ax.scatter(dates.iloc[train_idx], [fold] * len(train_idx),
                   c='steelblue', marker='|', s=30, alpha=0.5)
        ax.scatter(dates.iloc[test_idx], [fold] * len(test_idx),
                   c='coral', marker='|', s=30, alpha=0.8)

    train_patch = mpatches.Patch(color='steelblue', label='訓練')
    test_patch  = mpatches.Patch(color='coral',     label='テスト')
    ax.legend(handles=[train_patch, test_patch])
    ax.set_yticks(range(n_splits))
    ax.set_yticklabels([f'Fold {i+1}' for i in range(n_splits)])
    ax.set_xlabel('日付')
    ax.set_title('TimeSeriesSplit の分割パターン')
    plt.tight_layout()
    plt.savefig('timeseries_split.png', bbox_inches='tight')
    plt.show()


plot_timeseries_split(df['date'])

# 実際の時系列 CV
tscv = TimeSeriesSplit(n_splits=5, gap=0)
X_ts = df[['feature1', 'feature2']].values

fold_scores = []
for fold, (train_idx, test_idx) in enumerate(tscv.split(X_ts)):
    clf = LogisticRegression(random_state=42, max_iter=1000)
    clf.fit(X_ts[train_idx], y[train_idx])
    score = clf.score(X_ts[test_idx], y[test_idx])
    fold_scores.append(score)
    print(f"Fold {fold+1}: train={len(train_idx)}, test={len(test_idx)}, acc={score:.4f}")

print(f"\n時系列 CV 平均精度: {np.mean(fold_scores):.4f}")
```

### 時系列での注意点

```python
# ギャップ（Gap）の設定：予測対象期間の直前データをtrainから除外
tscv_gap = TimeSeriesSplit(n_splits=5, gap=30)  # 30日のギャップ

# ウォークフォワード検証（拡張窓）
print("\nウォークフォワード分割パターン:")
for fold, (train_idx, test_idx) in enumerate(TimeSeriesSplit(n_splits=4).split(X_ts)):
    print(f"  Fold {fold+1}: 訓練 {train_idx[0]}〜{train_idx[-1]} | テスト {test_idx[0]}〜{test_idx[-1]}")
```

---

## グループデータの分割

同一ユーザー・患者・地域のデータが訓練・テストに分かれることを防ぐ。

```python
groups = df['user_id'].values

# GroupKFold: ユーザー単位で分割
gkf = GroupKFold(n_splits=5)
print("GroupKFold の分割確認（ユーザーIDが重複しないこと）:")

for fold, (train_idx, test_idx) in enumerate(gkf.split(X, y, groups)):
    train_users = set(groups[train_idx])
    test_users  = set(groups[test_idx])
    overlap     = train_users & test_users
    print(f"  Fold {fold+1}: 訓練ユーザー数={len(train_users)}, "
          f"テストユーザー数={len(test_users)}, 重複={len(overlap)}")


# GroupShuffleSplit: ランダムなグループ分割（CV ではなく単純な train/test 分割）
gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
for train_idx, test_idx in gss.split(X, y, groups):
    print(f"\nGroupShuffleSplit: train={len(train_idx)}, test={len(test_idx)}")
```

---

## 分割方法の比較

```python
def compare_split_strategies(X, y, groups=None):
    """各分割戦略の CV スコアを比較する"""
    from sklearn.model_selection import cross_val_score

    clf = LogisticRegression(random_state=42, max_iter=1000)
    strategies = {
        'KFold': KFold(n_splits=5, shuffle=True, random_state=42),
        'StratifiedKFold': StratifiedKFold(n_splits=5, shuffle=True, random_state=42),
    }

    print("分割戦略の比較 (AUC-ROC):")
    for name, cv in strategies.items():
        scores = cross_val_score(clf, X, y, cv=cv, scoring='roc_auc')
        print(f"  {name:20s}: {scores.mean():.4f} ± {scores.std():.4f}")


compare_split_strategies(X, y, groups)
```

---

## データ分割のベストプラクティス

| ルール | 理由 |
|-------|------|
| テストデータは最後の一回だけ使う | 繰り返し参照するとテストデータに過学習する |
| 分類では `stratify=y` を使う | 偶然クラス比率が偏るのを防ぐ |
| Pipeline でスケーリング・補完を包む | 各 CV フォールド内でのデータリークを防ぐ |
| 時系列は必ず時間順に分割する | 未来の情報が過去の学習に混入するのを防ぐ |
| グループデータは GroupKFold を使う | 同一グループがリークするのを防ぐ |
| 乱数シードを固定する | 再現性を確保する |

---

## 使用場面

- **ハイパーパラメータ探索**: 検証セットを使ってチューニングし、テストセットでのみ最終評価
- **特徴量エンジニアリングの評価**: Pipeline + CV で特徴量変換がリークしていないか確認
- **医療データ**: 患者 ID によるグループ分割が必須（同一患者の複数サンプルをリークさせない）
- **金融データ**: 時系列分割と適切なギャップ設定が必須

---

## 参考文献

- Raschka, S. (2018). Model Evaluation, Model Selection, and Algorithm Selection in Machine Learning. *arXiv:1811.12808*.
- scikit-learn. *Cross-validation: evaluating estimator performance*. https://scikit-learn.org/stable/modules/cross_validation.html
- Kaufman, S., et al. (2012). Leakage in Data Mining: Formulation, Detection, and Avoidance. *TKDD*, 6(4).

<AffiliateBanner site="ml_intro" />
