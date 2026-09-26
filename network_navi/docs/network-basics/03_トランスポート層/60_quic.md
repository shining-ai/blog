---
title: QUIC プロトコル
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# QUIC プロトコル

## QUIC とは

> UDP 上に信頼性・多重化・暗号化（TLS 1.3）を統合した次世代トランスポートプロトコルで、HTTP/3 の基盤として RFC 9000 で標準化

QUIC（Quick UDP Internet Connections）は Google が開発し、2021 年に RFC 9000 として標準化されました。従来の TCP + TLS の組み合わせが抱えていた「コネクション確立の遅さ」「HOL ブロッキング」「ネットワーク切り替え時の接続断」を根本から解決するために設計されています。

TCP では 3 ウェイハンドシェイク（1 RTT）+ TLS 1.3 ハンドシェイク（1 RTT）で合計 2 RTT の遅延が発生します。QUIC は UDP 上で QUIC ハンドシェイクと TLS 1.3 を同時に実行し、初回接続を 1 RTT、再接続（0-RTT）では事実上 0 RTT でデータ送信を開始できます。

QUIC の多重化は「ストリーム」という概念で実現されます。同一コネクション内の複数ストリームは独立しており、一つのストリームでパケットロスが発生しても他のストリームに影響しません（TCP の HOL ブロッキング問題を解消）。また接続 ID でコネクションを識別するため、Wi-Fi からモバイル回線への切り替えでも IP アドレスが変わってもコネクションが維持されます。

## TCP+TLS vs QUIC の比較

| 項目 | TCP + TLS 1.3 | QUIC |
|------|---------------|------|
| トランスポート層 | TCP | UDP |
| 初回接続レイテンシ | 2 RTT | 1 RTT |
| 再接続（0-RTT） | 1 RTT | 0 RTT |
| 暗号化 | TLS（ペイロードのみ） | QUIC（ヘッダも保護） |
| HOL ブロッキング | あり（TCP レベル） | なし（ストリーム独立） |
| 接続マイグレーション | 不可（IP が変わると切断） | 可（接続 ID で維持） |
| カーネル実装 | カーネル空間 | ユーザ空間 |

## QUIC パケット構造（概略）

| フィールド | 説明 |
|-----------|------|
| フラグ（1B） | Long/Short header、パケットタイプ |
| 接続 ID（0〜20B） | コネクション識別子（IP 非依存） |
| パケット番号（1〜4B） | 再送制御・順序管理 |
| ペイロード | QUIC フレーム（暗号化） |

```python
from dataclasses import dataclass, field
from typing import Optional
import random

@dataclass
class QUICStream:
    """QUIC ストリームの簡易表現"""
    stream_id: int
    data: bytes = b''
    offset: int = 0
    fin: bool = False

    def __str__(self):
        return f"Stream(id={self.stream_id} offset={self.offset} len={len(self.data)} fin={self.fin})"

@dataclass
class QUICPacket:
    """QUIC パケットの簡易表現"""
    connection_id: bytes
    packet_number: int
    frames: list[QUICStream]

    def __str__(self):
        return (f"QUIC Packet(conn_id={self.connection_id.hex()[:8]}... "
                f"pkt_num={self.packet_number} "
                f"frames={len(self.frames)})")

class QUICConnection:
    """QUIC コネクションのシミュレーション"""

    def __init__(self, peer_name: str):
        self.peer_name = peer_name
        self.connection_id = random.randbytes(8)
        self.streams: dict[int, QUICStream] = {}
        self.next_packet_num = 0
        self.rtt_samples: list[float] = []

    def open_stream(self, stream_id: int) -> QUICStream:
        stream = QUICStream(stream_id=stream_id)
        self.streams[stream_id] = stream
        print(f"  ストリーム {stream_id} オープン")
        return stream

    def send_data(self, stream_id: int, data: bytes) -> QUICPacket:
        stream = self.streams.get(stream_id)
        if not stream:
            stream = self.open_stream(stream_id)
        frame = QUICStream(
            stream_id=stream_id,
            data=data,
            offset=stream.offset,
        )
        stream.offset += len(data)
        pkt = QUICPacket(
            connection_id=self.connection_id,
            packet_number=self.next_packet_num,
            frames=[frame],
        )
        self.next_packet_num += 1
        print(f"  送信: {pkt}")
        print(f"    {frame}")
        return pkt

    def migrate(self, new_ip: str, new_port: int):
        """IP アドレス変更後もコネクション維持（接続マイグレーション）"""
        print(f"\n  ネットワーク切り替え: 新 IP={new_ip}:{new_port}")
        print(f"  接続 ID {self.connection_id.hex()[:8]}... はそのまま維持")
        print(f"  TCP なら切断・再接続が必要だが QUIC はコネクション継続")

def simulate_hol_blocking():
    print("=== HOL ブロッキングの比較 ===\n")
    print("[TCP: 1 つのロストが全体をブロック]")
    streams = ["HTML", "CSS", "JS"]
    for i, name in enumerate(streams):
        if i == 1:
            print(f"  Stream {i} ({name}): パケットロス → 再送待ち")
            print(f"  Stream {i+1} ({name}): ★ 前のストリームを待機（HOL ブロッキング）")
            break
        print(f"  Stream {i} ({name}): 受信済み")

    print("\n[QUIC: ストリームは独立、ロストは該当ストリームのみ影響]")
    for i, name in enumerate(streams):
        if i == 1:
            print(f"  Stream {i} ({name}): パケットロス → 再送待ち")
        else:
            print(f"  Stream {i} ({name}): 独立して正常受信")

# デモ
print("=== QUIC コネクション ===\n")
conn = QUICConnection("example.com")

# 複数ストリームを同時利用
conn.open_stream(0)  # リクエスト 1
conn.open_stream(4)  # リクエスト 2
conn.send_data(0, b"GET /index.html HTTP/3\r\n")
conn.send_data(4, b"GET /style.css HTTP/3\r\n")
conn.send_data(0, b"Host: example.com\r\n\r\n")

# 接続マイグレーション
conn.migrate("192.0.2.100", 55000)

print()
simulate_hol_blocking()
```

## 使用場面

- HTTP/3 対応 CDN（Cloudflare, AWS CloudFront 等）でモバイルユーザの体験改善を目的とした際に
- モバイルアプリで Wi-Fi とモバイル回線の切り替えをシームレスにするために QUIC 対応クライアントを採用する際に
- 高パケットロス環境（無線 LAN、モバイルネットワーク）でリトライによる遅延を最小化したい際に

## 参考文献

- [RFC 9000 – QUIC: A UDP-Based Multiplexed and Secure Transport](https://www.rfc-editor.org/rfc/rfc9000)
- [RFC 9001 – Using TLS to Secure QUIC](https://www.rfc-editor.org/rfc/rfc9001)
- [Cloudflare – QUIC とは](https://www.cloudflare.com/learning/performance/what-is-quic/)

<AffiliateBanner site="network_navi" />
