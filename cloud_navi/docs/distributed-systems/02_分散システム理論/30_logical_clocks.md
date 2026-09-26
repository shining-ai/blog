import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 論理時計（Lamport クロック・ベクタクロック）

## 論理時計とは

> 論理時計（Logical Clock）とは、物理的なクロックを使わずに分散システム内のイベントの因果順序を捕捉するための仮想的な時刻機構であり、Lamport クロックとベクタクロックがその代表的な実装である。

分散システムでは、各ノードの物理クロックは完全には同期できない（クロックスキュー）。NTPで同期しても数ミリ秒〜数百ミリ秒のずれが生じる。このため物理タイムスタンプで「どちらのイベントが先か」を判断することはできない。

**Lamport クロック**はLeslie Lamportが1978年に提案したシンプルな解法だ。各ノードは単調増加するカウンタを持つ。イベント発生時にカウンタをインクリメントし、メッセージ送信時にカウンタ値を添付する。受信側はメッセージのタイムスタンプと自身のカウンタの大きい方+1をカウンタに設定する。これにより「A→Bならts(A) < ts(B)」が保証される。ただし逆（ts(A) < ts(B) ならA→B）は保証されない。因果関係のないイベントが同じタイムスタンプになりうる。

**ベクタクロック**はLamportクロックの限界を克服する。各ノードはノード数分の整数配列を持つ。自ノードのカウンタをインクリメントし、メッセージ受信時には各要素の最大値を取る。ベクタクロックVCはVC(A) < VC(B)のときに限りA→Bが成立する（逆も真）。同時並行なイベントも検出できる。Gitのバージョン管理やCRDTにも応用されている。

欠点としてはノード数に比例してメモリを消費する点だ。大規模クラスタでは効率的なバリアント（DotKernel等）が使われる。

## Lamport クロックとベクタクロックの比較

| 特性 | Lamport クロック | ベクタクロック |
|------|-----------------|---------------|
| データ構造 | 整数 1 個 | 整数の配列（ノード数分） |
| 因果関係 A→B の検出 | ts(A) < ts(B) は必要条件のみ | 充分条件かつ必要条件 |
| 並行イベントの検出 | 不可 | 可能 |
| メモリオーバーヘッド | 定数 O(1) | O(N) N=ノード数 |
| 代表的な用途 | 分散ロック・ログ順序付け | 競合検出・CRDT・DynamoDB |

```python
# Lamport クロックとベクタクロックの実装

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

# ======= Lamport クロック =======

class LamportClock:
    """
    Lamport 論理時計
    因果関係 A→B のとき ts(A) < ts(B) を保証
    """
    def __init__(self, node_id: str):
        self.node_id = node_id
        self.time = 0

    def tick(self) -> int:
        """ローカルイベント発生時にインクリメント"""
        self.time += 1
        return self.time

    def send_event(self) -> Tuple[int, str]:
        """メッセージ送信: タイムスタンプを添付"""
        ts = self.tick()
        return (ts, self.node_id)

    def receive_event(self, msg_ts: int) -> int:
        """メッセージ受信: max(local, msg) + 1"""
        self.time = max(self.time, msg_ts) + 1
        return self.time

    def __repr__(self):
        return f"LamportClock(node={self.node_id}, time={self.time})"


# ======= ベクタクロック =======

class VectorClock:
    """
    ベクタクロック
    並行イベントも検出可能な論理時計
    """
    def __init__(self, node_id: str, all_nodes: List[str]):
        self.node_id = node_id
        self.all_nodes = sorted(all_nodes)
        self.clock: Dict[str, int] = {node: 0 for node in all_nodes}

    def tick(self) -> Dict[str, int]:
        """ローカルイベント: 自ノードのカウンタをインクリメント"""
        self.clock[self.node_id] += 1
        return dict(self.clock)

    def send_event(self) -> Dict[str, int]:
        """メッセージ送信: 自ノードをインクリメントしてクロックを添付"""
        self.tick()
        return dict(self.clock)

    def receive_event(self, received_vc: Dict[str, int]) -> Dict[str, int]:
        """
        メッセージ受信: 各要素の max を取り、自ノードをインクリメント
        """
        for node in self.all_nodes:
            self.clock[node] = max(
                self.clock.get(node, 0),
                received_vc.get(node, 0)
            )
        self.clock[self.node_id] += 1
        return dict(self.clock)

    def happens_before(self, vc_a: Dict[str, int], vc_b: Dict[str, int]) -> bool:
        """
        vc_a → vc_b (A が B の前に起きた) かどうかを判定
        全要素で vc_a <= vc_b、かつ少なくとも1要素で vc_a < vc_b
        """
        all_leq = all(vc_a.get(n, 0) <= vc_b.get(n, 0) for n in self.all_nodes)
        any_lt  = any(vc_a.get(n, 0) <  vc_b.get(n, 0) for n in self.all_nodes)
        return all_leq and any_lt

    def concurrent(self, vc_a: Dict[str, int], vc_b: Dict[str, int]) -> bool:
        """vc_a と vc_b が並行（因果関係なし）かどうかを判定"""
        return (not self.happens_before(vc_a, vc_b) and
                not self.happens_before(vc_b, vc_a))


# 使用例: 3ノードのシステム
nodes = ["A", "B", "C"]
vc_a = VectorClock("A", nodes)
vc_b = VectorClock("B", nodes)
vc_c = VectorClock("C", nodes)

# A がイベントを発生させてBに送信
ts_a1 = vc_a.send_event()   # A: {A:1, B:0, C:0}
ts_b_recv = vc_b.receive_event(ts_a1)  # B: {A:1, B:1, C:0}

# B がイベントを発生させてCに送信
ts_b2 = vc_b.send_event()   # B: {A:1, B:2, C:0}
ts_c_recv = vc_c.receive_event(ts_b2)  # C: {A:1, B:2, C:1}

# A も独立してイベントを発生 (B, C と並行)
ts_a2 = vc_a.tick()         # A: {A:2, B:0, C:0}

# ts_a1 → ts_b_recv (因果関係あり)
print(vc_a.happens_before(ts_a1, ts_b_recv))  # True
# ts_a2 と ts_b2 は並行
print(vc_a.concurrent({"A":2,"B":0,"C":0}, ts_b2))  # True
```

## 使用場面

- 分散データベース（DynamoDB・Riak）で競合する書き込みを検出してコンフリクト解決をする場合
- 分散ログを収集する際にイベントの因果順序を再現する場合
- CRDTの実装で並行更新を安全にマージする場合
- 分散トランザクションのデバッグで「どのノードでどの順序でイベントが起きたか」を追う場合

## 参考文献

- [Lamport, L. (1978). Time, Clocks, and the Ordering of Events in a Distributed System. Communications of the ACM.](https://lamport.azurewebsites.net/pubs/time-clocks.pdf)
- [Designing Data-Intensive Applications — Martin Kleppmann](https://dataintensive.net/)
- [Why Vector Clocks Are Easy — Basho](https://riak.com/why-vector-clocks-are-easy/)

<AffiliateBanner site="cloud_navi" />
