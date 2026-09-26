import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ワイドカラムストア（Cassandra）

## Apache Cassandra とは

> Apache Cassandra とは行ごとに異なる列を持てるワイドカラムストア型の分散 NoSQL データベースであり、マスターレス（ピアツーピア）アーキテクチャによる高可用性・線形スケールアウトと、書き込み最適化された設計によるコンシステントハッシュリングを特徴とする。

Cassandra は Facebook が 2008 年に開発し、現在は Apache Software Foundation がメンテナンスしています。Google Bigtable のデータモデルと Amazon Dynamo の分散アーキテクチャを融合した設計です。

Cassandra のデータモデルはキースペース（データベースに相当）・テーブル・行で構成されます。各行はパーティションキーで識別され、クラスタリングキーで行内の列が並べられます。「ワイドロー」と呼ばれる形式で、1 行に数百万列を持てます。

分散アーキテクチャでは全ノードが対等（マスターレス）で、コンシステントハッシュリングによりデータが均等に分散されます。レプリケーションファクタ（通常 3）でデータが複数ノードにコピーされます。書き込みはコミットログとメムテーブルに先に書いて後でSStable に flush するため高速です。

読み書きの整合性レベルを ONE・QUORUM・ALL など柔軟に設定でき、CAP 定理における AP（可用性・分断耐性）優先と CP（整合性・分断耐性）優先を選択できます。

## Cassandra vs 他のデータベース

| 比較項目 | Cassandra | MongoDB | MySQL |
|---------|-----------|---------|-------|
| アーキテクチャ | マスターレス P2P | レプリカセット | 主従レプリケーション |
| スケーリング | 線形水平スケール | 水平（シャーディング） | 主に垂直 |
| 書き込み性能 | 非常に高い | 高い | 中程度 |
| 一貫性 | 調整可能 | 強い（同一シャード） | ACID |
| クエリ言語 | CQL | MongoDB Query | SQL |
| 最適な用途 | 書き込み多数・時系列 | ドキュメント | 汎用 OLTP |

