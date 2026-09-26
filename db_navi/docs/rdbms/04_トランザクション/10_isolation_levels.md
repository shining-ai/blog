import AffiliateBanner from '@site/src/components/AffiliateBanner';

# トランザクション分離レベル

## トランザクション分離レベルとは

> トランザクション分離レベルとは、並行して実行される複数のトランザクションが互いにどの程度の影響を与えるかを制御するACID特性の「独立性（Isolation）」の強さを定義する設定であり、READ UNCOMMITTED・READ COMMITTED・REPEATABLE READ・SERIALIZABLEの4段階がある。

分離レベルは性能と整合性のトレードオフです。分離が強いほどデータの一貫性は高まりますが、ロックやMVCCのコストが増えてスループットが下がります。4つの分離レベルはSQLの標準（SQL:1992）で定義されており、ダーティリード・ノンリピータブルリード・ファントムリードという3種類の問題をそれぞれ防止します。

**READ UNCOMMITTED**はコミット前のデータも読める（ダーティリード発生）。**READ COMMITTED**（PostgreSQLとMySQLのデフォルト）はコミット済みのデータのみ読む。**REPEATABLE READ**（MySQLのInnoDBのデフォルト）はトランザクション開始時点のスナップショットを一貫して読む。**SERIALIZABLE**は全てのトランザクションが直列に実行されたのと同等の結果を保証します。

PostgreSQLはREAD UNCOMMITTEDを指定してもREAD COMMITTEDとして動作します。PostgreSQLのSERIALIZABLEはSSI（Serializable Snapshot Isolation）によって実装されており、ロックではなく依存関係追跡でシリアライズを実現します。

## 分離レベルと発生しうる問題

| 分離レベル | ダーティリード | ノンリピータブルリード | ファントムリード |
|-----------|--------------|---------------------|--------------|
| READ UNCOMMITTED | 発生 | 発生 | 発生 |
| READ COMMITTED | 防止 | 発生 | 発生 |
| REPEATABLE READ | 防止 | 防止 | 発生（InnoDB は防止） |
| SERIALIZABLE | 防止 | 防止 | 防止 |

```sql
-- ====================================
-- 分離レベルの設定と確認
-- ====================================
-- PostgreSQL: セッションの分離レベルを設定
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
BEGIN;
-- ... 処理 ...
COMMIT;

-- PostgreSQL: セッションのデフォルトを変更
SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- 現在の分離レベルを確認
SHOW transaction_isolation;

-- MySQL: 分離レベルの設定
SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ;
SELECT @@transaction_isolation;

-- ====================================
-- ダーティリード（READ UNCOMMITTED のみ）
-- ====================================
-- セッション1: 未コミットの変更
BEGIN;
UPDATE accounts SET balance = 99999 WHERE id = 1;
-- コミットしていない

-- セッション2（READ UNCOMMITTED で接続）:
-- ダーティリード: コミット前のデータが見えてしまう
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
BEGIN;
SELECT balance FROM accounts WHERE id = 1;  -- 99999 が見えてしまう
COMMIT;

-- セッション1: ロールバック
ROLLBACK;   -- 99999 はなかったことに

-- ====================================
-- ノンリピータブルリード（READ COMMITTED での現象）
-- ====================================
-- セッション1（READ COMMITTED）:
BEGIN;
SELECT balance FROM accounts WHERE id = 1;  -- 1000

-- セッション2: コミット済みの変更
BEGIN;
UPDATE accounts SET balance = 2000 WHERE id = 1;
COMMIT;

-- セッション1: 同じクエリを再実行すると値が変わる
SELECT balance FROM accounts WHERE id = 1;  -- 2000 に変わる！
COMMIT;

-- ====================================
-- ファントムリード（REPEATABLE READ での現象）
-- ====================================
-- セッション1（REPEATABLE READ）:
BEGIN;
SELECT COUNT(*) FROM orders WHERE user_id = 1;  -- 5件

-- セッション2: 新しい行を挿入してコミット
BEGIN;
INSERT INTO orders(user_id, total_amount) VALUES (1, 5000);
COMMIT;

-- セッション1: 再実行すると行数が変わる（MySQL InnoDB は防止）
SELECT COUNT(*) FROM orders WHERE user_id = 1;  -- 6件（ファントムリード）
COMMIT;

-- ====================================
-- SERIALIZABLE での書き込みスキュー防止
-- ====================================
-- 例: 当直スケジュール（少なくとも1人は出勤する必要がある）
-- セッション1と2が同時に「休暇申請」した場合でも、
-- SERIALIZABLE では一方がロールバックされる
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT COUNT(*) FROM on_call WHERE on_call_date = '2024-06-01';  -- 2人
UPDATE on_call SET is_on_call = FALSE WHERE doctor_id = 1 AND on_call_date = '2024-06-01';
COMMIT;  -- もし同時実行の場合、書き込みスキューを検出してエラー
```

```python
import psycopg2
from psycopg2 import extensions

conn = psycopg2.connect(
    host="localhost", dbname="mydb", user="user", password="pass"
)
conn.autocommit = False

# 分離レベルの定数
ISOLATION_LEVELS = {
    "READ COMMITTED": extensions.ISOLATION_LEVEL_READ_COMMITTED,
    "REPEATABLE READ": extensions.ISOLATION_LEVEL_REPEATABLE_READ,
    "SERIALIZABLE": extensions.ISOLATION_LEVEL_SERIALIZABLE,
}

def run_with_isolation(level_name: str, func):
    """指定した分離レベルでトランザクションを実行する"""
    level = ISOLATION_LEVELS.get(level_name)
    if level is None:
        raise ValueError(f"不明な分離レベル: {level_name}")

    conn.set_isolation_level(level)
    cur = conn.cursor()
    try:
        result = func(cur)
        conn.commit()
        return result
    except Exception as e:
        conn.rollback()
        raise

def read_balance(cur, account_id: int) -> float:
    cur.execute("SELECT balance FROM accounts WHERE id = %s", (account_id,))
    row = cur.fetchone()
    return float(row[0]) if row else 0.0

# REPEATABLE READ での一貫したスナップショット読み取り
def repeatable_read_example(cur):
    balance1 = read_balance(cur, 1)
    # 他のトランザクションが変更・コミットした後でも...
    import time
    time.sleep(0.01)  # 他の処理の時間をシミュレート
    balance2 = read_balance(cur, 1)
    print(f"REPEATABLE READ: 1回目={balance1}, 2回目={balance2}")
    assert balance1 == balance2, "REPEATABLE READ で値が変わった！"
    return balance1

try:
    run_with_isolation("REPEATABLE READ", repeatable_read_example)
    print("REPEATABLE READ: 一貫したスナップショットが保証されました")
except AssertionError as e:
    print(f"エラー: {e}")
finally:
    conn.close()
```

## 使用場面

- 金融・在庫管理などデータ整合性が最重要な処理にSERIALIZABLEを設定する場合
- レポート生成クエリでトランザクション中に一貫したデータを読み続けるためREPEATABLE READを使う場合
- Webアプリケーションの一般的な読み書き処理でデフォルトのREAD COMMITTEDを使用する場合
- 書き込みスキューやファントムリードが問題になるロジックを検出する場合

## 参考文献

- [PostgreSQL Documentation - Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- [MySQL Documentation - InnoDB Transaction Isolation Levels](https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html)
- Martin Kleppmann, "Designing Data-Intensive Applications", Chapter 7

<AffiliateBanner site="db_navi" />
