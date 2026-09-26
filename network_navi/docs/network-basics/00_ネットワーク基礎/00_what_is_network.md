---
title: ネットワークとは・インターネットの構造
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ネットワークとは・インターネットの構造

## ネットワークとは

> 複数のコンピュータや通信機器を接続し、データをやり取りできるようにした仕組み

ネットワークとは、2台以上のコンピュータを通信媒体（ケーブルや無線）でつなぎ、データを送受信できる環境のことです。小規模な家庭内 LAN から、世界中の機器をつなぐインターネットまで、すべて「ネットワーク」という概念でとらえられます。

インターネット（Internet）は、世界中の無数のネットワーク同士を IP プロトコルで相互接続した「ネットワークのネットワーク」です。各家庭や企業の LAN は ISP（インターネットサービスプロバイダ）を経由してインターネットバックボーンに接続されており、ルータが宛先 IP アドレスを見てパケットを転送することで世界中の機器と通信できます。

ネットワークは規模によって以下のように分類されます。

| 種類 | 略称 | 範囲の目安 |
|------|------|-----------|
| ローカルエリアネットワーク | LAN | 同一建物・フロア |
| メトロポリタンエリアネットワーク | MAN | 都市規模 |
| ワイドエリアネットワーク | WAN | 国・大陸規模 |
| インターネット | — | 世界規模 |

## インターネットの構成要素

| 構成要素 | 役割 |
|----------|------|
| ルータ | パケットを宛先に向けて転送する |
| スイッチ | 同一 LAN 内でフレームを転送する |
| DNS サーバ | ドメイン名を IP アドレスに変換する |
| ISP | 家庭・企業をインターネットに接続する |
| IXP | ISP 同士が相互接続する拠点 |

```python
# Pythonでソケットを使った簡単なネットワーク疎通確認
import socket

def check_connectivity(host: str, port: int = 80) -> bool:
    """指定したホストへの TCP 接続が可能かを確認する"""
    try:
        with socket.create_connection((host, port), timeout=3) as sock:
            print(f"[OK] {host}:{port} に接続できました")
            print(f"     リモートアドレス: {sock.getpeername()}")
            print(f"     ローカルアドレス: {sock.getsockname()}")
            return True
    except (socket.timeout, ConnectionRefusedError, OSError) as e:
        print(f"[NG] 接続失敗: {e}")
        return False

# インターネット接続の確認
check_connectivity("www.google.com", 80)
check_connectivity("8.8.8.8", 53)   # Google Public DNS
```

## 使用場面

- 企業内の LAN 設計でスコープ（LAN/WAN）を決める際の基礎知識として
- ISP 選定や回線種別（光・モバイル）を比較する際の基準として
- ネットワーク障害時に問題箇所（LAN 内か WAN 側か）を切り分ける際に

## 参考文献

- [RFC 1122 – Requirements for Internet Hosts](https://www.rfc-editor.org/rfc/rfc1122)
- [Internet Society – How the Internet Works](https://www.internetsociety.org/internet/)
- Andrew S. Tanenbaum, "Computer Networks", 5th Edition

<AffiliateBanner site="network_navi" />
