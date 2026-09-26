import AffiliateBanner from '@site/src/components/AffiliateBanner';

# アクターモデル（Erlang・Akka）

## アクターモデルとは

> アクターモデルとは、並行処理の基本単位を「アクター」と呼ばれる独立した計算エンティティとし、アクター間の通信を非同期メッセージパッシングのみで行うことで共有メモリを排除した並行プログラミングモデルである。

アクターモデルは1973年に Carl Hewitt が提唱した。各アクターは**私有状態（Private State）**・**メールボックス（受信キュー）**・**ビヘイビア（メッセージ処理ロジック）**を持ち、他のアクターと直接メモリを共有しない。アクターはメッセージを受信すると、状態を変更する・新たなアクターを生成する・別のアクターにメッセージを送る、という3種類のアクションのみを行える。

**Erlang/OTP** はアクターモデルを言語レベルで採用した代表例で、数百万の軽量プロセス（グリーンスレッド）を生成でき、プロセス間通信は不変のメッセージコピーで行われる。**Let It Crash** 哲学（エラーは監視ツリーに任せる）と組み合わせることで高可用性システムを実現する。**Akka**（Scala/Java）は JVM 上でアクターモデルを実装したフレームワークで、大規模な分散システム構築に使われる。

## アクターモデルと共有メモリの比較

| 観点 | 共有メモリモデル | アクターモデル |
|------|----------------|---------------|
| データ共有 | 共有メモリ + ロック | メッセージコピーのみ |
| 競合状態 | ロックの実装ミスで発生 | 構造的に発生しない |
| デッドロック | ロック取得順序次第で発生 | 発生しない（ロック不要） |
| スケーラビリティ | コア数・ロック競合に依存 | 高い（アクター数＝並行度） |
| 状態管理 | 難しい（ロックが必要） | 簡単（アクター内で閉じる） |
| 失敗処理 | 例外 + 手動ロールバック | 監視ツリー（Supervisor） |

```python
# Python でアクターモデルを模倣したシンプルな実装

import threading
import queue
from typing import Any, Callable
from dataclasses import dataclass


@dataclass
class Message:
    sender: 'Actor | None'
    content: Any


class Actor(threading.Thread):
    """
    アクターモデルの基本実装。
    メールボックス（queue）でメッセージを受け取り、
    receive() メソッドで処理する。状態は self 内に閉じる。
    """

    def __init__(self, name: str):
        super().__init__(daemon=True)
        self.name = name
        self._mailbox: queue.Queue[Message | None] = queue.Queue()
        self._running = True

    def send(self, content: Any, sender: 'Actor | None' = None) -> None:
        """非同期メッセージ送信（送信者はブロックされない）"""
        self._mailbox.put(Message(sender, content))

    def stop(self) -> None:
        self._mailbox.put(None)  # 終了シグナル

    def receive(self, message: Message) -> None:
        """サブクラスでオーバーライドしてメッセージ処理を定義"""
        raise NotImplementedError

    def run(self) -> None:
        while True:
            msg = self._mailbox.get()
            if msg is None:
                break
            self.receive(msg)


# ===== カウンターアクター =====
class CounterActor(Actor):
    def __init__(self, name: str):
        super().__init__(name)
        self._count = 0  # 私有状態（ロック不要）

    def receive(self, message: Message) -> None:
        if message.content == "increment":
            self._count += 1
        elif message.content == "get":
            print(f"  [{self.name}] count = {self._count}")
            if message.sender:
                message.sender.send({"count": self._count})
        elif message.content == "reset":
            self._count = 0
            print(f"  [{self.name}] リセット完了")


# ===== 結果収集アクター =====
class CollectorActor(Actor):
    def __init__(self):
        super().__init__("Collector")
        self._results: list[dict] = []
        self._done = threading.Event()

    def receive(self, message: Message) -> None:
        if isinstance(message.content, dict) and "count" in message.content:
            self._results.append(message.content)
            print(f"  [Collector] 受信: {message.content}")
            self._done.set()

    def wait_for_result(self, timeout: float = 2.0) -> list[dict]:
        self._done.wait(timeout)
        return self._results


# ===== デモ実行 =====
counter = CounterActor("Counter")
collector = CollectorActor()

counter.start()
collector.start()

# 複数スレッドから並行してメッセージ送信（ロック不要）
threads = []
for i in range(5):
    def send_increments(actor=counter):
        for _ in range(100):
            actor.send("increment")
    t = threading.Thread(target=send_increments)
    threads.append(t)

for t in threads:
    t.start()
for t in threads:
    t.join()

# カウンター値を取得（非同期）
counter.send("get", sender=collector)
results = collector.wait_for_result()
print(f"\n最終カウント: {results[-1]['count'] if results else '未受信'}")
# 競合状態なしに 500 が得られる（アクター内で状態を閉じているため）

counter.stop()
collector.stop()
```

## 使用場面

- Erlang/Elixir による高可用性 Web サービス（WhatsApp は Erlang 製）
- Akka による分散ストリーム処理・IoT デバイス管理システム
- ゲームサーバーでの大量ユーザーセッション管理
- 金融取引システムでのオーダーマッチングエンジン

## 参考文献

- Hewitt, C. et al. (1973). A universal modular ACTOR formalism. *IJCAI*.
- Armstrong, J. (2010). Erlang. *CACM*, 53(9).
- [Akka 公式ドキュメント](https://akka.io/docs/)

<AffiliateBanner site="language_navi" />
