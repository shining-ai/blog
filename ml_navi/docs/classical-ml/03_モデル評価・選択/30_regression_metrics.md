import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 回帰の評価指標

回帰モデルの評価は分類モデルとは異なり、予測値と実際値の「ずれ」を数値で測る。どの指標を使うかによってモデルの見え方が変わるため、ビジネスの目的に合った指標を選ぶことが重要である。本記事では主要な回帰評価指標と残差分析を体系的に解説する。

## 回帰の評価指標とは

> 回帰の評価指標とは、数値予測モデルの予測値 $\hat{y}$ と実際値 $y$ の差（残差）を要約した統計量である。外れ値への感度・スケールへの依存性・解釈しやすさなど、それぞれに異なる特性があるため、目的に応じた選択が求められる。

---

## サンプルデータの準備

```python
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.datasets import fetch_california_housing
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import (
    mean_absolute_error, mean_squared_error,
    r2_score, mean_absolute_percentage_error
)
from scipy import stats

np.random.seed(42)

# カリフォルニア住宅価格データセット
housing = fetch_california_housing()
X, y = housing.data, housing.target

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# 複数モデルを学習
models = {
    '線形回帰':       Pipeline([('sc', StandardScaler()), ('m', LinearRegression())]),
    'Ridge':          Pipeline([('sc', StandardScaler()), ('m', Ridge(alpha=1.0))]),
    'ランダムフォレスト': RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1),
    '勾配ブースティング': GradientBoostingRegressor(n_estimators=200, random_state=42),
}

predictions = {}
for name, model in models.items():
    model.fit(X_train, y_train)
    predictions[name] = model.predict(X_test)

# 代表としてランダムフォレストを使用
y_pred = predictions['ランダムフォレスト']
```

---

## MAE（平均絶対誤差）

$$\text{MAE} = \frac{1}{n} \sum_{i=1}^{n} |y_i - \hat{y}_i|$$

```python
mae = mean_absolute_error(y_test, y_pred)
print(f"MAE: {mae:.4f}")
print(f"解釈: 予測は平均的に実際値から ±{mae:.2f} 万ドル 外れている")

# 手動計算
residuals = y_test - y_pred
mae_manual = np.abs(residuals).mean()
print(f"手動計算: {mae_manual:.4f}")
```

**MAE の特徴:**
- 外れ値に頑健（絶対値なので大きな誤差を二乗しない）
- 元のデータと同じ単位で解釈できる
- 常に 0 以上、小さいほど良い

---

## MSE / RMSE（平均二乗誤差 / 二乗平均平方根誤差）

$$\text{MSE} = \frac{1}{n} \sum_{i=1}^{n} (y_i - \hat{y}_i)^2$$

$$\text{RMSE} = \sqrt{\text{MSE}}$$

```python
mse  = mean_squared_error(y_test, y_pred)
rmse = np.sqrt(mse)

print(f"MSE:  {mse:.4f}")
print(f"RMSE: {rmse:.4f}")
print(f"解釈: RMSE は MAE ({mae:.4f}) より大きい（外れ値に敏感なため）")

# MAE と RMSE の比較からデータの性質を推測
ratio = rmse / mae
print(f"\nRMSE/MAE 比率: {ratio:.2f}")
if ratio > 1.5:
    print("→ 比率が高い：外れ値が存在する可能性が高い")
else:
    print("→ 比率が低い：外れ値は少ない")
```

---

## R²（決定係数）

$$R^2 = 1 - \frac{\sum (y_i - \hat{y}_i)^2}{\sum (y_i - \bar{y})^2}$$

```python
r2 = r2_score(y_test, y_pred)
print(f"R²: {r2:.4f}")
print(f"解釈: モデルはターゲット変数の分散の {r2*100:.1f}% を説明している")

# R² の範囲と解釈
print("\nR² の解釈ガイド:")
print("  1.00: 完璧な予測")
print("  0.90: 非常に良好")
print("  0.70: 良好")
print("  0.50: まずまず")
print("  0.00: 平均値予測と同等")
print("  < 0:  平均値予測より悪い")

# 調整済み R²（特徴量数でペナルティ）
n = len(y_test)
p = X_test.shape[1]
r2_adj = 1 - (1 - r2) * (n - 1) / (n - p - 1)
print(f"\n調整済み R²: {r2_adj:.4f} (特徴量数={p} のペナルティを考慮)")
```

