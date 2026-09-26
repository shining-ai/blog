import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ディスク I/O とストレージエンジン

## ディスク I/O とストレージエンジンとは

> ストレージエンジンとは、データベース管理システムがデータをディスクやメモリに読み書きする方法を制御するコンポーネントであり、B+木・ハッシュ・LSMツリーなどのデータ構造を用いてI/Oを効率化する。

データベースのパフォーマンスはI/O（Input/Output）コストに大きく依存します。HDDのシーケンシャル読み込みは約100〜200MB/s、ランダムアクセスは毎秒数百回程度です。SSDはランダムアクセスが大幅に速くなりましたが、それでもメモリ（数GB/s）と比べると遅いため、DBMSはバッファプールを使ってデータをメモリにキャッシュします。

ページ（Page）はDBMSがディスクとの間でデータを読み書きする最小単位で、一般的に4KB〜16KBです。1ページには複数の行が格納されます。クエリで1行だけ取得する場合でも、その行が含まれるページ全体をバッファプールに読み込みます。バッファプールがいっぱいになると、LRU（Least Recently Used）などのアルゴリズムに従って古いページを退避させます。

MySQLはInnoDBとMyISAMなど複数のストレージエンジンをサポートし、PostgreSQLは独自のHeapベースエンジンを持ちます。MongoDBはWiredTiger、RocksDBはLSMツリーベースです。

## ストレージエンジンの比較

| エンジン | データ構造 | 特徴 | 使用DBMS |
|---------|-----------|------|---------|
| InnoDB | B+木 + クラスタリングインデックス | ACID対応・外部キー・行レベルロック | MySQL |
| MyISAM | B木 | 読み取り最適化・フルテキスト検索 | MySQL（レガシー） |
| PostgreSQL Heap | Heap + B+木 | MVCC・並行性・拡張性 | PostgreSQL |
| WiredTiger | B木 + LSM | 圧縮・MVCC | MongoDB |
| RocksDB | LSMツリー | 書き込み最適化・高圧縮率 | CockroachDB・TiDB |

```sql
-- ====================================
-- PostgreSQL のバッファキャッシュ確認
-- ====================================
-- pg_buffercache 拡張が必要
CREATE EXTENSION IF NOT EXISTS pg_buffercache;

-- バッファプールの使用状況
SELECT
    c.relname,
    COUNT(*) * 8 / 1024 AS buffered_mb,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM pg_buffercache), 2) AS pct
FROM pg_buffercache bc
JOIN pg_class c ON bc.relfilenode = pg_relation_filenode(c.oid)
WHERE bc.isdirty = false
GROUP BY c.relname
ORDER BY buffered_mb DESC
LIMIT 10;

-- ====================================
-- テーブルとインデックスのサイズ確認
-- ====================================
SELECT
    relname                                         AS table_name,
    pg_size_pretty(pg_total_relation_size(oid))     AS total_size,
    pg_size_pretty(pg_relation_size(oid))           AS table_size,
    pg_size_pretty(pg_indexes_size(oid))            AS indexes_size
FROM pg_class
WHERE relkind = 'r'
  AND relnamespace = 'public'::regnamespace
ORDER BY pg_total_relation_size(oid) DESC
LIMIT 10;

-- ====================================
-- テーブルのページ・行数・dead tuple確認
-- ====================================
SELECT
    relname,
    n_live_tup,
    n_dead_tup,
    n_mod_since_analyze,
    relpages,
    ROUND(n_dead_tup::numeric / NULLIF(n_live_tup, 0) * 100, 2) AS dead_pct
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;

-- VACUUMで不要タプルを回収
VACUUM ANALYZE users;
VACUUM FULL users;   -- テーブルを完全に再構築（ロックあり）

-- ====================================
-- ストレージパラメータの設定例
-- ====================================
-- テーブルの Fill Factor を下げて UPDATE の I/O を最適化
-- （更新が多いテーブルに有効）
ALTER TABLE orders SET (fillfactor = 70);

-- autovacuum の設定（テーブル単位でオーバーライド）
ALTER TABLE events SET (
    autovacuum_vacuum_scale_factor = 0.01,     -- 1%の行が更新されたらVACUUM
    autovacuum_analyze_scale_factor = 0.005    -- 0.5%の行が更新されたらANALYZE
);

-- ====================================
-- I/O 統計の確認
-- ====================================
SELECT
    relname,
    heap_blks_read,   -- ディスクから読み込んだページ数
    heap_blks_hit,    -- バッファプールから読み込んだページ数
    ROUND(
        100.0 * heap_blks_hit / NULLIF(heap_blks_read + heap_blks_hit, 0),
        2
    ) AS cache_hit_ratio
FROM pg_statio_user_tables
ORDER BY heap_blks_read DESC;

-- キャッシュヒット率の目安: 99%以上が理想
SELECT
    SUM(blks_hit) AS cache_hits,
    SUM(blks_read) AS disk_reads,
    ROUND(100.0 * SUM(blks_hit) / NULLIF(SUM(blks_hit) + SUM(blks_read), 0), 2)
        AS cache_hit_pct
FROM pg_stat_database
WHERE datname = current_database();
```

```python
import psycopg2

conn = psycopg2.connect(
    host="localhost", dbname="mydb", user="user", password="pass"
)
cur = conn.cursor()

# データベース全体のキャッシュヒット率を取得
cur.execute("""
    SELECT
        datname,
        blks_hit,
        blks_read,
        ROUND(100.0 * blks_hit / NULLIF(blks_hit + blks_read, 0), 2) AS hit_ratio
    FROM pg_stat_database
    WHERE datname = current_database()
""")
row = cur.fetchone()
if row:
    print(f"DB: {row[0]}")
    print(f"キャッシュヒット率: {row[3]}%")
    print(f"  キャッシュヒット: {row[1]}, ディスク読み込み: {row[2]}")

# テーブルのサイズ一覧
cur.execute("""
    SELECT relname,
           pg_size_pretty(pg_total_relation_size(oid)) AS total_size
    FROM pg_class
    WHERE relkind = 'r' AND relnamespace = 'public'::regnamespace
    ORDER BY pg_total_relation_size(oid) DESC
    LIMIT 10
""")
print("\nテーブルサイズ TOP 10:")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]}")

cur.close()
conn.close()
```

## 使用場面

- キャッシュヒット率が低い場合に `shared_buffers`（PostgreSQL）のチューニングを検討する場合
- テーブルサイズとインデックスサイズを把握してストレージ容量計画を立てる場合
- dead tupleが蓄積してテーブルが膨張している場合にVACUUMを手動実行する場合
- I/O統計からディスクアクセスのボトルネックを特定してインデックスを追加する場合

## 参考文献

- [PostgreSQL Documentation - Database File Layout](https://www.postgresql.org/docs/current/storage-file-layout.html)
- [MySQL Documentation - InnoDB Storage Engine](https://dev.mysql.com/doc/refman/8.0/en/innodb-storage-engine.html)
- Martin Kleppmann, "Designing Data-Intensive Applications", Chapter 3

<AffiliateBanner site="db_navi" />
