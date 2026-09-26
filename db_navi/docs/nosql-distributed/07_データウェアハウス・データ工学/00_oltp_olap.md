import AffiliateBanner from '@site/src/components/AffiliateBanner';

# OLTP vs OLAP

## OLTP と OLAP とは

> OLTP（Online Transaction Processing）とはリアルタイムで多数の短いトランザクションを処理するシステムであり、OLAP（Online Analytical Processing）とは大量の過去データを集計・分析するシステムであり、両者は対象データ規模・クエリパターン・最適化手法が根本的に異なる。

OLTP は「業務システム」の中核です。注文処理・在庫管理・銀行取引などリアルタイムで多数のユーザが小さな読み書きを行います。特徴は「高い書き込み頻度」「短い応答時間（ミリ秒）」「行指向ストレージ」「正規化されたスキーマ」です。1 クエリが操作する行数は少量（数件〜数百件）です。

OLAP は「分析システム」の用途です。経営ダッシュボード・売上集計・BI（Business Intelligence）ツールが使います。特徴は「少数の複雑なクエリ」「全データスキャン（数百万〜数十億行）」「列指向ストレージ」「非正規化スキーマ（スタースキーマ）」です。応答時間は秒〜分かかっても許容されます。

HTAP（Hybrid Transactional/Analytical Processing）は 1 つのシステムで OLTP と OLAP を同時処理するアプローチです。TiDB・SingleStore・Snowflake Unistore が実装します。

ETL（Extract-Transform-Load）は OLTP データを OLAP（データウェアハウス）に定期的に転送する伝統的なアーキテクチャです。現代では ELT（Extract-Load-Transform）や CDC（Change Data Capture）を使ったリアルタイムパイプラインも普及しています。

## OLTP と OLAP の比較

| 特性 | OLTP | OLAP |
|------|------|------|
| 主な用途 | 業務処理 | 分析・レポート |
| クエリパターン | 短い読み書き | 長い集計クエリ |
| データ量 | 現在の業務データ | 大量の過去データ |
| スキーマ | 正規化（3NF） | 非正規化（スタースキーマ） |
| 最適化 | 書き込み・行取得 | スキャン・集計 |
| ストレージ | 行指向 | 列指向 |
| 代表システム | MySQL, PostgreSQL | BigQuery, Redshift, Snowflake |

