import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 時系列予測

## 時系列予測とは

> 時系列予測（Time Series Forecasting）とは、過去の時刻順データのパターンを学習し、未来の値を推定する機械学習・統計的手法の総称。需要予測・株価予測・異常検知・気象予報など広範な分野で用いられる。

| 手法カテゴリ | 代表的モデル | 特徴 |
|-------------|-------------|------|
| 古典統計モデル | ARIMA / SARIMA | 解釈性が高い・少データでも動作 |
| 機械学習 | XGBoost / LightGBM | 特徴量エンジニアリングが鍵 |
| Prophet | Prophet（Meta）| トレンド・季節性を自動分解 |
| 深層学習 | LSTM / Transformer | 長期依存関係の学習に強い |
| 基盤モデル | TimesFM / Chronos | 事前学習済み汎用時系列モデル |

---

## 時系列データの構成要素

時系列は以下の要素に分解して分析する。

| 要素 | 説明 | 例 |
|------|------|-----|
| トレンド（Trend） | 長期的な増減傾向 | 年々増加する売上 |
| 季節性（Seasonality） | 固定周期の変動 | 夏の冷飲料の増加 |
| 周期性（Cyclicity） | 不規則な長周期変動 | 景気サイクル |
| 残差（Residual） | 上記で説明できない不規則変動 | ノイズ |

```python
import pandas as pd
import numpy as np
from statsmodels.tsa.seasonal import seasonal_decompose
import matplotlib.pyplot as plt

# 時系列データの生成（月次売上の模擬データ）
np.random.seed(42)
dates = pd.date_range("2019-01-01", periods=60, freq="MS")
trend = np.linspace(100, 200, 60)
seasonal = 20 * np.sin(2 * np.pi * np.arange(60) / 12)
noise = np.random.normal(0, 5, 60)
sales = trend + seasonal + noise

ts = pd.Series(sales, index=dates, name="sales")

# 時系列分解
result = seasonal_decompose(ts, model="additive", period=12)
fig, axes = plt.subplots(4, 1, figsize=(12, 8))
for ax, (title, comp) in zip(axes, [
    ("Observed",  result.observed),
    ("Trend",     result.trend),
    ("Seasonal",  result.seasonal),
    ("Residual",  result.resid),
]):
    comp.plot(ax=ax, title=title)
plt.tight_layout()
plt.savefig("decomposition.png", dpi=120)
```

---

## ARIMA モデル

ARIMA（AutoRegressive Integrated Moving Average）は古典的な時系列予測の標準手法。

| パラメータ | 意味 | 決め方 |
|-----------|------|--------|
| p（AR次数） | 自己回帰の次数 | PACF プロット |
| d（差分次数） | 定常化のための差分回数 | ADF 検定 |
| q（MA次数） | 移動平均の次数 | ACF プロット |

```python
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.stattools import adfuller
from sklearn.metrics import mean_absolute_error, mean_squared_error

# 定常性の確認（ADF 検定）
adf_result = adfuller(ts)
print(f"ADF 統計量: {adf_result[0]:.4f}")
print(f"p 値: {adf_result[1]:.4f}")
print("定常:" if adf_result[1] < 0.05 else "非定常: 差分が必要")

# 学習・テスト分割
train, test = ts[:-12], ts[-12:]

# ARIMA モデルの学習
model = ARIMA(train, order=(2, 1, 2),
              seasonal_order=(1, 1, 1, 12))  # SARIMA
fitted = model.fit()
print(fitted.summary())

# 予測
forecast = fitted.forecast(steps=12)
mae = mean_absolute_error(test, forecast)
rmse = mean_squared_error(test, forecast, squared=False)
print(f"MAE: {mae:.2f}  RMSE: {rmse:.2f}")
```

---

## Prophet

Meta が開発した時系列予測ライブラリ。祝日・イベント効果・欠損値を扱いやすい。

```python
from prophet import Prophet
import pandas as pd

# Prophet は ds（日付）と y（目標値）カラムを要求
df_prophet = ts.reset_index()
df_prophet.columns = ["ds", "y"]

train_p = df_prophet.iloc[:-12]
test_p  = df_prophet.iloc[-12:]

# モデル構築
m = Prophet(
    yearly_seasonality=True,
    weekly_seasonality=False,
    daily_seasonality=False,
    seasonality_mode="additive",   # "multiplicative" も選択可
    changepoint_prior_scale=0.05,  # トレンド変化の感度
)

# 祝日の追加例（日本）
# m.add_country_holidays(country_name="JP")

m.fit(train_p)

# 未来データフレームの作成
future = m.make_future_dataframe(periods=12, freq="MS")
forecast_p = m.predict(future)

# 予測結果の確認
print(forecast_p[["ds", "yhat", "yhat_lower", "yhat_upper"]].tail(12))

# 成分プロット
fig = m.plot_components(forecast_p)
```

