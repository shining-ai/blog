---
title: イーサネットとフレーム構造
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# イーサネットとフレーム構造

## イーサネットとは

> 有線 LAN の標準規格で、IEEE 802.3 として標準化されたデータリンク層プロトコル

イーサネット（Ethernet）は現在最も普及している有線 LAN 規格です。1970 年代に Xerox PARC で開発され、その後 DEC・Intel・Xerox によって標準化されました。現在は 10BASE-T（10Mbps）から 400GbE（400Gbps）まで多世代にわたる規格が存在します。

ネットワーク上のデータはイーサネットフレームという単位でカプセル化されて送受信されます。フレームには送受信の MAC アドレス、データ種別を示す EtherType、実データ、誤り検出用の FCS が含まれます。

## イーサネットフレーム構造

```
+----------+----------+------+--------+----------+-----+
|プリアンブル| 宛先MAC  |送信元MAC|EtherType|  ペイロード  | FCS |
| 8 bytes  | 6 bytes  | 6 bytes| 2 bytes|46-1500 bytes|4 bytes|
+----------+----------+------+--------+----------+-----+
```

| フィールド | サイズ | 内容 |
|-----------|--------|------|
| プリアンブル | 8 bytes | 同期用ビットパターン（7 bytes SFD + 1 byte） |
| 宛先 MAC | 6 bytes | 受信側の MAC アドレス |
| 送信元 MAC | 6 bytes | 送信側の MAC アドレス |
| EtherType | 2 bytes | 上位プロトコル（0x0800=IPv4, 0x0806=ARP, 0x86DD=IPv6） |
| ペイロード | 46〜1500 bytes | 実データ（MTU = 1500 bytes） |
| FCS | 4 bytes | CRC-32 による誤り検出 |

## 主なイーサネット規格

| 規格 | 速度 | 媒体 | 最大距離 |
|------|------|------|---------|
| 10BASE-T | 10 Mbps | UTP Cat3 | 100 m |
| 100BASE-TX | 100 Mbps | UTP Cat5 | 100 m |
| 1000BASE-T | 1 Gbps | UTP Cat5e | 100 m |
| 10GBASE-T | 10 Gbps | UTP Cat6a | 100 m |
| 40GBASE-SR4 | 40 Gbps | 光マルチモード | 150 m |

```python
# Python の socket を使ってイーサネットフレームを解析する
import socket
import struct

def parse_ethernet_frame(data: bytes) -> dict:
    """RAW ソケットから受信したイーサネットフレームを解析する"""
    # 先頭 14 bytes がイーサネットヘッダ
    dst_mac, src_mac, ether_type = struct.unpack("!6s6sH", data[:14])

    def mac_to_str(mac_bytes: bytes) -> str:
        return ":".join(f"{b:02x}" for b in mac_bytes)

    ether_types = {0x0800: "IPv4", 0x0806: "ARP", 0x86DD: "IPv6", 0x8100: "VLAN"}

    return {
        "dst_mac":    mac_to_str(dst_mac),
        "src_mac":    mac_to_str(src_mac),
        "ether_type": f"0x{ether_type:04x} ({ether_types.get(ether_type, 'Unknown')})",
        "payload_len": len(data) - 14,
    }

# RAW ソケットでフレームをキャプチャ（root 権限が必要）
def capture_frames(count: int = 3):
    try:
        # AF_PACKET は Linux のみ
        sock = socket.socket(socket.AF_PACKET, socket.SOCK_RAW, socket.htons(0x0003))
        print("イーサネットフレームをキャプチャ中...")
        for _ in range(count):
            raw_data, addr = sock.recvfrom(65535)
            frame = parse_ethernet_frame(raw_data)
            print(f"  {frame['src_mac']} -> {frame['dst_mac']} [{frame['ether_type']}] "
                  f"payload={frame['payload_len']} bytes")
    except PermissionError:
        print("RAW ソケットには root 権限が必要です")
    finally:
        sock.close()

# capture_frames()  # root 権限がある場合に実行
```

## 使用場面

- スイッチやルータの設定でフレームサイズ（MTU/ジャンボフレーム）を調整する際に
- Wireshark でパケットキャプチャして通信内容を解析する際に
- NIC ドライバやカーネルネットワークスタックの開発・デバッグ時に

## 参考文献

- [IEEE 802.3 Ethernet Standard](https://standards.ieee.org/ieee/802.3/7028/)
- [RFC 894 – A Standard for the Transmission of IP Datagrams over Ethernet Networks](https://www.rfc-editor.org/rfc/rfc894)
- W. Richard Stevens, "TCP/IP Illustrated, Volume 1", Chapter 2

<AffiliateBanner site="network_navi" />
