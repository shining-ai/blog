---
title: ルーティングの基礎（ホップ・ルーティングテーブル）
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ルーティングの基礎（ホップ・ルーティングテーブル）

## ルーティングとは

> パケットが送信元から宛先まで届くよう、ルータが次の転送先（ネクストホップ）を選択する仕組み

ルーティングとは、ネットワーク上のパケットを宛先 IP アドレスに基づいて最適なルートで転送する処理です。各ルータはルーティングテーブル（転送表）を持ち、宛先ネットワークとネクストホップの対応を記録しています。パケットが届くまでのルータ間の転送回数を「ホップ数」と呼び、宛先までのホップ数が少ないルートが優先されることがあります。

## ルーティングテーブルの例

```
宛先ネットワーク    サブネットマスク    ネクストホップ    インタフェース  メトリック
192.168.1.0        /24               直接接続          eth0           0
10.0.0.0           /8                192.168.1.254     eth0           1
172.16.0.0         /12               192.168.1.1       eth0           2
0.0.0.0            /0                192.168.1.254     eth0           0  ← デフォルトルート
```

## ルーティングの種類

| 種類 | 説明 | 例 |
|------|------|-----|
| 直接接続ルート | 同一ネットワークは直接転送 | 192.168.1.0/24 |
| 静的ルーティング | 管理者が手動で設定 | `ip route add` |
| 動的ルーティング | プロトコルで自動学習 | RIP, OSPF, BGP |
| デフォルトルート | 一致するルートがない場合 | 0.0.0.0/0 |

## ロンゲストプレフィックスマッチ

```
宛先 IP: 192.168.1.100 のとき:

ルーティングテーブル:
  192.168.0.0/16  → GW1   （マッチ、プレフィックス長 16）
  192.168.1.0/24  → GW2   （マッチ、プレフィックス長 24）← こちらが選ばれる
  0.0.0.0/0       → GW3   （マッチ、プレフィックス長 0）

プレフィックスが最も長いルート（最も具体的）が優先される
```

```python
import ipaddress
import subprocess

def lookup_route(routing_table: list[dict], dst_ip: str) -> dict | None:
    """ロンゲストプレフィックスマッチでルートを検索する"""
    dst = ipaddress.IPv4Address(dst_ip)
    best_match = None
    best_prefix_len = -1

    for route in routing_table:
        network = ipaddress.IPv4Network(route["network"])
        if dst in network:
            prefix_len = network.prefixlen
            if prefix_len > best_prefix_len:
                best_prefix_len = prefix_len
                best_match = route

    return best_match

def get_routing_table() -> list[dict]:
    """OS のルーティングテーブルを取得する（Linux）"""
    routes = []
    try:
        result = subprocess.run(
            ["ip", "route", "show"],
            capture_output=True, text=True, timeout=5
        )
        for line in result.stdout.strip().split("\n"):
            parts = line.split()
            if not parts:
                continue
            route = {"raw": line}
            if parts[0] == "default":
                route["network"] = "0.0.0.0/0"
            else:
                route["network"] = parts[0]
            # ネクストホップ
            if "via" in parts:
                idx = parts.index("via")
                route["next_hop"] = parts[idx + 1]
            else:
                route["next_hop"] = "direct"
            # インタフェース
            if "dev" in parts:
                idx = parts.index("dev")
                route["interface"] = parts[idx + 1]
            routes.append(route)
    except (FileNotFoundError, subprocess.TimeoutExpired):
        print("ip コマンドが使用できません")
    return routes

# デモ用テーブル
demo_table = [
    {"network": "0.0.0.0/0",       "next_hop": "192.168.1.1",   "iface": "eth0"},
    {"network": "192.168.1.0/24",  "next_hop": "direct",        "iface": "eth0"},
    {"network": "10.0.0.0/8",      "next_hop": "192.168.1.254", "iface": "eth0"},
    {"network": "10.10.0.0/16",    "next_hop": "192.168.1.100", "iface": "eth0"},
]

print("=== ルートルックアップ ===")
for dst in ["192.168.1.50", "10.10.5.1", "8.8.8.8"]:
    result = lookup_route(demo_table, dst)
    if result:
        print(f"  宛先 {dst:<18} -> {result['network']:<20} next_hop={result['next_hop']}")

print("\n=== OS ルーティングテーブル ===")
for r in get_routing_table():
    print(f"  {r.get('network',''):<20} via {r.get('next_hop','direct'):<18} dev {r.get('interface','')}")
```

## 使用場面

- ルータの設定確認やトラブルシューティングで `ip route`・`show ip route` を読む際に
- クラウド環境（AWS VPC, GCP VPC）でルートテーブルを設計する際に
- 静的ルーティングで拠点間の経路を手動管理する際に

## 参考文献

- [RFC 1812 – Requirements for IP Version 4 Routers](https://www.rfc-editor.org/rfc/rfc1812)
- James F. Kurose, "Computer Networking: A Top-Down Approach", Chapter 4
- [Linux ip-route コマンド man ページ](https://man7.org/linux/man-pages/man8/ip-route.8.html)

<AffiliateBanner site="network_navi" />
