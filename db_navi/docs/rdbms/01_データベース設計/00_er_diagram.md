import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ER 図の書き方

## ER 図とは

> ER図（Entity-Relationship Diagram）とは、データベースの概念設計において、エンティティ（実体）・属性（特性）・リレーションシップ（関係）を図形を用いて視覚的に表現したモデル図である。

ER図は1976年にPeter Chenによって提案されたデータモデリング技法です。業務分析の段階で「何を管理するか（エンティティ）」「それらがどのように関連しているか（リレーションシップ）」「各エンティティが持つ情報（属性）」を整理するために使用されます。ER図は概念設計から論理設計・物理設計（テーブル定義）への橋渡し役を担います。

エンティティは四角形で、属性は楕円形で、リレーションシップはひし形で表されます（Chen記法）。現在はIE記法（鳥の足記法）やUMLクラス図が広く使用されており、カーディナリティ（1:1、1:N、M:N）を線の端の形で表現します。

M:N（多対多）のリレーションシップは中間テーブル（関係テーブル・ブリッジテーブル）を設けて1:N・N:1 の関係に分解することで実装されます。

## エンティティとリレーションシップの種類

| 要素 | 説明 | 例 |
|------|------|-----|
| エンティティ | 管理対象のモノや概念 | 顧客・商品・注文 |
| 属性 | エンティティが持つ情報 | 顧客名・価格・注文日 |
| 主キー | エンティティを一意に識別する属性 | 顧客ID・商品ID |
| リレーションシップ | エンティティ間の関連 | 顧客が注文を行う |
| 1:1 | 1対1の関係 | ユーザー - プロフィール |
| 1:N | 1対多の関係 | 顧客 - 注文（1顧客が複数注文） |
| M:N | 多対多の関係 | 注文 - 商品（1注文に複数商品・1商品が複数注文） |

```sql
-- ER図から導出されるテーブル定義例

-- エンティティ: 顧客
CREATE TABLE customers (
    id         SERIAL       PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    email      VARCHAR(255) NOT NULL UNIQUE,
    phone      VARCHAR(20),
    created_at TIMESTAMPTZ  DEFAULT NOW()
);

-- エンティティ: 商品
CREATE TABLE products (
    id          SERIAL         PRIMARY KEY,
    name        VARCHAR(200)   NOT NULL,
    description TEXT,
    price       DECIMAL(10,2)  NOT NULL CHECK (price >= 0),
    stock       INT            NOT NULL DEFAULT 0,
    category_id INT            REFERENCES categories(id)
);

-- エンティティ: カテゴリ（1:N リレーション: カテゴリ→商品）
CREATE TABLE categories (
    id   SERIAL      PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- エンティティ: 注文（1:N リレーション: 顧客→注文）
CREATE TABLE orders (
    id          SERIAL       PRIMARY KEY,
    customer_id INT          NOT NULL REFERENCES customers(id),
    order_date  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    status      VARCHAR(20)  NOT NULL DEFAULT 'pending',
    total       DECIMAL(12,2)
);

-- 中間テーブル（M:N リレーションを解消）
-- 注文 M:N 商品 → order_items（注文明細）
CREATE TABLE order_items (
    id         SERIAL        PRIMARY KEY,
    order_id   INT           NOT NULL REFERENCES orders(id)   ON DELETE CASCADE,
    product_id INT           NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    qty        INT           NOT NULL CHECK (qty > 0),
    unit_price DECIMAL(10,2) NOT NULL,  -- 注文時点の価格を保存
    UNIQUE (order_id, product_id)       -- 同一注文内で同商品の重複防止
);

-- 1:1 リレーション: ユーザー - プロフィール（別テーブルに分離する場合）
CREATE TABLE users (
    id       SERIAL      PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE user_profiles (
    user_id    INT         PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    bio        TEXT,
    avatar_url VARCHAR(500),
    birth_date DATE
);

-- ER図に基づくクエリ例
-- 顧客の全注文とその明細を取得
SELECT
    c.name       AS customer_name,
    o.id         AS order_id,
    o.order_date,
    p.name       AS product_name,
    i.qty,
    i.unit_price,
    i.qty * i.unit_price AS subtotal
FROM customers  c
JOIN orders      o ON c.id = o.customer_id
JOIN order_items i ON o.id = i.order_id
JOIN products    p ON i.product_id = p.id
WHERE c.id = 1
ORDER BY o.order_date DESC, p.name;
```

```python
# SQLAlchemy でのER図相当のモデル定義
from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, DateTime
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime

Base = declarative_base()

class Customer(Base):
    __tablename__ = 'customers'
    id    = Column(Integer, primary_key=True)
    name  = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    orders = relationship('Order', back_populates='customer')  # 1:N

class Order(Base):
    __tablename__ = 'orders'
    id          = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey('customers.id'), nullable=False)
    order_date  = Column(DateTime, default=datetime.utcnow)
    customer    = relationship('Customer', back_populates='orders')  # N:1
    items       = relationship('OrderItem', back_populates='order')  # 1:N

class Product(Base):
    __tablename__ = 'products'
    id    = Column(Integer, primary_key=True)
    name  = Column(String(200), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    items = relationship('OrderItem', back_populates='product')  # 1:N

class OrderItem(Base):
    __tablename__ = 'order_items'                                 # 中間テーブル
    id         = Column(Integer, primary_key=True)
    order_id   = Column(Integer, ForeignKey('orders.id'),   nullable=False)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
    qty        = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    order   = relationship('Order',   back_populates='items')
    product = relationship('Product', back_populates='items')
```

## 使用場面

- 新しいシステムの概念設計でステークホルダーとデータ構造を共有する場合
- M:N関係を中間テーブルに分解してRDBMSの物理設計に落とし込む場合
- 既存データベースのドキュメント作成・リバースエンジニアリング
- ORMのモデル設計時に関係性（relationship）を明確にする場合

## 参考文献

- Peter Chen, "The Entity-Relationship Model - Toward a Unified View of Data", 1976
- [Lucidchart - ER Diagram Tutorial](https://www.lucidchart.com/pages/er-diagrams)
- [draw.io - Database ER Diagram](https://drawio-app.com/draw-entity-relationship-diagrams-er-diagrams-with-drawio/)

<AffiliateBanner site="db_navi" />
