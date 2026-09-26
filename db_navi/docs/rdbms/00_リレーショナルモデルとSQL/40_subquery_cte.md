import AffiliateBanner from '@site/src/components/AffiliateBanner';

# サブクエリと CTE（WITH 句）

## サブクエリと CTE とは

> サブクエリとは、別のSQL文の中に埋め込まれたSELECT文であり、CTE（Common Table Expression）はWITH句を用いてサブクエリに名前を付けて再利用可能にした一時的な名前付き結果セットである。

サブクエリはSQLクエリの中でさらに別のクエリを使用する技術です。`WHERE` 句・`FROM` 句・`SELECT` 句など様々な場所に記述でき、動的に生成した集計値との比較や一時的な結果セットの生成に使用します。ただし、深くネストしたサブクエリは可読性が低下するという問題があります。

CTE（WITH句）はサブクエリに名前を付けて宣言する構文で、同一クエリ内で複数回参照できます。複雑なクエリを段階的に分解して記述できるため、可読性と保守性が大幅に向上します。再帰CTE（`WITH RECURSIVE`）を使用すると、ツリー構造や階層データを再帰的に展開できます。

相関サブクエリは外側のクエリの各行に対してサブクエリが実行される特殊なサブクエリです。`EXISTS` 演算子と組み合わせることで、特定の条件を満たす行が存在するかどうかの確認に使用されます。

## サブクエリとCTEの比較

| 種類 | 記述場所 | 再利用 | 再帰 | 特徴 |
|------|---------|--------|------|------|
| スカラーサブクエリ | SELECT句 | 不可 | 不可 | 1値を返す |
| テーブルサブクエリ | FROM句 | 不可 | 不可 | 仮想テーブルとして使用 |
| 相関サブクエリ | WHERE句 | 不可 | 不可 | 外側クエリの列を参照 |
| CTE（WITH句） | クエリ先頭 | 可 | 可（RECURSIVE） | 複雑クエリを分割 |

```sql
-- サンプルテーブル
CREATE TABLE products (
    id       INT PRIMARY KEY,
    name     VARCHAR(100),
    category VARCHAR(50),
    price    DECIMAL(10,2)
);
CREATE TABLE orders (
    id         INT PRIMARY KEY,
    product_id INT,
    qty        INT,
    order_date DATE
);

-- スカラーサブクエリ: 平均価格との比較
SELECT name, price,
       (SELECT AVG(price) FROM products) AS avg_price,
       price - (SELECT AVG(price) FROM products) AS diff_from_avg
FROM products
ORDER BY price DESC;

-- テーブルサブクエリ（派生テーブル）: FROM句内
SELECT cat_summary.category, cat_summary.avg_price
FROM (
    SELECT category, AVG(price) AS avg_price, COUNT(*) AS cnt
    FROM   products
    GROUP BY category
) AS cat_summary
WHERE cat_summary.cnt >= 3
ORDER BY cat_summary.avg_price DESC;

-- WHERE句のサブクエリ: 平均価格以上の商品
SELECT name, price
FROM   products
WHERE  price >= (SELECT AVG(price) FROM products)
ORDER BY price DESC;

-- IN サブクエリ: 注文された商品のみ
SELECT name, price
FROM   products
WHERE  id IN (SELECT DISTINCT product_id FROM orders);

-- EXISTS 相関サブクエリ: 注文のある商品
SELECT p.name, p.price
FROM   products p
WHERE  EXISTS (
    SELECT 1
    FROM   orders o
    WHERE  o.product_id = p.id
);

-- NOT EXISTS: 一度も注文されていない商品
SELECT p.name
FROM   products p
WHERE  NOT EXISTS (
    SELECT 1 FROM orders o WHERE o.product_id = p.id
);

-- CTE（WITH句）: 段階的に処理を分解
WITH category_avg AS (
    SELECT category, AVG(price) AS avg_price
    FROM   products
    GROUP BY category
),
expensive_products AS (
    SELECT p.*, c.avg_price,
           p.price - c.avg_price AS diff
    FROM   products p
    JOIN   category_avg c ON p.category = c.category
    WHERE  p.price > c.avg_price
)
SELECT name, category, price, ROUND(diff::numeric, 2) AS above_avg
FROM   expensive_products
ORDER BY diff DESC;

-- 再帰CTE: 組織階層の展開
WITH RECURSIVE org_tree AS (
    -- 基底ケース: トップレベル社員
    SELECT id, name, manager_id, 1 AS depth, CAST(name AS TEXT) AS path
    FROM   employees
    WHERE  manager_id IS NULL

    UNION ALL

    -- 再帰ケース: 部下を追加
    SELECT e.id, e.name, e.manager_id, t.depth + 1,
           t.path || ' > ' || e.name
    FROM   employees e
    JOIN   org_tree t ON e.manager_id = t.id
)
SELECT depth, name, path
FROM   org_tree
ORDER BY path;
```

```python
import psycopg2

conn = psycopg2.connect(
    host="localhost", dbname="mydb", user="user", password="pass"
)
cur = conn.cursor()

# CTE を使った Python からのクエリ
cur.execute("""
    WITH monthly_sales AS (
        SELECT
            DATE_TRUNC('month', order_date) AS month,
            SUM(qty * p.price)              AS revenue
        FROM   orders o
        JOIN   products p ON o.product_id = p.id
        GROUP BY DATE_TRUNC('month', order_date)
    )
    SELECT month, revenue,
           SUM(revenue) OVER (ORDER BY month) AS cumulative
    FROM   monthly_sales
    ORDER BY month
""")

for row in cur.fetchall():
    print(f"月: {row[0].strftime('%Y-%m')}, 売上: {row[1]}, 累積: {row[2]}")

cur.close()
conn.close()
```

## 使用場面

- 集計結果（平均・最大値）と各行を比較するスカラーサブクエリ
- 複数ステップの変換処理をCTEで分割して可読性を高める場合
- 組織階層・カテゴリツリー・BOMなど再帰構造を展開する場合
- `EXISTS`/`NOT EXISTS` で関連レコードの存在確認を効率的に行う場合

## 参考文献

- [PostgreSQL Documentation - WITH Queries (Common Table Expressions)](https://www.postgresql.org/docs/current/queries-with.html)
- [PostgreSQL Documentation - Subqueries](https://www.postgresql.org/docs/current/functions-subquery.html)
- [MySQL Documentation - Subquery Syntax](https://dev.mysql.com/doc/refman/8.0/en/subqueries.html)

<AffiliateBanner site="db_navi" />
