import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 欠損値処理

実務のデータには必ず欠損値が含まれる。欠損値をどう扱うかは、モデルの精度と偏りに直結するため、「とりあえず平均補完」で済ませず、欠損のメカニズムを理解した上で適切な手法を選ぶことが重要である。

## 欠損値処理とは

> **欠損値（Missing Value）** とは、データセット中で観測・記録されなかった値のことを指す。欠損値処理とは、その欠損が生じたメカニズムを分析し、削除・補完・モデル化などの方法で対処することである。適切な処理を行わないと、バイアスのかかったモデルや誤った推論につながる。

---

## 欠損のメカニズム（3 種類）

欠損のメカニズムを理解することは、処理方法を選ぶ上で最も重要なステップである。

| 略称 | 正式名称 | 意味 | 例 |
|------|---------|------|-----|
| MCAR | Missing Completely At Random | 完全ランダム欠損：欠損は他のいかなる変数とも無関係 | 機器の偶発的故障 |
| MAR | Missing At Random | ランダム欠損：欠損は観測済みの変数に依存するが、欠損した変数自身には依存しない | 高齢者は年収を記載しない傾向（年齢は観測済み） |
| MNAR | Missing Not At Random | 非ランダム欠損：欠損が欠損した変数自身の値に依存する | 高収入者が年収を記入しない |

- MCAR: 削除しても偏りは生じない（ただしサンプル数が減る）
- MAR: 適切な補完を行えば偏りを抑えられる
- MNAR: 最も対処が難しく、欠損自体を変数として利用する、専門家の知見を加えるなどが必要

---

## 欠損値の確認

```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.impute import SimpleImputer, KNNImputer
from sklearn.experimental import enable_iterative_imputer  # noqa
from sklearn.impute import IterativeImputer

np.random.seed(42)
n = 500

df = pd.DataFrame({
    'age':    np.random.normal(35, 10, n),
    'income': np.random.normal(50000, 15000, n),
    'score':  np.random.uniform(0, 100, n),
    'gender': np.random.choice(['M', 'F'], n),
    'dept':   np.random.choice(['A', 'B', 'C'], n),
    'target': np.random.choice([0, 1], n),
})
df['age'] = df['age'].clip(18, 70)

# 欠損を混入（異なるメカニズム）
mcar_idx = np.random.choice(n, 50, replace=False)
df.loc[mcar_idx, 'score'] = np.nan  # MCAR

mar_idx = df[df['age'] > 50].sample(30).index
df.loc[mar_idx, 'income'] = np.nan  # MAR（高齢者に欠損が集中）

mnar_idx = df[df['income'] > 60000].sample(20).index
df.loc[mnar_idx, 'income'] = np.nan  # MNAR（高収入者が記入しない）


def missing_summary(df: pd.DataFrame) -> pd.DataFrame:
    """各列の欠損値情報をまとめる"""
    total = len(df)
    missing = df.isnull().sum()
    pct = missing / total * 100
    dtype = df.dtypes

    summary = pd.DataFrame({
        '欠損数': missing,
        '欠損率(%)': pct.round(2),
        'データ型': dtype
    })
    summary = summary[summary['欠損数'] > 0].sort_values('欠損率(%)', ascending=False)
    return summary


print(missing_summary(df))
```

```python
def plot_missing_heatmap(df: pd.DataFrame) -> None:
    """欠損値のパターンをヒートマップで可視化する"""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

    # ヒートマップ（行ごとの欠損パターン）
    sns.heatmap(df.isnull(), cbar=False, yticklabels=False, ax=ax1, cmap='viridis')
    ax1.set_title('欠損値マップ（黄: 欠損）')

    # 棒グラフ
    missing_pct = df.isnull().mean() * 100
    missing_pct[missing_pct > 0].plot(kind='bar', ax=ax2, color='coral')
    ax2.set_title('列ごとの欠損率')
    ax2.set_ylabel('欠損率 (%)')
    ax2.axhline(y=50, color='red', linestyle='--', label='50%')
    ax2.legend()

    plt.tight_layout()
    plt.savefig('missing_heatmap.png', bbox_inches='tight')
    plt.show()


plot_missing_heatmap(df)
```

