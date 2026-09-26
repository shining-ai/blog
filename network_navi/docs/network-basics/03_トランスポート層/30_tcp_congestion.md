---
title: TCP の輻輳制御（スロースタート・CUBIC）
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# TCP の輻輳制御（スロースタート・CUBIC）

## 輻輳制御とは

> ネットワーク全体の混雑（輻輳）を検知し、送信側が自律的に送出量を調整してパケットロスやキュー遅延を防ぐ仕組み

フロー制御が受信側バッファを保護するのに対し、輻輳制御はネットワーク経路上のルータのバッファが溢れないよう送信側が自律的に制御します。TCP は輻輳ウィンドウ（cwnd）を用いて送出量を管理し、パケットロスや遅延増大を輻輳のシグナルとして cwnd を調整します。

スロースタートは接続直後に cwnd を 1 MSS から始め、ACK を受け取るたびに指数的に増加させる手法です。cwnd が閾値（ssthresh）を超えると「輻輳回避」フェーズに入り、線形増加に切り替えます。パケットロスを検出すると ssthresh を半分に下げてスロースタートかフロースタートからやり直します。

CUBIC（Linux のデフォルト）は従来の AIMD（Additive Increase / Multiplicative Decrease）を改善し、cwnd の増加曲線を三次関数で制御します。高帯域・高遅延（High BDP）環境でも素早く帯域を回復でき、現代の高速インターネットに適しています。

## 輻輳制御アルゴリズムの比較

| アルゴリズム | 輻輳検出方法 | 増加モデル | 特徴 |
|-------------|-------------|-----------|------|
| Tahoe | タイムアウト・3重複ACK | 指数→線形 | 初期の実装、シンプル |
| Reno | タイムアウト・3重複ACK | 指数→線形→半減 | Fast Recovery 追加 |
| CUBIC | タイムアウト・3重複ACK | 三次関数 | Linux デフォルト |
| BBR | 帯域・RTT の測定 | モデルベース | Google 開発、遅延ベース |

## スロースタートと輻輳回避の遷移

| 状態 | cwnd の変化 | 遷移条件 |
|------|------------|---------|
| スロースタート | ACK ごとに +1 MSS（指数的増加） | cwnd ≥ ssthresh |
| 輻輳回避 | RTT ごとに +1 MSS（線形増加） | パケットロス検出 |
| 高速再転送 | ssthresh = cwnd/2, cwnd = ssthresh | 3 重複 ACK |
| タイムアウト | ssthresh = cwnd/2, cwnd = 1 MSS | RTO 満了 |

```python
from dataclasses import dataclass

MSS = 1460  # Maximum Segment Size（バイト）

@dataclass
class TCPCongestionControl:
    """TCP 輻輳制御（Reno ベース）のシミュレーション"""
    cwnd: float = MSS          # 輻輳ウィンドウ（バイト）
    ssthresh: float = 64 * MSS # スロースタート閾値
    state: str = "slow_start"

    def on_ack(self):
        """ACK 受信時の cwnd 更新"""
        if self.state == "slow_start":
            self.cwnd += MSS  # 指数的増加（ACK ごとに +1 MSS）
            if self.cwnd >= self.ssthresh:
                self.state = "congestion_avoidance"
        elif self.state == "congestion_avoidance":
            self.cwnd += MSS * (MSS / self.cwnd)  # 線形増加（RTT ごとに +1 MSS）

    def on_triple_dup_ack(self):
        """3 重複 ACK（高速再転送）"""
        self.ssthresh = max(self.cwnd / 2, 2 * MSS)
        self.cwnd = self.ssthresh  # Fast Recovery: cwnd = ssthresh
        self.state = "congestion_avoidance"
        print(f"    [輻輳] 3重複ACK → ssthresh={self.ssthresh/MSS:.1f} MSS, "
              f"cwnd={self.cwnd/MSS:.1f} MSS")

    def on_timeout(self):
        """タイムアウト（深刻な輻輳）"""
        self.ssthresh = max(self.cwnd / 2, 2 * MSS)
        self.cwnd = MSS  # スロースタートに戻る
        self.state = "slow_start"
        print(f"    [輻輳] タイムアウト → ssthresh={self.ssthresh/MSS:.1f} MSS, "
              f"cwnd=1 MSS")

class CUBICCongestionControl:
    """CUBIC 輻輳制御のシミュレーション（簡略版）"""
    BETA = 0.7    # 輻輳後の乗算減少係数
    C    = 0.4    # CUBIC スケーリング定数

    def __init__(self):
        self.cwnd = MSS
        self.w_max = 0.0   # 輻輳前の cwnd 最大値
        self.t_epoch = 0.0  # 輻輳後の経過時間（秒）
        self.ssthresh = 64 * MSS

    def on_congestion(self):
        """輻輳検出時"""
        self.w_max = self.cwnd
        self.cwnd = self.cwnd * self.BETA
        self.ssthresh = self.cwnd
        self.t_epoch = 0.0

    def cwnd_cubic(self, t: float) -> float:
        """CUBIC の三次関数で cwnd を計算"""
        k = (self.w_max * (1 - self.BETA) / self.C) ** (1/3)
        w_cubic = self.C * (t - k) ** 3 + self.w_max
        return max(w_cubic, MSS)

    def simulate(self, total_rtt: int = 20) -> list[tuple[int, float]]:
        history = []
        for rtt in range(total_rtt):
            self.t_epoch += 0.1  # 100ms RTT
            self.cwnd = self.cwnd_cubic(self.t_epoch)
            history.append((rtt, self.cwnd / MSS))
            if rtt == 12:  # 輻輳発生シミュレーション
                self.on_congestion()
        return history

# Reno のシミュレーション
print("=== TCP Reno 輻輳制御 ===\n")
reno = TCPCongestionControl()
for rtt in range(25):
    reno.on_ack()
    if rtt % 5 == 0:
        print(f"  RTT={rtt:2d}: cwnd={reno.cwnd/MSS:6.1f} MSS, "
              f"state={reno.state}, ssthresh={reno.ssthresh/MSS:.0f} MSS")
    if rtt == 10:
        reno.on_triple_dup_ack()
    if rtt == 18:
        reno.on_timeout()

# CUBIC のシミュレーション
print("\n=== CUBIC 輻輳制御 ===")
cubic = CUBICCongestionControl()
cubic.w_max = 50 * MSS
history = cubic.simulate(20)
for rtt, cwnd_mss in history[::4]:
    print(f"  RTT={rtt:2d}: cwnd={cwnd_mss:6.1f} MSS")
```

## 使用場面

- Linux サーバで `/proc/sys/net/ipv4/tcp_congestion_control` を確認・変更して高帯域環境を最適化する際に
- クラウド環境やデータセンター間の高スループット通信で BBR や CUBIC の適切な選択を検討する際に
- CDN や動画ストリーミングサービスで輻輳制御アルゴリズムを調整してユーザ体験を改善する際に

## 参考文献

- [RFC 5681 – TCP Congestion Control](https://www.rfc-editor.org/rfc/rfc5681)
- [RFC 8312 – CUBIC for Fast and Long-Distance Networks](https://www.rfc-editor.org/rfc/rfc8312)
- [Google – BBR Congestion Control](https://cloud.google.com/blog/products/networking/tcp-bbr-congestion-control-comes-to-gcp-your-internet-just-got-faster)

<AffiliateBanner site="network_navi" />
