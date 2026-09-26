---
title: TCP/IP モデル（4 層）
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# TCP/IP モデル（4 層）

## TCP/IP モデルとは

> インターネットの実装に使われる実用的な 4 層のプロトコルスタックモデル

TCP/IP モデル（インターネットモデル）は DARPA が開発し、現在のインターネットで実際に使われているモデルです。OSI モデルの 7 層を 4 層に凝縮した形で、理論より実装を重視しています。OS のネットワークスタックや通信機器はこのモデルに沿って実装されており、エンジニアが「TCP/IP で通信する」というときはこの 4 層モデルを指します。

## TCP/IP の 4 層

| TCP/IP 層 | OSI 対応層 | 代表プロトコル | 役割 |
|-----------|-----------|---------------|------|
| アプリケーション層 | 5〜7層 | HTTP, DNS, SMTP, FTP | アプリ間の通信 |
| トランスポート層 | 4層 | TCP, UDP, QUIC | 端末間の信頼性・多重化 |
| インターネット層 | 3層 | IP, ICMP, BGP | ルーティング・アドレッシング |
| ネットワークインタフェース層 | 1〜2層 | Ethernet, Wi-Fi, PPP | 物理的な隣接ノード間転送 |

## OSI モデルとの対応

```
OSI 7層               TCP/IP 4層
┌──────────────┐
│ アプリケーション│
├──────────────┤      ┌──────────────────┐
│プレゼンテーション│ ─── │  アプリケーション層  │
├──────────────┤      └──────────────────┘
│  セッション   │
├──────────────┤      ┌──────────────────┐
│ トランスポート │ ─── │   トランスポート層   │
├──────────────┤      └──────────────────┘
│  ネットワーク  │ ─── ┌──────────────────┐
├──────────────┤      │  インターネット層    │
│  データリンク  │      └──────────────────┘
├──────────────┤      ┌──────────────────┐
│    物理      │ ─── │ネットワークインタフェース│
└──────────────┘      └──────────────────┘
```

```python
# Python の socket でTCP/IP 各層の情報を取得する
import socket
import struct

def show_tcp_ip_info(target_host: str, target_port: int):
    """TCP/IP 通信の各層の情報を表示する"""
    # DNS 解決（アプリケーション層）
    ip_addr = socket.gethostbyname(target_host)
    print(f"[アプリケーション層] {target_host} -> {ip_addr}")

    # TCP 接続（トランスポート層 + インターネット層）
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(3)
        s.connect((ip_addr, target_port))

        local_ip, local_port = s.getsockname()
        remote_ip, remote_port = s.getpeername()

        print(f"[トランスポート層]  ローカルポート={local_port}, リモートポート={remote_port}")
        print(f"[インターネット層]  ローカルIP={local_ip}, リモートIP={remote_ip}")
        print(f"[ネットワークIF層]  インタフェース={socket.gethostname()}")

show_tcp_ip_info("www.example.com", 80)
```

## 使用場面

- OS のネットワークスタックやカーネルコードを読む際の基礎として
- tcpdump や Wireshark でキャプチャしたパケットを層ごとに解釈する際に
- セキュリティ設計でどの層で制御するかを決定する際に

## 参考文献

- [RFC 1122 – Requirements for Internet Hosts](https://www.rfc-editor.org/rfc/rfc1122)
- [RFC 1123 – Requirements for Internet Hosts – Application and Support](https://www.rfc-editor.org/rfc/rfc1123)
- W. Richard Stevens, "TCP/IP Illustrated, Volume 1"

<AffiliateBanner site="network_navi" />
