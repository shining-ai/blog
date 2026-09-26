import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 統計情報とヒストグラム

## 統計情報とは

> 統計情報とは、DBMSがクエリオプティマイザの実行計画選択に使用する、テーブルの行数・カラムの値分布・NULL割合・インデックスの選択性などのメタデータであり、ANALYZEコマンドによって更新される。

クエリオプティマイザは実行計画のコストを見積もる際に統計情報を参照します。統計情報が古かったり不正確だったりすると、実際の行数と推定行数が大きく乖離してしまい、効率の悪い実行計画（不要なSeq Scanや非効率な結合順序）が選ばれてしまいます。

PostgreSQLは`pg_statistic`テーブル（直接参照用は`pg_stats`ビュー）に統計情報を保存します。`ANALYZE`コマンドを実行するとテーブルからランダムサンプリングを行い、各カラムのMCV（Most Common Values：最頻値）とヒストグラムを計算します。デフォルトのサンプリング率（default_statistics_target）は100で、値を大きくするほど精度が上がりますが、ANALYZE の時間とメモリが増えます。

MySQLは`INFORMATION_SCHEMA.STATISTICS`と`mysql.innodb_index_stats`に統計情報を持ちます。`ANALYZE TABLE`または`innodb_stats_auto_recalc`による自動更新が使えます。

## 統計情報の主要な要素

| 要素 | 説明 | 利用用途 |
|------|------|---------|
| n_distinct | ユニーク値の数（負の値は割合） | カーディナリティ推定 |
| most_common_vals | 最頻値のリスト | 等値条件の選択性推定 |
| most_common_freqs | 最頻値の出現頻度 | 等値条件のコスト計算 |
| histogram_bounds | ヒストグラムの区間境界値 | 範囲条件の選択性推定 |
| correlation | 物理的な格納順とカラム値の相関 | インデックスvsSeqScanの判断 |
| null_frac | NULL値の割合 | NULL条件のコスト計算 |

```sql
-- ====================================
-- PostgreSQL 統計情報の確認
-- ====================================
-- pg_stats ビューで統計情報を確認
SELECT
    attname           AS column_name,
    n_distinct,
    null_frac,
    avg_width,
    most_common_vals,
    most_common_freqs,
    histogram_bounds,
    correlation
FROM pg_stats
WHERE tablename = 'orders'
ORDER BY attname;

-- 特定カラムの詳細確認
SELECT
    most_common_vals,
    most_common_freqs
FROM pg_stats
WHERE tablename = 'orders'
  AND attname = 'status';

-- ====================================
-- 統計情報の更新
-- ====================================
-- 特定テーブルの統計情報を更新
ANALYZE orders;

-- 特定カラムのみ更新
ANALYZE orders(user_id, status, created_at);

-- 全テーブルの統計情報を更新（VACUUMと同時に）
VACUUM ANALYZE;

-- ====================================
-- サンプリング精度のチューニング
-- ====================================
-- デフォルトのサンプリング率（100）を確認
SHOW default_statistics_target;

-- セッションレベルで変更
SET default_statistics_target = 500;
ANALYZE orders;
RESET default_statistics_target;

-- カラムレベルでサンプリング率を設定（高選択性カラム向け）
ALTER TABLE orders ALTER COLUMN user_id SET STATISTICS 500;
ANALYZE orders;

-- ヒストグラムの詳細を確認（区間が増えているか確認）
SELECT
    histogram_bounds
FROM pg_stats
WHERE tablename = 'orders'
  AND attname = 'user_id';

-- ====================================
-- MySQL の統計情報管理
-- ====================================
-- テーブルの統計情報を更新
ANALYZE TABLE orders;

-- 統計情報の確認
SELECT
    TABLE_NAME,
    TABLE_ROWS,
    AVG_ROW_LENGTH,
    DATA_LENGTH,
    INDEX_LENGTH
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'mydb'
  AND TABLE_NAME = 'orders';

-- InnoDB インデックス統計
SELECT *
FROM mysql.innodb_index_stats
WHERE database_name = 'mydb'
  AND table_name = 'orders';

-- 永続統計の設定（再起動後も保持）
SET GLOBAL innodb_stats_persistent = ON;
SET GLOBAL innodb_stats_persistent_sample_pages = 20;  -- デフォルト20
```

