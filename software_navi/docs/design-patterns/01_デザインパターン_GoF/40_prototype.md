import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Prototype パターン

## Prototype とは

> 生成すべきオブジェクトの種類を原型（プロトタイプ）となるインスタンスで指定し、そのインスタンスをコピーして新たなオブジェクトを生成する。

Prototype パターンは GoF の生成パターンのひとつです。コンストラクタでゼロから生成するのではなく、既存のオブジェクト（プロトタイプ）を複製（クローン）することで新しいインスタンスを作ります。

コンストラクタによるオブジェクト生成が高コスト（DB アクセス・複雑な初期化計算など）な場合に有効です。初期化済みのオブジェクトをテンプレートとしてコピーするだけなので生成コストを削減できます。

注意点として、オブジェクト内にネストされた参照がある場合「浅いコピー（shallow copy）」では不十分で「深いコピー（deep copy）」が必要になります。Python では `copy.deepcopy`、Java では `Cloneable` インタフェースを使います。

## パターンの構造

| 要素 | 役割 |
|------|------|
| Prototype | `clone()` メソッドを持つインタフェース |
| ConcretePrototype | `clone()` を実装し自分自身のコピーを返す |
| Client | `clone()` を呼び出し新しいインスタンスを得る |

```python title="Prototype パターン（Python）"
import copy
from dataclasses import dataclass, field

@dataclass
class Address:
    city: str
    street: str

@dataclass
class Employee:
    name: str
    department: str
    address: Address
    skills: list[str] = field(default_factory=list)

    def clone(self) -> "Employee":
        """深いコピーでプロトタイプを複製"""
        return copy.deepcopy(self)

# プロトタイプとなるオブジェクトを準備
template = Employee(
    name="Template",
    department="Engineering",
    address=Address("Tokyo", "Shibuya"),
    skills=["Python", "Docker"]
)

# クローンして個別にカスタマイズ
alice = template.clone()
alice.name = "Alice"
alice.skills.append("Kubernetes")

bob = template.clone()
bob.name = "Bob"
bob.address.city = "Osaka"  # deep copy なので template に影響しない

print(template.address.city)  # Tokyo（変更されていない）
print(alice.skills)            # ['Python', 'Docker', 'Kubernetes']
print(bob.address.city)        # Osaka
```

```typescript title="Prototype パターン（TypeScript）"
interface Cloneable<T> {
  clone(): T;
}

class Shape implements Cloneable<Shape> {
  constructor(
    public type: string,
    public color: string,
    public x: number,
    public y: number
  ) {}

  clone(): Shape {
    return new Shape(this.type, this.color, this.x, this.y);
  }
}

const original = new Shape("circle", "red", 10, 20);
const copy1 = original.clone();
copy1.color = "blue";
copy1.x = 50;

console.log(original.color); // red（変更なし）
console.log(copy1.color);    // blue
```

## 使用場面

- コンストラクタによるオブジェクト生成コストが高い場合（DB 読み込み・重い計算）
- 既存のオブジェクトを少し変えて別のインスタンスを作りたいとき
- ゲームオブジェクトのスポーン（敵・障害物の大量複製）

## 参考文献

- Erich Gamma, et al., *Design Patterns: Elements of Reusable Object-Oriented Software*, Addison-Wesley, 1994

<AffiliateBanner site="software_navi" />
