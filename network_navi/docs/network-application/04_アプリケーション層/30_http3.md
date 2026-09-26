---
title: HTTP/3（QUIC ベース）
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# HTTP/3（QUIC ベース）

## HTTP/3 とは

> RFC 9114 で標準化された HTTP の最新メジャーバージョン。TCP の代わりに QUIC（UDP ベース）をトランスポート層に採用し、HOL ブロッキングの完全解消・0-RTT 再接続・接続マイグレーションを実現

HTTP/3 は 2022 年に RFC 9114 として標準化されました。HTTP/2 まで TCP を使用していた HTTP が初めてトランスポート層を QUIC（UDP）に変更した大改革です。

HTTP/2 は HTTP レベルの HOL ブロッキングを解消しましたが、TCP レベルの HOL ブロッキングは残存していました。1 つのパケットロスが TCP ストリーム全体を停止させてしまうため、多くのストリームが同居する HTTP/2 コネクションでは想定以上の遅延が生じます。HTTP/3 は UDP 上の QUIC を使うことでこの問題を根本から解決しました。

ヘッダ圧縮も HPACK から QPACK に進化しました。HPACK は HTTP/2 の単一 TCP ストリームの順序を前提としていましたが、QUIC のストリームは順序が保証されないため、QPACK はストリーム間での参照を安全に扱える設計に変更されています。

## HTTP/1.1 vs HTTP/2 vs HTTP/3 の比較

| 項目 | HTTP/1.1 | HTTP/2 | HTTP/3 |
|------|----------|--------|--------|
| トランスポート | TCP | TCP | QUIC (UDP) |
| 多重化 | なし | あり | あり |
| HOL ブロッキング | TCP + HTTP | TCP のみ | なし |
| ヘッダ圧縮 | なし | HPACK | QPACK |
| 接続確立 | TCP 1RTT | TCP 1RTT + TLS 1RTT | QUIC 1RTT (再接続 0RTT) |
| 接続マイグレーション | 不可 | 不可 | 可 |
| 暗号化 | オプション (TLS) | 事実上必須 | 必須 (組み込み) |

## HTTP/3 の主要コンポーネント

| コンポーネント | 説明 |
|--------------|------|
| QUIC トランスポート | UDP 上の信頼性・多重化・暗号化 |
| QPACK | QUIC 向けヘッダ圧縮（HPACK の後継） |
| HTTP/3 フレーム | HEADERS, DATA, SETTINGS 等 |
| 0-RTT | セッション再開時の事前データ送信 |

