import AffiliateBanner from '@site/src/components/AffiliateBanner';

# レプリケーション（同期・非同期・半同期）

## レプリケーションとは

> レプリケーション（Replication）とはデータを複数のサーバ（レプリカ）にコピーして冗長化することで高可用性・耐障害性・読み取り性能の向上を実現する技法であり、同期・非同期・半同期の 3 種類の伝播方式のトレードオフが重要である。

レプリケーションはデータの冗長化により「プライマリノードが障害を起こしてもサービスを継続できる」可用性と、「複数レプリカへの読み取り分散によるスケールアウト」を実現します。

同期レプリケーション（Synchronous）では書き込みが全レプリカに反映されてから完了応答を返します。データ損失ゼロを保証しますが、遅いレプリカが全体の速度を制限します（最も遅いレプリカの速度になる）。

非同期レプリケーション（Asynchronous）ではプライマリへの書き込みが完了した時点でクライアントに応答し、レプリカへの伝播は後で行います。高速ですがフェイルオーバー時にデータ損失（RPO > 0）の可能性があります。MySQL のデフォルト・Amazon RDS の設定可能オプションです。

半同期レプリケーション（Semi-synchronous）は中間の選択です。少なくとも 1 つのレプリカへの伝播を確認してから応答します。MySQL の半同期プラグインが実装します。1 レプリカ分のデータは保証しつつ性能への影響を最小化できます。

フェイルオーバーは障害検知後にスタンバイをプライマリに昇格する処理です。自動フェイルオーバー（MHA・Orchestrator・Patroni など）でダウンタイムを数十秒に抑えられます。

## 同期・非同期・半同期の比較

| モード | 書き込み遅延 | データ損失リスク | 整合性 | 用途 |
|--------|-----------|--------------|--------|------|
| 同期 | 高い | なし（RPO=0） | 強い | 金融・決済 |
| 非同期 | 低い | あり（RPO>0） | 弱い | ログ・分析 |
| 半同期 | 中程度 | 最小化 | 中程度 | 汎用 Web |
| QUORUM | 中程度 | 設定次第 | 調整可能 | Cassandra 等 |

