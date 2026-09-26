import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 特徴量エンジニアリング

機械学習の実務において、「良い特徴量を作る」ことはモデルのアーキテクチャを工夫することと同じかそれ以上の効果を持つ。特徴量エンジニアリングは、ドメイン知識と数学的直感を組み合わせ、生データから有用な信号を引き出すプロセスである。

## 特徴量エンジニアリングとは

> **特徴量エンジニアリング（Feature Engineering）** とは、機械学習モデルの入力として使用する特徴量を、生データから設計・変換・生成するプロセスである。適切な特徴量エンジニアリングにより、単純なモデルでも高い精度を達成できることがある。逆に、特徴量が不十分であれば、複雑なモデルも性能を発揮できない。

---

## 特徴量エンジニアリングの全体像

```
生データ
  ↓
スケーリング（数値変数の尺度を揃える）
  ↓
エンコーディング（カテゴリ変数を数値化する）
  ↓
変換（分布を正規化・外れ値を抑制する）
  ↓
特徴量生成（既存変数から新しい変数を作る）
  ↓
特徴量選択（不要な変数を除去する）
  ↓
モデル入力
```

---

## 環境準備

```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.preprocessing import (
    StandardScaler, MinMaxScaler, RobustScaler, MaxAbsScaler,
    LabelEncoder, OrdinalEncoder, OneHotEncoder
)
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from category_encoders import TargetEncoder, BinaryEncoder

np.random.seed(42)
n = 1000

df = pd.DataFrame({
    'age':        np.random.normal(35, 10, n).clip(18, 70),
    'income':     np.random.exponential(50000, n),
    'score':      np.random.uniform(0, 100, n),
    'gender':     np.random.choice(['M', 'F'], n),
    'city':       np.random.choice(['Tokyo', 'Osaka', 'Nagoya', 'Fukuoka', 'Sapporo'], n),
    'edu_level':  np.random.choice(['中学', '高校', '大学', '大学院'], n),
    'month':      np.random.randint(1, 13, n),
    'day_of_week':np.random.randint(0, 7, n),
    'target':     np.random.choice([0, 1], n, p=[0.7, 0.3]),
})
```

---

## スケーリング（Scaling）

### なぜスケーリングが必要か

異なるスケールの変数が混在すると、距離ベースのアルゴリズム（SVM, KNN, ロジスティック回帰）や勾配降下法では、値が大きい変数が支配的になる。

### 標準化（StandardScaler）

$$z = \frac{x - \mu}{\sigma}$$

```python
scaler_std = StandardScaler()
df_std = df.copy()
df_std[['age', 'income', 'score']] = scaler_std.fit_transform(
    df[['age', 'income', 'score']]
)

print("標準化後の統計量:")
print(df_std[['age', 'income', 'score']].describe().round(3))
# mean ≈ 0, std ≈ 1 になることを確認
```

### 正規化（MinMaxScaler）

$$x' = \frac{x - x_{\min}}{x_{\max} - x_{\min}}$$

```python
scaler_mm = MinMaxScaler(feature_range=(0, 1))
df_mm = df.copy()
df_mm[['age', 'income', 'score']] = scaler_mm.fit_transform(
    df[['age', 'income', 'score']]
)

print("正規化後の統計量:")
print(df_mm[['age', 'income', 'score']].describe().round(3))
# min ≈ 0, max ≈ 1 になることを確認
```

### RobustScaler（外れ値に強い）

$$x' = \frac{x - Q_2}{Q_3 - Q_1}$$

```python
scaler_rob = RobustScaler()
df_rob = df.copy()
df_rob[['age', 'income', 'score']] = scaler_rob.fit_transform(
    df[['age', 'income', 'score']]
)

print("RobustScaler後の統計量:")
print(df_rob[['age', 'income', 'score']].describe().round(3))
```

### スケーラーの選択指針

| スケーラー | 特徴 | 向いている場面 |
|-----------|------|-------------|
| StandardScaler | 平均0・分散1に変換 | 正規分布に近い変数、線形モデル |
| MinMaxScaler | [0, 1] に変換 | 外れ値が少ない場合、ニューラルネット |
| RobustScaler | 中央値・IQR を使用 | 外れ値が多い場合 |
| MaxAbsScaler | [-1, 1] に変換 | スパースデータ |

