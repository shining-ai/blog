import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ロック（共有ロック・排他ロック・デッドロック）

## ロックとは

> ロックとは、並行トランザクションが同一データを同時に読み書きすることで発生する不整合を防ぐために、データへのアクセスを制御する排他制御メカニズムであり、共有ロック（読み取りロック）と排他ロック（書き込みロック）の2種類が基本となる。

共有ロック（Shared Lock / S Lock）は他のトランザクションの共有ロック取得を許可しますが、排他ロックは拒否します。つまり複数のトランザクションが同時に読み取ることはできますが、一方が読んでいる間は書き込めません。排他ロック（Exclusive Lock / X Lock）は他のすべてのロックを拒否し、一度に1つのトランザクションしかデータを変更できません。

デッドロック（Deadlock）はトランザクションAがリソース1をロックしてリソース2を待ち、同時にトランザクションBがリソース2をロックしてリソース1を待つという循環待ちで発生します。DBMSはデッドロックを検出すると、一方のトランザクションを強制ロールバックして解消します。デッドロックを防ぐには、全てのトランザクションで同じ順序でロックを取得することが最も効果的です。

PostgreSQLはロック待機グラフを定期的に検出し、`pg_stat_activity`・`pg_locks`ビューで現在のロック状況を確認できます。

## ロックの種類と互換性

| ロックタイプ | 別名 | 取得操作 | 他の共有ロックと共存 | 他の排他ロックと共存 |
|------------|------|---------|------------------|------------------|
| 共有ロック（S Lock） | 読み取りロック | SELECT ... FOR SHARE | 可 | 不可 |
| 排他ロック（X Lock） | 書き込みロック | SELECT ... FOR UPDATE | 不可 | 不可 |
| 更新ロック（U Lock） | 更新前ロック | （一部のDBMSのみ） | 可 | 不可 |
| テーブルロック | テーブル全体 | LOCK TABLE | SHARE のみ共存 | 不可 |

```sql
-- ====================================
-- 排他ロック（SELECT FOR UPDATE）
-- ====================================
-- 残高更新前にロックを取得してから変更する
BEGIN;

-- FOR UPDATE で行ロックを取得（他のトランザクションは待機）
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;

-- ロックを保持したまま更新
UPDATE accounts SET balance = balance - 1000 WHERE id = 1;

COMMIT;   -- コミット時にロック解放

-- ====================================
-- 共有ロック（SELECT FOR SHARE）
-- ====================================
-- 読み取りロック：他の読み取りは許可、書き込みは待機させる
BEGIN;
SELECT * FROM products WHERE id = 100 FOR SHARE;
-- 他のセッションの FOR SHARE は通るが FOR UPDATE は待機
COMMIT;

-- ====================================
-- NOWAIT と SKIP LOCKED
-- ====================================
-- ロック取得できなければすぐにエラー（待機しない）
BEGIN;
SELECT * FROM orders WHERE id = 1 FOR UPDATE NOWAIT;
-- エラー: could not obtain lock on row in relation "orders"

-- ロック済みの行をスキップ（ジョブキューの実装に便利）
BEGIN;
SELECT * FROM job_queue
WHERE status = 'pending'
ORDER BY created_at
LIMIT 10
FOR UPDATE SKIP LOCKED;
COMMIT;

-- ====================================
-- デッドロックの例と防止
-- ====================================
-- デッドロックが起きるケース
-- セッション1:
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;  -- id=1 をロック
-- id=2 を待つ
UPDATE accounts SET balance = balance + 100 WHERE id = 2;

-- セッション2（同時に実行）:
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 2;  -- id=2 をロック
-- id=1 を待つ → デッドロック！
UPDATE accounts SET balance = balance + 100 WHERE id = 1;

-- デッドロック防止: 常に小さい id から順にロックする
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = LEAST(1, 2);
UPDATE accounts SET balance = balance + 100 WHERE id = GREATEST(1, 2);

-- ====================================
-- ロック状況の確認（PostgreSQL）
-- ====================================
-- 現在のロック待機を確認
SELECT
    pid,
    wait_event_type,
    wait_event,
    state,
    query
FROM pg_stat_activity
WHERE wait_event_type = 'Lock';

-- 詳細なロック情報
SELECT
    l.pid,
    l.locktype,
    l.relation::regclass,
    l.mode,
    l.granted,
    a.query
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE NOT l.granted
ORDER BY l.pid;
```

