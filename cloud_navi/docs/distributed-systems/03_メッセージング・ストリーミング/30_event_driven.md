import AffiliateBanner from '@site/src/components/AffiliateBanner';

# イベント駆動アーキテクチャ

## イベント駆動アーキテクチャとは

> イベント駆動アーキテクチャ（Event-Driven Architecture: EDA）とは、システムの状態変化を「イベント」として捉え、イベントの発生・検知・消費を中心にコンポーネント間の連携を設計するアーキテクチャパターンであり、サービス間の疎結合とリアクティブな処理を実現する。

従来のリクエスト・レスポンスモデルでは、サービスAがサービスBを直接呼び出す。EDAではサービスAは「何かが起きた」というイベントを発行するだけで、誰が聞いているかを意識しない。これが**疎結合**の本質だ。

**イベントの3形態**を理解することが重要だ。**イベント通知（Event Notification）**: 何かが起きたことを最小限の情報で通知する（「注文作成: order-123」）。新しいサービスがリスナーとして追加できるが、受信側が詳細を取得するために呼び戻しが必要になる。**イベント運搬状態転送（Event-Carried State Transfer）**: イベントに必要な情報をすべて含める（「注文作成: order-123, 商品A×2, ユーザーID: user-456」）。受信側は完全に自律できる。**イベントソーシング（Event Sourcing）**: 状態の変化をすべてイベントとして永続化し、イベントの累積から現在の状態を導出する。

**CQRSとの組み合わせ**も重要なパターンだ。Command Query Responsibility Segregation（コマンドクエリ責務分離）では書き込み（Command）と読み取り（Query）のモデルを分離する。イベントを介してReadモデルを非同期に更新するため、スケールが容易になる。

EDAのトレードオフとして、システムの最終的な一貫性（結果整合性）を受け入れる必要があること、イベントフローの可視化・デバッグが難しくなること、イベントスキーマの変更管理が必要なことが挙げられる。

## EDA の主要パターン比較

| パターン | データ量 | 結合度 | 用途 |
|---------|---------|--------|------|
| イベント通知 | 最小限 | 低 | 疎な通知、受信側が詳細を取得 |
| イベント状態転送 | 全情報 | 低 | 自律したサービス間連携 |
| イベントソーシング | 全履歴 | 中 | 監査・Replay・タイムトラベル |
| CQRS + EDA | Write/Readで分離 | 低 | 高負荷システムのスケーリング |

