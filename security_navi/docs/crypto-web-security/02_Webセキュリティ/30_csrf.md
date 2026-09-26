import AffiliateBanner from '@site/src/components/AffiliateBanner';

# CSRF（クロスサイトリクエストフォージェリ）

## CSRF とは

> CSRF（Cross-Site Request Forgery）は、ユーザーが認証済みのサービスに対し、攻撃者が用意した悪意のあるページから意図しないリクエストを送信させる攻撃であり、被害者の権限を使ってデータ変更・送金・パスワード変更などを引き起こす。

ブラウザはリクエスト先のオリジンに関係なく、同一ドメインの Cookie をリクエストに自動附加する（Same-Origin Policy は**送信**を制限しない）。攻撃者はこの仕組みを悪用し、被害者をだます形でサービスへの正規リクエストを発生させる。

**典型的な攻撃フロー：**
1. 被害者が `bank.example.com` にログインしている
2. 攻撃者のページ `evil.example.com` に被害者をアクセスさせる
3. そのページに `<img src="https://bank.example.com/transfer?to=attacker&amount=10000">` などが埋め込まれている
4. ブラウザは自動的に `bank.example.com` の Cookie を付けてリクエストを送信する
5. サービスは正規ユーザーのリクエストとして処理してしまう

**XSS との違い：**
XSS は「被害者のブラウザで攻撃者のスクリプトを動かす」攻撃であり、CSRF は「被害者の権限で意図しないリクエストを送らせる」攻撃である。CSRF は JavaScript なしでも（img タグや form タグで）発生しうる。

## CSRF 防御手段の比較

| 防御手段 | 概要 | 効果 |
|---------|------|------|
| CSRF トークン（Synchronizer Token）| フォームに秘密トークンを埋め込みサーバ側で検証 | 高い |
| SameSite Cookie | `SameSite=Strict/Lax` でクロスサイト送信を制限 | 高い（モダンブラウザ） |
| Double Submit Cookie | Cookie とリクエストパラメータに同じ値を設定 | 中程度 |
| カスタムリクエストヘッダ | `X-Requested-With` など（Ajax のみ有効） | 限定的 |
| Referer / Origin ヘッダ検証 | リクエスト元オリジンを検証 | 補助的 |

```python
import secrets
import hmac
import hashlib
from functools import wraps

# === CSRF トークンの実装例（Flask スタイル）===

def generate_csrf_token(session_id: str, secret_key: str) -> str:
    """
    セッション固有の CSRF トークンを生成
    HMAC を使ってトークンをセッションに紐付けることで、
    セッションをまたいだトークンの使い回しを防ぐ
    """
    random_value = secrets.token_hex(16)
    # セッション ID とランダム値を HMAC で結合してトークンを生成
    mac = hmac.new(
        secret_key.encode(),
        f"{session_id}:{random_value}".encode(),
        hashlib.sha256,
    ).hexdigest()
    return f"{random_value}.{mac}"

def verify_csrf_token(token: str, session_id: str, secret_key: str) -> bool:
    """CSRF トークンの検証（タイミング攻撃対策に hmac.compare_digest を使用）"""
    parts = token.split(".")
    if len(parts) != 2:
        return False
    random_value, provided_mac = parts
    expected_mac = hmac.new(
        secret_key.encode(),
        f"{session_id}:{random_value}".encode(),
        hashlib.sha256,
    ).hexdigest()
    # タイミング攻撃対策: hmac.compare_digest は定数時間で比較する
    return hmac.compare_digest(provided_mac, expected_mac)

# 使用例
SESSION_ID = "user-session-abc123"
SECRET_KEY = secrets.token_hex(32)  # 本番では環境変数から取得

token = generate_csrf_token(SESSION_ID, SECRET_KEY)
print(f"CSRF トークン: {token[:40]}...")
print(f"検証（正しい）: {verify_csrf_token(token, SESSION_ID, SECRET_KEY)}")
print(f"検証（偽トークン）: {verify_csrf_token('fake.token', SESSION_ID, SECRET_KEY)}")

# === SameSite Cookie 設定例 ===
samesite_config = """
# SameSite=Strict: サードパーティのリクエストでは Cookie を一切送信しない
# （外部リンクからのアクセスでもログインが切れる場合があるため要確認）
Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Strict

# SameSite=Lax: 安全な HTTP メソッド（GET）のみ送信
# （デフォルトがLaxのブラウザが増えている。POST などのフォームには送信しない）
Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Lax
"""

# HTML フォームへの CSRF トークン埋め込み例
html_form = f"""
<form action="/transfer" method="POST">
    <input type="hidden" name="csrf_token" value="{token}">
    <input type="text" name="amount">
    <button type="submit">送金</button>
</form>
<!-- サーバは POST 受信時に csrf_token をセッションと照合する -->
"""

print("\nSameSite Cookie 設定:")
print(samesite_config)
```

## 使用場面

- 状態を変更するすべての POST / PUT / DELETE エンドポイントへの CSRF トークン実装
- SameSite Cookie 属性の設定による多層防御の構築
- SPA（シングルページアプリ）での CSRF 対策（カスタムヘッダ + CORS ポリシー）
- REST API の CSRF 対策設計（Bearer トークン認証は Cookie を使わないので CSRF のリスクが低い）

## 参考文献

- [OWASP - CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [RFC 6265bis - SameSite Cookie 属性](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis)
- [CWE-352: Cross-Site Request Forgery (CSRF)](https://cwe.mitre.org/data/definitions/352.html)
- [MDN - SameSite cookies](https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/Set-Cookie/SameSite)

<AffiliateBanner site="security_navi" />
