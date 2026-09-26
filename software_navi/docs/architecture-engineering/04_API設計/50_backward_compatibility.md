import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 後方互換性の維持

## 後方互換性とは

> 後方互換性（Backward Compatibility）とは、API やシステムの新バージョンが既存のクライアント・ユーザーのコードを変更せずともそのまま動作し続ける性質であり、一度公開した契約（コントラクト）を守り続ける設計原則である。

後方互換性は公開 API の設計における最重要原則の一つである。既存クライアントを破壊する変更（Breaking Change）を加えると、依存するすべてのクライアントの更新を強制し、サービス停止やデータ不整合を引き起こす。特にモバイルアプリ・外部パートナー API・マイクロサービス間の契約では影響が甚大である。

**互換性のある変更**（Non-Breaking Change）の例：新しいフィールドの追加・新しいオプションパラメータの追加・新しいエンドポイントの追加・既存フィールドへのデフォルト値追加。**互換性のない変更**（Breaking Change）：フィールドの削除・型の変更・必須パラメータの追加・エンドポイントの削除・認証方式の変更。

互換性維持の実践的手法として、**Tolerant Reader パターン**（受信側は知らないフィールドを無視する）・**Postel の法則**（送信は厳格に、受信は寛容に）・**コントラクトテスト**（Pact などのツールで API の互換性を自動検証）が重要である。GraphQL は型付きスキーマと `@deprecated` ディレクティブで段階的な廃止を管理しやすい。

## Breaking Change の種類と対策

| 変更種別 | Breaking? | 対策 |
|---------|-----------|------|
| フィールドの追加 | No | クライアントは無視すれば良い |
| 必須フィールドの削除 | Yes | 段階的廃止 + デフォルト値 |
| フィールドの型変更 | Yes | バージョニングで分離 |
| 必須パラメータの追加 | Yes | オプション化 + デフォルト値 |
| エンドポイントの削除 | Yes | Sunset ヘッダーで事前通知 |
| レスポンス構造の変更 | Yes | バージョニングで分離 |
| 認証方式の変更 | Yes | 並行サポート期間の設置 |

```python
# 後方互換性の維持：Pydantic + FastAPI での実践例

from fastapi import FastAPI, Response
from pydantic import BaseModel, Field
from typing import Optional

app = FastAPI()

# ===== v1 スキーマ（既存） =====
class UserV1(BaseModel):
    id: int
    name: str
    email: str

# ===== v2 スキーマ（新バージョン: name を分割）=====
# Breaking Change を避けるため、古い name フィールドも残す
class UserV2(BaseModel):
    id: int
    name: str                          # 後方互換: 削除しない
    first_name: str                    # 新フィールド（追加は Non-Breaking）
    last_name: str                     # 新フィールド（追加は Non-Breaking）
    email: str
    phone: Optional[str] = None        # Optional で追加: Non-Breaking
    metadata: dict = Field(default_factory=dict)  # 拡張用メタデータ


# ===== Tolerant Reader パターン =====
class FlexibleUserRequest(BaseModel):
    """知らないフィールドを無視する（model_config で extra='ignore'）"""
    model_config = {"extra": "ignore"}  # 未知フィールドを無視

    id: int
    name: str
    email: str


# ===== APIレスポンスの後方互換性 =====
@app.get("/v1/users/{user_id}", response_model=UserV1)
def get_user_v1(user_id: int, response: Response) -> UserV1:
    # v1 は維持しつつ Deprecation を通知
    response.headers["Deprecation"] = "true"
    response.headers["Sunset"] = "Fri, 31 Dec 2027 23:59:59 GMT"
    response.headers["Link"] = f'</v2/users/{user_id}>; rel="successor-version"'
    return UserV1(id=user_id, name="Alice Wonderland", email="alice@example.com")


@app.get("/v2/users/{user_id}", response_model=UserV2)
def get_user_v2(user_id: int) -> UserV2:
    return UserV2(
        id=user_id,
        name="Alice Wonderland",       # 後方互換のため残す
        first_name="Alice",
        last_name="Wonderland",
        email="alice@example.com",
        phone=None,
    )


# ===== コントラクトテストの例 =====
# pact-python などでプロバイダー・コンシューマー間の契約を自動検証
import json
from datetime import datetime

def verify_backward_compatibility(old_response: dict, new_response: dict) -> list[str]:
    """
    旧レスポンスのすべてのフィールドが新レスポンスに存在するか検証。
    新フィールドの追加は許容（Non-Breaking）。
    """
    violations = []
    for key, old_value in old_response.items():
        if key not in new_response:
            violations.append(f"Breaking: フィールド '{key}' が削除されました")
        elif type(old_value) != type(new_response[key]):
            violations.append(
                f"Breaking: フィールド '{key}' の型が "
                f"{type(old_value).__name__} → {type(new_response[key]).__name__} に変更"
            )
    return violations


# 検証デモ
old_resp = {"id": 1, "name": "Alice", "email": "alice@example.com"}
new_resp_ok = {"id": 1, "name": "Alice", "email": "alice@example.com",
               "phone": None}  # 追加は OK

new_resp_break = {"id": "1",  # 型変更: Breaking!
                  "first_name": "Alice",  # name を削除: Breaking!
                  "email": "alice@example.com"}

print("=== 互換性 OK の変更 ===")
violations = verify_backward_compatibility(old_resp, new_resp_ok)
print(f"  違反: {violations if violations else 'なし'}")

print("=== Breaking Change ===")
violations = verify_backward_compatibility(old_resp, new_resp_break)
for v in violations:
    print(f"  {v}")
```

## 使用場面

- 外部公開 REST API・GraphQL スキーマの変更時に既存クライアントへの影響を最小化するとき
- マイクロサービス間の API 契約をコントラクトテストで保護するとき
- モバイルアプリのように強制アップデートが難しいクライアントへの対応
- ライブラリ・SDK の新バージョンリリース時のセマンティックバージョニング管理

## 参考文献

- Fowler, M. (2014). Tolerant Reader. martinfowler.com.
- Richardson, C. (2018). *Microservices Patterns*. Manning.
- [Pact コントラクトテストフレームワーク](https://docs.pact.io/)

<AffiliateBanner site="software_navi" />
