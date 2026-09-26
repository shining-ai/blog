---
title: 距離ベクトル法（RIP）
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 距離ベクトル法（RIP）

## 距離ベクトル法（RIP）とは

> 各ルータが隣接ルータとホップ数（距離）と宛先（ベクトル）を交換し合い、ルーティングテーブルを構築するアルゴリズム

RIP（Routing Information Protocol）は距離ベクトルアルゴリズムを実装したルーティングプロトコルです。各ルータは隣接ルータにルーティングテーブルをブロードキャストし、ホップ数（経由するルータの数）を基にした最短経路を学習します。

RIP の最大ホップ数は 15 で、16 以上は到達不能とみなします。そのため小〜中規模ネットワーク向きです。30 秒ごとに更新情報を送信するため、大規模ネットワークでは収束が遅く、帯域を消費します。現在は OSPF に置き換えられることが多いですが、シンプルさから小規模で使われることもあります。

## ベルマン・フォード方程式

```
D(x, y) = 最小コスト経路のコスト（x から y まで）

D(x, y) = min_v { c(x, v) + D(v, y) }
           ↑
     v: x の隣接ルータ
     c(x, v): x と v の間のコスト（RIP ではすべて 1）
```

## RIP vs OSPF の比較

| 項目 | RIP v2 | OSPF |
|------|--------|------|
| アルゴリズム | 距離ベクトル（Bellman-Ford） | リンク状態（Dijkstra） |
| メトリック | ホップ数 | コスト（帯域幅） |
| 最大ホップ数 | 15 | 制限なし |
| 収束速度 | 遅い | 速い |
| スケーラビリティ | 低い | 高い（エリア設計） |
| 対象規模 | 小〜中規模 | 中〜大規模 |
| RFC | RFC 2453 | RFC 2328 |

## カウント・トゥ・インフィニティ問題

```
正常時:         R1 --- R2 --- R3 --- ネットワークN (R1 から距離=2)
R3-N リンク断後:
  R2 が R3 に「N へは距離 3 で行ける」と通知
  R3 が R2 に「N へは距離 4 で行ける」と通知
  → メトリックが徐々に増加して 16（無限大）に達するまで収束しない

対策: スプリットホライズン（受信した方向には経路を再送しない）
```

```python
import time
from copy import deepcopy

class RIPRouter:
    """RIP 距離ベクトルルーティングのシミュレーション"""

    INFINITY = 16

    def __init__(self, name: str):
        self.name = name
        # {宛先: (コスト, ネクストホップ)}
        self.table: dict[str, tuple[int, str]] = {name: (0, name)}
        self.neighbors: list["RIPRouter"] = []

    def add_neighbor(self, router: "RIPRouter", cost: int = 1):
        self.neighbors.append(router)
        # 隣接ルータを直接到達可能として登録
        if router.name not in self.table or self.table[router.name][0] > cost:
            self.table[router.name] = (cost, router.name)

    def receive_update(self, from_router: str, their_table: dict[str, tuple[int, str]]) -> bool:
        """隣接ルータからの更新を受信してテーブルを更新する"""
        updated = False
        current_cost_to_sender = self.table.get(from_router, (self.INFINITY, None))[0]

        for dest, (their_cost, _) in their_table.items():
            if dest == self.name:
                continue
            new_cost = min(current_cost_to_sender + their_cost, self.INFINITY)
            existing = self.table.get(dest, (self.INFINITY, None))

            if new_cost < existing[0]:
                self.table[dest] = (new_cost, from_router)
                updated = True
        return updated

    def broadcast(self):
        """隣接ルータに自分のテーブルを配布する（距離ベクトル交換）"""
        for neighbor in self.neighbors:
            neighbor.receive_update(self.name, deepcopy(self.table))

    def print_table(self):
        print(f"\n  [{self.name}] ルーティングテーブル:")
        for dest, (cost, nh) in sorted(self.table.items()):
            inf_str = "∞" if cost >= self.INFINITY else str(cost)
            print(f"    宛先 {dest:<8} コスト={inf_str:<4} via={nh}")


# ネットワーク構成: R1 -- R2 -- R3 -- R4
r1, r2, r3, r4 = [RIPRouter(f"R{i}") for i in range(1, 5)]
r1.add_neighbor(r2); r2.add_neighbor(r1)
r2.add_neighbor(r3); r3.add_neighbor(r2)
r3.add_neighbor(r4); r4.add_neighbor(r3)

print("=== RIP 収束シミュレーション ===")
for epoch in range(4):
    print(f"\n--- ラウンド {epoch + 1} ---")
    for r in [r1, r2, r3, r4]:
        r.broadcast()

for r in [r1, r2, r3, r4]:
    r.print_table()
```

## 使用場面

- 小規模なオフィスネットワークで動的ルーティングを手軽に設定する際に
- ルーティングアルゴリズムの学習・比較として距離ベクトル法を理解する際に
- RIPv2 が稼働している既存ネットワークの保守・運用をする際に

## 参考文献

- [RFC 2453 – RIP Version 2](https://www.rfc-editor.org/rfc/rfc2453)
- [RFC 1058 – Routing Information Protocol](https://www.rfc-editor.org/rfc/rfc1058)
- James F. Kurose, "Computer Networking: A Top-Down Approach", Chapter 5.2

<AffiliateBanner site="network_navi" />
