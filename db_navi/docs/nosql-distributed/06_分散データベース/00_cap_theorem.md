import AffiliateBanner from '@site/src/components/AffiliateBanner';

# CAP 定理

## CAP 定理とは

> CAP 定理とは分散システムは「一貫性（Consistency）」「可用性（Availability）」「分断耐性（Partition Tolerance）」の 3 つの保証を同時に完全には満たせず、ネットワーク分断が発生する現実では CA・AP・CP のいずれかのトレードオフを選択しなければならないという定理である。

CAP 定理は Eric Brewer が 2000 年に提唱し、Gilbert と Lynch が 2002 年に形式的に証明しました。各特性の定義は次の通りです。

一貫性（C）: 全ノードが同じデータを持ち、読み取りは常に最新の書き込みを返す（線形化可能性）。可用性（A）: 全てのリクエストがエラーなしにレスポンスを返す（ただし最新データとは限らない）。分断耐性（P）: ネットワーク分断が発生しても動作を継続する。

実際のインターネット環境ではネットワーク分断は避けられないため P は必須です。したがって実質的な選択は「CP（分断時に可用性を犠牲にして一貫性を保つ）」か「AP（分断時に一貫性を犠牲にして可用性を保つ）」かです。

PACELC（Martin Kleppmann らが提唱）はより実践的な拡張です。分断時（P）に AP を選択するか CP を選択するか、分断なし（E）のときに遅延（L）と一貫性（C）のどちらを優先するかを組み合わせて表現します。

## データベースと CAP の分類

| システム | 分類 | 理由 |
|---------|------|------|
| ZooKeeper | CP | 分断時にリクエストを拒否 |
| HBase | CP | HDFS 上の強一貫性 |
| MongoDB（デフォルト） | CP | プライマリ選出で一貫性優先 |
| Cassandra | AP | 全ノードが書き込みを受け付ける |
| DynamoDB | AP | 結果整合性がデフォルト |
| CockroachDB | CP | Raft コンセンサスで強一貫性 |

