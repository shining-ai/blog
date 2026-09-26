import AffiliateBanner from '@site/src/components/AffiliateBanner';

# セキュリティヘッダ（CSP・HSTS・X-Frame-Options）

## セキュリティヘッダとは

> セキュリティヘッダは、HTTP レスポンスヘッダとしてサーバが送信するディレクティブであり、ブラウザに対してセキュリティポリシーを伝達することで、XSS・クリックジャッキング・情報漏洩などのクライアントサイド攻撃を緩和する。

セキュリティヘッダはアプリケーションのバグを直すのではなく、悪用された場合の**被害を最小化する多層防御**の一つである。適切なヘッダを設定するだけで、既知の攻撃手法の多くをブラウザレベルでブロックできる。

**主要なセキュリティヘッダ：**
- **Content-Security-Policy（CSP）**：スクリプト・スタイル・画像などのリソースの読み込み元を制限。XSS の最も強力な緩和策
- **Strict-Transport-Security（HSTS）**：ブラウザに HTTPS のみを使用させる（SSL ストリッピング対策）
- **X-Frame-Options**：iframe による埋め込みを制限（クリックジャッキング対策）
- **X-Content-Type-Options**：MIME スニッフィングを禁止（`nosniff`）
- **Referrer-Policy**：リファラー情報の送信範囲を制御
- **Permissions-Policy**：カメラ・マイク・位置情報などブラウザ機能の使用制限
- **Cross-Origin-Opener-Policy（COOP）**・**Cross-Origin-Embedder-Policy（COEP）**：Spectre などのサイドチャネル攻撃対策

## セキュリティヘッダ一覧

| ヘッダ | 目的 | 推奨値（最小構成）|
|--------|------|----------------|
| Content-Security-Policy | リソース読み込み元の制限・XSS 緩和 | `default-src 'self'` |
| Strict-Transport-Security | HTTPS 強制 | `max-age=31536000; includeSubDomains` |
| X-Frame-Options | クリックジャッキング防止 | `DENY` または `SAMEORIGIN` |
| X-Content-Type-Options | MIME スニッフィング禁止 | `nosniff` |
| Referrer-Policy | リファラー情報の制限 | `strict-origin-when-cross-origin` |
| Permissions-Policy | ブラウザ機能の使用制限 | `camera=(), microphone=(), geolocation=()` |

```python
# === セキュリティヘッダの設定例（Flask）===
from flask import Flask, Response
import secrets

app = Flask(__name__)

def add_security_headers(response: Response) -> Response:
    """すべてのレスポンスにセキュリティヘッダを追加"""
    # Content-Security-Policy（nonce ベース）
    # nonce はリクエストごとに生成し、許可するインラインスクリプトに付与する
    nonce = secrets.token_urlsafe(16)
    response.headers["Content-Security-Policy"] = (
        f"default-src 'self'; "
        f"script-src 'self' 'nonce-{nonce}'; "  # nonce 付きスクリプトのみ許可
        f"style-src 'self' 'nonce-{nonce}'; "
        f"img-src 'self' data: https:; "
        f"font-src 'self'; "
        f"object-src 'none'; "         # Flash など古いプラグインを禁止
        f"base-uri 'self'; "           # base タグの URL を自サイトに制限
        f"form-action 'self'; "        # フォーム送信先を自サイトに制限
        f"frame-ancestors 'none'; "    # iframe での埋め込みを全禁止
        f"upgrade-insecure-requests;"  # HTTP リソースを HTTPS に自動アップグレード
    )

    # HSTS（HTTPS 強制）
    response.headers["Strict-Transport-Security"] = (
        "max-age=31536000; includeSubDomains; preload"
    )

    # クリックジャッキング防止（CSP の frame-ancestors と重複するが互換性のため設定）
    response.headers["X-Frame-Options"] = "DENY"

    # MIME スニッフィング禁止
    response.headers["X-Content-Type-Options"] = "nosniff"

    # リファラーポリシー
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    # ブラウザ機能の制限
    response.headers["Permissions-Policy"] = (
        "camera=(), microphone=(), geolocation=(), payment=()"
    )

    # サーバ情報の隠蔽（Server ヘッダを削除）
    response.headers.pop("Server", None)

    return response

# セキュリティヘッダの検証スクリプト
def check_security_headers(headers: dict) -> dict:
    """レスポンスヘッダのセキュリティ設定を評価"""
    required_headers = {
        "Content-Security-Policy": "XSS 緩和",
        "Strict-Transport-Security": "HTTPS 強制",
        "X-Content-Type-Options": "MIME スニッフィング防止",
        "X-Frame-Options": "クリックジャッキング防止",
        "Referrer-Policy": "情報漏洩防止",
    }
    results = {}
    for header, purpose in required_headers.items():
        present = header in headers
        results[header] = {
            "present": present,
            "purpose": purpose,
            "value": headers.get(header, "（未設定）"),
        }
    return results

# Nginx での設定例（コメントとして）
nginx_headers = """
# nginx.conf または server ブロック内に設定
add_header Content-Security-Policy
    "default-src 'self'; script-src 'self'; object-src 'none';" always;
add_header Strict-Transport-Security
    "max-age=31536000; includeSubDomains; preload" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=()" always;
server_tokens off;  # Server ヘッダの詳細情報を非表示
"""
print("Nginx セキュリティヘッダ設定例:")
print(nginx_headers)
```

## 使用場面

- Webアプリケーションの本番デプロイ時のセキュリティヘッダチェックリスト
- セキュリティスキャン（securityheaders.com・Observatory by Mozilla）の結果を改善
- SPA（React・Vue.js）を含むページの CSP 設計
- ペネトレーションテストのレポートで指摘されたヘッダ不足の修正

## 参考文献

- [OWASP - HTTP Security Response Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html)
- [MDN - セキュリティ関連 HTTP ヘッダ](https://developer.mozilla.org/ja/docs/Web/HTTP/Headers#セキュリティ)
- [securityheaders.com - ヘッダスキャンツール](https://securityheaders.com/)
- [Mozilla Observatory](https://observatory.mozilla.org/)

<AffiliateBanner site="security_navi" />
