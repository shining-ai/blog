import AffiliateBanner from '@site/src/components/AffiliateBanner';

# モナドの直感的理解

## モナドとは

> モナドとは、値を文脈（コンテキスト）で包んだ型であり、その文脈を維持しながら値を変換する操作（bind）を定義した型クラスである。副作用・失敗・非決定性などの計算パターンを純粋関数型の枠組みで扱うための設計パターンと見ることができる。

モナドは圏論（Category Theory）に由来する数学的概念だが、プログラマーとしては「計算の文脈をつなぎ合わせる仕組み」として理解するのが実用的である。Haskellではモナドが言語の中核に位置し、IOモナドによって副作用を型で表現する。JavaScriptのPromise、RustのResult型、ScalaのOptionも「モナド的な構造」を持つ。

モナドは三つの要素で構成される。①値を文脈に包む `return`（または `pure`）、②文脈付きの値を関数に渡してつなぐ `bind`（`>>=`、またはflatMap）、そして③モナド則（左単位元・右単位元・結合律）を満たすこと。`do` 記法や `for` 内包表記はbindを読みやすく書くための構文糖衣である。

## 代表的なモナドの比較

| モナド | 文脈の意味 | 主な用途 |
|--------|-----------|----------|
| `Maybe` / `Option` | 値がある or ない | Null安全な処理 |
| `Either` / `Result` | 成功 or 失敗（エラー情報付き） | エラーハンドリング |
| `IO` | 副作用を伴う計算 | ファイルI/O・入出力 |
| `List` | 複数の可能性 | 非決定的計算 |
| `State` | 状態の受け渡し | 状態管理 |
| `Promise` / `Future` | 非同期な計算 | 非同期処理 |

```python
# PythonでMaybeモナドを模倣する
from typing import TypeVar, Generic, Callable, Optional

T = TypeVar('T')
U = TypeVar('U')

class Maybe(Generic[T]):
    def __init__(self, value: Optional[T]):
        self._value = value

    @staticmethod
    def just(value: T) -> 'Maybe[T]':
        return Maybe(value)

    @staticmethod
    def nothing() -> 'Maybe':
        return Maybe(None)

    def bind(self, f: Callable[[T], 'Maybe[U]']) -> 'Maybe[U]':
        """bindが文脈（Noneかどうか）を維持しながら変換する"""
        if self._value is None:
            return Maybe.nothing()
        return f(self._value)

    def __repr__(self):
        return f"Just({self._value})" if self._value is not None else "Nothing"


def safe_divide(x: int, y: int) -> Maybe[float]:
    if y == 0:
        return Maybe.nothing()
    return Maybe.just(x / y)

def safe_sqrt(x: float) -> Maybe[float]:
    import math
    if x < 0:
        return Maybe.nothing()
    return Maybe.just(math.sqrt(x))

# チェーン: Noneが途中で発生しても安全に伝播する
result = Maybe.just(16.0).bind(lambda x: safe_divide(x, 4)).bind(safe_sqrt)
print(result)   # Just(1.0)

result2 = Maybe.just(16.0).bind(lambda x: safe_divide(x, 0)).bind(safe_sqrt)
print(result2)  # Nothing (ゼロ除算でNothingが伝播)
```

```haskell
-- HaskellのMaybeモナド
safeDiv :: Int -> Int -> Maybe Int
safeDiv _ 0 = Nothing
safeDiv x y = Just (x `div` y)

safeSqrt :: Double -> Maybe Double
safeSqrt x
    | x < 0    = Nothing
    | otherwise = Just (sqrt x)

-- do記法でbindを読みやすく書く
compute :: Int -> Int -> Maybe Double
compute x y = do
    divided <- safeDiv x y          -- >>= の糖衣構文
    safeSqrt (fromIntegral divided)

-- compute 16 4  -> Just 2.0
-- compute 16 0  -> Nothing
```

```typescript
// TypeScriptでPromise（非同期モナド）
async function fetchUser(id: number): Promise<{ name: string }> {
    const res = await fetch(`/api/users/${id}`);
    if (!res.ok) throw new Error("Not found");
    return res.json();
}

// bind相当: .then()でチェーンできる
fetchUser(1)
    .then(user => user.name.toUpperCase())
    .then(name => console.log(name))
    .catch(err => console.error(err));
```

## 使用場面

- `Option`/`Maybe`型でnullポインタ例外を型レベルで防ぎたい場合
- `Result`/`Either`型でエラー処理を例外ではなく値として扱いたい場合
- HaskellでIOモナドを使って副作用を型で明示する場合
- 非同期処理をPromise/Futureでチェーンして書く場合

## 参考文献

- Wadler, P. (1992). "The Essence of Functional Programming." *POPL '92*.
- [Haskell Wiki — Monad](https://wiki.haskell.org/Monad)
- [Rust — std::result::Result](https://doc.rust-lang.org/std/result/)

<AffiliateBanner site="language_navi" />
