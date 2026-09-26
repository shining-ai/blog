import AffiliateBanner from '@site/src/components/AffiliateBanner';

# データの種類と品質

機械学習プロジェクトの成否は、モデルよりもデータの品質に左右されることが多い。どれほど優れたアルゴリズムを使っても、入力データが不良であれば意味のある結果は得られない。本記事では、機械学習で扱うデータの種類と、データ品質の考え方を解説する。

## データの種類とは

> 機械学習で扱うデータは、その性質によっていくつかの種類に分類される。データの種類を正しく把握することは、適切な前処理手法・モデル・評価指標を選ぶ上で不可欠である。

---

## データの基本的な種類

### 数値データ（Numerical Data）

数値データはさらに2種類に分けられる。

| 種類 | 説明 | 例 |
|------|------|-----|
| 連続値（Continuous） | 任意の実数を取れる | 身長、体重、気温、価格 |
| 離散値（Discrete） | 整数など有限の値を取る | 人数、クリック数、商品個数 |

連続値は正規化・標準化の恩恵を受けやすく、多くのアルゴリズムでそのまま利用できる。

### カテゴリデータ（Categorical Data）

| 種類 | 説明 | 例 |
|------|------|-----|
| 名義尺度（Nominal） | 順序のないカテゴリ | 性別、都市名、色 |
| 順序尺度（Ordinal） | 順序があるカテゴリ | 満足度（低・中・高）、学年 |

カテゴリデータはそのままでは多くのモデルに入力できないため、エンコーディングが必要になる。

### テキストデータ（Text Data）

テキストデータは非構造化データの代表例で、自然言語処理（NLP）の手法が必要になる。

- 文書分類、感情分析、機械翻訳などに使用
- Bag-of-Words、TF-IDF、Word Embedding などで数値化する
- 前処理として形態素解析・ストップワード除去・正規化などを行う

### 画像データ（Image Data）

画像は縦×横×チャンネル（RGB なら 3）のテンソルとして扱われる。

- ピクセル値（0〜255 または 0.0〜1.0）が特徴量
- データ拡張（回転・反転・クロップ）により学習データを増やす
- 畳み込みニューラルネットワーク（CNN）との相性が高い

### 時系列データ（Time-Series Data）

時間的な順序を持つデータ。

- 株価、センサーデータ、気象データなど
- 時間的依存関係を崩さない分割が必要（ランダムシャッフル禁止）
- ラグ特徴量・ローリング統計量などの特徴量エンジニアリングが有効

---

## データ品質の重要性：GIGO の法則

> **GIGO（Garbage In, Garbage Out）**: 入力がゴミならば、出力もゴミになる。

機械学習においてもこの法則は厳しく当てはまる。データ品質が低いと以下の問題が生じる。

| 問題 | 影響 |
|------|------|
| 誤ったラベル | モデルが誤ったパターンを学習する |
| 欠損値の放置 | エラーや偏ったモデルになる |
| 外れ値の混入 | 統計量の歪み、モデルの不安定化 |
| 重複データ | テストリークや過学習につながる |
| 不適切なスケール | 距離ベースのモデルで性能低下 |

---

## データ品質チェックの実装

```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

# サンプルデータの作成
np.random.seed(42)
n = 1000

df = pd.DataFrame({
    'age': np.random.normal(35, 10, n).astype(int),
    'income': np.random.exponential(50000, n),
    'gender': np.random.choice(['M', 'F', None], n, p=[0.48, 0.48, 0.04]),
    'score': np.random.uniform(0, 100, n),
    'label': np.random.choice([0, 1], n)
})

# 意図的に異常値・重複を混入
df.loc[0, 'age'] = 999        # 明らかな外れ値
df.loc[1, 'income'] = -1000   # ありえない負値
df = pd.concat([df, df.iloc[:10]], ignore_index=True)  # 重複行


def data_quality_report(df: pd.DataFrame) -> None:
    """データ品質の総合レポートを出力する"""
    print("=" * 60)
    print("データ品質レポート")
    print("=" * 60)

    # 基本情報
    print(f"\n[基本情報]")
    print(f"  行数: {len(df):,}")
    print(f"  列数: {df.shape[1]}")
    print(f"  メモリ使用量: {df.memory_usage(deep=True).sum() / 1024:.1f} KB")

    # 重複チェック
    dup_count = df.duplicated().sum()
    print(f"\n[重複行]")
    print(f"  重複行数: {dup_count:,} ({dup_count / len(df) * 100:.1f}%)")

    # 欠損値チェック
    print(f"\n[欠損値]")
    missing = df.isnull().sum()
    missing_pct = df.isnull().mean() * 100
    missing_df = pd.DataFrame({
        '欠損数': missing,
        '欠損率(%)': missing_pct.round(2)
    })
    print(missing_df[missing_df['欠損数'] > 0].to_string())

    # データ型
    print(f"\n[データ型]")
    print(df.dtypes.to_string())

    # 数値列の統計
    print(f"\n[数値列の統計]")
    print(df.describe().round(2).to_string())

    # カテゴリ列のユニーク数
    cat_cols = df.select_dtypes(include=['object', 'category']).columns
    if len(cat_cols) > 0:
        print(f"\n[カテゴリ列のユニーク値]")
        for col in cat_cols:
            unique_vals = df[col].dropna().unique()
            print(f"  {col}: {len(unique_vals)} 種類 → {list(unique_vals[:5])}")


data_quality_report(df)
```

