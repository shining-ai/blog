import AffiliateBanner from '@site/src/components/AffiliateBanner';

# SOLID原則 L: リスコフ置換の原則（LSP）

## リスコフ置換の原則とは

> 型 S が型 T のサブタイプであるならば、プログラム内で T 型のオブジェクトが使われているすべての箇所は、プログラムの性質を変えることなく S 型のオブジェクトで置換できなければならない。

リスコフ置換の原則（Liskov Substitution Principle, LSP）は、継承関係における正しいサブタイピングを定義します。サブクラスは親クラスの「契約」を守らなければなりません。契約とは、事前条件・事後条件・不変条件の集合です。

LSPに違反する代表例は「正方形は長方形の一種」という直感に従ってクラスを継承させるケースです。`Rectangle` クラスの `set_width` / `set_height` を独立に設定できる契約を `Square` が破ると、`Rectangle` を期待するコードが正しく動作しなくなります。

LSPは単なる構文上の継承ではなく、**振る舞いの互換性**を要求します。違反が見つかった場合は継承ではなくコンポジションに切り替えることを検討します。

## 違反例と改善例

| 状態 | 説明 |
|------|------|
| 違反 | `Square` が `Rectangle` を継承し、幅と高さを連動させる |
| 改善 | `Shape` インタフェースを導入し、それぞれ独立実装 |

```python title="LSP 違反例"
class Rectangle:
    def __init__(self, w, h):
        self.width = w
        self.height = h

    def set_width(self, w):
        self.width = w

    def set_height(self, h):
        self.height = h

    def area(self):
        return self.width * self.height

class Square(Rectangle):
    def set_width(self, w):
        self.width = w
        self.height = w  # 契約違反: height も変わってしまう

    def set_height(self, h):
        self.width = h
        self.height = h

def process(rect: Rectangle):
    rect.set_width(5)
    rect.set_height(4)
    assert rect.area() == 20  # Square を渡すと失敗
```

```python title="LSP 適用例（コンポジション）"
from abc import ABC, abstractmethod

class Shape(ABC):
    @abstractmethod
    def area(self) -> float: ...

class Rectangle(Shape):
    def __init__(self, width: float, height: float):
        self.width = width
        self.height = height

    def area(self) -> float:
        return self.width * self.height

class Square(Shape):
    def __init__(self, side: float):
        self.side = side

    def area(self) -> float:
        return self.side ** 2
```

## 使用場面

- 継承階層を設計するときのサブタイプ検証
- 既存の親クラスを継承したサブクラスが予期しない挙動を示す場合の診断
- インタフェース設計でコントラクトを明確に定義したいとき

## 参考文献

- Barbara Liskov, Jeannette Wing, "A behavioral notion of subtyping", ACM TOPLAS, 1994
- Robert C. Martin, *Agile Software Development*, Prentice Hall, 2002

<AffiliateBanner site="software_navi" />
