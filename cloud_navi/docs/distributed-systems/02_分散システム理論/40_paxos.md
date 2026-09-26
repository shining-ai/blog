import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Paxos の概要

## Paxos とは

> Paxos は、Leslie Lamport が1989年に提案した分散コンセンサスアルゴリズムであり、ノードの一部が故障してもクラスタ全体が単一の値に合意できることを保証する、分散システム理論の礎石となるプロトコルである。

分散システムでは複数のノードが協調して意思決定をしなければならない。「どのリーダーが正統か」「このトランザクションをコミットすべきか」という問いに対し、ネットワーク分断や部分故障があっても合意を形成する仕組みが必要だ。これが **コンセンサス問題** であり、Paxosはその古典的解法だ。

Paxosには3種類の役割がある。**Proposer** は合意したい値を提案する。**Acceptor** は提案を受け入れるかどうか投票する。**Learner** は合意された値を学習して実行する。1ノードが複数の役割を持てる。

アルゴリズムは2フェーズで構成される。**Phase 1 (Prepare/Promise)** では、ProposerがユニークなID（proposal number）`n`を持つPrepareメッセージを過半数のAcceptorに送る。AcceptorはIDが今まで見た最大値より大きければPromiseを返し、それ以下なら無視する。**Phase 2 (Accept/Accepted)** では、過半数のPromiseを得たProposerがAcceptメッセージを送る。Acceptorは約束に反しない限り受け入れ、過半数がAcceptすれば合意成立となる。

Paxosの強みはフォールトトレランスだ。N個のノードのうち(N-1)/2個まで故障してもコンセンサスを達成できる。弱みは実装の複雑さと、Multi-Paxos（複数の値を連続してコンセンサスする）への拡張時の難解さだ。Lamport自身も「Paxosは理解が難しい」と認め、それがRaftが生まれた動機となった。

実際のシステムとしてはGoogle Chubbyロックサービス（ZooKeeperの前身的存在）やApache ZooKeeperがPaxosを基盤とした設計を採用している。

## Paxos のフェーズ概要

| フェーズ | メッセージ | 動作 |
|----------|-----------|------|
| Phase 1a | Prepare(n) | ProposerがProposal番号nを送信 |
| Phase 1b | Promise(n, v) | AcceptorがnをPromise（過去の最大受理値vも返す）|
| Phase 2a | Accept(n, v) | Proposerが値vの受理を要求 |
| Phase 2b | Accepted(n, v) | AcceptorがAcceptをLearnerに通知 |

```python
# Paxos の基本フローを示す概念実装（単一値のBasic Paxos）

from dataclasses import dataclass, field
from typing import Optional, Dict, Tuple
import threading

@dataclass
class Acceptor:
    """
    Paxos Acceptor
    promised_id: Promise した最大のProposal番号
    accepted_id: Accept した最大のProposal番号
    accepted_value: Accept した値
    """
    node_id: str
    promised_id: int = -1
    accepted_id: int = -1
    accepted_value: Optional[str] = None
    _lock: threading.Lock = field(default_factory=threading.Lock, repr=False)

    def receive_prepare(self, proposal_id: int) -> Optional[Tuple[int, Optional[str]]]:
        """
        Phase 1b: Prepare受信
        - proposal_id > promised_id ならPromiseを返す
        - そうでなければNone（拒否）
        """
        with self._lock:
            if proposal_id > self.promised_id:
                self.promised_id = proposal_id
                # 既にAcceptした値があれば返す（Proposerが引き継ぐ）
                return (self.accepted_id, self.accepted_value)
            return None  # 拒否

    def receive_accept(self, proposal_id: int, value: str) -> bool:
        """
        Phase 2b: Accept受信
        - proposal_id >= promised_id なら受理
        """
        with self._lock:
            if proposal_id >= self.promised_id:
                self.promised_id = proposal_id
                self.accepted_id = proposal_id
                self.accepted_value = value
                return True
            return False  # 拒否


class Proposer:
    """
    Paxos Proposer
    Basic Paxosの2フェーズを実行
    """
    def __init__(self, node_id: str, acceptors: list):
        self.node_id = node_id
        self.acceptors = acceptors
        self.proposal_counter = 0

    def _next_proposal_id(self) -> int:
        self.proposal_counter += 1
        # ノードIDを組み込んでユニーク性を保証
        return self.proposal_counter * 100 + hash(self.node_id) % 100

    def propose(self, value: str) -> Optional[str]:
        """
        Phase 1: Prepare → Promise
        Phase 2: Accept → Accepted
        過半数の合意が得られれば決定値を返す
        """
        proposal_id = self._next_proposal_id()
        quorum = len(self.acceptors) // 2 + 1

        # === Phase 1: Prepare ===
        promises = []
        for acceptor in self.acceptors:
            result = acceptor.receive_prepare(proposal_id)
            if result is not None:
                promises.append(result)

        if len(promises) < quorum:
            print(f"Phase 1 失敗: Promise数 {len(promises)} < Quorum {quorum}")
            return None

        # 既にAcceptされた値があればそれを引き継ぐ
        accepted_promises = [(pid, v) for pid, v in promises if v is not None]
        if accepted_promises:
            # 最も大きいProposal IDの値を使う
            _, value = max(accepted_promises, key=lambda x: x[0])
            print(f"既存の合意値を引き継ぎ: {value}")

        # === Phase 2: Accept ===
        accepted_count = 0
        for acceptor in self.acceptors:
            if acceptor.receive_accept(proposal_id, value):
                accepted_count += 1

        if accepted_count >= quorum:
            print(f"合意成立: value={value}, proposal_id={proposal_id}")
            return value

        print(f"Phase 2 失敗: Accept数 {accepted_count} < Quorum {quorum}")
        return None


# 使用例: 5ノードのクラスタ（2ノード故障しても合意可能）
acceptors = [Acceptor(f"acceptor_{i}") for i in range(5)]
proposer = Proposer("proposer_1", acceptors)

# 正常系: 5ノード全て稼働
result = proposer.propose("leader=node_1")
print(f"合意結果: {result}")  # "leader=node_1"

# 耐障害性: 2ノードを除外しても合意できる
live_acceptors = acceptors[:3]  # 5ノード中3ノード生存
proposer2 = Proposer("proposer_2", live_acceptors)
result2 = proposer2.propose("leader=node_2")
print(f"部分故障時の合意: {result2}")  # "leader=node_2"
```

## 使用場面

- 分散データベースでリーダー選出を行い、スプリットブレインを防止する場合
- ZooKeeperやetcdの動作原理を理解して設定チューニングをする場合
- 分散トランザクションの2フェーズコミットでコーディネータ故障時のリカバリを設計する場合
- RaftをベースにしたKubernetesのetcdクラスタの可用性設計をする場合

## 参考文献

- [Lamport, L. (1998). The Part-Time Parliament. ACM Transactions on Computer Systems.](https://lamport.azurewebsites.net/pubs/lamport-paxos.pdf)
- [Paxos Made Simple — Leslie Lamport](https://lamport.azurewebsites.net/pubs/paxos-simple.pdf)
- [Designing Data-Intensive Applications — Martin Kleppmann](https://dataintensive.net/)

<AffiliateBanner site="cloud_navi" />
