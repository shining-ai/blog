---
title: BGP とインターネットルーティング
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# BGP とインターネットルーティング

## BGP とは

> 異なる自律システム（AS）間でルーティング情報を交換するインターネットの経路制御プロトコル

BGP（Border Gateway Protocol）は RFC 4271 で定義された EGP（外部ゲートウェイプロトコル）で、インターネットを構成する唯一の AS 間ルーティングプロトコルです。ISP や大企業、クラウド事業者はそれぞれ AS（Autonomous System）番号を持ち、BGP で互いに到達可能なネットワーク（プレフィックス）を交換します。

OSPF や RIP と異なり、BGP は「ポリシーベースのルーティング」が特徴で、単純な最短経路ではなく AS パス長・MED・コミュニティなどの属性を使ってビジネスポリシーに基づく経路選択ができます。

## BGP の種類

| 種類 | 説明 |
|------|------|
| iBGP（内部 BGP） | 同一 AS 内のルータ間 BGP |
| eBGP（外部 BGP） | 異なる AS 間の BGP（インターネットの中核） |

## BGP の主要属性（Path Attributes）

| 属性 | 説明 | 優先 |
|------|------|------|
| AS_PATH | 経由した AS のリスト | 短い方 |
| NEXT_HOP | 次の転送先 IP | — |
| LOCAL_PREF | 同一 AS 内での優先度 | 高い方 |
| MED | 隣接 AS に示す入口コスト | 低い方 |
| COMMUNITY | グループタグ（ポリシー制御） | — |
| ORIGIN | 経路の起源（IGP/EGP/?) | IGP > EGP > ? |

## BGP の経路選択アルゴリズム（簡略）

```
1. NEXT_HOP が到達可能かチェック
2. LOCAL_PREF が最大のものを選ぶ
3. AS_PATH が最短のものを選ぶ
4. ORIGIN が最良のものを選ぶ（IGP > EGP > ?）
5. MED が最小のものを選ぶ
6. eBGP > iBGP を優先
7. IGP メトリックが最小の経路を選ぶ
8. 最も古い経路、Router ID が小さい方を選ぶ
```

```python
import socket
from dataclasses import dataclass, field

@dataclass
class BGPRoute:
    prefix: str          # 宛先ネットワーク
    next_hop: str        # ネクストホップ
    as_path: list[int]   # AS パスリスト
    local_pref: int = 100
    med: int = 0
    origin: str = "IGP"  # IGP, EGP, ?
    community: list[str] = field(default_factory=list)

class BGPRouter:
    """BGP 経路選択のシミュレーション"""

    def __init__(self, router_id: str, asn: int):
        self.router_id = router_id
        self.asn = asn
        self.rib: dict[str, list[BGPRoute]] = {}  # Routing Information Base

    def receive_route(self, route: BGPRoute):
        """BGP ルートを受信して RIB に追加"""
        self.rib.setdefault(route.prefix, []).append(route)

    def best_path_selection(self, prefix: str) -> BGPRoute | None:
        """BGP ベストパス選択アルゴリズム"""
        candidates = self.rib.get(prefix, [])
        if not candidates:
            return None

        def sort_key(r: BGPRoute):
            origin_order = {"IGP": 0, "EGP": 1, "?": 2}
            return (
                -r.local_pref,          # LOCAL_PREF: 高い方が優先
                len(r.as_path),         # AS_PATH: 短い方が優先
                origin_order.get(r.origin, 3),  # ORIGIN: IGP > EGP > ?
                r.med,                  # MED: 低い方が優先
            )

        return min(candidates, key=sort_key)

    def show_rib(self):
        print(f"\n=== {self.router_id} (AS{self.asn}) の BGP RIB ===")
        for prefix, routes in self.rib.items():
            best = self.best_path_selection(prefix)
            for r in routes:
                marker = ">" if r is best else " "
                path_str = " ".join(map(str, r.as_path)) if r.as_path else "Local"
                print(f"  {marker} {prefix:<20} NH={r.next_hop:<16} "
                      f"LP={r.local_pref:<5} MED={r.med:<5} "
                      f"AS_PATH=[{path_str}]")

# デモ: AS65000 のルータが複数の経路を受信する
router = BGPRouter("R1", asn=65000)

# eBGP で受信した経路（AS65001 経由）
router.receive_route(BGPRoute(
    prefix="203.0.113.0/24", next_hop="10.0.0.1",
    as_path=[65001, 65002], local_pref=100, med=10
))

# eBGP で受信した経路（AS65003 経由、AS パスが短い）
router.receive_route(BGPRoute(
    prefix="203.0.113.0/24", next_hop="10.0.0.2",
    as_path=[65003], local_pref=100, med=50
))

# LOCAL_PREF が高い経路
router.receive_route(BGPRoute(
    prefix="198.51.100.0/24", next_hop="10.0.0.1",
    as_path=[65001, 65004, 65005], local_pref=200, med=5
))
router.receive_route(BGPRoute(
    prefix="198.51.100.0/24", next_hop="10.0.0.2",
    as_path=[65003], local_pref=50, med=5
))

router.show_rib()
```

## 使用場面

- ISP や大企業でインターネット接続のマルチホーミング（複数 ISP 接続）を設定する際に
- クラウド事業者（AWS Direct Connect, Azure ExpressRoute）との BGP ピアリングを設定する際に
- AS 間のトラフィックエンジニアリングでポリシーを実装する際に

## 参考文献

- [RFC 4271 – A Border Gateway Protocol 4 (BGP-4)](https://www.rfc-editor.org/rfc/rfc4271)
- [RFC 7908 – Problem Definition and Classification of BGP Route Leaks](https://www.rfc-editor.org/rfc/rfc7908)
- [JPNIC – BGP（Border Gateway Protocol）とは](https://www.nic.ad.jp/ja/newsletter/No32/090.html)

<AffiliateBanner site="network_navi" />
