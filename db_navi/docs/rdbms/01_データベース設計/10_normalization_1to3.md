import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 第 1〜第 3 正規形

## 正規化とは

> 正規化（Normalization）とは、データの冗長性を排除し、更新異常（挿入異常・削除異常・更新異常）を防ぐために、リレーションを段階的に分解していく設計プロセスであり、第1〜第5正規形（1NF〜5NF）と BCNF が定義されている。

正規化の目的はデータの一貫性を保つことです。非正規化状態のテーブルでは、同じデータが複数箇所に重複して保存されるため、一方を更新して他方を更新し忘れると矛盾が生じます（更新異常）。また、まだ存在しないデータの情報を登録できない（挿入異常）、あるデータを削除すると関連情報まで消えてしまう（削除異常）という問題も発生します。

第1正規形（1NF）は列の値が原子的（分割できない単一の値）であることを要求します。第2正規形（2NF）は1NFに加えて非キー属性が主キー全体に関数従属することを要求します（部分関数従属の排除）。第3正規形（3NF）は2NFに加えて非キー属性が非キー属性に関数従属しないことを要求します（推移的関数従属の排除）。

## 各正規形の要件

| 正規形 | 要件 | 排除する問題 |
|--------|------|-------------|
| 非正規形（UNF） | 繰り返しグループ・複合値が含まれる | — |
| 第1正規形（1NF） | 全属性が原子値・繰り返しグループなし | 繰り返しグループ |
| 第2正規形（2NF） | 1NF + 非キー属性が主キー全体に完全関数従属 | 部分関数従属 |
| 第3正規形（3NF） | 2NF + 非キー属性間に推移的関数従属がない | 推移的関数従属 |

```sql
-- ====================================
-- 非正規形の例（問題あり）
-- ====================================
-- 注文テーブルに商品情報が直接含まれ、繰り返しグループがある
-- order_id | customer | product1 | qty1 | product2 | qty2 | ...
-- 問題: 商品数が増えると列が増える・NULLだらけになる

-- ====================================
-- 第1正規形 (1NF): 原子値のみ
-- ====================================
-- 繰り返しグループを行に分解する
CREATE TABLE orders_1nf (
    order_id   INT,
    customer   VARCHAR(100),
    product_id INT,
    product_name VARCHAR(100),
    qty        INT,
    unit_price DECIMAL(10,2),
    -- 複合主キー
    PRIMARY KEY (order_id, product_id)
);

-- しかし、以下の問題が残る（2NFにしていない）:
-- - customer は order_id のみに依存（product_id には不要）
-- - product_name・unit_price は product_id のみに依存

-- ====================================
-- 第2正規形 (2NF): 部分関数従属を排除
-- ====================================
-- 主キー（order_id, product_id）の部分 order_id にのみ依存する列を分離

CREATE TABLE orders_2nf (
    order_id    INT          PRIMARY KEY,
    customer_id INT          NOT NULL,   -- 外部キーに変更
    order_date  DATE
);

CREATE TABLE customers_2nf (
    id   INT         PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE order_items_2nf (
    order_id   INT REFERENCES orders_2nf(order_id),
    product_id INT,
    qty        INT,
    PRIMARY KEY (order_id, product_id)
);

CREATE TABLE products_2nf (
    id         INT          PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL
);

-- しかし 2NF でも推移的従属が残ることがある:
-- 例: orders に zip_code と city が含まれている場合
-- order_id → zip_code → city（city が zip_code を経由して order_id に従属）

-- ====================================
-- 第3正規形 (3NF): 推移的関数従属を排除
-- ====================================
-- zip_code → city の推移的従属を別テーブルに分離

CREATE TABLE zip_codes (
    zip_code VARCHAR(10) PRIMARY KEY,
    city     VARCHAR(100) NOT NULL,
    state    VARCHAR(50)
);

CREATE TABLE orders_3nf (
    id          SERIAL      PRIMARY KEY,
    customer_id INT         NOT NULL REFERENCES customers_2nf(id),
    order_date  DATE        NOT NULL DEFAULT CURRENT_DATE,
    zip_code    VARCHAR(10) REFERENCES zip_codes(zip_code)
    -- city は zip_codes テーブルから取得するため不要
);

-- 3NF 後の正しいテーブル群のクエリ
SELECT
    o.id         AS order_id,
    c.name       AS customer,
    p.name       AS product,
    i.qty,
    p.unit_price,
    i.qty * p.unit_price AS subtotal,
    z.city
FROM orders_3nf     o
JOIN customers_2nf  c ON o.customer_id = c.id
JOIN order_items_2nf i ON o.id = i.order_id
JOIN products_2nf   p ON i.product_id = p.id
LEFT JOIN zip_codes  z ON o.zip_code = z.zip_code;

-- ====================================
-- 更新異常の例（正規化の必要性）
-- ====================================
-- 非正規化テーブルで商品名を変更する場合:
-- 全注文明細の product_name を UPDATE しなければならない → 更新異常
-- 3NF では products テーブルの1行を変更するだけで済む
UPDATE products_2nf SET name = 'New Product Name' WHERE id = 42;
```

```python
# 正規化確認ユーティリティ
import psycopg2

def check_partial_dependency(conn, table, pk_cols, non_pk_col):
    """部分関数従属の存在を確認するヘルパー"""
    cur = conn.cursor()
    for pk in pk_cols:
        # 各主キー列だけでグループ化したときに non_pk_col が一意かを確認
        cur.execute(f"""
            SELECT COUNT(DISTINCT {non_pk_col}) as distinct_vals,
                   COUNT(*) as total_rows
            FROM (
                SELECT {pk}, {non_pk_col}
                FROM {table}
                GROUP BY {pk}, {non_pk_col}
            ) sub
            GROUP BY {pk}
            HAVING COUNT(DISTINCT {non_pk_col}) > 1
            LIMIT 5
        """)
        rows = cur.fetchall()
        if rows:
            print(f"  警告: {non_pk_col} は {pk} に部分関数従属している可能性あり")
    cur.close()
```

## 使用場面

- 新規システムのテーブル設計で更新異常・冗長性を防ぐ場合
- 既存の非正規化テーブルをリファクタリングして保守性を高める場合
- データ品質の問題（同じ商品名が複数の表記で存在する）を解消する場合
- マスタデータの一元管理により情報の一貫性を確保する場合

## 参考文献

- E.F. Codd, "Further Normalization of the Data Base Relational Model", 1972
- [Wikipedia - Database Normalization](https://en.wikipedia.org/wiki/Database_normalization)
- Ramakrishnan & Gehrke, "Database Management Systems", Chapter 19

<AffiliateBanner site="db_navi" />
