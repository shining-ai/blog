import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Strategy パターン

## Strategy とは

> 一連のアルゴリズムをそれぞれカプセル化し、互いに交換可能にする。Strategy パターンにより、アルゴリズムをそれを使うクライアントから独立して変更できるようにする。

Strategy パターンは GoF の振る舞いパターンのひとつで、最も頻繁に使われるパターンのひとつです。「どのアルゴリズムを使うか」という決定をクラスから分離し、実行時に差し替えられるようにします。

if/switch でアルゴリズムを分岐する代わりに、各アルゴリズムを別クラスとして実装します。クライアントは Context クラスに Strategy を渡すだけで、内部の実装を知らずに振る舞いを変更できます。

開放閉鎖原則（OCP）の典型的な実現手段であり、テスト時にアルゴリズムをモックに差し替えることも容易です。

## パターンの構造

| 要素 | 役割 |
|------|------|
| Strategy | アルゴリズムのインタフェース |
| ConcreteStrategy | 各アルゴリズムの具体実装 |
| Context | Strategy への参照を持ち、アルゴリズムを実行する |

```python title="Strategy パターン（Python）"
from abc import ABC, abstractmethod

class SortStrategy(ABC):
    @abstractmethod
    def sort(self, data: list[int]) -> list[int]: ...

class BubbleSort(SortStrategy):
    def sort(self, data: list[int]) -> list[int]:
        arr = data[:]
        n = len(arr)
        for i in range(n):
            for j in range(n - i - 1):
                if arr[j] > arr[j + 1]:
                    arr[j], arr[j + 1] = arr[j + 1], arr[j]
        return arr

class QuickSort(SortStrategy):
    def sort(self, data: list[int]) -> list[int]:
        if len(data) <= 1:
            return data
        pivot = data[len(data) // 2]
        left = [x for x in data if x < pivot]
        mid = [x for x in data if x == pivot]
        right = [x for x in data if x > pivot]
        return self.sort(left) + mid + self.sort(right)

class Sorter:
    """Context: Strategy を保持し、アルゴリズムを委譲する"""
    def __init__(self, strategy: SortStrategy):
        self._strategy = strategy

    def set_strategy(self, strategy: SortStrategy) -> None:
        self._strategy = strategy

    def sort(self, data: list[int]) -> list[int]:
        return self._strategy.sort(data)

data = [5, 2, 8, 1, 9, 3]

sorter = Sorter(BubbleSort())
print(sorter.sort(data))  # [1, 2, 3, 5, 8, 9]

sorter.set_strategy(QuickSort())
print(sorter.sort(data))  # [1, 2, 3, 5, 8, 9]
```

```typescript title="Strategy パターン — 支払い方法（TypeScript）"
interface PaymentStrategy {
  pay(amount: number): string;
}

class CreditCardPayment implements PaymentStrategy {
  constructor(private cardNumber: string) {}
  pay(amount: number): string {
    return `Paid ¥${amount} with credit card ${this.cardNumber}`;
  }
}

class PayPayPayment implements PaymentStrategy {
  constructor(private userId: string) {}
  pay(amount: number): string {
    return `Paid ¥${amount} via PayPay (user: ${this.userId})`;
  }
}

class ShoppingCart {
  constructor(private paymentStrategy: PaymentStrategy) {}

  checkout(total: number): void {
    console.log(this.paymentStrategy.pay(total));
  }
}

const cart = new ShoppingCart(new CreditCardPayment("4111-xxxx-xxxx-1111"));
cart.checkout(5800);
```

## 使用場面

- ソート・圧縮・暗号化など複数のアルゴリズムを切り替えたいとき
- 支払い方法・配送方法など実行時にビジネスロジックを変えたいとき
- テスト時にアルゴリズムをシンプルなモックに差し替えたいとき

## 参考文献

- Erich Gamma, et al., *Design Patterns: Elements of Reusable Object-Oriented Software*, Addison-Wesley, 1994

<AffiliateBanner site="software_navi" />
