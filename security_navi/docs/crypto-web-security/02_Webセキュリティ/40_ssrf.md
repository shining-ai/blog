import AffiliateBanner from '@site/src/components/AffiliateBanner';

# SSRF（サーバサイドリクエストフォージェリ）

## SSRF とは

> SSRF（Server-Side Request Forgery）は、攻撃者がサーバに対して任意の URL へのリクエストを発生させる脆弱性であり、クラウド環境のメタデータサービスへのアクセスや、ファイアウォールの内側にある内部サービスへの不正アクセスを引き起こす。

SSRF は OWASP Top 10 2021 において初めて独立した項目（A10）として登録された。クラウド環境（AWS・GCP・Azure）ではインスタンスメタデータサービス（IMDS）が存在し、SSRF 経由で IAM クレデンシャル（アクセスキー）が窃取されると、クラウドアカウント全体の乗っ取りにつながる重大な事故となりうる。

**典型的な SSRF の発生パターン：**
- URL を入力として受け取り、サーバ側でそのコンテンツを取得する機能（URLプレビュー、Webhook、PDF 生成）
- 画像の URL を指定してサーバ側でダウンロードする機能
- XMLやJSON にURLを含め、サーバ側で解決させる仕組み（SSRF の盲点になりやすい）

**攻撃ターゲットの例：**
- `http://169.254.169.254/latest/meta-data/iam/security-credentials/` （AWS IMDS）
- `http://localhost:6379/`（内部の Redis サーバ）
- `http://10.0.0.1/admin`（内部管理画面）
- `file:///etc/passwd`（ローカルファイル読み取り）

**Blind SSRF：**
レスポンス内容がアプリに反映されない場合でも、外部の DNS サーバや HTTP サーバへのアウトバウンドリクエストを観測することで脆弱性の存在を確認できる。

## SSRF 防御手段の比較

| 防御手段 | 概要 | 効果 |
|---------|------|------|
| 許可リスト（Allowlist）| 接続先を事前登録済みのホストのみに制限 | 最も高い |
| ネットワーク分離 | アプリサーバを内部ネットワークから分離 | 高い |
| IMDS v2 の強制（AWS）| IMDSv2 はトークンが必要で SSRF に対して強い | 高い（クラウド） |
| 拒否リスト（Blocklist）| プライベート IP・169.254.x.x を拒否 | 低〜中（迂回されやすい）|
| リダイレクトの追跡禁止 | オープンリダイレクトによる拒否リスト迂回を防ぐ | 補助的 |

```python
import ipaddress
import urllib.parse
import socket
import re

# === SSRF 防御: URL の厳格な検証 ===

ALLOWED_HOSTS = {"api.external-partner.example.com", "cdn.example.com"}
ALLOWED_SCHEMES = {"https"}

def is_private_ip(ip_str: str) -> bool:
    """プライベートアドレス・リンクローカルアドレスをチェック"""
    try:
        ip = ipaddress.ip_address(ip_str)
        return (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local      # 169.254.x.x（AWS IMDS など）
            or ip.is_multicast
            or ip.is_reserved
        )
    except ValueError:
        return True  # パース失敗は拒否

def validate_url_for_fetch(url: str) -> tuple[bool, str]:
    """
    SSRF 対策: サーバ側でフェッチする URL の検証
    戻り値: (is_safe, reason)
    """
    # スキームの確認
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ALLOWED_SCHEMES:
        return False, f"許可されていないスキーム: {parsed.scheme}"

    hostname = parsed.hostname
    if not hostname:
        return False, "ホスト名が不正"

    # 許可リストによる検証（推奨）
    if hostname not in ALLOWED_HOSTS:
        return False, f"許可されていないホスト: {hostname}"

    # DNS 解決後の IP アドレスを検証（DNS リバインディング対策）
    try:
        ip_str = socket.gethostbyname(hostname)
        if is_private_ip(ip_str):
            return False, f"内部 IP への接続は禁止: {ip_str}"
    except socket.gaierror:
        return False, "DNS 解決失敗"

    return True, "OK"

# テスト
test_urls = [
    "https://api.external-partner.example.com/data",  # 許可
    "http://169.254.169.254/latest/meta-data/",       # AWS IMDS (禁止)
    "https://localhost/admin",                          # ループバック (禁止)
    "file:///etc/passwd",                              # file スキーム (禁止)
    "https://evil.example.com/",                       # 許可リスト外 (禁止)
]

for url in test_urls:
    safe, reason = validate_url_for_fetch(url)
    status = "SAFE" if safe else "BLOCKED"
    print(f"[{status}] {url[:55]:<55} | {reason}")

print("""
重要な注意事項:
- 拒否リストではなく許可リストを使うこと（拒否リストは迂回されやすい）
- DNS 解決後の IP アドレスも検証すること（DNS リバインディング対策）
- リダイレクトを追跡する場合はリダイレクト先の URL も同様に検証すること
- AWS では IMDSv2 を強制し、インスタンスに必要最小限の IAM ロールのみ付与すること
""")
```

## 使用場面

- URL を受け取ってコンテンツを取得するあらゆる機能の設計（Webhook・OGP 取得・PDF 変換）
- クラウド環境（AWS/GCP/Azure）でのメタデータサービスへのアクセス制御
- ゼロトラストアーキテクチャにおけるアウトバウンドネットワーク制御
- ペネトレーションテストでの SSRF 検証（Burp Suite Collaborator の活用）

## 参考文献

- [OWASP - SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [AWS - IMDSv2 のセキュリティ強化](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html)
- [PortSwigger - SSRF 解説](https://portswigger.net/web-security/ssrf)
- [CWE-918: Server-Side Request Forgery (SSRF)](https://cwe.mitre.org/data/definitions/918.html)

<AffiliateBanner site="security_navi" />
