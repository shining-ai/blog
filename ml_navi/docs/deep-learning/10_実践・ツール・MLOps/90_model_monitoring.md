import AffiliateBanner from '@site/src/components/AffiliateBanner';

# モデル監視

## モデル監視とは

> モデル監視（Model Monitoring）とは、本番環境に展開された機械学習モデルの精度・入力データの分布・推論速度などを継続的に監視し、劣化を早期に検出する仕組みである。データドリフト・コンセプトドリフトへの対応と再学習のトリガー管理が中心的な課題である。

## 劣化の種類

| 種類 | 説明 | 例 |
|------|------|-----|
| データドリフト | 入力特徴量の分布が学習時と変化する | 季節変動・ユーザー行動の変化 |
| コンセプトドリフト | 入出力の関係自体が変化する | 流行・経済環境の変化 |
| ラベルドリフト | 正解ラベルの分布が変化する | クラス不均衡の変化 |
| データ品質問題 | 欠損値増加・スキーマ変更など | センサー故障・上流システム変更 |

## ドリフト検出手法

| 手法 | 対象 | 概要 |
|------|------|------|
| PSI（Population Stability Index） | 連続・離散変数 | 分布の対称 KL 発散 |
| KS 検定（Kolmogorov-Smirnov） | 連続変数 | 累積分布関数の最大差 |
| カイ二乗検定 | カテゴリ変数 | 観測値と期待値の差 |
| ADWIN | ストリームデータ | 適応的なウィンドウでドリフト検出 |
| MMD（Maximum Mean Discrepancy） | 高次元特徴量 | カーネル関数を使った分布比較 |

## PSI の解釈基準

| PSI 値 | 判断 |
|--------|------|
| < 0.1 | ドリフトなし |
| 0.1〜0.2 | 軽微なドリフト（監視継続）|
| > 0.2 | 有意なドリフト（対応必要）|

## Python実装