```python
from dataclasses import dataclass, field
from datetime import datetime, timezone
from collections import defaultdict
import hashlib
import uuid

# ===========================
# Cassandra のデータモデルとパーティションのシミュレーション
# ===========================

@dataclass
class CassandraRow:
    """Cassandra のワイドロー"""
    partition_key: str
    clustering_key: str
    columns: dict = field(default_factory=dict)

    @property
    def row_key(self) -> tuple:
        return (self.partition_key, self.clustering_key)


class CassandraTable:
    """Cassandra テーブルのシミュレーション"""

    def __init__(self, name: str, partition_key: str, clustering_keys: list[str]):
        self.name = name
        self.partition_key = partition_key
        self.clustering_keys = clustering_keys
        # {partition_key: {clustering_key: CassandraRow}}
        self._data: dict[str, dict[str, CassandraRow]] = defaultdict(dict)

    def insert(self, data: dict, ttl: int | None = None) -> None:
        """行の挿入（Upsert: 存在すれば更新）"""
        pk = data[self.partition_key]
        ck = "_".join(str(data[k]) for k in self.clustering_keys)
        row = CassandraRow(
            partition_key=pk,
            clustering_key=ck,
            columns={k: v for k, v in data.items()
                     if k != self.partition_key and k not in self.clustering_keys}
        )
        if ttl:
            row.columns["__ttl__"] = ttl
        self._data[pk][ck] = row

    def select(
        self,
        partition_key: str,
        clustering_key_prefix: str = "",
        limit: int = 100,
    ) -> list[CassandraRow]:
        """
        パーティション内の行を取得（クラスタリングキーで範囲取得）
        ※ Cassandra は必ずパーティションキーを指定する必要がある
        """
        if partition_key not in self._data:
            return []
        rows = [
            row for ck, row in sorted(self._data[partition_key].items())
            if ck.startswith(clustering_key_prefix)
        ]
        return rows[:limit]

    def delete(self, partition_key: str, clustering_key: str = "") -> int:
        """行または列の削除（トゥームストーン）"""
        if partition_key not in self._data:
            return 0
        if clustering_key:
            if clustering_key in self._data[partition_key]:
                del self._data[partition_key][clustering_key]
                return 1
        else:
            count = len(self._data[partition_key])
            del self._data[partition_key]
            return count
        return 0


# ===========================
# コンシステントハッシュリングのシミュレーション
# ===========================

class ConsistentHashRing:
    """コンシステントハッシュリング（Cassandra の分散アーキテクチャの基礎）"""

    def __init__(self, replication_factor: int = 3):
        self.replication_factor = replication_factor
        self.ring: list[tuple[int, str]] = []  # (token, node_id)

    def add_node(self, node_id: str, vnodes: int = 4) -> None:
        """ノードを追加（仮想ノード = vnode）"""
        for i in range(vnodes):
            token = int(hashlib.md5(f"{node_id}-{i}".encode()).hexdigest(), 16)
            self.ring.append((token, node_id))
        self.ring.sort(key=lambda x: x[0])

    def get_replicas(self, key: str) -> list[str]:
        """キーに対するレプリカノードを返す"""
        token = int(hashlib.md5(key.encode()).hexdigest(), 16)
        replicas = []
        seen_nodes = set()
        n = len(self.ring)
        for i in range(n):
            pos = (i + next(
                idx for idx, (t, _) in enumerate(self.ring) if t >= token
                if True
            )) % n
            node = self.ring[i % n][1]
            if node not in seen_nodes:
                replicas.append(node)
                seen_nodes.add(node)
            if len(replicas) == self.replication_factor:
                break
        return replicas

    def _find_primary(self, key: str) -> int:
        """キーのプライマリノードのインデックスを返す"""
        token = int(hashlib.md5(key.encode()).hexdigest(), 16)
        for i, (t, node) in enumerate(self.ring):
            if t >= token:
                return i
        return 0  # リングを一周

    def get_node(self, key: str) -> str:
        """キーの担当ノードを返す"""
        idx = self._find_primary(key)
        return self.ring[idx][1]


print("=== Cassandra ワイドカラムストアデモ ===\n")

# テーブル作成: IoT センサーデータ（典型的な Cassandra ユースケース）
# パーティションキー: device_id（デバイスごとにデータをまとめる）
# クラスタリングキー: timestamp（時系列で並べる）
sensor_data = CassandraTable(
    name="sensor_readings",
    partition_key="device_id",
    clustering_keys=["timestamp"],
)

device_ids = ["device-001", "device-002"]
timestamps = [
    "2026-06-11T10:00:00",
    "2026-06-11T10:01:00",
    "2026-06-11T10:02:00",
]
import random
for device_id in device_ids:
    for ts in timestamps:
        sensor_data.insert({
            "device_id": device_id,
            "timestamp": ts,
            "temperature": round(20 + random.uniform(-2, 2), 2),
            "humidity": round(60 + random.uniform(-5, 5), 2),
        })

print("[クエリ: device-001 の全データ]")
rows = sensor_data.select("device-001")
for row in rows:
    print(f"  {row.partition_key} | {row.clustering_key} | {row.columns}")

print(f"\n[クエリ: device-001 の特定時刻のデータ]")
rows = sensor_data.select("device-001", clustering_key_prefix="2026-06-11T10:01")
for row in rows:
    print(f"  {row.columns}")

print(f"\n[コンシステントハッシュリング]")
ring = ConsistentHashRing(replication_factor=3)
for node in ["node-A", "node-B", "node-C", "node-D"]:
    ring.add_node(node, vnodes=3)

for key in ["device-001", "device-002", "device-003", "user-alice"]:
    primary = ring.get_node(key)
    print(f"  キー '{key}' → プライマリ: {primary}")

print(f"\n[CQL（Cassandra Query Language）の例]")
cql_examples = [
    ("テーブル作成", """
  CREATE TABLE sensor_readings (
    device_id   TEXT,
    timestamp   TIMESTAMP,
    temperature FLOAT,
    humidity    FLOAT,
    PRIMARY KEY (device_id, timestamp)
  ) WITH CLUSTERING ORDER BY (timestamp DESC);"""),
    ("データ挿入（TTL付き）", """
  INSERT INTO sensor_readings (device_id, timestamp, temperature, humidity)
  VALUES ('device-001', toTimestamp(now()), 22.5, 60.1)
  USING TTL 86400;  -- 24時間後に自動削除"""),
    ("パーティション内クエリ", """
  SELECT * FROM sensor_readings
  WHERE device_id = 'device-001'
    AND timestamp >= '2026-06-11 10:00:00'
    AND timestamp <= '2026-06-11 11:00:00'
  LIMIT 100;"""),
]
for title, cql in cql_examples:
    print(f"  [{title}]{cql}")
```

## 使用場面

- IoT デバイスのセンサーデータ・ログデータなど高頻度の時系列書き込みを複数リージョンにスケールする場面
- SNS のタイムライン・アクティビティフィードなど特定ユーザに関するデータを高速に取得する場面
- グローバルなマルチリージョン構成で可用性を最優先にした「常に書き込める」データベースが必要な場面

## 参考文献

- [Apache Cassandra Documentation](https://cassandra.apache.org/doc/latest/)
- Hewitt, E. "Cassandra: The Definitive Guide" (O'Reilly Media)
- DeCandia, G. et al. "Dynamo: Amazon's Highly Available Key-value Store" (SOSP 2007)

<AffiliateBanner site="db_navi" />
