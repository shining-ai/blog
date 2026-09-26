import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 非正規化と設計のトレードオフ

## 非正規化とは

> 非正規化（Denormalization）とは、クエリパフォーマンスの向上を目的として、意図的にデータの冗長性を導入し、正規化されたテーブルを結合する代わりにあらかじめ計算済みまたは重複した値を保持する設計手法である。

正規化はデータの一貫性と整合性を保つうえで重要ですが、過度な正規化は読み取りパフォーマンスに悪影響を与えることがあります。特に多数のJOINが必要なクエリでは、インデックスを使用しても結合のコストが大きくなる場合があります。非正規化はこのトレードオフに対処するための設計技法です。

非正規化の主な手法には「派生属性の追加（集計値をカラムとして保持）」「テーブルの結合（分離されたテーブルを統合）」「列の重複（JOINを避けるために他テーブルの値をコピー）」「垂直分割・水平分割」などがあります。

ただし非正規化には代償が伴います。データが冗長になるため、更新時に複数箇所を同期する必要があり、更新異常のリスクが生じます。非正規化はパフォーマンス計測に基づいて必要な箇所にのみ適用すべきであり、最初から非正規化するのは早計な最適化（Premature Optimization）です。

## 正規化 vs 非正規化のトレードオフ

| 観点 | 正規化 | 非正規化 |
|------|--------|---------|
| 読み取り速度 | 遅い（多数のJOIN） | 速い（JOIN削減） |
| 書き込み速度 | 速い（1箇所のみ更新） | 遅い（複数箇所の同期） |
| ストレージ | 少ない | 多い（冗長データ） |
| 一貫性 | 高い（自動保証） | 要注意（手動で維持） |
| 柔軟性 | 高い | 低い（特定クエリ向け最適化） |
| 適用シーン | OLTP（頻繁な更新） | OLAP（頻繁な読み取り） |

```sql
-- ====================================
-- 非正規化の例1: 派生属性（集計値）の追加
-- ====================================
-- 正規化版: 注文合計を毎回 SUM(qty * unit_price) で計算
SELECT SUM(qty * unit_price) FROM order_items WHERE order_id = 1;

-- 非正規化版: orders テーブルに total_amount カラムを追加
ALTER TABLE orders ADD COLUMN total_amount DECIMAL(12,2);

-- total_amount を自動更新するトリガー（PostgreSQL）
CREATE OR REPLACE FUNCTION update_order_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE orders
    SET    total_amount = (
        SELECT COALESCE(SUM(qty * unit_price), 0)
        FROM   order_items
        WHERE  order_id = COALESCE(NEW.order_id, OLD.order_id)
    )
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_total
AFTER INSERT OR UPDATE OR DELETE ON order_items
FOR EACH ROW EXECUTE FUNCTION update_order_total();

-- ====================================
-- 非正規化の例2: 頻繁にJOINする列のコピー
-- ====================================
-- orders テーブルに customer_name を持たせる（正規化違反だが高速）
ALTER TABLE orders ADD COLUMN customer_name VARCHAR(100);

-- 挿入時に顧客名をコピー
INSERT INTO orders (customer_id, customer_name, order_date)
SELECT 1, name, NOW() FROM customers WHERE id = 1;

-- 顧客名変更時の同期が必要（更新異常のリスク）
UPDATE orders SET customer_name = 'New Name'
WHERE customer_id = 1;

-- ====================================
-- 非正規化の例3: テーブルの統合（垂直分割の逆）
-- ====================================
-- 正規化: users + user_profiles の2テーブル
-- 非正規化: よく一緒に参照するので1テーブルに統合
CREATE TABLE users_denormalized (
    id         SERIAL       PRIMARY KEY,
    username   VARCHAR(50)  NOT NULL,
    email      VARCHAR(255) NOT NULL,
    -- profiles から移動
    bio        TEXT,
    avatar_url VARCHAR(500),
    -- 統計情報（集計値）
    order_count    INT     DEFAULT 0,
    total_spending DECIMAL(12,2) DEFAULT 0
);

-- ====================================
-- 非正規化の例4: サマリーテーブル（OLAP向け）
-- ====================================
CREATE TABLE daily_sales_summary (
    date     DATE        NOT NULL,
    category VARCHAR(50) NOT NULL,
    revenue  DECIMAL(14,2),
    qty_sold INT,
    PRIMARY KEY (date, category)
);

-- 夜間バッチでサマリーを更新
INSERT INTO daily_sales_summary (date, category, revenue, qty_sold)
SELECT
    DATE(o.order_date),
    p.category,
    SUM(i.qty * i.unit_price),
    SUM(i.qty)
FROM orders o
JOIN order_items i ON o.id = i.order_id
JOIN products    p ON i.product_id = p.id
WHERE DATE(o.order_date) = CURRENT_DATE - 1
GROUP BY DATE(o.order_date), p.category
ON CONFLICT (date, category) DO UPDATE
    SET revenue  = EXCLUDED.revenue,
        qty_sold = EXCLUDED.qty_sold;

-- 高速なダッシュボード用クエリ（JOINなし）
SELECT date, SUM(revenue) AS total_revenue
FROM   daily_sales_summary
WHERE  date >= CURRENT_DATE - 30
GROUP BY date
ORDER BY date;
```

```python
import psycopg2
from datetime import date, timedelta

conn = psycopg2.connect(
    host="localhost", dbname="mydb", user="user", password="pass"
)
cur = conn.cursor()

# サマリーテーブルの差分更新（日次バッチ）
yesterday = date.today() - timedelta(days=1)

cur.execute("""
    INSERT INTO daily_sales_summary (date, category, revenue, qty_sold)
    SELECT
        DATE(o.order_date),
        p.category,
        SUM(i.qty * i.unit_price),
        SUM(i.qty)
    FROM orders o
    JOIN order_items i ON o.id = i.order_id
    JOIN products    p ON i.product_id = p.id
    WHERE DATE(o.order_date) = %s
    GROUP BY DATE(o.order_date), p.category
    ON CONFLICT (date, category) DO UPDATE
        SET revenue  = EXCLUDED.revenue,
            qty_sold = EXCLUDED.qty_sold
""", (yesterday,))

conn.commit()
print(f"Sales summary updated for {yesterday}")
cur.close()
conn.close()
```

## 使用場面

- OLAPのダッシュボードで集計を高速化するためのサマリーテーブルの作成
- 多数のJOINが必要なレポートクエリのパフォーマンスを改善する場合
- 書き込みより読み取りの頻度が圧倒的に高い参照専用テーブルの設計
- マテリアライズドビューや集計テーブルによるキャッシュ戦略の実装

## 参考文献

- [PostgreSQL Documentation - Rule System](https://www.postgresql.org/docs/current/rules.html)
- Joe Celko, "Joe Celko's SQL for Smarties", 5th Edition
- Martin Fowler, "Patterns of Enterprise Application Architecture"

<AffiliateBanner site="db_navi" />
