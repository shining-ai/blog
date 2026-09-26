import AffiliateBanner from '@site/src/components/AffiliateBanner';

# NewSQL（CockroachDB・Spanner）

## NewSQL とは

> NewSQL とは従来の RDB の ACID トランザクション・SQL 互換性を維持しながら、NoSQL の水平スケールアウト・高可用性・分散アーキテクチャを実現する次世代分散データベースの総称であり、CockroachDB と Google Spanner が代表実装である。

従来の RDB（MySQL・PostgreSQL）は強い ACID 保証を持ちますが垂直スケールに限界があります。NoSQL（Cassandra・DynamoDB）は水平スケールが得意ですが ACID トランザクションが制限されます。NewSQL はこの両方の長所を統合します。

Google Spanner（2012年発表）は True Time API と TrueTime 不確かさウィンドウを利用した外部整合性（External Consistency）を実現します。Paxos コンセンサスによって複数データセンターにまたがるレプリケーションと分散トランザクションを提供します。F1（Google Ads DB）の基盤として実用化されました。

CockroachDB は Spanner にインスパイアされた OSS の NewSQL です。PostgreSQL ワイヤプロトコル互換のため既存の PostgreSQL クライアント・ORM がそのまま使えます。Raft コンセンサスアルゴリズムで複数ノード間のデータを強整合性で管理します。Multi-Region テーブル・ゾーン設定で地理的な配置を制御できます。

Vitess（MySQL シャーディング）・TiDB（TiKV + TiFlash）なども NewSQL に分類されます。

## RDB・NoSQL・NewSQL の比較

| 特性 | 従来 RDB | NoSQL | NewSQL |
|------|---------|-------|--------|
| ACID トランザクション | あり | 限定的 | あり |
| 水平スケールアウト | 困難 | 得意 | 得意 |
| SQL 互換性 | あり | なし | あり（ほぼ） |
| 分散トランザクション | 難しい | 困難 | あり（Paxos/Raft） |
| レイテンシ | 低い | 低い | やや高い |
| 運用複雑さ | 低い | 中程度 | 高い |
| 代表例 | MySQL, PostgreSQL | Cassandra, DynamoDB | CockroachDB, Spanner |

