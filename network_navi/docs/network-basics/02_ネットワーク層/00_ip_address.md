---
title: IP アドレスとサブネットマスク
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# IP アドレスとサブネットマスク

## IP アドレスとは

> インターネット上の機器を識別するための論理アドレスで、IPv4 は 32 ビット・IPv6 は 128 ビットで表される

IP（Internet Protocol）アドレスはネットワーク層でホストを識別するアドレスです。IPv4 では 32 ビットを 8 ビットずつ 4 つに区切り、ドット区切りの 10 進数（例: 192.168.1.1）で表します。

サブネットマスクは IP アドレスの「ネットワーク部」と「ホスト部」を区別するための 32 ビット値です。CIDR 表記では `/24`（255.255.255.0）のように連続した 1 のビット数でサブネットを表します。

## IP アドレスのクラスと CIDR

| CIDR | サブネットマスク | ホスト数 | 用途 |
|------|---------------|---------|------|
| /8   | 255.0.0.0     | 16,777,214 | クラス A |
| /16  | 255.255.0.0   | 65,534 | クラス B |
| /24  | 255.255.255.0 | 254 | クラス C（LAN でよく使う） |
| /30  | 255.255.255.252 | 2 | ルータ間ポイントツーポイント |
| /32  | 255.255.255.255 | 1 | ホスト単体指定 |

## プライベート IP アドレス範囲

| 範囲 | CIDR | 用途 |
|------|------|------|
| 10.0.0.0 〜 10.255.255.255 | 10.0.0.0/8 | 大規模プライベート |
| 172.16.0.0 〜 172.31.255.255 | 172.16.0.0/12 | 中規模プライベート |
| 192.168.0.0 〜 192.168.255.255 | 192.168.0.0/16 | 家庭・小規模 LAN |

```python
import ipaddress

def analyze_network(cidr: str) -> None:
    """IP アドレスとサブネットの情報を分析する"""
    net = ipaddress.IPv4Network(cidr, strict=False)
    addr = ipaddress.IPv4Address(cidr.split("/")[0])

    print(f"=== {cidr} の解析 ===")
    print(f"ネットワークアドレス : {net.network_address}")
    print(f"ブロードキャスト     : {net.broadcast_address}")
    print(f"サブネットマスク     : {net.netmask}")
    print(f"ワイルドカードマスク : {net.hostmask}")
    print(f"利用可能ホスト数     : {net.num_addresses - 2}")
    print(f"ホストアドレス範囲   : {net.network_address + 1} 〜 {net.broadcast_address - 1}")
    print(f"入力 IP のネットワーク部: {int(addr) & int(net.netmask):032b}")[:10]
    print(f"プライベートアドレス : {addr.is_private}")
    print()

def subnet_divide(network: str, new_prefix: int) -> None:
    """ネットワークをサブネット分割する"""
    net = ipaddress.IPv4Network(network)
    subnets = list(net.subnets(new_prefix=new_prefix))
    print(f"{network} を /{new_prefix} に分割 → {len(subnets)} サブネット")
    for sn in subnets[:4]:
        print(f"  {sn}  ネットワーク={sn.network_address}  ブロードキャスト={sn.broadcast_address}")
    if len(subnets) > 4:
        print(f"  ... 他 {len(subnets) - 4} サブネット")

analyze_network("192.168.1.100/24")
analyze_network("10.0.0.1/8")
subnet_divide("192.168.0.0/24", new_prefix=26)
```

## 使用場面

- サーバやネットワーク機器に静的 IP アドレスを割り当てる際に
- DHCP スコープやルーティングテーブルを設計する際に
- ファイアウォールの ACL（アクセス制御リスト）をサブネット単位で設定する際に

## 参考文献

- [RFC 4632 – Classless Inter-domain Routing (CIDR)](https://www.rfc-editor.org/rfc/rfc4632)
- [RFC 1918 – Address Allocation for Private Internets](https://www.rfc-editor.org/rfc/rfc1918)
- [Python ipaddress モジュール公式ドキュメント](https://docs.python.org/ja/3/library/ipaddress.html)

<AffiliateBanner site="network_navi" />
