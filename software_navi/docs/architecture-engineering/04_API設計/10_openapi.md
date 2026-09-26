import AffiliateBanner from '@site/src/components/AffiliateBanner';

# OpenAPI / Swagger

## OpenAPIとは

> HTTP APIを機械可読なフォーマット（YAML/JSON）で記述するための標準仕様。Swagger とは OpenAPI Specification のツールエコシステムの総称。

OpenAPI Specification（OAS）は、もともと Swagger という名称で開発され、2016 年に Linux Foundation 傘下の OpenAPI Initiative に寄贈されました。現在は OpenAPI 3.x が主流です。

OpenAPI の定義ファイルを書くことで、インタラクティブなAPIドキュメント（Swagger UI）の自動生成・クライアントSDKの自動生成・リクエスト/レスポンスのバリデーション・モックサーバーの生成が可能になります。

「コードファースト」（実装からドキュメントを生成）と「デザインファースト」（OAS定義からコードを生成）の2アプローチがあります。チームの成熟度とAPIの安定性に応じて選択します。デザインファーストはフロントエンド・バックエンドを並行開発できる利点があります。

## OpenAPIの主要オブジェクト

| オブジェクト | 役割 |
|------------|------|
| info | APIのメタデータ（タイトル・バージョン） |
| paths | エンドポイントとHTTPメソッドの定義 |
| components/schemas | 再利用可能なデータモデル定義 |
| components/responses | 再利用可能なレスポンス定義 |
| security | 認証スキームの定義 |
| servers | サーバーURL一覧 |

```yaml title="OpenAPI 3.1 定義ファイル（YAML）"
openapi: "3.1.0"
info:
  title: User API
  version: "1.0.0"
  description: ユーザー管理API

servers:
  - url: https://api.example.com/v1
    description: 本番環境
  - url: http://localhost:8000/v1
    description: 開発環境

paths:
  /users:
    get:
      summary: ユーザー一覧を取得
      operationId: listUsers
      tags: [users]
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
      responses:
        "200":
          description: 成功
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/User"

    post:
      summary: ユーザーを作成
      operationId: createUser
      tags: [users]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/UserCreate"
      responses:
        "201":
          description: 作成成功
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/User"
        "400":
          $ref: "#/components/responses/BadRequest"

  /users/{userId}:
    get:
      summary: ユーザーを取得
      operationId: getUser
      tags: [users]
      parameters:
        - name: userId
          in: path
          required: true
          schema:
            type: integer
      responses:
        "200":
          description: 成功
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/User"
        "404":
          $ref: "#/components/responses/NotFound"

components:
  schemas:
    User:
      type: object
      required: [id, name, email]
      properties:
        id:
          type: integer
          example: 1
        name:
          type: string
          example: Alice
        email:
          type: string
          format: email
          example: alice@example.com

    UserCreate:
      type: object
      required: [name, email]
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 100
        email:
          type: string
          format: email

  responses:
    BadRequest:
      description: リクエストが不正
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: string
    NotFound:
      description: リソースが見つからない
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: string

  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

```python title="FastAPI による OpenAPI 自動生成（Python）"
from fastapi import FastAPI
from pydantic import BaseModel, EmailStr

app = FastAPI(title="User API", version="1.0.0")

class User(BaseModel):
    id: int
    name: str
    email: EmailStr

@app.get("/users/{user_id}", response_model=User, tags=["users"])
def get_user(user_id: int) -> User:
    """ユーザーを取得する"""
    return User(id=user_id, name="Alice", email="alice@example.com")

# FastAPI は上記コードから自動的に OpenAPI ドキュメントを生成
# http://localhost:8000/docs  → Swagger UI
# http://localhost:8000/redoc → ReDoc
# http://localhost:8000/openapi.json → OAS JSON
```

## 使用場面

- フロントエンドとバックエンドを並行開発するためにAPIの型をデザインファーストで定義するとき
- OpenAPI定義からTypeScriptのクライアントSDKを自動生成するとき（openapi-generator等）
- APIのリクエスト/レスポンスをバリデーションする共通スキーマとして活用するとき

## 参考文献

- OpenAPI Initiative, *OpenAPI Specification 3.1.0*, https://spec.openapis.org/oas/v3.1.0
- Swagger 公式ドキュメント, https://swagger.io/docs/

<AffiliateBanner site="software_navi" />
