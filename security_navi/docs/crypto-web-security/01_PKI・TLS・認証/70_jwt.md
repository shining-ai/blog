import AffiliateBanner from '@site/src/components/AffiliateBanner';

# JWT の仕組みと落とし穴

## JWT とは

> JWT（JSON Web Token）は、JSON 形式のクレームをBase64URLエンコードし、デジタル署名または暗号化によって完全性を保証するコンパクトなトークン形式であり、RFC 7519 で標準化されている。

JWT は`ヘッダ.ペイロード.署名`の三つのパートをピリオドで連結したテキスト形式のトークンである。ステートレスな認証情報の受け渡しに広く使われるが、**実装上の落とし穴が多く**、誤った使い方をするとセキュリティ上の重大な欠陥を生む。

**JWT の構造：**
- **ヘッダ（Header）**：アルゴリズム（`alg`）とトークンタイプ（`typ`）を指定
- **ペイロード（Payload）**：クレーム（主張）を含む JSON。`sub`・`iss`・`exp`・`iat` などの標準クレームと任意のカスタムクレーム
- **署名（Signature）**：ヘッダとペイロードを秘密鍵または共有鍵で署名

**有名な落とし穴：**

1. **`alg: none` 攻撃**：古いライブラリは `alg` を `none` にすると署名を検証しなかった。`alg` を必ずサーバ側で固定すること
2. **RS256 → HS256 の切り替え攻撃**：RS256（非対称）を使うサーバに対し、公開鍵を HMAC の鍵として HS256 で署名したトークンを送り込む攻撃
3. **`exp`（有効期限）の未検証**：ライブラリによっては期限切れトークンを受け入れる設定になっていることがある
4. **JWT をセッション代替として誤用**：ログアウト・強制無効化ができない。ブラックリストまたはリフレッシュトークン方式が必要
5. **機密情報をペイロードに含める**：ペイロードは Base64URL エンコードされているだけで暗号化されていない。誰でも読める

## JWT クレームの一覧

| クレーム | 説明 | 必須か |
|---------|------|--------|
| iss (issuer) | トークンの発行者 | 推奨 |
| sub (subject) | トークンの主体（ユーザーID など） | 推奨 |
| aud (audience) | トークンの受信者 | 推奨 |
| exp (expiration) | 有効期限（Unix 時間） | 必須 |
| iat (issued at) | 発行日時 | 推奨 |
| jti (JWT ID) | トークンの一意識別子（リプレイ防止） | 任意 |

```python
# pip install pyjwt cryptography
import jwt
import datetime
import secrets
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

# === RS256（RSA 署名）による JWT の安全な実装 ===

# RSA 鍵ペアの生成（通常はファイルに保存する）
private_key = rsa.generate_private_key(
    public_exponent=65537,
    key_size=2048,
)
public_key = private_key.public_key()

ISSUER = "https://auth.example.com"
AUDIENCE = "https://api.example.com"

def issue_token(user_id: str, roles: list[str]) -> str:
    """RS256 署名の JWT を発行"""
    now = datetime.datetime.now(datetime.timezone.utc)
    payload = {
        "iss": ISSUER,
        "sub": user_id,
        "aud": AUDIENCE,
        "iat": now,
        "exp": now + datetime.timedelta(hours=1),  # 有効期限は短めに
        "jti": secrets.token_urlsafe(16),           # リプレイ攻撃防止
        "roles": roles,
        # 注意: パスワード・クレジットカード番号などは絶対に入れない
    }

    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.TraditionalOpenSSL,
        encryption_algorithm=serialization.NoEncryption(),
    )
    return jwt.encode(payload, private_pem, algorithm="RS256")

def verify_token(token: str) -> dict:
    """
    JWT の厳格な検証
    - アルゴリズムを明示的に指定（"none" や HS256 を拒否）
    - iss / aud / exp を検証
    """
    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return jwt.decode(
        token,
        public_pem,
        algorithms=["RS256"],   # 許可するアルゴリズムを明示（重要！）
        issuer=ISSUER,
        audience=AUDIENCE,
        options={"require": ["exp", "iat", "sub", "jti"]},
    )

# 使用例
token = issue_token("user-123", ["read", "write"])
print(f"発行トークン（抜粋）: {token[:60]}...")

decoded = verify_token(token)
print(f"sub: {decoded['sub']}")
print(f"roles: {decoded['roles']}")
print(f"exp: {datetime.datetime.fromtimestamp(decoded['exp'])}")
```

## 使用場面

- API サーバへのステートレスな認証トークンとして利用
- マイクロサービス間でのユーザー情報の安全な受け渡し
- OAuth 2.0 / OIDC における ID トークン・アクセストークンの形式
- 短命トークンとリフレッシュトークンを組み合わせたセッション管理

## 参考文献

- [RFC 7519 - JSON Web Token (JWT)](https://www.rfc-editor.org/rfc/rfc7519)
- [jwt.io - JWT のデコード・検証ツール](https://jwt.io/)
- [OWASP - JSON Web Token Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [Auth0 - JWT のセキュリティベストプラクティス](https://auth0.com/blog/jwt-security-best-practices/)

<AffiliateBanner site="security_navi" />