```python
import psycopg2

conn = psycopg2.connect(
    host="localhost", dbname="mydb", user="user", password="pass"
)
cur = conn.cursor()

def check_statistics_freshness(table: str):
    """統計情報の新鮮さをチェックし、更新が必要かどうかを判定する"""

    # 最終ANALYZE日時と行数の変化量を確認
    cur.execute("""
        SELECT
            relname,
            n_live_tup                AS live_rows,
            n_dead_tup                AS dead_rows,
            n_mod_since_analyze       AS modified_since_analyze,
            last_analyze,
            last_autoanalyze,
            CASE
                WHEN n_live_tup = 0 THEN 0
                ELSE ROUND(100.0 * n_mod_since_analyze / n_live_tup, 1)
            END AS modified_pct
        FROM pg_stat_user_tables
        WHERE relname = %s
    """, (table,))
    row = cur.fetchone()

    if not row:
        print(f"テーブル '{table}' が見つかりません")
        return

    print(f"=== {row[0]} の統計情報 ===")
    print(f"  生存行数: {row[1]:,}")
    print(f"  Dead tuple: {row[2]:,}")
    print(f"  最終ANALYZE以降の変更行数: {row[3]:,} ({row[6]}%)")
    print(f"  最終手動ANALYZE: {row[4]}")
    print(f"  最終自動ANALYZE: {row[5]}")

    if row[6] and row[6] > 10:
        print(f"  警告: 変更率が{row[6]}%に達しています。ANALYZEを実行してください。")

def check_column_statistics(table: str):
    """各カラムの統計情報の品質を確認する"""
    cur.execute("""
        SELECT
            attname,
            n_distinct,
            null_frac,
            array_length(most_common_vals::text[], 1) AS mcv_count,
            array_length(histogram_bounds::text[], 1) AS hist_buckets,
            correlation
        FROM pg_stats
        WHERE tablename = %s
        ORDER BY attname
    """, (table,))

    print(f"\n=== {table} のカラム統計情報 ===")
    print(f"{'カラム':<25} {'distinct':>10} {'null%':>6} {'MCV数':>6} {'hist':>6} {'相関':>8}")
    print("-" * 65)
    for row in cur.fetchall():
        print(
            f"{row[0]:<25} {str(row[1]):>10} "
            f"{row[2] * 100:>5.1f}% "
            f"{str(row[3] or 0):>6} "
            f"{str(row[4] or 0):>6} "
            f"{str(row[5] or 'N/A'):>8}"
        )

check_statistics_freshness("orders")
check_column_statistics("orders")

cur.close()
conn.close()
```

## 使用場面

- 実行計画の推定行数と実際の行数が大きく乖離している場合にANALYZEを実行する場合
- 高カーディナリティのカラムの統計精度を上げるためSETATISTICSを調整する場合
- autovacuumによる自動ANALYZEが追いついていないテーブルを特定する場合
- 大量のデータ投入後に手動ANALYZEを実行してオプティマイザに正確な情報を渡す場合

## 参考文献

- [PostgreSQL Documentation - Statistics Used by the Planner](https://www.postgresql.org/docs/current/planner-stats.html)
- [MySQL Documentation - InnoDB Statistics Estimation](https://dev.mysql.com/doc/refman/8.0/en/innodb-statistics-estimation.html)
- [PostgreSQL Documentation - pg_stats](https://www.postgresql.org/docs/current/view-pg-stats.html)

<AffiliateBanner site="db_navi" />
