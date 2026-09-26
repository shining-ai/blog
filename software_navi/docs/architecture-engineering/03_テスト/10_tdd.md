import AffiliateBanner from '@site/src/components/AffiliateBanner';

# テスト駆動開発（TDD）の実践

## TDDとは

> まず失敗するテストを書き、そのテストを通す最小限の実装を行い、コードをリファクタリングする——「Red・Green・Refactor」サイクルを繰り返してソフトウェアを設計・実装する手法。

テスト駆動開発（Test-Driven Development, TDD）は Kent Beck が提唱しました。「テストを先に書く」という逆転の発想が核心です。テストを先に書くことで「このコードは何をすべきか」を明確にしてから実装に入れます。

TDDの真の目的はテストカバレッジの向上ではなく「設計の改善」です。テストが書きにくいコードは依存が密結合な証拠です。TDDに従うと自然と疎結合・高凝集な設計になります。

Red: 失敗するテストを書く → Green: テストを通す最小限の実装をする → Refactor: 動くコードを綺麗にする、この3ステップを数分〜十数分の短いサイクルで繰り返します。

## TDDサイクル

| フェーズ | アクション | 目的 |
|---------|-----------|------|
| Red | 失敗するテストを書く | 仕様を明確化する |
| Green | テストを通す最小の実装 | 動くコードを作る |
| Refactor | コードを改善する | 設計を綺麗にする |

```python title="TDD実践 — FizzBuzz（Python / pytest）"
# === Step 1: Red（失敗するテストを書く）===
def test_fizz_buzz_returns_number_as_string():
    assert fizz_buzz(1) == "1"   # NameError: fizz_buzz は未定義

def test_fizz_buzz_returns_fizz_for_multiples_of_3():
    assert fizz_buzz(3) == "Fizz"
    assert fizz_buzz(9) == "Fizz"

def test_fizz_buzz_returns_buzz_for_multiples_of_5():
    assert fizz_buzz(5) == "Buzz"
    assert fizz_buzz(10) == "Buzz"

def test_fizz_buzz_returns_fizzbuzz_for_multiples_of_15():
    assert fizz_buzz(15) == "FizzBuzz"
    assert fizz_buzz(30) == "FizzBuzz"


# === Step 2: Green（最小限の実装）===
def fizz_buzz(n: int) -> str:
    if n % 15 == 0:
        return "FizzBuzz"
    if n % 3 == 0:
        return "Fizz"
    if n % 5 == 0:
        return "Buzz"
    return str(n)


# === Step 3: Refactor（実装は変えず、より読みやすくする）===
def fizz_buzz_v2(n: int) -> str:
    result = ""
    if n % 3 == 0:
        result += "Fizz"
    if n % 5 == 0:
        result += "Buzz"
    return result or str(n)


# === より実践的な例: 在庫引き当て ===
class InsufficientStockError(Exception): ...

class Inventory:
    def __init__(self, stock: int):
        self._stock = stock

    def reserve(self, qty: int) -> None:
        if qty > self._stock:
            raise InsufficientStockError(f"Requested {qty}, available {self._stock}")
        self._stock -= qty

    @property
    def stock(self) -> int:
        return self._stock


# テスト（先に書く）
def test_reserve_decreases_stock():
    inv = Inventory(10)
    inv.reserve(3)
    assert inv.stock == 7

def test_reserve_raises_when_insufficient():
    inv = Inventory(2)
    with pytest.raises(InsufficientStockError):
        inv.reserve(5)

def test_reserve_exact_amount_succeeds():
    inv = Inventory(5)
    inv.reserve(5)
    assert inv.stock == 0
```

## 使用場面

- ビジネスロジックの実装で仕様を先に固めたいとき
- バグ修正時（まず再現テストを書き、修正後にテストが通ることを確認）
- API設計時にクライアント視点でインタフェースを定義してから実装するとき

## 参考文献

- Kent Beck, *Test-Driven Development: By Example*, Addison-Wesley, 2003
- Martin Fowler, *Refactoring: Improving the Design of Existing Code*, Addison-Wesley, 2018

<AffiliateBanner site="software_navi" />
