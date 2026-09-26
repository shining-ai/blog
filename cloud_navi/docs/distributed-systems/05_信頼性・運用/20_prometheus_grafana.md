import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Prometheus と Grafana

## Prometheus と Grafana とは

> Prometheus とは、時系列データベースと HTTP プルモデルのメトリクス収集を組み合わせた OSS 監視システムであり、Grafana はそのデータを美しいダッシュボードとして可視化するためのオープンソース分析・可視化プラットフォームである。

**Prometheus** の設計の特徴は**プル方式**（Prometheus がアプリのエンドポイント `/metrics` を定期スクレイプ）・**ラベルベースのデータモデル**（メトリクス名 + ラベルで多次元データを表現）・**PromQL**（強力なクエリ言語）・**AlertManager**（アラートルール管理と通知）である。メトリクスタイプは Counter（単調増加）・Gauge（任意増減）・Histogram（分布・パーセンタイル計算用）・Summary の4種類がある。

Prometheus のエコシステムには多数の**Exporter**（Node Exporter でホストメトリクス・Postgres Exporter で DB メトリクスなど）があり、アプリ自身は `prometheus_client` などの SDK で `/metrics` エンドポイントを公開する。

**Grafana** は Prometheus を含む30以上のデータソース（Loki・CloudWatch・Elasticsearch など）に接続し、時系列グラフ・ゲージ・ヒートマップ・アラートなどのダッシュボードを構築できる。プロビジョニング機能により Grafana のダッシュボードを YAML ファイルで Git 管理（Dashboard as Code）できる。

## Prometheus メトリクスタイプ

| タイプ | 特徴 | 用途 |
|--------|------|------|
| Counter | 単調増加（リセット不可） | リクエスト数・エラー数 |
| Gauge | 任意増減 | CPU 使用率・キューサイズ |
| Histogram | バケット別カウント | レイテンシ分布・サイズ分布 |
| Summary | クライアントでパーセンタイル計算 | SLO のレイテンシ目標確認 |

```python
# prometheus_client を使ったメトリクス公開の実装例

from prometheus_client import (
    Counter, Gauge, Histogram, Summary,
    start_http_server, REGISTRY,
    CollectorRegistry,
)
import time
import random
import threading

# ===== メトリクスの定義 =====
REQUEST_COUNT = Counter(
    "http_requests_total",
    "HTTP リクエストの総数",
    labelnames=["method", "endpoint", "status_code"],
)

REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP リクエストのレイテンシ（秒）",
    labelnames=["method", "endpoint"],
    buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0],
)

ACTIVE_REQUESTS = Gauge(
    "http_active_requests",
    "現在処理中の HTTP リクエスト数",
    labelnames=["endpoint"],
)

QUEUE_SIZE = Gauge(
    "task_queue_size",
    "バックグラウンドタスクキューのサイズ",
)


# ===== メトリクスを記録するデコレータ =====
from functools import wraps
from typing import Callable, TypeVar
import contextlib

T = TypeVar("T")

def track_request(method: str, endpoint: str):
    """リクエストのメトリクスを自動記録するデコレータ"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            ACTIVE_REQUESTS.labels(endpoint=endpoint).inc()
            start = time.perf_counter()
            status_code = "200"
            try:
                result = func(*args, **kwargs)
                return result
            except Exception as e:
                status_code = "500"
                raise
            finally:
                duration = time.perf_counter() - start
                REQUEST_COUNT.labels(
                    method=method, endpoint=endpoint, status_code=status_code
                ).inc()
                REQUEST_LATENCY.labels(
                    method=method, endpoint=endpoint
                ).observe(duration)
                ACTIVE_REQUESTS.labels(endpoint=endpoint).dec()
        return wrapper
    return decorator


# ===== デモアプリ =====
@track_request("GET", "/api/users")
def get_users():
    time.sleep(random.uniform(0.01, 0.1))  # 処理時間をシミュレート
    return [{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}]

@track_request("POST", "/api/orders")
def create_order(amount: float):
    time.sleep(random.uniform(0.05, 0.3))
    if amount > 100000:
        raise ValueError("金額超過")
    return {"order_id": "ORD-001", "amount": amount}


# ===== PromQL クエリ例 =====
PROMQL_EXAMPLES = """
# ===== よく使う PromQL クエリ =====

# 直近5分間のリクエストレート（RPS）
rate(http_requests_total[5m])

# ステータスコード別のエラー率
sum(rate(http_requests_total{status_code=~"5.."}[5m]))
  / sum(rate(http_requests_total[5m]))

# 95パーセンタイルのレイテンシ
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, endpoint))

# エンドポイント別のアクティブリクエスト数
sum(http_active_requests) by (endpoint)

# CPU 使用率（Node Exporter）
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# メモリ使用率
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100

# Kubernetes Pod の再起動回数（直近1時間）
increase(kube_pod_container_status_restarts_total[1h]) > 0
"""

print("PromQL クエリ例:")
print(PROMQL_EXAMPLES)


# ===== メトリクスをシミュレート =====
print("=== メトリクスシミュレーション（10リクエスト）===")
for i in range(10):
    try:
        get_users()
        create_order(random.uniform(100, 120000))
        QUEUE_SIZE.set(random.randint(0, 50))
    except ValueError:
        pass

# メトリクスの出力確認
print("\n=== 記録されたメトリクス ===")
for metric in REGISTRY.collect():
    if metric.name in ("http_requests_total", "http_request_duration_seconds"):
        for sample in metric.samples:
            if sample.value > 0:
                print(f"  {sample.name}{sample.labels}: {sample.value:.4f}")

# 実際のアプリでは: start_http_server(8000) でポート8000に /metrics を公開
# Prometheus の scrape_configs で http://app:8000/metrics を登録する
```

```yaml
# Prometheus + Grafana の Docker Compose 設定例

version: "3.9"
services:
  prometheus:
    image: prom/prometheus:v2.51.0
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.retention.time=15d"

  grafana:
    image: grafana/grafana:10.3.3
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning  # ダッシュボードの自動プロビジョニング

  app:
    build: .
    ports:
      - "8000:8000"  # /metrics エンドポイント

volumes:
  prometheus_data:
  grafana_data:

# prometheus.yml
# global:
#   scrape_interval: 15s
# scrape_configs:
#   - job_name: 'app'
#     static_configs:
#       - targets: ['app:8000']
```

## 使用場面

- Kubernetes クラスターの Pod・ノード・アプリのメトリクスを一元管理するとき
- SLO のエラーバジェット消費を Grafana ダッシュボードでリアルタイム可視化するとき
- AlertManager でエラー率・レイテンシ・キューサイズの閾値超過を Slack に通知するとき
- Loki・Tempo と組み合わせて Grafana でメトリクス・ログ・トレースを横断分析するとき

## 参考文献

- Brazil, B. (2022). *Prometheus: Up & Running* (2nd ed.). O'Reilly.
- [Prometheus 公式ドキュメント](https://prometheus.io/docs/introduction/overview/)
- [Grafana 公式ドキュメント](https://grafana.com/docs/grafana/latest/)

<AffiliateBanner site="cloud_navi" />
