import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 集計（GROUP BY・HAVING・ウィンドウ関数）

## 集計とは

> SQLの集計とは、複数の行をグループにまとめてSUM・COUNT・AVGなどの集計関数を適用し、グループごとの統計値を求める操作であり、`GROUP BY` 句と `HAVING` 句、およびウィンドウ関数によって実現される。

集計は、売上合計・平均単価・最大値・件数カウントなどのビジネス分析に不可欠な機能です。`GROUP BY` 句は指定した列の値が同じ行をひとつのグループにまとめ、そのグループに対して集計関数を適用します。

`HAVING` 句は `GROUP BY` 後のグループに対して条件を絞り込む句です。`WHERE` 句は集計前の行に対してフィルタリングを行うのに対し、`HAVING` は集計後の結果（グループ）に対して条件を適用します。たとえば「売上件数が10件以上のカテゴリのみを表示する」といった条件は `HAVING` で記述します。

ウィンドウ関数（分析関数）は、行のグループを「ウィンドウ」として定義し、そのウィンドウ内で順位付けや累積集計を行う機能です。`GROUP BY` のように行をまとめず、各行ごとに集計結果を付加できるため、移動平均や累積合計・順位付けなどに使用されます。

## 集計関数とウィンドウ関数

| 関数 | 種類 | 説明 |
|------|------|------|
| `COUNT(*)` | 集計 | 行数を数える |
| `COUNT(col)` | 集計 | NULL を除いた行数を数える |
| `SUM(col)` | 集計 | 合計値 |
| `AVG(col)` | 集計 | 平均値 |
| `MAX(col)` | 集計 | 最大値 |
| `MIN(col)` | 集計 | 最小値 |
| `ROW_NUMBER()` | ウィンドウ | 連続した行番号 |
| `RANK()` | ウィンドウ | 同値に同じ順位（飛び番あり） |
| `DENSE_RANK()` | ウィンドウ | 同値に同じ順位（飛び番なし） |
| `LAG(col, n)` | ウィンドウ | n行前の値 |
| `LEAD(col, n)` | ウィンドウ | n行後の値 |
| `SUM() OVER(...)` | ウィンドウ | 累積合計 |

```sql
-- サンプルテーブル
CREATE TABLE orders (
    id          INT PRIMARY KEY,
    customer_id INT,
    category    VARCHAR(50),
    amount      DECIMAL(10,2),
    order_date  DATE
);

-- GROUP BY: カテゴリ別の件数・合計・平均
SELECT
    category,
    COUNT(*)        AS order_count,
    SUM(amount)     AS total_amount,
    AVG(amount)     AS avg_amount,
    MAX(amount)     AS max_amount
FROM   orders
GROUP BY category
ORDER BY total_amount DESC;

-- HAVING: 合計金額が100万円以上のカテゴリのみ
SELECT
    category,
    SUM(amount) AS total_amount
FROM   orders
GROUP BY category
HAVING SUM(amount) >= 1000000
ORDER BY total_amount DESC;

-- WHERE + GROUP BY + HAVING の組み合わせ
SELECT
    category,
    COUNT(*) AS cnt
FROM   orders
WHERE  order_date >= '2024-01-01'   -- 集計前の行フィルタ
GROUP BY category
HAVING COUNT(*) >= 10               -- 集計後のグループフィルタ
ORDER BY cnt DESC;

-- ウィンドウ関数: カテゴリ内の売上順位
SELECT
    id,
    category,
    amount,
    RANK()       OVER (PARTITION BY category ORDER BY amount DESC) AS rank_in_cat,
    DENSE_RANK() OVER (PARTITION BY category ORDER BY amount DESC) AS dense_rank,
    ROW_NUMBER() OVER (PARTITION BY category ORDER BY amount DESC) AS row_num
FROM orders;

-- ウィンドウ関数: 累積合計と移動平均
SELECT
    order_date,
    amount,
    SUM(amount) OVER (ORDER BY order_date
                      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                     ) AS cumulative_sum,
    AVG(amount) OVER (ORDER BY order_date
                      ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
                     ) AS moving_avg_7day
FROM orders
ORDER BY order_date;

-- LAG / LEAD: 前日比
SELECT
    order_date,
    amount,
    LAG(amount,  1) OVER (ORDER BY order_date) AS prev_day_amount,
    amount - LAG(amount, 1) OVER (ORDER BY order_date) AS diff
FROM (
    SELECT order_date, SUM(amount) AS amount
    FROM   orders
    GROUP BY order_date
) daily
ORDER BY order_date;
```

```python
import psycopg2
import pandas as pd

conn = psycopg2.connect(
    host="localhost", dbname="mydb", user="user", password="pass"
)

# GROUP BY 結果をDataFrameで取得
df = pd.read_sql_query("""
    SELECT
        category,
        COUNT(*)        AS order_count,
        SUM(amount)     AS total_amount,
        ROUND(AVG(amount)::numeric, 2) AS avg_amount
    FROM   orders
    GROUP BY category
    HAVING COUNT(*) >= 5
    ORDER BY total_amount DESC
""", conn)

print(df)
conn.close()
```

## 使用場面

- 売上合計・件数・平均を月別・カテゴリ別・地域別に集計するレポート作成
- `HAVING` で件数や合計に基づいた条件でグループを絞り込む場合
- ランキング表示（カテゴリ内の売上順位・全体の順位）を求める場合
- 時系列データの累積合計や移動平均を計算する場合

## 参考文献

- [PostgreSQL Documentation - Aggregate Functions](https://www.postgresql.org/docs/current/functions-aggregate.html)
- [PostgreSQL Documentation - Window Functions](https://www.postgresql.org/docs/current/tutorial-window.html)
- [MySQL Documentation - GROUP BY](https://dev.mysql.com/doc/refman/8.0/en/group-by-handling.html)

<AffiliateBanner site="db_navi" />
