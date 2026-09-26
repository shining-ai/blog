import AffiliateBanner from '@site/src/components/AffiliateBanner';

# GraphQL の設計

## GraphQLとは

> クライアントが必要なデータを正確に指定して取得できるAPIクエリ言語。Facebook（現Meta）が開発し2015年にオープンソース化した。

GraphQL は REST の「オーバーフェッチ（不要なフィールドも取得）」と「アンダーフェッチ（複数リクエストが必要）」という課題を解決するために設計されました。クライアントはクエリで必要なフィールドだけを指定するため、モバイルなど帯域が限られた環境で特に有効です。

GraphQL の3つの主要操作は Query（取得）・Mutation（変更）・Subscription（リアルタイム）です。スキーマ（SDL: Schema Definition Language）がAPIの契約となり、型システムにより静的なバリデーションと自動補完が可能です。

N+1問題（関連データの取得でSQLが爆発する問題）はGraphQLで発生しやすく、DataLoader パターンでバッチ処理して解決します。また、複雑なクエリを悪用したDoS攻撃対策としてクエリの深さ・複雑度制限も重要です。

## REST vs GraphQL の比較

| 観点 | REST | GraphQL |
|------|------|---------|
| エンドポイント | リソースごとに複数 | 単一（/graphql） |
| データ取得 | サーバーが定義した固定形式 | クライアントが必要なフィールドを指定 |
| オーバーフェッチ | 発生しやすい | 発生しない |
| 型システム | OpenAPIで別途定義 | スキーマが型の真実 |
| キャッシュ | HTTP標準キャッシュが使える | カスタム実装が必要 |
| 学習コスト | 低い | 高い |

```graphql title="GraphQL スキーマ定義（SDL）"
# スキーマ定義（SDL: Schema Definition Language）
type Query {
  user(id: ID!): User
  users(limit: Int = 20, offset: Int = 0): [User!]!
  products(category: String): [Product!]!
}

type Mutation {
  createUser(input: CreateUserInput!): UserPayload!
  updateUser(id: ID!, input: UpdateUserInput!): UserPayload!
  deleteUser(id: ID!): DeletePayload!
}

type Subscription {
  orderStatusChanged(orderId: ID!): Order!
}

type User {
  id: ID!
  name: String!
  email: String!
  orders(status: OrderStatus): [Order!]!
  createdAt: String!
}

type Product {
  id: ID!
  name: String!
  price: Int!
  category: String!
}

type Order {
  id: ID!
  status: OrderStatus!
  total: Int!
  items: [OrderItem!]!
}

type OrderItem {
  product: Product!
  quantity: Int!
}

enum OrderStatus {
  PENDING
  SHIPPED
  DELIVERED
  CANCELLED
}

input CreateUserInput {
  name: String!
  email: String!
}

input UpdateUserInput {
  name: String
  email: String
}

type UserPayload {
  user: User
  errors: [String!]
}

type DeletePayload {
  success: Boolean!
}
```

```python title="Strawberry（Python）による GraphQL リゾルバ"
import strawberry
from typing import Optional
from dataclasses import dataclass, field

# データモデル
@strawberry.type
class User:
    id: strawberry.ID
    name: str
    email: str

@strawberry.input
class CreateUserInput:
    name: str
    email: str

# インメモリDB
users_store: dict[str, dict] = {
    "1": {"id": "1", "name": "Alice", "email": "alice@example.com"},
}

# Query リゾルバ
@strawberry.type
class Query:
    @strawberry.field
    def user(self, id: strawberry.ID) -> Optional[User]:
        data = users_store.get(str(id))
        if not data:
            return None
        return User(**data)

    @strawberry.field
    def users(self) -> list[User]:
        return [User(**d) for d in users_store.values()]


# Mutation リゾルバ
@strawberry.type
class Mutation:
    @strawberry.mutation
    def create_user(self, input: CreateUserInput) -> User:
        new_id = str(len(users_store) + 1)
        user = User(id=new_id, name=input.name, email=input.email)
        users_store[new_id] = {"id": new_id, "name": input.name, "email": input.email}
        return user


schema = strawberry.Schema(query=Query, mutation=Mutation)
```

```graphql title="クライアントからのクエリ例"
# 必要なフィールドだけを指定（オーバーフェッチしない）
query GetUserWithOrders {
  user(id: "1") {
    name
    email
    orders(status: PENDING) {
      id
      total
      items {
        quantity
        product {
          name
          price
        }
      }
    }
  }
}

# フラグメントで再利用可能な選択セットを定義
fragment UserBasic on User {
  id
  name
  email
}
```

## 使用場面

- クライアント（モバイル・Web・TV）ごとに必要なフィールドが大きく異なるとき
- BFF（Backend for Frontend）パターンでフロントエンド向けのデータ集約を行うとき
- リアルタイム更新（Subscription）が必要なチャット・通知機能

## 参考文献

- GraphQL 公式仕様, https://spec.graphql.org/
- GraphQL.org, https://graphql.org/learn/

<AffiliateBanner site="software_navi" />
