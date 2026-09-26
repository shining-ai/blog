---
title: REST API と HTTP メソッド
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# REST API と HTTP メソッド

## REST API とは

> REST（Representational State Transfer）アーキテクチャスタイルに基づく API。リソースを URI で識別し、HTTP メソッドで操作を表現するステートレスな Web API 設計原則

REST は 2000 年に Roy Fielding の博士論文で提唱されたアーキテクチャスタイルです。REST API（RESTful API）は HTTP の仕様を活かして設計され、次の 6 つの制約を満たすものを指します：クライアント・サーバ分離、ステートレス性、キャッシュ可能性、統一インターフェース、階層化システム、コードオンデマンド（任意）。

最も重要な制約は「統一インターフェース」と「ステートレス性」です。統一インターフェースでは「リソース（名詞）を URI で表し、操作（動詞）は HTTP メソッドで行う」という原則があります。ステートレスとは、各リクエストは独立して完結すること、すなわちサーバ側でセッション状態を持たないことです。

REST API でよくある設計パターンとして CRUD 操作があります。Create は POST、Read は GET、Update は PUT/PATCH、Delete は DELETE という対応が基本です。URI は `/users`（コレクション）と `/users/{id}`（個別リソース）の 2 種類が基本形です。

## REST の 6 原則

| 原則 | 説明 |
|------|------|
| クライアント・サーバ | UI とデータストアを分離 |
| ステートレス | 各リクエストは完結（セッション不要） |
| キャッシュ可能 | GET レスポンスはキャッシュ指示を含む |
| 統一インターフェース | URI でリソース識別、メソッドで操作 |
| 階層化システム | プロキシ・LB を透過 |
| コードオンデマンド | JavaScript 等の動的コード（任意） |

## CRUD と HTTP メソッドのマッピング

| 操作 | メソッド | URI 例 | 成功レスポンス |
|------|---------|--------|--------------|
| 一覧取得 | GET | /users | 200 + リスト |
| 個別取得 | GET | /users/1 | 200 + リソース |
| 作成 | POST | /users | 201 + 作成リソース |
| 完全置換 | PUT | /users/1 | 200 or 204 |
| 部分更新 | PATCH | /users/1 | 200 or 204 |
| 削除 | DELETE | /users/1 | 204 |

```python
from dataclasses import dataclass, field
from typing import Optional
import json
import uuid

@dataclass
class User:
    id: str
    name: str
    email: str

    def to_dict(self) -> dict:
        return {"id": self.id, "name": self.name, "email": self.email}

@dataclass
class HTTPResponse:
    status_code: int
    body: dict | list | None = None

    STATUS = {
        200: "OK", 201: "Created", 204: "No Content",
        400: "Bad Request", 404: "Not Found", 409: "Conflict",
    }

    def __str__(self):
        reason = self.STATUS.get(self.status_code, "Unknown")
        body_str = json.dumps(self.body, ensure_ascii=False) if self.body else ""
        return f"HTTP {self.status_code} {reason}  {body_str}"

class UserRestAPI:
    """ユーザリソースの REST API 実装例"""

    def __init__(self):
        self.store: dict[str, User] = {}
        # 初期データ
        for name, email in [("Alice", "alice@example.com"), ("Bob", "bob@example.com")]:
            uid = str(uuid.uuid4())[:8]
            self.store[uid] = User(id=uid, name=name, email=email)

    # GET /users
    def list_users(self) -> HTTPResponse:
        users = [u.to_dict() for u in self.store.values()]
        return HTTPResponse(200, users)

    # GET /users/{id}
    def get_user(self, user_id: str) -> HTTPResponse:
        user = self.store.get(user_id)
        if not user:
            return HTTPResponse(404, {"error": "User not found"})
        return HTTPResponse(200, user.to_dict())

    # POST /users
    def create_user(self, data: dict) -> HTTPResponse:
        if not data.get("name") or not data.get("email"):
            return HTTPResponse(400, {"error": "name and email are required"})
        if any(u.email == data["email"] for u in self.store.values()):
            return HTTPResponse(409, {"error": "Email already exists"})
        uid = str(uuid.uuid4())[:8]
        user = User(id=uid, name=data["name"], email=data["email"])
        self.store[uid] = user
        return HTTPResponse(201, user.to_dict())

    # PATCH /users/{id}
    def patch_user(self, user_id: str, data: dict) -> HTTPResponse:
        user = self.store.get(user_id)
        if not user:
            return HTTPResponse(404, {"error": "User not found"})
        if "name" in data:
            user.name = data["name"]
        if "email" in data:
            user.email = data["email"]
        return HTTPResponse(200, user.to_dict())

    # DELETE /users/{id}
    def delete_user(self, user_id: str) -> HTTPResponse:
        if user_id not in self.store:
            return HTTPResponse(404, {"error": "User not found"})
        del self.store[user_id]
        return HTTPResponse(204)

# デモ
api = UserRestAPI()
print("=== REST API デモ ===\n")

print("[GET /users] ユーザ一覧")
res = api.list_users()
print(f"  {res}\n")

user_ids = list(api.store.keys())
first_id = user_ids[0]

print(f"[GET /users/{first_id}] 個別取得")
print(f"  {api.get_user(first_id)}\n")

print("[POST /users] ユーザ作成")
print(f"  {api.create_user({'name': 'Carol', 'email': 'carol@example.com'})}\n")

print("[POST /users] 重複メール（エラー）")
print(f"  {api.create_user({'name': 'Dup', 'email': 'carol@example.com'})}\n")

print(f"[PATCH /users/{first_id}] 部分更新")
print(f"  {api.patch_user(first_id, {'name': 'Alice Smith'})}\n")

print(f"[DELETE /users/{first_id}] 削除")
print(f"  {api.delete_user(first_id)}\n")

print(f"[GET /users/{first_id}] 削除後（404）")
print(f"  {api.get_user(first_id)}\n")

print("[URI 設計のベストプラクティス]")
guidelines = [
    "リソースは名詞を使う（/users, /articles, NOT /getUsers, /createArticle）",
    "階層関係は URI で表す（/users/{id}/posts/{post_id}）",
    "コレクションは複数形（/users, /articles）",
    "バージョニングは /api/v1/ で管理",
    "フィルタ・ページングはクエリパラメータ（?page=2&limit=20）",
]
for g in guidelines:
    print(f"  • {g}")
```

## 使用場面

- Web サービスのバックエンド API を設計する際の URI・メソッド・ステータスコードの標準化
- マイクロサービスアーキテクチャでサービス間の通信インターフェースを定義する際に
- OpenAPI（Swagger）でスキーマを定義し、クライアントコードやドキュメントを自動生成する際に

## 参考文献

- [Fielding, R. – Architectural Styles and the Design of Network-based Software Architectures](https://www.ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm)
- [RFC 7231 – HTTP/1.1 Semantics and Content](https://www.rfc-editor.org/rfc/rfc7231)
- [Microsoft – REST API ガイドライン](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md)

<AffiliateBanner site="network_navi" />
