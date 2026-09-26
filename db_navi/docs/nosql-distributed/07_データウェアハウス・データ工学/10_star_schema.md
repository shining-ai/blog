import AffiliateBanner from '@site/src/components/AffiliateBanner';

# スタースキーマとスノーフレークスキーマ

## スタースキーマとは

> スタースキーマとはデータウェアハウス設計において中央の「ファクトテーブル」（売上・取引などの数値データ）の周囲に「ディメンションテーブル」（日付・製品・顧客などの属性）を配置した非正規化スキーマであり、スノーフレークスキーマはディメンションをさらに正規化した派生形である。

スタースキーマ（Star Schema）は Ralph Kimball が体系化したデータウェアハウスの設計手法です。中央のファクトテーブルには数値メトリクス（売上金額・数量・利益）と各ディメンションへの外部キーが格納されます。ディメンションテーブルには分析軸となる属性（製品名・カテゴリ・顧客名・地域・日付）が非正規化されています。

スタースキーマの利点は「JOIN が 1 段階」でシンプルなため、OLAP クエリのパフォーマンスが高い点です。欠点はデータの重複（非正規化による冗長性）です。

スノーフレークスキーマ（Snowflake Schema）はディメンションテーブルをさらに正規化して雪の結晶のような形状になります。例えば「製品ディメンション」を「製品テーブル + カテゴリテーブル + メーカーテーブル」に分割します。データの重複は減りますが JOIN が複雑になります。

SCD（Slowly Changing Dimension: ゆっくり変化するディメンション）は顧客の住所変更・製品の価格変更など時間の経過とともに変化するディメンション属性の管理手法です。SCD Type 1（上書き）・Type 2（履歴保持）・Type 3（変更前後を別列に保持）があります。

## スタースキーマ vs スノーフレークスキーマ

| 項目 | スタースキーマ | スノーフレークスキーマ |
|------|-------------|-------------------|
| ディメンション | 非正規化（1 テーブル） | 正規化（複数テーブル） |
| JOIN 段数 | 少ない | 多い |
| クエリ性能 | 高い | やや低い |
| データ冗長性 | 多い | 少ない |
| 理解しやすさ | 容易 | やや複雑 |
| 用途 | 大規模 DWH | データマート |

