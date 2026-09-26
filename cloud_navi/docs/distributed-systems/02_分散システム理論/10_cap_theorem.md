import AffiliateBanner from '@site/src/components/AffiliateBanner';

# CAP 定理の詳解

## CAP 定理とは

> CAP 定理とは、分散データストアにおいて「一貫性（Consistency）」「可用性（Availability）」「分断耐性（Partition Tolerance）」の3つを同時に保証することは不可能であり、ネットワーク分断が発生した場合は一貫性か可用性のどちらかを犠牲にしなければならないという定理である。

CAP定理はコンピュータ科学者Eric Brewerが2000年に提唱し、Gilbert・Lynchが2002年に証明した。分散システム設計の最も基本的な制約を示すものだ。

**一貫性（Consistency）**は、すべてのノードが同じデータを見られることを意味する。あるノードに書き込んだ直後、別のノードから読んでも同じ値が返る（線形化可能性）。

**可用性（Availability）**は、システムが常にリクエストに応答することを意味する。応答が遅いのは許容されるが、エラーを返すのは不可とする（ただしデータが最新かどうかは保証しない）。

**分断耐性（Partition Tolerance）**は、ネットワーク分断（ノード間の通信断絶）が起きてもシステムが動作し続けることを意味する。

実際のインターネット環境ではネットワーク分断は必ず起きうるため、分断耐性はほぼ必須だ。つまり実際の選択は「CAのどちらを優先するか」になる。**CPシステム**（一貫性優先：分断時は応答しない）と**APシステム**（可用性優先：分断時は古いデータを返す）という分類が実用的だ。

なお、Brewerも後年に指摘しているように、CAP定理は単純化した見方であり、実際には一貫性モデルも可用性モデルも連続的なトレードオフがある（PACELCモデルなど）。

## CAP 分類と代表的なデータストア

| 分類 | 特性 | 代表的なデータストア |
|------|------|-------------------|
| CP | 一貫性 + 分断耐性 | HBase・MongoDB・ZooKeeper・etcd |
| AP | 可用性 + 分断耐性 | Cassandra・CouchDB・DynamoDB |
| CA | 一貫性 + 可用性（分断なし前提） | 従来のRDBMS（単一ノード） |

```python
# CAP 定理のシミュレーション例
# CP システム（ZooKeeper/etcd 的な挙動）と AP システム（Cassandra 的な挙動）の比較

from enum import Enum
from dataclasses import dataclass
from typing import Optional
import time

class SystemMode(Enum):
    CP = "CP"  # 一貫性優先（分断時は書き込み拒否）
    AP = "AP"  # 可用性優先（分断時は古いデータを返す）

@dataclass
class DataEntry:
    value: str
    version: int
    timestamp: float

class SimulatedDistributedStore:
    """
    CAP 定理のトレードオフをシミュレーションする分散ストア
    """
    def __init__(self, mode: SystemMode, num_nodes: int = 3):
        self.mode = mode
        self.nodes = [{} for _ in range(num_nodes)]
        self.is_partitioned = False  # ネットワーク分断フラグ
        self.primary_node = 0

    def simulate_partition(self, partitioned: bool):
        """ネットワーク分断をシミュレート"""
        self.is_partitioned = partitioned
        print(f"\n{'=== ネットワーク分断発生 ===' if partitioned else '=== 分断解消 ==='}")

    def write(self, key: str, value: str) -> bool:
        """データの書き込み"""
        entry = DataEntry(value=value, version=1, timestamp=time.time())

        if self.is_partitioned:
            if self.mode == SystemMode.CP:
                # CP: クォーラム数のノードに書き込めない場合は拒否
                print(f"[CP] 書き込み拒否: ネットワーク分断中 (key={key})")
                raise Exception("Write rejected: cannot reach quorum during partition")
            elif self.mode == SystemMode.AP:
                # AP: 到達可能なノードにだけ書き込む（分断解消後に同期）
                self.nodes[self.primary_node][key] = entry
                print(f"[AP] 部分書き込み成功: プライマリノードのみ更新 (key={key})")
                return True

        # 正常時: 全ノードに書き込む
        for node in self.nodes:
            node[key] = entry
        print(f"全ノードへの書き込み成功 (key={key}, value={value})")
        return True

    def read(self, key: str, node_id: int = 0) -> Optional[str]:
        """データの読み込み"""
        if self.is_partitioned and self.mode == SystemMode.AP:
            # AP: 分断中でも古いデータを返す（結果整合性）
            entry = self.nodes[node_id].get(key)
            if entry:
                print(f"[AP] 古いデータを返す可能性あり (key={key})")
                return entry.value
            return None

        entry = self.nodes[node_id].get(key)
        return entry.value if entry else None

# 動作確認
print("=== CP システムの挙動 ===")
cp_store = SimulatedDistributedStore(SystemMode.CP)
cp_store.write("user:1", "Alice")
cp_store.simulate_partition(True)
try:
    cp_store.write("user:1", "Bob")  # 分断中の書き込みは失敗
except Exception as e:
    print(f"エラー: {e}")

print("\n=== AP システムの挙動 ===")
ap_store = SimulatedDistributedStore(SystemMode.AP)
ap_store.write("user:1", "Alice")
ap_store.simulate_partition(True)
ap_store.write("user:1", "Bob")   # 分断中でも書き込み成功（一部ノードのみ）
print(f"ノード0から読み取り: {ap_store.read('user:1', 0)}")  # 更新後の値
print(f"ノード1から読み取り: {ap_store.read('user:1', 1)}")  # 古い値（不整合）
```

## 使用場面

- データベース選定時に一貫性と可用性のどちらが優先かを判断する場合
- マイクロサービスで分散トランザクションが必要かを判断する際の理論的根拠
- 金融系（CP必須）とSNS系（AP許容）など業務要件に応じたシステム設計
- 障害設計でネットワーク分断時の挙動をどう定義するかの議論

## 参考文献

- [Brewer, Eric — CAP Twelve Years Later: How the "Rules" Have Changed](https://www.infoq.com/articles/cap-twelve-years-later-how-the-rules-have-changed/)
- [Gilbert, Seth; Lynch, Nancy — Brewer's Conjecture and the Feasibility of Consistent, Available, Partition-Tolerant Web Services](https://dl.acm.org/doi/10.1145/564585.564601)
- [Designing Data-Intensive Applications — Chapter 9](https://dataintensive.net/)

<AffiliateBanner site="cloud_navi" />
