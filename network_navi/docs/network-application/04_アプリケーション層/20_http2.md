---
title: HTTP/2 の多重化とヘッダ圧縮
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# HTTP/2 の多重化とヘッダ圧縮

## HTTP/2 とは

> RFC 7540 で標準化された HTTP のメジャーバージョンアップ。単一 TCP コネクション上でのストリーム多重化・HPACK ヘッダ圧縮・サーバプッシュを導入し、HTTP/1.1 のパフォーマンス問題を解決

HTTP/2 は 2015 年に RFC 7540 として標準化され、Google の SPDY プロトコルを基盤としています。HTTP/1.1 との後方互換性を保ちつつ、主にパフォーマンス面で大幅な改善を実現しました。

HTTP/2 の最大の特徴は「多重化（Multiplexing）」です。HTTP/1.1 では 1 TCP コネクションで 1 リクエストしか処理できず、ブラウザは複数ドメインへの接続（一般に 6〜8 本）を維持して並列化していました。HTTP/2 では 1 TCP コネクション上に複数の「ストリーム」を持ち、複数のリクエスト・レスポンスを並行処理できます。

「HPACK ヘッダ圧縮」も重要な改善です。HTTP/1.1 ではヘッダはテキストのまま毎回送信されていましたが、HTTP/2 ではヘッダテーブルで既出のヘッダを参照し、差分のみを送信します。Cookie やカスタムヘッダを多用するアプリケーションで大幅な削減効果があります。

## HTTP/1.1 vs HTTP/2 の比較

| 項目 | HTTP/1.1 | HTTP/2 |
|------|----------|--------|
| フォーマット | テキスト | バイナリ（フレーム） |
| 多重化 | なし（1 コネクション 1 リクエスト） | あり（1 コネクション N ストリーム） |
| ヘッダ圧縮 | なし | HPACK |
| サーバプッシュ | なし | あり（RFC 9113 で非推奨化） |
| HOL ブロッキング | TCP レベル・HTTP レベル両方 | HTTP レベルは解消（TCP は残存） |
| 接続数 | ドメイン毎に 6〜8 本 | 1 本 |

## HTTP/2 フレームタイプ

| フレーム | 用途 |
|---------|------|
| HEADERS | HTTP ヘッダ（リクエスト・レスポンス） |
| DATA | ペイロードデータ |
| SETTINGS | コネクション設定 |
| WINDOW_UPDATE | フロー制御のウィンドウ更新 |
| PING | 死活確認・RTT 測定 |
| GOAWAY | コネクション終了通知 |
| RST_STREAM | 個別ストリームのリセット |

