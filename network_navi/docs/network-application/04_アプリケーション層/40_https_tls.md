---
title: HTTPS と TLS ハンドシェイク
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# HTTPS と TLS ハンドシェイク

## HTTPS / TLS とは

> HTTPS は HTTP を TLS（Transport Layer Security）で暗号化したプロトコル。TLS は機密性・完全性・認証の 3 つを提供し、TCP 接続確立後にハンドシェイクを実施して暗号化通信を確立する

TLS（RFC 8446）は SSL の後継プロトコルで、現在の標準は TLS 1.3 です。HTTPS（HTTP over TLS）はポート 443 で動作し、証明書による認証・通信の暗号化・改ざん検出を提供します。現代では HTTPS は Web の標準となっており、ブラウザはパスワードやクレジットカード情報を送信するページで HTTP を警告対象としています。

TLS 1.3 のハンドシェイクは TLS 1.2 の 2 RTT から 1 RTT に短縮されました。クライアントは最初のメッセージで鍵交換（Key Share）も送信するため、サーバはすぐに暗号化データを返せます。また古い脆弱な暗号スイートが廃止され、前方秘匿性（Perfect Forward Secrecy）が必須となりました。

TLS の主な構成要素は「証明書（公開鍵インフラ）」「鍵交換」「対称暗号」「メッセージ認証コード（MAC）」です。X.509 証明書に含まれる公開鍵を使い、認証局（CA）の署名で正当性を確認します。

## TLS 1.3 ハンドシェイクの流れ

| ステップ | 方向 | 内容 |
|----------|------|------|
| ClientHello | → | TLS バージョン、サポート暗号スイート、Key Share |
| ServerHello + EncryptedExtensions + Certificate + CertificateVerify + Finished | ← | サーバ鍵共有、証明書、署名 |
| Finished | → | クライアント確認、アプリデータ開始 |
| (合計 1 RTT) | | |

## TLS 1.2 vs TLS 1.3 の比較

| 項目 | TLS 1.2 | TLS 1.3 |
|------|---------|---------|
| ハンドシェイク RTT | 2 RTT | 1 RTT |
| 0-RTT | なし | あり（セッション再開） |
| 鍵交換 | RSA or DHE/ECDHE | ECDHE のみ（DHE も可） |
| 前方秘匿性 | オプション | 必須 |
| 廃止された機能 | — | RC4, DES, MD5, SHA1, 静的 RSA 鍵交換 |
| 暗号スイート | 多数（脆弱なものも） | 5 種類（AES-GCM, ChaCha20-Poly1305 等） |

