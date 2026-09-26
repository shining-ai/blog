import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Apache Spark 入門

## Apache Spark とは

> Apache Spark とはメモリ内での分散データ処理を基本とした大規模データ処理フレームワークであり、DataFrame/Dataset API・Spark SQL・Spark Streaming・MLlib・GraphX を統合した汎用エンジンとして Hadoop MapReduce の後継として広く使われている。

Hadoop MapReduce は各処理ステップでディスクに書き込むため遅く、複数ステップのジョブは極めて遅くなりました。Spark はデータをメモリ上の「RDD（Resilient Distributed Dataset）」または「DataFrame」に保持して処理することで、MapReduce に比べて最大 100 倍高速になります。

Spark の主要コンポーネントは 5 つです。Spark Core は基礎となる分散処理エンジン（RDD・タスクスケジューリング・フォールトトレランス）です。Spark SQL は DataFrame/Dataset API と SQL でデータ処理します。Spark Streaming・Structured Streaming はリアルタイムストリーム処理（マイクロバッチまたは連続処理）です。MLlib は分散機械学習ライブラリです。GraphX はグラフ計算エンジンです。

DataFrame API は Pandas に似た API で、スキーマを持つ分散データを操作します。Spark SQL オプティマイザ（Catalyst）が実行計画を最適化して効率的な物理実行プランを生成します。

PySpark は Python から Spark を使う API で、データ工学・機械学習の分野で最も広く使われています。Databricks は Spark をフルマネージドで提供するクラウドサービスです。

## Spark の主要機能比較

| 機能 | 用途 | 特徴 |
|------|------|------|
| RDD | 低レベル分散処理 | 型安全・最低レベルAPI |
| DataFrame | 構造化データ処理 | SQL最適化・Pandas互換 |
| Spark SQL | SQL クエリ | 既存 SQL 資産を活用 |
| Structured Streaming | ストリーム処理 | DataFrame API と統一 |
| MLlib | 機械学習 | 分散学習・パイプライン |

