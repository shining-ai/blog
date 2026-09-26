import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Factory Method パターン

## Factory Method とは

> オブジェクトを生成するためのインタフェースを定義するが、どのクラスをインスタンス化するかはサブクラスが決定する。

Factory Method パターンは GoF の生成パターンのひとつです。オブジェクトの生成をサブクラスに委譲することで、クライアントコードは具体クラスに依存せずオブジェクトを生成できます。

「どのクラスを生成するか」という判断をサブクラスに委ねることで、新しい製品（Product）クラスを追加する際に既存のクライアントコードを変更する必要がありません。これは開放閉鎖の原則（OCP）と一致します。

Simple Factory（静的ファクトリメソッド）とは異なり、Factory Method は継承を使って「どのオブジェクトを作るか」をオーバーライドできる点が特徴です。

## パターンの構造

| 要素 | 役割 |
|------|------|
| Creator | `factory_method()` を持つ抽象クラス |
| ConcreteCreator | `factory_method()` をオーバーライドし具体 Product を返す |
| Product | 生成されるオブジェクトのインタフェース |
| ConcreteProduct | Product の具体実装 |

```python title="Factory Method パターン（Python）"
from abc import ABC, abstractmethod

# Product
class Notification(ABC):
    @abstractmethod
    def send(self, message: str) -> None: ...

class EmailNotification(Notification):
    def send(self, message: str) -> None:
        print(f"Email: {message}")

class SMSNotification(Notification):
    def send(self, message: str) -> None:
        print(f"SMS: {message}")

# Creator
class NotificationService(ABC):
    @abstractmethod
    def create_notification(self) -> Notification:
        """Factory Method"""
        ...

    def notify(self, message: str) -> None:
        notification = self.create_notification()
        notification.send(message)

class EmailService(NotificationService):
    def create_notification(self) -> Notification:
        return EmailNotification()

class SMSService(NotificationService):
    def create_notification(self) -> Notification:
        return SMSNotification()

# 使用例
services: list[NotificationService] = [EmailService(), SMSService()]
for service in services:
    service.notify("Hello!")
# Email: Hello!
# SMS: Hello!
```

## 使用場面

- フレームワークがサブクラスに生成するオブジェクトの種類を決定させるとき
- 生成するオブジェクトの種類が実行時まで不明なとき
- ユニットテストでモックオブジェクトに差し替えたいとき

## 参考文献

- Erich Gamma, et al., *Design Patterns: Elements of Reusable Object-Oriented Software*, Addison-Wesley, 1994

<AffiliateBanner site="software_navi" />
