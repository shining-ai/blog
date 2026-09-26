import AffiliateBanner from '@site/src/components/AffiliateBanner';

# シャーディング

## シャーディングとは

> シャーディング（Sharding）とはデータを複数のデータベースサーバ（シャード）に水平分割して格納する分散アーキテクチャであり、単一サーバでは処理できない大規模データの読み書きを並列化してスケールアウトを実現する。

シャーディングは「水平スケール（横に広げる）」の基本手法です。垂直スケール（サーバのスペックを上げる）には物理的・コスト的な限界があります。シャーディングではデータを論理的に分割し、各シャードが全データの一部を担当します。

シャードキー（Shard Key）は分割の基準となるカラムです。適切なシャードキーの選択がシャーディングの成否を決めます。重要な特性は「高カーディナリティ（多様な値）」「均等な分布」「クエリに合ったパターン」です。

主な分割戦略は 3 種類です。範囲ベース（Range Sharding）はキーの値の範囲で分割（例：user_id 1〜1000 はシャード 1）します。ホットスポット（アクセスが特定の範囲に集中）が発生しやすい欠点があります。ハッシュベース（Hash Sharding）はキーのハッシュ値を使って均等に分散します。範囲クエリが苦手ですが分布は均等です。ディレクトリベースはルックアップテーブルでキーとシャードのマッピングを管理します。柔軟ですが管理が複雑です。

シャーディングの課題は「クロスシャードクエリ（複数シャードにまたがる JOIN・集計）の非効率」「シャードの再分割（リシャーディング）の複雑さ」「トランザクションの困難さ」です。

## シャーディング戦略の比較

| 戦略 | データ分布 | 範囲クエリ | ホットスポット | 用途 |
|------|----------|-----------|-------------|------|
| 範囲ベース | 偏りやすい | 効率的 | 起きやすい | 時系列データ |
| ハッシュベース | 均等 | 非効率 | 起きにくい | ユーザデータ |
| ディレクトリベース | 柔軟 | 設計次第 | 制御可能 | 地理ベース |
| コンポジット | 中程度 | 設計次第 | 制御可能 | 複合要件 |

