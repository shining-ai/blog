import AffiliateBanner from '@site/src/components/AffiliateBanner';

# DDoS 攻撃の仕組みと対策

## DDoS 攻撃とは

> DDoS（Distributed Denial of Service）攻撃とは、世界中に分散した多数のボット（侵害済みコンピュータ）から標的に対して大量のトラフィックやリクエストを送りつけてサービスを停止・劣化させる攻撃である。

DoS 攻撃（単一ホストからの攻撃）と異なり、DDoS は数万〜数百万台のボットネットから同時に攻撃するため、単純な IP ブロックでは防御できません。攻撃は大きく 3 種類に分類されます。

ボリューム攻撃（Volume-based）は大量のトラフィックで帯域幅を枯渇させます。UDP フラッド・ICMP フラッド・DNS 増幅攻撃（リフレクション攻撃）が代表例です。DNS 増幅では偽装した送信元 IP で DNS クエリを送り、応答トラフィックを標的に集中させます（増幅係数 50〜100 倍）。

プロトコル攻撃（Protocol-based）は TCP の状態遷移の脆弱性を突きます。SYN フラッドでは SYN を大量送信して SYN_RECEIVED 状態のハーフオープン接続を枯渇させます。

アプリケーション層攻撃（L7 攻撃）は HTTP リクエストを送りつけてサーバの処理能力を枯渇させます。Slowloris はヘッダを細切れに送信して接続を長時間占有し、正規のリクエストをブロックします。

対策としては、CDN・クラウドの DDoS 緩和サービス（Cloudflare・AWS Shield）によるトラフィック吸収、レート制限（ソース IP ごとのリクエスト数制限）、SYN Cookie（ハーフオープン接続を持たない実装）、アノマリー検知があります。

## DDoS 攻撃の分類と対策

| 攻撃種別 | 代表例 | 攻撃レイヤ | 主な対策 |
|---------|--------|----------|---------|
| UDP フラッド | ランダム UDP | L3/L4 | レート制限・ブラックホールルーティング |
| DNS 増幅 | リフレクション | L3/L4 | DNS サーバの再帰クエリ制限 |
| SYN フラッド | TCP SYN 大量送信 | L4 | SYN Cookie・SYN プロキシ |
| HTTP フラッド | GET/POST 大量送信 | L7 | CAPTCHA・レート制限・WAF |
| Slowloris | 遅い HTTP ヘッダ | L7 | タイムアウト設定・同時接続数制限 |

