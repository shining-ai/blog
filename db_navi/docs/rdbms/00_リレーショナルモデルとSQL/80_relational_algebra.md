import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 関係代数（射影・選択・結合・直積）

## 関係代数とは

> 関係代数（Relational Algebra）とは、リレーション（表）を入力として受け取り、新たなリレーションを出力する演算の集合であり、SQLの理論的基盤をなす形式言語である。

関係代数は1970年にE.F.Coddによって提案されたリレーショナルモデルの数学的な操作体系です。集合論を基礎とし、リレーションに対する各種演算を形式的に定義しています。SQLは関係代数を宣言的な言語として実装したものであり、SQLのオプティマイザは内部でクエリを関係代数の式に変換して最適化を行います。

基本演算は「選択（σ）」「射影（π）」「直積（×）」「和（∪）」「差（−）」「名前付け（ρ）」の6つです。これらから「結合（⋈）」「交差（∩）」「商（÷）」などの複合演算が導出されます。選択は行方向のフィルタリング（WHERE句に対応）、射影は列方向のフィルタリング（SELECT句の列指定に対応）です。

関係代数を理解することで、クエリのオプティマイザが行う等価変換（結合順序の入れ替えや述語プッシュダウンなど）の原理が分かります。

## 関係代数の演算一覧

| 演算 | 記号 | SQL対応 | 説明 |
|------|------|---------|------|
| 選択 | σ（シグマ） | WHERE | 条件を満たす行を抽出 |
| 射影 | π（パイ） | SELECT 列名 | 指定した列のみを抽出（DISTINCT） |
| 直積 | × | CROSS JOIN | 2つのリレーションの全組合せ |
| 和 | ∪ | UNION | 2つのリレーションの合併（重複排除） |
| 差 | − | EXCEPT | 一方にしかない行を返す |
| 交差 | ∩ | INTERSECT | 両方に存在する行を返す |
| 自然結合 | ⋈ | NATURAL JOIN | 同名列で自動的に等値結合 |
| θ結合 | ⋈θ | JOIN ON | 任意の条件での結合 |
| 外部結合 | ⟕ ⟖ ⟗ | LEFT/RIGHT/FULL JOIN | NULL補完付き結合 |

```sql
-- 選択（σ）: WHERE句に対応
-- σ_{price > 1000}(products)
SELECT * FROM products WHERE price > 1000;

-- 射影（π）: SELECT列指定に対応（重複排除）
-- π_{name, category}(products)
SELECT DISTINCT name, category FROM products;

-- 直積（×）: CROSS JOINに対応
-- customers × orders
SELECT * FROM customers CROSS JOIN orders;

-- 和（∪）: UNIONに対応（スキーマが同一である必要あり）
-- active_users ∪ premium_users
SELECT id, name FROM active_users
UNION
SELECT id, name FROM premium_users;

-- 差（−）: EXCEPTに対応
-- all_customers − customers_who_ordered
SELECT id, name FROM customers
EXCEPT
SELECT DISTINCT c.id, c.name
FROM customers c JOIN orders o ON c.id = o.customer_id;

-- 交差（∩）: INTERSECTに対応
-- 去年も今年も注文した顧客
SELECT customer_id FROM orders WHERE order_date BETWEEN '2023-01-01' AND '2023-12-31'
INTERSECT
SELECT customer_id FROM orders WHERE order_date BETWEEN '2024-01-01' AND '2024-12-31';

-- 自然結合（⋈）: NATURAL JOIN（同名列で自動結合）
-- 注意: 意図しない列での結合が起きる可能性があるため実用上は避ける
SELECT * FROM customers NATURAL JOIN orders;

-- θ結合（θ=等値）: 通常のINNER JOIN
-- customers ⋈_{customers.id=orders.customer_id} orders
SELECT c.id, c.name, o.id AS order_id
FROM   customers c
JOIN   orders o ON c.id = o.customer_id;

-- 複合演算の例（選択 → 射影 → 結合）
-- π_{c.name, o.amount}(σ_{o.amount > 5000}(customers ⋈ orders))
SELECT c.name, o.amount
FROM   customers c
JOIN   orders o ON c.id = o.customer_id
WHERE  o.amount > 5000;

-- 述語プッシュダウンの例（オプティマイザが自動で最適化）
-- 非効率（直積してから選択）
SELECT * FROM (
    SELECT * FROM customers CROSS JOIN orders
) sub
WHERE sub.id = sub.customer_id AND sub.amount > 5000;

-- 効率的（結合前に選択）
SELECT c.name, o.amount
FROM   customers c
JOIN   (SELECT * FROM orders WHERE amount > 5000) o
    ON c.id = o.customer_id;
```

```python
import pandas as pd

# PandasでのRelational Algebra演算（インメモリ）
customers = pd.DataFrame({
    'id': [1, 2, 3],
    'name': ['Alice', 'Bob', 'Carol']
})
orders = pd.DataFrame({
    'id': [101, 102, 103],
    'customer_id': [1, 1, 2],
    'amount': [5000, 3000, 8000]
})

# 選択（σ）
high_value = orders[orders['amount'] > 4000]

# 射影（π）
names_only = customers[['id', 'name']]

# θ結合（⋈）
result = pd.merge(customers, orders, left_on='id', right_on='customer_id')

# 差（−）: 注文がない顧客
ordered_ids = orders['customer_id'].unique()
no_order = customers[~customers['id'].isin(ordered_ids)]
print(no_order)
```

## 使用場面

- クエリオプティマイザの最適化ルール（述語プッシュダウン・結合順序）を理解する場合
- UNION・INTERSECT・EXCEPT で複数クエリの結果を集合演算する場合
- 複雑なクエリを等価な別の形式に変換して最適化を分析する場合
- データベース理論の学習や設計の論理的な正当性を検証する場合

## 参考文献

- E.F. Codd, "A Relational Model of Data for Large Shared Data Banks", 1970
- [PostgreSQL Documentation - UNION, INTERSECT, EXCEPT](https://www.postgresql.org/docs/current/queries-union.html)
- Ramakrishnan & Gehrke, "Database Management Systems", 3rd Edition

<AffiliateBanner site="db_navi" />
