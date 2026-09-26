import AffiliateBanner from '@site/src/components/AffiliateBanner';

# WebSocket（双方向通信プロトコル）

## WebSocket とは

> WebSocket とは HTTP のアップグレードハンドシェイクを経てサーバ・クライアント間に持続的な全二重通信チャネルを確立するプロトコル（RFC 6455）であり、リアルタイムアプリケーションにおける低遅延双方向通信を実現する。

従来の HTTP はリクエスト・レスポンス型のプロトコルであり、クライアントがリクエストを送らないとサーバからデータを受信できませんでした。チャットやリアルタイム通知を実現するためにポーリング（一定間隔での HTTP リクエスト）や Long Polling などの技法が使われてきましたが、これらはオーバーヘッドが大きく遅延が避けられません。

WebSocket は最初に HTTP の GET リクエストで接続をアップグレードします。クライアントは `Connection: Upgrade` と `Upgrade: websocket` ヘッダを送り、サーバが 101 Switching Protocols を返すと TCP 接続を流用した WebSocket の双方向チャネルが確立されます。その後はフレーム単位でデータを送受信し、HTTP ヘッダのオーバーヘッドが不要になります。

WebSocket のフレーム形式はコンパクトで、2〜10 バイトのヘッダにデータが続きます。テキストフレーム（UTF-8）とバイナリフレームの 2 種類があり、ping/pong フレームによる接続維持（Keep-Alive）もプロトコルレベルでサポートされています。

wss://（WebSocket Secure）は TLS 上で動作し、HTTPS と同じポート 443 を使えます。ファイアウォールやプロキシに遮断されにくいという利点があります。

## HTTP ポーリングと WebSocket の比較

| 手法 | 遅延 | 帯域効率 | サーバ負荷 | 双方向性 |
|------|------|---------|---------|---------|
| ショートポーリング | 高い | 低い | 高い | 擬似的 |
| Long Polling | 中程度 | 中程度 | 中程度 | 擬似的 |
| Server-Sent Events | 低い（S→C のみ） | 高い | 低い | 一方向 |
| WebSocket | 非常に低い | 高い | 低い | 完全双方向 |