```python
import time
import random
import collections
from dataclasses import dataclass, field
from ipaddress import IPv4Address

# ===========================
# SYN フラッドのシミュレーションと SYN Cookie 対策
# ===========================

@dataclass
class TCPConnection:
    src_ip: str
    src_port: int
    seq_num: int
    state: str  # SYN_RECEIVED / ESTABLISHED / CLOSED

class TCPServer:
    """通常の SYN フラッドに脆弱なサーバ（SYN Cookie なし）"""

    def __init__(self, max_halfopen: int = 100):
        self.half_open: dict[tuple, TCPConnection] = {}
        self.established: dict[tuple, TCPConnection] = {}
        self.max_halfopen = max_halfopen
        self.dropped = 0

    def handle_syn(self, src_ip: str, src_port: int, seq: int) -> str:
        if len(self.half_open) >= self.max_halfopen:
            self.dropped += 1
            return "DROP (half-open table full)"
        key = (src_ip, src_port)
        self.half_open[key] = TCPConnection(src_ip, src_port, seq, "SYN_RECEIVED")
        return f"SYN-ACK sent (half_open={len(self.half_open)})"

    def handle_ack(self, src_ip: str, src_port: int) -> str:
        key = (src_ip, src_port)
        if key in self.half_open:
            conn = self.half_open.pop(key)
            conn.state = "ESTABLISHED"
            self.established[key] = conn
            return "ESTABLISHED"
        return "REJECT (no SYN_RECEIVED)"


class SYNCookieServer:
    """SYN Cookie を使った DDoS 耐性のあるサーバ"""

    def __init__(self):
        self._secret = random.randint(0, 2**32 - 1)
        self.established: dict[tuple, TCPConnection] = {}
        self.dropped = 0

    def _make_cookie(self, src_ip: str, src_port: int, dst_port: int, timestamp: int) -> int:
        """SYN Cookie の生成（HMAC の簡略版）"""
        data = f"{src_ip}:{src_port}:{dst_port}:{timestamp}:{self._secret}"
        return hash(data) & 0xFFFFFFFF

    def handle_syn(self, src_ip: str, src_port: int, seq: int) -> str:
        """SYN 受信: テーブルを使わずに Cookie を ISN として返す"""
        t = int(time.time()) // 64  # 64秒単位のタイムスタンプ
        cookie = self._make_cookie(src_ip, src_port, 443, t)
        # SYN-ACK の ISN（Initial Sequence Number）として Cookie を埋め込む
        return f"SYN-ACK(ISN=cookie:{cookie:08x}) ← テーブル使用なし"

    def handle_ack(self, src_ip: str, src_port: int, ack_num: int) -> str:
        """ACK 受信: Cookie を検証して接続確立"""
        t = int(time.time()) // 64
        for delta in [0, 1]:  # 直近 2 タイムウィンドウを確認
            cookie = self._make_cookie(src_ip, src_port, 443, t - delta)
            if (ack_num - 1) & 0xFFFFFFFF == cookie:
                key = (src_ip, src_port)
                self.established[key] = TCPConnection(src_ip, src_port, ack_num, "ESTABLISHED")
                return f"ESTABLISHED (Cookie 検証成功)"
        return "REJECT (Cookie 検証失敗)"


# ===========================
# レート制限（Token Bucket アルゴリズム）
# ===========================

class TokenBucket:
    """トークンバケットによるレート制限"""

    def __init__(self, rate: float, capacity: int):
        """
        rate: 毎秒追加するトークン数
        capacity: バケットの最大容量
        """
        self.rate = rate
        self.capacity = capacity
        self.tokens = float(capacity)
        self.last_check = time.time()

    def consume(self, tokens: int = 1) -> bool:
        """トークンを消費できれば True（リクエストを許可）"""
        now = time.time()
        elapsed = now - self.last_check
        self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
        self.last_check = now

        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        return False


class DDoSMitigator:
    """簡易 DDoS 緩和システム"""

    def __init__(self, global_rate: float = 10000, per_ip_rate: float = 100):
        self.global_bucket = TokenBucket(global_rate, int(global_rate))
        self.ip_buckets: dict[str, TokenBucket] = {}
        self.ip_rate = per_ip_rate
        self.blocked_ips: set[str] = set()
        self.ip_request_counts: dict[str, int] = collections.defaultdict(int)

    def _get_ip_bucket(self, ip: str) -> TokenBucket:
        if ip not in self.ip_buckets:
            self.ip_buckets[ip] = TokenBucket(self.ip_rate, int(self.ip_rate * 2))
        return self.ip_buckets[ip]

    def check_request(self, src_ip: str) -> tuple[bool, str]:
        """リクエストを許可するか判定"""
        if src_ip in self.blocked_ips:
            return False, "IP ブロック済み"
        if not self.global_bucket.consume():
            return False, "グローバルレート超過"
        ip_bucket = self._get_ip_bucket(src_ip)
        if not ip_bucket.consume():
            self.ip_request_counts[src_ip] += 1
            if self.ip_request_counts[src_ip] > 5:
                self.blocked_ips.add(src_ip)
                return False, f"IP {src_ip} を自動ブロック"
            return False, f"IP レート超過 ({src_ip})"
        return True, "許可"


print("=== DDoS 攻撃デモ ===\n")

# SYN フラッドのシミュレーション
print("[SYN フラッド vs 通常サーバ]")
normal_server = TCPServer(max_halfopen=5)
for i in range(8):
    # 偽装された送信元 IP（SYN のみ、ACK なし）
    fake_ip = f"10.0.0.{i}"
    result = normal_server.handle_syn(fake_ip, random.randint(1024, 65535), random.randint(0, 2**32-1))
    print(f"  SYN from {fake_ip}: {result}")
print(f"  → 正規ユーザの接続がドロップ: {normal_server.dropped} 件")

print("\n[SYN Cookie サーバ（DDoS 耐性）]")
cookie_server = SYNCookieServer()
for i in range(3):
    fake_ip = f"10.0.0.{i}"
    r = cookie_server.handle_syn(fake_ip, 12345, i)
    print(f"  SYN from {fake_ip}: {r}")
print("  → テーブル使用なし！半開き接続の枯渇が起きない")

print("\n[レート制限（Token Bucket）]")
mitigator = DDoSMitigator(global_rate=1000, per_ip_rate=3)
ips = ["1.2.3.4"] * 6 + ["5.6.7.8"] * 3
allowed = 0
for ip in ips:
    ok, reason = mitigator.check_request(ip)
    if ok:
        allowed += 1
    else:
        print(f"  ブロック: {ip} → {reason}")
print(f"  許可: {allowed}/{len(ips)}")
```

## 使用場面

- CDN や DDoS 緩和サービス（Cloudflare・AWS Shield Advanced）を前段に配置してボリューム攻撃を吸収する場面
- SYN Cookie・SYN プロキシを有効化してフラッド攻撃によるサーバリソース枯渇を防ぐ場面
- レート制限とアノマリー検知を組み合わせてアプリケーション層攻撃（HTTP フラッド）を識別・ブロックする場面

## 参考文献

- NIST SP 800-61 "Computer Security Incident Handling Guide"
- Mirkovic, J. and Reiher, P. "A Taxonomy of DDoS Attack and DDoS Defense Mechanisms" (2004)
- [Cloudflare – DDoS 攻撃とは](https://www.cloudflare.com/ja-jp/learning/ddos/what-is-a-ddos-attack/)

<AffiliateBanner site="network_navi" />