```python
import time
import random
from dataclasses import dataclass, field
from collections import defaultdict

# ===========================
# OLTP と OLAP のクエリパターンの違いを実装で示す
# ===========================

# OLTPデータ: 注文システム（正規化されたスキーマ）
class OLTPDatabase:
    """OLTP 型データベース（行指向・正規化スキーマ）"""

    def __init__(self):
        # 顧客テーブル
        self.customers: dict[int, dict] = {}
        # 注文テーブル
        self.orders: dict[int, dict] = {}
        # 注文明細テーブル
        self.order_items: dict[int, list[dict]] = defaultdict(list)
        self._order_id = 0

    def insert_customer(self, customer_id: int, name: str, email: str) -> None:
        self.customers[customer_id] = {"id": customer_id, "name": name, "email": email}

    def create_order(self, customer_id: int, items: list[dict]) -> int:
        """注文作成（OLTP の典型的な書き込みトランザクション）"""
        self._order_id += 1
        order_id = self._order_id

        # 注文ヘッダ
        self.orders[order_id] = {
            "id": order_id,
            "customer_id": customer_id,
            "status": "pending",
            "created_at": time.time(),
        }
        # 注文明細
        for item in items:
            self.order_items[order_id].append(item)

        return order_id

    def get_order(self, order_id: int) -> dict | None:
        """主キー検索（OLTP の典型的な読み取り）"""
        order = self.orders.get(order_id)
        if not order:
            return None
        customer = self.customers.get(order["customer_id"], {})
        items = self.order_items.get(order_id, [])
        return {**order, "customer": customer, "items": items}


# OLAPデータ: データウェアハウス（非正規化・列指向スキーマ）
class OLAPDatabase:
    """OLAP 型データベース（列指向・非正規化スキーマ）"""

    def __init__(self):
        # ファクトテーブル: order_fact（非正規化、全属性を1テーブルに）
        # 列指向: 各列を個別のリストで保持
        self.columns: dict[str, list] = defaultdict(list)
        self.row_count = 0

    def insert(self, row: dict) -> None:
        """行の挿入（バッチロード）"""
        for col, val in row.items():
            self.columns[col].append(val)
        self.row_count += 1

    def aggregate(
        self,
        group_by: str,
        metric: str,
        agg_func: str = "sum",
        where: dict = {},
    ) -> list[dict]:
        """
        集計クエリ（OLAP の典型的なクエリ）
        group_by: グループ化する列名
        metric: 集計する列名
        agg_func: sum / avg / count / max
        """
        col_group = self.columns.get(group_by, [])
        col_metric = self.columns.get(metric, [])

        if not col_group:
            return []

        # WHERE 条件でフィルタリング
        mask = [True] * self.row_count
        for col_name, filter_val in where.items():
            filter_col = self.columns.get(col_name, [])
            for i in range(self.row_count):
                if i < len(filter_col) and filter_col[i] != filter_val:
                    mask[i] = False

        # グループ集計
        groups: dict = defaultdict(list)
        for i in range(self.row_count):
            if mask[i] and i < len(col_group) and i < len(col_metric):
                groups[col_group[i]].append(col_metric[i])

        # 集計関数の適用
        import statistics
        agg_fns = {
            "sum": sum,
            "avg": lambda x: statistics.mean(x) if x else 0,
            "count": len,
            "max": max,
        }
        fn = agg_fns.get(agg_func, sum)

        return sorted(
            [{"key": k, "value": round(fn(v), 2)} for k, v in groups.items()],
            key=lambda x: x["value"],
            reverse=True,
        )


print("=== OLTP vs OLAP デモ ===\n")

# OLTP デモ
print("[OLTP: 注文処理（正規化スキーマ）]")
oltp = OLTPDatabase()
for i in range(1, 6):
    oltp.insert_customer(i, f"顧客{i}", f"user{i}@example.com")

# 注文作成
for i in range(1, 11):
    items = [{"product": f"商品{random.randint(1,5)}", "price": random.randint(100, 5000), "qty": random.randint(1, 3)}]
    order_id = oltp.create_order(random.randint(1, 5), items)

# 主キー検索（高速）
start = time.perf_counter()
order = oltp.get_order(3)
elapsed_us = (time.perf_counter() - start) * 1e6
print(f"  主キー検索 order_id=3: {elapsed_us:.1f} μs")
print(f"  結果: {order['customer']['name']} の注文, 商品: {order['items'][0]['product']}")

# OLAP デモ
print("\n[OLAP: 集計クエリ（非正規化スキーマ）]")
olap = OLAPDatabase()
products = ["PC", "スマホ", "タブレット", "イヤホン", "ケース"]
regions = ["東日本", "西日本", "中部"]

for _ in range(100_000):
    olap.insert({
        "order_date": f"2026-{random.randint(1,6):02d}",
        "product": random.choice(products),
        "region": random.choice(regions),
        "revenue": random.randint(1000, 50000),
        "quantity": random.randint(1, 5),
    })

print(f"  データ行数: {olap.row_count:,} 行")

start = time.perf_counter()
result = olap.aggregate("product", "revenue", "sum")
elapsed_ms = (time.perf_counter() - start) * 1000

print(f"  製品別売上集計: {elapsed_ms:.1f} ms")
print(f"  {'製品':<10} {'売上合計':>15}")
for r in result:
    bar = "█" * (r["value"] // 5_000_000)
    print(f"  {r['key']:<10} {r['value']:>15,.0f}  {bar}")

print("\n[SQL 比較: OLTP と OLAP]")
print("""  OLTP（行取得）:
    SELECT o.*, c.name, oi.*
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.id = 12345;  -- インデックス使用, ~1ms

  OLAP（集計）:
    SELECT product, region, SUM(revenue), COUNT(*)
    FROM order_fact
    WHERE order_date BETWEEN '2026-01-01' AND '2026-06-30'
    GROUP BY product, region
    ORDER BY SUM(revenue) DESC;  -- 全スキャン, 列圧縮で高速化""")
```

## 使用場面

- 業務システム（EC・銀行・在庫）には OLTP データベース（PostgreSQL・MySQL）を使い読み書きの低遅延を優先する場面
- データウェアハウス（BigQuery・Redshift・Snowflake）で大量の過去データを集計・分析して経営ダッシュボードを構築する場面
- OLTP データを定期的に ETL して OLAP 環境に転送してレポーティングとトランザクション処理を分離する場面

## 参考文献

- Codd, E. F. "Providing OLAP to User-Analysts: An IT Mandate" (1993)
- Kleppmann, M. "Designing Data-Intensive Applications" (O'Reilly)
- Kimball, R. and Ross, M. "The Data Warehouse Toolkit" (Wiley)

<AffiliateBanner site="db_navi" />
