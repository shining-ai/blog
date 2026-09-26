import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ACID特性

## ACID特性とは

> ACID特性とは、データベーストランザクションの信頼性を保証する4つの性質（原子性・一貫性・独立性・永続性）の頭文字であり、障害が発生してもデータが正確で整合性のとれた状態を保つことを保証する。

トランザクションとは、一連のデータベース操作を「全て成功するか、全て失敗するか」として扱う処理単位です。例えば銀行振込において「口座Aから1万円を引く」と「口座Bに1万円を足す」の2操作は、どちらか一方だけ成功するような状態になってはいけません。ACIDはこの要件を形式化した概念です。

**原子性（Atomicity）**はトランザクション内の全操作が完全に反映されるか、全くされないかを保証します。**一貫性（Consistency）**は外部キー制約・チェック制約などのルールが常に満たされることを保証します。**独立性（Isolation）**は並行実行されるトランザクション間の干渉を制御します（分離レベルによって制御度合いが異なります）。**永続性（Durability）**はコミット済みのトランザクションがシステム障害後も失われないことを保証し、WAL（Write-Ahead Logging）によって実現されます。

NoSQLデータベースでは性能・スケールのためにACIDの一部を緩和する設計が多く、特に分散環境では「結果整合性」が採用されることがあります。

## ACID特性の詳細

| 特性 | 意味 | 実現手段 |
|------|------|---------|
| 原子性（Atomicity） | 全成功か全失敗か | ROLLBACK・UNDOログ |
| 一貫性（Consistency） | 整合性制約が常に満たされる | 制約チェック（FK・UNIQUE・CHECK） |
| 独立性（Isolation） | 並行トランザクションの干渉制御 | ロック・MVCC・分離レベル |
| 永続性（Durability） | コミット後の障害でもデータが保持される | WAL・fsync |

```sql
-- ====================================
-- 原子性（Atomicity）の例
-- ====================================
-- 銀行振込：2操作を1トランザクションで実行
BEGIN;

UPDATE accounts SET balance = balance - 10000 WHERE id = 1;  -- 送金元から引く
UPDATE accounts SET balance = balance + 10000 WHERE id = 2;  -- 送金先に足す

-- 中間状態を確認（まだコミットしていない）
SELECT id, balance FROM accounts WHERE id IN (1, 2);

COMMIT;   -- 両方の操作をまとめて確定

-- エラー時は ROLLBACK で全て巻き戻す
BEGIN;
UPDATE accounts SET balance = balance - 10000 WHERE id = 1;
-- ここでエラーが発生したとする
ROLLBACK;   -- 引き落とし操作も取り消される

-- ====================================
-- 一貫性（Consistency）：制約による保護
-- ====================================
-- 制約が整合性を保証する
CREATE TABLE accounts (
    id      BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    balance NUMERIC(15, 2) NOT NULL CHECK (balance >= 0),  -- 残高マイナス禁止
    UNIQUE (user_id)
);

-- CHECK制約違反はトランザクション全体をロールバックする
BEGIN;
UPDATE accounts SET balance = balance - 100000 WHERE id = 1;
-- balance が 0 未満になれば CHECK制約エラー → 自動ロールバック
COMMIT;

-- ====================================
-- 独立性（Isolation）：並行トランザクションの確認
-- ====================================
-- セッション1: トランザクション開始
BEGIN;
UPDATE accounts SET balance = balance - 500 WHERE id = 1;
-- まだコミットしていない

-- セッション2: 別のトランザクション
-- デフォルト（READ COMMITTED）ではセッション1の変更はまだ見えない
SELECT balance FROM accounts WHERE id = 1;

-- セッション1: コミット後はセッション2でも変更が見える
COMMIT;

-- ====================================
-- 永続性（Durability）：WALの確認
-- ====================================
-- WAL の設定確認（PostgreSQL）
SHOW wal_level;       -- replica, logical, minimal
SHOW synchronous_commit;  -- on（同期書き込み）が永続性を保証

-- WAL ファイルの確認
SELECT pg_walfile_name(pg_current_wal_lsn());

-- fsync 設定（永続性の要）
SHOW fsync;   -- on であること（off はデータ損失リスクあり）
```

```python
import psycopg2

conn = psycopg2.connect(
    host="localhost", dbname="mydb", user="user", password="pass"
)
conn.autocommit = False   # 自動コミットを無効化

cur = conn.cursor()

def transfer(from_id: int, to_id: int, amount: float):
    """
    口座間の資金移動。
    原子性：両方の UPDATE が成功したときだけ COMMIT、
    一方が失敗したら ROLLBACK する。
    """
    try:
        # 残高を確認（FOR UPDATE でロックを取得）
        cur.execute(
            "SELECT balance FROM accounts WHERE id = %s FOR UPDATE",
            (from_id,)
        )
        row = cur.fetchone()
        if row is None:
            raise ValueError(f"口座 {from_id} が存在しません")

        balance = float(row[0])
        if balance < amount:
            raise ValueError(f"残高不足: {balance} < {amount}")

        # 送金元から引く
        cur.execute(
            "UPDATE accounts SET balance = balance - %s WHERE id = %s",
            (amount, from_id)
        )

        # 送金先に足す
        cur.execute(
            "UPDATE accounts SET balance = balance + %s WHERE id = %s",
            (amount, to_id)
        )

        conn.commit()   # 両方成功したらコミット
        print(f"振込成功: {from_id} → {to_id}, 金額: {amount:,.0f}円")

    except Exception as e:
        conn.rollback()  # 原子性：どちらかが失敗したら全て取り消す
        print(f"振込失敗（ロールバック済み）: {e}")
        raise

# 実行例
try:
    transfer(from_id=1, to_id=2, amount=5000)
    transfer(from_id=1, to_id=2, amount=9_999_999)  # 残高不足
except Exception:
    pass

cur.close()
conn.close()
```

## 使用場面

- 複数テーブルへの更新を1つのトランザクションで管理して整合性を保つ場合
- エラー発生時にROLLBACKして中途半端な状態を防ぐ場合
- CHECK制約・外部キー制約によって一貫性を自動的に保護する場合
- WALとfsyncの設定を確認して永続性の要件を満たしているか確認する場合

## 参考文献

- [PostgreSQL Documentation - Transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [MySQL Documentation - InnoDB and the ACID Model](https://dev.mysql.com/doc/refman/8.0/en/mysql-acid.html)
- Martin Kleppmann, "Designing Data-Intensive Applications", Chapter 7

<AffiliateBanner site="db_navi" />