```python
import asyncio
import json
from datetime import datetime, timezone

# ===========================
# WebSocket の概念的実装（websockets ライブラリを模擬）
# ===========================

class WebSocketFrame:
    """WebSocket フレームの簡易表現"""
    def __init__(self, opcode: int, payload: bytes, fin: bool = True):
        self.opcode = opcode   # 0x1=テキスト, 0x2=バイナリ, 0x8=クローズ, 0x9=ping, 0xA=pong
        self.payload = payload
        self.fin = fin         # 最終フレームか

    OPCODES = {0x0: "継続", 0x1: "テキスト", 0x2: "バイナリ",
               0x8: "クローズ", 0x9: "ping", 0xA: "pong"}

    def __repr__(self):
        op = self.OPCODES.get(self.opcode, f"0x{self.opcode:02x}")
        return f"Frame(op={op}, len={len(self.payload)}, fin={self.fin})"

    def encode(self) -> bytes:
        """フレームをバイト列に符号化（簡略版）"""
        header = bytes([
            (0x80 if self.fin else 0x00) | self.opcode,
            len(self.payload) & 0x7F,  # マスクビット=0, ペイロード長（最大125）
        ])
        return header + self.payload


class MockWebSocket:
    """WebSocket 接続のモック実装"""

    def __init__(self, conn_id: str):
        self.conn_id = conn_id
        self.is_open = False
        self._send_queue: list[dict] = []
        self._recv_queue: list[str] = []

    def connect(self) -> None:
        """HTTP → WebSocket のアップグレードハンドシェイク（概念）"""
        print(f"[{self.conn_id}] HTTP アップグレードハンドシェイク:")
        print(f"  Client → GET / HTTP/1.1")
        print(f"           Upgrade: websocket")
        print(f"           Connection: Upgrade")
        print(f"           Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==")
        print(f"  Server ← HTTP/1.1 101 Switching Protocols")
        print(f"           Upgrade: websocket")
        print(f"           Connection: Upgrade")
        print(f"           Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=")
        self.is_open = True
        print(f"  [接続確立] WebSocket チャネルがオープン")

    def send(self, message: dict) -> WebSocketFrame:
        """メッセージ送信"""
        payload = json.dumps(message, ensure_ascii=False).encode("utf-8")
        frame = WebSocketFrame(opcode=0x1, payload=payload)
        self._send_queue.append(message)
        return frame

    def receive(self, raw_message: str) -> dict:
        """メッセージ受信"""
        return json.loads(raw_message)

    def ping(self) -> WebSocketFrame:
        """ping フレームを送信（接続確認）"""
        return WebSocketFrame(opcode=0x9, payload=b"ping")

    def close(self, code: int = 1000, reason: str = "Normal Closure") -> WebSocketFrame:
        """接続クローズ"""
        payload = code.to_bytes(2, "big") + reason.encode("utf-8")
        self.is_open = False
        return WebSocketFrame(opcode=0x8, payload=payload)


class ChatServer:
    """WebSocket を使ったチャットサーバのシミュレーション"""

    def __init__(self):
        self.clients: dict[str, MockWebSocket] = {}
        self.history: list[dict] = []

    def connect(self, client_id: str) -> MockWebSocket:
        ws = MockWebSocket(client_id)
        ws.connect()
        self.clients[client_id] = ws
        return ws

    def broadcast(self, message: dict, exclude: str = "") -> None:
        """全クライアントにメッセージをブロードキャスト"""
        for cid, ws in self.clients.items():
            if cid != exclude and ws.is_open:
                frame = ws.send(message)
                print(f"  → {cid} へ送信: {frame}")

    def handle_message(self, sender_id: str, text: str) -> None:
        msg = {
            "type": "message",
            "from": sender_id,
            "text": text,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        self.history.append(msg)
        self.broadcast(msg)


# ===========================
# デモ実行
# ===========================

print("=== WebSocket チャットサーバデモ ===\n")
server = ChatServer()

# クライアント接続
print("--- クライアント Alice の接続 ---")
ws_alice = server.connect("Alice")

print("\n--- クライアント Bob の接続 ---")
ws_bob = server.connect("Bob")

# メッセージ送受信
print("\n--- Alice がメッセージ送信 ---")
server.handle_message("Alice", "こんにちは Bob！")

print("\n--- Bob がメッセージ送信 ---")
server.handle_message("Bob", "Alice！元気ですか？")

# フレームの確認
print("\n--- WebSocket フレームの詳細 ---")
test_message = {"type": "message", "from": "Alice", "text": "Hello!"}
frame = ws_alice.send(test_message)
encoded = frame.encode()
print(f"  テキストフレーム: {frame}")
print(f"  符号化バイト: {encoded[:10]}... (合計 {len(encoded)} バイト)")

print(f"\n--- ping/pong（接続維持） ---")
ping_frame = ws_alice.ping()
print(f"  ping: {ping_frame}")
pong = WebSocketFrame(opcode=0xA, payload=b"pong")
print(f"  pong: {pong}")

# 接続クローズ
print(f"\n--- Bob が接続クローズ ---")
close_frame = ws_bob.close(code=1000, reason="Normal Closure")
print(f"  クローズフレーム: {close_frame}")
```

## 使用場面

- チャットアプリやオンラインゲームでリアルタイムなメッセージ送受信が必要な場合
- 株価・仮想通貨などのリアルタイムデータフィードをブラウザに配信する場合
- コラボレーションツール（共同編集・ホワイトボード）でユーザー操作を即座に全員に伝達する場合

## 参考文献

- [RFC 6455 – The WebSocket Protocol](https://www.rfc-editor.org/rfc/rfc6455)
- [MDN – WebSocket API](https://developer.mozilla.org/ja/docs/Web/API/WebSocket)
- Fette, I. and Melnikov, A. "The WebSocket Protocol" (2011)

<AffiliateBanner site="network_navi" />
