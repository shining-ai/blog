import AffiliateBanner from '@site/src/components/AffiliateBanner';

# カラム指向ストレージ（Parquet・ORC）

## カラム指向ストレージとは

> カラム指向ストレージ（Columnar Storage）とは行ごとではなく列ごとにデータを格納するファイル形式であり、OLAP クエリにおいて必要な列だけを読む「列プルーニング」と同じ型の値が並ぶ列の高圧縮により、行指向に比べて大幅に高速なスキャン・集計を実現する。

行指向ストレージ（Row-oriented）は `[{id:1, name:Alice, age:30}, {id:2, name:Bob, age:25}, ...]` のようにデータを行単位で格納します。INSERT・UPDATE・主キー検索は高速ですが、全行の特定列（age の平均）を計算する場合は全データを読む必要があります。

カラム指向ストレージは `id=[1,2,3,...], name=[Alice,Bob,Carol,...], age=[30,25,28,...]` のように列を連続して格納します。「SELECT AVG(age)」は age 列だけを読めばよく、I/O が大幅に削減されます。さらに同じ型の値が連続するため圧縮率が非常に高い（RLE・ビットパッキング・Delta エンコーディング・辞書圧縮）です。

Parquet（Apache Parquet）は Hadoop/Spark エコシステムの標準カラム形式です。行グループ（Row Group）→ カラムチャンク → ページの 3 層構造を持ちます。フッターにスキーマ・統計情報（min/max/null count）を持ち、述語プッシュダウン（行グループ単位でのスキップ）が可能です。

ORC（Optimized Row Columnar）は Hive/Presto で使われる形式です。Parquet に比べて圧縮率が高い場合があります（Light Encoding・Bloom Filter 組み込み）。

## 行指向と列指向の比較

| 特性 | 行指向（CSV・InnoDB） | 列指向（Parquet・ORC） |
|------|---------------------|---------------------|
| 読み取り単位 | 行全体 | 指定列のみ |
| OLTP INSERT | 高速 | 低速（バッチ向き） |
| OLAP スキャン | 低速 | 高速 |
| 圧縮率 | 低い | 非常に高い |
| 部分列アクセス | 遅い（全列読む） | 速い（必要列のみ） |
| 統計情報 | なし | min/max/null count |