---

## MAPE（平均絶対パーセント誤差）

$$\text{MAPE} = \frac{100}{n} \sum_{i=1}^{n} \left| \frac{y_i - \hat{y}_i}{y_i} \right|$$

```python
# sklearn の MAPE は 0〜1 の範囲（×100 でパーセント）
mape = mean_absolute_percentage_error(y_test, y_pred) * 100
print(f"MAPE: {mape:.2f}%")
print(f"解釈: 平均的に実際値の {mape:.1f}% の誤差がある")

# ゼロ値があると無限大になる問題の回避
def safe_mape(y_true, y_pred, epsilon=1e-10):
    """ゼロ値に対して安全な MAPE を計算する"""
    mask = np.abs(y_true) > epsilon
    return 100 * np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask]))


print(f"安全な MAPE: {safe_mape(y_test, y_pred):.2f}%")

# SMAPE（対称 MAPE）: 上振れ・下振れで非対称にならない
def smape(y_true, y_pred):
    """Symmetric MAPE を計算する"""
    return 100 * np.mean(2 * np.abs(y_pred - y_true) / (np.abs(y_true) + np.abs(y_pred) + 1e-10))


print(f"SMAPE: {smape(y_test, y_pred):.2f}%")
```

---

## 全指標の比較

```python
def regression_report(model_name: str, y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    """回帰モデルの全評価指標を計算してまとめる"""
    mae   = mean_absolute_error(y_true, y_pred)
    mse   = mean_squared_error(y_true, y_pred)
    rmse  = np.sqrt(mse)
    r2    = r2_score(y_true, y_pred)
    mape  = mean_absolute_percentage_error(y_true, y_pred) * 100
    smape_val = smape(y_true, y_pred)

    n = len(y_true)
    p = X_test.shape[1]
    r2_adj = 1 - (1 - r2) * (n - 1) / (n - p - 1)

    return {
        'モデル':      model_name,
        'MAE':        round(mae, 4),
        'RMSE':       round(rmse, 4),
        'R²':         round(r2, 4),
        '調整済みR²': round(r2_adj, 4),
        'MAPE(%)':    round(mape, 2),
        'SMAPE(%)':   round(smape_val, 2),
    }


results = [regression_report(name, y_test, pred) for name, pred in predictions.items()]
df_results = pd.DataFrame(results)
print("全モデルの比較:")
print(df_results.to_string(index=False))
```

---

## 残差分析

残差分析はモデルの仮定が満たされているかを診断する重要なプロセス。

```python
def plot_residual_analysis(y_true, y_pred, model_name='モデル'):
    """残差の4つのプロットで診断を行う"""
    residuals = y_true - y_pred
    standardized_residuals = residuals / residuals.std()

    fig, axes = plt.subplots(2, 2, figsize=(12, 10))

    # 1. 残差 vs 予測値（ランダム散布なら良好）
    axes[0, 0].scatter(y_pred, residuals, alpha=0.3, s=10, color='steelblue')
    axes[0, 0].axhline(y=0, color='red', linestyle='--')
    axes[0, 0].set_xlabel('予測値')
    axes[0, 0].set_ylabel('残差')
    axes[0, 0].set_title('残差 vs 予測値')

    # 2. 正規 Q-Q プロット（直線上にあれば正規分布）
    stats.probplot(residuals, dist='norm', plot=axes[0, 1])
    axes[0, 1].set_title('残差の Q-Q プロット')

    # 3. Scale-Location プロット（等分散性の確認）
    sqrt_abs_res = np.sqrt(np.abs(standardized_residuals))
    axes[1, 0].scatter(y_pred, sqrt_abs_res, alpha=0.3, s=10, color='steelblue')
    axes[1, 0].set_xlabel('予測値')
    axes[1, 0].set_ylabel('√|標準化残差|')
    axes[1, 0].set_title('Scale-Location プロット')

    # 4. 残差のヒストグラム
    axes[1, 1].hist(residuals, bins=50, color='steelblue', alpha=0.7, edgecolor='white')
    axes[1, 1].axvline(x=0, color='red', linestyle='--')
    axes[1, 1].set_xlabel('残差')
    axes[1, 1].set_ylabel('頻度')
    axes[1, 1].set_title(f'残差の分布\n歪度={residuals.skew():.2f}, 尖度={residuals.kurtosis():.2f}')

    plt.suptitle(f'{model_name} の残差分析', fontsize=13, y=1.01)
    plt.tight_layout()
    plt.savefig('residual_analysis.png', bbox_inches='tight')
    plt.show()

    # 残差の統計検定
    _, p_normality  = stats.shapiro(residuals[:500])   # シャピロ・ウィルク検定
    _, p_homoscedasticity = stats.levene(
        residuals[y_pred <= np.median(y_pred)],
        residuals[y_pred >  np.median(y_pred)]
    )
    print(f"\n残差の正規性検定（Shapiro-Wilk）: p={p_normality:.4f} "
          f"{'→ 正規分布の疑い' if p_normality < 0.05 else '→ 正規分布に近い'}")
    print(f"残差の等分散性検定（Levene）: p={p_homoscedasticity:.4f} "
          f"{'→ 不均一分散の疑い' if p_homoscedasticity < 0.05 else '→ 等分散に近い'}")


plot_residual_analysis(y_test, y_pred, 'ランダムフォレスト')
```

