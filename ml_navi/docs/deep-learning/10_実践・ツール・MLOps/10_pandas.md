import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Pandas

## Pandasとは

> Pandas は Python における表形式データ操作ライブラリである。DataFrame（2次元ラベル付き配列）と Series（1次元）を中心に、データの読み込み・変換・集計・結合・時系列処理を直感的なAPIで提供する。データサイエンスの前処理工程で最も広く使われるツールの一つである。

## 主要データ構造

| 構造 | 説明 | 用途 |
|------|------|------|
| `Series` | 1次元のインデックス付き配列 | 1列分のデータ |
| `DataFrame` | 2次元のラベル付き表形式データ | テーブルデータ全般 |
| `Index` | 行・列ラベルを管理するオブジェクト | ラベルアクセスの最適化 |

## Python実装

```python
import pandas as pd
import numpy as np

# ==============================
# DataFrame の作成と基本操作
# ==============================
df = pd.DataFrame({
    "name": ["Alice", "Bob", "Charlie", "Diana", "Eve"],
    "age": [25, 32, 28, 35, 22],
    "salary": [50000, 75000, 60000, 90000, 45000],
    "dept": ["Engineering", "Marketing", "Engineering", "Management", "Marketing"],
    "join_date": pd.to_datetime(["2021-03-01", "2018-07-15", "2020-01-10",
                                   "2015-04-22", "2022-09-01"]),
})

print(df.head(3))
print(df.dtypes)
print(df.describe())

# ==============================
# フィルタリング・選択
# ==============================
# 単一列アクセス
ages = df["age"]
ages_s = df.age

# 複数列
subset = df[["name", "salary"]]

# 条件フィルタリング
engineers = df[df["dept"] == "Engineering"]
high_earners = df[df["salary"] >= 60000]
complex_filter = df[(df["age"] > 25) & (df["salary"] > 55000)]

# loc: ラベルベース, iloc: 整数インデックスベース
print(df.loc[0:2, "name":"salary"])    # 行0〜2、列name〜salary
print(df.iloc[1:3, 0:3])              # 行1〜2、列0〜2

# query メソッド（SQL風）
result = df.query("age > 25 and dept == 'Engineering'")

# ==============================
# 集計と groupby
# ==============================
# 基本統計
print(df["salary"].mean(), df["salary"].std())

# groupby で部門別集計
dept_stats = df.groupby("dept")["salary"].agg(["mean", "std", "count"])
print(dept_stats)

# 複数列の groupby と集計
dept_age_salary = df.groupby("dept").agg(
    avg_age=("age", "mean"),
    avg_salary=("salary", "mean"),
    headcount=("name", "count"),
)

# transform: グループ統計を元の行に結合
df["dept_avg_salary"] = df.groupby("dept")["salary"].transform("mean")
df["salary_vs_dept"] = df["salary"] - df["dept_avg_salary"]

# pivot_table
pivot = pd.pivot_table(
    df, values="salary", index="dept", aggfunc=["mean", "count"]
)

# ==============================
# apply / map
# ==============================
# 行単位の apply
def salary_band(row):
    if row["salary"] >= 80000:
        return "Senior"
    elif row["salary"] >= 60000:
        return "Mid"
    return "Junior"

df["band"] = df.apply(salary_band, axis=1)

# 列単位の apply
df["salary_normalized"] = df["salary"].apply(
    lambda x: (x - df["salary"].mean()) / df["salary"].std()
)

# map（単一列の変換）
dept_code = {"Engineering": "ENG", "Marketing": "MKT", "Management": "MGT"}
df["dept_code"] = df["dept"].map(dept_code)

# ==============================
# 欠損値の処理
# ==============================
df_with_nan = df.copy()
df_with_nan.loc[1, "salary"] = np.nan
df_with_nan.loc[3, "age"] = np.nan

print("欠損値の数:\n", df_with_nan.isnull().sum())

df_filled = df_with_nan.fillna({"salary": df["salary"].median(), "age": df["age"].mean()})
df_dropped = df_with_nan.dropna(subset=["salary"])

# ==============================
# 結合
# ==============================
df_details = pd.DataFrame({
    "name": ["Alice", "Bob", "Charlie", "Frank"],
    "project": ["Alpha", "Beta", "Alpha", "Gamma"],
})

# inner join
merged = pd.merge(df, df_details, on="name", how="inner")
# left join
merged_left = pd.merge(df, df_details, on="name", how="left")

# concat（縦方向に結合）
df_new = pd.DataFrame({
    "name": ["Frank"], "age": [29], "salary": [65000],
    "dept": ["Engineering"], "join_date": pd.to_datetime(["2023-06-01"]),
})
df_combined = pd.concat([df, df_new], ignore_index=True)

# ==============================
# 時系列操作
# ==============================
# DatetimeIndex を設定
ts_df = df.set_index("join_date").sort_index()

# 勤続年数の計算
today = pd.Timestamp("2026-06-07")
df["tenure_years"] = (today - df["join_date"]).dt.days / 365.25

# resample（月次集計）の例
dates = pd.date_range("2024-01-01", "2026-06-01", freq="ME")
monthly = pd.DataFrame({
    "date": dates,
    "revenue": np.random.randint(100, 200, len(dates)),
}).set_index("date")

quarterly = monthly.resample("QE").sum()

# rolling（移動平均）
monthly["MA3"] = monthly["revenue"].rolling(window=3).mean()

# ==============================
# データ型変換と最適化
# ==============================
# カテゴリ型でメモリ削減
df["dept"] = df["dept"].astype("category")
print("dept dtype:", df["dept"].dtype)

# dtypes の確認とメモリ使用量
print(df.memory_usage(deep=True))
```

## 使用場面

- CSVや Excel からのデータ読み込みと前処理
- 機械学習の特徴量エンジニアリング
- 集計・ピボット・クロス集計によるデータ分析
- 時系列データの加工と集計
- データベースライクな結合・フィルタ操作

## 参考文献

- Pandas 公式ドキュメント: https://pandas.pydata.org/docs/
- McKinney, W. (2022). *Python for Data Analysis* (3rd ed.). O'Reilly.
- VanderPlas, J. (2016). *Python Data Science Handbook*. O'Reilly.

<AffiliateBanner site="ml_intro" />
