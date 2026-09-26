import AffiliateBanner from '@site/src/components/AffiliateBanner';

# VPN（IPsec・WireGuard）

## VPN とは

> VPN（Virtual Private Network）とはインターネットなどの公衆ネットワーク上に暗号化されたトンネルを構築して、遠隔地から社内ネットワークへのセキュアなアクセスや拠点間の安全な通信を実現する技術である。

VPN は「仮想的な専用線」を提供します。データはカプセル化されて暗号化されるため、盗聴・改ざんから保護されます。リモートワーク時の社内システムアクセス、複数拠点間の接続（サイト間 VPN）、パブリック Wi-Fi での通信保護などに利用されます。

IPsec（Internet Protocol Security）は IP レイヤ（L3）で動作する VPN プロトコルスイートです。IKE（Internet Key Exchange）で鍵交換を行い、ESP（Encapsulating Security Payload）でペイロードの暗号化と認証を行います。トンネルモードでは IP パケット全体をカプセル化し、新しい IP ヘッダを付けて送信します。サイト間 VPN やリモートアクセス VPN（IKEv2/IPsec）で広く使われます。

WireGuard は 2018年に登場したモダンな VPN プロトコルです。コードベースが約 4,000 行と小さく（OpenVPN の 1/100 以下）、暗号化に ChaCha20・Poly1305・Curve25519 を使います。設定がシンプルで、カーネル実装により高性能です。Linux カーネル 5.6 以降に標準組み込みされています。

## IPsec と WireGuard の比較

| 項目 | IPsec | WireGuard | OpenVPN |
|------|-------|-----------|---------|
| 動作レイヤ | L3（IP） | L3（IP） | L4（TLS over UDP/TCP） |
| 鍵交換 | IKEv1/v2 | Noise プロトコル | TLS |
| 暗号化 | AES-GCM 等 | ChaCha20-Poly1305 | AES-256-GCM 等 |
| コード量 | 大（数万行） | 小（~4,000行） | 中（数万行） |
| 設定の複雑さ | 高い | 低い | 中程度 |
| パフォーマンス | 高い | 非常に高い | 中程度 |
| ポート | UDP 500/4500 | UDP（任意） | UDP/TCP 1194 |

