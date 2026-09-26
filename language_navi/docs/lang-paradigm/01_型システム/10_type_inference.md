import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 型推論（Hindley-Milner）

## 型推論とは

> 型推論とは、プログラマが型を明示的に書かなくても、コンパイラが式の構造から型を自動的に導出する仕組みである。Hindley-Milner（HM）アルゴリズムはその代表的な手法であり、MLやHaskellで採用されている。

Hindley-Milner型推論は1958年にHindleyが発見し、1978年にMilnerが独立して再発見・定式化した。このアルゴリズムの優れた点は「多相的な型（ジェネリクス）を自動推論できる」ことと「推論は常に停止し、最も一般的な型（主要型）を求められる」ことにある。これにより、型を一切書かずに完全に型安全なプログラムを書ける。

型推論の仕組みは「型変数と単一化（Unification）」によって実現される。コンパイラは式の各部分に型変数（α, β, ...）を割り当て、制約（αはintでなければならない等）を集め、単一化によって矛盾なく解を求める。モダン言語（Rust・Kotlin・Swift・TypeScript）でも限定的な形でHMライクな型推論が使われている。

## 型推論の段階

| ステップ | 内容 | 例 |
|---------|------|-----|
| 1. 型変数の割り当て | 各式に型変数を付ける | `f : α`, `x : β` |
| 2. 制約の生成 | 使われ方から型制約を集める | `α = β → γ` |
| 3. 単一化 | 制約を矛盾なく解く | `α = Int → Int` |
| 4. 主要型の決定 | 最も一般的な型を返す | `∀a. a → a` |

```python
# Pythonは型推論（mypyによる）
def identity(x):    # mypyは x の型をコンテキストから推論
    return x

reveal_type(identity(42))    # int
reveal_type(identity("hi"))  # str

# 明示的な型注釈なしでも型安全にできる
xs = [1, 2, 3]
y = xs[0]  # yはintと推論される
```

```haskell
-- HaskellのHindley-Milner型推論
-- 型注釈なしでも完全に型推論される

identity x = x
-- GHCiで :t identity と打つと
-- identity :: a -> a (多相型が自動推論される)

add x y = x + y
-- add :: Num a => a -> a -> a

-- 明示的な型注釈を書いても同じ意味
identity' :: a -> a
identity' x = x

-- リストの長さ
myLength [] = 0
myLength (_:xs) = 1 + myLength xs
-- myLength :: [a] -> Int  (自動推論)

-- let多相: let束縛内で多相型が使える
main :: IO ()
main = do
    let f = identity   -- f :: a -> a
    print (f 42)       -- 42 (Int)
    print (f "hello")  -- "hello" (String)
```

```rust
// Rustの型推論（HMライク）
fn main() {
    let x = 5;            // i32 と推論
    let y = 3.14;         // f64 と推論

    // collect() は文脈から型が推論される
    let v: Vec<_> = (1..=5).map(|x| x * 2).collect();
    // Vec<i32> と推論される

    // クロージャの型も推論
    let add = |a, b| a + b;  // |i32, i32| -> i32
    println!("{}", add(1, 2));  // 3

    // 複雑な型でも推論
    let pairs: Vec<_> = v.iter().zip(v.iter().rev()).collect();
    // Vec<(&i32, &i32)> と推論
}
```

```typescript
// TypeScriptの型推論
const x = 42;          // number と推論
const s = "hello";     // string と推論

// 関数の戻り値型推論
function double(n: number) {
    return n * 2;  // 戻り値型は number と推論
}

// ジェネリクスの型引数推論
function identity<T>(x: T): T { return x; }
const n = identity(42);    // T = number と推論
const str = identity("hi"); // T = string と推論

// 条件分岐による絞り込み（型ガード）
function process(x: string | number) {
    if (typeof x === "string") {
        return x.toUpperCase();  // x は string と推論
    }
    return x * 2;               // x は number と推論
}
```

## 使用場面

- Haskell・Elmで型注釈をほぼ書かずに型安全なプログラムを書く場合
- RustでIteratorチェーンの型を明示せず、コンパイラに推論させる場合
- TypeScriptで変数の型を繰り返し書かずに、コンテキストから自動決定させる場合
- 型推論の限界に達した場合（TypeScriptの複雑な条件型など）に型注釈でヒントを与える場合

## 参考文献

- Hindley, J. R. (1969). "The Principal Type-Scheme of an Object in Combinatory Logic." *Transactions of the AMS*, 146.
- Milner, R. (1978). "A Theory of Type Polymorphism in Programming." *JCSS*, 17(3).
- [Haskell — Type System](https://wiki.haskell.org/Type)

<AffiliateBanner site="language_navi" />
