---
title: IPv4 ヘッダの構造
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# IPv4 ヘッダの構造

## IPv4 ヘッダとは

> IP パケットの先頭に付加される 20〜60 バイトの制御情報で、ルーティングや断片化などを制御する

IPv4 ヘッダは RFC 791 で定義されており、パケットの転送に必要なメタ情報を含みます。ルータはこのヘッダを読み取り、宛先 IP アドレスに向けてパケットを転送します。TTL（Time To Live）フィールドにより無限ループを防止し、フラグメントフィールドで大きなパケットを分割・再組み立てします。

## IPv4 ヘッダのフィールド一覧

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|Version|  IHL  |Type of Service|          Total Length         |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|         Identification        |Flags|      Fragment Offset    |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  Time to Live |    Protocol   |         Header Checksum       |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                       Source Address                          |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                    Destination Address                        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                    Options (if IHL > 5)                       |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

## 各フィールドの説明

| フィールド | ビット数 | 説明 |
|-----------|---------|------|
| Version | 4 | IP バージョン（IPv4 = 4） |
| IHL | 4 | ヘッダ長（32 ビット単位、最小 5 = 20bytes） |
| ToS/DSCP | 8 | サービス品質（QoS）マーキング |
| Total Length | 16 | パケット全体の長さ（最大 65,535 bytes） |
| Identification | 16 | 断片化時の識別子 |
| Flags | 3 | DF（断片化禁止）・MF（次の断片あり） |
| Fragment Offset | 13 | 断片の位置（8 バイト単位） |
| TTL | 8 | 残り転送可能ホップ数（通常 64 or 128） |
| Protocol | 8 | 上位プロトコル（6=TCP, 17=UDP, 1=ICMP） |
| Header Checksum | 16 | ヘッダの誤り検出 |
| Source Address | 32 | 送信元 IP アドレス |
| Destination Address | 32 | 宛先 IP アドレス |

```python
import struct
import socket

def parse_ipv4_header(raw_bytes: bytes) -> dict:
    """IPv4 ヘッダを解析して各フィールドを返す"""
    if len(raw_bytes) < 20:
        raise ValueError("データが短すぎます（最低 20 bytes 必要）")

    # 最初の 20 バイトを解析
    fields = struct.unpack("!BBHHHBBH4s4s", raw_bytes[:20])

    version_ihl = fields[0]
    version = version_ihl >> 4
    ihl = (version_ihl & 0x0F) * 4   # バイト単位

    flags_offset = fields[4]
    flags = flags_offset >> 13
    fragment_offset = flags_offset & 0x1FFF

    protocols = {1: "ICMP", 6: "TCP", 17: "UDP", 89: "OSPF"}

    return {
        "version":        version,
        "header_len":     ihl,
        "tos":            fields[1],
        "total_length":   fields[2],
        "identification": f"0x{fields[3]:04x}",
        "flags": {
            "DF": bool(flags & 0x2),
            "MF": bool(flags & 0x1),
        },
        "fragment_offset": fragment_offset,
        "ttl":            fields[5],
        "protocol":       f"{fields[6]} ({protocols.get(fields[6], 'Unknown')})",
        "checksum":       f"0x{fields[7]:04x}",
        "src_ip":         socket.inet_ntoa(fields[8]),
        "dst_ip":         socket.inet_ntoa(fields[9]),
    }

def build_ipv4_header(src: str, dst: str, protocol: int = 6,
                      ttl: int = 64, payload_len: int = 0) -> bytes:
    """IPv4 ヘッダを構築する（チェックサムなし）"""
    version_ihl = (4 << 4) | 5   # Version=4, IHL=5(20bytes)
    total_length = 20 + payload_len
    header = struct.pack("!BBHHHBBH4s4s",
        version_ihl, 0, total_length, 0, 0,
        ttl, protocol, 0,
        socket.inet_aton(src),
        socket.inet_aton(dst)
    )
    return header

# デモ: ヘッダを構築して解析
header = build_ipv4_header("192.168.1.1", "203.0.113.1", protocol=6, payload_len=100)
parsed = parse_ipv4_header(header)

print("=== IPv4 ヘッダ解析 ===")
for key, val in parsed.items():
    print(f"  {key:<20}: {val}")
```

## 使用場面

- Wireshark でキャプチャしたパケットの TTL や Protocol フィールドを確認する際に
- 独自プロトコルや RAW ソケットを使ったアプリケーションを開発する際に
- ファイアウォールや IDS のルール設定でヘッダフィールドを条件に指定する際に

## 参考文献

- [RFC 791 – Internet Protocol](https://www.rfc-editor.org/rfc/rfc791)
- [RFC 6864 – Updated Specification of the IPv4 ID Field](https://www.rfc-editor.org/rfc/rfc6864)
- W. Richard Stevens, "TCP/IP Illustrated, Volume 1", Chapter 3

<AffiliateBanner site="network_navi" />
