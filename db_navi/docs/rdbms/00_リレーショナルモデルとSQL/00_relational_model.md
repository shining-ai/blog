import AffiliateBanner from '@site/src/components/AffiliateBanner';

# リレーショナルモデルの基礎

## リレーショナルモデルとは

> リレーショナルモデルとは、データを「関係（リレーション）」と呼ばれる2次元の表形式で表現し、集合論と述語論理に基づいてデータを操作する数学的なデータモデルである。

リレーショナルモデルは1970年にEdgar F. Coddが提唱したデータモデルで、現代のRDBMS（リレーショナルデータベース管理システム）の理論的基盤となっています。このモデルでは、データはすべて「リレーション（表）」として表現され、各リレーションは「タプル（行）」と「属性（列）」から構成されます。

リレーショナルモデルの最大の特徴は、データの物理的な格納方法を意識せずに論理的な操作ができる「データ独立性」にあります。アプリケーション開発者はデータの構造のみを意識すれば良く、ディスク上の格納方式などは気にする必要がありません。

また、リレーショナルモデルは「整合性制約」を定義する仕組みを持ちます。主キー制約（各タプルを一意に識別する属性の組合せ）や外部キー制約（別のリレーションとの参照整合性を保証する仕組み）によって、データの一貫性が自動的に維持されます。

## 主要な概念

| 概念 | 説明 | 例 |
|------|------|-----|
| リレーション（Relation） | 2次元の表。行と列から構成される | `users` テーブル |
| タプル（Tuple） | リレーションの1行。1件のデータを表す | `(1, 'Alice', 'alice@example.com')` |
| 属性（Attribute） | リレーションの列。データの種類を表す | `id`, `name`, `email` |
| ドメイン（Domain） | 属性が取り得る値の集合 | INT, VARCHAR(255) |
| 主キー（Primary Key） | タプルを一意に識別する属性の組合せ | `id` |
| 外部キー（Foreign Key） | 他のリレーションの主キーを参照する属性 | `user_id REFERENCES users(id)` |
| スキーマ（Schema） | リレーションの構造定義（属性名・型・制約） | `CREATE TABLE` の定義 |

```sql
-- リレーションの定義例
CREATE TABLE users (
    id      INT          PRIMARY KEY,   -- 主キー（タプルを一意に識別）
    name    VARCHAR(100) NOT NULL,      -- 属性（ドメイン: 最大100文字の文字列）
    email   VARCHAR(255) UNIQUE,        -- 一意制約
    dept_id INT,
    FOREIGN KEY (dept_id) REFERENCES departments(id)  -- 外部キー制約
);

CREATE TABLE departments (
    id   INT          PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

-- タプルの挿入
INSERT INTO departments VALUES (1, 'Engineering'), (2, 'Marketing');
INSERT INTO users VALUES (1, 'Alice', 'alice@example.com', 1);
INSERT INTO users VALUES (2, 'Bob',   'bob@example.com',   1);
INSERT INTO users VALUES (3, 'Carol', 'carol@example.com', 2);

-- リレーションの参照（SELECT）
SELECT u.name, d.name AS dept
FROM   users u
JOIN   departments d ON u.dept_id = d.id;
```

```python
import psycopg2

conn = psycopg2.connect(
    host="localhost", dbname="mydb", user="user", password="pass"
)
cur = conn.cursor()

# テーブル作成
cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id      SERIAL PRIMARY KEY,
        name    VARCHAR(100) NOT NULL,
        email   VARCHAR(255) UNIQUE,
        dept_id INT REFERENCES departments(id)
    )
""")
conn.commit()

# データ取得
cur.execute("SELECT id, name, email FROM users ORDER BY id")
for row in cur.fetchall():
    print(row)

cur.close()
conn.close()
```

## 使用場面

- 顧客・注文・商品などの業務データを表形式で管理する場合
- データの整合性（主キー・外部キー）を厳密に保証したい場合
- 複数のテーブルをJOINして複雑なクエリを実行する場合
- 正規化によりデータの重複を排除して一貫性を高めたい場合

## 参考文献

- E.F. Codd, "A Relational Model of Data for Large Shared Data Banks", Communications of the ACM, 1970
- [PostgreSQL Documentation - Concepts](https://www.postgresql.org/docs/current/tutorial-concepts.html)
- C.J. Date, "An Introduction to Database Systems", 8th Edition

<AffiliateBanner site="db_navi" />
