---
title: パケット交換と回線交換
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# パケット交換と回線交換

## パケット交換とは

> データを小さな「パケット」に分割し、各パケットが独立してネットワーク上を転送される通信方式

現在のインターネットはほぼすべてパケット交換方式を採用しています。送信データは複数のパケットに分割され、それぞれが宛先 IP アドレスを持ってネットワークを流れます。各パケットは独立して最適なルートを選択でき、途中のルータは受け取ったパケットを一時蓄積してから転送（ストアアンドフォワード）します。

一方、回線交換は電話網で古くから使われてきた方式で、通信開始時に送受信者間に専用の回線を確立してからデータを送ります。回線が占有されるため品質が安定しますが、通話していない間も回線を占有する非効率があります。

## パケット交換 vs 回線交換

| 比較項目 | パケット交換 | 回線交換 |
|----------|------------|---------|
| 回線占有 | なし（共有） | あり（専用） |
| 遅延 | 可変（輻輳で増大） | 一定（確立後） |
| 帯域効率 | 高い | 低い（無通話時も占有） |
| 耐障害性 | 高い（迂回可能） | 低い（回線断で通信不能） |
| 主な用途 | インターネット通信 | 従来の電話網（PSTN） |
| 課金方式 | データ量・時間 | 接続時間 |

## パケットの構造

```
+------------------+------------------+------------------+
|     ヘッダ        |     ペイロード     |   トレーラ（任意）  |
| (宛先・送信元IP等)  |   (実データ)      |  (誤り検出など)    |
+------------------+------------------+------------------+
   20〜60 bytes         可変長               可変長
```

```python
# パケット交換のストアアンドフォワードを模倣したシミュレーション
import time
from collections import deque
from dataclasses import dataclass

@dataclass
class Packet:
    packet_id: int
    src: str
    dst: str
    payload: str
    size_bytes: int = 1500  # MTU

class Router:
    """パケット交換ルータのシミュレーション"""

    def __init__(self, name: str, forwarding_rate_bps: int = 1_000_000):
        self.name = name
        self.queue: deque[Packet] = deque()
        self.forwarding_rate_bps = forwarding_rate_bps

    def receive(self, packet: Packet):
        print(f"[{self.name}] パケット {packet.packet_id} を受信 ({packet.size_bytes} bytes)")
        self.queue.append(packet)

    def forward(self) -> list[Packet]:
        forwarded = []
        while self.queue:
            pkt = self.queue.popleft()
            # ストアアンドフォワード遅延を計算
            delay_ms = (pkt.size_bytes * 8 / self.forwarding_rate_bps) * 1000
            print(f"[{self.name}] パケット {pkt.packet_id} を転送 (遅延: {delay_ms:.2f}ms)")
            forwarded.append(pkt)
        return forwarded

# デモ
router_a = Router("Router-A")
router_b = Router("Router-B")

# データを 3 つのパケットに分割して送信
for i in range(3):
    pkt = Packet(packet_id=i+1, src="192.168.1.1", dst="203.0.113.1",
                 payload=f"chunk_{i+1}")
    router_a.receive(pkt)

print("\n--- 転送処理 ---")
for pkt in router_a.forward():
    router_b.receive(pkt)
```

## 使用場面

- ネットワーク設計で VoIP（音声通話）か HTTP 通信かを判断する際の基礎として
- QoS（Quality of Service）設定でリアルタイム通信の優先度を検討する際に
- クラウド・データセンタのトラフィック設計における帯域計算の基礎として

## 参考文献

- [RFC 791 – Internet Protocol](https://www.rfc-editor.org/rfc/rfc791)
- Andrew S. Tanenbaum, "Computer Networks", 5th Edition, Chapter 1.3
- James F. Kurose, "Computer Networking: A Top-Down Approach", 8th Edition

<AffiliateBanner site="network_navi" />
