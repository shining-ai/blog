import AffiliateBanner from '@site/src/components/AffiliateBanner';

# OAuth 2.0 と OpenID Connect

## OAuth 2.0 と OpenID Connect とは

> OAuth 2.0 はサードパーティアプリケーションにリソースへの**認可**（アクセス権の委譲）を行うフレームワークであり、OpenID Connect（OIDC）は OAuth 2.0 を拡張して**認証**（本人確認）を標準化したプロトコルである。

「Google アカウントでログイン」や「GitHub 連携」に使われているのが OAuth 2.0 と OIDC の組み合わせである。OAuth 2.0 は「あなたの Google ドライブに読み取りアクセスを許可する」という**認可**の仕組みであり、OIDC はその上に「このユーザーは誰か」という**認証**情報（ID トークン）を追加する。

**OAuth 2.0 の主要グラントタイプ：**
- **Authorization Code**：サーバサイドアプリ向け。コードを経由してアクセストークンを取得。最も安全
- **Authorization Code + PKCE**：SPAやモバイルアプリ向け。Code Verifier でコード横取りを防ぐ
- **Client Credentials**：M2M（サービス間通信）向け。ユーザー不在の認可
- **Implicit**：非推奨。フラグメントにトークンが露出するため脆弱

**OIDC の ID トークン：**
OIDC では認証成功時に JWT 形式の ID トークンが発行される。ペイロードには `sub`（ユーザー識別子）・`iss`（発行者）・`aud`（受信者）・`exp`（有効期限）などの標準クレームが含まれる。

**セキュリティ上の重要ポイント：**
- **state パラメータ**：CSRF 攻撃を防ぐためランダム値を使い、コールバック時に照合する
- **nonce**：ID トークンのリプレイ攻撃を防ぐ
- **redirect_uri の厳格な検証**：事前登録済みの URI のみ許可する

## OAuth 2.0 フローの比較

| グラントタイプ | 用途 | トークン取得方法 | 推奨度 |
|--------------|------|----------------|--------|
| Authorization Code + PKCE | SPA・モバイル・Webアプリ | コード交換 | 推奨 |
| Authorization Code | サーバサイドアプリ | コード交換 + client_secret | 推奨 |
| Client Credentials | サービス間通信 | 直接取得 | M2M用途に推奨 |
| Implicit | SPAの旧方式 | フラグメント | 非推奨 |
| Resource Owner Password | 非推奨 | 直接入力 | 使用禁止 |

```python
import secrets
import hashlib
import base64
import urllib.parse
from dataclasses import dataclass

# === Authorization Code + PKCE フローの実装例 ===

@dataclass
class PKCEParams:
    code_verifier: str
    code_challenge: str
    code_challenge_method: str = "S256"

def generate_pkce() -> PKCEParams:
    """PKCE のコードベリファイアとチャレンジを生成"""
    # code_verifier: 43〜128文字のランダム文字列
    code_verifier = base64.urlsafe_b64encode(
        secrets.token_bytes(32)
    ).rstrip(b"=").decode("ascii")

    # code_challenge = BASE64URL(SHA256(code_verifier))
    digest = hashlib.sha256(code_verifier.encode("ascii")).digest()
    code_challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")

    return PKCEParams(
        code_verifier=code_verifier,
        code_challenge=code_challenge,
    )

def build_authorization_url(
    authorization_endpoint: str,
    client_id: str,
    redirect_uri: str,
    scope: str,
    pkce: PKCEParams,
) -> tuple[str, str]:
    """
    認可リクエスト URL を構築し、state（CSRF トークン）も生成
    戻り値: (url, state)
    """
    state = secrets.token_urlsafe(32)  # セッションに保存して検証に使う

    params = {
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "scope": scope,
        "state": state,
        "code_challenge": pkce.code_challenge,
        "code_challenge_method": pkce.code_challenge_method,
    }
    url = f"{authorization_endpoint}?{urllib.parse.urlencode(params)}"
    return url, state

# 使用例
pkce = generate_pkce()
url, state = build_authorization_url(
    authorization_endpoint="https://accounts.google.com/o/oauth2/v2/auth",
    client_id="your-client-id.apps.googleusercontent.com",
    redirect_uri="https://myapp.example.com/callback",
    scope="openid email profile",
    pkce=pkce,
)

print(f"認可 URL（抜粋）: {url[:100]}...")
print(f"state（セッション保存）: {state[:20]}...")
print(f"code_verifier（セッション保存）: {pkce.code_verifier[:20]}...")
print("""
コールバック時の処理:
1. state を検証（セッションの state と一致するか）
2. code + code_verifier でトークンエンドポイントを呼び出す
3. ID トークンを検証（署名・iss・aud・exp・nonce）
4. sub クレームでユーザーを識別・作成
""")
```

## 使用場面

- 「Google / GitHub / Microsoft でログイン」機能の実装
- サードパーティアプリへの API アクセス権の委譲（Calendar、Drive など）
- マイクロサービス間の認証・認可（Client Credentials フロー）
- シングルサインオン（SSO）の基盤として OIDC を利用

## 参考文献

- [RFC 6749 - The OAuth 2.0 Authorization Framework](https://www.rfc-editor.org/rfc/rfc6749)
- [RFC 7636 - PKCE for OAuth Public Clients](https://www.rfc-editor.org/rfc/rfc7636)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [OWASP - OAuth Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html)

<AffiliateBanner site="security_navi" />