---

## 欠損値処理の方法

### 方法1: 削除（Deletion）

```python
# リストワイズ削除（欠損を含む行をすべて削除）
df_listwise = df.dropna()
print(f"リストワイズ削除後: {len(df_listwise)} 行 (元: {len(df)} 行)")

# ペアワイズ削除（相関計算など、使用列が揃っている行のみ使用）
corr_pairwise = df[['age', 'income', 'score']].corr(min_periods=1)
print("\nペアワイズ相関行列:")
print(corr_pairwise.round(3))

# 欠損率が高い列を削除
threshold = 0.3  # 欠損率 30% 以上の列を削除
cols_to_drop = df.columns[df.isnull().mean() > threshold].tolist()
df_col_dropped = df.drop(columns=cols_to_drop)
print(f"\n削除した列: {cols_to_drop}")
```

### 方法2: 単純補完（Simple Imputation）

```python
# 平均値補完（連続変数）
mean_imputer = SimpleImputer(strategy='mean')
df['income_mean'] = mean_imputer.fit_transform(df[['income']])

# 中央値補完（外れ値に強い）
median_imputer = SimpleImputer(strategy='median')
df['income_median'] = median_imputer.fit_transform(df[['income']])

# 最頻値補完（カテゴリ変数）
mode_imputer = SimpleImputer(strategy='most_frequent')
df['gender_mode'] = mode_imputer.fit_transform(df[['gender']]).ravel()

# 定数補完
const_imputer = SimpleImputer(strategy='constant', fill_value='UNKNOWN')
df['dept_const'] = const_imputer.fit_transform(df[['dept']]).ravel()

# 補完結果の比較
print("income の補完結果比較:")
print(f"  元の平均: {df['income'].mean():.1f}")
print(f"  平均値補完後の平均: {df['income_mean'].mean():.1f}")
print(f"  中央値補完後の平均: {df['income_median'].mean():.1f}")
print(f"  元の標準偏差: {df['income'].std():.1f}")
print(f"  平均値補完後の標準偏差: {df['income_mean'].std():.1f}")
```

### 方法3: KNN 補完（K-Nearest Neighbors Imputation）

```python
def knn_impute(df: pd.DataFrame, cols: list, n_neighbors: int = 5) -> pd.DataFrame:
    """KNN 補完を行う（近傍 k 件の平均値で補完）"""
    imputer = KNNImputer(n_neighbors=n_neighbors, weights='uniform')
    df_imputed = df.copy()
    df_imputed[cols] = imputer.fit_transform(df[cols])
    return df_imputed


num_cols = ['age', 'income', 'score']
df_knn = knn_impute(df, num_cols, n_neighbors=5)

print("KNN 補完前後の income 統計:")
print(f"  補完前 mean: {df['income'].mean():.1f}, std: {df['income'].std():.1f}")
print(f"  補完後 mean: {df_knn['income'].mean():.1f}, std: {df_knn['income'].std():.1f}")
```

### 方法4: 多重代入法（Multiple Imputation / MICE）

```python
def mice_impute(df: pd.DataFrame, cols: list, n_iterations: int = 10) -> pd.DataFrame:
    """
    MICE（Multiple Imputation by Chained Equations）で補完する。
    scikit-learn の IterativeImputer を使用。
    """
    imputer = IterativeImputer(
        max_iter=n_iterations,
        random_state=42,
        min_value=0  # 負値が生じないよう制約
    )
    df_imputed = df.copy()
    df_imputed[cols] = imputer.fit_transform(df[cols])
    return df_imputed


df_mice = mice_impute(df, num_cols, n_iterations=10)

print("MICE 補完前後の income 統計:")
print(f"  補完前 mean: {df['income'].mean():.1f}, std: {df['income'].std():.1f}")
print(f"  補完後 mean: {df_mice['income'].mean():.1f}, std: {df_mice['income'].std():.1f}")
```

---

## 欠損フラグの作成

欠損そのものが情報を持っている場合（MNAR）は、欠損フラグを特徴量として追加する。

