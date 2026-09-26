import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 分散トレーシング（Jaeger・OpenTelemetry）

## 分散トレーシングとは

> 分散トレーシングとは、マイクロサービス環境で1つのリクエストが複数のサービスをまたいで処理される際の経路・所要時間・エラー情報を「トレース」として記録・可視化する技術であり、レイテンシのボトルネックや障害の根本原因特定に不可欠なオブザーバビリティの柱の一つである。

1つのユーザーリクエストがフロントエンド → API ゲートウェイ → 注文サービス → 在庫サービス → DB と複数のサービスを経由する場合、各サービスのログは独立しており、リクエスト全体の遅延がどのサービスで発生したかを特定することが難しい。分散トレーシングはこの問題を解決する。

**トレース**は1つのリクエスト全体を表し、**スパン**は1つのサービス内での処理単位を表す。各スパンは `trace_id`（トレース全体を識別）・`span_id`（このスパンを識別）・`parent_span_id`（親スパンへの参照）・開始時刻・終了時刻・属性（タグ）・イベントを持つ。

**OpenTelemetry（OTel）**はメトリクス・ログ・トレースの収集 SDK を統一した CNCF 標準プロジェクトで、アプリに組み込むと複数のバックエンド（Jaeger・Zipkin・Tempo・Datadog など）にデータをエクスポートできる。**Jaeger** は Uber が開発した OSS の分散トレーシングバックエンドで、トレースの可視化・サービスマップ・パフォーマンス分析機能を持つ。

## 分散トレーシングのコンポーネント

| コンポーネント | 役割 | 例 |
|-------------|------|-----|
| インストゥルメンテーション | アプリからスパンを生成 | OpenTelemetry SDK |
| エクスポーター | テレメトリをバックエンドに送信 | OTLP Exporter |
| コレクター | テレメトリを受信・変換・転送 | OTel Collector |
| バックエンド | トレースを保存・検索・可視化 | Jaeger・Tempo |
| コンテキスト伝播 | サービス間で trace_id を伝搬 | W3C TraceContext ヘッダー |

