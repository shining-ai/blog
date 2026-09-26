import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 典型的な Web 問題の学び方（教育目的）

## CTF の Web カテゴリとは

> CTF の Web カテゴリは、実際の Web アプリケーション脆弱性（SQL インジェクション・XSS・SSRF・認証バイパスなど）を問題として実装した環境を提供し、攻撃者視点でフラグを取得することで OWASP Top 10 の技術を実践的に習得できるカテゴリである。

Web カテゴリは CTF の中で最も入門しやすく、実際の Web 開発・セキュリティ診断に直結する知識が得られる。PortSwigger Web Security Academy などの学習プラットフォームと組み合わせることで、系統的にスキルアップできる。

**よく出題される脆弱性（CTF Web）：**
- SQL インジェクション（認証バイパス・Union-based・Blind）
- XSS（Stored / Reflected / DOM-based）
- SSRF（内部サービスへのアクセス）
- IDOR・権限昇格（認可の欠如）
- JWT の脆弱な実装（alg:none・弱い秘密鍵）
- XXE・SSTI（テンプレートインジェクション）
- パス・トラバーサル
- ソースコード漏洩（.git・robots.txt・バックアップファイル）

## 解法アプローチの分類

| 脆弱性種別 | 確認する場所 | 使うツール | 防御策 |
|-----------|------------|----------|--------|
| SQL インジェクション | ログイン・検索フォーム | Burp Suite・sqlmap（学習のみ）| プリペアドステートメント |
| XSS | 入力フォーム・URL パラメータ | Burp Suite・ブラウザ | Content-Security-Policy |
| SSRF | URL 指定パラメータ | curl・Burp Suite | 送信先のホワイトリスト化 |
| JWT 脆弱性 | Authorization ヘッダ | jwt.io・python-jwt | 適切なアルゴリズムと秘密鍵 |
| IDOR | リソース ID（数字・UUID） | Burp Intruder / Repeater | サーバサイド認可チェック |

```python
# CTF Web 問題の典型的な調査スクリプト（教育目的）
# 許可された CTF 環境・学習プラットフォームのみで使用すること

import requests
from urllib.parse import urljoin

# ===================================================
# 教育目的のスクリプト例
# これらのテクニックは自分が管理する環境または
# 許可された CTF プラットフォームでのみ使用すること
# ===================================================


def check_common_hidden_files(base_url: str) -> list[str]:
    """
    よくある情報漏洩ファイルの存在確認。
    ソースコード・バックアップ・設定ファイルが公開されていないかチェックする。
    CTF では .git/ が公開されてソースコードを取得できることが多い。
    """
    paths_to_check = [
        "/.git/HEAD",           # Git リポジトリの公開
        "/robots.txt",          # 非公開パスのヒント
        "/.env",                # 環境変数（秘密鍵・DB パスワード）
        "/backup.zip",          # バックアップファイル
        "/source.zip",          # ソースコード
        "/config.php.bak",      # 設定ファイルのバックアップ
        "/README.md",           # 開発情報
        "/phpinfo.php",         # PHP の設定情報
        "/.DS_Store",           # macOS のディレクトリ情報
    ]

    found = []
    for path in paths_to_check:
        try:
            url = urljoin(base_url, path)
            resp = requests.get(url, timeout=5, allow_redirects=False)
            if resp.status_code == 200:
                found.append(f"[200 OK] {url}  ({len(resp.content)} bytes)")
        except requests.exceptions.RequestException:
            pass
    return found


def check_jwt_vulnerabilities(token: str) -> dict:
    """
    JWT トークンの一般的な脆弱性パターンを確認する。
    CTF では alg:none や弱い HS256 鍵が多い。
    """
    import base64
    import json

    result = {"issues": [], "decoded": {}}

    try:
        parts = token.split(".")
        if len(parts) != 3:
            result["issues"].append("JWT の形式が不正（3パートではない）")
            return result

        # ヘッダとペイロードをデコード（パディング追加）
        header = json.loads(base64.b64decode(parts[0] + "=="))
        payload = json.loads(base64.b64decode(parts[1] + "=="))

        result["decoded"] = {"header": header, "payload": payload}

        # 脆弱性チェック
        alg = header.get("alg", "").lower()
        if alg == "none":
            result["issues"].append("[Critical] alg:none - 署名検証が無効化されている")
        elif alg in ("hs256", "hs512"):
            result["issues"].append(f"[Medium] {alg} - 秘密鍵のブルートフォースが可能な可能性")

        # 有効期限の確認
        exp = payload.get("exp")
        if exp is None:
            result["issues"].append("[Low] exp（有効期限）が設定されていない")

    except Exception as e:
        result["issues"].append(f"デコードエラー: {e}")

    return result


# 典型的な CTF Web 問題の解法パターン
print("=== CTF Web 問題の典型的な解法パターン ===\n")

solution_patterns = {
    "SQL インジェクション（認証バイパス）": [
        "Burp Repeater でログインリクエストをキャプチャ",
        "username フィールドに ' を入力して SQL エラーを確認",
        "' OR '1'='1'-- のパターンで認証バイパスを試みる",
        "Union ベースで SELECT 1,2,3-- のカラム数を探索",
    ],
    "JWT の alg:none 攻撃": [
        "Cookie / Authorization ヘッダから JWT を取得",
        "Base64 デコードしてヘッダを確認（jwt.io が便利）",
        "alg を 'none' に変更してペイロード（role 等）を改ざん",
        "署名部分を空にして再エンコードして送信",
    ],
    "IDOR（権限昇格）": [
        "自分のリソースの ID（/api/user/123）を確認",
        "ID を変化させて他ユーザーのデータにアクセスできるか試す",
        "Burp Intruder で ID の範囲をブルートフォース",
        "UUID の場合はソースコードや API レスポンスから有効な ID を探す",
    ],
    "ソースコード漏洩（.git）": [
        "/.git/HEAD が 200 OK か確認",
        "git-dumper や GitTools でリポジトリを復元",
        "git log でコミット履歴を確認（フラグが過去コミットにある場合も）",
        "git show で各コミットの差分を確認",
    ],
}

for pattern, steps in solution_patterns.items():
    print(f"[{pattern}]")
    for i, step in enumerate(steps, 1):
        print(f"  {i}. {step}")
    print()

# テスト用（localhost の学習環境に対して実行）
# found = check_common_hidden_files("http://localhost:8080")
# for f in found:
#     print(f)
```

## 使用場面

- PortSwigger Web Security Academy のラボ問題で技術を習得する（無料）
- OWASP WebGoat・DVWA などの脆弱な Web アプリで手を動かして学習
- picoCTF・CTFtime の Web 問題でフラグ取得を実践する
- Burp Suite の基本操作（リクエスト編集・Repeater・Intruder）を習熟する
- 社内 Web アプリのセキュリティレビューで学んだ技術を防御に活かす

## 参考文献

- [PortSwigger Web Security Academy](https://portswigger.net/web-security) — 無料・超高品質な Web セキュリティ学習
- [OWASP WebGoat](https://owasp.org/www-project-webgoat/) — 故意に脆弱な Web アプリ
- [HackTheBox Web Challenges](https://www.hackthebox.com/)
- [CTF Field Guide - Web](https://trailofbits.github.io/ctf/web/)

<AffiliateBanner site="security_navi" />
