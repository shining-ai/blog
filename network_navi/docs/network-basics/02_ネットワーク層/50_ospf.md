---
title: リンク状態法（OSPF）
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# リンク状態法（OSPF）

## OSPF とは

> 各ルータがネットワーク全体のトポロジ情報（リンク状態）を共有し、ダイクストラ法で最短経路を計算するリンク状態型ルーティングプロトコル

OSPF（Open Shortest Path First）は RFC 2328 で定義されたリンク状態型の IGP（内部ゲートウェイプロトコル）です。各ルータは LSA（Link State Advertisement）を使って自分の接続情報をフラッディングし、全ルータが同一の LSDB（Link State Database）を持ちます。SPF（Shortest Path First）アルゴリズム（ダイクストラ法）でコスト最小の経路を計算します。

メトリックはリンクの帯域幅に基づくコスト（通常 10^8 / 帯域幅 bps）で、高帯域ほど低コストになります。

## OSPF の主要概念

| 概念 | 説明 |
|------|------|
| エリア | ルータをグループ化してフラッディング範囲を限定する |
| バックボーンエリア（Area 0） | すべてのエリアが接続する中心エリア |
| DR/BDR | ブロードキャスト網での LSA 集約役（代表ルータ） |
| Hello パケット | 隣接関係（Adjacency）の確立・維持に使用 |
| LSA | リンク状態広告：トポロジ情報を含む |
| LSDB | 全 LSA を格納したリンク状態データベース |
| SPF 計算 | ダイクストラ法で最短経路ツリーを計算 |

## OSPF の状態遷移

```
Down → Init → 2-Way → ExStart → Exchange → Loading → Full

Down:    隣接ルータなし
Init:    Hello 受信
2-Way:   双方向通信確認（DR/BDR 選出）
ExStart: LSDB 同期の準備
Exchange: DBD パケット交換
Loading: 不足 LSA を要求
Full:    LSDB 同期完了・ルーティング開始
```

## OSPF コスト計算

```
コスト = 10^8 / 帯域幅(bps)

100Mbps  : 10^8 / 10^8  = 1
10Mbps   : 10^8 / 10^7  = 10
1Mbps    : 10^8 / 10^6  = 100
T1(1.544Mbps): 10^8 / 1,544,000 ≈ 64
```

```python
import heapq
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class Link:
    dst: str
    cost: int

class OSPFRouter:
    """OSPF リンク状態ルーティングのシミュレーション"""

    def __init__(self, router_id: str):
        self.router_id = router_id
        self.lsdb: dict[str, list[Link]] = {}  # {router_id: [Link...]}

    def advertise(self, links: list[tuple[str, int]]):
        """自分のリンク情報を LSDB に登録（LSA 送信をシミュレート）"""
        self.lsdb[self.router_id] = [Link(dst, cost) for dst, cost in links]

    def flood(self, other: "OSPFRouter"):
        """LSDB を他のルータに同期する（フラッディング）"""
        for router_id, links in self.lsdb.items():
            if router_id not in other.lsdb:
                other.lsdb[router_id] = links

    def run_spf(self, src: Optional[str] = None) -> dict[str, tuple[int, list[str]]]:
        """ダイクストラ法で最短経路ツリーを計算する"""
        if src is None:
            src = self.router_id
        dist: dict[str, int] = {src: 0}
        path: dict[str, list[str]] = {src: [src]}
        pq = [(0, src)]

        while pq:
            cost, node = heapq.heappop(pq)
            if cost > dist.get(node, float("inf")):
                continue
            for link in self.lsdb.get(node, []):
                new_cost = cost + link.cost
                if new_cost < dist.get(link.dst, float("inf")):
                    dist[link.dst] = new_cost
                    path[link.dst] = path[node] + [link.dst]
                    heapq.heappush(pq, (new_cost, link.dst))

        return {dst: (d, path[dst]) for dst, d in dist.items()}


# ネットワーク構成
#  R1 --1-- R2 --2-- R4
#  |         |
#  3         1
#  |         |
#  R3 --1-- R4 (別経路)

routers = {name: OSPFRouter(name) for name in ["R1", "R2", "R3", "R4"]}
routers["R1"].advertise([("R2", 1), ("R3", 3)])
routers["R2"].advertise([("R1", 1), ("R4", 2), ("R3", 1)])
routers["R3"].advertise([("R1", 3), ("R2", 1), ("R4", 1)])
routers["R4"].advertise([("R2", 2), ("R3", 1)])

# LSDB フラッディング（全ルータが同じ LSDB を持つ）
for r in routers.values():
    for other in routers.values():
        r.flood(other)

# R1 から SPF 計算
result = routers["R1"].run_spf()
print("=== R1 からの最短経路（OSPF SPF） ===")
for dst, (cost, path) in sorted(result.items()):
    print(f"  R1 -> {dst}: コスト={cost}, パス={' -> '.join(path)}")
```

## 使用場面

- 企業の中〜大規模イントラネットで動的ルーティングを実装する際に
- マルチエリア設計でネットワークをスケールさせる際に
- ルータ障害時の自動経路切り替えを実現する際に

## 参考文献

- [RFC 2328 – OSPF Version 2](https://www.rfc-editor.org/rfc/rfc2328)
- [RFC 5340 – OSPF for IPv6](https://www.rfc-editor.org/rfc/rfc5340)
- James F. Kurose, "Computer Networking: A Top-Down Approach", Chapter 5.3

<AffiliateBanner site="network_navi" />
