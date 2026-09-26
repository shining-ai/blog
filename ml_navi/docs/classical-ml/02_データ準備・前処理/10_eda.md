import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 探索的データ分析（EDA）

機械学習のプロジェクトでは、モデル構築を始める前にデータの構造や特徴を深く理解することが不可欠である。探索的データ分析（EDA）は、統計量や可視化を通じてデータを「見る」プロセスであり、適切な前処理・特徴量エンジニアリング・モデル選択の指針を与えてくれる。

## 探索的データ分析（EDA）とは

> **探索的データ分析（Exploratory Data Analysis, EDA）** とは、データの分布・パターン・外れ値・相関などをグラフや統計量によって視覚的・定量的に把握するプロセスである。1977年に統計学者の John W. Tukey が体系化した概念で、「データに何が含まれているか」を先入観なく探索することを目的とする。

---

## EDA の主な目的

| 目的 | 具体的な確認事項 |
|------|---------------|
| 分布の把握 | 正規分布か？歪んでいるか？多峰性か？ |
| 外れ値の検出 | 極端に大きい・小さい値はないか？ |
| 欠損値の確認 | どの列に・どれだけ欠損しているか？ |
| 相関の把握 | 特徴量間・特徴量とターゲット間の関係は？ |
| カテゴリの分布 | クラス不均衡はないか？ |
| 時系列的変化 | 時間とともにどう変化するか？ |

---

## 環境準備

```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import seaborn as sns
from scipy import stats

# 日本語フォント設定（環境に応じて変更）
plt.rcParams['font.family'] = 'DejaVu Sans'
plt.rcParams['figure.dpi'] = 100
sns.set_theme(style='whitegrid', palette='muted')

# サンプルデータ（Titanic 風）
np.random.seed(42)
n = 891

df = pd.DataFrame({
    'age':       np.concatenate([np.random.normal(30, 12, n - 50),
                                  np.random.normal(5, 3, 50)]),
    'fare':      np.random.exponential(32, n),
    'pclass':    np.random.choice([1, 2, 3], n, p=[0.24, 0.21, 0.55]),
    'sex':       np.random.choice(['male', 'female'], n, p=[0.65, 0.35]),
    'survived':  np.random.choice([0, 1], n, p=[0.62, 0.38]),
    'sibsp':     np.random.poisson(0.52, n),
    'parch':     np.random.poisson(0.38, n),
})
df['age'] = df['age'].clip(0, 80)
# 欠損値を混入
df.loc[np.random.choice(n, 177, replace=False), 'age'] = np.nan

print(df.head())
print(df.info())
```

---

## 基本統計量の確認

```python
def summarize_dataframe(df: pd.DataFrame) -> None:
    """数値列・カテゴリ列それぞれの要約統計量を表示する"""
    print("=" * 60)
    print("数値列の統計量")
    print("=" * 60)
    print(df.describe(include=[np.number]).round(2))

    print("\n" + "=" * 60)
    print("カテゴリ列の統計量")
    print("=" * 60)
    print(df.describe(include=['object', 'category']))

    print("\n" + "=" * 60)
    print("欠損値情報")
    print("=" * 60)
    missing = df.isnull().sum()
    missing_pct = df.isnull().mean() * 100
    info = pd.DataFrame({'count': missing, 'percent': missing_pct})
    print(info[info['count'] > 0].round(2))


summarize_dataframe(df)
```

---

## 分布の可視化

### ヒストグラムと KDE プロット

```python
def plot_distributions(df: pd.DataFrame, num_cols: list, ncols: int = 3) -> None:
    """数値列の分布をヒストグラム + KDE で可視化する"""
    nrows = (len(num_cols) + ncols - 1) // ncols
    fig, axes = plt.subplots(nrows, ncols, figsize=(5 * ncols, 4 * nrows))
    axes = axes.flatten()

    for i, col in enumerate(num_cols):
        data = df[col].dropna()
        axes[i].hist(data, bins=30, density=True, alpha=0.6, color='steelblue', label='hist')

        # KDE
        kde_x = np.linspace(data.min(), data.max(), 200)
        kde = stats.gaussian_kde(data)
        axes[i].plot(kde_x, kde(kde_x), color='darkorange', linewidth=2, label='KDE')

        # 歪度・尖度
        skew = data.skew()
        kurt = data.kurtosis()
        axes[i].set_title(f'{col}\nskew={skew:.2f}, kurt={kurt:.2f}')
        axes[i].legend(fontsize=8)

    # 余白を非表示
    for j in range(i + 1, len(axes)):
        axes[j].set_visible(False)

    plt.tight_layout()
    plt.savefig('distributions.png', bbox_inches='tight')
    plt.show()


num_cols = ['age', 'fare', 'sibsp', 'parch']
plot_distributions(df, num_cols)
```

