import AffiliateBanner from '@site/src/components/AffiliateBanner';

# リファクタリングと技術的負債

## リファクタリングとは

> リファクタリングとは、外部から見た動作を変えずにコードの内部構造を改善することであり、技術的負債を返済してコードベースの保守性・可読性・拡張性を高めるための継続的なプロセスである。

Martin Fowler が『リファクタリング』（1999年）で定義した概念で、「動作を変えない」という制約が本質である。リファクタリング中は常にテストがグリーンであることを確認しながら、小さなステップで変換を積み重ねる。

**技術的負債**（Technical Debt）とは Ward Cunningham が提唱した比喩で、短期的な開発速度のために将来の保守コストを「借金」することを指す。意図的な負債（リリース優先で後でリファクタリングと決める）と非意図的な負債（経験不足・知識不足による設計の問題）がある。技術的負債が蓄積すると、変更速度の低下・バグの増加・エンジニアのモチベーション低下が起きる。

代表的なリファクタリング手法：**メソッドの抽出**（Extract Method）・**変数の抽出**（Extract Variable）・**条件式の統合**・**ポリモーフィズムへの置換**・**デッドコードの削除**。コードの問題を示す兆候（Code Smell）として、長すぎるメソッド・重複コード・過剰なコメント・巨大クラス・散弾銃手術（小さな変更が多くのファイルに波及する）などが挙げられる。

## 代表的な Code Smell と対処法

| Code Smell | 症状 | 対処法 |
|------------|------|--------|
| 重複コード | 同じロジックが複数箇所に存在 | メソッド抽出 + 共通化 |
| 長すぎるメソッド | 1関数が数百行 | メソッド抽出で分割 |
| 神クラス | 1クラスが全てを担当 | 責務を別クラスに分離 |
| 過剰なコメント | コードが読めないのをコメントで補う | コードを自己文書化 |
| 散弾銃手術 | 1変更で多ファイル修正が必要 | 関連ロジックを一箇所に集約 |
| データクランプ | 常にセットで使われるフィールド | データクラスとして抽出 |

```python
# リファクタリングの Before / After 例

# ===== Before: Code Smell だらけのコード =====
def calc(o, t):  # 意味不明な変数名
    # 注文を処理する（コメントで何をするか補足している = コードが読めない証拠）
    r = 0
    if o['type'] == 'standard':
        r = o['price'] * o['qty']
        if o['qty'] > 10:  # マジックナンバー
            r = r * 0.9   # 意味が不明な係数
    elif o['type'] == 'premium':
        r = o['price'] * o['qty']
        if o['qty'] > 5:   # マジックナンバー
            r = r * 0.85
    if t == 'JP':  # 国コードのマジック文字列
        r = r * 1.1   # 税率が謎の係数
    elif t == 'US':
        r = r * 1.0
    return r


# ===== After: リファクタリング後 =====
from dataclasses import dataclass
from enum import Enum

class OrderType(Enum):
    STANDARD = "standard"
    PREMIUM = "premium"

class TaxRegion(Enum):
    JP = "JP"
    US = "US"

# 定数を名前付きで定義
STANDARD_BULK_THRESHOLD = 10
PREMIUM_BULK_THRESHOLD = 5
STANDARD_BULK_DISCOUNT = 0.90
PREMIUM_BULK_DISCOUNT = 0.85
JP_TAX_RATE = 1.10
US_TAX_RATE = 1.00

@dataclass
class Order:
    order_type: OrderType
    unit_price: float
    quantity: int

def calculate_subtotal(order: Order) -> float:
    """数量割引前の小計を計算する"""
    return order.unit_price * order.quantity

def apply_bulk_discount(order: Order, subtotal: float) -> float:
    """数量割引を適用した金額を返す"""
    if order.order_type == OrderType.STANDARD:
        if order.quantity > STANDARD_BULK_THRESHOLD:
            return subtotal * STANDARD_BULK_DISCOUNT
    elif order.order_type == OrderType.PREMIUM:
        if order.quantity > PREMIUM_BULK_THRESHOLD:
            return subtotal * PREMIUM_BULK_DISCOUNT
    return subtotal

def apply_tax(amount: float, region: TaxRegion) -> float:
    """税率を適用した金額を返す"""
    tax_rates = {
        TaxRegion.JP: JP_TAX_RATE,
        TaxRegion.US: US_TAX_RATE,
    }
    return amount * tax_rates.get(region, 1.0)

def calculate_order_total(order: Order, region: TaxRegion) -> float:
    """注文の合計金額（税込・割引後）を計算する"""
    subtotal = calculate_subtotal(order)
    discounted = apply_bulk_discount(order, subtotal)
    return apply_tax(discounted, region)


# デモ
order = Order(
    order_type=OrderType.STANDARD,
    unit_price=1000.0,
    quantity=15,
)
total = calculate_order_total(order, TaxRegion.JP)
print(f"合計（スタンダード, 15個, JP）: ¥{total:.0f}")
# 1000 * 15 * 0.9 * 1.1 = 14850

# リファクタリングの検証: Before と After の結果が同じこと
before = calc({'type': 'standard', 'price': 1000, 'qty': 15}, 'JP')
print(f"Before: {before}, After: {total}, 一致: {abs(before - total) < 0.01}")
```

## 使用場面

- スプリントの「リファクタリングチケット」として技術的負債を計画的に返済するとき
- 新機能追加の前に関連コードをリファクタリングして変更を容易にする（ボーイスカウトルール）
- コードレビューで発見された Code Smell を修正するとき
- レガシーシステムのモダナイゼーション（段階的なリファクタリングで書き換えリスクを低減）

## 参考文献

- Fowler, M. (2018). *Refactoring: Improving the Design of Existing Code* (2nd ed.). Addison-Wesley.
- Cunningham, W. (1992). The WyCash Portfolio Management System. *OOPSLA '92*.
- [Martin Fowler のリファクタリングカタログ](https://refactoring.com/catalog/)

<AffiliateBanner site="software_navi" />
