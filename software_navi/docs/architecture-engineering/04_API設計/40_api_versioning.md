import AffiliateBanner from '@site/src/components/AffiliateBanner';

# API バージョニング戦略

## APIバージョニングとは

> 後方互換性を壊す変更を行う際に、既存クライアントへの影響なく新しいAPIを提供するための手法。

公開APIは一度リリースすると、クライアントが依存しているため簡単に変更できません。フィールドの削除・型の変更・エンドポイントの削除など、後方互換性を壊す変更（Breaking Change）を行う際にはバージョニングが必要です。

主なバージョニング戦略は4つあります。URLパスバージョニング（`/v1/users`）は最もわかりやすく、ブラウザのブックマーク・キャッシュにも対応しやすいため最も広く使われます。クエリパラメータ（`?version=1`）はURLを汚染せずシンプルですが、キャッシュと相性が悪い場合があります。ヘッダーバージョニング（`Accept: application/vnd.example.v2+json`）はRESTの原則に最も忠実ですが、クライアント実装が複雑になります。サブドメイン（`v2.api.example.com`）は物理的な分離が容易ですが、DNS管理が必要です。

バージョンアップ時の移行期間設定・非推奨（Deprecation）通知・廃止（Sunset）ヘッダーの活用も重要なプラクティスです。

## バージョニング戦略の比較

| 戦略 | 例 | 長所 | 短所 |
|------|-----|------|------|
| URLパス | /v1/users | 直感的・キャッシュしやすい | URLが変わる |
| クエリパラメータ | /users?v=1 | シンプル | キャッシュと相性が悪い |
| リクエストヘッダー | Accept: application/vnd.api.v1+json | REST原則に忠実 | クライアント実装が複雑 |
| サブドメイン | v1.api.example.com | 物理的に完全分離 | DNS管理が必要 |

```python title="URLパスバージョニング — FastAPI（Python）"
from fastapi import FastAPI, APIRouter
from pydantic import BaseModel

app = FastAPI()

# ===== v1 スキーマ =====
class UserV1(BaseModel):
    id: int
    name: str  # フルネーム

# ===== v2 スキーマ（Breaking Change: name を first_name/last_name に分割）=====
class UserV2(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str  # 新フィールド追加

# ===== v1 ルーター =====
router_v1 = APIRouter(prefix="/v1")

@router_v1.get("/users/{user_id}", response_model=UserV1)
def get_user_v1(user_id: int) -> UserV1:
    return UserV1(id=user_id, name="Alice Wonderland")

# ===== v2 ルーター =====
router_v2 = APIRouter(prefix="/v2")

@router_v2.get(
    "/users/{user_id}",
    response_model=UserV2,
    deprecated=False,
)
def get_user_v2(user_id: int) -> UserV2:
    return UserV2(
        id=user_id,
        first_name="Alice",
        last_name="Wonderland",
        email="alice@example.com",
    )

app.include_router(router_v1)
app.include_router(router_v2)


# ===== Deprecation ヘッダーの付与（v1を非推奨にする）=====
from fastapi import Response
from datetime import datetime

@router_v1.get("/users/{user_id}", response_model=UserV1)
def get_user_v1_deprecated(user_id: int, response: Response) -> UserV1:
    # RFC 8594 Sunset ヘッダーで廃止予定日を通知
    response.headers["Deprecation"] = "true"
    response.headers["Sunset"] = "Sat, 31 Dec 2026 23:59:59 GMT"
    response.headers["Link"] = '</v2/users>; rel="successor-version"'
    return UserV1(id=user_id, name="Alice Wonderland")
```

```typescript title="バージョニング対応クライアント設計（TypeScript）"
// バージョンを設定として管理し、一箇所で変更できるようにする
const API_CONFIG = {
  baseUrl: "https://api.example.com",
  version: "v2",
} as const;

class ApiClient {
  private baseUrl: string;

  constructor(config: typeof API_CONFIG) {
    this.baseUrl = `${config.baseUrl}/${config.version}`;
  }

  async getUser(userId: number) {
    const res = await fetch(`${this.baseUrl}/users/${userId}`);

    // Deprecation ヘッダーを検知してログに残す
    if (res.headers.get("Deprecation")) {
      const sunset = res.headers.get("Sunset");
      console.warn(`This endpoint is deprecated. Sunset: ${sunset}`);
    }

    return res.json();
  }
}

const client = new ApiClient(API_CONFIG);
```

## バージョン廃止のベストプラクティス

1. Deprecation ヘッダー（RFC 9512）で非推奨を宣言する
2. Sunset ヘッダー（RFC 8594）で廃止予定日を通知する
3. 最低6ヶ月〜1年の移行期間を設ける
4. メール・変更履歴・ダッシュボードで通知を行う

## 使用場面

- パブリックAPIで Breaking Change を含む機能追加・変更を行うとき
- モバイルアプリなど更新が遅いクライアントへの対応が必要なとき
- マイクロサービス間で独立したデプロイサイクルを保つとき

## 参考文献

- Stripe API Versioning, https://stripe.com/docs/api/versioning
- RFC 8594 The Sunset HTTP Header Field, https://www.rfc-editor.org/rfc/rfc8594

<AffiliateBanner site="software_navi" />