```python
from dataclasses import dataclass, field
from datetime import date, datetime
from collections import defaultdict

# ===========================
# スタースキーマの実装
# ===========================

# ディメンションテーブル
@dataclass
class DateDimension:
    date_key: int
    full_date: date
    year: int
    quarter: int
    month: int
    month_name: str
    day_of_week: str
    is_weekend: bool


@dataclass
class ProductDimension:
    product_key: int
    product_id: str
    product_name: str
    category: str
    sub_category: str
    unit_price: float


@dataclass
class CustomerDimension:
    customer_key: int
    customer_id: str
    customer_name: str
    city: str
    region: str
    segment: str  # Consumer / Corporate / Home Office


@dataclass
class SalesFact:
    """ファクトテーブル: 粒度 = 1 注文明細"""
    order_id: str
    date_key:     int
    product_key:  int
    customer_key: int
    quantity:     int
    unit_price:   float
    discount:     float
    revenue:      float  # = quantity * unit_price * (1 - discount)
    profit:       float


class StarSchemaWarehouse:
    """スタースキーマによるデータウェアハウス"""

    def __init__(self):
        self.date_dim:     dict[int, DateDimension]     = {}
        self.product_dim:  dict[int, ProductDimension]  = {}
        self.customer_dim: dict[int, CustomerDimension] = {}
        self.fact_table:   list[SalesFact]              = []

    def load_date_dimension(self) -> None:
        """日付ディメンションの生成"""
        for month in range(1, 7):
            d = date(2026, month, 1)
            key = int(d.strftime("%Y%m%d"))
            month_names = {1:"January",2:"February",3:"March",
                           4:"April",5:"May",6:"June"}
            self.date_dim[key] = DateDimension(
                date_key=key, full_date=d,
                year=2026, quarter=(month-1)//3+1, month=month,
                month_name=month_names[month],
                day_of_week=d.strftime("%A"),
                is_weekend=d.weekday() >= 5,
            )

    def query_star(
        self,
        group_by_dim: str,     # "product.category" / "customer.region" / "date.quarter"
        metric: str = "revenue",
        where: dict = {},
    ) -> list[dict]:
        """
        スタースキーマ クエリ（1 段階 JOIN をシミュレート）
        実際の SQL 例:
          SELECT p.category, SUM(f.revenue)
          FROM sales_fact f
          JOIN product_dim p ON f.product_key = p.product_key
          WHERE d.year = 2026
          GROUP BY p.category
        """
        results: dict[str, float] = defaultdict(float)
        counts:  dict[str, int] = defaultdict(int)

        for fact in self.fact_table:
            # WHERE 条件チェック
            skip = False
            for dim_field, val in where.items():
                dim, attr = dim_field.split(".")
                if dim == "date":
                    d = self.date_dim.get(fact.date_key)
                    if d and getattr(d, attr, None) != val:
                        skip = True
                elif dim == "product":
                    p = self.product_dim.get(fact.product_key)
                    if p and getattr(p, attr, None) != val:
                        skip = True
                elif dim == "customer":
                    c = self.customer_dim.get(fact.customer_key)
                    if c and getattr(c, attr, None) != val:
                        skip = True
            if skip:
                continue

            # GROUP BY キーを取得
            dim_name, attr_name = group_by_dim.split(".")
            if dim_name == "product":
                key = getattr(self.product_dim.get(fact.product_key), attr_name, "Unknown")
            elif dim_name == "customer":
                key = getattr(self.customer_dim.get(fact.customer_key), attr_name, "Unknown")
            elif dim_name == "date":
                key = getattr(self.date_dim.get(fact.date_key), attr_name, "Unknown")
            else:
                key = "Unknown"

            # メトリクス集計
            metric_val = getattr(fact, metric, 0)
            results[key] += metric_val
            counts[key] += 1

        return sorted(
            [{"key": k, "value": round(v, 2), "count": counts[k]} for k, v in results.items()],
            key=lambda x: x["value"],
            reverse=True,
        )


import random

print("=== スタースキーマデモ ===\n")

dw = StarSchemaWarehouse()
dw.load_date_dimension()

# 製品ディメンション
products_data = [
    (1, "P001", "MacBook Pro", "Technology", "Laptops", 250000),
    (2, "P002", "iPhone 16",   "Technology", "Phones",  120000),
    (3, "P003", "Office Chair","Furniture",  "Chairs",  45000),
    (4, "P004", "Desk Lamp",   "Office",     "Lamps",   8000),
    (5, "P005", "iPad Air",    "Technology", "Tablets", 90000),
]
for pk, pid, name, cat, subcat, price in products_data:
    dw.product_dim[pk] = ProductDimension(pk, pid, name, cat, subcat, price)

# 顧客ディメンション
customers_data = [
    (1, "C001", "東京電機株式会社", "東京", "東日本", "Corporate"),
    (2, "C002", "大阪通商",        "大阪", "西日本", "Corporate"),
    (3, "C003", "田中太郎",        "名古屋","中部",  "Consumer"),
]
for ck, cid, name, city, region, seg in customers_data:
    dw.customer_dim[ck] = CustomerDimension(ck, cid, name, city, region, seg)

# ファクトデータの生成
date_keys = list(dw.date_dim.keys())
random.seed(42)
for i in range(500):
    qty = random.randint(1, 10)
    pk = random.randint(1, 5)
    price = dw.product_dim[pk].unit_price
    discount = random.choice([0, 0.1, 0.2])
    revenue = qty * price * (1 - discount)
    dw.fact_table.append(SalesFact(
        order_id=f"ORD-{i:04d}",
        date_key=random.choice(date_keys),
        product_key=pk,
        customer_key=random.randint(1, 3),
        quantity=qty,
        unit_price=price,
        discount=discount,
        revenue=revenue,
        profit=revenue * 0.3,
    ))

print(f"[データ規模: ファクトテーブル {len(dw.fact_table)} 行]")

print("\n[クエリ 1: 製品カテゴリ別 売上合計]")
for r in dw.query_star("product.category", "revenue"):
    print(f"  {r['key']:<15} {r['value']:>15,.0f} 円  ({r['count']} 件)")

print("\n[クエリ 2: 地域別 売上合計（2026 Q1 フィルタ）]")
for r in dw.query_star("customer.region", "revenue", where={"date.quarter": 1}):
    print(f"  {r['key']:<10} {r['value']:>15,.0f} 円")

print("\n[クエリ 3: 月別 利益合計]")
for r in dw.query_star("date.month", "profit"):
    print(f"  {r['key']} 月  {r['value']:>12,.0f} 円")

print("\n[スキーマ設計の SQL イメージ]")
print("""  -- スタースキーマ
  CREATE TABLE sales_fact (
    order_id      VARCHAR,
    date_key      INTEGER REFERENCES date_dim(date_key),
    product_key   INTEGER REFERENCES product_dim(product_key),
    customer_key  INTEGER REFERENCES customer_dim(customer_key),
    quantity      INTEGER,
    revenue       DECIMAL(12,2),
    profit        DECIMAL(12,2)
  );

  -- OLAP クエリ例（1段階JOIN）
  SELECT p.category, SUM(f.revenue) AS total_revenue
  FROM sales_fact f
  JOIN product_dim p ON f.product_key = p.product_key
  JOIN date_dim d    ON f.date_key    = d.date_key
  WHERE d.year = 2026 AND d.quarter = 1
  GROUP BY p.category
  ORDER BY total_revenue DESC;""")
```

## 使用場面

- データウェアハウス（BigQuery・Redshift・Snowflake）でスタースキーマを定義して BI ツール（Tableau・Looker）からの集計クエリを高速化する場面
- 分析クエリのパフォーマンス問題をスノーフレークからスタースキーマへの非正規化で解決する場面
- SCD Type 2 で顧客の住所変更・製品の価格変更の履歴を保持して任意時点の分析を可能にする場面

## 参考文献

- Kimball, R. and Ross, M. "The Data Warehouse Toolkit" (Wiley)
- Inmon, W. H. "Building the Data Warehouse" (Wiley)
- Kleppmann, M. "Designing Data-Intensive Applications" (O'Reilly)

<AffiliateBanner site="db_navi" />
