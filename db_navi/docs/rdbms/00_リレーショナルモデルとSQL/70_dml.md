import AffiliateBanner from '@site/src/components/AffiliateBanner';

# DML（INSERT・UPDATE・DELETE）

## DML とは

> DML（Data Manipulation Language）とは、データベースのテーブル内のデータを挿入・更新・削除するためのSQLサブセットであり、`INSERT`・`UPDATE`・`DELETE`・`MERGE` などの命令で構成される。

DMLはアプリケーションが日常的にデータを操作するための命令群です。DDLがスキーマの構造を変更するのに対し、DMLはテーブル内のデータそのものを操作します。DMLはトランザクション内で実行され、`COMMIT` するまでは他のセッションから変更が見えず、`ROLLBACK` で取り消すことができます。

`INSERT` はテーブルに新しい行を追加します。`UPDATE` は既存の行の列値を変更し、`DELETE` は条件に一致する行を削除します。これらの操作は `WHERE` 句で対象行を絞り込むため、条件を誤ると意図しない行が変更・削除されるリスクがあります。本番環境での実行前には `SELECT` で対象行を確認することが重要です。

`UPSERT`（INSERT OR UPDATE）は、行が存在しなければ挿入し、存在すれば更新するという操作で、PostgreSQLでは `INSERT ... ON CONFLICT`、MySQLでは `INSERT ... ON DUPLICATE KEY UPDATE` で実現できます。

## DML コマンドの比較

| コマンド | 操作 | WHERE句 | トランザクション |
|---------|------|---------|---------------|
| `INSERT` | 行の追加 | 不要 | 対応 |
| `UPDATE` | 行の更新 | 推奨 | 対応 |
| `DELETE` | 行の削除 | 推奨 | 対応 |
| `MERGE` | 条件付き挿入/更新/削除 | 条件で制御 | 対応 |
| `TRUNCATE` | 全行削除（DDL扱い） | 不可 | DB依存 |

```sql
-- 1行INSERT
INSERT INTO users (username, email, age)
VALUES ('alice', 'alice@example.com', 30);

-- 複数行の一括INSERT
INSERT INTO users (username, email, age) VALUES
    ('bob',   'bob@example.com',   25),
    ('carol', 'carol@example.com', 35),
    ('dave',  'dave@example.com',  28);

-- SELECT結果からINSERT（テーブルのコピー）
INSERT INTO users_backup
SELECT * FROM users WHERE created_at < '2023-01-01';

-- RETURNING句（挿入した行を返す）
INSERT INTO users (username, email)
VALUES ('eve', 'eve@example.com')
RETURNING id, created_at;

-- UPSERT: 競合時に更新（PostgreSQL）
INSERT INTO user_stats (user_id, login_count, last_login)
VALUES (1, 1, NOW())
ON CONFLICT (user_id) DO UPDATE
    SET login_count = user_stats.login_count + 1,
        last_login  = EXCLUDED.last_login;

-- UPSERT: 競合時に何もしない
INSERT INTO user_preferences (user_id, theme)
VALUES (1, 'dark')
ON CONFLICT (user_id) DO NOTHING;

-- 基本的なUPDATE
UPDATE users
SET    status = 'inactive',
       updated_at = NOW()
WHERE  last_login < NOW() - INTERVAL '1 year';

-- JOINを使ったUPDATE（PostgreSQL）
UPDATE orders o
SET    status = 'completed'
FROM   payments p
WHERE  o.id = p.order_id
  AND  p.paid_at IS NOT NULL
  AND  o.status = 'pending';

-- サブクエリを使ったUPDATE
UPDATE products
SET    price = price * 1.1
WHERE  id IN (
    SELECT product_id
    FROM   order_items
    GROUP BY product_id
    HAVING SUM(qty) > 100
);

-- RETURNING句（更新した行を返す）
UPDATE users
SET    status = 'inactive'
WHERE  last_login < NOW() - INTERVAL '1 year'
RETURNING id, username;

-- 基本的なDELETE
DELETE FROM sessions
WHERE  expires_at < NOW();

-- JOINを使ったDELETE（PostgreSQL）
DELETE FROM order_items oi
USING  orders o
WHERE  oi.order_id = o.id
  AND  o.status = 'cancelled';

-- サブクエリを使ったDELETE
DELETE FROM users
WHERE  id NOT IN (
    SELECT DISTINCT user_id FROM orders
)
AND created_at < NOW() - INTERVAL '90 days';

-- 削除前に対象を確認する（重要！）
-- SELECT id, username FROM users WHERE last_login < NOW() - INTERVAL '1 year';
-- → 確認後に DELETE を実行

-- MERGE（SQL:2003標準、PostgreSQL 15+・Oracle等）
MERGE INTO target_table t
USING source_table s ON t.id = s.id
WHEN MATCHED THEN
    UPDATE SET t.value = s.value
WHEN NOT MATCHED THEN
    INSERT (id, value) VALUES (s.id, s.value)
WHEN NOT MATCHED BY SOURCE THEN
    DELETE;
```

```python
import psycopg2

conn = psycopg2.connect(
    host="localhost", dbname="mydb", user="user", password="pass"
)
cur = conn.cursor()

try:
    # バッチINSERT（executemany）
    new_users = [
        ('frank', 'frank@example.com', 22),
        ('grace', 'grace@example.com', 29),
    ]
    cur.executemany(
        "INSERT INTO users (username, email, age) VALUES (%s, %s, %s)",
        new_users
    )

    # UPDATE の影響行数を確認
    cur.execute("""
        UPDATE users SET status = 'inactive'
        WHERE last_login < NOW() - INTERVAL '1 year'
    """)
    print(f"Updated {cur.rowcount} rows")

    conn.commit()
except Exception as e:
    conn.rollback()
    raise e
finally:
    cur.close()
    conn.close()
```

## 使用場面

- ユーザー登録・注文処理・ログ記録など日常的なデータ挿入
- ステータス更新・価格変更など既存データの一括または個別更新
- 有効期限切れセッション・キャンセル済み仮予約などの定期的な削除
- UPSERT でウェブAPIのキャッシュテーブルや集計テーブルを更新する場合

## 参考文献

- [PostgreSQL Documentation - INSERT](https://www.postgresql.org/docs/current/sql-insert.html)
- [PostgreSQL Documentation - UPDATE](https://www.postgresql.org/docs/current/sql-update.html)
- [PostgreSQL Documentation - DELETE](https://www.postgresql.org/docs/current/sql-delete.html)

<AffiliateBanner site="db_navi" />
