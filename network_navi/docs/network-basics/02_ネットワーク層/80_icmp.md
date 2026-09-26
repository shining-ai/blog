---
title: ICMP と ping・traceroute
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ICMP と ping・traceroute

## ICMP とは

> インターネット制御メッセージプロトコル（Internet Control Message Protocol）：IP ネットワークにおけるエラー通知や診断用メッセージを送受信するプロトコル

ICMP（RFC 792）は IP と同じネットワーク層で動作し、データ転送ではなくネットワーク状態の通知を目的とします。IP パケットが届かなかった場合の「Destination Unreachable」や、TTL 切れを知らせる「Time Exceeded」など、IP 通信を補助するメッセージを定義しています。

ping コマンドは ICMP Echo Request（タイプ 8）を送信し、相手から Echo Reply（タイプ 0）が返ってくるまでの時間（RTT: Round-Trip Time）を測定します。ホストの死活確認や遅延測定に広く使われます。

traceroute は TTL を 1 から順に増やしながら UDP または ICMP パケットを送信し、各ルータから返される「Time Exceeded」メッセージを利用して経路上のホップを列挙します。これによりパケットが通過するルータの IP アドレスと各区間の遅延を可視化できます。

## 主な ICMP メッセージタイプ

| タイプ | 名前 | 用途 |
|--------|------|------|
| 0 | Echo Reply | ping の応答 |
| 3 | Destination Unreachable | 宛先到達不能（コードで詳細化） |
| 5 | Redirect | より良い経路の通知 |
| 8 | Echo Request | ping の要求 |
| 11 | Time Exceeded | TTL 切れ（traceroute で利用） |
| 12 | Parameter Problem | IP ヘッダの不正 |

## ICMP Destination Unreachable のコード

| コード | 意味 |
|--------|------|
| 0 | ネットワーク到達不能 |
| 1 | ホスト到達不能 |
| 2 | プロトコル到達不能 |
| 3 | ポート到達不能（UDP で多用） |
| 4 | フラグメント必要（Path MTU Discovery） |
| 13 | 通信が管理上禁止（ファイアウォール） |

```python
import struct
import socket
import time

def checksum(data: bytes) -> int:
    """ICMP チェックサムの計算"""
    if len(data) % 2:
        data += b'\x00'
    total = 0
    for i in range(0, len(data), 2):
        word = (data[i] << 8) + data[i + 1]
        total += word
    while total >> 16:
        total = (total & 0xFFFF) + (total >> 16)
    return ~total & 0xFFFF

def build_icmp_echo_request(identifier: int, sequence: int, payload: bytes = b'ping') -> bytes:
    """ICMP Echo Request パケットの構築"""
    # タイプ(1B) + コード(1B) + チェックサム(2B) + ID(2B) + シーケンス(2B) + ペイロード
    header = struct.pack('!BBHHH', 8, 0, 0, identifier, sequence)
    raw = header + payload
    csum = checksum(raw)
    header = struct.pack('!BBHHH', 8, 0, csum, identifier, sequence)
    return header + payload

def parse_icmp_reply(data: bytes) -> dict:
    """ICMP Echo Reply の解析"""
    # IP ヘッダ（20 バイト）をスキップ
    icmp_data = data[20:]
    icmp_type, icmp_code, _, identifier, sequence = struct.unpack('!BBHHH', icmp_data[:8])
    return {
        "type": icmp_type,
        "code": icmp_code,
        "identifier": identifier,
        "sequence": sequence,
        "type_name": {0: "Echo Reply", 3: "Dest Unreachable", 11: "Time Exceeded"}.get(icmp_type, "Unknown"),
    }

def simulate_ping(target: str, count: int = 3):
    """ping のシミュレーション（実際の送受信なし）"""
    print(f"PING {target}")
    identifier = 12345
    for seq in range(1, count + 1):
        packet = build_icmp_echo_request(identifier, seq)
        print(f"  seq={seq}: ICMP Echo Request 送信 ({len(packet)} bytes)")
        print(f"    ヘッダ: type=8 code=0 id={identifier} seq={seq}")
        print(f"    チェックサム: 0x{struct.unpack('!H', packet[2:4])[0]:04X}")

def simulate_traceroute(target: str, max_hops: int = 4):
    """traceroute の仕組みのシミュレーション"""
    print(f"\ntraceroute to {target} (最大 {max_hops} ホップ)")
    hops = [
        ("192.168.1.1", 1.2),
        ("10.0.0.1",    8.5),
        ("203.0.113.1", 15.3),
        (target,        22.1),
    ]
    for ttl, (hop_ip, rtt) in enumerate(hops[:max_hops], start=1):
        print(f"  {ttl}  {hop_ip:<16} {rtt:.1f} ms  "
              f"{'Time Exceeded (TTL=0)' if ttl < max_hops else 'Echo Reply'}")

simulate_ping("8.8.8.8")
simulate_traceroute("8.8.8.8")
```

## 使用場面

- `ping` でサーバやネットワーク機器の死活確認や RTT（往復遅延）の測定を行う際に
- `traceroute` / `tracert` でパケットが通過する経路を確認し、遅延の発生箇所を特定する際に
- Path MTU Discovery で経路上の最小 MTU を検出し、IP フラグメントを回避する際に

## 参考文献

- [RFC 792 – Internet Control Message Protocol](https://www.rfc-editor.org/rfc/rfc792)
- [RFC 4443 – ICMPv6](https://www.rfc-editor.org/rfc/rfc4443)
- [Cloudflare – What is ICMP?](https://www.cloudflare.com/learning/ddos/glossary/internet-control-message-protocol-icmp/)

<AffiliateBanner site="network_navi" />
