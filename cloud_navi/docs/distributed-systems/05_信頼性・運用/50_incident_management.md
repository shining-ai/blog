import AffiliateBanner from '@site/src/components/AffiliateBanner';

# インシデント管理と障害対応

## インシデント管理とは

> インシデント管理（Incident Management）とは、本番サービスに影響を与える障害の検知・対応・復旧・事後分析のプロセスを体系化した取り組みであり、SRE（Site Reliability Engineering）の中核的なプラクティスの一つである。

インシデントは「サービスの正常な動作を阻害するあらゆる事象」を指す。対応の速度と質はシステムの設計だけでなく、チームのプロセスとツール、そして**心理的安全性**（障害を正直に報告できる文化）に大きく依存する。

**インシデント対応の流れ**：1. **検知**（アラート・顧客報告・SLO バーン）→ 2. **トリアージ**（影響範囲・重大度の判断）→ 3. **エスカレーション**（インシデントコマンダーの指定）→ 4. **調査・緩和**（ロールバック・フィーチャーフラグ無効化など）→ 5. **解決**（根本原因の特定と修正）→ 6. **事後分析（ポストモーテム）**。

**ポストモーテム**（事後分析）はインシデント後に行う「なぜ起きたか、再発を防ぐにはどうするか」の振り返りである。Google の SRE は「非難なきポストモーテム（Blameless Postmortem）」を強調する：個人の責任を問わず、システム・プロセス・ツールの改善を通じて再発を防ぐことに集中する。

## インシデント重大度レベル

| 重大度 | 影響 | 対応速度 | 例 |
|--------|------|---------|-----|
| SEV-1 | 全サービス停止・重大なデータ損失 | 即時（24時間対応） | サービス完全ダウン・決済停止 |
| SEV-2 | 主要機能の障害・SLO 違反 | 1時間以内 | ログイン不能・API エラー率急増 |
| SEV-3 | 一部機能の低下・パフォーマンス劣化 | 業務時間内 | レイテンシ増加・一部機能エラー |
| SEV-4 | 軽微な問題・影響限定的 | 次スプリント | UI の表示崩れ・ログ欠損 |