### Box プロット（カテゴリ別分布）

```python
def plot_boxplots_by_category(
    df: pd.DataFrame, num_col: str, cat_col: str, hue_col: str = None
) -> None:
    """カテゴリ別に数値列の分布を比較する"""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))

    # ボックスプロット
    df.boxplot(column=num_col, by=cat_col, ax=ax1)
    ax1.set_title(f'{num_col} by {cat_col}')
    ax1.set_xlabel(cat_col)
    ax1.set_ylabel(num_col)

    # バイオリンプロット
    sns.violinplot(data=df, x=cat_col, y=num_col, hue=hue_col, ax=ax2, inner='box')
    ax2.set_title(f'{num_col} by {cat_col} (violin)')

    plt.tight_layout()
    plt.savefig('boxplots.png', bbox_inches='tight')
    plt.show()


plot_boxplots_by_category(df, 'age', 'pclass', hue_col='survived')
```

---

## 外れ値の検出

```python
def detect_outliers_zscore(df: pd.DataFrame, col: str, threshold: float = 3.0) -> pd.DataFrame:
    """Z スコア法で外れ値を検出する（正規分布が仮定できる場合）"""
    z_scores = np.abs(stats.zscore(df[col].dropna()))
    outlier_idx = df[col].dropna().index[z_scores > threshold]
    return df.loc[outlier_idx]


def detect_outliers_iqr(df: pd.DataFrame, col: str, k: float = 1.5) -> pd.DataFrame:
    """IQR 法で外れ値を検出する（分布の形状を問わない）"""
    Q1 = df[col].quantile(0.25)
    Q3 = df[col].quantile(0.75)
    IQR = Q3 - Q1
    mask = (df[col] < Q1 - k * IQR) | (df[col] > Q3 + k * IQR)
    return df[mask]


# 比較
for col in ['age', 'fare']:
    z_outs = detect_outliers_zscore(df, col)
    iqr_outs = detect_outliers_iqr(df, col)
    print(f"{col}: Z法 {len(z_outs)}件, IQR法 {len(iqr_outs)}件")
```

---

## 相関分析

### 相関行列のヒートマップ

```python
def plot_correlation_matrix(df: pd.DataFrame, method: str = 'pearson') -> None:
    """数値列の相関行列をヒートマップで表示する"""
    num_df = df.select_dtypes(include=[np.number])
    corr = num_df.corr(method=method)

    mask = np.triu(np.ones_like(corr, dtype=bool))  # 上三角を隠す
    fig, ax = plt.subplots(figsize=(8, 6))
    sns.heatmap(
        corr,
        mask=mask,
        annot=True,
        fmt='.2f',
        cmap='coolwarm',
        vmin=-1, vmax=1,
        center=0,
        ax=ax,
        square=True
    )
    ax.set_title(f'相関行列 ({method})')
    plt.tight_layout()
    plt.savefig('correlation_matrix.png', bbox_inches='tight')
    plt.show()


plot_correlation_matrix(df)
```

### ターゲット変数との相関

```python
def plot_target_correlation(df: pd.DataFrame, target_col: str) -> None:
    """各特徴量とターゲット変数の相関を棒グラフで表示する"""
    num_df = df.select_dtypes(include=[np.number])
    corr_with_target = num_df.corr()[target_col].drop(target_col).sort_values()

    fig, ax = plt.subplots(figsize=(8, 5))
    colors = ['red' if c < 0 else 'steelblue' for c in corr_with_target]
    corr_with_target.plot(kind='barh', ax=ax, color=colors)
    ax.axvline(0, color='black', linewidth=0.8)
    ax.set_title(f'{target_col} との相関係数')
    ax.set_xlabel('Pearson 相関係数')
    plt.tight_layout()
    plt.savefig('target_correlation.png', bbox_inches='tight')
    plt.show()

    print("ターゲットとの相関（上位 5 件）:")
    print(corr_with_target.abs().sort_values(ascending=False).head())


plot_target_correlation(df, 'survived')
```