```python
import time
import random
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

class ReplicationMode(Enum):
    SYNC  = "synchronous"
    ASYNC = "asynchronous"
    SEMI  = "semi-synchronous"

@dataclass
class ReplicationLag:
    """レプリケーション遅延情報"""
    replica_id: str
    lag_ms: int  # レプリケーション遅延（ミリ秒）
    is_synced: bool

@dataclass
class WriteResult:
    success: bool
    latency_ms: float
    ack_count: int
    data_loss_risk: bool
    details: str = ""


class ReplicaNode:
    """レプリカノード"""

    def __init__(self, replica_id: str, network_latency_ms: int = 10):
        self.replica_id = replica_id
        self.data: dict = {}
        self.applied_lsn: int = 0  # 適用済みの LSN（Log Sequence Number）
        self.network_latency_ms = network_latency_ms
        self.is_up: bool = True
        self.pending_writes: list[tuple[int, str, object]] = []  # 非同期ペンディング

    def apply(self, lsn: int, key: str, value: object) -> bool:
        """変更を適用"""
        if not self.is_up:
            return False
        self.data[key] = value
        self.applied_lsn = lsn
        return True

    def lag(self, primary_lsn: int) -> int:
        """レプリケーション遅延"""
        return primary_lsn - self.applied_lsn


class PrimaryNode:
    """プライマリノード（書き込みを受け付ける）"""

    def __init__(self, mode: ReplicationMode):
        self.mode = mode
        self.data: dict = {}
        self.lsn: int = 0  # Log Sequence Number（書き込みの通し番号）
        self.replicas: list[ReplicaNode] = []
        self._async_queue: list[tuple[int, str, object]] = []

    def add_replica(self, replica: ReplicaNode) -> None:
        self.replicas.append(replica)

    def write(self, key: str, value: object) -> WriteResult:
        """書き込み処理"""
        start = time.perf_counter()
        self.lsn += 1
        current_lsn = self.lsn

        # プライマリへの書き込み
        self.data[key] = value

        ack_count = 1
        data_loss_risk = False

        if self.mode == ReplicationMode.SYNC:
            # 同期: 全レプリカへの適用を待つ
            replication_latency = 0
            for replica in self.replicas:
                if replica.is_up:
                    # ネットワーク遅延をシミュレート
                    replication_latency = max(replication_latency, replica.network_latency_ms)
                    replica.apply(current_lsn, key, value)
                    ack_count += 1
            # 遅延を時間に換算
            elapsed = (time.perf_counter() - start) * 1000 + replication_latency
            return WriteResult(True, elapsed, ack_count, False,
                               f"全 {ack_count} ノードに同期完了")

        elif self.mode == ReplicationMode.ASYNC:
            # 非同期: プライマリの書き込み完了ですぐ応答
            self._async_queue.append((current_lsn, key, value))
            elapsed = (time.perf_counter() - start) * 1000
            # 稼働中のレプリカ数を確認
            live_replicas = [r for r in self.replicas if r.is_up]
            data_loss_risk = len(live_replicas) < len(self.replicas)
            return WriteResult(True, elapsed, 1, len(live_replicas) == 0,
                               f"非同期キュー追加（{len(self._async_queue)}件ペンディング）")

        else:  # SEMI
            # 半同期: 少なくとも 1 レプリカへの確認を待つ
            synced = False
            max_latency = 0
            for replica in self.replicas:
                if replica.is_up:
                    max_latency = max(max_latency, replica.network_latency_ms)
                    replica.apply(current_lsn, key, value)
                    ack_count += 1
                    synced = True
                    break  # 最初の 1 つで OK
            elapsed = (time.perf_counter() - start) * 1000 + (max_latency if synced else 0)
            return WriteResult(True, elapsed, ack_count, not synced,
                               f"半同期: {ack_count} ノードで確認" + (" (データ損失リスクあり)" if not synced else ""))

    def flush_async_queue(self) -> int:
        """非同期キューをフラッシュ（バックグラウンドで実行）"""
        count = 0
        for lsn, key, value in self._async_queue:
            for replica in self.replicas:
                if replica.is_up:
                    replica.apply(lsn, key, value)
                    count += 1
        self._async_queue.clear()
        return count

    def replication_status(self) -> list[ReplicationLag]:
        """レプリケーション遅延の確認"""
        return [
            ReplicationLag(
                replica_id=r.replica_id,
                lag_ms=r.lag(self.lsn),
                is_synced=r.lag(self.lsn) == 0,
            )
            for r in self.replicas
        ]


def run_demo():
    print("=== レプリケーションデモ ===\n")

    for mode in ReplicationMode:
        print(f"[{mode.value}]")
        primary = PrimaryNode(mode)

        replica1 = ReplicaNode("replica-1", network_latency_ms=5)
        replica2 = ReplicaNode("replica-2", network_latency_ms=50)  # 遅いレプリカ
        primary.add_replica(replica1)
        primary.add_replica(replica2)

        # 通常書き込み
        result = primary.write("user:1", {"name": "Alice"})
        print(f"  通常書き込み: latency={result.latency_ms:.2f}ms, acks={result.ack_count}, {result.details}")

        # 非同期の場合はキューをフラッシュ
        if mode == ReplicationMode.ASYNC:
            n = primary.flush_async_queue()
            print(f"  非同期フラッシュ: {n} 件をレプリカに適用")

        # レプリケーション状態
        status = primary.replication_status()
        for s in status:
            print(f"  {s.replica_id}: lag={s.lag_ms}, synced={s.is_synced}")

        # 障害シミュレーション（replica-2 がダウン）
        replica2.is_up = False
        result2 = primary.write("user:2", {"name": "Bob"})
        print(f"  replica-2 障害中の書き込み: acks={result2.ack_count}, data_loss_risk={result2.data_loss_risk}")
        replica2.is_up = True
        print()


run_demo()

print("[フェイルオーバーの流れ（自動）]")
steps = [
    "1. ヘルスチェックがプライマリへの接続失敗を検知（~30秒）",
    "2. フェイルオーバーマネージャ（Patroni/Orchestrator）が判断",
    "3. 最もレプリケーション遅延が少ないレプリカをプライマリに昇格",
    "4. DNS/VIP（仮想IP）を新プライマリに切り替え",
    "5. 他のレプリカは新プライマリに接続してレプリケーション再開",
    "6. アプリは自動的に新プライマリに接続（RPO: 非同期では秒〜分のデータ損失）",
]
for step in steps:
    print(f"  {step}")
```

## 使用場面

- 高可用性を必要とする本番データベースで同期または半同期レプリケーションを設定して自動フェイルオーバーを実現する場面
- 読み取り専用のレポート・分析クエリをスタンバイレプリカに向けてプライマリの負荷を軽減する場面
- 地理的に離れたデータセンター間で非同期レプリケーションを使ってディザスタリカバリ（DR）構成を構築する場面

## 参考文献

- Kleppmann, M. "Designing Data-Intensive Applications" (O'Reilly)
- [MySQL – Replication](https://dev.mysql.com/doc/refman/8.0/en/replication.html)
- [PostgreSQL – High Availability, Load Balancing, and Replication](https://www.postgresql.org/docs/current/high-availability.html)

<AffiliateBanner site="db_navi" />
