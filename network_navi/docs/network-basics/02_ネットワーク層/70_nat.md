---
title: NAT・PAT の仕組み
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# NAT・PAT の仕組み

## NAT とは

> ネットワークアドレス変換（Network Address Translation）：プライベート IP アドレスとグローバル IP アドレスを相互に変換する技術

NAT（Network Address Translation）は、IPv4 アドレスの枯渇に対応するために考案された技術で、家庭内や企業内のプライベート IP アドレスをインターネット上で使用できるグローバル IP アドレスに変換します。

RFC 1918 で定義されたプライベートアドレス（10.0.0.0/8、172.16.0.0/12、192.168.0.0/16）はインターネット上でルーティングされないため、NAT なしでは外部と通信できません。ルータやファイアウォールが NAT テーブルを管理し、送受信パケットのアドレスを動的に書き換えることで透過的な通信を実現します。

PAT（Port Address Translation）は NAPT（Network Address and Port Translation）とも呼ばれ、1 つのグローバル IP アドレスを複数のプライベートホストで共有する技術です。送信元ポート番号を書き換えてセッションを識別するため、現代のほとんどの家庭用ルータは PAT を採用しています。

## NAT の種類

| 種類 | 説明 | アドレス対応 |
|------|------|-------------|
| 静的 NAT（Static NAT） | プライベートとグローバルを 1 対 1 で固定マッピング | 1:1 |
| 動的 NAT（Dynamic NAT） | グローバル IP プールから動的に割り当て | 多:多 |
| PAT / NAPT | ポート番号でセッションを識別し 1 グローバル IP を共有 | 多:1 |

## NAT テーブルの仕組み

| フィールド | 内部（プライベート） | 外部（グローバル） |
|-----------|--------------------|--------------------|
| 送信元 IP | 192.168.1.10 | 203.0.113.1 |
| 送信元ポート | 54321 | 10001（PAT で変換） |
| 宛先 IP | 8.8.8.8 | 8.8.8.8 |
| 宛先ポート | 53 | 53 |

```python
from dataclasses import dataclass
from typing import Optional

@dataclass
class NATEntry:
    """NAT テーブルのエントリ"""
    private_ip: str
    private_port: int
    public_ip: str
    public_port: int   # PAT で割り当てられたポート
    protocol: str      # TCP / UDP
    timeout: int = 300  # セッションタイムアウト（秒）

class PATTable:
    """PAT（NAPT）テーブルのシミュレーション"""

    def __init__(self, public_ip: str):
        self.public_ip = public_ip
        self.table: dict[tuple, NATEntry] = {}
        self._next_port = 10000  # 割り当て開始ポート番号

    def _allocate_port(self) -> int:
        port = self._next_port
        self._next_port += 1
        if self._next_port > 65535:
            self._next_port = 10000
        return port

    def translate_outbound(
        self, private_ip: str, private_port: int, protocol: str = "TCP"
    ) -> NATEntry:
        """内部 → 外部の変換（エントリがなければ新規作成）"""
        key = (private_ip, private_port, protocol)
        if key not in self.table:
            pub_port = self._allocate_port()
            self.table[key] = NATEntry(
                private_ip=private_ip,
                private_port=private_port,
                public_ip=self.public_ip,
                public_port=pub_port,
                protocol=protocol,
            )
            print(f"[新規] {private_ip}:{private_port} → {self.public_ip}:{pub_port}")
        return self.table[key]

    def translate_inbound(
        self, public_port: int, protocol: str = "TCP"
    ) -> Optional[NATEntry]:
        """外部 → 内部の逆変換"""
        for entry in self.table.values():
            if entry.public_port == public_port and entry.protocol == protocol:
                return entry
        return None

    def show_table(self):
        print(f"\n=== PAT テーブル (グローバル IP: {self.public_ip}) ===")
        print(f"{'プライベート':<25} {'グローバル':<25} {'プロトコル'}")
        print("-" * 65)
        for entry in self.table.values():
            priv = f"{entry.private_ip}:{entry.private_port}"
            pub  = f"{entry.public_ip}:{entry.public_port}"
            print(f"{priv:<25} {pub:<25} {entry.protocol}")

# デモ
pat = PATTable(public_ip="203.0.113.1")

# 複数のホストが同じグローバル IP を共有
pat.translate_outbound("192.168.1.10", 54321)
pat.translate_outbound("192.168.1.11", 54321)  # 同じポートでも別エントリ
pat.translate_outbound("192.168.1.10", 54322)

pat.show_table()

# 外部からの応答を内部ホストに転送
entry = pat.translate_inbound(10001)
if entry:
    print(f"\n受信パケットを {entry.private_ip}:{entry.private_port} に転送")
```

## 使用場面

- 家庭用ルータやオフィスのブロードバンドルータで複数端末がひとつのグローバル IP を共有する際に
- 企業がプライベートアドレス空間のサーバを外部公開する際に（静的 NAT）
- クラウド環境（AWS NAT Gateway など）でプライベートサブネットのインスタンスに外部通信を許可する際に

## 参考文献

- [RFC 3022 – Traditional IP Network Address Translator](https://www.rfc-editor.org/rfc/rfc3022)
- [RFC 1918 – Address Allocation for Private Internets](https://www.rfc-editor.org/rfc/rfc1918)
- [JPNIC – NAT（ネットワークアドレス変換）](https://www.nic.ad.jp/ja/newsletter/No27/080.html)

<AffiliateBanner site="network_navi" />
