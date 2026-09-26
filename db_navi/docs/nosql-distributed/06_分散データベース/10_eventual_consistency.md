import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 結果整合性と強整合性

## 結果整合性と強整合性とは

> 強整合性（Strong Consistency）とは全ての読み取りが直前の書き込みを反映することを保証するモデルであり、結果整合性（Eventual Consistency）とは更新が伝播すれば最終的に全レプリカが同じ値を持つことを保証する緩やかなモデルで、可用性・パフォーマンスとトレードオフの関係にある。

分散システムでデータを複数のノードに複製（レプリケーション）する際、全ノードにリアルタイムで同じ値を持たせることは高コストです。一貫性レベルはこのトレードオフを制御します。

強整合性（線形化可能性・Linearizability）は「分散システムが単一の複製のように振る舞う」保証です。全ての操作に全体的な順序があり、読み取りは常に最新書き込みを返します。ZooKeeper・HBase・etcd・Google Spanner が実装します。代償は遅延（書き込みをクォーラムで確認）と分断時の可用性低下です。

結果整合性（Eventual Consistency）は「しばらく待てば全ノードが同じ値になる」という緩い保証です。読み取りは古い値を返す可能性があります（Stale Read）。Cassandra・DynamoDB・Amazon S3 が採用します。DNS の伝播遅延もその例です。

結果整合性の強化版として、単調読み取り一貫性（以前に読んだ値より古い値は返さない）、自分の書き込みを読める（Read-Your-Writes: 自分が書いた値は必ず読める）、因果整合性（因果関係のある操作は正しい順序で見える）などの中間モデルがあります。

## 整合性レベルの比較

| レベル | 保証 | 遅延 | 可用性 | 実装例 |
|--------|------|------|--------|-------|
| 線形化可能性 | 最強の一貫性 | 高 | 低い | ZooKeeper, etcd |
| 逐次整合性 | 各プロセスの順序を保持 | 中高 | 中 | 古い Spanner |
| 因果整合性 | 依存関係のある操作の順序 | 中 | 高い | COPS, Bolt-on |
| 単調読み取り | 時間的後退なし | 低い | 高い | Sticky session |
| 結果整合性 | 最終的に収束 | 最低 | 最高 | Cassandra, S3 |

