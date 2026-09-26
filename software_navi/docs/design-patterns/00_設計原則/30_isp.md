import AffiliateBanner from '@site/src/components/AffiliateBanner';

# SOLID原則 I: インタフェース分離の原則（ISP）

## インタフェース分離の原則とは

> クライアントは、自分が使わないメソッドへの依存を強制されるべきではない。（Clients should not be forced to depend upon interfaces that they do not use.）

インタフェース分離の原則（Interface Segregation Principle, ISP）は、「太った（fat）インタフェース」を避け、クライアントが必要なメソッドのみ持つ小さなインタフェースに分割することを求めます。

巨大なインタフェースを実装させると、クライアントは自分が使わないメソッドに対しても変更の影響を受けます。たとえば `IMachine` インタフェースが `print` / `scan` / `fax` を全て定義している場合、プリンタしか持たないクラスも `scan` と `fax` を実装（あるいは空実装）しなければなりません。

ISPに従って細粒度のインタフェースに分割すると、実装クラスは必要な機能だけ実装でき、クライアントも自分が必要な能力だけに依存できます。これは依存性逆転原則（DIP）とも密接に関連しています。

## 違反例と改善例

| 状態 | 説明 |
|------|------|
| 違反 | `IMachine` に全機能を定義 → 未使用メソッドの空実装が発生 |
| 改善 | `IPrinter`・`IScanner`・`IFax` に分割し、必要なものだけ実装 |

```python title="ISP 違反例"
from abc import ABC, abstractmethod

class IMachine(ABC):
    @abstractmethod
    def print(self, doc): ...
    @abstractmethod
    def scan(self, doc): ...
    @abstractmethod
    def fax(self, doc): ...

class SimplePrinter(IMachine):
    def print(self, doc):
        print(f"Printing: {doc}")

    def scan(self, doc):
        raise NotImplementedError("This printer cannot scan")  # 不要な実装

    def fax(self, doc):
        raise NotImplementedError("This printer cannot fax")   # 不要な実装
```

```python title="ISP 適用例"
from abc import ABC, abstractmethod

class IPrinter(ABC):
    @abstractmethod
    def print(self, doc): ...

class IScanner(ABC):
    @abstractmethod
    def scan(self, doc): ...

class IFax(ABC):
    @abstractmethod
    def fax(self, doc): ...

class SimplePrinter(IPrinter):
    def print(self, doc):
        print(f"Printing: {doc}")

class MultiFunctionDevice(IPrinter, IScanner, IFax):
    def print(self, doc):
        print(f"Printing: {doc}")

    def scan(self, doc):
        print(f"Scanning: {doc}")

    def fax(self, doc):
        print(f"Faxing: {doc}")
```

## 使用場面

- 多機能なインタフェースを複数クラスに実装させる場合のリファクタリング
- マイクロサービスの境界定義や API クライアントの設計
- 役割ごとに権限を分けたロールベースの設計

## 参考文献

- Robert C. Martin, *Agile Software Development*, Prentice Hall, 2002
- Robert C. Martin, *Clean Architecture*, Prentice Hall, 2017

<AffiliateBanner site="software_navi" />
