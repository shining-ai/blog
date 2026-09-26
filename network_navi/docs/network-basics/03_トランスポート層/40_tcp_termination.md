---
title: TCP の接続終了（4 ウェイハンドシェイク）
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# TCP の接続終了（4 ウェイハンドシェイク）

## 4 ウェイハンドシェイクとは

> TCP コネクションを正常に終了するための手順で、双方向独立に FIN・ACK を交換して各方向の送信を順に閉じる 4 ステップの制御シーケンス

TCP は全二重通信のため、クライアント→サーバとサーバ→クライアントの 2 方向の通信を独立して終了します。コネクション確立は SYN の同時交換（3 ステップ）で済みますが、終了は各方向を独立して閉じるため FIN + ACK を 2 往復行い、合計 4 ステップ必要です。

アクティブクローズ側（通常クライアント）が FIN を送り、相手が ACK を返します。この時点でアクティブクローズ側は「もうデータを送らない」と宣言しますが、受信は継続します。相手がデータ送信を終えると FIN を送り、アクティブクローズ側が ACK を返して終了します。

アクティブクローズ側は ACK 送信後すぐには CLOSED にならず、TIME_WAIT 状態で一定時間（2MSL：最大セグメント生存時間の 2 倍、通常 60〜120 秒）待機します。これは最後の ACK が失われてサーバが FIN を再送しても受け取れるようにするためです。多数の短時間接続をするサーバでは TIME_WAIT が大量に溜まることがあり、`SO_REUSEADDR` オプションで緩和できます。

## 4 ウェイハンドシェイクの流れ

| ステップ | 送信元 | フラグ | 意味 |
|----------|--------|--------|------|
| 1 | クライアント → サーバ | FIN | クライアント側の送信終了 |
| 2 | サーバ → クライアント | ACK | FIN を確認 |
| 3 | サーバ → クライアント | FIN | サーバ側の送信終了 |
| 4 | クライアント → サーバ | ACK | FIN を確認、TIME_WAIT へ |

## TCP の終了関連状態

| 状態 | 説明 | 側 |
|------|------|----|
| FIN_WAIT_1 | FIN 送信済み、ACK 待ち | アクティブクローズ |
| FIN_WAIT_2 | ACK 受信済み、相手の FIN 待ち | アクティブクローズ |
| TIME_WAIT | 最後の ACK 送信後、2MSL 待機 | アクティブクローズ |
| CLOSE_WAIT | FIN 受信済み、アプリ終了待ち | パッシブクローズ |
| LAST_ACK | FIN 送信済み、最後の ACK 待ち | パッシブクローズ |

```python
from enum import Enum, auto
from dataclasses import dataclass

class TCPState(Enum):
    ESTABLISHED  = auto()
    FIN_WAIT_1   = auto()
    FIN_WAIT_2   = auto()
    TIME_WAIT    = auto()
    CLOSED       = auto()
    CLOSE_WAIT   = auto()
    LAST_ACK     = auto()

@dataclass
class TCPSegment:
    flags: set
    seq: int = 0
    ack: int = 0

    def __str__(self):
        return f"[{'+'.join(sorted(self.flags))}] seq={self.seq} ack={self.ack}"

class TCPEndpoint:
    def __init__(self, name: str, initial_state: TCPState = TCPState.ESTABLISHED):
        self.name = name
        self.state = initial_state
        self.seq = 100

    def _log(self, action: str, seg: TCPSegment | None = None):
        seg_str = f" | {seg}" if seg else ""
        print(f"  [{self.name}] {action}{seg_str}  → {self.state.name}")

    def send_fin(self) -> TCPSegment:
        seg = TCPSegment(flags={"FIN"}, seq=self.seq)
        self.state = TCPState.FIN_WAIT_1
        self._log("FIN 送信", seg)
        self.seq += 1
        return seg

    def recv_fin_ack(self, seg: TCPSegment) -> TCPSegment:
        """FIN_WAIT_1 で ACK を受信"""
        self.state = TCPState.FIN_WAIT_2
        self._log("ACK 受信", seg)
        return seg

    def recv_fin_send_ack(self, seg: TCPSegment) -> TCPSegment:
        """FIN_WAIT_2 で FIN を受信 → ACK を返して TIME_WAIT へ"""
        ack_seg = TCPSegment(flags={"ACK"}, seq=self.seq, ack=seg.seq + 1)
        self.state = TCPState.TIME_WAIT
        self._log("FIN 受信 → ACK 送信", ack_seg)
        return ack_seg

    def time_wait_expired(self):
        """TIME_WAIT タイムアウト後に CLOSED へ"""
        self.state = TCPState.CLOSED
        self._log("TIME_WAIT 満了")

    # --- パッシブクローズ側 ---
    def recv_fin_send_ack_passive(self, seg: TCPSegment) -> TCPSegment:
        """ESTABLISHED で FIN を受信 → ACK → CLOSE_WAIT へ"""
        ack_seg = TCPSegment(flags={"ACK"}, seq=self.seq, ack=seg.seq + 1)
        self.state = TCPState.CLOSE_WAIT
        self._log("FIN 受信 → ACK 送信", ack_seg)
        return ack_seg

    def send_fin_last_ack(self) -> TCPSegment:
        """アプリ終了後 FIN 送信 → LAST_ACK へ"""
        seg = TCPSegment(flags={"FIN"}, seq=self.seq)
        self.state = TCPState.LAST_ACK
        self._log("FIN 送信", seg)
        self.seq += 1
        return seg

    def recv_last_ack(self, seg: TCPSegment):
        """最後の ACK 受信 → CLOSED"""
        self.state = TCPState.CLOSED
        self._log("最後の ACK 受信", seg)

# 4 ウェイハンドシェイクのデモ
print("=== TCP 4 ウェイハンドシェイク（正常終了） ===\n")
client = TCPEndpoint("Client")
server = TCPEndpoint("Server")

print("--- Step 1: Client が FIN 送信 ---")
fin1 = client.send_fin()

print("\n--- Step 2: Server が ACK 送信 ---")
ack1 = server.recv_fin_send_ack_passive(fin1)
client.recv_fin_ack(ack1)

print("\n--- Step 3: Server が FIN 送信 ---")
fin2 = server.send_fin_last_ack()

print("\n--- Step 4: Client が ACK 送信 ---")
ack2 = client.recv_fin_send_ack(fin2)
server.recv_last_ack(ack2)

print("\n--- TIME_WAIT 満了（2MSL 後）---")
client.time_wait_expired()

print(f"\n終了: Client={client.state.name}, Server={server.state.name}")
```

## 使用場面

- `netstat -an | grep TIME_WAIT` でサーバの TIME_WAIT 状態を確認し、多数溜まっている場合にカーネルパラメータ（`net.ipv4.tcp_tw_reuse` など）を調整する際に
- CLOSE_WAIT が大量に蓄積している場合、アプリケーションが接続クローズを呼び忘れているバグを示すため調査の起点とする際に
- HTTP Keep-Alive で同一 TCP 接続を再利用し、4 ウェイハンドシェイクの頻度を減らしてレイテンシを改善する際に

## 参考文献

- [RFC 793 – Transmission Control Protocol](https://www.rfc-editor.org/rfc/rfc793)
- [RFC 9293 – Transmission Control Protocol (Updated)](https://www.rfc-editor.org/rfc/rfc9293)
- [Linux Kernel – TCP TIME_WAIT](https://vincent.bernat.ch/en/blog/2014-tcp-time-wait-state-linux)

<AffiliateBanner site="network_navi" />
