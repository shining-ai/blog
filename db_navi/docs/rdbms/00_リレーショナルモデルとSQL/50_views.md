import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ビュー・マテリアライズドビュー

## ビューとは

> ビュー（View）とは、1つ以上のテーブルに対するSELECT文に名前を付けて保存した仮想テーブルであり、マテリアライズドビューはビューの結果を実際にディスクに保存してクエリのたびに再計算しない最適化された派生テーブルである。

通常のビューはクエリを保存したものに過ぎず、参照するたびに元のSELECT文が実行されます。複雑なJOINや集計をビューとして定義することで、アプリケーション側からはシンプルなテーブルのように参照できます。これにより、クエリの再利用性向上・セキュリティ制御（特定列のみ公開）・ロジックのカプセル化が実現できます。

マテリアライズドビュー（Materialized View）は計算結果をテーブルとして物理的に保存します。集計や複雑なJOINの結果を事前に計算して保存するため、クエリのたびに重い計算を繰り返さずに済みます。ただし、元データの変更を自動反映しないため、定期的な `REFRESH` が必要です。OLAP・ダッシュボード・レポーティングで特に有効です。

## ビュー vs マテリアライズドビュー

| 特性 | 通常のビュー | マテリアライズドビュー |
|------|------------|-------------------|
| データの保存 | 保存しない（仮想） | 物理的に保存する |
| 参照時の速度 | 毎回クエリ実行 | 保存データを返す（高速） |
| データの鮮度 | 常に最新 | REFRESH するまで古いまま |
| ストレージ消費 | なし | あり |
| インデックス作成 | 不可（多くのDB） | 可能 |
| 更新操作 | 条件付きで可 | 不可 |

```sql
-- 通常のビューの作成
CREATE VIEW active_users AS
SELECT id, name, email
FROM   users
WHERE  is_active = true;

-- ビューへのアクセス（テーブルと同様に使用可能）
SELECT * FROM active_users WHERE name LIKE 'A%';

-- 複雑なJOINをビューに封じ込める
CREATE VIEW order_summary AS
SELECT
    o.id          AS order_id,
    c.name        AS customer_name,
    o.order_date,
    SUM(i.qty * p.price) AS total_amount
FROM orders o
JOIN customers  c ON o.customer_id = c.id
JOIN order_items i ON o.id = i.order_id
JOIN products   p ON i.product_id = p.id
GROUP BY o.id, c.name, o.order_date;

-- ビューのクエリ
SELECT customer_name, SUM(total_amount) AS grand_total
FROM   order_summary
WHERE  order_date >= '2024-01-01'
GROUP BY customer_name
ORDER BY grand_total DESC;

-- セキュリティ用ビュー（機密列を除外して公開）
CREATE VIEW public_employees AS
SELECT id, name, department, job_title
FROM   employees;
-- salary などの機密情報は含めない

-- 更新可能ビュー（単一テーブル・集計なし・DISTINCTなし）
CREATE VIEW japan_customers AS
SELECT id, name, email
FROM   customers
WHERE  country = 'Japan'
WITH CHECK OPTION;  -- 日本以外のデータ挿入を防ぐ

UPDATE japan_customers SET name = 'Taro' WHERE id = 1;

-- マテリアライズドビューの作成（PostgreSQL）
CREATE MATERIALIZED VIEW monthly_sales_mv AS
SELECT
    DATE_TRUNC('month', o.order_date) AS month,
    p.category,
    SUM(i.qty * p.price)              AS revenue,
    COUNT(DISTINCT o.id)              AS order_count
FROM orders o
JOIN order_items i ON o.id = i.order_id
JOIN products   p ON i.product_id = p.id
GROUP BY DATE_TRUNC('month', o.order_date), p.category
WITH DATA;  -- 作成時にデータを投入

-- マテリアライズドビューへのインデックス
CREATE INDEX idx_mv_month ON monthly_sales_mv(month);

-- クエリ（事前計算済みなので高速）
SELECT * FROM monthly_sales_mv
WHERE  month >= '2024-01-01'
ORDER BY month, revenue DESC;

-- マテリアライズドビューのリフレッシュ
REFRESH MATERIALIZED VIEW monthly_sales_mv;  -- 全件置き換え（ロックあり）
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_sales_mv;  -- ロックなし（UNIQUE INDEX が必要）

-- ビューの削除
DROP VIEW IF EXISTS active_users;
DROP MATERIALIZED VIEW IF EXISTS monthly_sales_mv;
```

```python
import psycopg2

conn = psycopg2.connect(
    host="localhost", dbname="mydb", user="user", password="pass"
)
cur = conn.cursor()

# マテリアライズドビューを定期リフレッシュ（バッチ処理など）
cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_sales_mv")
conn.commit()
print("Materialized view refreshed.")

# ビューから集計データを取得
cur.execute("""
    SELECT month, category, revenue
    FROM   monthly_sales_mv
    WHERE  month = DATE_TRUNC('month', CURRENT_DATE)
    ORDER BY revenue DESC
    LIMIT 5
""")

for row in cur.fetchall():
    print(f"月: {row[0].strftime('%Y-%m')}, カテゴリ: {row[1]}, 売上: {row[2]}")

cur.close()
conn.close()
```

## 使用場面

- 複雑なJOINや集計を再利用可能なビューとして定義してクエリを簡略化する場合
- 機密列（給与・個人情報）を除外したビューでアクセス制御を実装する場合
- OLAPのダッシュボードで重い集計クエリをマテリアライズドビューで高速化する場合
- 定期バッチでマテリアライズドビューをリフレッシュしてレポート用データを更新する場合

## 参考文献

- [PostgreSQL Documentation - CREATE VIEW](https://www.postgresql.org/docs/current/sql-createview.html)
- [PostgreSQL Documentation - Materialized Views](https://www.postgresql.org/docs/current/rules-materializedviews.html)
- [MySQL Documentation - CREATE VIEW](https://dev.mysql.com/doc/refman/8.0/en/create-view.html)

<AffiliateBanner site="db_navi" />
