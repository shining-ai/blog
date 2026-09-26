import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 結合（JOIN）

## 結合とは

> 結合（JOIN）とは、2つ以上のテーブルを指定した条件で組み合わせ、単一の結果セットとして返すSQL操作であり、リレーショナルモデルにおけるデータの正規化によって分割されたテーブルを連携させる基本的な手段である。

SQLの結合操作はリレーショナルデータベースの中核機能です。正規化によりデータを複数テーブルに分散させているRDBMSでは、関連するデータを組み合わせるために結合が不可欠です。結合の種類によって、一致しない行をどのように扱うかが異なります。

INNER JOINは最もよく使われる結合で、両方のテーブルで条件が一致する行のみを返します。LEFT JOINは左テーブルのすべての行を保持し、右テーブルに一致がない場合はNULLを返します。RIGHT JOINはその逆で、FULL OUTER JOINは両テーブルのすべての行を返します。CROSS JOINは条件なしで全行の直積（デカルト積）を生成します。

適切な結合の選択はクエリの正確性に直結します。必要なデータの取得漏れや不要な行の混入を防ぐため、結合の種類と条件を正しく理解することが重要です。

## 結合の種類比較

| 結合の種類 | 左テーブルの行 | 右テーブルの行 | NULL補完 |
|-----------|--------------|--------------|---------|
| `INNER JOIN` | 一致するもののみ | 一致するもののみ | なし |
| `LEFT JOIN` | すべて | 一致するもののみ | 右側をNULL |
| `RIGHT JOIN` | 一致するもののみ | すべて | 左側をNULL |
| `FULL OUTER JOIN` | すべて | すべて | 不一致側をNULL |
| `CROSS JOIN` | すべて | すべて（全組合せ） | なし |

```sql
-- サンプルテーブル
CREATE TABLE customers (
    id   INT PRIMARY KEY,
    name VARCHAR(100)
);
CREATE TABLE orders (
    id          INT PRIMARY KEY,
    customer_id INT,
    amount      DECIMAL(10,2)
);

INSERT INTO customers VALUES (1, 'Alice'), (2, 'Bob'), (3, 'Carol');
INSERT INTO orders VALUES (101, 1, 5000), (102, 1, 3000), (103, 2, 8000);
-- Carol(id=3) は注文なし

-- INNER JOIN: 注文がある顧客のみ
SELECT c.name, o.id AS order_id, o.amount
FROM   customers c
INNER JOIN orders o ON c.id = o.customer_id;
-- Alice: 2件, Bob: 1件, Carol: 表示されない

-- LEFT JOIN: 注文がない顧客もNULLで表示
SELECT c.name, o.id AS order_id, o.amount
FROM   customers c
LEFT JOIN orders o ON c.id = o.customer_id;
-- Carol の order_id, amount は NULL

-- LEFT JOIN で注文がない顧客のみ抽出（アンチジョイン）
SELECT c.name
FROM   customers c
LEFT  JOIN orders o ON c.id = o.customer_id
WHERE  o.id IS NULL;
-- Carol のみ表示

-- FULL OUTER JOIN: 両テーブルのすべての行
SELECT c.name, o.id AS order_id, o.amount
FROM   customers c
FULL OUTER JOIN orders o ON c.id = o.customer_id;

-- CROSS JOIN: すべての組合せ（デカルト積）
SELECT c.name, o.id
FROM   customers c
CROSS JOIN orders o;
-- 3顧客 × 3注文 = 9行

-- 複数テーブルの結合
CREATE TABLE order_items (
    id       INT PRIMARY KEY,
    order_id INT,
    product  VARCHAR(100),
    qty      INT
);

SELECT c.name, o.id AS order_id, o.amount, i.product, i.qty
FROM   customers c
INNER JOIN orders      o ON c.id = o.customer_id
INNER JOIN order_items i ON o.id = i.order_id
ORDER BY c.name, o.id;

-- 自己結合（同一テーブル内の階層構造）
CREATE TABLE employees (
    id        INT PRIMARY KEY,
    name      VARCHAR(100),
    manager_id INT  -- 自己参照外部キー
);

SELECT e.name AS employee, m.name AS manager
FROM   employees e
LEFT JOIN employees m ON e.manager_id = m.id;
```

```python
import psycopg2

conn = psycopg2.connect(
    host="localhost", dbname="mydb", user="user", password="pass"
)
cur = conn.cursor()

cur.execute("""
    SELECT c.name, COUNT(o.id) AS order_count, COALESCE(SUM(o.amount), 0) AS total
    FROM   customers c
    LEFT JOIN orders o ON c.id = o.customer_id
    GROUP BY c.id, c.name
    ORDER BY total DESC
""")

for row in cur.fetchall():
    print(f"顧客: {row[0]}, 注文数: {row[1]}, 合計: {row[2]}")

cur.close()
conn.close()
```

## 使用場面

- INNER JOIN：顧客と注文など、両テーブルに対応行が確実に存在する場合
- LEFT JOIN：マスタテーブルの全レコードを保持しつつ関連データを取得する場合
- FULL OUTER JOIN：2つのシステム間のデータ突合・差分検出
- 自己結合：組織階層・カテゴリツリーなど再帰的な構造の表現

## 参考文献

- [PostgreSQL Documentation - Joins Between Tables](https://www.postgresql.org/docs/current/tutorial-join.html)
- [MySQL Documentation - JOIN Clause](https://dev.mysql.com/doc/refman/8.0/en/join.html)
- C.J. Date, "SQL and Relational Theory", 3rd Edition

<AffiliateBanner site="db_navi" />