```python
# OpenTelemetry を使った分散トレーシングの実装デモ

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import (
    BatchSpanProcessor,
    ConsoleSpanExporter,  # デモ用にコンソール出力
)
from opentelemetry.trace import StatusCode
import time
import json

# ===== TracerProvider の設定 =====
# 本番環境では ConsoleSpanExporter を JaegerExporter や OTLPExporter に置き換える
provider = TracerProvider()
provider.add_span_processor(
    BatchSpanProcessor(ConsoleSpanExporter())
)
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("order-service", "1.0.0")


# ===== サービス呼び出しのシミュレーション =====
def validate_order(order_id: str, amount: float) -> bool:
    """注文バリデーション（スパンを手動で作成）"""
    with tracer.start_as_current_span("validate_order") as span:
        span.set_attribute("order.id", order_id)
        span.set_attribute("order.amount", amount)
        time.sleep(0.005)
        if amount <= 0:
            span.set_status(StatusCode.ERROR, "金額が0以下")
            span.record_exception(ValueError(f"無効な金額: {amount}"))
            return False
        span.set_attribute("validation.result", "passed")
        return True


def reserve_inventory(product_id: str, quantity: int) -> str:
    """在庫引き当て（スパンに属性を追加）"""
    with tracer.start_as_current_span("inventory.reserve") as span:
        span.set_attribute("product.id", product_id)
        span.set_attribute("inventory.quantity", quantity)
        span.set_attribute("db.system", "postgresql")
        span.set_attribute("db.statement", f"UPDATE inventory SET qty = qty - {quantity} WHERE product_id = '{product_id}'")
        time.sleep(0.015)  # DB 操作をシミュレート
        reservation_id = f"RES-{product_id}-{quantity}"
        span.set_attribute("reservation.id", reservation_id)
        return reservation_id


def charge_payment(customer_id: str, amount: float) -> str:
    """決済処理（外部サービス呼び出し）"""
    with tracer.start_as_current_span("payment.charge") as span:
        span.set_attribute("customer.id", customer_id)
        span.set_attribute("payment.amount", amount)
        span.set_attribute("payment.provider", "stripe")
        span.set_attribute("net.peer.name", "api.stripe.com")

        # イベントを記録
        span.add_event("payment.initiated", {"provider": "stripe"})
        time.sleep(0.03)  # 外部 API 呼び出しをシミュレート
        span.add_event("payment.completed")

        return f"pi_{customer_id}_{int(amount)}"


def create_order(order_id: str, customer_id: str, product_id: str,
                 quantity: int, unit_price: float) -> dict:
    """注文作成（ルートスパンとして複数のチャイルドスパンを持つ）"""
    amount = unit_price * quantity

    with tracer.start_as_current_span("POST /orders") as root_span:
        # W3C TraceContext ヘッダーを設定（実際の HTTP では自動伝播）
        ctx = trace.get_current_span().get_span_context()
        root_span.set_attribute("http.method", "POST")
        root_span.set_attribute("http.route", "/orders")
        root_span.set_attribute("order.id", order_id)
        root_span.set_attribute("customer.id", customer_id)

        # バリデーション
        if not validate_order(order_id, amount):
            root_span.set_status(StatusCode.ERROR, "バリデーション失敗")
            return {"status": "error", "message": "バリデーション失敗"}

        # 在庫引き当て
        try:
            reservation_id = reserve_inventory(product_id, quantity)
        except Exception as e:
            root_span.record_exception(e)
            root_span.set_status(StatusCode.ERROR, str(e))
            return {"status": "error", "message": str(e)}

        # 決済
        payment_id = charge_payment(customer_id, amount)

        root_span.set_attribute("http.status_code", 201)
        root_span.set_status(StatusCode.OK)

        return {
            "status": "created",
            "order_id": order_id,
            "reservation_id": reservation_id,
            "payment_id": payment_id,
            "amount": amount,
        }


# ===== W3C TraceContext ヘッダーによるコンテキスト伝播 =====
from opentelemetry import propagate
from opentelemetry.propagators.b3 import B3MultiFormat

def demonstrate_context_propagation():
    """
    サービス間でトレースコンテキストをヘッダーで伝播するデモ。
    実際の HTTP クライアント（requests・httpx）では自動で行われる。
    """
    headers: dict[str, str] = {}

    with tracer.start_as_current_span("service-a: outgoing-call"):
        # サービス A: リクエスト送信前にヘッダーにコンテキストを注入
        propagate.inject(headers)
        print(f"\n伝播ヘッダー: {headers}")
        # 例: {"traceparent": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"}

    # サービス B: 受信したヘッダーからコンテキストを抽出
    ctx = propagate.extract(headers)
    with tracer.start_as_current_span("service-b: incoming-call", context=ctx) as span:
        parent_ctx = span.get_span_context()
        print(f"サービス B のスパン: trace_id={parent_ctx.trace_id:x}")


# ===== デモ実行 =====
print("=== 分散トレーシングデモ ===\n")
result = create_order(
    order_id="ORDER-001",
    customer_id="CUST-100",
    product_id="PROD-42",
    quantity=3,
    unit_price=2980.0,
)
print(f"\n注文結果: {json.dumps(result, ensure_ascii=False, indent=2)}")

demonstrate_context_propagation()
```

## 使用場面

- マイクロサービス間でのレイテンシボトルネック特定（どのサービスが遅いか）
- カスケード障害の根本原因調査（エラーがどのサービスで最初に発生したか）
- SLO 違反の調査でリクエストの全経路とエラー詳細を把握するとき
- サービスマップによってサービス間の依存関係を可視化するとき

## 参考文献

- [OpenTelemetry 公式ドキュメント](https://opentelemetry.io/docs/)
- [Jaeger 公式ドキュメント](https://www.jaegertracing.io/docs/)
- Sigelman, B. et al. (2010). Dapper, a Large-Scale Distributed Systems Tracing Infrastructure. Google Technical Report.

<AffiliateBanner site="cloud_navi" />