```python
def compare_scalers(data: np.ndarray, col_name: str) -> None:
    """複数のスケーラーで変換結果を比較する"""
    scalers = {
        'Original': None,
        'Standard': StandardScaler(),
        'MinMax':   MinMaxScaler(),
        'Robust':   RobustScaler(),
    }

    fig, axes = plt.subplots(1, len(scalers), figsize=(16, 4))

    for ax, (name, scaler) in zip(axes, scalers.items()):
        if scaler is None:
            vals = data
        else:
            vals = scaler.fit_transform(data.reshape(-1, 1)).ravel()
        ax.hist(vals, bins=40, color='steelblue', alpha=0.7)
        ax.set_title(f'{name}\nmean={vals.mean():.2f}, std={vals.std():.2f}')
        ax.set_xlabel(col_name)

    plt.tight_layout()
    plt.savefig('scaler_comparison.png', bbox_inches='tight')
    plt.show()


compare_scalers(df['income'].values, 'income')
```

---

## エンコーディング（Encoding）

### Label エンコーディング

順序があるカテゴリ変数（順序尺度）に使用する。

```python
# 順序尺度には OrdinalEncoder を使う
edu_order = ['中学', '高校', '大学', '大学院']
ord_enc = OrdinalEncoder(categories=[edu_order])
df['edu_encoded'] = ord_enc.fit_transform(df[['edu_level']]).ravel()

print(df[['edu_level', 'edu_encoded']].drop_duplicates().sort_values('edu_encoded'))
```

### One-Hot エンコーディング（OHE）

名義尺度（順序のないカテゴリ）に使用する。カーディナリティが高い場合は次元爆発に注意。

```python
ohe = OneHotEncoder(sparse_output=False, drop='first', dtype=np.int8)
gender_encoded = ohe.fit_transform(df[['gender']])
gender_df = pd.DataFrame(gender_encoded, columns=ohe.get_feature_names_out())
print("OHE 結果（drop='first'でダミー変数トラップを回避）:")
print(gender_df.head())

# city の OHE
city_ohe = OneHotEncoder(sparse_output=False, drop='first', dtype=np.int8)
city_encoded = city_ohe.fit_transform(df[['city']])
city_df = pd.DataFrame(city_encoded, columns=city_ohe.get_feature_names_out())
print(f"\ncity OHE → {city_df.shape[1]} 列")
```

### ターゲットエンコーディング

高カーディナリティのカテゴリ変数に有効。ターゲット変数の平均値に置き換える。

```python
# pip install category_encoders
from category_encoders import TargetEncoder

te = TargetEncoder(smoothing=1.0)  # スムージングで過学習を防ぐ
df['city_target_enc'] = te.fit_transform(df['city'], df['target'])

print("\ncity のターゲットエンコーディング結果:")
print(df.groupby('city')['city_target_enc'].mean().sort_values(ascending=False))
```

**注意**: ターゲットエンコーディングはデータリーク（情報漏洩）のリスクがある。必ず交差検証の各フォールド内で fit する。

### ハッシュエンコーディング

非常に高カーディナリティ（数千〜数万カテゴリ）の場合に使用する。

```python
from sklearn.feature_extraction import FeatureHasher

# ハッシュエンコーディング（固定次元数に圧縮）
hasher = FeatureHasher(n_features=8, input_type='string')
hashed = hasher.transform(df['city'].apply(lambda x: [x]))
hashed_df = pd.DataFrame(hashed.toarray(), columns=[f'hash_{i}' for i in range(8)])
print("ハッシュエンコーディング結果 (shape):", hashed_df.shape)
```

---

## 数値変換

### 対数変換（右歪み分布に有効）

```python
# income は右歪みが強いため対数変換が有効
df['income_log'] = np.log1p(df['income'])  # log(1 + x) で 0 を安全に処理

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))
ax1.hist(df['income'], bins=40, color='steelblue')
ax1.set_title('income (変換前)')
ax2.hist(df['income_log'], bins=40, color='coral')
ax2.set_title('income_log (対数変換後)')
plt.tight_layout()
plt.savefig('log_transform.png', bbox_inches='tight')
plt.show()
```

### Box-Cox 変換・Yeo-Johnson 変換

```python
from sklearn.preprocessing import PowerTransformer

# Box-Cox: 正値のみ, Yeo-Johnson: 0 や負値も対応
pt_yj = PowerTransformer(method='yeo-johnson')
df['income_yj'] = pt_yj.fit_transform(df[['income']]).ravel()

pt_bc = PowerTransformer(method='box-cox')
df['income_bc'] = pt_bc.fit_transform(df[['income']].clip(lower=1e-3)).ravel()

print("変換後の歪度:")
print(f"  元データ:     {df['income'].skew():.3f}")
print(f"  対数変換:     {df['income_log'].skew():.3f}")
print(f"  Yeo-Johnson: {df['income_yj'].skew():.3f}")
print(f"  Box-Cox:     {df['income_bc'].skew():.3f}")
```

