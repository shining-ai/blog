import AffiliateBanner from '@site/src/components/AffiliateBanner';

# オブザーバビリティの3柱（メトリクス・ログ・トレース）

## オブザーバビリティとは

> オブザーバビリティ（Observability）とは、システムの外部出力（テレメトリデータ）からシステムの内部状態を推論できる能力であり、メトリクス・ログ・分散トレースの「3柱」を通じて分散システムの振る舞いを理解・デバッグできる状態を指す。

制御理論から借用された概念で、「観測可能である」とはシステム内部で何が起きているかを計測データから把握できることを意味する。従来の監視（Monitoring）が「既知の問題が発生していないか確認する」受動的なものだとすれば、オブザーバビリティは「未知の問題が起きたとき、なぜそうなったかを調査できる」能動的な能力である。

**メトリクス**は時系列の数値データ（CPU使用率・RPS・エラー率など）で、システムの健全性をリアルタイムに把握しアラートを発するのに適している。**ログ**は離散的なイベントの記録で、問題発生時の詳細な文脈を提供する。**分散トレース**はリクエストがマイクロサービスをまたいで処理される経路と所要時間を記録し、ボトルネックや障害の根本原因を特定するのに用いる。

現代では OpenTelemetry（OTel）が3柱すべてのデータ収集の標準 SDK として広く採用されており、ベンダー中立なテレメトリデータの収集・エクスポートを実現する。

## オブザーバビリティ3柱の比較

| 柱 | データ形式 | 主な用途 | 代表ツール |
|----|----------|---------|-----------|
| メトリクス | 時系列数値 | ダッシュボード・アラート | Prometheus・CloudWatch |
| ログ | テキスト/JSON | 詳細な障害調査 | Loki・Elasticsearch |
| 分散トレース | スパンのツリー | リクエスト経路とレイテンシ | Jaeger・Zipkin・Tempo |

