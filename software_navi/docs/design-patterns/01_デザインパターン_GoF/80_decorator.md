import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Decorator パターン

## Decorator とは

> オブジェクトに動的に責任（機能）を追加する。サブクラス化によるクラスの拡張に代わる柔軟な手段を提供する。

Decorator パターンは GoF の構造パターンのひとつです。既存クラスを変更せず、同じインタフェースを持つラッパーでオブジェクトを包むことで機能を追加します。

継承で機能を追加すると「機能の組み合わせ」でクラスが爆発します。たとえば「ロギング付き」「暗号化付き」「圧縮付き」を組み合わせると 8 種類（2³）のクラスが必要です。Decorator を使えば実行時に自由に組み合わせられます。

Python の `@functools.wraps` や Java の IO ストリーム（`BufferedInputStream(FileInputStream(...))`）が典型的な実装例です。

## パターンの構造

| 要素 | 役割 |
|------|------|
| Component | 基本インタフェース |
| ConcreteComponent | デコレートされる基底オブジェクト |
| Decorator | Component を実装し、内部に Component への参照を持つ基底デコレータ |
| ConcreteDecorator | 追加機能を実装する具体デコレータ |

```python title="Decorator パターン（Python）"
from abc import ABC, abstractmethod

class DataSource(ABC):
    @abstractmethod
    def write(self, data: str) -> None: ...

    @abstractmethod
    def read(self) -> str: ...

class FileDataSource(DataSource):
    def __init__(self, filename: str):
        self._filename = filename
        self._data = ""

    def write(self, data: str) -> None:
        self._data = data
        print(f"[File] write: {data}")

    def read(self) -> str:
        return self._data

# 基底デコレータ
class DataSourceDecorator(DataSource):
    def __init__(self, wrapped: DataSource):
        self._wrapped = wrapped

    def write(self, data: str) -> None:
        self._wrapped.write(data)

    def read(self) -> str:
        return self._wrapped.read()

# 暗号化デコレータ
class EncryptionDecorator(DataSourceDecorator):
    def write(self, data: str) -> None:
        encoded = data[::-1]  # 簡易逆順エンコード
        print(f"[Encrypt] {data} -> {encoded}")
        super().write(encoded)

    def read(self) -> str:
        return super().read()[::-1]  # 復号

# 圧縮デコレータ
class CompressionDecorator(DataSourceDecorator):
    def write(self, data: str) -> None:
        compressed = f"[compressed:{len(data)}]{data}"
        print(f"[Compress] applying compression")
        super().write(compressed)

# 実行時に自由に組み合わせ
source = FileDataSource("data.txt")
encrypted = EncryptionDecorator(source)
encrypted_compressed = CompressionDecorator(encrypted)

encrypted_compressed.write("Hello")
```

```typescript title="Decorator パターン（TypeScript）"
interface TextProcessor {
  process(text: string): string;
}

class PlainText implements TextProcessor {
  process(text: string): string {
    return text;
  }
}

class UpperCaseDecorator implements TextProcessor {
  constructor(private wrapped: TextProcessor) {}
  process(text: string): string {
    return this.wrapped.process(text).toUpperCase();
  }
}

class TrimDecorator implements TextProcessor {
  constructor(private wrapped: TextProcessor) {}
  process(text: string): string {
    return this.wrapped.process(text).trim();
  }
}

const processor = new UpperCaseDecorator(new TrimDecorator(new PlainText()));
console.log(processor.process("  hello world  ")); // "HELLO WORLD"
```

## 使用場面

- ミドルウェア・フィルター・パイプラインの実装（HTTP リクエストの認証・ロギング・圧縮）
- I/O ストリームに機能を追加するとき（Java の InputStreamDecorator）
- Python のデコレータ構文 `@` の基礎概念として

## 参考文献

- Erich Gamma, et al., *Design Patterns: Elements of Reusable Object-Oriented Software*, Addison-Wesley, 1994

<AffiliateBanner site="software_navi" />