### ペアプロット

```python
def plot_pairplot(df: pd.DataFrame, cols: list, hue_col: str = None) -> None:
    """選択した列のペアプロットを描画する"""
    subset = df[cols + ([hue_col] if hue_col else [])].dropna()
    g = sns.pairplot(subset, hue=hue_col, diag_kind='kde', plot_kws={'alpha': 0.5})
    g.fig.suptitle('ペアプロット', y=1.02)
    plt.savefig('pairplot.png', bbox_inches='tight')
    plt.show()


plot_pairplot(df, ['age', 'fare', 'sibsp'], hue_col='survived')
```

---

## カテゴリ変数の分析

```python
def plot_categorical_analysis(
    df: pd.DataFrame, cat_cols: list, target_col: str, ncols: int = 2
) -> None:
    """カテゴリ列ごとのターゲット変数の比率を積み上げ棒グラフで表示する"""
    nrows = (len(cat_cols) + ncols - 1) // ncols
    fig, axes = plt.subplots(nrows, ncols, figsize=(6 * ncols, 5 * nrows))
    axes = axes.flatten()

    for i, col in enumerate(cat_cols):
        ct = pd.crosstab(df[col], df[target_col], normalize='index') * 100
        ct.plot(kind='bar', stacked=True, ax=axes[i], colormap='RdYlGn')
        axes[i].set_title(f'{col} × {target_col}')
        axes[i].set_ylabel('割合 (%)')
        axes[i].tick_params(axis='x', rotation=0)
        axes[i].legend(title=target_col, bbox_to_anchor=(1, 1))

    for j in range(i + 1, len(axes)):
        axes[j].set_visible(False)

    plt.tight_layout()
    plt.savefig('categorical_analysis.png', bbox_inches='tight')
    plt.show()


plot_categorical_analysis(df, ['pclass', 'sex'], 'survived')
```

---

## EDA まとめレポートの自動生成

`ydata-profiling`（旧 `pandas-profiling`）を使うと EDA レポートを自動生成できる。

```python
# pip install ydata-profiling
from ydata_profiling import ProfileReport

profile = ProfileReport(df, title='EDA レポート', explorative=True)
profile.to_file('eda_report.html')
print("eda_report.html を確認してください")
```

---

## EDA のチェックリスト

| ステップ | 確認事項 | 完了 |
|---------|---------|------|
| 1 | 行数・列数・メモリを確認 | □ |
| 2 | 各列のデータ型を確認 | □ |
| 3 | 欠損値の数・割合を確認 | □ |
| 4 | 数値列の基本統計量を確認 | □ |
| 5 | ヒストグラム・KDE で分布を確認 | □ |
| 6 | 外れ値を検出・記録 | □ |
| 7 | 相関行列でマルチコを確認 | □ |
| 8 | ターゲット変数との関係を確認 | □ |
| 9 | カテゴリ列のユニーク値・分布確認 | □ |
| 10 | 時系列性・空間性の有無を確認 | □ |

---

## 使用場面

- **モデリング前の必須ステップ**: EDA を省略すると後工程で意外な問題が発覚し、手戻りが増える
- **特徴量エンジニアリングの設計**: 分布の歪みや外れ値を把握することで適切な変換を選べる
- **ビジネスへの仮説提示**: 可視化結果をステークホルダーと共有し、追加データ収集の判断材料にする
- **モデルの挙動の事前予測**: 相関分析からどの特徴量が重要になりそうか仮説を立てる

---

## 参考文献

- Tukey, J. W. (1977). *Exploratory Data Analysis*. Addison-Wesley.
- VanderPlas, J. (2016). *Python Data Science Handbook*. O'Reilly Media.
- seaborn documentation. https://seaborn.pydata.org/
- pandas documentation. https://pandas.pydata.org/docs/

<AffiliateBanner site="ml_intro" />
