import AffiliateBanner from '@site/src/components/AffiliateBanner';

# インデックスが使われない原因と対策

## インデックスが使われない問題とは

> インデックスが使われない問題とは、インデックスを作成しているにもかかわらずクエリオプティマイザがSeq Scanを選択してしまう状態であり、関数の適用・型の不一致・ワイルドカード・低選択性などが主な原因となる。

インデックスを作成したのにクエリが遅いままという問題は実務でよく発生します。原因のほとんどはクエリの書き方にあります。WHERE句のカラムに関数を適用する（`WHERE UPPER(email) = ?`）、左端ワイルドカードを使う（`WHERE name LIKE '%田'`）、型が不一致（文字列カラムに数値を渡す）、選択性が低い（`WHERE status = 'active'` でactiveが99%を占める）場合、オプティマイザはインデックスの使用を諦めてSeq Scanを選択します。

オプティマイザが誤ってSeq Scanを選ぶケースもあります。例えば検索条件の選択性が低く見積もられている場合（統計情報が古い）や、テーブルが小さくSeq Scanの方が速いと判断される場合などです。後者は問題ではなく正しい判断です。

PostgreSQLの`pg_stat_user_indexes`でインデックスのスキャン回数を確認し、`idx_scan=0`のインデックスは不要な可能性があります。

## インデックスが使われない主な原因と対策

| 原因 | 悪い例 | 良い例 |
|------|--------|--------|
| カラムに関数を適用 | `WHERE YEAR(created_at) = 2024` | `WHERE created_at BETWEEN '2024-01-01' AND '2024-12-31'` |
| 左端ワイルドカード | `WHERE name LIKE '%田中'` | 全文検索インデックスを使用 |
| 型の不一致 | `WHERE id = '123'`（idがINT型） | `WHERE id = 123` |
| OR条件 | `WHERE a = 1 OR b = 2` | `UNION ALL` に書き換え |
| NULLの判定 | `WHERE col IS NOT NULL`（高率） | フィルタインデックス（部分インデックス） |
| 低選択性 | `WHERE status = 'active'`（99%がactive） | 部分インデックス・複合インデックス |
| 複合インデックスの順序違反 | `WHERE b = 1`（(a,b)インデックスで） | 先頭カラムaを含むクエリに変更 |

```sql
-- ====================================
-- 関数適用による インデックス無効化と対策
-- ====================================
-- NG: 関数を適用するとインデックスが使えない
EXPLAIN SELECT * FROM orders WHERE EXTRACT(YEAR FROM created_at) = 2024;

-- OK: 範囲条件に書き換える
EXPLAIN SELECT * FROM orders
WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01';

-- OK: 関数インデックス（PostgreSQL）
CREATE INDEX idx_orders_year ON orders (EXTRACT(YEAR FROM created_at));
SELECT * FROM orders WHERE EXTRACT(YEAR FROM created_at) = 2024;

-- ====================================
-- 型の不一致による インデックス無効化と対策
-- ====================================
-- NG: user_code が VARCHAR 型なのに数値を渡す
-- → MySQLでは暗黙の型変換が発生してインデックスが使われない
EXPLAIN SELECT * FROM users WHERE user_code = 12345;

-- OK: 文字列を渡す
EXPLAIN SELECT * FROM users WHERE user_code = '12345';

-- ====================================
-- 低選択性と部分インデックス
-- ====================================
-- NG: status カラムの 'pending' は全体の 1% しかない
-- → 通常インデックスでもよいが、より軽量な部分インデックスを使用
CREATE INDEX idx_orders_pending
    ON orders(created_at)
    WHERE status = 'pending';   -- 部分インデックス（PostgreSQL）

-- 部分インデックスを使うクエリ
EXPLAIN SELECT * FROM orders
WHERE status = 'pending'
  AND created_at > NOW() - INTERVAL '7 days';

-- ====================================
-- OR条件の書き換え
-- ====================================
-- NG: OR はインデックスが使われにくい
EXPLAIN SELECT * FROM users WHERE email = 'a@example.com' OR phone = '090-0000-0001';

-- OK: UNION ALL に書き換える
EXPLAIN
SELECT * FROM users WHERE email = 'a@example.com'
UNION ALL
SELECT * FROM users WHERE phone = '090-0000-0001'
  AND email <> 'a@example.com';

-- ====================================
-- インデックスの使用状況チェック
-- ====================================
-- 未使用インデックスの検出
SELECT
    s.relname      AS table_name,
    s.indexrelname AS index_name,
    s.idx_scan     AS scans,
    pg_size_pretty(pg_relation_size(s.indexrelid)) AS size
FROM pg_stat_user_indexes s
JOIN pg_index i ON s.indexrelid = i.indexrelid
WHERE s.idx_scan = 0
  AND NOT i.indisprimary
  AND NOT i.indisunique
ORDER BY pg_relation_size(s.indexrelid) DESC;
```

