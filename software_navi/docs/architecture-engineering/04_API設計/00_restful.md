import AffiliateBanner from '@site/src/components/AffiliateBanner';

# RESTful API 設計原則

## RESTful APIとは

> REST（Representational State Transfer）の原則に従い、リソースをURLで表現し、HTTPメソッドで操作するAPIの設計スタイル。

REST は Roy Fielding が 2000 年の博士論文で提唱したアーキテクチャスタイルです。「RESTful」とは REST の制約を適切に満たしているAPIのことを指します。

REST の6つの制約（統一インタフェース・クライアント・サーバー分離・ステートレス・キャッシュ可能・レイヤードシステム・オプションのコードオンデマンド）のうち、実践で特に重要なのは「統一インタフェース」と「ステートレス」です。

良いRESTful APIはリソース名に名詞を使い（動詞は使わない）、HTTPメソッドで操作を表現します。ステータスコードを正確に使い、HATEOASを意識したリンク構造を持つことで、クライアントがAPIを探索・利用しやすくなります。

## HTTPメソッドとCRUDの対応

| メソッド | 操作 | 冪等性 | 安全性 | 例 |
|---------|------|-------|-------|-----|
| GET | 取得 | Yes | Yes | GET /users/1 |
| POST | 作成 | No | No | POST /users |
| PUT | 全体更新 | Yes | No | PUT /users/1 |
| PATCH | 部分更新 | No | No | PATCH /users/1 |
| DELETE | 削除 | Yes | No | DELETE /users/1 |

```python title="RESTful API 設計 — FastAPI（Python）"
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel

app = FastAPI()

# インメモリデータストア
users_db: dict[int, dict] = {
    1: {"id": 1, "name": "Alice", "email": "alice@example.com"},
}
next_id = 2

class UserCreate(BaseModel):
    name: str
    email: str

class UserUpdate(BaseModel):
    name: str | None = None
    email: str | None = None


# GET /users — コレクション取得
@app.get("/users", status_code=status.HTTP_200_OK)
def list_users():
    return list(users_db.values())


# GET /users/{user_id} — 単一リソース取得
@app.get("/users/{user_id}", status_code=status.HTTP_200_OK)
def get_user(user_id: int):
    user = users_db.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# POST /users — リソース作成 → 201 Created
@app.post("/users", status_code=status.HTTP_201_CREATED)
def create_user(body: UserCreate):
    global next_id
    user = {"id": next_id, **body.dict()}
    users_db[next_id] = user
    next_id += 1
    return user


# PATCH /users/{user_id} — 部分更新
@app.patch("/users/{user_id}")
def update_user(user_id: int, body: UserUpdate):
    user = users_db.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if body.name:
        user["name"] = body.name
    if body.email:
        user["email"] = body.email
    return user


# DELETE /users/{user_id} → 204 No Content
@app.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int):
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    del users_db[user_id]
```

## URLとステータスコードの設計指針

| アンチパターン | 良い例 |
|-------------|-------|
| POST /getUsers | GET /users |
| GET /deleteUser?id=1 | DELETE /users/1 |
| 全操作で200を返す | 201/204/400/404/409 を適切に使う |
| /users/1/getOrders | GET /users/1/orders |

## 使用場面

- モバイルアプリ・SPA のバックエンドAPI
- マイクロサービス間の同期通信
- サードパーティが利用するパブリックAPI

## 参考文献

- Roy Fielding, *Architectural Styles and the Design of Network-based Software Architectures*, 2000
- Richardson Maturity Model, https://martinfowler.com/articles/richardsonMaturityModel.html

<AffiliateBanner site="software_navi" />
