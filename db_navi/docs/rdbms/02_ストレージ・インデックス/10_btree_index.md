import AffiliateBanner from '@site/src/components/AffiliateBanner';

# B木とB+木インデックス

## B木・B+木インデックスとは

> B+木（B-plus tree）とは、すべてのデータをリーフノードに保持し、リーフノード同士がリンクリストで連結された均衡木構造であり、範囲検索とソートに優れたデータベースのインデックスに広く使われるデータ構造である。

データベースのインデックスの大半はB+木で実装されています。B木とB+木の違いは、B木が内部ノードにもデータを保持するのに対し、B+木はリーフノードにのみデータを保持する点です。B+木はリーフノードがリンクリストでつながっているため、範囲スキャン（`BETWEEN`や`>=`など）を効率的に行えます。

B+木の各ノードはディスクのページ（4KB〜16KB）に対応しており、一つのノードに数百個のキーを格納できます。高さが3〜4段のツリーで数億件のデータを管理でき、検索はO(log n)で行えます。MySQLのInnoDB・PostgreSQL・Oracle・SQL Serverなどの主要なRDBMSで標準的なインデックス構造として採用されています。

InnoDBではプライマリキーインデックスはクラスタリングインデックスと呼ばれ、テーブルデータ自体がB+木のリーフノードに格納されます。セカンダリインデックスのリーフノードにはプライマリキーの値が格納され、レコード取得時にはプライマリキーで再検索（ダブルルックアップ）が発生します。

## B木とB+木の比較

| 項目 | B木 | B+木 |
|------|-----|------|
| データ格納場所 | 内部ノード＋リーフノード | リーフノードのみ |
| リーフノードのリンク | なし | 双方向リンクリスト |
| 範囲検索 | 非効率（ツリーを何度もトラバース） | 効率的（リーフをリンクでスキャン） |
| ポインタ数（内部ノード） | n個のキーにn+1個のポインタ | n個のキーにn+1個のポインタ |
| 主な用途 | ファイルシステム（ext4など） | RDBMSインデックス |
| 代表例 | B木ファイルシステム | InnoDB・PostgreSQL・Oracle |

```sql
-- ====================================
-- インデックスの作成と確認（PostgreSQL）
-- ====================================
-- デフォルト（B+木）インデックスの作成
CREATE INDEX idx_users_email ON users(email);

-- 複数カラムの複合インデックス（左端のカラムから順に使われる）
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at);

-- ユニークインデックス
CREATE UNIQUE INDEX idx_products_sku ON products(sku);

-- インデックスの一覧確認
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'users'
ORDER BY indexname;

-- インデックスのサイズ確認
SELECT
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE relname = 'users'
ORDER BY pg_relation_size(indexrelid) DESC;

-- ====================================
-- インデックスの使用状況確認
-- ====================================
SELECT
    relname        AS table_name,
    indexrelname   AS index_name,
    idx_scan       AS scans,
    idx_tup_read   AS tuples_read,
    idx_tup_fetch  AS tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- ====================================
-- MySQL でのインデックス確認
-- ====================================
-- インデックス一覧
SHOW INDEX FROM orders;

-- B+木の高さを確認（InnoDB）
SELECT
    NAME,
    PAGE_TYPE,
    N_RECS,
    INDEX_ID
FROM INFORMATION_SCHEMA.INNODB_BUFFER_PAGE
WHERE TABLE_NAME = '`mydb`.`orders`'
LIMIT 20;
```

```python
import psycopg2

conn = psycopg2.connect(
    host="localhost", dbname="mydb", user="user", password="pass"
)
cur = conn.cursor()

# インデックスのスキャン回数と効率を一覧表示
cur.execute("""
    SELECT
        s.relname          AS table_name,
        s.indexrelname     AS index_name,
        s.idx_scan         AS index_scans,
        s.idx_tup_read     AS tuples_read,
        pg_size_pretty(pg_relation_size(s.indexrelid)) AS index_size
    FROM pg_stat_user_indexes s
    JOIN pg_index i ON s.indexrelid = i.indexrelid
    WHERE s.idx_scan > 0
    ORDER BY s.idx_scan DESC
    LIMIT 20
""")
print("よく使われるインデックス:")
print(f"{'テーブル':<20} {'インデックス':<35} {'スキャン数':>10} {'読み取り行':>12} {'サイズ':>10}")
print("-" * 90)
for row in cur.fetchall():
    print(f"{row[0]:<20} {row[1]:<35} {row[2]:>10,} {row[3]:>12,} {row[4]:>10}")

# 一度も使われていないインデックスを検出（削除候補）
cur.execute("""
    SELECT
        s.relname          AS table_name,
        s.indexrelname     AS index_name,
        pg_size_pretty(pg_relation_size(s.indexrelid)) AS index_size
    FROM pg_stat_user_indexes s
    JOIN pg_index i ON s.indexrelid = i.indexrelid
    WHERE s.idx_scan = 0
      AND NOT i.indisprimary
      AND NOT i.indisunique
    ORDER BY pg_relation_size(s.indexrelid) DESC
""")
print("\n未使用インデックス（削除候補）:")
for row in cur.fetchall():
    print(f"  {row[0]}.{row[1]} ({row[2]})")

cur.close()
conn.close()
```

## 使用場面

- 主キー・外部キー・ユニーク制約など高選択性のカラムに作成してポイント検索を高速化する場合
- `ORDER BY` や `GROUP BY` で使用するカラムにインデックスを作成してソートコストを削減する場合
- 範囲検索（`BETWEEN`・`>=`・`<=`）が多いカラムにB+木インデックスを適用する場合
- 未使用インデックスを定期的に削除してINSERT/UPDATEのオーバーヘッドを削減する場合

## 参考文献

- [PostgreSQL Documentation - Indexes](https://www.postgresql.org/docs/current/indexes.html)
- [MySQL Documentation - InnoDB Clustered and Secondary Indexes](https://dev.mysql.com/doc/refman/8.0/en/innodb-index-types.html)
- Martin Kleppmann, "Designing Data-Intensive Applications", Chapter 3

<AffiliateBanner site="db_navi" />