```python
import psycopg2

conn = psycopg2.connect(
    host="localhost", dbname="mydb", user="user", password="pass"
)
cur = conn.cursor()

def check_index_usage(table: str):
    """テーブルのインデックス使用状況を分析する"""
    cur.execute("""
        SELECT
            s.indexrelname                                              AS index_name,
            s.idx_scan                                                  AS scans,
            s.idx_tup_read                                              AS tuples_read,
            pg_size_pretty(pg_relation_size(s.indexrelid))              AS index_size,
            i.indisprimary                                              AS is_primary,
            i.indisunique                                               AS is_unique,
            pg_get_indexdef(i.indexrelid)                               AS index_def
        FROM pg_stat_user_indexes s
        JOIN pg_index i ON s.indexrelid = i.indexrelid
        WHERE s.relname = %s
        ORDER BY s.idx_scan DESC
    """, (table,))

    rows = cur.fetchall()
    print(f"=== {table} のインデックス使用状況 ===")
    print(f"{'インデックス名':<40} {'スキャン数':>10} {'サイズ':>10} {'備考'}")
    print("-" * 80)

    for row in rows:
        notes = []
        if row[4]:
            notes.append("PRIMARY")
        if row[5]:
            notes.append("UNIQUE")
        if row[2] == 0 and not row[4] and not row[5]:
            notes.append("★未使用（削除候補）")

        print(
            f"{row[0]:<40} {row[2]:>10,} {row[3]:>10} "
            f"{', '.join(notes)}"
        )

def find_slow_queries_without_index(min_duration_ms: float = 1000):
    """スロークエリログからインデックス未使用のクエリを検出する（pg_stat_statements使用）"""
    cur.execute("""
        SELECT
            query,
            calls,
            ROUND(mean_exec_time::numeric, 2) AS avg_ms,
            ROUND(total_exec_time::numeric, 2) AS total_ms,
            rows
        FROM pg_stat_statements
        WHERE mean_exec_time > %s
          AND query NOT LIKE '%%pg_%%'
        ORDER BY mean_exec_time DESC
        LIMIT 10
    """, (min_duration_ms,))

    rows = cur.fetchall()
    if not rows:
        print(f"平均実行時間 {min_duration_ms}ms 超のクエリはありません")
        return

    print(f"\n=== スロークエリ（平均 {min_duration_ms}ms 超）===")
    for row in rows:
        print(f"  平均: {row[2]}ms, 呼出: {row[1]:,}回, 合計: {row[3]}ms")
        print(f"  {row[0][:100]}...")
        print()

check_index_usage("orders")
find_slow_queries_without_index(500)

cur.close()
conn.close()
```

## 使用場面

- `EXPLAIN` でSeq Scanが発生しているクエリの原因を特定して修正する場合
- WHERE句の関数適用を範囲条件または関数インデックスに書き換える場合
- 部分インデックスで特定の条件のみを対象にした軽量なインデックスを作成する場合
- 未使用インデックスを定期的に検出・削除してINSERT/UPDATEのオーバーヘッドを削減する場合

## 参考文献

- [PostgreSQL Documentation - Partial Indexes](https://www.postgresql.org/docs/current/indexes-partial.html)
- [PostgreSQL Documentation - Indexes on Expressions](https://www.postgresql.org/docs/current/indexes-expressional.html)
- Use The Index, Luke - [Where the Index Is Not Used](https://use-the-index-luke.com/sql/where-clause/functions)

<AffiliateBanner site="db_navi" />