```python
import hashlib
import math
from dataclasses import dataclass, field
from collections import defaultdict
from typing import Any

# ===========================
# シャーディングの実装
# ===========================

@dataclass
class Shard:
    shard_id: int
    data: dict = field(default_factory=dict)
    min_key: Any = None  # 範囲ベースシャーディング用
    max_key: Any = None

    @property
    def size(self) -> int:
        return len(self.data)

    def write(self, key: str, value: Any) -> None:
        self.data[key] = value

    def read(self, key: str) -> Any:
        return self.data.get(key)


class HashSharding:
    """ハッシュベースシャーディング"""

    def __init__(self, n_shards: int):
        self.n_shards = n_shards
        self.shards = [Shard(i) for i in range(n_shards)]
        self._router_calls = 0

    def _get_shard_idx(self, key: str) -> int:
        """ハッシュ値でシャードを決定"""
        hash_val = int(hashlib.md5(key.encode()).hexdigest(), 16)
        return hash_val % self.n_shards

    def write(self, key: str, value: Any) -> int:
        idx = self._get_shard_idx(key)
        self.shards[idx].write(key, value)
        self._router_calls += 1
        return idx

    def read(self, key: str) -> tuple[Any, int]:
        idx = self._get_shard_idx(key)
        self._router_calls += 1
        return self.shards[idx].read(key), idx

    def scatter_gather(self, keys: list[str]) -> dict:
        """複数キーを並列で取得（クロスシャードクエリの模倣）"""
        shard_batches: dict[int, list[str]] = defaultdict(list)
        for key in keys:
            idx = self._get_shard_idx(key)
            shard_batches[idx].append(key)

        results = {}
        for shard_idx, batch_keys in shard_batches.items():
            for k in batch_keys:
                results[k] = self.shards[shard_idx].read(k)
        return results

    def distribution_stats(self) -> dict:
        sizes = [s.size for s in self.shards]
        total = sum(sizes)
        avg = total / self.n_shards if self.n_shards else 0
        std = math.sqrt(sum((s - avg)**2 for s in sizes) / self.n_shards) if self.n_shards else 0
        return {
            "total": total,
            "per_shard": sizes,
            "avg": round(avg, 1),
            "stddev": round(std, 2),
            "imbalance_ratio": round(max(sizes) / avg, 2) if avg else 0,
        }


class RangeSharding:
    """範囲ベースシャーディング"""

    def __init__(self, ranges: list[tuple[int, int]]):
        """ranges: [(min_key, max_key), ...]"""
        self.shards = [
            Shard(i, min_key=lo, max_key=hi)
            for i, (lo, hi) in enumerate(ranges)
        ]

    def _get_shard(self, key: int) -> Shard | None:
        for shard in self.shards:
            if shard.min_key <= key <= shard.max_key:
                return shard
        return None

    def write(self, key: int, value: Any) -> int | None:
        shard = self._get_shard(key)
        if shard:
            shard.write(str(key), value)
            return shard.shard_id
        return None

    def range_query(self, start: int, end: int) -> list[tuple[str, Any]]:
        """範囲クエリ（複数シャードにまたがる可能性あり）"""
        results = []
        for shard in self.shards:
            if shard.min_key <= end and shard.max_key >= start:
                # このシャードに対象データがある
                for k, v in shard.data.items():
                    if start <= int(k) <= end:
                        results.append((k, v))
        return sorted(results, key=lambda x: int(x[0]))


# ===========================
# コンシステントハッシングによるリシャーディング
# ===========================

class ConsistentHashRouter:
    """コンシステントハッシュによるシャードルーター（リシャーディング最小化）"""

    def __init__(self, virtual_nodes: int = 150):
        self.virtual_nodes = virtual_nodes
        self.ring: list[tuple[int, int]] = []  # (hash, shard_id)
        self.shards: dict[int, Shard] = {}

    def add_shard(self, shard_id: int) -> None:
        self.shards[shard_id] = Shard(shard_id)
        for i in range(self.virtual_nodes):
            h = int(hashlib.md5(f"shard-{shard_id}-vn-{i}".encode()).hexdigest(), 16)
            self.ring.append((h, shard_id))
        self.ring.sort(key=lambda x: x[0])

    def get_shard(self, key: str) -> int:
        token = int(hashlib.md5(key.encode()).hexdigest(), 16)
        for h, shard_id in self.ring:
            if h >= token:
                return shard_id
        return self.ring[0][1]  # リングの先頭にラップ


print("=== シャーディングデモ ===\n")

# ハッシュシャーディング
print("[ハッシュシャーディング（4シャード）]")
hs = HashSharding(n_shards=4)

# 1000件のデータを挿入
for i in range(1000):
    user_id = f"user:{i:04d}"
    hs.write(user_id, {"name": f"User{i}", "score": i * 3})

stats = hs.distribution_stats()
print(f"  総データ数: {stats['total']}")
print(f"  シャード別: {stats['per_shard']}")
print(f"  平均: {stats['avg']}, 標準偏差: {stats['stddev']}, 偏り率: {stats['imbalance_ratio']}")

# 読み取り
val, shard_idx = hs.read("user:0042")
print(f"\n  user:0042 → シャード {shard_idx}: {val}")

# 範囲シャーディング
print("\n[範囲シャーディング]")
rs = RangeSharding([(0, 999), (1000, 1999), (2000, 2999)])
for i in range(0, 3000, 100):
    rs.write(i, {"id": i, "value": f"data_{i}"})

results = rs.range_query(950, 1050)
print(f"  range(950, 1050) → {len(results)} 件（2シャードにまたがる）")
for k, v in results[:3]:
    print(f"    {k}: {v}")

# コンシステントハッシュ
print("\n[コンシステントハッシュ: リシャーディング影響の最小化]")
router = ConsistentHashRouter(virtual_nodes=50)
for sid in [1, 2, 3]:
    router.add_shard(sid)

# シャード追加前の分散
before = defaultdict(int)
test_keys = [f"key:{i}" for i in range(1000)]
for k in test_keys:
    before[router.get_shard(k)] += 1

router.add_shard(4)  # シャード追加
after = defaultdict(int)
for k in test_keys:
    after[router.get_shard(k)] += 1

moved = sum(1 for k in test_keys if
            [s for _, s in router.ring if s in before][test_keys.index(k) % 1] != router.get_shard(k))
print(f"  シャード3→4への追加後の各シャード件数: {dict(after)}")
print(f"  理論的に移動するデータ: 全体の 1/4 ≈ {1000//4}")
```

## 使用場面

- ユーザ数・データ量が単一 DB の限界を超えた際にシャードキーを設計してデータを水平分散する場面
- MongoDB・Cassandra・DynamoDB などのシャーディング機能を設定して大規模サービスのスケールアウトを実現する場面
- ホットスポット問題（特定のシャードに負荷集中）を検知してシャードキーの再設計やリシャーディングを検討する場面

## 参考文献

- Kleppmann, M. "Designing Data-Intensive Applications" (O'Reilly)
- DeCandia, G. et al. "Dynamo: Amazon's Highly Available Key-value Store" (SOSP 2007)
- [MongoDB – Sharding](https://www.mongodb.com/docs/manual/sharding/)

<AffiliateBanner site="db_navi" />