```python
import time
import random
import threading
from dataclasses import dataclass, field
from collections import defaultdict
from copy import deepcopy

# ===========================
# Vector Clock による因果整合性
# ===========================

class VectorClock:
    """ベクタークロック: 因果関係を追跡"""

    def __init__(self, node_id: str, all_nodes: list[str]):
        self.node_id = node_id
        self.clock: dict[str, int] = {n: 0 for n in all_nodes}

    def tick(self) -> dict[str, int]:
        """自ノードの論理時刻をインクリメント"""
        self.clock[self.node_id] += 1
        return deepcopy(self.clock)

    def update(self, received_clock: dict[str, int]) -> None:
        """受信したクロックとマージ"""
        for node, t in received_clock.items():
            self.clock[node] = max(self.clock.get(node, 0), t)
        self.clock[self.node_id] += 1  # 自分のカウントも増やす

    def happens_before(self, vc1: dict, vc2: dict) -> bool:
        """vc1 が vc2 より前に発生したか（因果関係）"""
        return (all(vc1.get(n, 0) <= vc2.get(n, 0) for n in set(vc1) | set(vc2))
                and any(vc1.get(n, 0) < vc2.get(n, 0) for n in set(vc1) | set(vc2)))

    def concurrent(self, vc1: dict, vc2: dict) -> bool:
        """vc1 と vc2 は並行（因果関係なし）"""
        return not self.happens_before(vc1, vc2) and not self.happens_before(vc2, vc1)


# ===========================
# 結果整合性の実装: CRDT（Conflict-free Replicated Data Type）
# ===========================

class GCounter:
    """G-Counter: インクリメントのみの CRDT カウンタ"""

    def __init__(self, node_id: str, all_nodes: list[str]):
        self.node_id = node_id
        self.counts: dict[str, int] = {n: 0 for n in all_nodes}

    def increment(self, amount: int = 1) -> None:
        self.counts[self.node_id] += amount

    def value(self) -> int:
        return sum(self.counts.values())

    def merge(self, other: "GCounter") -> None:
        """他ノードの状態とマージ（結果整合性）"""
        for node, count in other.counts.items():
            self.counts[node] = max(self.counts.get(node, 0), count)

    def __repr__(self):
        return f"GCounter({self.node_id}, counts={self.counts}, total={self.value()})"


class LWWRegister:
    """
    LWW-Register（Last-Write-Wins Register）
    タイムスタンプが最新の書き込みが勝つ結果整合性レジスタ
    """

    def __init__(self, node_id: str):
        self.node_id = node_id
        self.value = None
        self.timestamp = 0.0

    def write(self, value: object, timestamp: float | None = None) -> None:
        ts = timestamp if timestamp is not None else time.time()
        if ts > self.timestamp:
            self.value = value
            self.timestamp = ts

    def merge(self, other: "LWWRegister") -> None:
        """最新のタイムスタンプを採用"""
        if other.timestamp > self.timestamp:
            self.value = other.value
            self.timestamp = other.timestamp

    def __repr__(self):
        return f"LWWRegister({self.node_id}, value={self.value!r}, ts={self.timestamp:.3f})"


# ===========================
# 整合性レベルのシミュレーション
# ===========================

@dataclass
class VersionedValue:
    value: object
    version: int
    node: str


class EventualConsistencyDB:
    """結果整合性データベースのシミュレーション"""

    def __init__(self, n_nodes: int = 3):
        self.nodes: list[dict] = [{} for _ in range(n_nodes)]
        self.n_nodes = n_nodes
        self.versions: dict[str, list[VersionedValue]] = defaultdict(list)
        self._version_counter = 0

    def write(self, key: str, value: object, node_idx: int = 0) -> int:
        """指定ノードに書き込み（非同期レプリケーション）"""
        self._version_counter += 1
        version = self._version_counter
        self.nodes[node_idx][key] = value
        self.versions[key].append(VersionedValue(value, version, f"node-{node_idx}"))
        return version

    def replicate(self, delay: float = 0.0) -> None:
        """全ノードに最新値を伝播（結果整合性の収束）"""
        if delay > 0:
            time.sleep(delay)
        for key, history in self.versions.items():
            latest = max(history, key=lambda v: v.version)
            for node in self.nodes:
                node[key] = latest.value

    def read(self, key: str, node_idx: int = 0) -> object:
        return self.nodes[node_idx].get(key)


print("=== 結果整合性と強整合性デモ ===\n")

nodes = ["A", "B", "C"]

# Vector Clock のデモ
print("[Vector Clock: 因果関係の追跡]")
vc_a = VectorClock("A", nodes)
vc_b = VectorClock("B", nodes)

ts1 = vc_a.tick()
print(f"  A が操作1: clock={ts1}")

vc_b.update(ts1)
ts2 = vc_b.tick()
print(f"  B が A の操作を受信後に操作2: clock={ts2}")

ts3 = vc_a.tick()
print(f"  A が操作3（B の操作を知らない）: clock={ts3}")

print(f"  操作1 → 操作2 の因果関係: {vc_a.happens_before(ts1, ts2)}")
print(f"  操作3 と 操作2 は並行: {vc_a.concurrent(ts3, ts2)}")

# G-Counter CRDT
print("\n[G-Counter CRDT: 競合のない分散カウンタ]")
counter_a = GCounter("A", nodes)
counter_b = GCounter("B", nodes)
counter_c = GCounter("C", nodes)

counter_a.increment(5)
counter_b.increment(3)
counter_c.increment(2)
print(f"  各ノードの独立インクリメント後: A={counter_a.value()}, B={counter_b.value()}, C={counter_c.value()}")

# マージ（収束）
counter_a.merge(counter_b)
counter_a.merge(counter_c)
counter_b.merge(counter_a)
counter_c.merge(counter_a)
print(f"  マージ後の全ノード値: A={counter_a.value()}, B={counter_b.value()}, C={counter_c.value()}")
print(f"  全て同じ値に収束: {counter_a.value() == counter_b.value() == counter_c.value()}")

# LWW-Register
print("\n[LWW-Register: Last-Write-Wins]")
reg_a = LWWRegister("A")
reg_b = LWWRegister("B")

reg_a.write("Alice_v1", timestamp=1000.0)
reg_b.write("Alice_v2", timestamp=1001.0)

reg_a.merge(reg_b)
print(f"  A と B のマージ後: {reg_a.value!r} (最新タイムスタンプが勝ち)")

# 結果整合性 DB のシミュレーション
print("\n[結果整合性 DB: 分散書き込みと収束]")
evdb = EventualConsistencyDB(n_nodes=3)
evdb.write("user:1", {"name": "Alice", "balance": 1000}, node_idx=0)
evdb.write("user:1", {"name": "Alice", "balance": 900},  node_idx=1)  # 非同期書き込み

print(f"  レプリケーション前: node-0={evdb.read('user:1', 0)['balance']}, node-2={evdb.read('user:1', 2)}")
evdb.replicate()
print(f"  レプリケーション後（収束）: node-0={evdb.read('user:1', 0)['balance']}, node-2={evdb.read('user:1', 2)['balance']}")
```

## 使用場面

- 銀行の残高管理や在庫の厳密な数量管理など「読み取りは必ず最新値」が必要なシステムに強整合性を採用する場面
- ソーシャルメディアの「いいね」カウントや閲覧数など多少のズレが許容できるカウンタに G-Counter CRDT を使う場面
- 分散システムの整合性モデルを要件に合わせて設計する際に各トレードオフを正確に理解して選択する場面

## 参考文献

- Kleppmann, M. "Designing Data-Intensive Applications" (O'Reilly)
- Shapiro, M. et al. "Conflict-free Replicated Data Types" (2011)
- Vogels, W. "Eventually Consistent" (ACM Queue 2009)

<AffiliateBanner site="db_navi" />
