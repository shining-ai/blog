import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 整合性モデル（結果整合性・線形化可能性）

## 整合性モデルとは

> 整合性モデル（Consistency Model）とは、分散システムにおいてデータのレプリカ間でどの程度の整合性を保証するかを定義した契約であり、システムの可用性・パフォーマンス・正確性のトレードオフを決定する根幹的な設計概念である。

分散システムでは、同じデータが複数のノードにレプリケーションされる。このとき「あるノードへの書き込みが他のノードからいつ読めるようになるか」という保証の強さが整合性モデルによって規定される。

**線形化可能性（Linearizability）** は最も強い整合性保証だ。すべての操作がある単一の順序で実行されたかのように見え、操作の完了後は即座に全ノードから最新値が読める。ZooKeeperや単一リーダーの同期レプリケーションが該当する。アプリケーション開発者には最も扱いやすいが、ネットワーク遅延の影響を直接受けるためレイテンシが高くなる。

**結果整合性（Eventual Consistency）** は最も弱い整合性保証の一つだ。書き込みが最終的には全レプリカに伝播することを保証するが、タイミングは保証しない。AmazonのDynamoDBやCassandraが採用し、高可用性と低レイテンシを実現する代わりに、読み取り直後に古い値が返る可能性がある（stale read）。

**因果整合性（Causal Consistency）** はその中間に位置する。「原因と結果」の関係にある操作の順序は保証する。SNSでコメントへの返信が返信先より先に表示されないといった保証を実現できる。MongoDBのcausal consistency sessionがこのモデルを採用する。

CAP定理との関係で言えば、線形化可能性を選ぶとネットワーク分断時に可用性を犠牲にせざるを得ない（CP系）。結果整合性を選ぶと分断時でも書き込みを受け付けられる（AP系）。

## 整合性モデルの比較

| モデル | 保証内容 | 代表例 | レイテンシ |
|--------|----------|--------|-----------|
| 線形化可能性 | 全操作が単一の順序で見える | ZooKeeper・単一リーダー同期 | 高 |
| シリアライザビリティ | トランザクション単位の順序保証 | 従来のRDB | 高〜中 |
| 因果整合性 | 因果関係のある操作の順序を保証 | MongoDB causal session | 中 |
| 単調読み取り整合性 | 同一クライアントは古い値に戻らない | セッションスティッキー | 低〜中 |
| 結果整合性 | 最終的に全レプリカが一致 | DynamoDB・Cassandra | 低 |

```python
# 整合性モデルの違いを示す概念コード

from dataclasses import dataclass, field
from typing import Optional
import threading
import time

@dataclass
class ReplicatedStore:
    """
    簡略化されたレプリカストアのシミュレーション
    整合性モデルの違いを理解するための概念実装
    """
    node_id: str
    data: dict = field(default_factory=dict)
    version_vector: dict = field(default_factory=dict)

class EventualConsistencyStore:
    """
    結果整合性ストアの概念実装
    書き込みは即座に返るが、レプリカへの伝播は非同期
    """
    def __init__(self, replication_delay: float = 0.1):
        self.primary = ReplicatedStore("primary")
        self.replica = ReplicatedStore("replica")
        self.delay = replication_delay
        self._lock = threading.Lock()

    def write(self, key: str, value: str) -> None:
        """書き込みはプライマリに即座に反映、レプリカへは非同期伝播"""
        with self._lock:
            self.primary.data[key] = value
        # 非同期でレプリカに伝播（結果整合性）
        threading.Thread(
            target=self._async_replicate,
            args=(key, value),
            daemon=True
        ).start()

    def _async_replicate(self, key: str, value: str) -> None:
        time.sleep(self.delay)  # ネットワーク遅延のシミュレーション
        with self._lock:
            self.replica.data[key] = value

    def read_from_primary(self, key: str) -> Optional[str]:
        """プライマリから読む: 常に最新値"""
        return self.primary.data.get(key)

    def read_from_replica(self, key: str) -> Optional[str]:
        """レプリカから読む: 古い値が返る可能性あり（stale read）"""
        return self.replica.data.get(key)


# 使用例: 書き込み直後にレプリカから読むと古い値が返る可能性
store = EventualConsistencyStore(replication_delay=0.5)
store.write("user:1", "Alice")

# プライマリは即座に最新値を返す
assert store.read_from_primary("user:1") == "Alice"

# レプリカはまだ伝播されていない可能性がある（結果整合性）
time.sleep(0.1)
stale_value = store.read_from_replica("user:1")  # Noneの可能性あり

# 十分な時間が経てばレプリカも一致する（最終的整合性）
time.sleep(0.5)
consistent_value = store.read_from_replica("user:1")  # "Alice"
```

## 使用場面

- DynamoDBやCassandraのConsistency Levelを設定する際に、読み書きの整合性と可用性のトレードオフを判断する場合
- マイクロサービス間でデータを共有する設計で、各サービスが「自分のDB」を持つ際に結果整合性を意識する場合
- キャッシュ（Redis）とDBの二重書き込みでキャッシュ無効化戦略を設計する場合
- グローバル分散DBでリージョン間のレプリケーション遅延を許容するかどうかを判断する場合

## 参考文献

- [Designing Data-Intensive Applications — Martin Kleppmann](https://dataintensive.net/)
- [Consistency Models — Jepsen](https://jepsen.io/consistency)
- [Amazon DynamoDB — 読み取り整合性](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html)

<AffiliateBanner site="cloud_navi" />
