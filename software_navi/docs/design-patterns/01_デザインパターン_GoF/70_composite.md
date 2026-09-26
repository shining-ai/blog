import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Composite パターン

## Composite とは

> オブジェクトをツリー構造に組み合わせて、部分と全体の階層を表現する。Composite パターンにより、個々のオブジェクトとオブジェクトの集まりを同一視して扱えるようにする。

Composite パターンは GoF の構造パターンのひとつです。「葉（Leaf）」と「枝（Composite）」を同じインタフェースで扱うことで、クライアントは個々の要素か複合要素かを意識せずに操作できます。

ファイルシステムが典型例です。ファイルとフォルダは異なるものですが、「サイズを取得する」「削除する」といった操作は共通です。フォルダの場合は内包する要素に再帰的に操作を委譲します。

再帰的なデータ構造（ツリー・メニュー・組織図・UI コンポーネント）を透過的に扱う必要がある場合に Composite パターンが有効です。

## パターンの構造

| 要素 | 役割 |
|------|------|
| Component | Leaf と Composite 共通のインタフェース |
| Leaf | 子を持たない末端要素 |
| Composite | 子を持つ複合要素。Component のリストを管理し再帰的に処理 |

```python title="Composite パターン（Python）"
from abc import ABC, abstractmethod

class FileSystemItem(ABC):
    def __init__(self, name: str):
        self.name = name

    @abstractmethod
    def get_size(self) -> int: ...

    @abstractmethod
    def show(self, indent: int = 0) -> None: ...

# Leaf
class File(FileSystemItem):
    def __init__(self, name: str, size: int):
        super().__init__(name)
        self._size = size

    def get_size(self) -> int:
        return self._size

    def show(self, indent: int = 0) -> None:
        print(" " * indent + f"📄 {self.name} ({self._size}B)")

# Composite
class Directory(FileSystemItem):
    def __init__(self, name: str):
        super().__init__(name)
        self._children: list[FileSystemItem] = []

    def add(self, item: FileSystemItem) -> None:
        self._children.append(item)

    def get_size(self) -> int:
        return sum(child.get_size() for child in self._children)

    def show(self, indent: int = 0) -> None:
        print(" " * indent + f"📁 {self.name}/")
        for child in self._children:
            child.show(indent + 2)

# 使用例
root = Directory("root")
src = Directory("src")
src.add(File("main.py", 200))
src.add(File("utils.py", 150))
docs = Directory("docs")
docs.add(File("README.md", 50))
root.add(src)
root.add(docs)
root.add(File(".gitignore", 30))

root.show()
print(f"Total: {root.get_size()}B")
```

## 使用場面

- ファイルシステム・メニュー・組織図などのツリー構造を扱うとき
- UI コンポーネントの階層（コンテナ内にウィジェットが入れ子になる構造）
- 計算式のAST（抽象構文木）表現

## 参考文献

- Erich Gamma, et al., *Design Patterns: Elements of Reusable Object-Oriented Software*, Addison-Wesley, 1994

<AffiliateBanner site="software_navi" />
