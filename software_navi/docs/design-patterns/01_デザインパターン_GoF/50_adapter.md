import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Adapter パターン

## Adapter とは

> あるクラスのインタフェースを、クライアントが期待する別のインタフェースに変換する。互換性のないインタフェースを持つクラスどうしを連携させる。

Adapter パターン（Wrapperパターンとも呼ぶ）は GoF の構造パターンのひとつです。既存のクラスやライブラリが期待するインタフェースと異なる場合に、間に「アダプタ」を挟んで橋渡しします。

現実世界の電源アダプタのような役割で、日本の 100V プラグを米国の 120V コンセントに差せるよう変換するのと同じ概念です。既存コードを変更することなく、新しいインタフェースに対応させられるのが最大のメリットです。

実装方法は2種類あります。**クラスアダプタ**は多重継承でターゲットと適合クラスの両方を継承します。**オブジェクトアダプタ**は適合クラスをコンポジションで保持します。Python・TypeScript では多重継承より**オブジェクトアダプタ**が推奨されます。

## パターンの構造

| 要素 | 役割 |
|------|------|
| Target | クライアントが期待するインタフェース |
| Adaptee | 既存クラス（インタフェースが合わない） |
| Adapter | Target を実装し Adaptee を内包して橋渡しする |
| Client | Target インタフェースを通じて操作する |

```python title="Adapter パターン（Python）"
# 既存の外部ライブラリ（変更不可）
class LegacyPrinter:
    def print_text(self, text: str) -> None:
        print(f"[Legacy] {text}")

# クライアントが期待するインタフェース
class Printer:
    def print(self, document: str) -> None:
        raise NotImplementedError

# アダプタ: LegacyPrinter を Printer インタフェースに適合させる
class PrinterAdapter(Printer):
    def __init__(self, legacy: LegacyPrinter):
        self._legacy = legacy

    def print(self, document: str) -> None:
        self._legacy.print_text(document)  # インタフェースを変換

# クライアントは Printer インタフェースだけを知る
def client_print(printer: Printer, doc: str) -> None:
    printer.print(doc)

legacy = LegacyPrinter()
adapter = PrinterAdapter(legacy)
client_print(adapter, "Hello, World!")  # [Legacy] Hello, World!
```

```typescript title="Adapter パターン（TypeScript）"
// 新しいインタフェース
interface Logger {
  log(level: string, message: string): void;
}

// 既存ライブラリ
class OldLogger {
  writeInfo(msg: string) { console.log(`INFO: ${msg}`); }
  writeError(msg: string) { console.error(`ERROR: ${msg}`); }
}

// アダプタ
class LoggerAdapter implements Logger {
  constructor(private old: OldLogger) {}

  log(level: string, message: string): void {
    if (level === "error") {
      this.old.writeError(message);
    } else {
      this.old.writeInfo(message);
    }
  }
}

const logger: Logger = new LoggerAdapter(new OldLogger());
logger.log("info", "Application started");
logger.log("error", "Something went wrong");
```

## 使用場面

- サードパーティライブラリを既存システムに組み込むとき
- レガシーコードを新しいインタフェースに適合させるとき
- テスト用のモックを既存コードに差し込みたいとき

## 参考文献

- Erich Gamma, et al., *Design Patterns: Elements of Reusable Object-Oriented Software*, Addison-Wesley, 1994

<AffiliateBanner site="software_navi" />
