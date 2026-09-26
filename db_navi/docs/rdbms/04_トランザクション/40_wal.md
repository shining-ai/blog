import AffiliateBanner from '@site/src/components/AffiliateBanner';

# WAL（Write-Ahead Logging）とリカバリ

## WALとは

> WAL（Write-Ahead Logging：先行書き込みログ）とは、データページをディスクに書き込む前に必ずログに変更内容を記録する技術であり、障害発生時のデータ復旧（リカバリ）とレプリケーションの基盤となる。

WALの原則は「データを変更する前にその変更内容をログに書き込む」ことです。システムがクラッシュしてバッファプール上の変更が失われても、WALログから変更を再適用（REDO）できるためデータの永続性が保証されます。これにより、データページをすぐにディスクに書き込まなくても安全で、ランダムI/Oの多いデータページ書き込みをバックグラウンドで行え、シーケンシャルI/Oのログ書き込みを先行させることでI/O効率が大幅に向上します。

PostgreSQLのWALログはPG_DATA/pg_wal/ディレクトリに16MBごとのセグメントファイルとして保存されます。`wal_level`の設定によりレプリケーションに必要な情報量を制御できます。`synchronous_commit=on`（デフォルト）はコミット時にWALのfsyncを保証し永続性を確保します。`off`にするとスループットが上がりますが最大数msのデータ損失リスクが生じます。

WALはPostgreSQLのストリーミングレプリケーション（ホットスタンバイ）・ポイントインタイムリカバリ（PITR）・論理レプリケーションの基盤にもなっています。

## WALとリカバリの主要概念

| 用語 | 説明 |
|------|------|
| LSN（Log Sequence Number） | WALの位置を示すシーケンシャルな番号 |
| チェックポイント | バッファ上のダーティページをディスクに書き込む処理 |
| REDO | チェックポイント以降のWALを再適用してデータを復旧 |
| UNDO | （PostgreSQLはMVCCを使うためUNDOログ不要） |
| WALセグメント | 16MBのWALファイル単位 |
| アーカイブ | PITRのためWALセグメントを保存しておく仕組み |
| PITR | 任意の時点に復旧するポイントインタイムリカバリ |

```sql
-- ====================================
-- WAL の設定確認（PostgreSQL）
-- ====================================
-- WAL レベルの確認（minimal < replica < logical）
SHOW wal_level;

-- 同期コミットの設定
SHOW synchronous_commit;
-- on: コミット時にWALのfsync保証（デフォルト、安全）
-- off: 最大数msのデータ損失リスクがあるが高スループット
-- local: ローカルのfsyncのみ（レプリカへの同期は不要な場合）

-- チェックポイントの設定
SHOW checkpoint_timeout;      -- デフォルト5分
SHOW max_wal_size;             -- デフォルト1GB（WALのソフト上限）

-- WALの現在位置（LSN）確認
SELECT pg_current_wal_lsn();
SELECT pg_walfile_name(pg_current_wal_lsn());

-- ====================================
-- WAL の使用状況確認
-- ====================================
-- WAL書き込み統計
SELECT
    pg_walfile_name(pg_current_wal_lsn())   AS current_wal_file,
    pg_current_wal_lsn()                    AS current_lsn,
    pg_current_wal_insert_lsn()             AS insert_lsn
;

-- データベース全体の WAL 統計
SELECT
    datname,
    wal_records,
    wal_bytes,
    wal_fpi        -- Full-Page Images（チェックポイント直後に多い）
FROM pg_stat_wal_receiver
UNION ALL
SELECT 'total', wal_records, wal_bytes, wal_fpi FROM pg_stat_wal;

-- ====================================
-- チェックポイントの確認
-- ====================================
-- pg_stat_bgwriter でチェックポイント統計を確認
SELECT
    checkpoints_timed,
    checkpoints_req,         -- max_wal_sizeを超えて強制チェックポイント
    checkpoint_write_time,
    checkpoint_sync_time,
    buffers_checkpoint,
    buffers_clean,
    buffers_backend
FROM pg_stat_bgwriter;

-- 強制チェックポイントを手動実行
CHECKPOINT;

-- ====================================
-- WAL アーカイブとPITRの設定（postgresql.conf）
-- ====================================
-- アーカイブモードの設定例（設定ファイルで行う）
-- wal_level = replica
-- archive_mode = on
-- archive_command = 'cp %p /archive/%f'

-- バックアップの開始と終了（pg_basebackup を使う場合が多い）
SELECT pg_start_backup('base_backup', true);
-- ファイルシステムレベルのバックアップを実行
SELECT pg_stop_backup();

-- ====================================
-- レプリケーションの状態確認
-- ====================================
-- プライマリでレプリカの状態を確認
SELECT
    client_addr,
    state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn,
    write_lag,
    flush_lag,
    replay_lag
FROM pg_stat_replication;
```

