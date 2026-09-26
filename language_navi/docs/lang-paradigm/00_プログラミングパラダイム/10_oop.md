import AffiliateBanner from '@site/src/components/AffiliateBanner';

# オブジェクト指向プログラミングの4原則

## オブジェクト指向プログラミングとは

> オブジェクト指向プログラミング（OOP）とは、データと手続きを「オブジェクト」という単位にまとめ、オブジェクト同士のメッセージのやり取りによってプログラムを構成するパラダイムである。

OOPはSimula（1967年）に起源を持ち、SmalltalkやC++、Javaによって広く普及した。現代のWebアプリケーションや業務システムの多くがOOP的な設計を採用している。その核心となるのが「カプセル化・継承・ポリモーフィズム・抽象化」の4原則であり、これらを適切に組み合わせることで、変更に強く再利用性の高いコードを書くことができる。

4原則はそれぞれ独立した概念ではなく、互いに補完し合う関係にある。カプセル化によってオブジェクト内部の複雑さを隠蔽し、継承によって共通の振る舞いを再利用し、ポリモーフィズムによって柔軟な拡張を可能にし、抽象化によって具体的な実装から独立したインターフェースを提供する。

## 4原則の比較

| 原則 | 目的 | キーワード |
|------|------|-----------|
| カプセル化（Encapsulation） | 内部状態を隠蔽し、外部からの直接アクセスを制限する | `private`, `getter/setter` |
| 継承（Inheritance） | 既存クラスの属性・メソッドを引き継いで再利用する | `extends`, `super` |
| ポリモーフィズム（Polymorphism） | 同一インターフェースで異なる動作を実現する | `override`, `interface` |
| 抽象化（Abstraction） | 共通の特徴を抽出し、具体的な実装を隠す | `abstract`, `interface` |

```python
from abc import ABC, abstractmethod

# 抽象化: 共通インターフェースの定義
class Shape(ABC):
    @abstractmethod
    def area(self) -> float:
        pass

    # カプセル化: 内部データを保護
    def __init__(self, color: str):
        self._color = color  # protectedアクセス

    @property
    def color(self):
        return self._color

# 継承: Shapeを継承して具体的な形を定義
class Circle(Shape):
    def __init__(self, radius: float, color: str):
        super().__init__(color)
        self._radius = radius

    # ポリモーフィズム: area()をオーバーライド
    def area(self) -> float:
        import math
        return math.pi * self._radius ** 2

class Rectangle(Shape):
    def __init__(self, width: float, height: float, color: str):
        super().__init__(color)
        self._width = width
        self._height = height

    def area(self) -> float:
        return self._width * self._height

# ポリモーフィズムの活用: 同じ関数でどちらの型も扱える
shapes: list[Shape] = [Circle(5, "red"), Rectangle(4, 6, "blue")]
for shape in shapes:
    print(f"{shape.color}: area = {shape.area():.2f}")
# red: area = 78.54
# blue: area = 24.00
```

```typescript
// TypeScriptでのインターフェースと実装
interface Drawable {
    draw(): void;
}

abstract class Animal {
    constructor(protected name: string) {}

    // 抽象メソッド: サブクラスで実装を強制
    abstract speak(): string;

    describe(): string {
        return `${this.name} says: ${this.speak()}`;
    }
}

class Dog extends Animal implements Drawable {
    speak(): string { return "Woof!"; }
    draw(): void { console.log("Drawing a dog"); }
}

class Cat extends Animal implements Drawable {
    speak(): string { return "Meow!"; }
    draw(): void { console.log("Drawing a cat"); }
}

const animals: Animal[] = [new Dog("Rex"), new Cat("Whiskers")];
animals.forEach(a => console.log(a.describe()));
```

## 使用場面

- GUIアプリケーションでウィジェットやコンポーネントをオブジェクトとして管理する場合
- ゲーム開発でキャラクター・アイテム・ステージなどをクラス設計する場合
- 大規模業務システムでドメインモデルを表現する場合
- デザインパターン（Strategy・Observer等）を適用してシステムを設計する場合

## 参考文献

- Gamma, E., et al. (1994). *Design Patterns: Elements of Reusable Object-Oriented Software*. Addison-Wesley.
- Martin, R. C. (2000). "Design Principles and Design Patterns." ObjectMentor.
- [Python 公式ドキュメント — クラス](https://docs.python.org/ja/3/tutorial/classes.html)

<AffiliateBanner site="language_navi" />