```python
# PySpark を使わずに Spark の概念を Python で実装するデモ
# 実際の PySpark コードも末尾に示す

from collections import defaultdict
from typing import Callable, Any, Iterator
import math
import functools

# ===========================
# RDD（Resilient Distributed Dataset）の概念的実装
# ===========================

class RDD:
    """
    RDD: 変換のチェーンを遅延評価（Lazy Evaluation）する分散データセット
    実際の Spark は DAG スケジューラによって並列実行される
    """

    def __init__(self, data: list, num_partitions: int = 4):
        self._data = data
        self._num_partitions = num_partitions
        self._transformations: list[tuple[str, Callable]] = []

    def _partition(self) -> list[list]:
        """データをパーティションに分割（Hash パーティション）"""
        partitions = [[] for _ in range(self._num_partitions)]
        for i, item in enumerate(self._data):
            partitions[i % self._num_partitions].append(item)
        return partitions

    def map(self, fn: Callable) -> "RDD":
        """変換: 各要素に関数を適用"""
        new_rdd = RDD(self._data, self._num_partitions)
        new_rdd._transformations = self._transformations + [("map", fn)]
        return new_rdd

    def filter(self, fn: Callable) -> "RDD":
        """変換: 条件を満たす要素のみを残す"""
        new_rdd = RDD(self._data, self._num_partitions)
        new_rdd._transformations = self._transformations + [("filter", fn)]
        return new_rdd

    def flat_map(self, fn: Callable) -> "RDD":
        """変換: 各要素をリストに展開してフラット化"""
        new_rdd = RDD(self._data, self._num_partitions)
        new_rdd._transformations = self._transformations + [("flat_map", fn)]
        return new_rdd

    def _execute(self) -> list:
        """変換チェーンを実行（アクション時に遅延評価）"""
        result = list(self._data)
        for op_name, fn in self._transformations:
            if op_name == "map":
                result = [fn(x) for x in result]
            elif op_name == "filter":
                result = [x for x in result if fn(x)]
            elif op_name == "flat_map":
                result = [item for x in result for item in fn(x)]
        return result

    def collect(self) -> list:
        """アクション: 全要素をドライバに収集"""
        return self._execute()

    def reduce(self, fn: Callable) -> Any:
        """アクション: 二項演算で畳み込む"""
        data = self._execute()
        return functools.reduce(fn, data)

    def count(self) -> int:
        return len(self._execute())

    def reduce_by_key(self, fn: Callable) -> list[tuple]:
        """
        (Key, Value) の RDD で同じキーの値を集約
        Spark の最重要変換の一つ
        """
        data = self._execute()
        groups: dict = defaultdict(list)
        for k, v in data:
            groups[k].append(v)
        return [(k, functools.reduce(fn, vals)) for k, vals in groups.items()]

    def group_by_key(self) -> list[tuple]:
        data = self._execute()
        groups: dict = defaultdict(list)
        for k, v in data:
            groups[k].append(v)
        return list(groups.items())

    def sort_by(self, key_fn: Callable, ascending: bool = True) -> "RDD":
        new_rdd = RDD(sorted(self._execute(), key=key_fn, reverse=not ascending))
        return new_rdd


# ===========================
# DataFrame の概念的実装
# ===========================

class Row:
    def __init__(self, **kwargs):
        self._data = kwargs

    def __getattr__(self, name):
        if name.startswith("_"):
            return super().__getattribute__(name)
        return self._data.get(name)

    def __repr__(self):
        return f"Row({', '.join(f'{k}={v!r}' for k, v in self._data.items())})"

    def to_dict(self):
        return dict(self._data)


class DataFrame:
    """Spark DataFrame の概念的実装（パンダ的な API）"""

    def __init__(self, rows: list[dict], schema: list[str]):
        self.rows = [Row(**r) for r in rows]
        self.schema = schema

    def select(self, *columns: str) -> "DataFrame":
        return DataFrame([{c: row.to_dict().get(c) for c in columns} for row in self.rows], list(columns))

    def filter(self, condition: Callable) -> "DataFrame":
        return DataFrame([r.to_dict() for r in self.rows if condition(r)], self.schema)

    def groupby(self, *keys: str) -> "GroupedDataFrame":
        return GroupedDataFrame(self, list(keys))

    def join(self, other: "DataFrame", on: str, how: str = "inner") -> "DataFrame":
        """内部結合"""
        right_index: dict = defaultdict(list)
        for row in other.rows:
            right_index[getattr(row, on)].append(row.to_dict())

        result = []
        for row in self.rows:
            key = getattr(row, on)
            for right_row in right_index.get(key, []):
                merged = {**row.to_dict(), **right_row}
                result.append(merged)

        return DataFrame(result, list(set(self.schema + other.schema)))

    def show(self, n: int = 5) -> None:
        if not self.schema:
            return
        col_widths = {c: max(len(c), max((len(str(getattr(r, c, ""))) for r in self.rows[:n]), default=0)) for c in self.schema}
        header = " | ".join(c.ljust(col_widths[c]) for c in self.schema)
        print(f"  {header}")
        print("  " + "-" * len(header))
        for row in self.rows[:n]:
            print("  " + " | ".join(str(getattr(row, c, "")).ljust(col_widths[c]) for c in self.schema))

    def __len__(self):
        return len(self.rows)


class GroupedDataFrame:
    def __init__(self, df: "DataFrame", keys: list[str]):
        self.df = df
        self.keys = keys

        self._groups: dict = defaultdict(list)
        for row in df.rows:
            group_key = tuple(getattr(row, k) for k in keys)
            self._groups[group_key].append(row)

    def agg(self, **agg_exprs) -> "DataFrame":
        """集計（例: count="count", revenue="sum"）"""
        result = []
        for group_key, rows in self._groups.items():
            row_dict = dict(zip(self.keys, group_key))
            for col_name, func_name in agg_exprs.items():
                col_key = col_name.split("_")[0] if "_" in col_name else col_name
                values = [getattr(r, col_key) for r in rows if getattr(r, col_key) is not None]
                if func_name == "sum":
                    row_dict[col_name] = sum(values)
                elif func_name == "count":
                    row_dict[col_name] = len(rows)
                elif func_name == "avg":
                    row_dict[col_name] = round(sum(values) / len(values), 2) if values else 0
                elif func_name == "max":
                    row_dict[col_name] = max(values) if values else None
            result.append(row_dict)

        return DataFrame(result, self.keys + list(agg_exprs.keys()))


import random

print("=== Apache Spark 入門デモ ===\n")

# RDD のデモ
print("[RDD: Word Count（MapReduce の Hello World）]")
texts = [
    "Apache Spark is a unified analytics engine",
    "Spark supports SQL DataFrames and Datasets",
    "Apache Spark MLlib provides machine learning",
    "Spark Streaming enables real time analytics",
]

rdd = RDD(texts, num_partitions=4)
word_counts = (rdd
    .flat_map(lambda line: [(w.lower(), 1) for w in line.split()])
    .reduce_by_key(lambda a, b: a + b)
)
word_counts.sort(key=lambda x: x[1], reverse=True)
print(f"  上位単語: {word_counts[:8]}")

# DataFrame のデモ
print("\n[DataFrame: 売上分析]")
random.seed(42)
products = ["PC", "スマホ", "タブレット"]
regions = ["東日本", "西日本"]

sales_data = [
    {"order_id": i, "product": random.choice(products), "region": random.choice(regions),
     "revenue": random.randint(10000, 100000), "quantity": random.randint(1, 5)}
    for i in range(20)
]

df = DataFrame(sales_data, ["order_id", "product", "region", "revenue", "quantity"])
print(f"  全レコード数: {len(df)}")

# 集計クエリ
print("\n[製品別 売上合計]")
result = df.groupby("product").agg(revenue="sum", quantity="sum", order_id="count")
result.schema = ["product", "revenue", "quantity", "order_id"]
result.show()

print("\n[東日本のみ フィルタ後 地域別売上]")
filtered = df.filter(lambda r: r.region == "東日本")
agg = filtered.groupby("product").agg(revenue="sum")
agg.schema = ["product", "revenue"]
agg.show()

print("\n[PySpark の実際のコード例]")
print("""  from pyspark.sql import SparkSession
  from pyspark.sql import functions as F

  spark = SparkSession.builder.appName("SalesAnalysis").getOrCreate()

  # Parquet ファイルの読み込み
  df = spark.read.parquet("s3://bucket/sales/*.parquet")

  # 集計クエリ（Catalyst オプティマイザが最適化）
  result = (df
      .filter(F.col("region") == "東日本")
      .groupBy("product")
      .agg(
          F.sum("revenue").alias("total_revenue"),
          F.avg("quantity").alias("avg_qty"),
          F.count("*").alias("order_count"),
      )
      .orderBy(F.col("total_revenue").desc())
  )
  result.show()

  # Spark SQL
  df.createOrReplaceTempView("sales")
  spark.sql(\"\"\"
      SELECT product, SUM(revenue) AS total_revenue
      FROM sales
      GROUP BY product
      ORDER BY total_revenue DESC
  \"\"\").show()""")
```

## 使用場面

- 数 TB から数 PB のデータを Spark で分散処理して機械学習特徴量の生成・ETL パイプラインを実行する場面
- Spark Structured Streaming で Kafka からのリアルタイムイベントを処理して集計・アラート配信を行う場面
- Databricks や Amazon EMR 上で PySpark を使って大規模なデータ変換・分析ジョブを実行する場面

## 参考文献

- Zaharia, M. et al. "Spark: Cluster Computing with Working Sets" (HotCloud 2010)
- [Apache Spark Documentation](https://spark.apache.org/docs/latest/)
- Chambers, B. and Zaharia, M. "Spark: The Definitive Guide" (O'Reilly)

<AffiliateBanner site="db_navi" />
