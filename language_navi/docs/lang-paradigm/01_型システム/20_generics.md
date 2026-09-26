import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ジェネリクス・パラメトリック多相

## ジェネリクスとは

> ジェネリクス（パラメトリック多相）とは、型をパラメータとして受け取ることで、異なる型に対して同一のアルゴリズムやデータ構造を安全に再利用できる仕組みである。

型の重複なくコードを汎用化するアプローチには「部分型多相（OOPの継承）」「アドホック多相（オーバーロード・型クラス）」「パラメトリック多相（ジェネリクス）」の三種がある。ジェネリクスはそのうちパラメトリック多相に分類され、型パラメータ `T` を受け取る関数やクラスを定義することで、`List<Int>` も `List<String>` も同じ `List<T>` の実装を使える。

Java（1.5以降）・C#・TypeScript・Kotlin・Rustなどが言語組み込みのジェネリクスを持つ。Haskellでは型クラスと組み合わせた「境界付きパラメトリック多相」が強力に機能する。Rustではモノモーフィゼーション（コンパイル時に各型ごとのコードを生成）によりランタイムコストなしにジェネリクスを実現している。

## ジェネリクスの実現方式

| 言語 | 実現方式 | 特徴 |
|------|----------|------|
| Java | 型消去（Type Erasure） | 実行時は `Object` 相当に変換 |
| C# | リファイドジェネリクス | 実行時も型情報を保持 |
| Rust | モノモーフィゼーション | コンパイル時に型ごとのコードを生成 |
| Haskell | 型クラス + パラメトリック多相 | 辞書渡しによる実装 |
| TypeScript | 構造的部分型 + ジェネリクス | コンパイル後はJSに消える |

```typescript
// TypeScriptのジェネリクス

// 型パラメータ T を持つ関数
function identity<T>(x: T): T {
    return x;
}

const n = identity<number>(42);   // T = number
const s = identity<string>("hi"); // T = string
const inferred = identity(true);  // T = boolean (型推論)

// ジェネリックなデータ構造
class Stack<T> {
    private items: T[] = [];

    push(item: T): void {
        this.items.push(item);
    }

    pop(): T | undefined {
        return this.items.pop();
    }

    peek(): T | undefined {
        return this.items[this.items.length - 1];
    }
}

const numStack = new Stack<number>();
numStack.push(1);
numStack.push(2);
console.log(numStack.pop());  // 2

// 型制約（extends）
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
    return obj[key];
}

const user = { name: "Alice", age: 30 };
const name = getProperty(user, "name");  // string
// getProperty(user, "email"); // コンパイルエラー
```

```python
# Pythonのジェネリクス (typing モジュール)
from typing import TypeVar, Generic, List

T = TypeVar('T')

class Stack(Generic[T]):
    def __init__(self) -> None:
        self._items: List[T] = []

    def push(self, item: T) -> None:
        self._items.append(item)

    def pop(self) -> T:
        if not self._items:
            raise IndexError("Stack is empty")
        return self._items.pop()

# 複数の型パラメータ
K = TypeVar('K')
V = TypeVar('V')

def zip_to_dict(keys: List[K], values: List[V]) -> dict[K, V]:
    return dict(zip(keys, values))

d = zip_to_dict(["a", "b"], [1, 2])  # dict[str, int]
```

```rust
// Rustのジェネリクス（モノモーフィゼーション）
struct Pair<T> {
    first: T,
    second: T,
}

impl<T: std::fmt::Display + PartialOrd> Pair<T> {
    fn larger(&self) -> &T {
        if self.first > self.second {
            &self.first
        } else {
            &self.second
        }
    }
}

// 境界付きジェネリクス (T: Display + PartialOrd)
fn max<T: PartialOrd>(a: T, b: T) -> T {
    if a > b { a } else { b }
}

fn main() {
    println!("{}", max(3, 5));       // 5 (i32)
    println!("{}", max(3.0, 2.5));   // 3 (f64)
    println!("{}", max("z", "a"));   // z (&str)
}
```

## 使用場面

- コレクション（List・Stack・Queue・Map）を型安全に実装する場合
- `Result<T, E>` や `Option<T>` などの汎用ラッパー型を定義する場合
- APIクライアントで `fetch<T>(): Promise<T>` のようにレスポンス型を呼び出し側で指定する場合
- アルゴリズム（ソート・探索）を型に依存しない汎用実装として提供する場合

## 参考文献

- Wadler, P. & Blott, S. (1989). "How to Make Ad-Hoc Polymorphism Less Ad Hoc." *POPL '89*.
- [Rust Book — Generic Types](https://doc.rust-lang.org/book/ch10-00-generics.html)
- [TypeScript Handbook — Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)

<AffiliateBanner site="language_navi" />