```python
import psycopg2
import threading
import time

def simulate_deadlock():
    """デッドロックのシミュレーション"""

    def session1():
        conn = psycopg2.connect(
            host="localhost", dbname="mydb", user="user", password="pass"
        )
        conn.autocommit = False
        cur = conn.cursor()
        try:
            cur.execute("UPDATE accounts SET balance = balance - 100 WHERE id = 1")
            time.sleep(0.5)   # セッション2がロックを取る時間を与える
            cur.execute("UPDATE accounts SET balance = balance + 100 WHERE id = 2")
            conn.commit()
            print("セッション1: コミット成功")
        except psycopg2.errors.DeadlockDetected:
            conn.rollback()
            print("セッション1: デッドロック検出 → ロールバック")
        finally:
            conn.close()

    def session2():
        conn = psycopg2.connect(
            host="localhost", dbname="mydb", user="user", password="pass"
        )
        conn.autocommit = False
        cur = conn.cursor()
        try:
            time.sleep(0.1)   # セッション1が先にid=1をロックする時間
            cur.execute("UPDATE accounts SET balance = balance - 100 WHERE id = 2")
            time.sleep(0.5)
            cur.execute("UPDATE accounts SET balance = balance + 100 WHERE id = 1")
            conn.commit()
            print("セッション2: コミット成功")
        except psycopg2.errors.DeadlockDetected:
            conn.rollback()
            print("セッション2: デッドロック検出 → ロールバック")
        finally:
            conn.close()

    t1 = threading.Thread(target=session1)
    t2 = threading.Thread(target=session2)
    t1.start()
    t2.start()
    t1.join()
    t2.join()

def check_lock_waits():
    """現在のロック待機状況を確認する"""
    conn = psycopg2.connect(
        host="localhost", dbname="mydb", user="user", password="pass"
    )
    cur = conn.cursor()
    cur.execute("""
        SELECT
            blocking.pid          AS blocking_pid,
            blocking.query        AS blocking_query,
            blocked.pid           AS blocked_pid,
            blocked.query         AS blocked_query,
            blocked.wait_event    AS wait_event
        FROM pg_stat_activity blocked
        JOIN pg_stat_activity blocking
            ON blocking.pid = ANY(pg_blocking_pids(blocked.pid))
        WHERE blocked.wait_event_type = 'Lock'
    """)
    rows = cur.fetchall()
    if rows:
        print("現在のロック待機:")
        for row in rows:
            print(f"  ブロックPID={row[0]}: {row[1][:60]}")
            print(f"  待機PID={row[2]}: {row[3][:60]}")
    else:
        print("現在ロック待機はありません")
    conn.close()

check_lock_waits()
```

## 使用場面

- 在庫数の更新など「読んでから書く」操作で `SELECT FOR UPDATE` によるロック取得が必要な場合
- ジョブキューの実装で `SKIP LOCKED` を使って複数ワーカーが競合せず処理する場合
- デッドロックログを確認してロック取得順序を統一する対策を検討する場合
- `pg_locks` と `pg_stat_activity` で長時間ロック待機しているクエリを特定する場合

## 参考文献

- [PostgreSQL Documentation - Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- [MySQL Documentation - InnoDB Locking](https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html)
- Martin Kleppmann, "Designing Data-Intensive Applications", Chapter 7

<AffiliateBanner site="db_navi" />
