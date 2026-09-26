import AffiliateBanner from '@site/src/components/AffiliateBanner';

# MVCC（多版同時実行制御）

## MVCCとは

> MVCC（Multi-Version Concurrency Control：多版同時実行制御）とは、データの複数バージョンを保持することで読み取りと書き込みが互いをブロックしないようにする並行性制御技術であり、PostgreSQL・MySQL InnoDB・Oracle・SQL Serverなどの主要なRDBMSで採用されている。

MVCCの核心は「読み取りが書き込みをブロックせず、書き込みも読み取りをブロックしない」ことです。従来のロックベースの並行制御ではSELECT文もロックを取得する必要がありましたが、MVCCでは各トランザクションがデータの「スナップショット」を参照するため、長いレポートクエリが実行中でもINSERT/UPDATEは即座に進行できます。

PostgreSQLのMVCCは、行の各バージョンに`xmin`（作成したトランザクションID）と`xmax`（削除したトランザクションID）を付与することで実現されます。UPDATEは「古い行をxmaxで無効化 + 新しい行をxminで挿入」として実装されます。不要になった古いバージョン（Dead Tuple）はVACUUMプロセスが定期的に回収します。

MySQLのInnoDBは行データと分離されたUNDOログにバージョンを保持し、Read Viewという仕組みで各トランザクションが参照すべき行バージョンを決定します。

## PostgreSQL MVCCの仕組み

| 要素 | 説明 |
|------|------|
| xmin | 行を作成したトランザクションID |
| xmax | 行を削除・更新したトランザクションID（0は有効） |
| cmin/cmax | コマンドカウンタ（同一TX内の可視性制御） |
| Dead Tuple | 不要になった古いバージョンの行（VACUUMで回収） |
| VACUUM | Dead Tupleを回収してディスクスペースを再利用 |
| XID Wraparound | TX IDが32ビット整数のため約20億回で周回する問題 |

```sql
-- ====================================
-- MVCC の可視性を確認する（PostgreSQL）
-- ====================================
-- システムカラム xmin, xmax の確認
SELECT
    xmin,      -- 行を作成したトランザクションID
    xmax,      -- 行を削除したトランザクションID（0は有効な行）
    id,
    name,
    balance
FROM accounts
WHERE id = 1;

-- 現在のトランザクションID
SELECT txid_current();

-- ====================================
-- MVCC による読み取りの一貫性確認
-- ====================================
-- セッション1: 長時間のレポートクエリを開始
BEGIN;
SELECT pg_export_snapshot();  -- スナップショットIDをセッション2に渡す
-- この時点でのスナップショットを保持したまま長時間クエリ実行
SELECT COUNT(*), SUM(balance) FROM accounts;

-- セッション2: 同時に UPDATE をコミット
-- MVCC により、セッション1はセッション2の変更前のデータを読み続ける
BEGIN;
UPDATE accounts SET balance = balance + 1 WHERE id = 1;
COMMIT;

-- セッション1: 同じクエリを再実行しても同じ結果（REPEATABLE READ以上）
SELECT COUNT(*), SUM(balance) FROM accounts;
COMMIT;

-- ====================================
-- Dead Tupleの確認とVACUUM
-- ====================================
-- Dead Tupleの蓄積状況を確認
SELECT
    relname,
    n_live_tup     AS live_rows,
    n_dead_tup     AS dead_rows,
    ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 1) AS dead_pct,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;

-- 手動 VACUUM の実行
VACUUM accounts;          -- Dead Tupleを回収（テーブルのロックなし）
VACUUM ANALYZE accounts;  -- VACUUM + 統計情報の更新
VACUUM FULL accounts;     -- テーブルを完全再構築（AccessExclusiveLock！）

-- ====================================
-- XID Wraparound の確認
-- ====================================
-- 最も古いトランザクションXIDとの差分を確認
-- 約2億を超えたら要対処
SELECT
    relname,
    age(relfrozenxid)               AS xid_age,
    2000000000 - age(relfrozenxid)  AS remaining_xids
FROM pg_class
WHERE relkind = 'r'
  AND relnamespace = 'public'::regnamespace
ORDER BY age(relfrozenxid) DESC
LIMIT 10;

-- autovacuum_freeze_max_age（デフォルト200000000）を超える前に
-- VACUUM FREEZE を実行する
VACUUM FREEZE accounts;

-- ====================================
-- MVCC の設定チューニング
-- ====================================
SHOW autovacuum;                        -- on / off
SHOW autovacuum_vacuum_threshold;       -- デフォルト 50
SHOW autovacuum_vacuum_scale_factor;    -- デフォルト 0.2（20%）
SHOW autovacuum_analyze_threshold;
```