```python
import os
import hashlib
import hmac
import struct
from dataclasses import dataclass, field
from typing import Optional

# ===========================
# WireGuard の設定ファイルの概念的表現
# ===========================

WIREGUARD_SERVER_CONF = """
# /etc/wireguard/wg0.conf （サーバ設定例）

[Interface]
# サーバの秘密鍵
PrivateKey = <SERVER_PRIVATE_KEY>
# VPN インターフェースの IP アドレス
Address = 10.0.0.1/24
# 待受ポート
ListenPort = 51820
# VPN 起動時にルールを追加（NAT 設定）
PostUp   = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

[Peer]
# クライアント 1 の公開鍵
PublicKey = <CLIENT1_PUBLIC_KEY>
# このクライアントに割り当てる VPN IP
AllowedIPs = 10.0.0.2/32

[Peer]
# クライアント 2 の公開鍵
PublicKey = <CLIENT2_PUBLIC_KEY>
AllowedIPs = 10.0.0.3/32
"""

WIREGUARD_CLIENT_CONF = """
# /etc/wireguard/wg0.conf （クライアント設定例）

[Interface]
# クライアントの秘密鍵
PrivateKey = <CLIENT_PRIVATE_KEY>
# クライアントの VPN IP
Address = 10.0.0.2/24
# DNS サーバ（VPN 経由で使用）
DNS = 10.0.0.1

[Peer]
# サーバの公開鍵
PublicKey = <SERVER_PUBLIC_KEY>
# サーバのエンドポイント（インターネット側 IP:ポート）
Endpoint = vpn.example.com:51820
# VPN 経由でルーティングするアドレス範囲
# 0.0.0.0/0 は全トラフィックを VPN 経由に
AllowedIPs = 0.0.0.0/0, ::/0
# NAT 越えのためのキープアライブ
PersistentKeepalive = 25
"""


# ===========================
# IPsec IKEv2 ハンドシェイクの概念的シミュレーション
# ===========================

@dataclass
class IKEMessage:
    """IKE メッセージの簡易表現"""
    msg_type: str
    spi_i: bytes  # イニシエータ SPI
    spi_r: bytes  # レスポンダ SPI
    payloads: list[str] = field(default_factory=list)

    def __repr__(self):
        spi_i_hex = self.spi_i.hex()[:8]
        spi_r_hex = self.spi_r.hex()[:8] if self.spi_r else "00000000"
        return (f"IKE({self.msg_type}, SPIi={spi_i_hex}, SPIr={spi_r_hex}, "
                f"payloads={self.payloads})")


def simulate_ikev2_handshake():
    """IKEv2 ハンドシェイクのシミュレーション"""
    print("[IKEv2 ハンドシェイク（サイト間 VPN）]")

    # IKE_SA_INIT: SA（セキュリティアソシエーション）のネゴシエーション
    spi_i = os.urandom(8)

    msg1 = IKEMessage(
        msg_type="IKE_SA_INIT (Initiator→Responder)",
        spi_i=spi_i, spi_r=b"\x00" * 8,
        payloads=["SA（暗号スイート提案: AES-256-GCM, SHA-384）",
                  "KE（Diffie-Hellman 公開値）",
                  "Ni（ノンス）"]
    )
    print(f"  1. {msg1}")

    spi_r = os.urandom(8)
    msg2 = IKEMessage(
        msg_type="IKE_SA_INIT (Responder→Initiator)",
        spi_i=spi_i, spi_r=spi_r,
        payloads=["SA（選択された暗号スイート）",
                  "KE（DH 公開値）",
                  "Nr（ノンス）"]
    )
    print(f"  2. {msg2}")
    print(f"     → 共有鍵生成: DH 交換で IKE_SA 鍵マテリアルを導出")

    # IKE_AUTH: 認証
    msg3 = IKEMessage(
        msg_type="IKE_AUTH (Initiator→Responder, 暗号化済み)",
        spi_i=spi_i, spi_r=spi_r,
        payloads=["IDi（イニシエータ識別子: ホスト名/IP）",
                  "CERT（証明書）",
                  "AUTH（署名）",
                  "SA（Child SA: ESP 設定）",
                  "TSi/TSr（トラフィックセレクタ: 対象 IP 範囲）"]
    )
    print(f"  3. {msg3}")

    msg4 = IKEMessage(
        msg_type="IKE_AUTH (Responder→Initiator, 暗号化済み)",
        spi_i=spi_i, spi_r=spi_r,
        payloads=["IDr（レスポンダ識別子）",
                  "CERT（証明書）",
                  "AUTH（署名）",
                  "SA（Child SA: 合意済み）",
                  "TSi/TSr（合意済みトラフィックセレクタ）"]
    )
    print(f"  4. {msg4}")
    print(f"     → IPsec ESP トンネル確立完了")


# ===========================
# VPN トンネルのパケットカプセル化デモ
# ===========================

def demonstrate_tunneling():
    print("\n[IPsec トンネルモード: パケットカプセル化]")
    original_packet = {
        "ip_src": "192.168.1.10",  # 社内 PC
        "ip_dst": "192.168.2.20",  # 遠隔拠点サーバ
        "protocol": "TCP",
        "data": "GET /api/data HTTP/1.1",
    }
    print(f"  元のパケット: {original_packet}")

    esp_packet = {
        "outer_ip_src": "203.0.113.1",   # VPN GW A（インターネット側）
        "outer_ip_dst": "198.51.100.1",  # VPN GW B（インターネット側）
        "protocol": "ESP",
        "spi": "0xABCD1234",
        "seq_no": 42,
        "payload": "[暗号化済み: 元の IP パケット全体]",
        "icv": "[認証タグ（改ざん検知）]",
    }
    print(f"  ESPカプセル化: {esp_packet}")
    print(f"  → インターネット上では外部IPのみ見え、内部は暗号化されている")


print("=== VPN（IPsec・WireGuard）デモ ===\n")
simulate_ikev2_handshake()
demonstrate_tunneling()

print("\n[WireGuard 設定例]")
print("  サーバ設定（抜粋）:")
for line in WIREGUARD_SERVER_CONF.strip().split("\n")[:12]:
    print(f"    {line}")
```

## 使用場面

- リモートワーク中に社内ネットワーク（開発環境・社内システム）へセキュアにアクセスする場面
- 複数オフィス・データセンター拠点間をサイト間 VPN で安全に接続する場面
- クラウド VPC と自社データセンターを IPsec VPN で接続するハイブリッドクラウド構成を実現する場面

## 参考文献

- [RFC 7296 – IKEv2](https://www.rfc-editor.org/rfc/rfc7296)
- [WireGuard – Conceptual Overview](https://www.wireguard.com/protocol/)
- [RFC 4303 – IP Encapsulating Security Payload (ESP)](https://www.rfc-editor.org/rfc/rfc4303)

<AffiliateBanner site="network_navi" />
