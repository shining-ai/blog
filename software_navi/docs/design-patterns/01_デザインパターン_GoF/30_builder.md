import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Builder パターン

## Builder とは

> 複雑なオブジェクトを段階的に組み立てられるよう、生成処理を分離する。同じ組み立てプロセスで異なる表現のオブジェクトを生成できる。

Builder パターンは GoF の生成パターンのひとつです。コンストラクタの引数が多く、オプションが組み合わさって複雑になるオブジェクトの生成に特に有効です。

コンストラクタに多数の引数を渡すと「テレスコーピングコンストラクタ（望遠鏡型コンストラクタ）」と呼ばれる可読性の低いコードになります。Builder を使うと各プロパティをメソッドチェーンで設定でき、何を設定しているか明確になります。

Python では `dataclass` や keyword 引数で解決できる場合もありますが、生成ステップが複雑・段階的な場合や Director で再利用できる組み立て手順を提供する場合に Builder が有効です。

## パターンの構造

| 要素 | 役割 |
|------|------|
| Builder | 各パーツを組み立てるメソッドのインタフェース |
| ConcreteBuilder | Builder を実装し、具体的なオブジェクトを組み立てる |
| Director | Builder を使ってオブジェクトを組み立てる手順を定義 |
| Product | 最終的に生成されるオブジェクト |

```python title="Builder パターン（Python）"
from dataclasses import dataclass, field

@dataclass
class Pizza:
    size: str = "M"
    crust: str = "thin"
    toppings: list[str] = field(default_factory=list)
    extra_cheese: bool = False

class PizzaBuilder:
    def __init__(self):
        self._pizza = Pizza()

    def size(self, size: str) -> "PizzaBuilder":
        self._pizza.size = size
        return self

    def crust(self, crust: str) -> "PizzaBuilder":
        self._pizza.crust = crust
        return self

    def topping(self, topping: str) -> "PizzaBuilder":
        self._pizza.toppings.append(topping)
        return self

    def extra_cheese(self) -> "PizzaBuilder":
        self._pizza.extra_cheese = True
        return self

    def build(self) -> Pizza:
        return self._pizza

# メソッドチェーンで読みやすく組み立て
pizza = (
    PizzaBuilder()
    .size("L")
    .crust("thick")
    .topping("mushroom")
    .topping("pepperoni")
    .extra_cheese()
    .build()
)
print(pizza)
# Pizza(size='L', crust='thick', toppings=['mushroom', 'pepperoni'], extra_cheese=True)
```

```typescript title="Builder パターン（TypeScript）"
class QueryBuilder {
  private table = "";
  private conditions: string[] = [];
  private limitValue: number | null = null;

  from(table: string): this {
    this.table = table;
    return this;
  }

  where(condition: string): this {
    this.conditions.push(condition);
    return this;
  }

  limit(n: number): this {
    this.limitValue = n;
    return this;
  }

  build(): string {
    let sql = `SELECT * FROM ${this.table}`;
    if (this.conditions.length > 0) {
      sql += ` WHERE ${this.conditions.join(" AND ")}`;
    }
    if (this.limitValue !== null) {
      sql += ` LIMIT ${this.limitValue}`;
    }
    return sql;
  }
}

const sql = new QueryBuilder()
  .from("users")
  .where("age > 18")
  .where("active = 1")
  .limit(10)
  .build();

console.log(sql);
// SELECT * FROM users WHERE age > 18 AND active = 1 LIMIT 10
```

## 使用場面

- コンストラクタ引数が多く、省略可能なものが多いオブジェクトの生成
- テスト用のオブジェクト（Test Data Builder）を読みやすく組み立てたいとき
- SQL クエリビルダー・HTTP リクエストビルダーなど段階的な組み立てが必要な場合

## 参考文献

- Erich Gamma, et al., *Design Patterns: Elements of Reusable Object-Oriented Software*, Addison-Wesley, 1994
- Joshua Bloch, *Effective Java*, 3rd Edition, Addison-Wesley, 2018

<AffiliateBanner site="software_navi" />