```python
import random
import time
from dataclasses import dataclass, field
from enum import Enum
from copy import deepcopy

class ConsistencyModel(Enum):
    STRONG    = "Strong Consistency (CP)"
    EVENTUAL  = "Eventual Consistency (AP)"

@dataclass
class Node:
    node_id: str
    data: dict = field(default_factory=dict)
    is_partitioned: bool = False
    is_primary: bool = False

    def write(self, key: str, value: object) -> bool:
        if self.is_partitioned and not self.is_primary:
            return False  # CP: 分断中はスタンバイへの書き込みを拒否
        self.data[key] = value
        return True

    def read(self, key: str) -> object:
        return self.data.get(key)


class DistributedDatabase:
    """CAP 定理をシミュレートする分散データベース"""

    def __init__(self, consistency: ConsistencyModel, n_nodes: int = 3):
        self.consistency = consistency
        self.nodes: list[Node] = [
            Node(f"node-{i}", is_primary=(i == 0))
            for i in range(n_nodes)
        ]
        self.partition_active = False

    def write(self, key: str, value: object) -> dict:
        """書き込み操作"""
        primary = self.nodes[0]

        if self.consistency == ConsistencyModel.STRONG:
            # CP: 全ノードに同期書き込み（分断中は失敗）
            reachable = [n for n in self.nodes if not n.is_partitioned]
            if len(reachable) < len(self.nodes) // 2 + 1:
                return {"success": False, "error": "クォーラム不足: 一貫性を保つため書き込みを拒否"}
            for node in reachable:
                node.data[key] = value
            return {"success": True, "written_to": [n.node_id for n in reachable]}
        else:
            # AP: プライマリに書き込み、非同期で伝播（分断中も受け付ける）
            primary.data[key] = value
            propagated = [primary.node_id]
            for node in self.nodes[1:]:
                if not node.is_partitioned:
                    node.data[key] = value
                    propagated.append(node.node_id)
                # 分断中のノードはキューに積んで後で同期（結果整合性）
            return {"success": True, "written_to": propagated, "pending_sync": [
                n.node_id for n in self.nodes[1:] if n.is_partitioned
            ]}

    def read(self, key: str, node_id: str = "node-0") -> dict:
        """読み取り操作"""
        node = next((n for n in self.nodes if n.node_id == node_id), self.nodes[0])

        if self.consistency == ConsistencyModel.STRONG:
            # CP: 常に最新値（プライマリから読む）
            return {"value": self.nodes[0].data.get(key), "node": "node-0 (primary)", "fresh": True}
        else:
            # AP: 最寄りのノードから読む（古い値の可能性あり）
            return {"value": node.data.get(key), "node": node_id, "fresh": not node.is_partitioned}

    def simulate_partition(self, node_ids: list[str]) -> None:
        """ネットワーク分断のシミュレーション"""
        for node in self.nodes:
            node.is_partitioned = node.node_id in node_ids
        self.partition_active = True

    def heal_partition(self) -> None:
        """分断の解消と同期（結果整合性の場合）"""
        primary = self.nodes[0]
        for node in self.nodes:
            node.is_partitioned = False
            if self.consistency == ConsistencyModel.EVENTUAL:
                # AP: 分断解消後に最新データを同期
                node.data = deepcopy(primary.data)
        self.partition_active = False


def run_demo():
    print("=== CAP 定理デモ ===\n")

    for model in [ConsistencyModel.STRONG, ConsistencyModel.EVENTUAL]:
        print(f"[{model.value}]")
        db = DistributedDatabase(consistency=model, n_nodes=3)

        # 初期書き込み
        result = db.write("user:1", {"name": "Alice", "balance": 1000})
        print(f"  初期書き込み: {result}")

        # ネットワーク分断発生
        print(f"  !! ネットワーク分断発生: node-2 が孤立")
        db.simulate_partition(["node-2"])

        # 分断中の書き込み
        result = db.write("user:1", {"name": "Alice", "balance": 900})
        print(f"  分断中の書き込み: {result}")

        # 各ノードからの読み取り
        for node_id in ["node-0", "node-1", "node-2"]:
            r = db.read("user:1", node_id)
            val = r["value"]
            balance = val.get("balance") if val else "N/A"
            print(f"  {node_id} から読み取り: balance={balance}, fresh={r['fresh']}")

        # 分断解消
        db.heal_partition()
        print(f"  分断解消後の node-2 の値: {db.read('user:1', 'node-2')['value']}")
        print()

run_demo()

print("[PACELC フレームワーク]")
pacelc_table = [
    ("Cassandra", "PA/EL", "分断: AP選択, 通常: 低遅延優先"),
    ("DynamoDB",  "PA/EL", "分断: AP選択, 通常: 低遅延優先"),
    ("CockroachDB","PC/EC","分断: CP選択, 通常: 高一貫性優先"),
    ("ZooKeeper", "PC/EC", "分断: CP選択, 通常: 高一貫性優先"),
    ("MongoDB",   "PC/EC", "分断: CP選択, 通常: 設定可能"),
]
print(f"  {'システム':<15} {'PACELC':>8} {'説明':>40}")
for name, pacelc, desc in pacelc_table:
    print(f"  {name:<15} {pacelc:>8}   {desc}")
```

## 使用場面

- 金融システムや在庫管理など「整合性が最優先」の場合に CP データベース（CockroachDB・ZooKeeper）を選択する場面
- グローバルなリアルタイムサービスで「分断中も書き込みを受け付ける」必要がある場合に AP データベース（Cassandra・DynamoDB）を選択する場面
- システム設計のレビューで CAP トレードオフを意識してデータベースの選択基準を議論する場面

## 参考文献

- Brewer, E. "Towards Robust Distributed Systems" (PODC Keynote 2000)
- Gilbert, S. and Lynch, N. "Brewer's conjecture and the feasibility of consistent, available, partition-tolerant web services" (2002)
- Kleppmann, M. "Designing Data-Intensive Applications" (O'Reilly)

<AffiliateBanner site="db_navi" />