```python
from dataclasses import dataclass, field
from enum import IntEnum
from typing import Optional
import time

class H3FrameType(IntEnum):
    DATA          = 0x0
    HEADERS       = 0x1
    CANCEL_PUSH   = 0x3
    SETTINGS      = 0x4
    PUSH_PROMISE  = 0x5
    GOAWAY        = 0x7
    MAX_PUSH_ID   = 0xD

@dataclass
class H3Frame:
    stream_id: int
    frame_type: H3FrameType
    payload: bytes = b''

    def __str__(self):
        return (f"H3Frame(stream={self.stream_id} "
                f"type={self.frame_type.name} "
                f"len={len(self.payload)})")

class QPACKEncoder:
    """QPACK ヘッダ圧縮の簡易シミュレーション"""

    # QPACK 静的テーブル（抜粋）
    STATIC_TABLE = {
        (":authority", ""):           0,
        (":path", "/"):               1,
        (":method", "GET"):           17,
        (":method", "POST"):          20,
        (":scheme", "https"):         22,
        (":status", "200"):           25,
        (":status", "404"):           27,
        ("content-type", "application/json"): 45,
        ("content-type", "text/html; charset=utf-8"): 43,
    }

    def __init__(self):
        self.dynamic_table: list[tuple[str, str]] = []

    def encode(self, headers: list[tuple[str, str]]) -> tuple[bytes, str]:
        parts = []
        log_lines = []
        for name, value in headers:
            key = (name, value)
            if key in self.STATIC_TABLE:
                idx = self.STATIC_TABLE[key]
                parts.append(bytes([idx & 0x3F | 0xC0]))
                log_lines.append(f"  {name}: {value} → 静的[{idx}] (1B)")
            else:
                raw = f"{name}: {value}".encode()
                parts.append(raw)
                log_lines.append(f"  {name}: {value} → リテラル ({len(raw)}B)")
        return b"".join(parts), "\n".join(log_lines)

def simulate_http3_request():
    """HTTP/3 リクエスト・レスポンスのシミュレーション"""
    print("=== HTTP/3 (QUIC ベース) リクエスト ===\n")
    encoder = QPACKEncoder()

    # HTTP/3 では疑似ヘッダ（:method, :path 等）は必須
    request_headers = [
        (":method",    "GET"),
        (":path",      "/api/v1/users"),
        (":scheme",    "https"),
        (":authority", "api.example.com"),
        ("accept",     "application/json"),
    ]

    print("[接続確立: QUIC 1-RTT ハンドシェイク（TLS 1.3 統合）]")
    print("  Client → Server: Initial (CRYPTO: ClientHello)")
    print("  Server → Client: Initial (CRYPTO: ServerHello + 証明書 + Finished)")
    print("  Client → Server: Handshake (CRYPTO: Finished) + 初回 HTTP リクエスト")
    print("  → 合計 1 RTT でデータ送信開始（TCP+TLS は 2 RTT）\n")

    encoded, log = encoder.encode(request_headers)
    request_frame = H3Frame(
        stream_id=0,
        frame_type=H3FrameType.HEADERS,
        payload=encoded,
    )
    raw_header_size = sum(len(n) + len(v) + 4 for n, v in request_headers)
    print(f"HEADERS フレーム: {request_frame}")
    print(f"  元サイズ: {raw_header_size}B → QPACK 圧縮後: {len(encoded)}B")
    print(f"  圧縮詳細:\n{log}\n")

    data_frame = H3Frame(stream_id=0, frame_type=H3FrameType.DATA,
                          payload=b'')  # GET なのでボディなし
    print("DATA フレーム（GET なし）\n")

def simulate_0rtt():
    """0-RTT 再接続のシミュレーション"""
    print("=== 0-RTT 再接続（セッション再開） ===\n")
    print("[初回接続: 1 RTT]")
    print("  Client → Server: QUIC Initial (ClientHello)")
    print("  Server → Client: QUIC Initial + Handshake (ServerHello + Cert + Finished)")
    print("  Client → Server: Finished → セッションチケット保存")
    print("  RTT 消費: 1 RTT\n")

    print("[2 回目以降: 0 RTT]")
    print("  Client: 保存済みセッションチケットと 0-RTT キーを使用")
    print("  Client → Server: QUIC Initial + 0-RTT データ（HTTP リクエスト同梱）")
    print("  Server → Client: サーバ応答（データを即時処理）")
    print("  RTT 消費: 0 RTT（サーバ応答の往復を待たずにリクエスト送信）\n")
    print("  ★ 注意: 0-RTT データはリプレイ攻撃に脆弱なため冪等な GET のみ推奨")

simulate_http3_request()
simulate_0rtt()

print("\n=== HOL ブロッキングの解消 ===")
print("HTTP/2 (TCP): ストリーム 1 のパケットロス → 全ストリームが待機")
print("HTTP/3 (QUIC): ストリーム 1 のパケットロス → ストリーム 1 のみ待機")
print("  ストリーム 3, 5 は影響を受けず継続して処理される")
```

## 使用場面

- モバイルユーザ向け Web サービスで HTTP/3 を有効化し、パケットロスが多い環境でのパフォーマンスを改善する際に
- Cloudflare や Google Cloud のエッジで HTTP/3 が自動有効化されており、`alt-svc` ヘッダで対応状況を確認する際に
- gRPC の次世代としてマイクロサービス間通信に QUIC ベースの HTTP/3 を採用する際に

## 参考文献

- [RFC 9114 – HTTP/3](https://www.rfc-editor.org/rfc/rfc9114)
- [RFC 9204 – QPACK: Field Compression for HTTP/3](https://www.rfc-editor.org/rfc/rfc9204)
- [Cloudflare – HTTP/3: the past, the present, and the future](https://blog.cloudflare.com/http3-the-past-present-and-future/)

<AffiliateBanner site="network_navi" />
