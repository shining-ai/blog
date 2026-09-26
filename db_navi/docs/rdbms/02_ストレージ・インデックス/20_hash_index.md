import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ハッシュインデックス

## ハッシュインデックスとは

> ハッシュインデックスとは、キーをハッシュ関数でバケットに変換してO(1)での等値検索を実現するインデックス構造であり、完全一致検索（`=`）には最速だが範囲検索には使用できない。

ハッシュインデックスはキーにハッシュ関数を適用し、得られたハッシュ値に対応するバケットにデータのポインタを格納します。等値検索においてはB+木のO(log n)を上回るO(1)の性能を発揮します。しかし、ハッシュ値は順序を保持しないため、`>`・`<`・`BETWEEN`などの範囲検索やソートには利用できません。

PostgreSQLのハッシュインデックスはバージョン10以降からWAL（Write-Ahead Logging）に完全対応し、クラッシュセーフになりました。MySQLのMemoryストレージエンジンはデフォルトでハッシュインデックスを使用します。InnoDBは「アダプティブハッシュインデックス」という仕組みを持ち、頻繁にアクセスされるB+木のリーフページをメモリ上でハッシュテーブルにキャッシュして自動的に高速化します。

ハッシュ衝突（異なるキーが同じバケットに割り当てられること）が起きても連鎖法（チェーン法）で対処しますが、衝突が多くなるとパフォーマンスが低下します。適切なバケット数の設定がパフォーマンスに影響します。

## ハッシュインデックスとB+木インデックスの比較

| 項目 | ハッシュインデックス | B+木インデックス |
|------|---------------------|----------------|
| 等値検索（`=`） | O(1) ★ 最速 | O(log n) |
| 範囲検索（`>`・`BETWEEN`） | 不可 | O(log n + k) |
| ソート（`ORDER BY`） | 不可 | 使用可能 |
| プレフィックス検索（`LIKE 'abc%'`） | 不可 | 使用可能 |
| ディスク使用量 | B+木より小さい傾向 | やや大きい |
| PostgreSQL対応 | バージョン10以降でクラッシュセーフ | 全バージョン |
| 主な用途 | セッション管理・キャッシュテーブル | 汎用 |

```sql
-- ====================================
-- PostgreSQL ハッシュインデックスの作成
-- ====================================
-- ハッシュインデックスの作成（等値検索専用）
CREATE INDEX idx_sessions_token_hash ON sessions USING hash(token);

-- B+木インデックスとの比較
CREATE INDEX idx_sessions_token_btree ON sessions(token);

-- インデックスの種類を確認
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'sessions';

-- ====================================
-- アダプティブハッシュインデックス（MySQL InnoDB）
-- ====================================
-- アダプティブハッシュインデックスの状態確認
SHOW ENGINE INNODB STATUS\G
-- 出力の "HASH INDEX SLOTS USED" 部分を確認

-- アダプティブハッシュインデックスの有効/無効化
-- （innodb_adaptive_hash_index は動的変更可能）
SET GLOBAL innodb_adaptive_hash_index = ON;
SET GLOBAL innodb_adaptive_hash_index = OFF;

-- 現在の設定確認
SELECT @@innodb_adaptive_hash_index;

-- ====================================
-- 実行計画でハッシュインデックスが使われているか確認
-- ====================================
-- PostgreSQL
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM sessions WHERE token = 'abc123xyz';

-- MySQL
EXPLAIN SELECT * FROM sessions WHERE token = 'abc123xyz';

-- ====================================
-- ハッシュインデックスが適切な場面の例
-- ====================================
-- セッションテーブル：完全一致検索のみ
CREATE TABLE sessions (
    id          BIGSERIAL PRIMARY KEY,
    token       VARCHAR(64) NOT NULL,
    user_id     BIGINT NOT NULL,
    expires_at  TIMESTAMP NOT NULL
);
CREATE INDEX idx_sessions_token ON sessions USING hash(token);

-- ハッシュインデックスでの検索（O(1)）
SELECT user_id, expires_at FROM sessions WHERE token = $1;

-- ハッシュインデックスが使えない例（範囲検索）
-- → B+木インデックスが必要
SELECT * FROM sessions WHERE expires_at < NOW();
```

```python
import psycopg2
import time

conn = psycopg2.connect(
    host="localhost", dbname="mydb", user="user", password="pass"
)
cur = conn.cursor()

# ハッシュインデックスとB+木インデックスの性能比較
test_token = "a1b2c3d4e5f6g7h8"

# ハッシュインデックスを使用した検索
start = time.perf_counter()
cur.execute(
    "SELECT user_id FROM sessions WHERE token = %s",
    (test_token,)
)
row = cur.fetchone()
hash_time = time.perf_counter() - start

print(f"ハッシュインデックス検索: {hash_time * 1000:.3f} ms")
print(f"結果: {row}")

# EXPLAIN ANALYZE で実行計画を確認
cur.execute(
    "EXPLAIN (ANALYZE, FORMAT JSON) SELECT user_id FROM sessions WHERE token = %s",
    (test_token,)
)
plan = cur.fetchone()[0][0]
node = plan["Plan"]
print(f"\n実行計画:")
print(f"  ノードタイプ: {node['Node Type']}")
print(f"  実行時間: {node.get('Actual Total Time', 'N/A')} ms")
print(f"  ループ数: {node.get('Actual Loops', 'N/A')}")

# インデックス情報の取得
cur.execute("""
    SELECT
        indexname,
        indexdef,
        pg_size_pretty(pg_relation_size(indexrelid)) AS size
    FROM pg_stat_user_indexes
    JOIN pg_indexes USING (schemaname, tablename, indexname)
    WHERE tablename = 'sessions'
""")
print("\nインデックス一覧:")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[2]}")
    print(f"    {row[1]}")

cur.close()
conn.close()
```

## 使用場面

- セッショントークン・APIキーなど完全一致検索しか行わないカラムに適用する場合
- ハッシュテーブルとして機能するキャッシュテーブルやルックアップテーブルを設計する場合
- InnoDBのアダプティブハッシュインデックスの効果を確認・チューニングする場合
- 等値検索のみでB+木より小さいインデックスサイズが必要な場合

## 参考文献

- [PostgreSQL Documentation - Hash Indexes](https://www.postgresql.org/docs/current/indexes-types.html#INDEXES-TYPES-HASH)
- [MySQL Documentation - Adaptive Hash Index](https://dev.mysql.com/doc/refman/8.0/en/innodb-adaptive-hash.html)
- Martin Kleppmann, "Designing Data-Intensive Applications", Chapter 3

<AffiliateBanner site="db_navi" />
