---
title: MAC アドレスと ARP
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# MAC アドレスと ARP

## MAC アドレスと ARP とは

> MAC アドレスはデータリンク層の物理アドレスで、ARP は IP アドレスから MAC アドレスを解決するプロトコル

MAC（Media Access Control）アドレスはネットワークインタフェースに割り当てられた 48 ビット（6 バイト）のハードウェアアドレスです。上位 24 ビットが OUI（製造元識別子）、下位 24 ビットがデバイス固有番号で構成されます。

ARP（Address Resolution Protocol）は、同一 LAN セグメント内で IP アドレスに対応する MAC アドレスを調べるプロトコルです。TCP/IP 通信では、イーサネットフレームに宛先 MAC アドレスを指定する必要があり、宛先 IP はわかっていても MAC がわからない場合に ARP ブロードキャストで問い合わせます。

## ARP の動作フロー

```
Host A (192.168.1.1)          Host B (192.168.1.2)
       │                              │
       │  ARP Request (broadcast)     │
       │  "192.168.1.2 の MAC は？"   │
       │──────────────────────────>  │
       │                              │
       │  ARP Reply (unicast)         │
       │  "私の MAC は aa:bb:cc:... " │
       │<──────────────────────────  │
       │                              │
       │  以降はキャッシュを利用         │
```

## MAC アドレスと ARP の比較

| 項目 | MAC アドレス | ARP |
|------|------------|-----|
| 層 | データリンク層（L2） | ネットワーク層（L3）寄りの L2.5 |
| 目的 | 機器の物理識別 | IP→MAC アドレス解決 |
| 範囲 | グローバルユニーク（原則） | 同一ブロードキャストドメイン内 |
| キャッシュ | NIC 固定 | OS の ARP テーブル（TTL あり） |
| パケットタイプ | — | 0x0806 (EtherType) |

```python
import socket
import struct
import os

def build_arp_request(src_ip: str, dst_ip: str, src_mac: bytes) -> bytes:
    """ARP リクエストパケットを構築する"""
    # イーサネットヘッダ
    dst_mac_broadcast = b"\xff\xff\xff\xff\xff\xff"  # ブロードキャスト
    ether_type_arp = b"\x08\x06"
    eth_header = dst_mac_broadcast + src_mac + ether_type_arp

    # ARP ヘッダ
    # HTYPE=1(Ethernet), PTYPE=0x0800(IPv4), HLEN=6, PLEN=4
    # OPER=1(Request)
    arp_header = struct.pack("!HHBBH",
        1,       # Hardware type: Ethernet
        0x0800,  # Protocol type: IPv4
        6,       # Hardware addr length
        4,       # Protocol addr length
        1,       # Operation: Request
    )
    # Sender HA + Sender PA + Target HA (unknown=0) + Target PA
    arp_body = (src_mac
                + socket.inet_aton(src_ip)
                + b"\x00" * 6
                + socket.inet_aton(dst_ip))

    return eth_header + arp_header + arp_body

def get_arp_table() -> list[dict]:
    """OS の ARP テーブルを読み取る（Linux）"""
    arp_entries = []
    try:
        with open("/proc/net/arp") as f:
            lines = f.readlines()[1:]  # ヘッダ行をスキップ
            for line in lines:
                parts = line.split()
                if len(parts) >= 4:
                    arp_entries.append({
                        "ip":    parts[0],
                        "mac":   parts[3],
                        "iface": parts[5] if len(parts) > 5 else "unknown",
                    })
    except FileNotFoundError:
        print("Linux 環境以外では /proc/net/arp が存在しません")
    return arp_entries

print("=== ARP テーブル ===")
for entry in get_arp_table():
    print(f"  {entry['ip']:<18} {entry['mac']:<20} ({entry['iface']})")
```

## 使用場面

- ネットワーク障害でホストに到達できないとき（`arp -n` で ARP エントリを確認）
- ARP スプーフィング攻撃の検知・防御を実装する際に
- DHCP や静的 IP 設定後の疎通確認で MAC アドレスを特定する際に

## 参考文献

- [RFC 826 – An Ethernet Address Resolution Protocol](https://www.rfc-editor.org/rfc/rfc826)
- [IEEE OUI 登録データベース](https://regauth.standards.ieee.org/standards-ra-web/pub/view.html#registries)
- W. Richard Stevens, "TCP/IP Illustrated, Volume 1", Chapter 4

<AffiliateBanner site="network_navi" />
