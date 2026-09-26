import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Bridge パターン

## Bridge とは

> 抽象化と実装を分離し、それぞれを独立して変更できるようにする。

Bridge パターンは GoF の構造パターンのひとつです。「何をするか（抽象）」と「どのようにするか（実装）」を別の継承階層に分け、コンポジションで橋渡しします。

継承だけで機能と実装の組み合わせを表現すると、クラス数が爆発します。たとえば「形（円・四角）」と「描画方法（SVG・Canvas）」を組み合わせると、継承では `SVGCircle`・`CanvasCircle`・`SVGRect`・`CanvasRect` の4クラスが必要です。形が3種・描画方法が3種なら9クラスになります。Bridge を使えば形3クラス＋描画3クラス＝6クラスで済みます。

Bridge は「実装の詳細を知らなくてよい抽象側」と「プラットフォーム固有の実装側」を明確に分けることで、変更の波及を抑えます。

## パターンの構造

| 要素 | 役割 |
|------|------|
| Abstraction | 抽象側のインタフェース。Implementor への参照を持つ |
| RefinedAbstraction | Abstraction のサブクラス |
| Implementor | 実装側のインタフェース |
| ConcreteImplementor | Implementor の具体実装 |

```python title="Bridge パターン（Python）"
from abc import ABC, abstractmethod

# Implementor（実装側）
class Renderer(ABC):
    @abstractmethod
    def render_circle(self, x: float, y: float, radius: float) -> str: ...

class SVGRenderer(Renderer):
    def render_circle(self, x, y, radius):
        return f'<circle cx="{x}" cy="{y}" r="{radius}"/>'

class CanvasRenderer(Renderer):
    def render_circle(self, x, y, radius):
        return f"ctx.arc({x}, {y}, {radius}, 0, 2*Math.PI)"

# Abstraction（抽象側）
class Shape(ABC):
    def __init__(self, renderer: Renderer):
        self._renderer = renderer  # Bridge: コンポジションで保持

    @abstractmethod
    def draw(self) -> str: ...

class Circle(Shape):
    def __init__(self, renderer: Renderer, x: float, y: float, radius: float):
        super().__init__(renderer)
        self.x, self.y, self.radius = x, y, radius

    def draw(self) -> str:
        return self._renderer.render_circle(self.x, self.y, self.radius)

# 実装を差し替えるだけで出力が変わる
svg_circle = Circle(SVGRenderer(), 50, 50, 30)
canvas_circle = Circle(CanvasRenderer(), 50, 50, 30)

print(svg_circle.draw())     # <circle cx="50" cy="50" r="30"/>
print(canvas_circle.draw())  # ctx.arc(50, 50, 30, 0, 2*Math.PI)
```

## 使用場面

- 機能と実装の両方を独立して拡張したいとき（クロスプラットフォーム開発）
- 継承によるクラス数の爆発を防ぎたいとき
- 実装（ドライバ・バックエンド）を実行時に切り替えたいとき

## 参考文献

- Erich Gamma, et al., *Design Patterns: Elements of Reusable Object-Oriented Software*, Addison-Wesley, 1994

<AffiliateBanner site="software_navi" />