```python
import psycopg2

conn = psycopg2.connect(
    host="localhost", dbname="mydb", user="user", password="pass"
)
cur = conn.cursor()

def check_mvcc_health():
    """MVCC の健全性チェック（Dead Tuple蓄積・XID Wraparound）"""

    # Dead Tuple の確認
    cur.execute("""
        SELECT
            relname,
            n_live_tup,
            n_dead_tup,
            ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 1) AS dead_pct,
            last_autovacuum,
            n_mod_since_analyze
        FROM pg_stat_user_tables
        WHERE n_dead_tup > 0
        ORDER BY n_dead_tup DESC
        LIMIT 10
    """)
    rows = cur.fetchall()

    print("=== Dead Tuple 状況（多い順）===")
    if not rows:
        print("  Dead Tuple は検出されませんでした")
    for row in rows:
        status = "要VACUUM" if row[3] and row[3] > 20 else "問題なし"
        print(
            f"  {row[0]:<30} Dead: {row[2]:>8,} ({row[3]}%)  "
            f"最終AutoVacuum: {row[4]}  [{status}]"
        )

    # XID Wraparound の確認
    cur.execute("""
        SELECT
            relname,
            age(relfrozenxid)               AS xid_age,
            2000000000 - age(relfrozenxid)  AS remaining_xids
        FROM pg_class
        WHERE relkind = 'r'
          AND relnamespace = 'public'::regnamespace
        ORDER BY age(relfrozenxid) DESC
        LIMIT 5
    """)
    rows = cur.fetchall()

    print("\n=== XID Wraparound 状況 ===")
    for row in rows:
        danger = "危険" if row[2] < 500_000_000 else "正常"
        print(
            f"  {row[0]:<30} XID Age: {row[1]:>12,}  "
            f"残り: {row[2]:>12,}  [{danger}]"
        )

    # テーブルの膨張状況
    cur.execute("""
        SELECT
            relname,
            pg_size_pretty(pg_relation_size(oid))           AS table_size,
            pg_size_pretty(pg_total_relation_size(oid))     AS total_size
        FROM pg_class
        WHERE relkind = 'r'
          AND relnamespace = 'public'::regnamespace
        ORDER BY pg_relation_size(oid) DESC
        LIMIT 5
    """)
    rows = cur.fetchall()

    print("\n=== テーブルサイズ（大きい順）===")
    for row in rows:
        print(f"  {row[0]:<30} テーブル: {row[1]:>10}  合計: {row[2]:>10}")

check_mvcc_health()

cur.close()
conn.close()
```

## 使用場面

- 長時間のレポートクエリと同時にOLTPトランザクションを処理する設計をする場合
- Dead Tupleが蓄積してテーブルが膨張していないかを定期的に監視する場合
- VACUUM FREEZEが必要なXID Wraparound問題をモニタリングする場合
- autovacuumパラメータを本番データ量に合わせてチューニングする場合

## 参考文献

- [PostgreSQL Documentation - MVCC Introduction](https://www.postgresql.org/docs/current/mvcc-intro.html)
- [PostgreSQL Documentation - Vacuum](https://www.postgresql.org/docs/current/routine-vacuuming.html)
- Martin Kleppmann, "Designing Data-Intensive Applications", Chapter 7

<AffiliateBanner site="db_navi" />