```python
from dataclasses import dataclass, field
from typing import Optional
import hashlib, secrets, struct

@dataclass
class TLSCipherSuite:
    name: str
    key_exchange: str
    encryption: str
    mac: str
    pfs: bool  # 前方秘匿性

TLS13_CIPHER_SUITES = [
    TLSCipherSuite("TLS_AES_256_GCM_SHA384",       "ECDHE", "AES-256-GCM",      "SHA-384", True),
    TLSCipherSuite("TLS_AES_128_GCM_SHA256",       "ECDHE", "AES-128-GCM",      "SHA-256", True),
    TLSCipherSuite("TLS_CHACHA20_POLY1305_SHA256",  "ECDHE", "ChaCha20-Poly1305","SHA-256", True),
]

@dataclass
class TLSHandshakeSimulator:
    """TLS 1.3 ハンドシェイクのシミュレーション"""

    def client_hello(self) -> dict:
        """ClientHello: クライアントが送信する最初のメッセージ"""
        client_random = secrets.token_bytes(32)
        client_key_share = secrets.token_bytes(32)  # 実際は ECDH 公開鍵
        msg = {
            "type": "ClientHello",
            "tls_versions": ["TLS 1.3", "TLS 1.2"],
            "random": client_random.hex()[:16] + "...",
            "cipher_suites": [cs.name for cs in TLS13_CIPHER_SUITES],
            "extensions": {
                "server_name": "example.com",       # SNI
                "supported_groups": ["x25519", "P-256"],
                "key_share": {"x25519": client_key_share.hex()[:16] + "..."},
                "signature_algorithms": ["ecdsa_secp256r1_sha256", "rsa_pss_sha256"],
            }
        }
        print(f"  → ClientHello: cipher_suites={len(msg['cipher_suites'])}個, "
              f"SNI={msg['extensions']['server_name']}")
        return msg

    def server_hello(self, client_hello: dict) -> dict:
        """ServerHello: サーバが選択した暗号スイートと鍵共有"""
        server_random = secrets.token_bytes(32)
        server_key_share = secrets.token_bytes(32)  # ECDH 公開鍵
        chosen = TLS13_CIPHER_SUITES[0]
        msg = {
            "type": "ServerHello",
            "tls_version": "TLS 1.3",
            "random": server_random.hex()[:16] + "...",
            "cipher_suite": chosen.name,
            "extensions": {
                "key_share": {"x25519": server_key_share.hex()[:16] + "..."},
            }
        }
        print(f"  ← ServerHello: cipher_suite={chosen.name}")
        return msg

    def encrypted_extensions_and_cert(self, server_name: str):
        """EncryptedExtensions + Certificate + CertificateVerify（暗号化済み）"""
        print(f"  ← EncryptedExtensions: max_fragment_length など")
        print(f"  ← Certificate: {server_name} の X.509 証明書（CA 署名済み）")
        print(f"  ← CertificateVerify: サーバ秘密鍵による署名")
        print(f"  ← Finished: ハンドシェイクの HMAC")

    def client_finished(self):
        print(f"  → Finished: ハンドシェイク完了確認")
        print(f"  → Application Data: HTTP リクエスト（暗号化済み）")

    def simulate(self):
        print("=== TLS 1.3 ハンドシェイク（1 RTT） ===\n")
        print("[TCP 接続確立（1 RTT）]")
        print("  → SYN / ← SYN-ACK / → ACK\n")

        print("[TLS ハンドシェイク（1 RTT）]")
        ch = self.client_hello()
        sh = self.server_hello(ch)
        sni = ch["extensions"]["server_name"]
        self.encrypted_extensions_and_cert(sni)
        self.client_finished()

        print("\n[セッション確立後の通信]")
        print("  対称鍵暗号（AES-256-GCM）でデータを暗号化")
        print("  AEAD により暗号化と改ざん検出を同時実現")
        print(f"\n  選択暗号スイート: {TLS13_CIPHER_SUITES[0].name}")
        print(f"  前方秘匿性(PFS): {TLS13_CIPHER_SUITES[0].pfs}")

def show_certificate_chain():
    print("\n=== X.509 証明書チェーン ===")
    chain = [
        ("Root CA",         "DigiCert Global Root G3",  "自己署名（信頼の起点）"),
        ("Intermediate CA", "DigiCert TLS RSA4096",     "ルート CA が署名"),
        ("End-Entity",      "example.com",              "中間 CA が署名"),
    ]
    for i, (role, name, note) in enumerate(chain):
        indent = "  " * i
        print(f"  {indent}[{role}] {name}")
        print(f"  {indent}  → {note}")

simulator = TLSHandshakeSimulator()
simulator.simulate()
show_certificate_chain()
```

## 使用場面

- Let's Encrypt + Certbot でサーバ証明書を自動取得・更新して HTTPS を有効化する際に
- `openssl s_client -connect example.com:443` で証明書の有効期限・TLS バージョン・暗号スイートを確認する際に
- HSTS（HTTP Strict Transport Security）を設定してブラウザに常に HTTPS を強制する際に

## 参考文献

- [RFC 8446 – The Transport Layer Security (TLS) Protocol Version 1.3](https://www.rfc-editor.org/rfc/rfc8446)
- [Cloudflare – What is TLS?](https://www.cloudflare.com/learning/ssl/transport-layer-security-tls/)
- [Let's Encrypt – How It Works](https://letsencrypt.org/how-it-works/)

<AffiliateBanner site="network_navi" />