```python
def check_outliers(df: pd.DataFrame, columns: list) -> pd.DataFrame:
    """IQR 法で外れ値を検出する"""
    outlier_report = []

    for col in columns:
        Q1 = df[col].quantile(0.25)
        Q3 = df[col].quantile(0.75)
        IQR = Q3 - Q1
        lower = Q1 - 1.5 * IQR
        upper = Q3 + 1.5 * IQR

        outliers = df[(df[col] < lower) | (df[col] > upper)]
        outlier_report.append({
            '列名': col,
            'Q1': Q1,
            'Q3': Q3,
            '下限': lower,
            '上限': upper,
            '外れ値数': len(outliers),
            '外れ値率(%)': round(len(outliers) / len(df) * 100, 2)
        })

    return pd.DataFrame(outlier_report)


num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
outlier_report = check_outliers(df, num_cols)
print(outlier_report.to_string(index=False))
```

```python
def check_cardinality(df: pd.DataFrame, threshold_high: int = 50, threshold_low: int = 1) -> None:
    """カテゴリ列のカーディナリティ（ユニーク値数）をチェックする"""
    cat_cols = df.select_dtypes(include=['object', 'category']).columns

    print("[カーディナリティチェック]")
    for col in cat_cols:
        n_unique = df[col].nunique()
        print(f"  {col}: {n_unique} ユニーク値", end="")

        if n_unique > threshold_high:
            print(" → 高カーディナリティ（ハッシュエンコーディング等を検討）")
        elif n_unique <= threshold_low:
            print(" → 低カーディナリティ（定数列の可能性）")
        else:
            print()


check_cardinality(df)
```

```python
def check_class_balance(df: pd.DataFrame, target_col: str) -> None:
    """ターゲット変数のクラスバランスを確認する"""
    counts = df[target_col].value_counts()
    ratio = counts / len(df) * 100

    print(f"\n[クラスバランス: {target_col}]")
    for cls, cnt in counts.items():
        bar = "█" * int(ratio[cls] / 2)
        print(f"  クラス {cls}: {cnt:5d} ({ratio[cls]:.1f}%) {bar}")

    imbalance_ratio = counts.max() / counts.min()
    print(f"  不均衡比率: {imbalance_ratio:.1f}:1")
    if imbalance_ratio > 5:
        print("  警告: 不均衡データの可能性あり（オーバーサンプリング等を検討）")


check_class_balance(df, 'label')
```

---

## データ品質問題の対処方針

```python
def fix_basic_quality_issues(df: pd.DataFrame) -> pd.DataFrame:
    """基本的なデータ品質問題を修正する"""
    df = df.copy()

    # 1. 重複行の削除
    before = len(df)
    df = df.drop_duplicates()
    print(f"重複削除: {before - len(df)} 行削除")

    # 2. 明らかにありえない値の除外（ドメイン知識に基づく）
    df = df[df['age'].between(0, 120)]
    df = df[df['income'] >= 0]

    # 3. インデックスのリセット
    df = df.reset_index(drop=True)

    print(f"修正後の行数: {len(df):,}")
    return df


df_clean = fix_basic_quality_issues(df)
```

---

## データの種類と前処理の対応表

| データの種類 | 主な前処理 | 対応アルゴリズム例 |
|------------|----------|-----------------|
| 連続値 | 標準化・正規化・対数変換 | 線形回帰、SVM、ニューラルネット |
| カテゴリ（名義） | One-Hot エンコーディング | ロジスティック回帰、ランダムフォレスト |
| カテゴリ（順序） | 順序エンコーディング | 決定木、勾配ブースティング |
| テキスト | TF-IDF、Word2Vec | Naive Bayes、BERT |
| 画像 | 正規化、データ拡張 | CNN |
| 時系列 | ラグ特徴量、差分変換 | LSTM、Prophet |

---

## 使用場面

- **新しいデータセットを受け取ったとき**: まずデータ品質レポートを作成し、問題を把握してから前処理を設計する
- **モデルの精度が出ないとき**: アルゴリズムを変える前にデータ品質を疑う
- **本番環境でのデータ監視**: 入力データの分布が学習時と乖離していないかを定期チェックする（データドリフト検知）
- **チームへの説明責任**: 利害関係者にデータの状態を報告する際に品質レポートを活用する

---

## 参考文献

- Géron, A. (2019). *Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow* (2nd ed.). O'Reilly Media.
- pandas documentation. *pandas User Guide*. https://pandas.pydata.org/docs/user_guide/
- Zheng, A., & Casari, A. (2018). *Feature Engineering for Machine Learning*. O'Reilly Media.

<AffiliateBanner site="ml_intro" />
