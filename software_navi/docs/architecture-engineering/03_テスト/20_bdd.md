import AffiliateBanner from '@site/src/components/AffiliateBanner';

# BDD（振る舞い駆動開発）

## BDDとは

> ビジネス関係者・開発者・QAが共通言語（自然言語に近い仕様記述）を使って、システムの振る舞いを定義・検証する開発手法。

振る舞い駆動開発（Behavior-Driven Development, BDD）は Dan North が 2003 年に TDD を拡張する形で提唱しました。TDD が「テストを先に書く」ことに注目するのに対し、BDD は「誰のための機能か」「どんな振る舞いをすべきか」という会話から始めます。

BDD の中心概念は「Given-When-Then」形式の仕様記述です。Given（前提条件）・When（操作）・Then（期待結果）を自然言語で書くことで、ビジネス担当者でも読めるテスト仕様になります。

Gherkin という言語（Cucumber ツールで使われる）を使うと、自然言語の仕様を直接実行可能なテストコードに結びつけられます。これにより「仕様書とテストのズレ」という古典的な問題を解消できます。

## Given-When-Then の構造

| キーワード | 役割 | 例 |
|-----------|------|-----|
| Feature | テスト対象の機能 | ユーザーログイン機能 |
| Scenario | 具体的なシナリオ | 正しい認証情報でログイン成功 |
| Given | 前提条件・初期状態 | 登録済みユーザーが存在する |
| When | ユーザーの操作 | パスワードを入力してログインする |
| Then | 期待される結果 | ダッシュボードが表示される |
| And / But | 追加の条件・結果 | エラーメッセージが表示されない |

```gherkin title="Gherkin 仕様記述例"
Feature: ショッピングカート

  Scenario: 商品をカートに追加する
    Given カートが空の状態である
    When ユーザーが "ワイヤレスマウス" を 1 個カートに追加する
    Then カートに 1 件の商品が入っている
    And カートの合計金額は 3500 円である

  Scenario: 在庫切れの商品はカートに追加できない
    Given "限定Tシャツ" の在庫が 0 個である
    When ユーザーが "限定Tシャツ" をカートに追加しようとする
    Then "在庫がありません" のエラーメッセージが表示される
    And カートは空のままである
```

```python title="BDD — pytest-bdd を使った実装（Python）"
from pytest_bdd import given, when, then, scenario
from pytest_bdd import parsers
import pytest

# プロダクションコード
class ShoppingCart:
    def __init__(self):
        self._items: list[dict] = []

    def add(self, name: str, price: int, qty: int = 1) -> None:
        self._items.append({"name": name, "price": price, "qty": qty})

    @property
    def total(self) -> int:
        return sum(i["price"] * i["qty"] for i in self._items)

    @property
    def count(self) -> int:
        return len(self._items)


# Step 定義
@pytest.fixture
def cart():
    return ShoppingCart()

@given("カートが空の状態である")
def empty_cart(cart):
    assert cart.count == 0

@when(parsers.parse('ユーザーが "{name}" を {qty:d} 個カートに追加する'))
def add_item_to_cart(cart, name, qty):
    cart.add(name, price=3500, qty=qty)

@then(parsers.parse("カートに {count:d} 件の商品が入っている"))
def check_cart_count(cart, count):
    assert cart.count == count

@then(parsers.parse("カートの合計金額は {amount:d} 円である"))
def check_cart_total(cart, amount):
    assert cart.total == amount
```

```typescript title="BDD — Jest + ステップ定義スタイル（TypeScript）"
// Jest で Given-When-Then スタイルを模倣する
describe("Feature: ショッピングカート", () => {
  describe("Scenario: 商品をカートに追加する", () => {
    let cart: ShoppingCart;

    // Given
    beforeEach(() => { cart = new ShoppingCart(); });

    it("When 追加すると Then 件数と合計が正しい", () => {
      cart.add({ name: "ワイヤレスマウス", price: 3500, qty: 1 });
      expect(cart.count).toBe(1);
      expect(cart.total).toBe(3500);
    });
  });
});
```

## 使用場面

- ビジネス担当者・デザイナー・エンジニアが共同で受け入れ基準を定義するとき
- 受け入れテスト（Acceptance Test）を自動化して継続的に実行したいとき
- 仕様とテストを同一ドキュメントとして管理し、乖離を防ぎたいとき

## 参考文献

- Dan North, *Introducing BDD*, 2006, https://dannorth.net/introducing-bdd/
- Cucumber 公式ドキュメント, https://cucumber.io/docs/gherkin/

<AffiliateBanner site="software_navi" />
