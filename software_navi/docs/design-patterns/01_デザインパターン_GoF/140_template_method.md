import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Template Method パターン

## Template Method とは

> 操作のアルゴリズムの骨格を定義し、一部のステップをサブクラスに任せる。Template Method パターンにより、サブクラスはアルゴリズムの構造を変えることなく特定のステップを再定義できる。

Template Method パターンは GoF の振る舞いパターンのひとつです。「処理の流れ（テンプレート）は親クラスが決め、詳細の一部をサブクラスが実装する」という継承ベースのパターンです。

データ処理パイプライン・レポート生成・ゲームのターン処理など、「大まかな手順は共通だが、一部のステップは種類ごとに異なる」という場面に適しています。

ポイントは「呼び出す側（テンプレートメソッド）は親クラスにあり、サブクラスは override するだけ」という点です。フレームワークのコールバックメソッドはこのパターンの典型例です。抽象メソッド（必ずオーバーライド）とフックメソッド（任意でオーバーライド）を使い分けることで柔軟性を高められます。

## パターンの構造

| 要素 | 役割 |
|------|------|
| AbstractClass | テンプレートメソッドを定義し、抽象ステップを持つ |
| ConcreteClass | 抽象ステップを具体的に実装する |
| フックメソッド | デフォルト実装を持ち、任意でオーバーライドできるステップ |

```python title="Template Method パターン — データ変換パイプライン（Python）"
from abc import ABC, abstractmethod

class DataProcessor(ABC):
    """AbstractClass: テンプレートメソッドでパイプラインを定義"""

    def process(self, path: str) -> None:
        data = self.read(path)
        data = self.parse(data)
        data = self.transform(data)
        self.save(data)

    @abstractmethod
    def read(self, path: str) -> str: ...

    @abstractmethod
    def parse(self, raw: str) -> list[dict]: ...

    def transform(self, data: list[dict]) -> list[dict]:
        """フックメソッド: デフォルトは変換なし"""
        return data

    @abstractmethod
    def save(self, data: list[dict]) -> None: ...


class CsvProcessor(DataProcessor):
    def read(self, path: str) -> str:
        return open(path).read()

    def parse(self, raw: str) -> list[dict]:
        lines = raw.strip().split("\n")
        headers = lines[0].split(",")
        return [dict(zip(headers, l.split(","))) for l in lines[1:]]

    def transform(self, data: list[dict]) -> list[dict]:
        for row in data:
            row["name"] = row["name"].upper()
        return data

    def save(self, data: list[dict]) -> None:
        print(f"Saved {len(data)} records to DB")
```

```typescript title="Template Method パターン — レポート生成（TypeScript）"
abstract class ReportGenerator {
  // テンプレートメソッド
  generate(): string {
    const header  = this.buildHeader();
    const body    = this.buildBody();
    const footer  = this.buildFooter();
    return [header, body, footer].join("\n");
  }

  protected abstract buildHeader(): string;
  protected abstract buildBody(): string;

  // フックメソッド
  protected buildFooter(): string {
    return "--- End of Report ---";
  }
}

class SalesReport extends ReportGenerator {
  protected buildHeader(): string { return "=== Sales Report ==="; }
  protected buildBody(): string   { return "Total: ¥1,200,000"; }
}

class ErrorReport extends ReportGenerator {
  protected buildHeader(): string { return "=== Error Report ==="; }
  protected buildBody(): string   { return "Errors: 42"; }
  protected buildFooter(): string { return "Please contact support."; }
}

console.log(new SalesReport().generate());
```

## 使用場面

- データのインポート・エクスポートで、読み込み・変換・書き込みの流れは共通だが形式が異なるとき
- フレームワークがコールバックメソッドを呼ぶ仕組み（React の lifecycle など）
- テストクラスで共通のセットアップ・ティアダウン手順を定義するとき

## 参考文献

- Erich Gamma, et al., *Design Patterns: Elements of Reusable Object-Oriented Software*, Addison-Wesley, 1994

<AffiliateBanner site="software_navi" />