---

## 特徴量エンジニアリング（ラグ特徴・ローリング統計）

機械学習モデルで時系列を扱う場合、特徴量の設計が予測精度を左右する。

```python
import pandas as pd
import numpy as np
from lightgbm import LGBMRegressor
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_absolute_error

def create_time_features(df: pd.DataFrame, target_col: str = "sales") -> pd.DataFrame:
    df = df.copy()

    # --- カレンダー特徴量 ---
    df["month"]      = df.index.month
    df["quarter"]    = df.index.quarter
    df["year"]       = df.index.year
    df["month_sin"]  = np.sin(2 * np.pi * df["month"] / 12)
    df["month_cos"]  = np.cos(2 * np.pi * df["month"] / 12)

    # --- ラグ特徴量 ---
    for lag in [1, 2, 3, 6, 12]:
        df[f"lag_{lag}"] = df[target_col].shift(lag)

    # --- ローリング統計量 ---
    for window in [3, 6, 12]:
        roll = df[target_col].shift(1).rolling(window)
        df[f"roll_mean_{window}"] = roll.mean()
        df[f"roll_std_{window}"]  = roll.std()
        df[f"roll_max_{window}"]  = roll.max()
        df[f"roll_min_{window}"]  = roll.min()

    # --- 差分特徴量 ---
    df["diff_1"]  = df[target_col].diff(1)
    df["diff_12"] = df[target_col].diff(12)

    return df.dropna()

df_feat = create_time_features(ts.to_frame())
feature_cols = [c for c in df_feat.columns if c != "sales"]
X, y = df_feat[feature_cols], df_feat["sales"]

# 時系列交差検証
tscv = TimeSeriesSplit(n_splits=5)
scores = []
for fold, (tr_idx, val_idx) in enumerate(tscv.split(X)):
    X_tr, X_val = X.iloc[tr_idx], X.iloc[val_idx]
    y_tr, y_val = y.iloc[tr_idx], y.iloc[val_idx]
    lgb = LGBMRegressor(n_estimators=300, learning_rate=0.05, num_leaves=31)
    lgb.fit(X_tr, y_tr, eval_set=[(X_val, y_val)],
            callbacks=[])
    preds = lgb.predict(X_val)
    scores.append(mean_absolute_error(y_val, preds))
    print(f"Fold {fold+1}: MAE = {scores[-1]:.2f}")

print(f"平均 MAE: {np.mean(scores):.2f}")
```

---

## 時系列用 Transformer（簡易実装）

```python
import torch
import torch.nn as nn

class TimeSeriesTransformer(nn.Module):
    """簡易 Transformer ベース時系列予測モデル"""

    def __init__(self, input_dim: int, d_model: int = 64,
                 nhead: int = 4, num_layers: int = 2,
                 seq_len: int = 24, pred_len: int = 6):
        super().__init__()
        self.embedding = nn.Linear(input_dim, d_model)
        encoder_layer  = nn.TransformerEncoderLayer(
            d_model=d_model, nhead=nhead,
            dim_feedforward=d_model * 4, dropout=0.1, batch_first=True
        )
        self.encoder   = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        self.head      = nn.Linear(d_model * seq_len, pred_len)
        self.seq_len   = seq_len

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (batch, seq_len, input_dim)
        x = self.embedding(x)            # (batch, seq_len, d_model)
        x = self.encoder(x)              # (batch, seq_len, d_model)
        x = x.flatten(1)                 # (batch, seq_len * d_model)
        return self.head(x)              # (batch, pred_len)

model = TimeSeriesTransformer(input_dim=1, seq_len=24, pred_len=6)
dummy  = torch.randn(8, 24, 1)
output = model(dummy)
print(output.shape)  # torch.Size([8, 6])
```

---

## 使用場面

- 小売・EC での需要予測・在庫最適化
- エネルギー需要予測（電力・ガス）
- 金融市場の価格予測・ボラティリティ推定
- IoT センサーデータの異常検知
- Web トラフィック・KPI のトレンド予測

---

## 参考文献

- [statsmodels 時系列ドキュメント](https://www.statsmodels.org/stable/tsa.html)
- [Prophet 公式ドキュメント](https://facebook.github.io/prophet/)
- [Darts — 時系列ライブラリ](https://unit8co.github.io/darts/)

<AffiliateBanner site="ml_intro" />
