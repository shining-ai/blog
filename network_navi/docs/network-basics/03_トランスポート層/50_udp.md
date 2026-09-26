---
title: UDP の特性と使いどころ
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# UDP の特性と使いどころ

## UDP とは

> ユーザデータグラムプロトコル（User Datagram Protocol）：コネクション確立なしにデータグラムを送受信する、軽量でシンプルなトランスポート層プロトコル

UDP（RFC 768）は TCP とは対照的に、信頼性保証・順序保証・輻輳制御を一切持たない最小限のプロトコルです。ヘッダはわずか 8 バイト（送信元ポート・宛先ポート・長さ・チェックサム）で構成され、オーバーヘッドが極めて小さいため低遅延が要求されるアプリケーションに適しています。

UDP の最大の特徴は「送りっぱなし」であることです。確認応答も再送も順序整列もなく、パケットが失われても通知されません。これは欠点のように見えますが、リアルタイム通信では「古いデータの再送より最新データの配信」が優先されるため、この特性が活きます。

信頼性が必要な場合はアプリケーション層で実装します。例えば QUIC プロトコルは UDP 上に信頼性と暗号化を独自実装し、HTTP/3 の基盤となっています。DNS は小さなクエリ・レスポンスに UDP を使い、応答がなければアプリ側でリトライします。

## TCP vs UDP の比較

| 特性 | TCP | UDP |
|------|-----|-----|
| コネクション | あり（3 ウェイハンドシェイク） | なし（コネクションレス） |
| 信頼性 | 保証（再送あり） | 保証なし |
| 順序保証 | あり | なし |
| フロー制御 | あり | なし |
| 輻輳制御 | あり | なし |
| ヘッダサイズ | 20〜60 バイト | 8 バイト |
| 遅延 | 高め | 低い |
| 主な用途 | HTTP, SSH, SMTP | DNS, VoIP, ゲーム, QUIC |

## UDP ヘッダのフォーマット

| フィールド | サイズ | 説明 |
|-----------|--------|------|
| 送信元ポート | 16 bit | 任意（応答不要なら 0） |
| 宛先ポート | 16 bit | 宛先アプリのポート番号 |
| 長さ | 16 bit | UDP ヘッダ + データの合計長 |
| チェックサム | 16 bit | エラー検出（オプション） |

```python
import struct
import socket
from dataclasses import dataclass

@dataclass
class UDPDatagram:
    src_port: int
    dst_port: int
    data: bytes

    def build(self) -> bytes:
        """UDP データグラムのバイナリ表現を構築"""
        length = 8 + len(self.data)  # ヘッダ 8B + データ
        # チェックサムは簡略化のため 0 に
        header = struct.pack("!HHHH", self.src_port, self.dst_port, length, 0)
        return header + self.data

    @classmethod
    def parse(cls, raw: bytes) -> "UDPDatagram":
        src, dst, length, checksum = struct.unpack("!HHHH", raw[:8])
        data = raw[8:length]
        return cls(src_port=src, dst_port=dst, data=data)

    def __str__(self):
        return (f"UDP {self.src_port} → {self.dst_port}  "
                f"len={8 + len(self.data)}  data={self.data[:30]!r}")

def simulate_udp_echo():
    """UDP の送受信シミュレーション"""
    print("=== UDP データグラム 送受信シミュレーション ===\n")

    # DNS クエリのような短いパケット
    datagrams = [
        UDPDatagram(src_port=53420, dst_port=53, data=b'\x00\x01' + b'example.com'),
        UDPDatagram(src_port=5000,  dst_port=5001, data=b'game-state:x=100,y=200,hp=80'),
        UDPDatagram(src_port=16384, dst_port=5004, data=b'\x80\x60\x00\x01' + b'\xff\xfe' * 80),
    ]

    use_cases = ["DNS クエリ", "ゲーム状態更新", "RTP 音声パケット"]

    for dg, use in zip(datagrams, use_cases):
        raw = dg.build()
        parsed = UDPDatagram.parse(raw)
        print(f"[{use}]")
        print(f"  送信: {dg}")
        print(f"  ヘッダ({8}B) + データ({len(dg.data)}B) = {len(raw)}B")
        print(f"  TCP なら最低 20B ヘッダ + コネクション確立 3RTT 必要")
        print()

def simulate_packet_loss():
    """UDP はパケットロスを通知しない"""
    print("=== UDP のパケットロス（検知・再送なし）===\n")
    packets = list(range(1, 6))
    lost = {3}  # パケット 3 が消失

    print("送信側: パケット 1〜5 を送信")
    print("受信側:")
    received = []
    for seq in packets:
        if seq in lost:
            print(f"  パケット {seq}: 消失（ネットワーク上でドロップ）")
        else:
            received.append(seq)
            print(f"  パケット {seq}: 受信")
    print(f"\n受信したパケット: {received}  ← パケット 3 が欠落したまま")
    print("UDP: 消失を検知せず、再送なし（アプリが必要なら独自実装）")

simulate_udp_echo()
simulate_packet_loss()
```

## 使用場面

- DNS・NTP・DHCP など短いリクエスト/レスポンスで再送コストより速度を優先する際に
- VoIP・ビデオ会議・オンラインゲームなどリアルタイム性が最優先で多少のパケットロスが許容できる際に
- QUIC（HTTP/3）・DTLS・WebRTC など UDP 上に信頼性と暗号化を独自実装したプロトコルの基盤として

## 参考文献

- [RFC 768 – User Datagram Protocol](https://www.rfc-editor.org/rfc/rfc768)
- [Cloudflare – What is UDP?](https://www.cloudflare.com/learning/ddos/glossary/user-datagram-protocol-udp/)
- [MDN – UDP (User Datagram Protocol)](https://developer.mozilla.org/en-US/docs/Glossary/UDP)

<AffiliateBanner site="network_navi" />
