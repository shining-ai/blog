import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 実行計画の読み方（EXPLAIN）

## EXPLAINとは

> EXPLAINとは、DBMSがSQL文をどのように実行するかの計画（実行計画）を表示するコマンドであり、シーケンシャルスキャン・インデックススキャン・結合アルゴリズムなどの情報からクエリのボトルネックを特定できる。

`EXPLAIN`はSQL文を実際には実行せずに実行計画のみを表示します。`EXPLAIN ANALYZE`を使うと実際に実行して計画と実測値の両方を確認できます。PostgreSQLでは`EXPLAIN (ANALYZE, BUFFERS)`を使うと、バッファキャッシュのヒット/ミス回数まで確認できます。

実行計画の読み方の基本は「下（内側）から上（外側）へ」です。各ノードには推定コスト（cost）・推定行数（rows）・実際の行数と時間（ANALYZEオプション時）が表示されます。`Seq Scan`は全行スキャン、`Index Scan`はインデックス経由のアクセス、`Index Only Scan`はテーブル本体にアクセスしないカバリングインデックスを意味します。

コスト値はディスクページ読み込みを基準単位とした相対値で、`(先頭コスト..終了コスト)`の形式で表示されます。推定行数と実際の行数に大きな乖離がある場合は統計情報の更新（ANALYZE）が必要です。

## EXPLAINの主要なノードタイプ

| ノードタイプ | 意味 | 対処方法 |
|------------|------|---------|
| Seq Scan | テーブル全件スキャン | インデックスを追加するか検討 |
| Index Scan | インデックス使用（テーブルアクセスあり） | 通常は良好 |
| Index Only Scan | カバリングインデックス（テーブルアクセスなし） | 最も効率的 |
| Bitmap Heap Scan | ビットマップでページをまとめて読む | 中程度の選択性 |
| Hash Join | ハッシュテーブルを使った等値結合 | 大テーブル同士 |
| Nested Loop | 外側テーブルの各行で内側をスキャン | 小テーブル・インデックスあり |
| Merge Join | ソート済みデータのマージ結合 | ソートコストに注意 |
| Sort | ソート処理（メモリ不足でディスクに溢れることも） | work_mem を増やす |

```sql
-- ====================================
-- 基本的な EXPLAIN の使い方（PostgreSQL）
-- ====================================
-- 実行計画のみ（実際には実行しない）
EXPLAIN
SELECT * FROM orders WHERE user_id = 1;

-- 実際に実行して計画と実測値を比較
EXPLAIN ANALYZE
SELECT * FROM orders WHERE user_id = 1;

-- バッファ情報も含めた詳細分析
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
SELECT
    o.id,
    u.name,
    SUM(oi.price * oi.quantity) AS total
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN order_items oi ON oi.order_id = o.id
WHERE o.created_at >= '2024-01-01'
GROUP BY o.id, u.name
ORDER BY total DESC
LIMIT 10;

-- JSON形式で出力（プログラムから解析しやすい）
EXPLAIN (ANALYZE, FORMAT JSON)
SELECT * FROM orders WHERE user_id = 1;

-- ====================================
-- コスト推定が大きく外れている場合
-- ====================================
-- 推定行数 vs 実際の行数を比較
-- rows=1 と表示されているのに実際は 10000 行だった場合
-- → ANALYZE でテーブルの統計情報を更新
ANALYZE orders;

-- 高選択性カラムのサンプリング精度を上げる
ALTER TABLE orders ALTER COLUMN status SET STATISTICS 300;
ANALYZE orders;

-- ====================================
-- Seq Scan を強制してインデックス効果を比較
-- ====================================
-- インデックスを使わないよう強制
SET enable_indexscan = OFF;
SET enable_bitmapscan = OFF;

EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 1;

-- 元に戻す
RESET enable_indexscan;
RESET enable_bitmapscan;

-- ====================================
-- MySQL の EXPLAIN
-- ====================================
-- MySQL の EXPLAIN（実行計画）
EXPLAIN SELECT o.id, u.name
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.status = 'shipped';
-- type: ALL（全件スキャン）、ref（インデックス使用）など

-- EXPLAIN ANALYZE（MySQL 8.0.18以降）
EXPLAIN ANALYZE
SELECT * FROM orders WHERE user_id = 1;

-- フォーマット指定
EXPLAIN FORMAT=JSON
SELECT * FROM orders WHERE user_id = 1;
```

```python
import psycopg2
import json

conn = psycopg2.connect(
    host="localhost", dbname="mydb", user="user", password="pass"
)
cur = conn.cursor()

def analyze_slow_query(sql: str, params=None, threshold_ms: float = 100.0):
    """
    クエリの実行計画を解析して問題点を検出する
    - Seq Scan の検出
    - 推定行数と実際の行数の乖離検出
    - ソートのディスク溢れ検出
    """
    cur.execute(
        f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {sql}",
        params
    )
    plan_data = cur.fetchone()[0][0]
    issues = []

    def check_node(node: dict):
        node_type = node.get("Node Type", "")
        est_rows = node.get("Plan Rows", 0)
        act_rows = node.get("Actual Rows", 0)
        actual_time = node.get("Actual Total Time", 0)

        # Seq Scan の検出
        if node_type == "Seq Scan":
            rel = node.get("Relation Name", "?")
            issues.append(
                f"Seq Scan on {rel}: {act_rows:,} rows "
                f"(インデックスの追加を検討)"
            )

        # 推定行数と実際の行数の大きな乖離
        if est_rows > 0 and act_rows > 0:
            ratio = max(est_rows, act_rows) / min(est_rows, act_rows)
            if ratio > 10:
                issues.append(
                    f"行数推定の乖離 ({node_type}): "
                    f"推定={est_rows:,}, 実際={act_rows:,} "
                    f"(ANALYZE の実行を検討)"
                )

        # Sort がディスクに溢れている
        if node_type == "Sort" and node.get("Sort Space Type") == "Disk":
            issues.append(
                f"Sort がディスクを使用: {node.get('Sort Space Used', 0)} kB "
                f"(work_mem の増加を検討)"
            )

        for child in node.get("Plans", []):
            check_node(child)

    check_node(plan_data["Plan"])

    exec_time = plan_data.get("Execution Time", 0)
    plan_time = plan_data.get("Planning Time", 0)
    print(f"計画時間: {plan_time:.2f}ms, 実行時間: {exec_time:.2f}ms")

    if exec_time > threshold_ms:
        print(f"警告: 実行時間が {threshold_ms}ms を超えています")

    if issues:
        print("検出された問題点:")
        for issue in issues:
            print(f"  - {issue}")
    else:
        print("問題なし")

# 実行例
analyze_slow_query("""
    SELECT o.id, u.name, o.total_amount
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE o.status = 'pending'
    ORDER BY o.created_at DESC
""")

cur.close()
conn.close()
```

## 使用場面

- スロークエリログに記録された遅いクエリの実行計画を確認する場合
- Seq Scanが発生しているテーブルにインデックス追加が有効か判断する場合
- 推定行数と実際の行数に乖離がある場合に統計情報の更新が必要か確認する場合
- ソートがメモリに収まっているか、work_memの調整が必要か判断する場合

## 参考文献

- [PostgreSQL Documentation - EXPLAIN](https://www.postgresql.org/docs/current/sql-explain.html)
- [MySQL Documentation - EXPLAIN Statement](https://dev.mysql.com/doc/refman/8.0/en/explain.html)
- Use The Index, Luke - [Execution Plans](https://use-the-index-luke.com/sql/explain-plan)

<AffiliateBanner site="db_navi" />
