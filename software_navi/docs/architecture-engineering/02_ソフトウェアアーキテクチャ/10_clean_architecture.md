import AffiliateBanner from '@site/src/components/AffiliateBanner';

# クリーンアーキテクチャ

## クリーンアーキテクチャとは

> ビジネスルールをフレームワーク・UI・データベースから独立させることで、テスト可能で変更に強いシステムを構築するアーキテクチャ。

クリーンアーキテクチャは Robert C. Martin（Uncle Bob）が提唱したアーキテクチャパターンです。同心円状の4つの層（Entities・Use Cases・Interface Adapters・Frameworks & Drivers）で構成され、「依存の方向は常に内側に向かう」という依存規則（Dependency Rule）が核心です。

最も内側の Entities にはビジネスルールのみが存在し、フレームワークやDBへの依存はゼロです。これにより「ビジネスロジックのユニットテストがDBなしで動く」「フレームワークをSpringからFastAPIに替えてもドメイン層はノータッチ」という状態が実現できます。

一方、抽象化レイヤーが増えるためコード量は多くなります。CRUD中心の小規模アプリには過剰な場合もあるため、プロジェクト規模と複雑度に応じて採用を判断してください。

## 各層の役割

| 層 | 別名 | 責務 | 依存していいもの |
|---|------|------|-----------------|
| Entities | Domain | ビジネスエンティティ・値オブジェクト | なし |
| Use Cases | Application | ユースケース・アプリケーションサービス | Entities のみ |
| Interface Adapters | Adapter | Controller・Presenter・Gateway の変換 | Use Cases・Entities |
| Frameworks & Drivers | Infrastructure | Web・DB・UI・外部API | すべての層 |

```python title="クリーンアーキテクチャ — 注文処理（Python）"
from abc import ABC, abstractmethod
from dataclasses import dataclass

# --- Entities ---
@dataclass
class Order:
    order_id: str
    amount: float

    def is_valid(self) -> bool:
        return self.amount > 0


# --- Use Case (Port) ---
class OrderRepository(ABC):
    @abstractmethod
    def save(self, order: Order) -> None: ...

class CreateOrderUseCase:
    def __init__(self, repo: OrderRepository):
        self._repo = repo

    def execute(self, order_id: str, amount: float) -> Order:
        order = Order(order_id=order_id, amount=amount)
        if not order.is_valid():
            raise ValueError("Amount must be positive")
        self._repo.save(order)
        return order


# --- Interface Adapter (Gateway / Controller) ---
class InMemoryOrderRepository(OrderRepository):
    def __init__(self):
        self._db: dict[str, Order] = {}

    def save(self, order: Order) -> None:
        self._db[order.order_id] = order
        print(f"[DB] Saved order {order.order_id}")


class OrderController:
    def __init__(self, use_case: CreateOrderUseCase):
        self._use_case = use_case

    def create(self, payload: dict) -> dict:
        order = self._use_case.execute(**payload)
        return {"order_id": order.order_id, "amount": order.amount}


# --- Frameworks & Drivers (Composition Root) ---
repo       = InMemoryOrderRepository()
use_case   = CreateOrderUseCase(repo)
controller = OrderController(use_case)

print(controller.create({"order_id": "ORD-001", "amount": 5000}))
```

## 使用場面

- 長期運用が前提で、フレームワーク変更やDB変更が起こりうるシステム
- ドメインロジックが複雑で、ビジネスルールを外部依存から守りたいとき
- テストを重視しており、インフラなしでユースケースを高速テストしたいとき

## 参考文献

- Robert C. Martin, *Clean Architecture: A Craftsman's Guide to Software Structure and Design*, Prentice Hall, 2017

<AffiliateBanner site="software_navi" />