```python
# インシデント管理ワークフローの実装デモ

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
import uuid

class Severity(Enum):
    SEV1 = 1
    SEV2 = 2
    SEV3 = 3
    SEV4 = 4

class IncidentStatus(Enum):
    DETECTED = "detected"
    INVESTIGATING = "investigating"
    MITIGATED = "mitigated"
    RESOLVED = "resolved"
    POSTMORTEM = "postmortem"

@dataclass
class TimelineEntry:
    timestamp: datetime
    author: str
    action: str
    details: str

@dataclass
class Incident:
    title: str
    severity: Severity
    affected_services: list[str]
    description: str
    id: str = field(default_factory=lambda: f"INC-{str(uuid.uuid4())[:6].upper()}")
    status: IncidentStatus = IncidentStatus.DETECTED
    commander: Optional[str] = None
    detected_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    mitigated_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    timeline: list[TimelineEntry] = field(default_factory=list)
    action_items: list[str] = field(default_factory=list)  # ポストモーテムのアクション

    def add_timeline_entry(self, author: str, action: str, details: str = "") -> None:
        self.timeline.append(TimelineEntry(
            timestamp=datetime.now(timezone.utc),
            author=author,
            action=action,
            details=details,
        ))

    def assign_commander(self, name: str) -> None:
        self.commander = name
        self.status = IncidentStatus.INVESTIGATING
        self.add_timeline_entry(name, "インシデントコマンダーに就任")

    def mitigate(self, by: str, how: str) -> None:
        self.status = IncidentStatus.MITIGATED
        self.mitigated_at = datetime.now(timezone.utc)
        self.add_timeline_entry(by, "緩和措置を実施", how)

    def resolve(self, by: str, root_cause: str) -> None:
        self.status = IncidentStatus.RESOLVED
        self.resolved_at = datetime.now(timezone.utc)
        self.add_timeline_entry(by, "インシデント解決", f"根本原因: {root_cause}")

    @property
    def time_to_mitigate_minutes(self) -> Optional[float]:
        if self.mitigated_at:
            return (self.mitigated_at - self.detected_at).total_seconds() / 60
        return None

    @property
    def time_to_resolve_minutes(self) -> Optional[float]:
        if self.resolved_at:
            return (self.resolved_at - self.detected_at).total_seconds() / 60
        return None

    def generate_postmortem_template(self) -> str:
        """ポストモーテムのテンプレートを生成"""
        ttm = f"{self.time_to_mitigate_minutes:.1f}分" if self.time_to_mitigate_minutes else "未緩和"
        ttr = f"{self.time_to_resolve_minutes:.1f}分" if self.time_to_resolve_minutes else "未解決"

        timeline_text = "\n".join(
            f"- {e.timestamp.strftime('%H:%M UTC')} [{e.author}] {e.action}"
            + (f"\n  詳細: {e.details}" if e.details else "")
            for e in self.timeline
        )

        return f"""# ポストモーテム: {self.title}

## 概要
- インシデント ID: {self.id}
- 重大度: {self.severity.name}
- 影響サービス: {', '.join(self.affected_services)}
- 検知日時: {self.detected_at.strftime('%Y-%m-%d %H:%M UTC')}
- 緩和時間（TTM）: {ttm}
- 解決時間（TTR）: {ttr}

## インパクト
[ユーザーへの影響・影響を受けたユーザー数・期間を記載]

## タイムライン
{timeline_text}

## 根本原因
[なぜこのインシデントが発生したか。システム・プロセスの観点で記載。個人の責任を問わない]

## 何がうまく機能したか
-
-

## 何を改善すべきか
-
-

## アクションアイテム
{chr(10).join(f'- [ ] {item}' for item in self.action_items) if self.action_items else '（TBD）'}
"""


# ===== デモ: インシデント対応シミュレーション =====
import time as _time

incident = Incident(
    title="決済 API の応答タイムアウト - SEV2",
    severity=Severity.SEV2,
    affected_services=["payment-service", "order-service"],
    description="決済 API の P99 レイテンシが 5000ms を超え、注文完了率が 40% 低下",
)

print(f"=== インシデント検知: {incident.id} ===")
incident.add_timeline_entry("Alertmanager", "アラート発火",
    "payment_api_latency_p99 > 5000ms (閾値: 500ms)")

_time.sleep(0.1)
incident.assign_commander("Alice（SRE on-call）")
incident.add_timeline_entry("Alice", "調査開始",
    "Grafana で決済サービスの RPS・レイテンシ・エラー率を確認")

_time.sleep(0.1)
incident.add_timeline_entry("Bob（Backend）", "原因特定",
    "DB コネクションプールが枯渇。新デプロイ (v2.3.1) でコネクション数の設定が変更されていた")

_time.sleep(0.1)
incident.mitigate("Alice", "v2.3.1 から v2.3.0 へのロールバックを実施")

_time.sleep(0.1)
incident.resolve("Bob", "v2.3.1 での DB_MAX_CONNECTIONS 設定値の誤り（10 → 100 に変更済み）")

# アクションアイテムの追加
incident.action_items = [
    "DB コネクション設定のステージング環境での負荷テストを CI に追加",
    "DB コネクション枯渇のアラートを追加（現在は未設定）",
    "デプロイ後の自動スモークテストにコネクションプール監視を追加",
    "Runbook に DB コネクション枯渇の対応手順を追記",
]

print(f"  ステータス: {incident.status.value}")
print(f"  緩和時間: {incident.time_to_mitigate_minutes:.0f}分")
print(f"  解決時間: {incident.time_to_resolve_minutes:.0f}分")

print("\n" + incident.generate_postmortem_template())
```

## 使用場面

- SRE チームがオンコールローテーションと障害対応プロセスを確立するとき
- PagerDuty・Opsgenie・VictorOps などのアラートツールと連携した対応フロー設計
- ポストモーテムドキュメントを Git で管理してナレッジベース化するとき
- MTTR（平均復旧時間）を KPI として改善サイクルを回すとき

## 参考文献

- Beyer, B. et al. (2016). *Site Reliability Engineering*. O'Reilly. Chapter 14–15.
- [Google SRE Book - Managing Incidents](https://sre.google/sre-book/managing-incidents/)
- Limoncelli, T. et al. (2016). *The Practice of Cloud System Administration*. Addison-Wesley.

<AffiliateBanner site="cloud_navi" />
