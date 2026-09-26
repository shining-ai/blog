import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Observer パターン

## Observer とは

> あるオブジェクトの状態が変化したとき、それに依存するすべてのオブジェクトに自動的に通知し、更新されるようにする。Publish-Subscribe（発行−購読）とも呼ばれる。

Observer パターンは GoF の振る舞いパターンのひとつです。状態を持つ Subject（発行者）と、変化を監視する Observer（購読者）を疎結合に結びつけます。

Subject は具体的な Observer の種類を知らず、インタフェース越しに通知するだけです。Observer は自分が興味を持つ Subject に登録・解除でき、通知を受けると適切な処理を実行します。

イベント駆動アーキテクチャ・リアクティブプログラミング・MVC の Model-View 通知など、現代のソフトウェアの多くがこのパターンをベースとしています。

## パターンの構造

| 要素 | 役割 |
|------|------|
| Subject | Observer を登録・解除し、状態変化を通知する |
| Observer | `update()` メソッドを持つ通知受信インタフェース |
| ConcreteSubject | 状態を持ち、変化時に `notify()` を呼ぶ |
| ConcreteObserver | 通知を受けて具体的な処理を実行 |

```python title="Observer パターン（Python）"
from abc import ABC, abstractmethod

class Observer(ABC):
    @abstractmethod
    def update(self, event: str, data: object) -> None: ...

class Subject:
    def __init__(self):
        self._observers: list[Observer] = []

    def subscribe(self, observer: Observer) -> None:
        self._observers.append(observer)

    def unsubscribe(self, observer: Observer) -> None:
        self._observers.remove(observer)

    def notify(self, event: str, data: object = None) -> None:
        for obs in self._observers:
            obs.update(event, data)

class StockMarket(Subject):
    def __init__(self):
        super().__init__()
        self._prices: dict[str, float] = {}

    def update_price(self, symbol: str, price: float) -> None:
        self._prices[symbol] = price
        self.notify("price_updated", {"symbol": symbol, "price": price})

class PriceAlertObserver(Observer):
    def __init__(self, symbol: str, threshold: float):
        self._symbol = symbol
        self._threshold = threshold

    def update(self, event: str, data: object) -> None:
        if event == "price_updated" and data["symbol"] == self._symbol:
            if data["price"] >= self._threshold:
                print(f"Alert! {self._symbol} reached {data['price']}")

class LogObserver(Observer):
    def update(self, event: str, data: object) -> None:
        print(f"[LOG] {event}: {data}")

market = StockMarket()
market.subscribe(PriceAlertObserver("AAPL", 200.0))
market.subscribe(LogObserver())

market.update_price("AAPL", 195.0)
market.update_price("AAPL", 205.0)  # Alert! AAPL reached 205.0
```

```typescript title="Observer パターン（TypeScript）"
type EventHandler<T> = (data: T) => void;

class EventEmitter<T> {
  private handlers: EventHandler<T>[] = [];

  on(handler: EventHandler<T>): () => void {
    this.handlers.push(handler);
    return () => { this.handlers = this.handlers.filter(h => h !== handler); };
  }

  emit(data: T): void {
    this.handlers.forEach(h => h(data));
  }
}

const clicks = new EventEmitter<{ x: number; y: number }>();
const unsubscribe = clicks.on(pos => console.log(`Clicked at ${pos.x},${pos.y}`));
clicks.emit({ x: 10, y: 20 }); // Clicked at 10,20
unsubscribe();
clicks.emit({ x: 30, y: 40 }); // 登録解除後は通知なし
```

## 使用場面

- UIのイベントハンドリング（ボタンクリック・フォーム変更）
- MVC・MVVMのModelからViewへの変更通知
- リアルタイムデータフィード（株価・チャット・センサー）

## 参考文献

- Erich Gamma, et al., *Design Patterns: Elements of Reusable Object-Oriented Software*, Addison-Wesley, 1994

<AffiliateBanner site="software_navi" />
