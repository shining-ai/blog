---
title: TCP のシーケンス番号と確認応答
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# TCP のシーケンス番号と確認応答

## シーケンス番号とは

> TCP が送信バイトストリームの各バイトに付与する通し番号で、受信側が順序を再構成し欠落を検出するために使用する仕組み

TCP はデータをセグメント（パケット）に分割して送信しますが、ネットワーク上では順序が入れ替わったり消失したりします。これを解決するのがシーケンス番号（Sequence Number）と確認応答番号（Acknowledgment Number）です。

シーケンス番号は「このセグメントの先頭バイトが全体の何バイト目か」を示します。受信側は ACK（確認応答）セグメントに「次に期待するバイト番号」を入れて返すことで受信を確認します。この値を「確認応答番号（Ack Number）」と呼び、「Seq + len まで受け取った、次は Seq + len を送れ」という意味になります。

セグメントが届かなかった場合、送信側はタイムアウト後に再送します。受信側が同じシーケンス番号のセグメントを重複受信した場合は廃棄し、正常な ACK を返します。この仕組みにより TCP は信頼性のある順序付きバイトストリームを実現します。

## シーケンス番号と ACK の対応

| 方向 | Seq | データ長 | Ack（応答）の意味 |
|------|-----|----------|-------------------|
| Client → Server | 100 | 50 バイト | Server は ACK=150 を返す |
| Client → Server | 150 | 30 バイト | Server は ACK=180 を返す |
| Server → Client | 500 | 100 バイト | Client は ACK=600 を返す |

## 再送の仕組み

| イベント | 動作 |
|----------|------|
| 送信後タイムアウト（RTO） | セグメントを再送 |
| 3 つの重複 ACK | 高速再転送（Fast Retransmit） |
| 受信側での順序入れ替わり | バッファに保持し順序が揃うまで待機 |

```python
from dataclasses import dataclass, field
from typing import Optional
import time

@dataclass
class TCPSegment:
    seq: int
    data: bytes
    acked: bool = False
    send_time: float = field(default_factory=time.time)

    @property
    def end_seq(self) -> int:
        return self.seq + len(self.data)

    def __str__(self):
        return f"Segment(seq={self.seq}, len={len(self.data)}, end={self.end_seq})"

class TCPSender:
    """TCP 送信側：シーケンス番号と再送管理"""

    def __init__(self, isn: int = 1000):
        self.next_seq = isn
        self.unacked: list[TCPSegment] = []
        self.rto = 1.0  # 再送タイムアウト（秒）

    def send(self, data: bytes) -> TCPSegment:
        seg = TCPSegment(seq=self.next_seq, data=data)
        self.next_seq += len(data)
        self.unacked.append(seg)
        print(f"  送信: {seg}")
        return seg

    def receive_ack(self, ack_num: int):
        """ACK 受信：ack_num までのセグメントを確認済みにする"""
        before = len(self.unacked)
        self.unacked = [s for s in self.unacked if s.end_seq > ack_num]
        acked = before - len(self.unacked)
        print(f"  ACK={ack_num} 受信: {acked} セグメント確認済み, 未確認={len(self.unacked)}")

    def check_retransmit(self) -> list[TCPSegment]:
        """タイムアウトしたセグメントを再送"""
        now = time.time()
        retransmit = [s for s in self.unacked if now - s.send_time > self.rto]
        for s in retransmit:
            s.send_time = now  # タイマーリセット
            print(f"  再送: {s} (RTO={self.rto}s)")
        return retransmit

class TCPReceiver:
    """TCP 受信側：順序バッファと ACK 生成"""

    def __init__(self, expected_seq: int = 1000):
        self.expected_seq = expected_seq
        self.buffer: dict[int, bytes] = {}  # 順序が乱れたデータのバッファ

    def receive(self, seg: TCPSegment) -> int:
        """セグメントを受信し、次に期待する ACK 番号を返す"""
        if seg.seq == self.expected_seq:
            # 期待通りのシーケンス番号
            self.expected_seq += len(seg.data)
            print(f"  受信OK: {seg} → ACK={self.expected_seq}")
            # バッファに溜まったセグメントも処理
            while self.expected_seq in self.buffer:
                data = self.buffer.pop(self.expected_seq)
                self.expected_seq += len(data)
        elif seg.seq > self.expected_seq:
            # 順序入れ替わり：バッファに保存
            self.buffer[seg.seq] = seg.data
            print(f"  順序外: {seg} をバッファ (期待={self.expected_seq})")
        else:
            print(f"  重複受信: {seg} を廃棄 (期待={self.expected_seq})")
        return self.expected_seq  # ACK 番号

# デモ
print("=== TCP シーケンス番号と確認応答 ===\n")
sender   = TCPSender(isn=1000)
receiver = TCPReceiver(expected_seq=1000)

print("--- 正常なデータ転送 ---")
s1 = sender.send(b"Hello")      # seq=1000, len=5
ack = receiver.receive(s1)
sender.receive_ack(ack)

s2 = sender.send(b" World!")    # seq=1005, len=7
ack = receiver.receive(s2)
sender.receive_ack(ack)

print("\n--- 順序入れ替わりのシミュレーション ---")
s3 = sender.send(b"ABC")        # seq=1012
s4 = sender.send(b"DEF")        # seq=1015
# s4 が先に届いたケース
ack = receiver.receive(s4)
sender.receive_ack(ack)          # まだ s3 未受信なので ACK は進まない
ack = receiver.receive(s3)       # s3 受信で一気に進む
sender.receive_ack(ack)
```

## 使用場面

- パケットキャプチャツール（Wireshark）で TCP ストリームの順序ずれや再送を分析する際に
- 高レイテンシ環境（衛星回線など）でシーケンス番号と ACK の往復を最小化するチューニングを行う際に
- TCP スプリッティング（CDN や WAN 最適化）でシーケンス番号を終端・再生成する際に

## 参考文献

- [RFC 793 – Transmission Control Protocol](https://www.rfc-editor.org/rfc/rfc793)
- [RFC 7323 – TCP Extensions for High Performance](https://www.rfc-editor.org/rfc/rfc7323)
- [Wireshark TCP Analysis](https://www.wireshark.org/docs/wsug_html_chunked/ChAdvTCPAnalysis.html)

<AffiliateBanner site="network_navi" />