```python
def add_missing_flags(df: pd.DataFrame, cols: list) -> pd.DataFrame:
    """欠損列に対してバイナリフラグを追加する"""
    df = df.copy()
    for col in cols:
        if df[col].isnull().any():
            df[f'{col}_was_missing'] = df[col].isnull().astype(int)
    return df


cols_with_missing = ['income', 'score']
df_with_flags = add_missing_flags(df, cols_with_missing)

print("追加されたフラグ列:")
print(df_with_flags[['income_was_missing', 'score_was_missing']].value_counts())
```

---

## 補完方法の比較・評価

欠損データに正解を付けた擬似実験で補完精度を比較する。

```python
def evaluate_imputation_methods(df_original: pd.DataFrame, col: str, missing_rate: float = 0.2):
    """
    人工的に欠損を作り、各補完方法の RMSE を比較する。
    """
    data = df_original[[col]].dropna().copy()
    true_values = data[col].values.copy()

    # ランダムに欠損を作成
    missing_idx = np.random.choice(len(data), int(len(data) * missing_rate), replace=False)
    data_missing = data.copy()
    data_missing.iloc[missing_idx] = np.nan

    results = {}

    # 平均値補完
    mean_imp = SimpleImputer(strategy='mean')
    pred_mean = mean_imp.fit_transform(data_missing).ravel()
    results['mean'] = np.sqrt(np.mean((pred_mean[missing_idx] - true_values[missing_idx]) ** 2))

    # 中央値補完
    median_imp = SimpleImputer(strategy='median')
    pred_median = median_imp.fit_transform(data_missing).ravel()
    results['median'] = np.sqrt(np.mean((pred_median[missing_idx] - true_values[missing_idx]) ** 2))

    # KNN 補完
    knn_imp = KNNImputer(n_neighbors=5)
    pred_knn = knn_imp.fit_transform(data_missing).ravel()
    results['KNN'] = np.sqrt(np.mean((pred_knn[missing_idx] - true_values[missing_idx]) ** 2))

    # MICE
    mice_imp = IterativeImputer(random_state=42)
    pred_mice = mice_imp.fit_transform(data_missing).ravel()
    results['MICE'] = np.sqrt(np.mean((pred_mice[missing_idx] - true_values[missing_idx]) ** 2))

    print(f"\n{col} 補完精度比較 (RMSE):")
    for method, rmse in sorted(results.items(), key=lambda x: x[1]):
        print(f"  {method:8s}: {rmse:.4f}")

    return results


evaluate_imputation_methods(df, 'income')
```

---

## 欠損値処理の選択指針

| 条件 | 推奨手法 |
|------|---------|
| 欠損率 < 5% かつ MCAR | リストワイズ削除 or 単純補完 |
| 欠損率 5〜30% かつ MAR | KNN 補完 or MICE |
| 欠損率 > 30% | 列削除 or MNAR として欠損フラグ追加 |
| MNAR が疑われる | 欠損フラグを特徴量に追加 |
| カテゴリ変数 | 最頻値 or 「不明」カテゴリ追加 |
| 時系列データ | 前後補間（ffill / bfill） |

---

## 使用場面

- **構造化データの前処理**: アンケートや医療データなど欠損が多いデータセットで必須の作業
- **特徴量パイプラインの構築**: `sklearn.Pipeline` に `SimpleImputer` を組み込み、テストデータへの情報漏洩（Data Leakage）を防ぐ
- **AutoML の前処理**: 多くの AutoML フレームワークでは自動的に補完が行われるが、デフォルト設定が適切かを確認することが重要
- **因果推論・統計分析**: MNAR の場合は分析そのものに偏りが生じるため、欠損のメカニズムの検討が不可欠

---

## 参考文献

- Little, R. J. A., & Rubin, D. B. (2002). *Statistical Analysis with Missing Data* (2nd ed.). Wiley.
- van Buuren, S. (2018). *Flexible Imputation of Missing Data*. https://stefvanbuuren.name/fimd/
- scikit-learn. *Imputation of missing values*. https://scikit-learn.org/stable/modules/impute.html

<AffiliateBanner site="ml_intro" />
