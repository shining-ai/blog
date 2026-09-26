---
title: TCP の概要と 3 ウェイハンドシェイク
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# TCP の概要と 3 ウェイハンドシェイク

## TCP とは

> 伝送制御プロトコル（Transmission Control Protocol）：信頼性のある順序保証付きバイトストリームをアプリケーション間で提供するコネクション指向のトランスポート層プロトコル

TCP（RFC 793）はインターネットの中核をなすトランスポート層プロトコルです。パケットの到達保証・順序保証・重複除去・フロー制御・輻輳制御を実現し、Web（HTTP/HTTPS）・メール・ファイル転送など信頼性が要求されるあらゆるアプリケーションで使用されます。

TCP の通信はコネクション確立から始まります。データ送信前に送受信双方が同期（SYN）し、互いのシーケンス番号を合わせる「3 ウェイハンドシェイク」によってコネクションを確立します。この手順により双方向通信の準備が整い、その後のデータ転送で信頼性を確保できます。

3 ウェイハンドシェイクの流れは「SYN → SYN-ACK → ACK」の 3 ステップです。クライアントが SYN を送信し、サーバが SYN-ACK で応答し、クライアントが ACK を返した時点でコネクションが確立されます。この交換によって双方のシーケンス番号が合意され、後続データの再送制御が可能になります。

## TCP の主なフラグ

| フラグ | 意味 | 用途 |
|--------|------|------|
| SYN | Synchronize | コネクション確立要求 |
| ACK | Acknowledge | 受信確認 |
| FIN | Finish | コネクション終了要求 |
| RST | Reset | 強制切断 |
| PSH | Push | データを即時アプリに渡す |
| URG | Urgent | 緊急データの通知 |

## 3 ウェイハンドシェイクの流れ

| ステップ | 送信元 | フラグ | Seq | Ack | 意味 |
|----------|--------|--------|-----|-----|------|
| 1 | クライアント → サーバ | SYN | x | — | コネクション確立要求 |
| 2 | サーバ → クライアント | SYN + ACK | y | x+1 | 了解＋サーバ側 SYN |
| 3 | クライアント → サーバ | ACK | x+1 | y+1 | 確立完了 |

```python
from enum import Enum, auto
from dataclasses import dataclass, field
import random

class TCPState(Enum):
    CLOSED      = auto()
    LISTEN      = auto()
    SYN_SENT    = auto()
    SYN_RECEIVED= auto()
    ESTABLISHED = auto()

@dataclass
class TCPSegment:
    src_port: int
    dst_port: int
    seq: int
    ack: int
    flags: set = field(default_factory=set)  # SYN, ACK, FIN, RST
    data: bytes = b''

    def __str__(self):
        flags_str = "+".join(sorted(self.flags)) or "-"
        return (f"[{flags_str}] seq={self.seq} ack={self.ack} "
                f"len={len(self.data)}")

class TCPEndpoint:
    def __init__(self, name: str):
        self.name = name
        self.state = TCPState.CLOSED
        self.isn: int = random.randint(1000, 9999)  # Initial Sequence Number
        self.seq: int = self.isn
        self.ack: int = 0

    def send_syn(self) -> TCPSegment:
        self.state = TCPState.SYN_SENT
        seg = TCPSegment(
            src_port=12345, dst_port=80,
            seq=self.seq, ack=0, flags={"SYN"}
        )
        print(f"  [{self.name}] 送信: {seg}  (state → {self.state.name})")
        return seg

    def recv_syn_send_synack(self, syn: TCPSegment) -> TCPSegment:
        self.state = TCPState.SYN_RECEIVED
        self.ack = syn.seq + 1
        seg = TCPSegment(
            src_port=80, dst_port=12345,
            seq=self.seq, ack=self.ack, flags={"SYN", "ACK"}
        )
        print(f"  [{self.name}] 受信: {syn}")
        print(f"  [{self.name}] 送信: {seg}  (state → {self.state.name})")
        return seg

    def recv_synack_send_ack(self, synack: TCPSegment) -> TCPSegment:
        self.seq = synack.ack
        self.ack = synack.seq + 1
        self.state = TCPState.ESTABLISHED
        seg = TCPSegment(
            src_port=12345, dst_port=80,
            seq=self.seq, ack=self.ack, flags={"ACK"}
        )
        print(f"  [{self.name}] 受信: {synack}")
        print(f"  [{self.name}] 送信: {seg}  (state → {self.state.name})")
        return seg

    def recv_ack(self, ack: TCPSegment):
        self.state = TCPState.ESTABLISHED
        print(f"  [{self.name}] 受信: {ack}  (state → {self.state.name})")

# 3 ウェイハンドシェイクのデモ
print("=== TCP 3 ウェイハンドシェイク ===\n")
client = TCPEndpoint("Client")
server = TCPEndpoint("Server")
server.state = TCPState.LISTEN
print(f"  [Server] state → {server.state.name}\n")

print("--- Step 1: SYN ---")
syn = client.send_syn()

print("\n--- Step 2: SYN-ACK ---")
synack = server.recv_syn_send_synack(syn)

print("\n--- Step 3: ACK ---")
ack = client.recv_synack_send_ack(synack)
server.recv_ack(ack)

print(f"\n接続確立完了: Client={client.state.name}, Server={server.state.name}")
```

## 使用場面

- HTTP/HTTPS・SSH・FTP など信頼性が必要なアプリケーション通信で常時使用される
- TLS ハンドシェイクは TCP コネクション確立後に実施されるため、セキュア通信の前提として理解が必須
- ファイアウォールや IDS が SYN フラッド攻撃（大量の SYN を送りつける DoS）を検出・防御する際に

## 参考文献

- [RFC 793 – Transmission Control Protocol](https://www.rfc-editor.org/rfc/rfc793)
- [RFC 9293 – Transmission Control Protocol (Updated)](https://www.rfc-editor.org/rfc/rfc9293)
- [Cloudflare – What is a TCP handshake?](https://www.cloudflare.com/learning/ddos/glossary/tcp-ip/)

<AffiliateBanner site="network_navi" />
