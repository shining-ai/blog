import AffiliateBanner from '@site/src/components/AffiliateBanner';

# State パターン

## State とは

> オブジェクトの内部状態が変わったとき、そのオブジェクトの振る舞いが変わるように見せる。オブジェクトはクラスが変わったように見える。

State パターンは GoF の振る舞いパターンのひとつです。オブジェクトが持つ「状態」を別のクラスに分離し、状態ごとに異なる振る舞いを実装します。

状態を if/switch で分岐して書くと、状態が増えるたびに既存コードを修正しなければならず、コードが肥大化します。State パターンでは各状態を ConcreteState クラスとして独立させ、Context が現在の状態オブジェクトに処理を委譲します。状態遷移も State クラス内で管理するため、新しい状態を追加するときは新しいクラスを追加するだけで済みます。

自動販売機・注文ワークフロー・TCP コネクション管理など、明確な状態遷移図を持つシステムに特に有効です。

## パターンの構造

| 要素 | 役割 |
|------|------|
| State | 状態ごとの振る舞いを定義するインタフェース |
| ConcreteState | 各状態での具体的な振る舞いを実装する |
| Context | 現在の State への参照を持ち、操作を委譲する |

```python title="State パターン — 自動販売機（Python）"
from __future__ import annotations
from abc import ABC, abstractmethod

class VendingMachineState(ABC):
    @abstractmethod
    def insert_coin(self, machine: "VendingMachine") -> None: ...

    @abstractmethod
    def press_button(self, machine: "VendingMachine") -> None: ...


class IdleState(VendingMachineState):
    def insert_coin(self, machine: "VendingMachine") -> None:
        print("コインを投入しました。")
        machine.state = HasCoinState()

    def press_button(self, machine: "VendingMachine") -> None:
        print("先にコインを投入してください。")


class HasCoinState(VendingMachineState):
    def insert_coin(self, machine: "VendingMachine") -> None:
        print("既にコインが入っています。")

    def press_button(self, machine: "VendingMachine") -> None:
        print("商品を排出しました。")
        machine.state = IdleState()


class VendingMachine:
    """Context: 現在の状態に操作を委譲する"""
    def __init__(self):
        self.state: VendingMachineState = IdleState()

    def insert_coin(self) -> None:
        self.state.insert_coin(self)

    def press_button(self) -> None:
        self.state.press_button(self)


m = VendingMachine()
m.press_button()   # 先にコインを投入してください。
m.insert_coin()    # コインを投入しました。
m.press_button()   # 商品を排出しました。
```

```typescript title="State パターン — 注文ステータス（TypeScript）"
interface OrderState {
  next(order: Order): void;
  cancel(order: Order): void;
  label(): string;
}

class PendingState implements OrderState {
  next(order: Order): void   { order.state = new ShippedState(); }
  cancel(order: Order): void { order.state = new CancelledState(); }
  label(): string { return "受付中"; }
}

class ShippedState implements OrderState {
  next(order: Order): void   { order.state = new DeliveredState(); }
  cancel(order: Order): void { console.log("発送済みのためキャンセル不可"); }
  label(): string { return "発送済み"; }
}

class DeliveredState implements OrderState {
  next(order: Order): void   { console.log("完了済みです"); }
  cancel(order: Order): void { console.log("配達完了のためキャンセル不可"); }
  label(): string { return "配達完了"; }
}

class CancelledState implements OrderState {
  next(order: Order): void   { console.log("キャンセル済みです"); }
  cancel(order: Order): void { console.log("既にキャンセル済みです"); }
  label(): string { return "キャンセル済み"; }
}

class Order {
  state: OrderState = new PendingState();
  status(): string { return this.state.label(); }
}

const order = new Order();
console.log(order.status()); // 受付中
order.state.next(order);
console.log(order.status()); // 発送済み
```

## 使用場面

- 注文・承認ワークフローなど明確な状態遷移があるビジネスロジック
- TCP コネクション・ゲームキャラクターなど状態によって振る舞いが大きく変わるオブジェクト
- if/switch による状態分岐が肥大化してきたとき

## 参考文献

- Erich Gamma, et al., *Design Patterns: Elements of Reusable Object-Oriented Software*, Addison-Wesley, 1994

<AffiliateBanner site="software_navi" />