```python
# イベント駆動アーキテクチャの実装例
# イベントバス + ハンドラーパターン

from dataclasses import dataclass, field
from typing import Callable, Dict, List, Any, Type
from datetime import datetime
import uuid
import json
import logging

logger = logging.getLogger(__name__)

# ===== イベント定義 =====

@dataclass
class DomainEvent:
    """全ドメインイベントの基底クラス"""
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    occurred_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_dict(self) -> dict:
        return {
            "event_type": self.__class__.__name__,
            "event_id": self.event_id,
            "occurred_at": self.occurred_at,
            **{k: v for k, v in self.__dict__.items()
               if k not in ("event_id", "occurred_at")}
        }

@dataclass
class OrderCreatedEvent(DomainEvent):
    """注文作成イベント（イベント運搬状態転送: 必要な情報を全て含む）"""
    order_id: str = ""
    user_id: str = ""
    items: List[dict] = field(default_factory=list)
    total_amount: float = 0.0

@dataclass
class PaymentCompletedEvent(DomainEvent):
    """決済完了イベント"""
    order_id: str = ""
    payment_id: str = ""
    amount: float = 0.0

@dataclass
class OrderShippedEvent(DomainEvent):
    """発送完了イベント"""
    order_id: str = ""
    tracking_number: str = ""


# ===== インメモリイベントバス =====

EventHandler = Callable[[DomainEvent], None]

class EventBus:
    """
    シンプルなインメモリイベントバス
    実際のシステムでは Kafka・SQS・SNS に置き換える
    """
    def __init__(self):
        self._handlers: Dict[Type[DomainEvent], List[EventHandler]] = {}

    def subscribe(self, event_type: Type[DomainEvent], handler: EventHandler) -> None:
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)
        logger.info(f"購読登録: {event_type.__name__} -> {handler.__name__}")

    def publish(self, event: DomainEvent) -> None:
        """イベントを発行: 登録されたハンドラーを全て呼び出す"""
        event_type = type(event)
        handlers = self._handlers.get(event_type, [])
        logger.info(f"イベント発行: {event.to_dict()}")
        for handler in handlers:
            try:
                handler(event)
            except Exception as e:
                logger.error(f"ハンドラー {handler.__name__} でエラー: {e}")
                # 本番では Dead Letter Queue に移動するなどの処理


# ===== イベントハンドラー（各マイクロサービスに相当）=====

event_bus = EventBus()

def handle_order_created_inventory(event: OrderCreatedEvent) -> None:
    """在庫サービス: 注文作成時に在庫を引き当て"""
    for item in event.items:
        print(f"[在庫] 引き当て: product={item['product_id']}, qty={item['quantity']}")
    # 在庫引き当て後に決済を開始（別イベント発行）
    payment_event = PaymentCompletedEvent(
        order_id=event.order_id,
        payment_id=str(uuid.uuid4()),
        amount=event.total_amount
    )
    event_bus.publish(payment_event)

def handle_order_created_notification(event: OrderCreatedEvent) -> None:
    """通知サービス: 注文確認メールを送信"""
    print(f"[通知] 注文確認メール送信: user={event.user_id}, order={event.order_id}")

def handle_payment_completed(event: PaymentCompletedEvent) -> None:
    """配送サービス: 決済完了後に発送準備"""
    print(f"[配送] 発送準備: order={event.order_id}, amount={event.amount}")
    shipping_event = OrderShippedEvent(
        order_id=event.order_id,
        tracking_number=f"TRK-{event.order_id[:8]}"
    )
    event_bus.publish(shipping_event)

def handle_order_shipped(event: OrderShippedEvent) -> None:
    """通知サービス: 発送完了メールを送信"""
    print(f"[通知] 発送完了メール: order={event.order_id}, tracking={event.tracking_number}")


# ===== ハンドラー登録 =====
event_bus.subscribe(OrderCreatedEvent, handle_order_created_inventory)
event_bus.subscribe(OrderCreatedEvent, handle_order_created_notification)
event_bus.subscribe(PaymentCompletedEvent, handle_payment_completed)
event_bus.subscribe(OrderShippedEvent, handle_order_shipped)


# ===== 使用例: 注文作成 =====
order_event = OrderCreatedEvent(
    order_id="order-001",
    user_id="user-123",
    items=[{"product_id": "prod-A", "quantity": 2}],
    total_amount=4000.0
)
event_bus.publish(order_event)
# -> 在庫引き当て -> 決済完了イベント -> 発送準備 -> 発送完了イベント -> 通知
```

## 使用場面

- Eコマースで注文・在庫・決済・通知サービスをKafkaイベントで連携し、新サービスを既存コードを変更せず追加する場合
- ユーザー行動ログをイベントとしてKafkaに流し、リコメンドエンジンやBIツールが独立して消費する場合
- イベントソーシングを採用して注文状態の変更履歴を全て保持し、任意時点の状態をReplayで再構築する場合
- CQRSパターンで高頻度書き込みと高頻度読み取りを独立したモデルでスケールする場合

## 参考文献

- [Martin Fowler — Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)
- [Enterprise Integration Patterns](https://www.enterpriseintegrationpatterns.com/)
- [Building Event-Driven Microservices — Adam Bellemare](https://www.oreilly.com/library/view/building-event-driven-microservices/9781492057888/)

<AffiliateBanner site="cloud_navi" />
