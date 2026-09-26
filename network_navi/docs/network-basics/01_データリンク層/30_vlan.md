---
title: VLAN
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# VLAN

## VLAN とは

> 物理的な配線を変えずに、スイッチを論理的に複数のネットワークに分割する技術

VLAN（Virtual LAN）は 1 台のスイッチを複数の独立したブロードキャストドメインに分割する仮想化技術です。IEEE 802.1Q で標準化されており、スイッチポートに VLAN ID（1〜4094）を割り当てることで、異なる部門や用途のトラフィックを物理的に同じスイッチ上で論理的に分離できます。

部署ごとに物理スイッチを用意するコストを削減しながら、セキュリティと管理性を確保できます。異なる VLAN 間の通信は L3 スイッチやルータを経由する必要があります。

## VLAN タグ（IEEE 802.1Q）

```
通常のイーサネットフレーム:
+--------+--------+----------+---------+
| 宛先MAC | 送元MAC | EtherType | Payload |
+--------+--------+----------+---------+

802.1Q タグ付きフレーム:
+--------+--------+------+----------+---------+
| 宛先MAC | 送元MAC | 802.1Q Tag | EtherType | Payload |
+--------+--------+------+----------+---------+
                   ↑
             TPID(0x8100) + PCP(3bit) + DEI(1bit) + VLAN ID(12bit)
```

## VLAN の種類

| 種類 | 説明 | 用途 |
|------|------|------|
| ポートベース VLAN | ポートに VLAN ID を固定割り当て | 最も一般的 |
| MAC ベース VLAN | MAC アドレスで VLAN を決定 | モバイル端末管理 |
| プロトコルベース VLAN | EtherType で VLAN を決定 | マルチプロトコル環境 |
| ダイナミック VLAN | 認証（802.1X）で VLAN を動的割当 | セキュア環境 |

## トランクとアクセスポート

| ポート種別 | 説明 | 接続先 |
|-----------|------|--------|
| アクセスポート | 1 VLAN のみ（タグなし） | PC・プリンタなどの端末 |
| トランクポート | 複数 VLAN（タグあり） | スイッチ間・ルータ間 |
| ネイティブ VLAN | トランク上のタグなしフレームが属する VLAN | — |

```python
# VLAN 設定のシミュレーション
from dataclasses import dataclass, field

@dataclass
class SwitchPort:
    port_id: int
    mode: str            # "access" or "trunk"
    access_vlan: int = 1
    trunk_vlans: list[int] = field(default_factory=list)
    native_vlan: int = 1

class VLANSwitch:
    """VLAN 機能付きスイッチのシミュレーション"""

    def __init__(self):
        self.ports: dict[int, SwitchPort] = {}
        self.vlan_table: dict[int, str] = {}  # {vlan_id: name}

    def add_vlan(self, vlan_id: int, name: str):
        self.vlan_table[vlan_id] = name
        print(f"VLAN {vlan_id} ({name}) を作成しました")

    def set_access(self, port_id: int, vlan_id: int):
        self.ports[port_id] = SwitchPort(port_id, "access", access_vlan=vlan_id)
        print(f"ポート {port_id} をアクセスモード VLAN {vlan_id} に設定しました")

    def set_trunk(self, port_id: int, allowed_vlans: list[int], native: int = 1):
        self.ports[port_id] = SwitchPort(
            port_id, "trunk", trunk_vlans=allowed_vlans, native_vlan=native)
        print(f"ポート {port_id} をトランクモード (VLAN {allowed_vlans}) に設定しました")

    def forward(self, src_port: int, dst_port: int, vlan_id: int) -> bool:
        """フレームが宛先ポートに転送可能かを判定する"""
        src = self.ports.get(src_port)
        dst = self.ports.get(dst_port)
        if not src or not dst:
            return False

        # 宛先ポートで VLAN が許可されているかチェック
        if dst.mode == "access":
            allowed = dst.access_vlan == vlan_id
        else:
            allowed = vlan_id in dst.trunk_vlans

        status = "転送可" if allowed else "ブロック"
        print(f"  ポート{src_port} -> ポート{dst_port} VLAN{vlan_id}: {status}")
        return allowed

# デモ
sw = VLANSwitch()
sw.add_vlan(10, "営業部")
sw.add_vlan(20, "技術部")
sw.set_access(1, vlan_id=10)   # 営業部 PC
sw.set_access(2, vlan_id=20)   # 技術部 PC
sw.set_trunk(24, allowed_vlans=[10, 20], native=1)  # 上位スイッチへ

print("\n=== 転送判定 ===")
sw.forward(src_port=1, dst_port=24, vlan_id=10)   # 営業部 -> トランク: OK
sw.forward(src_port=1, dst_port=2,  vlan_id=10)   # 営業部 -> 技術部: NG
```

## 使用場面

- 企業ネットワークで部門ごとにセグメント分離してセキュリティを高める際に
- データセンタで仮想マシンの論理的なネットワーク分離を行う際に
- Wi-Fi AP でゲスト用 SSID と社内用 SSID を別 VLAN に分ける際に

## 参考文献

- [IEEE 802.1Q – Bridges and Bridged Networks](https://standards.ieee.org/ieee/802.1Q/6844/)
- [RFC 5517 – Cisco Systems' Private VLANs](https://www.rfc-editor.org/rfc/rfc5517)
- Andrew S. Tanenbaum, "Computer Networks", 5th Edition, Chapter 4.8

<AffiliateBanner site="network_navi" />
