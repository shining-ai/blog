import AffiliateBanner from '@site/src/components/AffiliateBanner';

# SLI・SLO・SLA

## SLI・SLO・SLA とは

> SLI（Service Level Indicator）はサービスの信頼性を測る具体的なメトリクス、SLO（Service Level Objective）はそのメトリクスの目標値、SLA（Service Level Agreement）はその目標を顧客と契約として合意した文書であり、この3層構造でサービスの信頼性を定量的に管理する。

**SLI**（サービスレベル指標）はサービスの動作を測定する具体的な数値である。代表例は可用性（成功リクエスト率）・レイテンシ（95パーセンタイル応答時間）・エラー率・スループット（RPS）・耐久性（データ保存率）。

**SLO**（サービスレベル目標）はSLIの目標値である。「月次の可用性99.9%以上」「95パーセンタイルのレイテンシ200ms以下」のように表現する。SLO を設定するとエラーバジェット（Error Budget）が生まれる：99.9%の SLO なら月次0.1%（約43分）の停止を「許容できる誤り」として持てる。エラーバジェットはデプロイリスクとイノベーション速度のバランスを取るための指標として使われる。

**SLA**（サービスレベル合意）は SLO を顧客との契約にしたもので、違反時のペナルティ（クレジット払い戻しなど）を含む。SLO は内部目標として SLA より厳しく設定するのが一般的（SLO 99.95% → SLA 99.9%など）。

## SLI・SLO・SLA の関係

| 概念 | 定義 | 例 |
|------|------|-----|
| SLI | 測定するメトリクス | 成功リクエスト率（%） |
| SLO | SLI の目標値 | 99.9% / 月（内部目標） |
| SLA | 顧客との契約 | 99.5% / 月（違反時にクレジット返金） |
| エラーバジェット | SLO から算出される許容誤り | 月43.2分の停止 |

```python
# SLI・SLO・エラーバジェットの計算デモ

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional

@dataclass
class SloConfig:
    name: str
    slo_percentage: float   # 例: 99.9
    window_days: int = 30   # 測定ウィンドウ（日）

    @property
    def error_budget_percentage(self) -> float:
        return 100.0 - self.slo_percentage

    @property
    def allowed_downtime_minutes(self) -> float:
        window_minutes = self.window_days * 24 * 60
        return window_minutes * (self.error_budget_percentage / 100)

    def __str__(self) -> str:
        return (
            f"SLO: {self.name}\n"
            f"  目標可用性: {self.slo_percentage}%\n"
            f"  エラーバジェット: {self.error_budget_percentage:.3f}%\n"
            f"  許容停止時間（{self.window_days}日間）: "
            f"{self.allowed_downtime_minutes:.1f}分 "
            f"（{self.allowed_downtime_minutes / 60:.2f}時間）"
        )


@dataclass
class SliMeasurement:
    """ある期間の SLI 測定値"""
    total_requests: int
    successful_requests: int
    downtime_minutes: float
    window_days: int = 30

    @property
    def availability(self) -> float:
        if self.total_requests == 0:
            return 100.0
        return (self.successful_requests / self.total_requests) * 100

    @property
    def error_rate(self) -> float:
        return 100.0 - self.availability


class ErrorBudgetTracker:
    """エラーバジェットの消費状況を追跡する"""

    def __init__(self, slo: SloConfig):
        self.slo = slo
        self.incidents: list[dict] = []

    def record_incident(self, description: str, downtime_minutes: float,
                        timestamp: Optional[datetime] = None) -> None:
        self.incidents.append({
            "description": description,
            "downtime_minutes": downtime_minutes,
            "timestamp": timestamp or datetime.now(),
        })

    @property
    def consumed_budget_minutes(self) -> float:
        return sum(inc["downtime_minutes"] for inc in self.incidents)

    @property
    def remaining_budget_minutes(self) -> float:
        return max(0, self.slo.allowed_downtime_minutes - self.consumed_budget_minutes)

    @property
    def budget_consumption_rate(self) -> float:
        if self.slo.allowed_downtime_minutes == 0:
            return 100.0
        return (self.consumed_budget_minutes / self.slo.allowed_downtime_minutes) * 100

    def status_report(self) -> str:
        status = "正常" if self.remaining_budget_minutes > 0 else "バジェット枯渇"
        return (
            f"=== エラーバジェットレポート: {self.slo.name} ===\n"
            f"  バジェット合計:   {self.slo.allowed_downtime_minutes:.1f}分\n"
            f"  消費済み:         {self.consumed_budget_minutes:.1f}分 "
            f"({self.budget_consumption_rate:.1f}%)\n"
            f"  残りバジェット:   {self.remaining_budget_minutes:.1f}分\n"
            f"  ステータス:       {status}\n"
            f"  インシデント数:   {len(self.incidents)}件"
        )


# ===== デモ =====
# 代表的な可用性ティアのエラーバジェット
tiers = [
    SloConfig("スタンダード", 99.0, 30),
    SloConfig("ハイアベイラビリティ", 99.9, 30),
    SloConfig("エンタープライズ", 99.99, 30),
    SloConfig("5ナイン", 99.999, 30),
]

print("=== 可用性ティア別エラーバジェット ===")
for t in tiers:
    print(t)
    print()

# エラーバジェットの消費シミュレーション
print("=== エラーバジェット追跡デモ ===")
api_slo = SloConfig("API Service", 99.9, 30)
tracker = ErrorBudgetTracker(api_slo)

tracker.record_incident("DB接続タイムアウト", 8.0)
tracker.record_incident("デプロイ後のサービス再起動", 3.5)
tracker.record_incident("外部決済APIの障害", 15.0)

print(tracker.status_report())
# 合計26.5分 / 許容43.2分 = 61.3% 消費

# SLI 測定値の評価
measurement = SliMeasurement(
    total_requests=1_000_000,
    successful_requests=998_500,
    downtime_minutes=26.5,
)
print(f"\n=== SLI 測定値 ===")
print(f"  可用性: {measurement.availability:.4f}%")
print(f"  SLO達成: {measurement.availability >= api_slo.slo_percentage}")
```

## 使用場面

- SRE（Site Reliability Engineering）チームがサービス信頼性目標を設定・管理するとき
- プラットフォームチームが内部サービスの信頼性をエラーバジェットで管理するとき
- クラウドサービスプロバイダーとの SLA 契約を評価・交渉するとき
- インシデント発生時にデプロイを抑制するエラーバジェットポリシーの運用

## 参考文献

- Beyer, B. et al. (2016). *Site Reliability Engineering*. O'Reilly. Chapter 4.
- [Google SRE Book - Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
- Beyer, B. et al. (2018). *The Site Reliability Workbook*. O'Reilly.

<AffiliateBanner site="cloud_navi" />
