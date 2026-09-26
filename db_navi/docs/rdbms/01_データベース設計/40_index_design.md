import AffiliateBanner from '@site/src/components/AffiliateBanner';

# インデックス設計の考え方

## インデックス設計とは

> インデックス設計とは、クエリパフォーマンスを最大化するために、どのカラムにどの種類のインデックスを作成するかを決定するプロセスであり、適切なインデックスは検索を大幅に高速化する一方、過剰なインデックスは書き込みパフォーマンスを低下させる。

インデックスは本の「索引」に相当し、データを高速に検索するためのデータ構造です。インデックスがなければDBMSは全行を順次スキャン（フルテーブルスキャン）しなければなりませんが、インデックスを使うことで対象行に直接アクセスできます。

インデックス設計の基本原則は「読み取りと書き込みのバランスを取る」ことです。インデックスを作成すると `SELECT` は速くなりますが、`INSERT`・`UPDATE`・`DELETE` 時にインデックスも更新する必要があるため書き込みコストが増加します。また、インデックスは追加のディスク領域を消費します。

適切なインデックス設計には、実際のクエリパターンの分析が不可欠です。`WHERE` 句・`JOIN` 条件・`ORDER BY` 句・`GROUP BY` 句で頻繁に使用されるカラムがインデックスの候補です。カーディナリティ（値の種類の数）が低いカラム（性別・フラグなど）へのインデックスは効果が低い場合があります。

## インデックス設計の指針

| 観点 | 推奨 | 非推奨・注意 |
|------|------|------------|
| WHERE句の対象 | 頻繁に絞り込む列 | 滅多に使わないフィルタ列 |
| カーディナリティ | 高い（ID・日時・メールアドレス） | 低い（性別・フラグ・ステータス） |
| 複合インデックス | 左端の列から順に条件に合う列 | 最左端をスキップした使い方 |
| 関数・演算 | インデックス式を使用 | 列に関数を適用（インデックス無効化） |
| インデックス数 | 必要最小限 | 過剰（書き込みコスト増） |

```sql
-- ====================================
-- 基本的なインデックス作成
-- ====================================
CREATE TABLE users (
    id         SERIAL       PRIMARY KEY,  -- 自動的にインデックス作成
    email      VARCHAR(255) UNIQUE,       -- UNIQUE制約でインデックス作成
    username   VARCHAR(50)  NOT NULL,
    status     VARCHAR(20)  NOT NULL DEFAULT 'active',
    age        INT,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 単一カラムインデックス
CREATE INDEX idx_users_username   ON users(username);
CREATE INDEX idx_users_created_at ON users(created_at DESC);  -- 降順

-- ====================================
-- カーディナリティと選択性
-- ====================================
-- 高カーディナリティ（インデックス効果大）: id, email, username
-- 低カーディナリティ（効果小）: status (active/inactive のみ)

-- 低カーディナリティでも部分インデックスで効果を出す
CREATE INDEX idx_inactive_users ON users(created_at)
WHERE status = 'inactive';  -- inactive のみ対象（少数なので効果大）

-- ====================================
-- 複合インデックス（複数カラム）
-- ====================================
CREATE INDEX idx_users_status_created ON users(status, created_at DESC);
-- 利用可能なクエリパターン:
--   WHERE status = 'active'
--   WHERE status = 'active' AND created_at > '2024-01-01'
--   ORDER BY status, created_at DESC
-- 利用不可のパターン:
--   WHERE created_at > '2024-01-01' のみ（左端の status をスキップ）

-- ====================================
-- インデックスが無効化されるパターン
-- ====================================
-- NG: カラムに関数を適用するとインデックス未使用
SELECT * FROM users WHERE UPPER(email) = 'ALICE@EXAMPLE.COM';  -- インデックス無効

-- OK: 式インデックスで対応
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
SELECT * FROM users WHERE LOWER(email) = 'alice@example.com';  -- OK

-- NG: LIKE の前方ワイルドカード
SELECT * FROM users WHERE username LIKE '%alice%';  -- インデックス未使用

-- OK: LIKE の後方一致（前方一致）
SELECT * FROM users WHERE username LIKE 'alice%';   -- インデックス使用可

-- NG: NULL 比較（IS NULL / IS NOT NULL は部分インデックスで対応）
CREATE INDEX idx_users_no_email ON users(id) WHERE email IS NULL;

-- ====================================
-- カバリングインデックス（INCLUDE）
-- ====================================
-- SELECT する列をインデックスに含める → テーブルアクセスを省略
CREATE INDEX idx_users_covering
    ON users(status, created_at DESC)
    INCLUDE (username, email);  -- PostgreSQL 11+

-- このクエリはインデックスのみで完結（Index Only Scan）
SELECT username, email, created_at
FROM   users
WHERE  status = 'active'
ORDER BY created_at DESC
LIMIT 50;

-- ====================================
-- インデックスの活用状況確認
-- ====================================
-- 使用されていないインデックスを確認（PostgreSQL）
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY schemaname, tablename;

-- テーブルのインデックスサイズ確認
SELECT
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) AS index_size
FROM pg_indexes
WHERE tablename = 'users';
```

```python
import psycopg2

conn = psycopg2.connect(
    host="localhost", dbname="mydb", user="user", password="pass"
)
cur = conn.cursor()

# 未使用インデックスの検出
cur.execute("""
    SELECT
        schemaname || '.' || tablename AS table,
        indexname,
        pg_size_pretty(pg_relation_size(indexname::regclass)) AS size,
        idx_scan AS scan_count
    FROM pg_stat_user_indexes
    WHERE idx_scan < 10
      AND indexname NOT LIKE 'pg_%'
    ORDER BY pg_relation_size(indexname::regclass) DESC
""")
rows = cur.fetchall()
print("使用頻度の低いインデックス候補:")
for row in rows:
    print(f"  テーブル: {row[0]}, インデックス: {row[1]}, "
          f"サイズ: {row[2]}, スキャン数: {row[3]}")

cur.close()
conn.close()
```

## 使用場面

- `WHERE` 句・`JOIN` 条件で頻繁に使用されるカラムへのインデックス作成
- `ORDER BY` や `GROUP BY` のソートコストを複合インデックスで削減する場合
- `INCLUDE` 句でカバリングインデックスを作成してIndex Only Scanを実現する場合
- 定期的に未使用インデックスを検出・削除してメンテナンスコストを削減する場合

## 参考文献

- [PostgreSQL Documentation - Indexes](https://www.postgresql.org/docs/current/indexes.html)
- [Use The Index, Luke! - SQL Indexing and Tuning](https://use-the-index-luke.com/)
- Markus Winand, "SQL Performance Explained"

<AffiliateBanner site="db_navi" />
