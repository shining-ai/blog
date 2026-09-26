import AffiliateBanner from '@site/src/components/AffiliateBanner';

# サービス分割の考え方（境界付きコンテキスト）

## 境界付きコンテキストとは

> 境界付きコンテキスト（Bounded Context）とは、Eric Evans が Domain-Driven Design（DDD）で提唱した概念であり、特定のドメインモデルが一貫した意味を持つ境界を定義するものだ。マイクロサービスのサービス分割では境界付きコンテキストがサービスの自然な境界を示す。

モノリスをマイクロサービスに分割する際、最も難しいのは「どこで分割するか」だ。技術的なレイヤー（Controller/Service/Repository）で分割するのは間違いだ。ビジネスドメインの境界で分割することが正解に近い。

**境界付きコンテキスト**は「この言葉はここでしか通じない」という境界だ。例えば「注文」というエンティティは、注文コンテキストでは「商品・数量・合計金額・配送先」を持つが、在庫コンテキストでは「どの商品が何個引き当てられたか」しか関心がない。同じ「注文」という言葉でも意味が異なる。境界付きコンテキストはこの曖昧さをなくす。

**サービス分割の判断軸**として、まず**凝集度**を確認する。「よく一緒に変わるコードは一緒に置く、滅多に一緒に変わらないコードは分割する」。次に**結合度**を確認する。「サービスAを変更するとサービスBも変更が必要」なら分割が間違っている可能性がある。

**分割パターン**には2つのアプローチがある。**ビジネスケイパビリティ**（注文管理・在庫管理・決済処理・顧客管理）で分割する方法と、**サブドメイン**（コアドメイン・サポートドメイン・汎用ドメイン）で分割する方法だ。いずれも「データの所有権」が1つのサービスにあることを確認する。

**サービス分割のアンチパターン**として、マイクロサービス間でDBを共有する「共有DBアンチパターン」と、サービス同士が深く依存し合う「分散モノリス」がある。後者は名前だけマイクロサービスで実態はモノリスより複雑という最悪の状態だ。

## サービス分割の判断基準

| 判断軸 | 良い分割 | 悪い分割 |
|--------|---------|---------|
| 凝集度 | よく一緒に変わる機能がまとまっている | 関係ない機能が1サービスに混在 |
| 結合度 | サービスAの変更がBに影響しない | Aを変えるとBのデプロイも必要 |
| データ所有権 | 各データは1サービスが管理 | 複数サービスが同一DBテーブルを共有 |
| 境界 | ビジネスドメインの境界と一致 | 技術レイヤー（Controller層）で分割 |
| チーム | 1チームが1サービスをオーナー | 1サービスに複数チームが混在 |

```python
# 境界付きコンテキストによるドメインモデルの分離例

from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime

# ===== 注文コンテキスト (Order Context) =====
# 注文コンテキストが責任を持つ「注文」の定義

@dataclass
class OrderLineItem:
    product_id: str
    product_name: str       # 注文時点の商品名を保持
    unit_price: float       # 注文時点の価格を保持（価格変動の影響を受けない）
    quantity: int
    discount_rate: float = 0.0

    @property
    def subtotal(self) -> float:
        return self.unit_price * self.quantity * (1 - self.discount_rate)

@dataclass
class ShippingAddress:
    recipient_name: str
    postal_code: str
    prefecture: str
    address_line: str

@dataclass
class Order:
    """
    注文コンテキストの「注文」
    注文管理に必要な情報を持つ
    """
    order_id: str
    customer_id: str
    items: List[OrderLineItem] = field(default_factory=list)
    shipping_address: Optional[ShippingAddress] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    status: str = "PENDING"  # PENDING/CONFIRMED/SHIPPED/DELIVERED/CANCELLED

    @property
    def total_amount(self) -> float:
        return sum(item.subtotal for item in self.items)

    def confirm(self) -> None:
        if self.status != "PENDING":
            raise ValueError(f"注文確定不可: 現在のステータス={self.status}")
        self.status = "CONFIRMED"


# ===== 在庫コンテキスト (Inventory Context) =====
# 在庫コンテキストが責任を持つ「注文」の定義（注文コンテキストとは別物）

@dataclass
class InventoryReservation:
    """
    在庫コンテキストの「注文に対する在庫引き当て」
    在庫管理に必要な情報だけを持つ（商品名・価格は不要）
    """
    reservation_id: str
    order_id: str              # 注文への参照はIDのみ（直接依存しない）
    product_id: str
    warehouse_id: str
    reserved_quantity: int
    reserved_at: datetime = field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None

    def is_expired(self) -> bool:
        if self.expires_at is None:
            return False
        return datetime.utcnow() > self.expires_at


# ===== コンテキスト間の通信はイベント経由 =====
# 直接依存させず、イベント（IDのみ）で通知

@dataclass
class OrderConfirmedEvent:
    """
    注文コンテキストが発行するイベント
    在庫コンテキストが受け取ってInventoryReservationを作成する
    """
    order_id: str
    items: List[dict]  # [{"product_id": "P001", "quantity": 2}]
    occurred_at: datetime = field(default_factory=datetime.utcnow)


# ===== 集約（Aggregate）の設計 =====
# 境界付きコンテキスト内の整合性は集約ルートが保証する

class OrderAggregate:
    """
    Order が集約ルート
    OrderLineItemはOrderを通してのみ操作される
    """
    def __init__(self, order_id: str, customer_id: str):
        self._order = Order(order_id=order_id, customer_id=customer_id)
        self._events: List[object] = []

    def add_item(self, product_id: str, product_name: str,
                 unit_price: float, quantity: int) -> None:
        """注文に商品を追加"""
        item = OrderLineItem(product_id, product_name, unit_price, quantity)
        self._order.items.append(item)

    def confirm_order(self) -> OrderConfirmedEvent:
        """注文を確定し、イベントを発行"""
        self._order.confirm()
        event = OrderConfirmedEvent(
            order_id=self._order.order_id,
            items=[{"product_id": i.product_id, "quantity": i.quantity}
                   for i in self._order.items]
        )
        self._events.append(event)
        return event

    def pop_events(self) -> List[object]:
        events = list(self._events)
        self._events.clear()
        return events
```

## 使用場面

- モノリスのマイクロサービス移行でサービス分割の境界を決める際に、Event Stormingワークショップで境界付きコンテキストを特定する場合
- 新規マイクロサービスを設計する際に、DDDの集約・エンティティ・値オブジェクトを使ってデータの所有権を明確にする場合
- チーム分割（コンウェイの法則）を考える際に、各チームが独立してデプロイできるサービス単位を決める場合
- マイクロサービス間の過度な依存（分散モノリス）を発見してリファクタリングする場合

## 参考文献

- [Domain-Driven Design — Eric Evans](https://www.domainlanguage.com/ddd/)
- [Microservices Patterns — Chris Richardson](https://microservices.io/patterns/)
- [Building Microservices — Sam Newman](https://www.oreilly.com/library/view/building-microservices-2nd/9781492034018/)

<AffiliateBanner site="cloud_navi" />
