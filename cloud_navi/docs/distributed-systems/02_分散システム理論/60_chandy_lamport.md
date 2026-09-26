import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 分散スナップショット（Chandy-Lamport）

## Chandy-Lamport アルゴリズムとは

> Chandy-Lamport アルゴリズムは、K. Mani ChandyとLeslie Lamportが1985年に提案した分散スナップショットアルゴリズムであり、システムを停止させることなく分散システムの一貫したグローバル状態（スナップショット）を記録できる手法である。

分散システムで「この瞬間のシステム全体の状態」を取得したいケースは多い。チェックポイント・リカバリ、デッドロック検出、分散デバッグなどだ。しかし分散システムでは全ノードが同時にスナップショットを取ることはできない（クロックのずれ・ネットワーク遅延のため）。

Chandy-Lamportは **マーカー（Marker）** メッセージを使ってこれを解決する。前提条件として「メッセージはFIFO順で届く」「チャネルは信頼性あり」を要求する。

アルゴリズムの流れは以下だ。まず任意のノードが自身のローカル状態を記録し、全出力チャネルにマーカーを送る。マーカーを受信したノードは、そのチャネルに対してまだ状態記録をしていなければ今すぐローカル状態を記録し、他の全出力チャネルにマーカーを送る。チャネルの状態は「状態記録前から受信したマーカーまでに届いたメッセージ」として記録する。全ノードが全入力チャネルからマーカーを受信したら完了だ。

これにより取得したスナップショットは「一貫したカット（consistent cut）」を形成する。因果関係を壊さない形で時間をカットした、整合性のあるシステム状態だ。実際のスナップショット取得時点の状態とは異なる可能性があるが、**実際にありえた状態**であることが保証される。

Apache Flinkはこのアルゴリズムを応用した **Asynchronous Barrier Snapshotting (ABS)** をチェックポイント機構に採用し、ストリーム処理の exactly-once セマンティクスを実現している。

## アルゴリズムのステップ

| ステップ | 実行ノード | 動作 |
|----------|----------|------|
| 1. 開始 | イニシエータ | ローカル状態を記録、全出力チャネルにマーカー送信 |
| 2. 初マーカー受信 | 各ノード | ローカル状態を記録、全出力チャネルにマーカー転送 |
| 3. 以降のマーカー受信 | 各ノード | 対象チャネルの状態記録を閉じる |
| 4. 完了 | 全ノード | 全入力チャネルのマーカー受信でスナップショット完了 |

```python
# Chandy-Lamport アルゴリズムの概念実装

from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from collections import deque
from enum import Enum

class MessageType(Enum):
    REGULAR = "regular"
    MARKER = "marker"

@dataclass
class Message:
    msg_type: MessageType
    sender: str
    content: Any = None

@dataclass
class Channel:
    """ノード間の FIFO チャネル"""
    sender: str
    receiver: str
    buffer: deque = field(default_factory=deque)

    def send(self, msg: Message):
        self.buffer.append(msg)

    def receive(self) -> Optional[Message]:
        return self.buffer.popleft() if self.buffer else None


class Node:
    """
    Chandy-Lamport スナップショットに参加するノード
    """
    def __init__(self, node_id: str, initial_state: dict):
        self.node_id = node_id
        self.state = dict(initial_state)  # 現在の状態

        # スナップショット用
        self.recorded_state: Optional[dict] = None
        self.channel_states: Dict[str, List[Message]] = {}
        self.recording_channels: set = set()  # 記録中チャネル

        # 接続チャネル (channel_id -> Channel)
        self.in_channels: Dict[str, Channel] = {}
        self.out_channels: Dict[str, Channel] = {}

    def initiate_snapshot(self) -> None:
        """
        スナップショット開始（イニシエータとして動作）
        """
        print(f"[{self.node_id}] スナップショット開始: 状態={self.state}")
        self.recorded_state = dict(self.state)  # 自身の状態を記録

        # 全入力チャネルの記録を開始
        for ch_id in self.in_channels:
            self.recording_channels.add(ch_id)
            self.channel_states[ch_id] = []

        # 全出力チャネルにマーカーを送信
        for ch_id, channel in self.out_channels.items():
            marker = Message(MessageType.MARKER, self.node_id)
            channel.send(marker)
            print(f"[{self.node_id}] マーカー送信 → {channel.receiver}")

    def receive_message(self, channel_id: str, msg: Message) -> None:
        """メッセージ受信処理"""
        if msg.msg_type == MessageType.MARKER:
            self._handle_marker(channel_id)
        else:
            self._handle_regular(channel_id, msg)

    def _handle_marker(self, from_channel_id: str) -> None:
        """マーカー受信処理"""
        if self.recorded_state is None:
            # まだ状態記録していなければ今すぐ記録
            self.recorded_state = dict(self.state)
            print(f"[{self.node_id}] 状態記録: {self.recorded_state}")

            # このチャネルの状態は空（マーカー受信時点で記録終了）
            self.channel_states[from_channel_id] = []

            # 他の全入力チャネルの記録開始
            for ch_id in self.in_channels:
                if ch_id != from_channel_id and ch_id not in self.recording_channels:
                    self.recording_channels.add(ch_id)
                    self.channel_states[ch_id] = []

            # 全出力チャネルにマーカー転送
            for channel in self.out_channels.values():
                marker = Message(MessageType.MARKER, self.node_id)
                channel.send(marker)
                print(f"[{self.node_id}] マーカー転送 → {channel.receiver}")
        else:
            # 既に状態記録済み: このチャネルの記録を終了
            self.recording_channels.discard(from_channel_id)
            print(f"[{self.node_id}] チャネル {from_channel_id} の記録完了: "
                  f"{self.channel_states.get(from_channel_id, [])}")

    def _handle_regular(self, from_channel_id: str, msg: Message) -> None:
        """通常メッセージ受信: 記録中チャネルなら状態に追加"""
        if from_channel_id in self.recording_channels:
            self.channel_states[from_channel_id].append(msg)
        # 通常の処理（状態を更新など）
        print(f"[{self.node_id}] メッセージ受信: {msg.content}")

    def snapshot_complete(self) -> bool:
        """全チャネルの記録が完了したかどうか"""
        return (self.recorded_state is not None and
                len(self.recording_channels) == 0)

    def get_snapshot(self) -> dict:
        return {
            "node": self.node_id,
            "state": self.recorded_state,
            "channel_states": {k: [m.content for m in v]
                               for k, v in self.channel_states.items()}
        }
```

## 使用場面

- Apache Flink のストリーム処理でチェックポイントを設定して exactly-once を保証する場合
- 分散システムのデッドロック検出や終端検知のグローバル状態を記録する場合
- 障害発生時にチェックポイントからリカバリする分散計算フレームワークを設計する場合
- 分散デバッグで「全ノードのある時点での整合した状態」をキャプチャする場合

## 参考文献

- [Chandy, K.M., & Lamport, L. (1985). Distributed Snapshots: Determining Global States of Distributed Systems. ACM Transactions on Computer Systems.](https://dl.acm.org/doi/10.1145/214451.214456)
- [Apache Flink — Checkpointing](https://nightlies.apache.org/flink/flink-docs-stable/docs/ops/state/checkpoints/)
- [Designing Data-Intensive Applications — Martin Kleppmann](https://dataintensive.net/)

<AffiliateBanner site="cloud_navi" />