```python
import json
import struct
from dataclasses import dataclass, field
from typing import Any
import math

# ===========================
# 行指向と列指向の格納の違いを示す実装
# ===========================

class RowOrientedStorage:
    """行指向ストレージ（CSV/JSON ライク）"""

    def __init__(self):
        self.rows: list[dict] = []

    def insert(self, row: dict) -> None:
        self.rows.append(row)

    def scan_column(self, column: str) -> list:
        """特定列をスキャン（全行を読む必要がある）"""
        return [row.get(column) for row in self.rows]

    def storage_size(self) -> int:
        return len(json.dumps(self.rows).encode())


class ColumnChunk:
    """列チャンク: 1 列のデータと圧縮統計"""

    def __init__(self, column_name: str, dtype: str):
        self.column_name = column_name
        self.dtype = dtype
        self.values: list = []
        self.null_count: int = 0
        self.min_val: Any = None
        self.max_val: Any = None

    def append(self, value: Any) -> None:
        if value is None:
            self.null_count += 1
        else:
            self.values.append(value)
            if self.dtype in ("int", "float"):
                if self.min_val is None or value < self.min_val:
                    self.min_val = value
                if self.max_val is None or value > self.max_val:
                    self.max_val = value

    def rle_encode(self) -> list[tuple[Any, int]]:
        """RLE（ランレングス）圧縮"""
        if not self.values:
            return []
        result = []
        current = self.values[0]
        count = 1
        for v in self.values[1:]:
            if v == current:
                count += 1
            else:
                result.append((current, count))
                current = v
                count = 1
        result.append((current, count))
        return result

    def dict_encode(self) -> tuple[dict, list[int]]:
        """辞書圧縮: 文字列列に効果的"""
        dictionary = {}
        indices = []
        for v in self.values:
            if v not in dictionary:
                dictionary[v] = len(dictionary)
            indices.append(dictionary[v])
        return dictionary, indices

    def compression_ratio(self) -> float:
        """圧縮比の推定"""
        if self.dtype == "string":
            _, indices = self.dict_encode()
            original_size = sum(len(str(v)) for v in self.values)
            compressed_size = sum(len(str(k)) for k in set(self.values)) + len(indices)
            return original_size / compressed_size if compressed_size > 0 else 1.0
        else:
            # 数値の場合は Delta エンコーディングの効果を推定
            if len(self.values) < 2:
                return 1.0
            deltas = [self.values[i] - self.values[i-1] for i in range(1, len(self.values))]
            max_delta = max(abs(d) for d in deltas) if deltas else 0
            orig_bits = 64
            bits_needed = max(1, math.ceil(math.log2(max_delta + 1))) if max_delta > 0 else 1
            return orig_bits / bits_needed


class ColumnarStorage:
    """列指向ストレージ（Parquet ライク）"""

    def __init__(self, schema: dict[str, str]):
        self.schema = schema
        self.column_chunks: dict[str, ColumnChunk] = {
            col: ColumnChunk(col, dtype)
            for col, dtype in schema.items()
        }
        self._row_count = 0
        self._stats: dict[str, dict] = {}  # フッター統計情報

    def insert(self, row: dict) -> None:
        for col, chunk in self.column_chunks.items():
            chunk.append(row.get(col))
        self._row_count += 1

    def scan_column(self, column: str) -> list:
        """列スキャン（他の列は読まない: 列プルーニング）"""
        return list(self.column_chunks[column].values)

    def predicate_pushdown(self, column: str, min_val: Any, max_val: Any) -> bool:
        """
        述語プッシュダウン: 統計情報を使って行グループをスキップ
        min_val〜max_val の範囲に該当データがないならスキップ
        """
        chunk = self.column_chunks[column]
        if chunk.min_val is None or chunk.max_val is None:
            return True  # 統計情報なし: スキップ不可
        return not (chunk.max_val < min_val or chunk.min_val > max_val)

    def aggregate_column(self, column: str, func: str = "sum") -> float:
        """列の集計（他の列は全く読まない）"""
        values = self.scan_column(column)
        if not values:
            return 0
        import statistics
        fns = {"sum": sum, "avg": statistics.mean, "max": max, "min": min, "count": len}
        return fns[func](values)

    def storage_comparison(self) -> dict:
        """行指向との格納サイズ比較"""
        col_sizes = {}
        for col, chunk in self.column_chunks.items():
            if chunk.dtype == "string":
                _, indices = chunk.dict_encode()
                uniq = set(chunk.values)
                col_sizes[col] = sum(len(str(k)) for k in uniq) + len(indices)
            else:
                col_sizes[col] = len(chunk.values) * 4  # 4 bytes/int
        return col_sizes


import random
import time

print("=== カラム指向ストレージデモ ===\n")

# データ生成
n_rows = 100_000
regions = ["東日本", "西日本", "中部", "九州"]
products = ["PC", "スマホ", "タブレット", "イヤホン"]

schema = {"user_id": "int", "region": "string", "product": "string", "revenue": "int"}
row_store = RowOrientedStorage()
col_store = ColumnarStorage(schema)

random.seed(42)
for i in range(n_rows):
    row = {
        "user_id": i,
        "region": random.choice(regions),
        "product": random.choice(products),
        "revenue": random.randint(1000, 50000),
    }
    row_store.insert(row)
    col_store.insert(row)

print(f"[データ規模: {n_rows:,} 行]")

# クエリ: SELECT SUM(revenue) の速度比較
print("\n[SELECT SUM(revenue) の速度比較]")

start = time.perf_counter()
row_result = sum(v for v in row_store.scan_column("revenue"))
row_time = (time.perf_counter() - start) * 1000

start = time.perf_counter()
col_result = col_store.aggregate_column("revenue", "sum")
col_time = (time.perf_counter() - start) * 1000

print(f"  行指向: {row_time:.2f} ms, 結果={row_result:,}")
print(f"  列指向: {col_time:.2f} ms, 結果={col_result:,}")

# 述語プッシュダウン
print("\n[述語プッシュダウン（行グループスキップ）]")
can_skip = not col_store.predicate_pushdown("revenue", 999999, 9999999)
print(f"  revenue in [999999, 9999999]? skip={can_skip} (実際のデータ範囲: {col_store.column_chunks['revenue'].min_val}〜{col_store.column_chunks['revenue'].max_val})")

# 圧縮効果
print("\n[列ごとの圧縮比]")
for col, chunk in col_store.column_chunks.items():
    ratio = chunk.compression_ratio()
    print(f"  {col}: 圧縮比 {ratio:.1f}x  (min={chunk.min_val}, max={chunk.max_val})")

# 辞書圧縮の例
print("\n[辞書圧縮（region 列）]")
region_chunk = col_store.column_chunks["region"]
dictionary, indices = region_chunk.dict_encode()
print(f"  辞書: {dictionary}")
print(f"  インデックス列（先頭10）: {indices[:10]}")
print(f"  元のデータ例: {region_chunk.values[:5]}")

print("\n[Parquet ファイルの構造]")
print("""  ┌─────────────────────────────────────────┐
  │ Magic Bytes: PAR1                        │
  ├─────────────────────────────────────────┤
  │ Row Group 0 (128MB)                      │
  │  ├── Column Chunk: user_id               │
  │  │     Pages: [Page0][Page1]...          │
  │  ├── Column Chunk: region                │
  │  │     Dictionary Page + Data Pages      │
  │  ├── Column Chunk: product               │
  │  └── Column Chunk: revenue               │
  ├─────────────────────────────────────────┤
  │ Row Group 1 ...                          │
  ├─────────────────────────────────────────┤
  │ Footer (スキーマ・統計情報・オフセット)    │
  │  ├── Schema: {user_id:INT64, ...}        │
  │  ├── Row Group Stats:                    │
  │  │     revenue: min=1000, max=50000      │
  │  └── Column Offsets                      │
  └─────────────────────────────────────────┘""")
```

## 使用場面

- Spark・Presto で大規模データを処理する際に CSV の代わりに Parquet を使って I/O とストレージコストを削減する場面
- BigQuery・Redshift・Snowflake にデータをロードする際のファイル形式として Parquet または ORC を選択する場面
- Delta Lake・Iceberg でデータレイクを構築する際のベースファイル形式として Parquet を使う場面

## 参考文献

- [Apache Parquet Documentation](https://parquet.apache.org/docs/)
- [Apache ORC Documentation](https://orc.apache.org/docs/)
- Kleppmann, M. "Designing Data-Intensive Applications" (O'Reilly)

<AffiliateBanner site="db_navi" />
