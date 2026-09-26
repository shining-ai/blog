import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 証明書の検証チェーン

## 証明書チェーンとは

> 証明書チェーン（Certificate Chain）は、エンドエンティティ証明書から中間 CA を経由してルート CA までの署名の連鎖であり、ブラウザやクライアントはこのチェーンを辿って証明書の信頼性を検証する。

証明書単体を信頼するには「その証明書に署名した CA が信頼できるか」を確認する必要がある。ルート CA はブラウザや OS にプレインストールされたトラストストアに含まれており、チェーンの最終的な信頼の根拠となる。

**証明書チェーンの構造：**
```
[Root CA]
  └── 署名 → [Intermediate CA 1]
                └── 署名 → [Intermediate CA 2]（省略の場合もある）
                              └── 署名 → [End-Entity 証明書]
                                            (example.com)
```

**検証プロセス：**
1. サーバから証明書とチェーン（中間 CA 証明書）を受け取る
2. 各証明書の署名を上位の CA 公開鍵で検証
3. 最上位の発行者がトラストストア内の Root CA であることを確認
4. 有効期間・用途制限・失効状態を確認

**一般的な失敗の原因：**
- 中間 CA 証明書の送信忘れ（"incomplete chain"）
- 証明書の有効期限切れ
- SAN（Subject Alternative Name）にドメインが含まれていない
- 証明書が失効している（CRL/OCSP で確認）

**証明書の透明性（Certificate Transparency: CT）：**Google が推進する仕組みで、全 CA が発行した証明書を公開ログに記録する。不正に発行された証明書の検出に使われ、Chrome は CT ログへの記録を必須要件としている。

## 証明書チェーン検証の手順

| ステップ | 確認内容 | 失敗時の挙動 |
|---------|---------|------------|
| 1 | 証明書の有効期間 | 接続エラー |
| 2 | SAN にホスト名が含まれるか | 証明書名不一致エラー |
| 3 | 各証明書の署名の正当性 | 接続エラー |
| 4 | チェーンがトラストストアのRootCAに到達するか | 不明な CA エラー |
| 5 | 失効状態（OCSP/CRL） | 警告または接続拒否 |
| 6 | 鍵用途（Key Usage, EKU）の確認 | 接続エラー |

```python
import ssl
import socket
from cryptography import x509
from cryptography.hazmat.backends import default_backend
from cryptography.x509.oid import ExtendedKeyUsageOID
import datetime

def get_cert_chain(hostname: str, port: int = 443) -> list:
    """指定ホストの証明書チェーンを取得する"""
    context = ssl.create_default_context()
    conn = context.wrap_socket(
        socket.create_connection((hostname, port), timeout=5),
        server_hostname=hostname
    )
    # DER 形式の証明書チェーン
    der_chain = conn.get_verified_chain()
    conn.close()

    return [
        x509.load_der_x509_certificate(der, default_backend())
        for der in der_chain
    ]

def analyze_cert(cert: x509.Certificate, depth: int):
    """証明書の主要情報を表示"""
    print(f"\n{'  ' * depth}[Depth {depth}]")
    print(f"{'  ' * depth}  Subject: {cert.subject.rfc4514_string()}")
    print(f"{'  ' * depth}  Issuer:  {cert.issuer.rfc4514_string()}")
    print(f"{'  ' * depth}  Valid:   {cert.not_valid_before_utc.date()} 〜 {cert.not_valid_after_utc.date()}")

    # 有効期限チェック
    now = datetime.datetime.now(datetime.timezone.utc)
    days_left = (cert.not_valid_after_utc - now).days
    status = "期限切れ" if days_left < 0 else f"残り{days_left}日"
    print(f"{'  ' * depth}  期限状態: {status}")

    # CA かどうか確認
    try:
        bc = cert.extensions.get_extension_for_class(x509.BasicConstraints)
        print(f"{'  ' * depth}  CA証明書: {bc.value.ca}")
    except x509.ExtensionNotFound:
        pass

    # SAN の表示（エンドエンティティ証明書）
    try:
        san = cert.extensions.get_extension_for_class(x509.SubjectAlternativeName)
        domains = san.value.get_values_for_type(x509.DNSName)
        if domains:
            print(f"{'  ' * depth}  SAN(DNS): {', '.join(domains[:3])}{'...' if len(domains) > 3 else ''}")
    except x509.ExtensionNotFound:
        pass

# 実際の証明書チェーン取得（テスト）
hostname = "example.com"
try:
    chain = get_cert_chain(hostname)
    print(f"=== {hostname} の証明書チェーン ===")
    print(f"チェーン長: {len(chain)} 証明書")
    for i, cert in enumerate(chain):
        analyze_cert(cert, i)
except Exception as e:
    print(f"接続エラー（ネットワーク環境に依存）: {e}")
    print("オフライン環境では openssl コマンドで確認:")
    print(f"  openssl s_client -connect {hostname}:443 -showcerts < /dev/null")
```

## 使用場面

- CI/CD パイプラインでの証明書有効期限監視（期限切れによる障害を防ぐ）
- クライアント証明書（mTLS）によるサービス間認証の設定
- 自社内 PKI（プライベート CA）の構築と運用
- 証明書ピニング（Certificate Pinning）によるフィッシング防止

## 参考文献

- [RFC 5280 - Internet X.509 PKI Certificate and CRL Profile](https://www.rfc-editor.org/rfc/rfc5280)
- [Certificate Transparency - RFC 9162](https://www.rfc-editor.org/rfc/rfc9162)
- [OCSP Must-Staple Extension - RFC 7633](https://www.rfc-editor.org/rfc/rfc7633)

<AffiliateBanner site="security_navi" />