```python
from dataclasses import dataclass, field
from enum import IntEnum

class FrameType(IntEnum):
    DATA          = 0x0
    HEADERS       = 0x1
    PRIORITY      = 0x2
    RST_STREAM    = 0x3
    SETTINGS      = 0x4
    PUSH_PROMISE  = 0x5
    PING          = 0x6
    GOAWAY        = 0x7
    WINDOW_UPDATE = 0x8
    CONTINUATION  = 0x9

@dataclass
class HTTP2Frame:
    """HTTP/2 フレームの表現"""
    stream_id: int       # 0 = コネクション全体、1以上 = 個別ストリーム
    frame_type: FrameType
    flags: int = 0
    payload: bytes = b''

    END_STREAM = 0x1
    END_HEADERS = 0x4

    @property
    def length(self) -> int:
        return len(self.payload)

    def __str__(self):
        flag_names = []
        if self.flags & self.END_STREAM:
            flag_names.append("END_STREAM")
        if self.flags & self.END_HEADERS:
            flag_names.append("END_HEADERS")
        flags_str = "|".join(flag_names) or "0"
        return (f"Frame(stream={self.stream_id} "
                f"type={self.frame_type.name} "
                f"flags={flags_str} len={self.length})")

class HPACKEncoder:
    """HPACK ヘッダ圧縮の簡易シミュレーション"""
    STATIC_TABLE = {
        ":method: GET":          2,
        ":method: POST":         3,
        ":path: /":              4,
        ":scheme: https":        7,
        ":status: 200":          8,
        ":status: 404":          13,
        "content-type: application/json": None,  # 動的テーブルに追加
    }

    def __init__(self):
        self.dynamic_table: dict[str, int] = {}
        self._next_index = 62  # 静的テーブルは 1〜61

    def encode(self, headers: dict[str, str]) -> tuple[bytes, list[str]]:
        """ヘッダをエンコードし、圧縮の様子を表示"""
        encoded_parts = []
        compression_log = []
        for name, value in headers.items():
            key = f"{name}: {value}"
            if key in self.STATIC_TABLE and self.STATIC_TABLE[key]:
                idx = self.STATIC_TABLE[key]
                encoded_parts.append(bytes([0x80 | idx]))
                compression_log.append(f"  {key!r} → 静的テーブル[{idx}] (1 byte)")
            elif key in self.dynamic_table:
                idx = self.dynamic_table[key]
                encoded_parts.append(bytes([0x80 | idx]))
                compression_log.append(f"  {key!r} → 動的テーブル[{idx}] (1 byte)")
            else:
                # 新規ヘッダはそのまま送信し動的テーブルに追加
                raw = f"{name}\x00{value}".encode()
                encoded_parts.append(raw)
                self.dynamic_table[key] = self._next_index
                self._next_index += 1
                compression_log.append(f"  {key!r} → リテラル ({len(raw)} bytes) → 動的テーブルに追加")
        return b"".join(encoded_parts), compression_log

def simulate_http2_multiplexing():
    """HTTP/2 多重化のシミュレーション"""
    print("=== HTTP/2 ストリーム多重化 ===\n")
    encoder = HPACKEncoder()

    requests = [
        (1, {"method": "GET",  "path": "/index.html"}),
        (3, {"method": "GET",  "path": "/style.css"}),
        (5, {"method": "POST", "path": "/api/data"}),
    ]

    for stream_id, hdrs in requests:
        pseudo = {f":{k}": v for k, v in hdrs.items()}
        pseudo[":scheme"] = "https"

        frame = HTTP2Frame(
            stream_id=stream_id,
            frame_type=FrameType.HEADERS,
            flags=HTTP2Frame.END_HEADERS,
        )
        print(f"[ストリーム {stream_id}] リクエスト送信")
        print(f"  {frame}")
        print(f"  ヘッダ: {pseudo}")

    print("\n--- DATA フレームが多重化される様子 ---")
    data_frames = [
        HTTP2Frame(1, FrameType.DATA, HTTP2Frame.END_STREAM, b"<html>...</html>"),
        HTTP2Frame(3, FrameType.DATA, HTTP2Frame.END_STREAM, b"body { color: red; }"),
        HTTP2Frame(5, FrameType.DATA, HTTP2Frame.END_STREAM, b'{"result": "ok"}'),
    ]
    for f in data_frames:
        print(f"  {f}  data={f.payload[:30]!r}")

    print("\n=== HPACK ヘッダ圧縮 ===\n")
    common_headers = {
        ":method": "GET", ":scheme": "https",
        ":path": "/api/users",
        "content-type": "application/json",
        "user-agent": "Mozilla/5.0",
    }

    for i in range(1, 3):
        raw_size = sum(len(k) + len(v) + 4 for k, v in common_headers.items())
        encoded, log = encoder.encode(common_headers)
        print(f"リクエスト {i}: 元のヘッダ {raw_size}B → 圧縮後 {len(encoded)}B")
        for l in log:
            print(l)
        print()

simulate_http2_multiplexing()
```

## 使用場面

- Nginx や Apache で HTTP/2 を有効化し、多数の静的ファイルを配信するフロントエンドのパフォーマンスを改善する際に
- gRPC（HTTP/2 ベース）でマイクロサービス間の低遅延・多重化 RPC 通信を実装する際に
- `curl --http2 -v` でサーバが HTTP/2 を返すか確認しパフォーマンス改善の効果を検証する際に

## 参考文献

- [RFC 7540 – Hypertext Transfer Protocol Version 2 (HTTP/2)](https://www.rfc-editor.org/rfc/rfc7540)
- [RFC 7541 – HPACK: Header Compression for HTTP/2](https://www.rfc-editor.org/rfc/rfc7541)
- [HTTP/2 explained – Daniel Stenberg](https://http2-explained.haxx.se/en/part1)

<AffiliateBanner site="network_navi" />
