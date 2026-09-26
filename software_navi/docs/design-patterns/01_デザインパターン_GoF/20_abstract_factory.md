import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Abstract Factory パターン

## Abstract Factory とは

> 具体的なクラスを指定せずに、関連したオブジェクト群や依存し合うオブジェクト群を生成するためのインタフェースを提供する。

Abstract Factory パターンは GoF の生成パターンのひとつで、「製品ファミリー」を一貫して生成する仕組みを提供します。Factory Method がひとつの製品を生成するのに対し、Abstract Factory は関連する複数の製品を組み合わせて生成します。

たとえば GUI ツールキットで、Windows 向けとMac向けで「ボタン」「チェックボックス」「テキストボックス」を統一したルック＆フィールで揃えたい場合に有効です。クライアントはどの OS 用かを意識せず、ファクトリに製品群の生成を任せられます。

ファクトリの切り替えだけで全製品が一括で切り替わるため、製品間の整合性が保たれます。一方、新しい製品種別を追加するとすべてのファクトリクラスを修正する必要があります。

## パターンの構造

| 要素 | 役割 |
|------|------|
| AbstractFactory | 製品群を生成するメソッドを定義するインタフェース |
| ConcreteFactory | AbstractFactory を実装し、具体的な製品を生成 |
| AbstractProduct | 各製品のインタフェース |
| ConcreteProduct | AbstractProduct の具体実装 |

```python title="Abstract Factory パターン（Python）"
from abc import ABC, abstractmethod

# Abstract Products
class Button(ABC):
    @abstractmethod
    def render(self) -> str: ...

class Checkbox(ABC):
    @abstractmethod
    def render(self) -> str: ...

# Concrete Products — Windows
class WindowsButton(Button):
    def render(self) -> str:
        return "[Windows Button]"

class WindowsCheckbox(Checkbox):
    def render(self) -> str:
        return "[Windows Checkbox]"

# Concrete Products — Mac
class MacButton(Button):
    def render(self) -> str:
        return "(Mac Button)"

class MacCheckbox(Checkbox):
    def render(self) -> str:
        return "(Mac Checkbox)"

# Abstract Factory
class UIFactory(ABC):
    @abstractmethod
    def create_button(self) -> Button: ...

    @abstractmethod
    def create_checkbox(self) -> Checkbox: ...

# Concrete Factories
class WindowsUIFactory(UIFactory):
    def create_button(self) -> Button:
        return WindowsButton()

    def create_checkbox(self) -> Checkbox:
        return WindowsCheckbox()

class MacUIFactory(UIFactory):
    def create_button(self) -> Button:
        return MacButton()

    def create_checkbox(self) -> Checkbox:
        return MacCheckbox()

# クライアントはファクトリの種類を知らなくてよい
def render_ui(factory: UIFactory) -> None:
    btn = factory.create_button()
    chk = factory.create_checkbox()
    print(btn.render(), chk.render())

render_ui(WindowsUIFactory())  # [Windows Button] [Windows Checkbox]
render_ui(MacUIFactory())       # (Mac Button) (Mac Checkbox)
```

## 使用場面

- OS・テーマ・データベースドライバなど、製品ファミリーを切り替えるとき
- 製品間の整合性（見た目・API の統一）を保証したいとき
- テスト用のモックファクトリに丸ごと差し替えたいとき

## 参考文献

- Erich Gamma, et al., *Design Patterns: Elements of Reusable Object-Oriented Software*, Addison-Wesley, 1994

<AffiliateBanner site="software_navi" />
