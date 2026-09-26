---
title: ポートとソケットの概念
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ポートとソケットの概念

## ポートとソケットとは

> ポートは 0〜65535 の番号でトランスポート層の通信エンドポイントを識別し、ソケットは「IP アドレス + プロトコル + ポート番号」の組み合わせで一意の通信端点を表すプログラミング抽象

ポート（Port）は同一ホスト上の複数のアプリケーションが同時に通信を行うための識別子です。IP アドレスがホストを特定するのに対し、ポート番号はそのホスト上のどのアプリケーション（プロセス）に届けるかを特定します。

ソケット（Socket）は BSD UNIX で導入されたネットワーク通信の API 抽象で、アプリケーションはソケットに対して読み書きすることでネットワーク通信を行います。TCP コネクションは「クライアント IP:ポート ⟷ サーバ IP:ポート」の 4 組（4-tuple）で一意に識別されます。この 4-tuple が異なれば同じポートを持つ複数のコネクションが共存できます。

ポート番号はその用途によって 3 つに分類されます。Well-Known ポート（0〜1023）は HTTP(80)・HTTPS(443)・SSH(22)など著名なサービス、Registered ポート（1024〜49151）は特定アプリケーション用、Ephemeral ポート（49152〜65535）はクライアントが動的に使用する一時ポートです。

## 主な Well-Known ポート番号

| ポート | プロトコル | サービス |
|--------|-----------|---------|
| 20, 21 | TCP | FTP（データ/制御） |
| 22 | TCP | SSH |
| 25 | TCP | SMTP |
| 53 | TCP/UDP | DNS |
| 80 | TCP | HTTP |
| 110 | TCP | POP3 |
| 143 | TCP | IMAP |
| 443 | TCP | HTTPS |
| 465/587 | TCP | SMTPS/Submission |
| 3306 | TCP | MySQL |
| 5432 | TCP | PostgreSQL |
| 6379 | TCP | Redis |

## ソケットの種類

| 種類 | 説明 | 用途 |
|------|------|------|
| SOCK_STREAM | TCP、コネクション指向 | HTTP, SSH, DB |
| SOCK_DGRAM | UDP、コネクションレス | DNS, VoIP |
| SOCK_RAW | IP 直接操作 | ping, traceroute |
| SOCK_SEQPACKET | 順序保証データグラム | SCTP |

```python
import socket
import threading
import time

def echo_server(host: str = "127.0.0.1", port: int = 19999):
    """シンプルな TCP エコーサーバ"""
    # ソケット作成: AF_INET=IPv4, SOCK_STREAM=TCP
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server_sock:
        server_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server_sock.bind((host, port))
        server_sock.listen(1)
        print(f"  [Server] リッスン中: {host}:{port}")

        conn, addr = server_sock.accept()
        with conn:
            print(f"  [Server] 接続受付: {addr}")
            while True:
                data = conn.recv(1024)
                if not data:
                    break
                print(f"  [Server] 受信: {data.decode()!r} → エコー送信")
                conn.sendall(data)  # エコー

def echo_client(host: str = "127.0.0.1", port: int = 19999):
    """エコークライアント"""
    time.sleep(0.2)  # サーバ起動待ち
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as client_sock:
        client_sock.connect((host, port))
        local_addr = client_sock.getsockname()
        peer_addr  = client_sock.getpeername()
        print(f"\n  [Client] 接続確立")
        print(f"    ローカル（エフェメラルポート）: {local_addr}")
        print(f"    リモート（Well-Known ポート）: {peer_addr}")
        print(f"    4-tuple: {local_addr[0]}:{local_addr[1]} ↔ {peer_addr[0]}:{peer_addr[1]}\n")

        messages = ["Hello", "QUIC is UDP-based", "Port 443 = HTTPS"]
        for msg in messages:
            client_sock.sendall(msg.encode())
            response = client_sock.recv(1024)
            print(f"  [Client] 送信: {msg!r} → 受信: {response.decode()!r}")

def show_port_categories():
    print("\n=== ポート番号カテゴリ ===")
    categories = [
        ("Well-Known",  0,     1023,  "HTTP(80), HTTPS(443), SSH(22), DNS(53)"),
        ("Registered",  1024,  49151, "MySQL(3306), Redis(6379), PostgreSQL(5432)"),
        ("Ephemeral",   49152, 65535, "クライアントが動的に使用する一時ポート"),
    ]
    for name, start, end, example in categories:
        print(f"  {name:<12}: {start:>5}〜{end:<5}  例: {example}")

# 実際のソケット通信デモ
print("=== TCP ソケット通信デモ ===\n")
server_thread = threading.Thread(target=echo_server, daemon=True)
server_thread.start()

client_thread = threading.Thread(target=echo_client)
client_thread.start()
client_thread.join()

show_port_categories()

# UDP ソケットの確認
print("\n=== UDP ソケット（コネクションレス）===")
with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as udp_sock:
    udp_sock.bind(("127.0.0.1", 0))  # OS が自動でポートを割り当て
    addr = udp_sock.getsockname()
    print(f"  UDP ソケット作成: {addr}")
    print(f"  connect() は不要（コネクションレス）")
    print(f"  sendto() で都度宛先を指定して送信")
```

## 使用場面

- サーバアプリケーション開発で `bind()` するポート番号を選択し、`SO_REUSEADDR` で再起動時のポート競合を回避する際に
- ファイアウォールルールでポート番号によるアクセス制御（ポートフィルタリング）を設定する際に
- `ss -tlnp` や `netstat -tlnp` でリッスン中のポートとプロセスを確認し、不要なサービスを検出する際に

## 参考文献

- [RFC 6335 – Internet Assigned Numbers Authority (IANA) Procedures for Port Numbers](https://www.rfc-editor.org/rfc/rfc6335)
- [IANA – Service Name and Transport Protocol Port Number Registry](https://www.iana.org/assignments/service-names-port-numbers/)
- [Beej's Guide to Network Programming](https://beej.us/guide/bgnet/)

<AffiliateBanner site="network_navi" />