---

## 特徴量生成

### 交互作用特徴量

```python
# 2 変数の積
df['age_x_income'] = df['age'] * df['income']

# ポリノミアル特徴量
from sklearn.preprocessing import PolynomialFeatures

poly = PolynomialFeatures(degree=2, include_bias=False, interaction_only=False)
poly_features = poly.fit_transform(df[['age', 'score']])
poly_df = pd.DataFrame(
    poly_features,
    columns=poly.get_feature_names_out(['age', 'score'])
)
print("ポリノミアル特徴量 (degree=2):")
print(poly_df.columns.tolist())
```

### 日付・時刻の分解

```python
# month から周期特徴量を生成（1月と12月が近いことを表現）
df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)

# day_of_week の周期特徴量
df['dow_sin'] = np.sin(2 * np.pi * df['day_of_week'] / 7)
df['dow_cos'] = np.cos(2 * np.pi * df['day_of_week'] / 7)

print("月の周期特徴量（1月と12月が近くなっているか確認）:")
check = pd.DataFrame({'month': [1, 6, 12],
                      'sin': df.groupby('month')['month_sin'].first()[[1, 6, 12]].values,
                      'cos': df.groupby('month')['month_cos'].first()[[1, 6, 12]].values})
print(check)
```

### ビニング（Binning）

```python
# 等幅ビニング
df['age_bin_eq'] = pd.cut(df['age'], bins=5, labels=['~26', '27~35', '36~44', '45~53', '54~'])

# 等頻度ビニング（各ビンに同数のサンプルを入れる）
df['age_bin_qnt'] = pd.qcut(df['age'], q=5, labels=['Q1', 'Q2', 'Q3', 'Q4', 'Q5'])

# 意味のある区切りによるビニング
bins = [18, 25, 35, 45, 55, 70]
labels = ['18-25', '26-35', '36-45', '46-55', '56-70']
df['age_group'] = pd.cut(df['age'], bins=bins, labels=labels)

print(df['age_group'].value_counts().sort_index())
```

---

## scikit-learn Pipeline による統合

```python
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression

num_cols = ['age', 'income', 'score']
cat_cols_ohe = ['gender', 'city']
cat_cols_ord = ['edu_level']

num_pipeline = Pipeline([
    ('imputer', SimpleImputer(strategy='median')),
    ('scaler',  StandardScaler()),
])

cat_ohe_pipeline = Pipeline([
    ('imputer', SimpleImputer(strategy='most_frequent')),
    ('encoder', OneHotEncoder(handle_unknown='ignore', drop='first', sparse_output=False)),
])

cat_ord_pipeline = Pipeline([
    ('imputer', SimpleImputer(strategy='most_frequent')),
    ('encoder', OrdinalEncoder(categories=[edu_order], handle_unknown='use_encoded_value', unknown_value=-1)),
])

preprocessor = ColumnTransformer([
    ('num', num_pipeline, num_cols),
    ('cat_ohe', cat_ohe_pipeline, cat_cols_ohe),
    ('cat_ord', cat_ord_pipeline, cat_cols_ord),
], remainder='drop')

full_pipeline = Pipeline([
    ('preprocessor', preprocessor),
    ('classifier',   LogisticRegression(random_state=42, max_iter=1000)),
])

X = df[num_cols + cat_cols_ohe + cat_cols_ord]
y = df['target']

from sklearn.model_selection import cross_val_score
scores = cross_val_score(full_pipeline, X, y, cv=5, scoring='roc_auc')
print(f"Pipeline CV AUC: {scores.mean():.4f} ± {scores.std():.4f}")
```

---

## 使用場面

- **線形モデル**: スケーリングと OHE が必須。多重共線性を避けるため `drop='first'` を使う
- **ツリー系モデル**: スケーリング不要。カーディナリティが高い列にはターゲットエンコーディングが有効
- **時系列データ**: 周期特徴量（sin/cos 変換）やラグ特徴量が重要
- **自然言語処理**: テキストの TF-IDF・Embedding も特徴量エンジニアリングの一種

---

## 参考文献

- Zheng, A., & Casari, A. (2018). *Feature Engineering for Machine Learning*. O'Reilly Media.
- Kuhn, M., & Johnson, K. (2019). *Feature Engineering and Selection*. CRC Press.
- scikit-learn. *Preprocessing data*. https://scikit-learn.org/stable/modules/preprocessing.html

<AffiliateBanner site="ml_intro" />
