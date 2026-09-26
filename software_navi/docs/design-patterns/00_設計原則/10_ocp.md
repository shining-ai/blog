import AffiliateBanner from '@site/src/components/AffiliateBanner';

# SOLID原則 O: 開放閉鎖の原則（OCP）

## 開放閉鎖の原則とは

> ソフトウェアの構成要素は、拡張に対して開かれており、修正に対して閉じていなければならない。（Software entities should be open for extension, but closed for modification.）

開放閉鎖の原則（Open/Closed Principle, OCP）は、既存コードを変更せずに新しい機能を追加できる設計を目指す原則です。新しい振る舞いを追加するたびに既存コードを書き換えると、バグを混入するリスクや、既存テストを壊すリスクが高まります。

OCPを実現する主な手法は「抽象化」です。インタフェースや抽象クラスで変化しない部分を定義し、具体的な実装をサブクラスやプラグインとして追加します。これにより既存の呼び出し元コードは変更不要のまま、新しい実装を差し込めます。

ただし「完全に閉じたコード」は現実には難しく、**どの変更軸に対して閉じるか**を戦略的に決めることが重要です。頻繁に変わる部分を抽象化し、安定した部分は直接利用するのが現実的なアプローチです。

## 違反例と改善例

| 状態 | 説明 |
|------|------|
| 違反 | 割引計算に `if/elif` で種別を分岐 → 新種別追加のたびに修正 |
| 改善 | 割引インタフェースを定義し、種別ごとのクラスで実装 |

```python title="OCP 違反例"
def calculate_discount(order, discount_type: str) -> float:
    if discount_type == "summer":
        return order.total * 0.1
    elif discount_type == "member":
        return order.total * 0.15
    # 新しい割引を追加するたびにここを修正する必要がある
```

```python title="OCP 適用例"
from abc import ABC, abstractmethod

class DiscountStrategy(ABC):
    @abstractmethod
    def calculate(self, total: float) -> float: ...

class SummerDiscount(DiscountStrategy):
    def calculate(self, total: float) -> float:
        return total * 0.1

class MemberDiscount(DiscountStrategy):
    def calculate(self, total: float) -> float:
        return total * 0.15

class NewYearDiscount(DiscountStrategy):  # 既存コードを変更せず追加
    def calculate(self, total: float) -> float:
        return total * 0.2

def calculate_discount(order, strategy: DiscountStrategy) -> float:
    return strategy.calculate(order.total)
```

## 使用場面

- 新機能追加のたびにコアロジックを修正しなければならない場合
- プラグイン・拡張機能の仕組みを設計するとき
- Strategyパターン・Decoratorパターンの設計根拠として

## 参考文献

- Bertrand Meyer, *Object-Oriented Software Construction*, Prentice Hall, 1988
- Robert C. Martin, *Clean Architecture*, Prentice Hall, 2017

<AffiliateBanner site="software_navi" />
