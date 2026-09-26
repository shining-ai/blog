import AffiliateBanner from '@site/src/components/AffiliateBanner';

# クエリオプティマイザの仕組み

## クエリオプティマイザとは

> クエリオプティマイザとは、SQL文を解析してコストベースの評価により最も効率的な実行計画を選択するDBMSのコンポーネントであり、結合順序・インデックス選択・結合アルゴリズムなどを自動的に決定する。

クエリオプティマイザはSQL文を受け取ると、構文解析・意味解析・論理最適化・物理最適化の順に処理を行います。論理最適化では述語プッシュダウン（WHERE条件を早い段階で適用して行数を絞る）・射影プッシュダウン・サブクエリの平坦化などを行います。物理最適化では統計情報（テーブルの行数・カラムの値分布・インデックスの選択性）をもとにコスト（I/O回数・CPU時間）を見積もり、最小コストの実行計画を選択します。

結合アルゴリズムにはネステッドループ結合（小さいテーブル同士・インデックスあり）、ハッシュ結合（大テーブルの等値結合）、マージ結合（ソート済みデータ同士）の3種類があります。PostgreSQLのオプティマイザは動的計画法で最適な結合順序を探索します。テーブル数が多い場合はGENETIC QUERY OPTIMIZER（GEQO）に切り替えます。

統計情報が古いとオプティマイザが誤った推定をしてしまうため、`ANALYZE`（PostgreSQL）や`ANALYZE TABLE`（MySQL）を定期的に実行することが重要です。

## 実行計画の選択プロセス

| フェーズ | 内容 | 例 |
|---------|------|-----|
| 構文解析（Parse） | SQL文をAST（抽象構文木）に変換 | SELECT → ParseTree |
| 意味解析（Analyze） | テーブル・カラムの存在確認 | users.email の存在チェック |
| 論理最適化（Rewrite） | 等価変換・述語プッシュダウン | サブクエリの平坦化 |
| 物理最適化（Plan） | コスト推定・実行計画の選択 | ネステッドループ vs ハッシュ結合 |
| 実行（Execute） | 実行計画に従ってデータ取得 | インデックススキャン・ソート |

```sql
-- ====================================
-- PostgreSQL の結合アルゴリズム確認
-- ====================================
-- デフォルト設定でのクエリ実行計画
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
    o.id,
    u.name,
    o.total_amount
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.created_at >= '2024-01-01'
  AND u.status = 'active';

-- ====================================
-- 結合アルゴリズムを手動で指定して比較
-- ====================================
-- ネステッドループ結合を強制
SET enable_hashjoin = OFF;
SET enable_mergejoin = OFF;

EXPLAIN (ANALYZE, BUFFERS)
SELECT o.id, u.name
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.created_at >= '2024-01-01';

-- ハッシュ結合を強制
SET enable_hashjoin = ON;
SET enable_mergejoin = OFF;
SET enable_nestloop = OFF;

EXPLAIN (ANALYZE, BUFFERS)
SELECT o.id, u.name
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.created_at >= '2024-01-01';

-- 設定をリセット
RESET enable_hashjoin;
RESET enable_mergejoin;
RESET enable_nestloop;

-- ====================================
-- 述語プッシュダウンの確認
-- ====================================
-- サブクエリが平坦化される例
EXPLAIN
SELECT * FROM (
    SELECT id, name, status FROM users
) sub
WHERE status = 'active';
-- → PostgreSQL は WHERE を内側に押し込む（push down）

-- ====================================
-- 統計情報の更新
-- ====================================
-- テーブルの統計情報を更新
ANALYZE users;
ANALYZE orders;
ANALYZE;   -- 全テーブル

-- 統計情報のサンプリング率を上げる（デフォルト 100）
ALTER TABLE orders ALTER COLUMN user_id
    SET STATISTICS 500;   -- より詳細なヒストグラム

-- ====================================
-- MySQL のオプティマイザトレース
-- ====================================
-- オプティマイザの詳細な判断過程を確認
SET optimizer_trace = 'enabled=on';

SELECT * FROM orders WHERE user_id = 1 AND status = 'shipped';

SELECT * FROM information_schema.OPTIMIZER_TRACE\G

SET optimizer_trace = 'enabled=off';
```

```python
import psycopg2
import json

conn = psycopg2.connect(
    host="localhost", dbname="mydb", user="user", password="pass"
)
cur = conn.cursor()

def explain_query(sql: str, params=None):
    """クエリの実行計画をJSON形式で取得して要約を表示"""
    cur.execute(f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {sql}", params)
    plan_json = cur.fetchone()[0][0]

    def summarize(node: dict, depth: int = 0):
        indent = "  " * depth
        node_type = node.get("Node Type", "Unknown")
        actual_time = node.get("Actual Total Time", 0)
        rows = node.get("Actual Rows", 0)
        loops = node.get("Actual Loops", 1)

        print(f"{indent}{node_type}")
        print(f"{indent}  時間: {actual_time:.2f}ms, 行数: {rows}, ループ: {loops}")

        # 結合タイプの表示
        if "Join Type" in node:
            print(f"{indent}  結合: {node['Join Type']}")
        # スキャンタイプの詳細
        if "Index Name" in node:
            print(f"{indent}  インデックス: {node['Index Name']}")
        if "Filter" in node:
            print(f"{indent}  フィルタ: {node['Filter']}")

        for child in node.get("Plans", []):
            summarize(child, depth + 1)

    print("=== 実行計画 ===")
    summarize(plan_json["Plan"])
    print(f"\n総実行時間: {plan_json['Execution Time']:.2f}ms")
    print(f"計画時間: {plan_json['Planning Time']:.2f}ms")

# 実行計画の分析
explain_query("""
    SELECT o.id, u.name, o.total_amount
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE o.created_at >= '2024-01-01'
""")

cur.close()
conn.close()
```

## 使用場面

- 遅いクエリの実行計画を確認してボトルネックを特定する場合
- 統計情報が古くなって誤った実行計画が選ばれていないか確認する場合
- 複数テーブルのJOINで結合順序・アルゴリズムが適切かを検証する場合
- オプティマイザが選択した計画をヒント句やGUCパラメータで上書きする場合

## 参考文献

- [PostgreSQL Documentation - The Query Planner](https://www.postgresql.org/docs/current/planner-optimizer.html)
- [MySQL Documentation - Controlling Query Plan Evaluation](https://dev.mysql.com/doc/refman/8.0/en/controlling-query-plan-evaluation.html)
- Use The Index, Luke - [Execution Plans](https://use-the-index-luke.com/sql/explain-plan)

<AffiliateBanner site="db_navi" />