```python
import psycopg2

conn = psycopg2.connect(
    host="localhost", dbname="mydb", user="user", password="pass"
)
cur = conn.cursor()

def check_wal_health():
    """WALとチェックポイントの健全性を確認する"""

    # 現在のWAL設定を確認
    settings = ["wal_level", "synchronous_commit", "checkpoint_timeout",
                "max_wal_size", "archive_mode", "fsync"]
    cur.execute("""
        SELECT name, setting, unit
        FROM pg_settings
        WHERE name = ANY(%s)
        ORDER BY name
    """, (settings,))

    print("=== WAL 設定 ===")
    for row in cur.fetchall():
        unit = row[2] or ""
        print(f"  {row[0]:<30} = {row[1]} {unit}")

    # チェックポイント統計
    cur.execute("""
        SELECT
            checkpoints_timed,
            checkpoints_req,
            ROUND(checkpoint_write_time / 1000.0, 1) AS write_sec,
            ROUND(checkpoint_sync_time / 1000.0, 1)  AS sync_sec,
            buffers_checkpoint,
            buffers_clean,
            buffers_backend,
            buffers_alloc
        FROM pg_stat_bgwriter
    """)
    row = cur.fetchone()
    if row:
        print("\n=== チェックポイント統計 ===")
        print(f"  定期チェックポイント: {row[0]:,}回")
        print(f"  強制チェックポイント: {row[1]:,}回  ← 多い場合は max_wal_size の増加を検討")
        print(f"  書き込み時間: {row[2]}秒, 同期時間: {row[3]}秒")
        print(f"  バッファ（チェックポイント={row[4]:,}, bgwriter={row[5]:,}, backend={row[6]:,}）")
        if row[6] > row[4] * 0.1:
            print("  警告: バックエンドが直接バッファを書き込んでいます（bgwriter の調整を検討）")

    # WALの現在位置
    cur.execute("""
        SELECT
            pg_current_wal_lsn()                                AS current_lsn,
            pg_walfile_name(pg_current_wal_lsn())               AS wal_file,
            pg_size_pretty(pg_wal_lsn_diff(
                pg_current_wal_lsn(),
                '0/0'::pg_lsn
            ))                                                  AS total_wal_written
    """)
    row = cur.fetchone()
    if row:
        print(f"\n=== WAL 現在位置 ===")
        print(f"  LSN: {row[0]}")
        print(f"  現在のWALファイル: {row[1]}")

check_wal_health()

cur.close()
conn.close()
```

## 使用場面

- バッチ処理前後のチェックポイント実行でリカバリポイントを明示的に作成する場合
- `synchronous_commit=off` で非同期コミットを使用してバルクインサートを高速化する場合
- レプリカの `replay_lag` を監視してレプリケーション遅延を検出する場合
- 強制チェックポイントが多発している場合に `max_wal_size` や `checkpoint_timeout` を調整する場合

## 参考文献

- [PostgreSQL Documentation - Reliability and the Write-Ahead Log](https://www.postgresql.org/docs/current/wal.html)
- [PostgreSQL Documentation - Continuous Archiving and Point-in-Time Recovery](https://www.postgresql.org/docs/current/continuous-archiving.html)
- Martin Kleppmann, "Designing Data-Intensive Applications", Chapter 3

<AffiliateBanner site="db_navi" />
