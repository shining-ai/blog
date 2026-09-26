import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ロードバランサ（L4 と L7）

## ロードバランサとは

> ロードバランサとは複数のサーバに対してトラフィックを分散し、可用性の向上・スケールアウトを実現するネットワーク機器・ソフトウェアであり、L4（トランスポート層）ロードバランサと L7（アプリケーション層）ロードバランサの 2 種類がある。

単一サーバで処理できるリクエスト数には限界があります。ロードバランサはクライアントの接続を受け付け、バックエンドの複数サーバ（アップストリーム）に振り分けることで、水平スケールアウト（サーバ台数増加）を透過的に実現します。

L4 ロードバランサ（トランスポート層）は TCP/UDP の接続レベルで振り分けを行います。HTTP ヘッダの内容は見ません。高速で TLS 処理も不要（パススルー）ですが、コンテンツベースのルーティングはできません。実装例として AWS NLB（Network Load Balancer）・LVS（Linux Virtual Server）があります。

L7 ロードバランサ（アプリケーション層）は HTTP ヘッダ・URL パス・クッキーなどを解析して振り分けを決定します。/api/* は API サーバ群へ、/static/* は静的コンテンツサーバへという「コンテンツベースルーティング」が可能です。TLS 終端・圧縮・ヘッダ書き換え・セッションアフィニティ（スティッキーセッション）もサポートします。実装例として AWS ALB・Nginx・HAProxy があります。

分散アルゴリズムとして、ラウンドロビン（順番に振り分け）、最少接続数（接続数が最小のサーバを選択）、IP ハッシュ（同一 IP を同一サーバに）、重み付きラウンドロビン（サーバのスペックに応じた重み）があります。

## L4 と L7 ロードバランサの比較

| 項目 | L4 ロードバランサ | L7 ロードバランサ |
|------|-----------------|-----------------|
| 処理レイヤ | TCP/UDP | HTTP/HTTPS |
| ルーティング基準 | IP・ポート | URL・ヘッダ・クッキー |
| TLS 終端 | 不可（パススルー） | 可（再暗号化も可） |
| 処理速度 | 高速 | やや低速 |
| セッション維持 | IP ハッシュ | クッキーベース |
| ヘルスチェック | TCP 接続確認 | HTTP 200 確認 |
| 用途 | 超高トラフィック | Web API・マイクロサービス |

```python
import random
import time
from collections import defaultdict
from dataclasses import dataclass, field

@dataclass
class Backend:
    """バックエンドサーバ"""
    host: str
    port: int
    weight: int = 1
    active_connections: int = 0
    total_requests: int = 0
    healthy: bool = True

    def __str__(self):
        return f"{self.host}:{self.port}"


@dataclass
class Request:
    """HTTP リクエスト"""
    method: str
    path: str
    headers: dict = field(default_factory=dict)
    client_ip: str = "127.0.0.1"

    def get_host(self) -> str:
        return self.headers.get("Host", "")


class LoadBalancer:
    """L4 / L7 ロードバランサのシミュレーション"""

    def __init__(self, algorithm: str = "round_robin"):
        self.backends: list[Backend] = []
        self.algorithm = algorithm
        self._rr_index = 0
        self._ip_table: dict[str, Backend] = {}
        # L7 ルーティングルール: [(path_prefix, backends)]
        self._routing_rules: list[tuple[str, list[Backend]]] = []

    def add_backend(self, backend: Backend) -> None:
        self.backends.append(backend)

    def add_l7_rule(self, path_prefix: str, backends: list[Backend]) -> None:
        """L7 コンテンツベースルーティングルールを追加"""
        self._routing_rules.append((path_prefix, backends))

    def _healthy_backends(self, pool: list[Backend] | None = None) -> list[Backend]:
        target = pool if pool is not None else self.backends
        return [b for b in target if b.healthy]

    def _round_robin(self, pool: list[Backend]) -> Backend | None:
        healthy = self._healthy_backends(pool)
        if not healthy:
            return None
        backend = healthy[self._rr_index % len(healthy)]
        self._rr_index += 1
        return backend

    def _least_connections(self, pool: list[Backend]) -> Backend | None:
        healthy = self._healthy_backends(pool)
        if not healthy:
            return None
        return min(healthy, key=lambda b: b.active_connections)

    def _ip_hash(self, client_ip: str, pool: list[Backend]) -> Backend | None:
        healthy = self._healthy_backends(pool)
        if not healthy:
            return None
        idx = hash(client_ip) % len(healthy)
        return healthy[idx]

    def _weighted_round_robin(self, pool: list[Backend]) -> Backend | None:
        healthy = self._healthy_backends(pool)
        if not healthy:
            return None
        weighted = []
        for b in healthy:
            weighted.extend([b] * b.weight)
        backend = weighted[self._rr_index % len(weighted)]
        self._rr_index += 1
        return backend

    def _l7_route(self, request: Request) -> list[Backend]:
        """L7 パスベースルーティング"""
        for prefix, pool in self._routing_rules:
            if request.path.startswith(prefix):
                return pool
        return self.backends  # デフォルト

    def route(self, request: Request) -> Backend | None:
        """リクエストをバックエンドにルーティング"""
        # L7 ルールでプールを決定
        pool = self._l7_route(request)

        if self.algorithm == "round_robin":
            backend = self._round_robin(pool)
        elif self.algorithm == "least_connections":
            backend = self._least_connections(pool)
        elif self.algorithm == "ip_hash":
            backend = self._ip_hash(request.client_ip, pool)
        elif self.algorithm == "weighted_round_robin":
            backend = self._weighted_round_robin(pool)
        else:
            backend = self._round_robin(pool)

        if backend:
            backend.active_connections += 1
            backend.total_requests += 1

        return backend

    def complete(self, backend: Backend) -> None:
        """リクエスト完了後、接続数を減らす"""
        backend.active_connections = max(0, backend.active_connections - 1)

    def health_check(self) -> dict:
        """ヘルスチェック結果"""
        return {str(b): "UP" if b.healthy else "DOWN" for b in self.backends}


# ===========================
# デモ
# ===========================

print("=== ロードバランサデモ ===\n")

# バックエンドサーバ定義
api_backends = [
    Backend("api-1.internal", 8080, weight=2),
    Backend("api-2.internal", 8080, weight=1),
    Backend("api-3.internal", 8080, weight=1),
]
static_backends = [
    Backend("static-1.internal", 8081),
    Backend("static-2.internal", 8081),
]

# L7 ロードバランサ設定
lb = LoadBalancer(algorithm="round_robin")
for b in api_backends + static_backends:
    lb.add_backend(b)

lb.add_l7_rule("/api/", api_backends)
lb.add_l7_rule("/static/", static_backends)

# リクエストのシミュレーション
requests = [
    Request("GET", "/api/users",    {"Host": "example.com"}, "10.0.0.1"),
    Request("GET", "/api/products", {"Host": "example.com"}, "10.0.0.2"),
    Request("GET", "/static/logo.png", {"Host": "example.com"}, "10.0.0.3"),
    Request("GET", "/api/orders",   {"Host": "example.com"}, "10.0.0.1"),
    Request("GET", "/api/users",    {"Host": "example.com"}, "10.0.0.4"),
    Request("GET", "/static/main.css", {"Host": "example.com"}, "10.0.0.5"),
]

print("[L7 パスベースルーティング]")
for req in requests:
    backend = lb.route(req)
    if backend:
        print(f"  {req.method} {req.path} (from {req.client_ip}) → {backend}")
        lb.complete(backend)

print("\n[バックエンド別リクエスト数]")
for b in api_backends + static_backends:
    print(f"  {b}: {b.total_requests} リクエスト")

print("\n[ヘルスチェック]")
api_backends[1].healthy = False  # api-2 が障害
lb2 = LoadBalancer(algorithm="least_connections")
for b in api_backends:
    lb2.add_backend(b)

for req in requests[:4]:
    backend = lb2.route(req)
    if backend:
        print(f"  {req.path} → {backend} (active_connections={backend.active_connections})")
    else:
        print(f"  {req.path} → 使用可能なバックエンドなし！")

print(f"\n  ヘルスチェック結果: {lb2.health_check()}")
```

## 使用場面

- Web API サーバを複数台に水平スケールさせてトラフィックを分散する場面
- /api/ と /static/ でバックエンドサーバプールを分けてマイクロサービスをルーティングする場面
- ローリングデプロイやブルー・グリーンデプロイでロードバランサの向き先を切り替えてゼロダウンタイム更新を行う場面

## 参考文献

- [HAProxy – The Reliable, High Performance TCP/HTTP Load Balancer](https://www.haproxy.org/)
- [AWS – Elastic Load Balancing とは](https://docs.aws.amazon.com/ja_jp/elasticloadbalancing/latest/userguide/what-is-load-balancing.html)
- Nygard, M. T. "Release It!" (Pragmatic Bookshelf)

<AffiliateBanner site="network_navi" />
