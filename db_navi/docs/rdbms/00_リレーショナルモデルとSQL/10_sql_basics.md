import AffiliateBanner from '@site/src/components/AffiliateBanner';

# SQL 入門

## SQL とは

> SQL（Structured Query Language）とは、リレーショナルデータベースのデータを定義・操作・制御するための宣言的なドメイン固有言語であり、ISO/IEC 9075 として標準化されている。

SQLは1970年代にIBMが開発し、現在はほぼすべてのRDBMSで使用されています。「何を取得したいか」を宣言的に記述する言語であり、「どのようにデータを取得するか」はDBMSのオプティマイザが決定します。

SQLの基本操作は `SELECT`（検索）、`INSERT`（挿入）、`UPDATE`（更新）、`DELETE`（削除）の4つに分類されます。中でも `SELECT` 文は最も使用頻度が高く、`WHERE` 句による絞り込み、`ORDER BY` 句による並び替え、`LIMIT` 句による件数制限などを組み合わせて柔軟なデータ取得が可能です。

SQLはデータの取得だけでなく、テーブル定義（DDL）やトランザクション制御（TCL）なども含む包括的な言語です。標準SQLの仕様はISOで管理されており、SQL-92、SQL:1999、SQL:2003などのバージョンが存在します。各DBMSは標準SQLに加えて独自の拡張機能を提供しています。

## 主要な句と演算子

| 句・演算子 | 役割 | 例 |
|-----------|------|-----|
| `SELECT` | 取得する列を指定 | `SELECT id, name` |
| `FROM` | 対象テーブルを指定 | `FROM users` |
| `WHERE` | 行の絞り込み条件 | `WHERE age >= 20` |
| `ORDER BY` | 並び替え（ASC/DESC） | `ORDER BY name ASC` |
| `LIMIT` / `FETCH FIRST` | 取得件数の制限 | `LIMIT 10` |
| `DISTINCT` | 重複行の除去 | `SELECT DISTINCT dept_id` |
| `LIKE` | パターンマッチング | `WHERE name LIKE 'A%'` |
| `IN` | 値リストとの一致 | `WHERE id IN (1, 2, 3)` |
| `BETWEEN` | 範囲条件 | `WHERE age BETWEEN 20 AND 30` |
| `IS NULL` | NULL 値の判定 | `WHERE email IS NULL` |

```sql
-- サンプルテーブル
CREATE TABLE products (
    id         INT          PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    category   VARCHAR(50),
    price      DECIMAL(10,2),
    stock      INT          DEFAULT 0,
    created_at DATE
);

-- 基本的な SELECT
SELECT id, name, price
FROM   products
WHERE  price < 1000
ORDER BY price DESC;

-- LIKE によるパターンマッチング（前方一致）
SELECT * FROM products
WHERE  name LIKE 'iPhone%';

-- IN による複数値指定
SELECT * FROM products
WHERE  category IN ('Electronics', 'Clothing');

-- NULL チェック（NULL は = では比較できない）
SELECT * FROM products
WHERE  category IS NULL;

-- DISTINCT で重複排除
SELECT DISTINCT category
FROM   products
ORDER BY category;

-- LIMIT で上位10件取得
SELECT name, price
FROM   products
ORDER BY price DESC
LIMIT  10;

-- 複合条件（AND / OR / NOT）
SELECT name, price, stock
FROM   products
WHERE  (category = 'Electronics' OR category = 'Appliances')
  AND  price BETWEEN 500 AND 5000
  AND  stock > 0
ORDER BY price;
```

```python
import psycopg2

conn = psycopg2.connect(
    host="localhost", dbname="mydb", user="user", password="pass"
)
cur = conn.cursor()

# パラメータ化クエリ（SQLインジェクション対策）
category = "Electronics"
max_price = 1000.0

cur.execute("""
    SELECT id, name, price
    FROM   products
    WHERE  category = %s
      AND  price < %s
    ORDER BY price DESC
    LIMIT 20
""", (category, max_price))

rows = cur.fetchall()
for row in rows:
    print(f"id={row[0]}, name={row[1]}, price={row[2]}")

cur.close()
conn.close()
```

## 使用場面

- テーブルから条件に合う行を検索・取得する場合
- 複数の条件を組み合わせて複雑なフィルタリングを行う場合
- 結果を特定の列で昇順・降順に並び替えて表示する場合
- ページネーションのためにOFFSETとLIMITを組み合わせる場合

## 参考文献

- [PostgreSQL Documentation - Tutorial: SQL Language](https://www.postgresql.org/docs/current/tutorial-sql.html)
- [MySQL Documentation - SELECT Statement](https://dev.mysql.com/doc/refman/8.0/en/select.html)
- [SQL: ISO/IEC 9075 Standard](https://www.iso.org/standard/76584.html)

<AffiliateBanner site="db_navi" />