```python
from dataclasses import dataclass, field
from collections import defaultdict
from typing import Any
import time
import uuid
import hashlib

# ===========================
# CockroachDB / Spanner ライクな分散 KV ストアのシミュレーション
# （Raft コンセンサスの概念的実装）
# ===========================

class RaftState:
    FOLLOWER  = "Follower"
    CANDIDATE = "Candidate"
    LEADER    = "Leader"


@dataclass
class RaftLogEntry:
    """Raft ログエントリ（コミット前の変更）"""
    index:    int
    term:     int
    key:      str
    value:    Any
    tx_id:    str


@dataclass
class RaftNode:
    """Raft コンセンサスノード（CockroachDB のシャードレプリカに対応）"""
    node_id: str
    state: str = RaftState.FOLLOWER
    current_term: int = 0
    voted_for: str | None = None
    log: list[RaftLogEntry] = field(default_factory=list)
    commit_index: int = -1
    data: dict = field(default_factory=dict)

    def apply_committed(self) -> None:
        """コミット済みのログエントリをデータに適用"""
        for entry in self.log[self.commit_index + 1:]:
            self.data[entry.key] = entry.value
        self.commit_index = len(self.log) - 1


class RaftGroup:
    """
    Raft レプリカグループのシミュレーション
    （CockroachDB の Range = 64MB ごとの Raft グループ）
    """

    def __init__(self, n_nodes: int = 3):
        self.nodes = [RaftNode(f"node-{i}") for i in range(n_nodes)]
        self.leader = self.nodes[0]
        self.leader.state = RaftState.LEADER
        self.term = 1

    def write(self, key: str, value: Any, tx_id: str = "") -> bool:
        """
        Raft 書き込み:
        1. リーダーがログに追加
        2. クォーラム（過半数）に複製
        3. コミット
        """
        # ログエントリを作成
        entry = RaftLogEntry(
            index=len(self.leader.log),
            term=self.term,
            key=key,
            value=value,
            tx_id=tx_id or str(uuid.uuid4())[:8],
        )
        self.leader.log.append(entry)

        # クォーラム複製（過半数: n//2 + 1）
        quorum = len(self.nodes) // 2 + 1
        replicated = 1  # リーダー自身

        for node in self.nodes[1:]:
            if replicated < len(self.nodes):
                node.log.append(entry)
                replicated += 1

        if replicated >= quorum:
            # コミット: 全ノードに適用
            for node in self.nodes:
                if len(node.log) > node.commit_index + 1:
                    node.apply_committed()
            return True
        return False

    def read(self, key: str, linearizable: bool = True) -> Any:
        """
        線形化可能読み取り（linearizable=True）: リーダーから読む
        ステイル読み取り（linearizable=False）: 任意のノードから読む（古い値の可能性）
        """
        if linearizable:
            return self.leader.data.get(key)
        # ランダムなフォロワーから読む（古い値の可能性あり）
        import random
        node = random.choice(self.nodes)
        return node.data.get(key)


# ===========================
# CockroachDB のマルチリージョン分散テーブルの概念的シミュレーション
# ===========================

@dataclass
class RegionalTable:
    """地理分散テーブル（CockroachDB の Multi-Region Table の概念）"""
    table_name: str
    primary_region: str
    secondary_regions: list[str]
    # region → {key: value}
    regional_data: dict[str, dict] = field(default_factory=dict)

    def __post_init__(self):
        for region in [self.primary_region] + self.secondary_regions:
            self.regional_data[region] = {}

    def write(self, key: str, value: Any, homing_region: str | None = None) -> None:
        """書き込み（指定リージョンが「ホームリージョン」）"""
        target = homing_region or self.primary_region
        self.regional_data[target][key] = value
        # プライマリリージョンにも複製（グローバルテーブルの場合）
        if target != self.primary_region:
            self.regional_data[self.primary_region][key] = value

    def read(self, key: str, from_region: str | None = None) -> Any:
        """読み取り（リージョンローカルテーブルは自リージョンから低レイテンシ読み取り）"""
        target = from_region or self.primary_region
        return self.regional_data[target].get(key) or self.regional_data[self.primary_region].get(key)


print("=== NewSQL デモ ===\n")

# Raft グループのデモ
print("[Raft コンセンサス: CockroachDB ライクな分散書き込み]")
raft = RaftGroup(n_nodes=3)

for key, value in [
    ("user:1", {"name": "Alice", "balance": 1000}),
    ("user:2", {"name": "Bob",   "balance": 2000}),
    ("user:3", {"name": "Carol", "balance": 500}),
]:
    success = raft.write(key, value)
    print(f"  write({key!r}) → quorum 複製成功: {success}")

# 分散トランザクション（線形化可能読み取り）
print("\n[分散 ACID トランザクション: 送金]")
tx_id = str(uuid.uuid4())[:8]
sender = raft.read("user:1", linearizable=True)
receiver = raft.read("user:2", linearizable=True)
amount = 300

if sender and receiver and sender["balance"] >= amount:
    new_sender   = {"name": sender["name"],   "balance": sender["balance"] - amount}
    new_receiver = {"name": receiver["name"], "balance": receiver["balance"] + amount}
    raft.write("user:1", new_sender,   tx_id=tx_id)
    raft.write("user:2", new_receiver, tx_id=tx_id)
    print(f"  送金完了: Alice {sender['balance']} → {new_sender['balance']}")
    print(f"          Bob   {receiver['balance']} → {new_receiver['balance']}")

# マルチリージョンテーブル
print("\n[マルチリージョン分散テーブル: CockroachDB REGIONAL BY ROW]")
users_table = RegionalTable(
    table_name="users",
    primary_region="us-central",
    secondary_regions=["eu-west", "ap-northeast"],
)

# 各リージョンにローカルデータを書き込む
users_table.write("user-jp-001", {"name": "田中太郎", "region": "ap-northeast"}, homing_region="ap-northeast")
users_table.write("user-eu-001", {"name": "Hans Mueller", "region": "eu-west"}, homing_region="eu-west")
users_table.write("user-us-001", {"name": "John Smith", "region": "us-central"})

# リージョンローカル読み取り（低レイテンシ）
for region, user_key in [("ap-northeast", "user-jp-001"), ("eu-west", "user-eu-001")]:
    user = users_table.read(user_key, from_region=region)
    print(f"  {region} ローカル読み取り: {user}")

print("\n[RDB・NoSQL・NewSQL のトレードオフまとめ]")
comparison = [
    ("ACID + スケール", "従来RDBでは困難", "NoSQLでは犠牲", "NewSQLで両立"),
    ("SQL 互換性",      "完全",            "なし",           "ほぼ完全"),
    ("運用コスト",      "低い",            "中程度",         "高い"),
    ("レイテンシ",      "低い",            "低い",           "やや高い"),
    ("適合データ規模",  "〜数 TB",         "PB スケール",    "TB〜PB"),
]
for item, rdb, nosql, newsql in comparison:
    print(f"  {item:<15} RDB: {rdb:<12} NoSQL: {nosql:<12} NewSQL: {newsql}")
```

## 使用場面

- グローバルに展開する金融・EC サービスで ACID トランザクションと水平スケールを同時に必要とする場面
- PostgreSQL から CockroachDB に移行してシャーディングの複雑さを排除しつつ既存 ORM・クエリを維持する場面
- Google Cloud Spanner を使って複数リージョンでの低遅延・強整合性の分散データベースを構築する場面

## 参考文献

- Corbett, J. et al. "Spanner: Google's Globally Distributed Database" (OSDI 2012)
- Taft, R. et al. "CockroachDB: The Resilient Geo-Distributed SQL Database" (SIGMOD 2020)
- Kleppmann, M. "Designing Data-Intensive Applications" (O'Reilly)

<AffiliateBanner site="db_navi" />
