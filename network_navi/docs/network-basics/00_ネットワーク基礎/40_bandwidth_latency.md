---
title: 帯域・遅延・スループットの概念
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 帯域・遅延・スループットの概念

## 帯域・遅延・スループットとは

> ネットワーク回線の性能を表す 3 つの指標で、それぞれ「最大転送速度」「通信の往復時間」「実際の転送速度」を意味する

ネットワークの性能を語る際は帯域幅・遅延・スループットの 3 つを区別することが重要です。カタログスペックとして「1Gbps 回線」と表記されるのは帯域幅ですが、実際のファイル転送速度（スループット）は TCP の輻輳制御や遅延の影響を受けて大きく低下することがあります。

- **帯域幅（Bandwidth）**: 回線が物理的に送れる最大データ量（bps 単位）
- **遅延（Latency/RTT）**: パケットが送信元から宛先に届き返ってくるまでの時間（ms 単位）
- **スループット（Throughput）**: 実際に転送できたデータ量（bps 単位）

## 各指標の比較

| 指標 | 単位 | 影響要因 | 測定方法 |
|------|------|----------|---------|
| 帯域幅 | bps, Mbps, Gbps | 物理媒体・機器 | 理論値（カタログ） |
| 遅延（RTT） | ms | 距離・ルータ処理・輻輳 | ping, traceroute |
| スループット | bps | 帯域幅・RTT・損失率 | iperf3, speedtest |
| パケットロス率 | % | 輻輳・ノイズ・障害 | ping -c 100 |
| ジッタ | ms | 輻輳・経路変動 | VoIP 品質測定ツール |

## 帯域幅遅延積（BDP）

```
BDP (bytes) = 帯域幅 (bps) × RTT (秒) / 8

例: 1Gbps 回線, RTT = 100ms
BDP = 1,000,000,000 × 0.1 / 8 = 12,500,000 bytes ≈ 12.5 MB

→ 最大限活用するには TCP ウィンドウサイズを 12.5 MB 以上にする必要がある
```

```python
import socket
import time
import statistics

def measure_rtt(host: str, port: int = 80, count: int = 5) -> dict:
    """TCP RTT を複数回測定して統計を返す"""
    rtts = []

    for i in range(count):
        start = time.perf_counter()
        try:
            with socket.create_connection((host, port), timeout=5):
                rtt_ms = (time.perf_counter() - start) * 1000
                rtts.append(rtt_ms)
                print(f"  試行 {i+1}: RTT = {rtt_ms:.2f} ms")
        except OSError as e:
            print(f"  試行 {i+1}: エラー - {e}")

    if not rtts:
        return {}

    return {
        "min_ms":  min(rtts),
        "max_ms":  max(rtts),
        "avg_ms":  statistics.mean(rtts),
        "jitter_ms": statistics.stdev(rtts) if len(rtts) > 1 else 0.0,
    }

def calc_bdp(bandwidth_bps: int, rtt_sec: float) -> int:
    """帯域幅遅延積（BDP）を計算する"""
    return int(bandwidth_bps * rtt_sec / 8)

print("=== RTT 測定 ===")
result = measure_rtt("www.google.com", 80, count=5)
if result:
    print(f"\n平均 RTT: {result['avg_ms']:.2f} ms")
    print(f"ジッタ:   {result['jitter_ms']:.2f} ms")

    # BDP の計算
    rtt_sec = result['avg_ms'] / 1000
    bdp = calc_bdp(1_000_000_000, rtt_sec)  # 1Gbps 回線
    print(f"\nBDP (1Gbps 回線): {bdp / 1024 / 1024:.1f} MB")
```

## 使用場面

- アプリケーションのパフォーマンスチューニングで TCP バッファサイズを設定する際に
- SLA（サービスレベルアグリーメント）でネットワーク品質基準を定める際に
- CDN やエッジサーバの配置計画で遅延を最小化する設計をする際に

## 参考文献

- [RFC 6349 – Framework for TCP Throughput Testing](https://www.rfc-editor.org/rfc/rfc6349)
- [iperf3 公式ドキュメント](https://iperf.fr/iperf-doc.php)
- W. Richard Stevens, "TCP/IP Illustrated, Volume 1", Chapter 20

<AffiliateBanner site="network_navi" />
