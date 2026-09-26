import AffiliateBanner from '@site/src/components/AffiliateBanner';

# DDoS 攻撃の種類と対策

## DDoS 攻撃とは

> DDoS（Distributed Denial of Service）攻撃とは、多数のホストから標的サーバに大量のリクエストやパケットを送りつけることで、正規ユーザーがサービスを利用できない状態を引き起こす攻撃手法である。

DoS（Denial of Service）攻撃が単一ホストから実施されるのに対し、DDoS は世界中に分散した多数のボット（マルウェアに感染したホスト群 = ボットネット）を利用するため、発信元の遮断が極めて困難である。攻撃者は少ないコストで標的に甚大な損害（サービス停止・売上損失・ブランド失墜）を与えられる。

**DDoS の主な動機：**
- 競合他社への妨害・恐喝（身代金要求）
- ハクティビズム（政治的メッセージ）
- 注意をそらす「煙幕」（実際の侵入攻撃と並行して実施）

**影響の深刻さ：**
大規模な DDoS 攻撃は毎秒テラビット（Tbps）規模に達することもあり、単一の組織で対処することは現実的に不可能である。CDN や ISP レベルでの対策が不可欠となる。

## DDoS 攻撃の種類と対策

| 攻撃種別 | 仕組み | 対策 |
|---------|--------|------|
| **ボリューム攻撃**（UDP Flood・ICMP Flood） | 帯域幅を枯渇させる大量のパケット | 上流での帯域制限・CDN・anycast ルーティング |
| **プロトコル攻撃**（SYN Flood） | TCP ハーフオープン接続でサーバリソースを枯渇 | SYN Cookie・接続レート制限 |
| **反射・増幅攻撃**（DNS Amp・NTP Amp） | 送信元偽装で応答を標的に増幅して向ける | BCP38（IP スプーフィング防止）・レート制限 |
| **アプリケーション層攻撃**（HTTP Flood・Slowloris） | L7 でのリソース枯渇 | WAF・CAPTCHA・レート制限・Bot 検知 |
| **ランダムサブドメイン攻撃**（NXDOMAIN） | DNS サーバの負荷増大 | 権威 DNS のレート制限・DNS 防護サービス |

```python
# DDoS 対策の実装例：アプリケーション層でのレート制限
import time
from collections import deque
from threading import Lock

class RateLimiter:
    """
    スライディングウィンドウ方式によるレート制限の実装。
    SYN Flood や HTTP Flood のようなリクエスト過多に対する
    アプリケーション層での防御の一例。
    """

    def __init__(self, max_requests: int, window_seconds: float):
        """
        max_requests: ウィンドウ内の最大リクエスト数
        window_seconds: ウィンドウの秒数
        """
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._clients: dict[str, deque] = {}
        self._lock = Lock()

    def is_allowed(self, client_ip: str) -> bool:
        """
        指定クライアントからのリクエストを許可するかどうかを判定する。
        ウィンドウ内のリクエスト数が上限を超えていれば False を返す。
        """
        now = time.monotonic()
        with self._lock:
            if client_ip not in self._clients:
                self._clients[client_ip] = deque()

            window = self._clients[client_ip]

            # 期限切れのエントリを削除
            while window and now - window[0] > self.window_seconds:
                window.popleft()

            if len(window) >= self.max_requests:
                return False  # レート制限: ブロック

            window.append(now)
            return True  # 許可

    def get_remaining(self, client_ip: str) -> int:
        """残りリクエスト可能数を返す"""
        now = time.monotonic()
        with self._lock:
            if client_ip not in self._clients:
                return self.max_requests
            window = self._clients[client_ip]
            active = sum(1 for t in window if now - t <= self.window_seconds)
            return max(0, self.max_requests - active)


# === 設定例：アプリケーション層の防御 ===
# API エンドポイント：1 IP あたり 60 秒間に 100 リクエストまで
api_limiter = RateLimiter(max_requests=100, window_seconds=60)

# ログインエンドポイント：ブルートフォース防止のため厳しく制限
login_limiter = RateLimiter(max_requests=5, window_seconds=300)

# テスト
test_ip = "203.0.113.42"
print("=== API レート制限テスト ===")
for i in range(1, 6):
    allowed = api_limiter.is_allowed(test_ip)
    remaining = api_limiter.get_remaining(test_ip)
    print(f"  リクエスト {i}: {'許可' if allowed else 'ブロック'} (残り: {remaining})")

print("\n=== インフラレベルの対策一覧 ===")
infrastructure_defenses = {
    "Anycast ルーティング": "DDoS トラフィックを世界中の PoP に分散させる（Cloudflare・Akamai）",
    "BGP Blackhole": "攻撃先 IP へのトラフィックを上流 ISP でルートブラックホール処理",
    "SYN Cookie": "TCP SYN Flood への OSカーネルレベルでの対策",
    "Ingress Filtering": "ISP がお客様ネットワーク外の送信元 IP を持つパケットを遮断（BCP38）",
    "CDN + WAF": "Cloudflare・AWS Shield で L3〜L7 の攻撃を包括的に対策",
}
for measure, desc in infrastructure_defenses.items():
    print(f"  [{measure}] {desc}")
```

## 使用場面

- Web サービスの DDoS 耐性設計（Cloudflare / AWS Shield の導入判断）
- API サーバのレート制限設計（アプリケーション層 DDoS 対策）
- インシデント対応計画（DDoS 発生時の手順書作成）
- ISP や CDN との DDoS 対策契約・SLA の検討
- セキュリティ教育での「なぜインフラ分散が重要か」の説明

## 参考文献

- [CISA - Understanding and Responding to DDoS Attacks](https://www.cisa.gov/sites/default/files/publications/understanding-and-responding-to-ddos-attacks_508c.pdf)
- [Cloudflare - DDoS Attack Types](https://www.cloudflare.com/learning/ddos/ddos-attack-types/)
- [RFC 3704 - Ingress Filtering for Multihomed Networks (BCP 84)](https://www.rfc-editor.org/rfc/rfc3704)
- [OWASP - Denial of Service Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)

<AffiliateBanner site="security_navi" />
