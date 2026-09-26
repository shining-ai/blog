---
title: TCP のフロー制御（スライディングウィンドウ）
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# TCP のフロー制御（スライディングウィンドウ）

## フロー制御とは

> 受信側のバッファ容量を超えてデータが届かないよう、送信側の送出量を受信側が通知した「受信ウィンドウ（rwnd）」に基づいて制限する仕組み

TCP のフロー制御は受信側の処理能力に合わせて送信速度を調整します。受信バッファが溢れてパケットロスが起きないよう、受信側は ACK セグメントに「あと何バイト受け取れるか」を示す受信ウィンドウサイズ（rwnd）を含めて送信側に通知します。

スライディングウィンドウ方式では、送信側は ACK を待たずにウィンドウサイズ分のデータを連続して送信できます。ACK が返るたびにウィンドウが「スライド」し、次のデータが送信可能になります。受信バッファが少なくなれば rwnd が小さくなり、ゼロになれば送信は一時停止します（ゼロウィンドウ）。

受信バッファが空いたとき、受信側は「ウィンドウ更新」セグメントを送り、送信を再開します。Window Scale オプション（RFC 7323）を使うと rwnd の最大値を 65535 バイトから数 GB まで拡張でき、高帯域・高遅延（高 BDP）環境でのスループット改善に有効です。

## ウィンドウサイズとスループットの関係

| 指標 | 計算式 | 例 |
|------|--------|-----|
| 帯域遅延積（BDP） | 帯域幅 × RTT | 100Mbps × 100ms = 1.25 MB |
| 最大スループット | rwnd / RTT | 65535B / 0.1s ≈ 5.2 Mbps |
| Window Scale 適用後 | rwnd × 2^scale / RTT | 4MB / 0.1s = 320 Mbps |

## スライディングウィンドウの状態

| 状態 | 説明 |
|------|------|
| 送信可能ウィンドウ | 未 ACK のデータ量 < rwnd |
| ウィンドウ満杯 | 未 ACK = rwnd → 送信停止 |
| ゼロウィンドウ | rwnd = 0 → 完全に送信停止 |
| ウィンドウ更新 | rwnd が増加 → 送信再開 |

```python
from dataclasses import dataclass, field
from collections import deque

@dataclass
class Segment:
    seq: int
    data: bytes

    @property
    def length(self) -> int:
        return len(self.data)

class TCPReceiver:
    """受信側：バッファ管理と rwnd 通知"""

    def __init__(self, buffer_size: int = 4096):
        self.buffer_size = buffer_size
        self.buffer: deque[bytes] = deque()
        self.buffered_bytes = 0
        self.next_expected = 0

    @property
    def rwnd(self) -> int:
        """受信ウィンドウサイズ（残りバッファ量）"""
        return max(0, self.buffer_size - self.buffered_bytes)

    def receive(self, seg: Segment) -> int:
        """セグメントを受信し、ACK 番号を返す"""
        if self.rwnd == 0:
            print(f"  [受信] ゼロウィンドウ: バッファ満杯でデータ廃棄 seq={seg.seq}")
            return self.next_expected
        if seg.seq == self.next_expected:
            self.buffer.append(seg.data)
            self.buffered_bytes += seg.length
            self.next_expected += seg.length
        print(f"  [受信] ACK={self.next_expected} rwnd={self.rwnd} "
              f"buffered={self.buffered_bytes}/{self.buffer_size}")
        return self.next_expected

    def consume(self, nbytes: int):
        """アプリケーションがバッファを読み出す（rwnd が増加）"""
        consumed = 0
        while self.buffer and consumed < nbytes:
            chunk = self.buffer.popleft()
            self.buffer.appendleft(chunk)  # 一旦戻す
            take = min(len(chunk), nbytes - consumed)
            self.buffer.popleft()
            if take < len(chunk):
                self.buffer.appendleft(chunk[take:])
            self.buffered_bytes -= take
            consumed += take
        print(f"  [アプリ] {consumed} バイト消費 → rwnd={self.rwnd}")

class TCPSender:
    """送信側：スライディングウィンドウで送出量を管理"""

    def __init__(self, isn: int = 1000):
        self.seq = isn
        self.unacked: list[Segment] = []
        self.rwnd = 0     # 受信側から通知されたウィンドウサイズ
        self.cwnd = 1460  # 輻輳ウィンドウ（ここでは固定）

    @property
    def send_window(self) -> int:
        return min(self.rwnd, self.cwnd)

    @property
    def unacked_bytes(self) -> int:
        return sum(s.length for s in self.unacked)

    def update_rwnd(self, rwnd: int):
        self.rwnd = rwnd

    def can_send(self, data_len: int) -> bool:
        return self.unacked_bytes + data_len <= self.send_window

    def send(self, data: bytes) -> Segment | None:
        if not self.can_send(len(data)):
            print(f"  [送信] ウィンドウ満杯: 送信保留 "
                  f"(未ACK={self.unacked_bytes} window={self.send_window})")
            return None
        seg = Segment(seq=self.seq, data=data)
        self.seq += len(data)
        self.unacked.append(seg)
        print(f"  [送信] seq={seg.seq} len={seg.length} "
              f"未ACK={self.unacked_bytes}/{self.send_window}")
        return seg

    def receive_ack(self, ack_num: int, rwnd: int):
        self.unacked = [s for s in self.unacked if s.seq + s.length > ack_num]
        self.update_rwnd(rwnd)
        print(f"  [送信] ACK={ack_num} rwnd更新={rwnd} 未ACK残={self.unacked_bytes}")

# デモ
print("=== スライディングウィンドウ フロー制御 ===\n")
sender   = TCPSender(isn=1000)
receiver = TCPReceiver(buffer_size=200)

sender.update_rwnd(receiver.rwnd)
print(f"初期 rwnd={receiver.rwnd}\n")

# データ送信
for i in range(3):
    seg = sender.send(b"A" * 60)
    if seg:
        ack = receiver.receive(seg)
        sender.receive_ack(ack, receiver.rwnd)

print("\n--- アプリが 100 バイト消費 → rwnd 回復 ---")
receiver.consume(100)

seg = sender.send(b"B" * 60)
if seg:
    ack = receiver.receive(seg)
    sender.receive_ack(ack, receiver.rwnd)
```

## 使用場面

- 高 BDP 環境（広帯域衛星回線・大陸間接続）でスループットを最大化するために Window Scale オプションを調整する際に
- ゼロウィンドウによるストールがパフォーマンスボトルネックになっていないかパケットキャプチャで診断する際に
- TCP プロキシや WAN 最適化アプライアンスでウィンドウサイズを操作してスループットを向上させる際に

## 参考文献

- [RFC 793 – Transmission Control Protocol](https://www.rfc-editor.org/rfc/rfc793)
- [RFC 7323 – TCP Extensions for High Performance (Window Scale)](https://www.rfc-editor.org/rfc/rfc7323)
- [Cloudflare – TCP Flow Control](https://blog.cloudflare.com/optimizing-tcp-for-high-throughput-and-low-latency/)

<AffiliateBanner site="network_navi" />