```python
import numpy as np
import pandas as pd
from scipy import stats
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, field
from datetime import datetime
import warnings
warnings.filterwarnings("ignore")


# ==============================
# 1. PSI（Population Stability Index）
# ==============================
def compute_psi(
    baseline: np.ndarray,
    current: np.ndarray,
    n_bins: int = 10,
    eps: float = 1e-4,
) -> float:
    """PSI を計算する（連続変数）"""
    # ビン境界を baseline で定義
    percentiles = np.linspace(0, 100, n_bins + 1)
    bins = np.percentile(baseline, percentiles)
    bins[0] = -np.inf
    bins[-1] = np.inf

    baseline_counts = np.histogram(baseline, bins=bins)[0]
    current_counts  = np.histogram(current,  bins=bins)[0]

    baseline_pct = baseline_counts / len(baseline) + eps
    current_pct  = current_counts  / len(current)  + eps

    psi = np.sum((current_pct - baseline_pct) * np.log(current_pct / baseline_pct))
    return float(psi)


# ==============================
# 2. KS 検定（Kolmogorov-Smirnov）
# ==============================
def ks_test(
    baseline: np.ndarray, current: np.ndarray
) -> Tuple[float, float]:
    """KS 統計量と p 値を返す"""
    stat, pvalue = stats.ks_2samp(baseline, current)
    return float(stat), float(pvalue)


# ==============================
# 3. カイ二乗検定（カテゴリ変数）
# ==============================
def chi_square_test(
    baseline_counts: Dict[str, int],
    current_counts: Dict[str, int],
) -> Tuple[float, float]:
    """カテゴリ分布の比較"""
    categories = sorted(set(baseline_counts) | set(current_counts))
    baseline_arr = np.array([baseline_counts.get(c, 0) for c in categories], dtype=float)
    current_arr  = np.array([current_counts.get(c, 0),  for c in categories], dtype=float)

    # カイ二乗検定（baseline を期待値として正規化）
    baseline_arr += 1e-4  # スムージング
    current_arr  += 1e-4
    expected = baseline_arr / baseline_arr.sum() * current_arr.sum()
    stat, pvalue = stats.chisquare(current_arr, expected)
    return float(stat), float(pvalue)


# ==============================
# 4. モデル監視システム
# ==============================
@dataclass
class MonitoringAlert:
    feature: str
    metric: str
    value: float
    threshold: float
    severity: str  # "warning" or "critical"
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


class ModelMonitor:
    """本番モデルの継続監視クラス"""

    def __init__(
        self,
        psi_warning: float = 0.1,
        psi_critical: float = 0.2,
        ks_pvalue_threshold: float = 0.05,
        accuracy_drop_threshold: float = 0.05,
    ):
        self.psi_warning = psi_warning
        self.psi_critical = psi_critical
        self.ks_pvalue_threshold = ks_pvalue_threshold
        self.accuracy_drop_threshold = accuracy_drop_threshold

        self.baseline_data: Optional[pd.DataFrame] = None
        self.baseline_accuracy: Optional[float] = None
        self.history: List[Dict] = []

    def fit_baseline(self, baseline_df: pd.DataFrame, baseline_accuracy: float):
        """ベースライン（学習データの統計量）を設定"""
        self.baseline_data = baseline_df
        self.baseline_accuracy = baseline_accuracy
        print(f"ベースライン設定: {len(baseline_df)} サンプル, "
              f"accuracy={baseline_accuracy:.4f}")

    def check_data_drift(self, current_df: pd.DataFrame) -> List[MonitoringAlert]:
        """データドリフトの検出"""
        alerts = []
        numeric_cols = self.baseline_data.select_dtypes(include=np.number).columns

        for col in numeric_cols:
            if col not in current_df.columns:
                continue

            baseline_vals = self.baseline_data[col].dropna().values
            current_vals  = current_df[col].dropna().values

            # PSI
            psi = compute_psi(baseline_vals, current_vals)
            if psi > self.psi_critical:
                alerts.append(MonitoringAlert(
                    col, "psi", psi, self.psi_critical, "critical"
                ))
            elif psi > self.psi_warning:
                alerts.append(MonitoringAlert(
                    col, "psi", psi, self.psi_warning, "warning"
                ))

            # KS 検定
            ks_stat, ks_pvalue = ks_test(baseline_vals, current_vals)
            if ks_pvalue < self.ks_pvalue_threshold:
                alerts.append(MonitoringAlert(
                    col, "ks_pvalue", ks_pvalue, self.ks_pvalue_threshold, "warning"
                ))

        return alerts

    def check_prediction_drift(
        self,
        predictions: np.ndarray,
        current_accuracy: Optional[float] = None,
    ) -> List[MonitoringAlert]:
        """予測値・精度のドリフト検出"""
        alerts = []

        if current_accuracy is not None and self.baseline_accuracy is not None:
            drop = self.baseline_accuracy - current_accuracy
            if drop > self.accuracy_drop_threshold:
                severity = "critical" if drop > 0.1 else "warning"
                alerts.append(MonitoringAlert(
                    "model_accuracy", "accuracy_drop",
                    current_accuracy, self.baseline_accuracy - self.accuracy_drop_threshold,
                    severity
                ))

        return alerts

    def monitor(
        self,
        current_df: pd.DataFrame,
        predictions: np.ndarray,
        current_accuracy: Optional[float] = None,
    ) -> Dict:
        """監視の実行と結果の記録"""
        data_alerts = self.check_data_drift(current_df)
        pred_alerts = self.check_prediction_drift(predictions, current_accuracy)
        all_alerts = data_alerts + pred_alerts

        result = {
            "timestamp": datetime.now().isoformat(),
            "n_samples": len(current_df),
            "n_alerts": len(all_alerts),
            "n_critical": sum(1 for a in all_alerts if a.severity == "critical"),
            "n_warning":  sum(1 for a in all_alerts if a.severity == "warning"),
            "alerts": all_alerts,
            "needs_retraining": any(a.severity == "critical" for a in all_alerts),
        }
        self.history.append(result)
        return result


# ==============================
# 実行例
# ==============================
np.random.seed(42)
n_baseline = 5000

baseline_df = pd.DataFrame({
    "feature_1": np.random.normal(0, 1, n_baseline),
    "feature_2": np.random.exponential(1, n_baseline),
    "feature_3": np.random.uniform(0, 10, n_baseline),
})
baseline_accuracy = 0.85

monitor = ModelMonitor()
monitor.fit_baseline(baseline_df, baseline_accuracy)

# 正常なデータ（ドリフトなし）
current_normal = pd.DataFrame({
    "feature_1": np.random.normal(0.1, 1.0, 1000),
    "feature_2": np.random.exponential(1.05, 1000),
    "feature_3": np.random.uniform(0, 10, 1000),
})
result_normal = monitor.monitor(
    current_normal, np.random.randint(0, 2, 1000), current_accuracy=0.84
)
print(f"正常データ: alerts={result_normal['n_alerts']}, "
      f"critical={result_normal['n_critical']}")

# ドリフトが発生したデータ
current_drifted = pd.DataFrame({
    "feature_1": np.random.normal(2.0, 1.5, 1000),    # 大きくシフト
    "feature_2": np.random.exponential(3.0, 1000),     # スケール変化
    "feature_3": np.random.uniform(5, 15, 1000),       # 範囲が変化
})
result_drifted = monitor.monitor(
    current_drifted, np.random.randint(0, 2, 1000), current_accuracy=0.71
)
print(f"ドリフトデータ: alerts={result_drifted['n_alerts']}, "
      f"critical={result_drifted['n_critical']}")
print(f"再学習が必要: {result_drifted['needs_retraining']}")
for alert in result_drifted['alerts']:
    print(f"  [{alert.severity.upper()}] {alert.feature} ({alert.metric}): "
          f"{alert.value:.4f} (閾値: {alert.threshold:.4f})")
```

## 使用場面

- 本番環境での ML モデルのヘルスチェック
- データパイプラインの上流変更の自動検知
- 再学習トリガーの自動化
- SLA（Service Level Agreement）の遵守確認

## 参考文献

- Klaise, J., et al. (2020). Monitoring and explainability of models in production. *arXiv:2007.06299*.
- Evidentlyai 公式ドキュメント: https://docs.evidentlyai.com/
- Whylogs: https://whylogs.readthedocs.io/

<AffiliateBanner site="ml_intro" />
