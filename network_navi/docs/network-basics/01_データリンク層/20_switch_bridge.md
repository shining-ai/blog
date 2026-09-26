---
title: スイッチとブリッジ
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# スイッチとブリッジ

## スイッチとブリッジとは

> データリンク層（L2）で動作し、MAC アドレスを学習して適切なポートにフレームを転送するネットワーク機器

ブリッジ（Bridge）は 2 つのネットワークセグメントを接続する機器で、MAC アドレステーブルを使って不要なフレームの転送を抑制します。スイッチ（Switch/L2 スイッチ）はブリッジをマルチポートに拡張した機器で、現在の LAN 構築の中心的な存在です。

スイッチは受信したフレームの送信元 MAC アドレスを自動学習し、宛先 MAC が既知ならそのポートにのみ転送（ユニキャスト転送）します。未知の宛先には全ポートに転送（フラッディング）します。

## MAC アドレステーブルの学習と転送

```
ポート1: PC-A (aa:aa:aa:aa:aa:aa)
ポート2: PC-B (bb:bb:bb:bb:bb:bb)
ポート3: PC-C (cc:cc:cc:cc:cc:cc)

PC-A から PC-B へフレーム送信時:
1. ポート1 でフレーム受信
2. 送信元 MAC(aa:...) をポート1 と紐付けて MAC テーブルに登録
3. 宛先 MAC(bb:...) がテーブルにあればポート2 にのみ転送
   なければポート2・3 にフラッディング
```

## スイッチとブリッジの比較

| 項目 | ブリッジ | L2 スイッチ |
|------|---------|-----------|
| ポート数 | 2〜数ポート | 8〜48+ ポート |
| 転送方式 | ソフトウェア処理 | ASIC ハードウェア処理 |
| 処理速度 | 低速 | ワイヤスピード |
| 機能 | 基本的な L2 転送 | VLAN, STP, QoS など |
| 用途 | レガシー・小規模 | 現代の LAN |

## STP（スパニングツリープロトコル）

スイッチを複数接続するとループが発生し、ブロードキャストストームになります。STP はループを検出してポートをブロッキング状態にし、ループフリーな木構造を作ります。

```python
# MAC アドレステーブルのシミュレーション
from collections import defaultdict
import time

class L2Switch:
    """L2 スイッチの MAC テーブル学習・転送をシミュレート"""

    def __init__(self, num_ports: int, mac_ttl_sec: int = 300):
        self.num_ports = num_ports
        self.mac_ttl_sec = mac_ttl_sec
        # {mac: (port, timestamp)}
        self.mac_table: dict[str, tuple[int, float]] = {}

    def _learn(self, src_mac: str, in_port: int):
        """送信元 MAC アドレスをポートと紐付けて学習"""
        if src_mac not in self.mac_table:
            print(f"  [学習] MAC {src_mac} -> ポート {in_port}")
        self.mac_table[src_mac] = (in_port, time.time())

    def _lookup(self, dst_mac: str) -> int | None:
        """宛先 MAC アドレスのポートを検索（期限切れは削除）"""
        if dst_mac in self.mac_table:
            port, ts = self.mac_table[dst_mac]
            if time.time() - ts < self.mac_ttl_sec:
                return port
            else:
                del self.mac_table[dst_mac]
        return None

    def forward(self, src_mac: str, dst_mac: str, in_port: int) -> list[int]:
        """フレームを適切なポートに転送する"""
        self._learn(src_mac, in_port)

        # ブロードキャスト/マルチキャスト
        if dst_mac in ("ff:ff:ff:ff:ff:ff",) or dst_mac.startswith("01:"):
            out_ports = [p for p in range(1, self.num_ports + 1) if p != in_port]
            print(f"  [フラッディング] 全ポートへ転送: {out_ports}")
            return out_ports

        out_port = self._lookup(dst_mac)
        if out_port is None:
            out_ports = [p for p in range(1, self.num_ports + 1) if p != in_port]
            print(f"  [フラッディング] 未知 MAC {dst_mac}: {out_ports}")
            return out_ports
        else:
            print(f"  [ユニキャスト] MAC {dst_mac} -> ポート {out_port}")
            return [out_port]

# デモ
sw = L2Switch(num_ports=4)
print("=== フレーム転送シミュレーション ===")
sw.forward("aa:bb:cc:00:00:01", "ff:ff:ff:ff:ff:ff", in_port=1)  # ブロードキャスト
sw.forward("aa:bb:cc:00:00:02", "aa:bb:cc:00:00:01", in_port=2)  # 未知->フラッディング
sw.forward("aa:bb:cc:00:00:03", "aa:bb:cc:00:00:01", in_port=3)  # 既知->ユニキャスト
```

## 使用場面

- 企業 LAN の設計でフロアスイッチとコアスイッチの役割分担を決める際に
- トラブルシューティングで `show mac address-table` コマンドを使う際の理解として
- VLAN 設計で同一スイッチ内のセグメント分離を検討する際に

## 参考文献

- [IEEE 802.1D – MAC Bridges and Virtual Bridged Local Area Networks](https://standards.ieee.org/ieee/802.1D/3387/)
- [RFC 7348 – Virtual eXtensible Local Area Network (VXLAN)](https://www.rfc-editor.org/rfc/rfc7348)
- Andrew S. Tanenbaum, "Computer Networks", 5th Edition, Chapter 4

<AffiliateBanner site="network_navi" />
