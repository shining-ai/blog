import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ドメイン駆動設計（DDD）入門

## ドメイン駆動設計とは

> ソフトウェアの中心にドメイン（業務領域）とドメインロジックを置き、ドメインの専門家と開発者が共有するモデルをもとにシステムを設計するアプローチ。

ドメイン駆動設計（Domain-Driven Design, DDD）は Eric Evans が 2003 年に提唱しました。技術的な実装より「業務知識のモデリング」を優先し、開発者とドメイン専門家が同じ言語（ユビキタス言語）で会話しながらシステムを設計します。

DDD の戦略的設計では、システムを「境界づけられたコンテキスト（Bounded Context）」に分割し、それぞれのコンテキスト内で独自のモデルを持ちます。戦術的設計では、Entity・Value Object・Aggregate・Domain Service・Repository などのビルディングブロックを使ってドメインモデルを実装します。

DDDは複雑なビジネスロジックを持つシステムに真価を発揮します。CRUDのみのシンプルなシステムには過剰な場合があります。

## 主要な概念

| 概念 | 説明 |
|------|------|
| ユビキタス言語 | 開発者とドメイン専門家が共有する共通語彙 |
| Bounded Context | モデルが有効な範囲の境界 |
| Entity | 同一性（ID）で区別されるオブジェクト |
| Value Object | 属性の値で同一性を判断する不変オブジェクト |
| Aggregate | 整合性の境界を持つEntityのクラスタ。Rootを通じてのみアクセス |
| Repository | Aggregateの永続化・取得を抽象化するインタフェース |
| Domain Service | どのEntityにも属さないドメインロジック |
| Domain Event | ドメイン内で起きた出来事を表すイベント |

```python title="DDD — 注文ドメインモデル（Python）"
from __future__ import annotations
from dataclasses import dataclass, field
from uuid import uuid4

# Value Object
@dataclass(frozen=True)
class Money:
    amount: float
    currency: str = "JPY"

    def __add__(self, other: Money) -> Money:
        if self.currency != other.currency:
            raise ValueError("Currency mismatch")
        return Money(self.amount + other.amount, self.currency)

    def __mul__(self, quantity: int) -> Money:
        return Money(self.amount * quantity, self.currency)


# Entity
@dataclass
class OrderLine:
    product_id: str
    quantity: int
    unit_price: Money

    @property
    def subtotal(self) -> Money:
        return self.unit_price * self.quantity


# Aggregate Root
class Order:
    def __init__(self, customer_id: str):
        self.order_id: str = str(uuid4())
        self.customer_id = customer_id
        self._lines: list[OrderLine] = []
        self._confirmed = False

    def add_line(self, product_id: str, quantity: int, unit_price: Money) -> None:
        if self._confirmed:
            raise RuntimeError("Cannot modify confirmed order")
        self._lines.append(OrderLine(product_id, quantity, unit_price))

    def confirm(self) -> None:
        if not self._lines:
            raise RuntimeError("Cannot confirm empty order")
        self._confirmed = True

    @property
    def total(self) -> Money:
        result = Money(0)
        for line in self._lines:
            result = result + line.subtotal
        return result


# 使用例
order = Order(customer_id="CUST-001")
order.add_line("PROD-A", 2, Money(1500))
order.add_line("PROD-B", 1, Money(3000))
order.confirm()

print(f"合計: {order.total.amount} {order.total.currency}")  # 合計: 6000.0 JPY
```

## 使用場面

- 保険・金融・物流など複雑なビジネスルールを持つシステム
- ドメイン専門家と密にコラボレーションして設計するプロジェクト
- 長期運用を前提とし、業務ルールの変化に柔軟に対応したいシステム

## 参考文献

- Eric Evans, *Domain-Driven Design: Tackling Complexity in the Heart of Software*, Addison-Wesley, 2003
- Vaughn Vernon, *Implementing Domain-Driven Design*, Addison-Wesley, 2013

<AffiliateBanner site="software_navi" />
