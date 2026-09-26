import AffiliateBanner from '@site/src/components/AffiliateBanner';

# XSS（クロスサイトスクリプティング）（防御方法中心）

## XSS とは

> XSS（Cross-Site Scripting）は、攻撃者が悪意のあるスクリプトを Webページに埋め込み、他のユーザーのブラウザ上で実行させることで、セッション情報の窃取・フィッシング・マルウェア配布などを引き起こす脆弱性である。

XSS は OWASP Top 10 の常連で、サニタイズされていないユーザー入力が HTML に出力される場合に発生する。攻撃者のスクリプトが被害者のブラウザで実行されるため、同一オリジンポリシーを迂回して Cookie・セッショントークン・個人情報を盗み出せる。

**XSS の三種類：**
- **反射型（Reflected）**：悪意のある URL をクリックすると、入力がそのままレスポンスに反射されてスクリプトが実行される。1回限りの攻撃
- **蓄積型（Stored / Persistent）**：悪意のある入力がDB に保存され、閲覧したすべてのユーザーで実行される。影響が最大
- **DOM ベース**：サーバを介さず、クライアントサイドの JavaScript が `location.hash` などの攻撃者制御の値をDOMに書き込む

**攻撃の影響：**
- Cookie（セッショントークン）の窃取 → アカウント乗っ取り
- フォームへの偽ボタン挿入によるフィッシング
- キーロガーや画面キャプチャーの埋め込み
- CSRF トークンの読み取りによる CSRF 攻撃

**根本原因：**
ユーザー入力を HTML コンテキストで適切にエスケープせずに出力することが根本原因である。

## XSS の種類と防御手段

| 種類 | 発生場所 | 主な防御策 |
|------|---------|-----------|
| 反射型 | サーバサイドのレスポンス | 出力エスケープ、入力バリデーション |
| 蓄積型 | DB 保存 → レスポンス | 出力エスケープ（保存時でなく出力時） |
| DOM ベース | クライアントサイド JS | innerHTML の回避、textContent の使用 |

```python
# === XSS 防御の実装例（Python / Jinja2）===
import html
import re
from markupsafe import Markup, escape  # Jinja2/Flask で使用

# 防御策1: HTML エスケープ（最重要）
def safe_html_output(user_input: str) -> str:
    """
    ユーザー入力を HTML 特殊文字をエスケープして出力
    < → &lt;  > → &gt;  & → &amp;  " → &quot;  ' → &#x27;
    """
    return html.escape(user_input, quote=True)

# 防御策2: コンテキストに応じたエスケープ
def escape_for_context(value: str, context: str) -> str:
    """
    出力コンテキストによってエスケープ方法が異なる
    """
    if context == "html":
        return html.escape(value, quote=True)
    elif context == "js_string":
        # JavaScript 文字列内への埋め込み（シングルクォートをエスケープ）
        return value.replace("\\", "\\\\").replace("'", "\\'").replace('"', '\\"')
    elif context == "url":
        import urllib.parse
        return urllib.parse.quote(value, safe="")
    elif context == "css":
        # CSS 値への埋め込みは基本的に避ける
        return re.sub(r'[^a-zA-Z0-9\-]', '', value)
    return value

# 使用例
xss_payload = '<script>alert("XSS")</script>'
print(f"生の入力: {xss_payload}")
print(f"エスケープ後: {safe_html_output(xss_payload)}")

# 防御策3: Content Security Policy (CSP) ヘッダ
csp_header_example = """
# インラインスクリプトを禁止し、nonce ベースの CSP を使用
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{RANDOM_NONCE}';
  style-src 'self' 'nonce-{RANDOM_NONCE}';
  img-src 'self' data: https:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
"""

# 防御策4: HttpOnly・SameSite Cookie フラグ
cookie_security = """
# セッション Cookie に HttpOnly を設定して JavaScript からのアクセスを禁止
Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Strict; Path=/
# HttpOnly: document.cookie で読み取れない（XSS でのセッション盗取を防止）
# Secure: HTTPS のみで送信
# SameSite=Strict: クロスサイトリクエストでは送信されない
"""

# 防御策5: DOM ベース XSS 対策（JavaScript）
dom_xss_defense = """
// 【悪い例】innerHTML は XSS を引き起こす
element.innerHTML = userInput;  // 危険！

// 【良い例】textContent はテキストとして扱われ XSS が発生しない
element.textContent = userInput;  // 安全

// 【良い例】DOM API でノードを作成する
const text = document.createTextNode(userInput);
element.appendChild(text);  // 安全
"""

print("\nCSP ヘッダ設定例:")
print(csp_header_example)
print("\nDOM XSS 対策:")
print(dom_xss_defense)
```

## 使用場面

- ユーザー生成コンテンツ（コメント・プロフィール・投稿）を表示するページの実装
- テンプレートエンジンでの出力時の自動エスケープが有効化されているかの確認
- CSP ヘッダの設計と nonce ベースのスクリプト許可リストの管理
- DOM 操作を行う JavaScript コードのセキュリティレビュー

## 参考文献

- [OWASP - XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP - DOM-based XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html)
- [MDN - Content Security Policy (CSP)](https://developer.mozilla.org/ja/docs/Web/HTTP/CSP)
- [CWE-79: Improper Neutralization of Input During Web Page Generation](https://cwe.mitre.org/data/definitions/79.html)

<AffiliateBanner site="security_navi" />
