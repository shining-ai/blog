import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 複合インデックスとカバリングインデックス

## 複合インデックス・カバリングインデックスとは

> 複合インデックスとは複数カラムをキーとするインデックスであり、カバリングインデックスとはクエリで必要な全カラムをインデックスに含め、テーブル本体へのアクセスを不要にするインデックス最適化手法である。

複合インデックス（Composite Index）は複数カラムを組み合わせてインデックスキーを構成します。`(user_id, created_at)` という複合インデックスがあれば、`WHERE user_id = 1 ORDER BY created_at` のようなクエリを効率的に処理できます。重要な原則は「左端プレフィックス（leftmost prefix）」で、インデックスの先頭カラムから順に使われる場合のみインデックスが有効です。

カバリングインデックス（Covering Index）は、クエリのSELECT・WHERE・ORDER BY・GROUP BYで使用される全カラムをインデックスに含めることで、テーブルへのアクセス（ヒープフェッチ）を完全に排除します。PostgreSQLでは`INCLUDE`句を使って非検索カラムをインデックスに追加できます。MySQLのInnoDBではセカンダリインデックスのリーフにプライマリキーが自動的に含まれるため、プライマリキーを含むクエリはカバリングインデックスになりやすいです。

カバリングインデックスを適用すると、EXPLAINで `Index Only Scan`（PostgreSQL）や `Using index`（MySQL）が表示され、ディスクI/Oを大幅に削減できます。

## 複合インデックスの設計指針

| 項目 | 内容 |
|------|------|
| 左端プレフィックスルール | `(A, B, C)` のインデックスはA、A+B、A+B+Cの順で使える |
| 高選択性カラムを先頭に | カーディナリティの高いカラムを先頭に置く |
| 等値条件を範囲条件より先に | `=` のカラムを `>/<` のカラムより先に置く |
| INCLUDE句（PostgreSQL） | 検索に使わないが取得するカラムをインデックスに追加 |
| カバリングインデックスの確認 | EXPLAIN で `Index Only Scan` または `Using index` |
| インデックスの維持コスト | INSERT/UPDATEのたびにインデックスも更新される |

```sql
-- ====================================
-- 複合インデックスの例
-- ====================================
-- 注文テーブル：ユーザーIDと作成日時の複合インデックス
CREATE INDEX idx_orders_user_created
    ON orders(user_id, created_at DESC);

-- 左端プレフィックスルールの確認
-- ○ user_id のみ（先頭カラム）
EXPLAIN SELECT * FROM orders WHERE user_id = 1;

-- ○ user_id + created_at（左端から連続）
EXPLAIN SELECT * FROM orders WHERE user_id = 1 AND created_at >= '2024-01-01';

-- ✕ created_at のみ（先頭カラムをスキップ）→ インデックス不使用
EXPLAIN SELECT * FROM orders WHERE created_at >= '2024-01-01';

-- ====================================
-- カバリングインデックス（PostgreSQL INCLUDE句）
-- ====================================
-- email で検索して name, status を取得するクエリ向け
CREATE INDEX idx_users_email_covering
    ON users(email)
    INCLUDE (name, status);

-- → Index Only Scan になる（テーブルアクセス不要）
EXPLAIN (ANALYZE, BUFFERS)
SELECT name, status FROM users WHERE email = 'alice@example.com';

-- ====================================
-- MySQL のカバリングインデックス確認
-- ====================================
-- MySQL での複合インデックス作成
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at);

-- EXPLAIN で Using index が表示されることを確認
EXPLAIN
SELECT user_id, created_at, status
FROM orders
WHERE user_id = 1
  AND created_at >= '2024-01-01';
-- Extra: Using index → カバリングインデックスが効いている

-- ====================================
-- インデックス設計の良い例と悪い例
-- ====================================
-- 悪い例：選択性の低いカラム（status）を先頭に置く
-- → ほとんどのレコードをスキャンしてしまう
CREATE INDEX idx_bad ON orders(status, user_id, created_at);

-- 良い例：高選択性（user_id）を先頭に、等値条件を範囲条件より先に
CREATE INDEX idx_good ON orders(user_id, status, created_at);

-- ====================================
-- 冗長なインデックスの検出（PostgreSQL）
-- ====================================
-- (A) と (A, B) のような冗長なインデックスを検出
SELECT
    a.indexname AS idx1,
    b.indexname AS idx2,
    a.indexdef,
    b.indexdef
FROM pg_indexes a
JOIN pg_indexes b ON a.tablename = b.tablename
    AND a.indexname <> b.indexname
    AND b.indexdef LIKE a.indexdef || '%'
WHERE a.tablename = 'orders';
```

```python
import psycopg2

conn = psycopg2.connect(
    host="localhost", dbname="mydb", user="user", password="pass"
)
cur = conn.cursor()

# カバリングインデックスの効果を確認（EXPLAIN ANALYZE）
queries = [
    # カバリングインデックスあり
    ("SELECT name, status FROM users WHERE email = %s", ("alice@example.com",)),
    # カバリングインデックスなし（インデックスにないカラムを追加）
    ("SELECT name, status, bio FROM users WHERE email = %s", ("alice@example.com",)),
]

for sql, params in queries:
    cur.execute(f"EXPLAIN (ANALYZE, FORMAT JSON) {sql}", params)
    plan = cur.fetchone()[0][0]
    node = plan["Plan"]

    print(f"クエリ: {sql[:60]}...")
    print(f"  ノードタイプ: {node['Node Type']}")
    print(f"  実際の実行時間: {node.get('Actual Total Time', 'N/A')} ms")

    # Index Only Scan か確認
    is_index_only = "Index Only Scan" in node["Node Type"]
    print(f"  カバリングインデックス有効: {'Yes' % is_index_only if is_index_only else 'No'}")
    print()

# 複合インデックスの使用状況を確認
cur.execute("""
    SELECT
        s.relname          AS table_name,
        s.indexrelname     AS index_name,
        s.idx_scan         AS scans,
        s.idx_tup_read     AS rows_read,
        pg_size_pretty(pg_relation_size(s.indexrelid)) AS size
    FROM pg_stat_user_indexes s
    WHERE s.relname = 'orders'
    ORDER BY s.idx_scan DESC
""")
print("ordersテーブルのインデックス使用状況:")
for row in cur.fetchall():
    print(f"  {row[1]}: {row[2]:,}回スキャン, {row[3]:,}行読み取り, サイズ={row[4]}")

cur.close()
conn.close()
```

## 使用場面

- `WHERE user_id = ? AND created_at >= ?` のような複合条件クエリを高速化する場合
- SELECT・WHERE の全カラムをインデックスに含めてIndex Only Scanを実現する場合
- 等値条件カラムを先頭に、範囲条件カラムを後に置いて複合インデックスを設計する場合
- 冗長なインデックスを検出・削除してINSERT/UPDATEのオーバーヘッドを削減する場合

## 参考文献

- [PostgreSQL Documentation - Multicolumn Indexes](https://www.postgresql.org/docs/current/indexes-multicolumn.html)
- [MySQL Documentation - Multiple-Column Indexes](https://dev.mysql.com/doc/refman/8.0/en/multiple-column-indexes.html)
- Use The Index, Luke - [Concatenated Indexes](https://use-the-index-luke.com/sql/where-clause/the-equals-operator/concatenated-keys)

<AffiliateBanner site="db_navi" />