```python
# オブザーバビリティの3柱を実装するデモ

import time
import uuid
import json
import logging
from dataclasses import dataclass, field, asdict
from typing import Any
from contextlib import contextmanager
from datetime import datetime, timezone

# ===== 1. 構造化ログ =====
class StructuredLogger:
    """JSON 形式の構造化ログを出力するロガー"""

    def __init__(self, service_name: str):
        self.service_name = service_name

    def _log(self, level: str, message: str, **context: Any) -> None:
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": level,
            "service": self.service_name,
            "message": message,
            **context,
        }
        print(json.dumps(entry, ensure_ascii=False))

    def info(self, message: str, **context: Any) -> None:
        self._log("INFO", message, **context)

    def error(self, message: str, **context: Any) -> None:
        self._log("ERROR", message, **context)

    def warn(self, message: str, **context: Any) -> None:
        self._log("WARN", message, **context)


# ===== 2. メトリクス =====
@dataclass
class Counter:
    name: str
    value: float = 0.0
    labels: dict[str, str] = field(default_factory=dict)

    def inc(self, amount: float = 1.0) -> None:
        self.value += amount

@dataclass
class Histogram:
    name: str
    buckets: list[float] = field(default_factory=lambda: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5])
    _observations: list[float] = field(default_factory=list, repr=False)

    def observe(self, value: float) -> None:
        self._observations.append(value)

    def percentile(self, p: float) -> float:
        if not self._observations:
            return 0.0
        sorted_obs = sorted(self._observations)
        idx = int(len(sorted_obs) * p / 100)
        return sorted_obs[min(idx, len(sorted_obs) - 1)]

class MetricsRegistry:
    """Prometheus スタイルのメトリクスレジストリ"""

    def __init__(self):
        self._counters: dict[str, Counter] = {}
        self._histograms: dict[str, Histogram] = {}

    def counter(self, name: str, **labels: str) -> Counter:
        key = f"{name}_{labels}"
        if key not in self._counters:
            self._counters[key] = Counter(name, labels=labels)
        return self._counters[key]

    def histogram(self, name: str) -> Histogram:
        if name not in self._histograms:
            self._histograms[name] = Histogram(name)
        return self._histograms[name]

    def dump(self) -> dict:
        return {
            "counters": {k: v.value for k, v in self._counters.items()},
            "histograms": {
                name: {
                    "p50": h.percentile(50),
                    "p95": h.percentile(95),
                    "p99": h.percentile(99),
                    "count": len(h._observations),
                }
                for name, h in self._histograms.items()
            },
        }


# ===== 3. 分散トレース =====
@dataclass
class Span:
    """OpenTelemetry スタイルのスパン"""
    name: str
    trace_id: str
    span_id: str
    parent_span_id: str | None
    start_time: float = field(default_factory=time.time)
    end_time: float | None = None
    attributes: dict[str, Any] = field(default_factory=dict)
    status: str = "OK"

    def end(self, status: str = "OK") -> None:
        self.end_time = time.time()
        self.status = status

    @property
    def duration_ms(self) -> float:
        if self.end_time is None:
            return 0.0
        return (self.end_time - self.start_time) * 1000

    def set_attribute(self, key: str, value: Any) -> None:
        self.attributes[key] = value

class Tracer:
    """シンプルな分散トレーサー"""

    def __init__(self, service_name: str):
        self.service_name = service_name
        self._spans: list[Span] = []
        self._current_span: Span | None = None

    @contextmanager
    def start_span(self, name: str):
        span = Span(
            name=name,
            trace_id=self._current_span.trace_id if self._current_span else str(uuid.uuid4())[:8],
            span_id=str(uuid.uuid4())[:8],
            parent_span_id=self._current_span.span_id if self._current_span else None,
        )
        prev_span = self._current_span
        self._current_span = span
        try:
            yield span
            span.end("OK")
        except Exception as e:
            span.set_attribute("error", str(e))
            span.end("ERROR")
            raise
        finally:
            self._spans.append(span)
            self._current_span = prev_span

    def dump_trace(self) -> None:
        print("\n=== トレース出力 ===")
        for span in self._spans:
            indent = "  " if span.parent_span_id else ""
            print(f"{indent}[{span.status}] {span.name} "
                  f"(trace={span.trace_id}, span={span.span_id}, "
                  f"duration={span.duration_ms:.1f}ms)")


# ===== デモ: 3柱を組み合わせた API リクエスト処理 =====
logger = StructuredLogger("order-service")
metrics = MetricsRegistry()
tracer = Tracer("order-service")

http_requests = metrics.counter("http_requests_total", method="POST", endpoint="/orders")
request_duration = metrics.histogram("http_request_duration_seconds")

def process_order_request(order_id: str, amount: float) -> dict:
    http_requests.inc()
    start = time.perf_counter()

    with tracer.start_span("POST /orders") as root_span:
        root_span.set_attribute("order.id", order_id)
        logger.info("注文リクエスト受信", order_id=order_id, amount=amount,
                    trace_id=root_span.trace_id)

        with tracer.start_span("validate_order") as span:
            time.sleep(0.005)  # 検証処理
            span.set_attribute("validation.passed", True)

        with tracer.start_span("db.insert_order") as span:
            time.sleep(0.015)  # DB 書き込み
            span.set_attribute("db.table", "orders")

        with tracer.start_span("payment.charge") as span:
            time.sleep(0.02)  # 決済処理
            span.set_attribute("payment.amount", amount)

        elapsed = time.perf_counter() - start
        request_duration.observe(elapsed)
        logger.info("注文処理完了", order_id=order_id,
                    duration_ms=round(elapsed * 1000, 1),
                    trace_id=root_span.trace_id)

    return {"order_id": order_id, "status": "created"}

# リクエストを3件処理
for i in range(3):
    process_order_request(f"ORDER-{i+1:03d}", 9800.0 * (i + 1))

tracer.dump_trace()
print("\n=== メトリクス ===")
print(json.dumps(metrics.dump(), indent=2, ensure_ascii=False))
```

## 使用場面

- マイクロサービスのデバッグでリクエストの全経路と所要時間を把握するとき
- Prometheus + Grafana でサービスのダッシュボードとアラートを構築するとき
- OpenTelemetry SDK をアプリに組み込んでベンダー中立なテレメトリを収集するとき
- SLO のエラーバジェット消費を可用性メトリクスからリアルタイムに計算するとき

## 参考文献

- Beyer, B. et al. (2016). *Site Reliability Engineering*. O'Reilly.
- [OpenTelemetry 公式ドキュメント](https://opentelemetry.io/docs/)
- Majors, C. et al. (2022). *Observability Engineering*. O'Reilly.

<AffiliateBanner site="cloud_navi" />