### 予測値 vs 実際値プロット

```python
def plot_predicted_vs_actual(y_true, y_pred, model_name='モデル'):
    """予測値と実際値の散布図を描く"""
    r2 = r2_score(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))

    fig, ax = plt.subplots(figsize=(7, 7))
    ax.scatter(y_true, y_pred, alpha=0.3, s=10, color='steelblue')

    # 理想的な予測線（y=x）
    lims = [min(y_true.min(), y_pred.min()), max(y_true.max(), y_pred.max())]
    ax.plot(lims, lims, 'r--', linewidth=2, label='完璧な予測')

    # 回帰直線
    z = np.polyfit(y_true, y_pred, 1)
    p = np.poly1d(z)
    ax.plot(lims, p(lims), 'g-', linewidth=1.5, alpha=0.7, label='回帰直線')

    ax.set_xlabel('実際値')
    ax.set_ylabel('予測値')
    ax.set_title(f'{model_name}\nR²={r2:.4f}, RMSE={rmse:.4f}')
    ax.legend()
    ax.set_aspect('equal')
    plt.tight_layout()
    plt.savefig('predicted_vs_actual.png', bbox_inches='tight')
    plt.show()


plot_predicted_vs_actual(y_test, y_pred, 'ランダムフォレスト')
```

---

## 指標の選択ガイド

| 状況 | 推奨指標 | 理由 |
|------|---------|------|
| 外れ値が少ない | RMSE, R² | 標準的な選択 |
| 外れ値が多い | MAE, Huber Loss | 外れ値の影響を軽減 |
| 相対的な誤差が重要 | MAPE, SMAPE | 業務指標として解釈しやすい |
| ゼロ値を含む | MAE, RMSE | MAPE はゼロ除算が起きる |
| 複数モデルの比較 | R², RMSE | スケール不変性・解釈容易性 |
| 時系列予測 | MAPE, SMAPE, RMSE | 相対誤差が実務に馴染みやすい |

---

## 使用場面

- **不動産価格予測**: RMSE と MAPE を併用（金額の誤差と相対誤差の両方を把握）
- **需要予測**: MAPE が業務部門への報告指標として使いやすい
- **医療データ**: 残差分析でモデルの仮定（正規性・等分散性）を確認する
- **モデル選択時**: 複数のモデルを R² と RMSE で比較し、残差分析で最終判断

---

## 参考文献

- Hyndman, R. J., & Koehler, A. B. (2006). Another look at measures of forecast accuracy. *International Journal of Forecasting*, 22(4), 679-688.
- Chai, T., & Draxler, R. R. (2014). Root mean square error (RMSE) or mean absolute error (MAE)? *Geoscientific Model Development*, 7(3), 1247-1250.
- scikit-learn. *Regression metrics*. https://scikit-learn.org/stable/modules/model_evaluation.html#regression-metrics

<AffiliateBanner site="ml_intro" />
