import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 高階関数・map・filter・fold

## 高階関数とは

> 高階関数とは、関数を引数として受け取るか、関数を戻り値として返す関数のことであり、関数型プログラミングにおいてコードの抽象化と再利用を実現する中心的な仕組みである。

高階関数は「関数を値として扱う」という考え方に基づいており、λ計算に起源を持つ。Haskell・ML・Lispはもちろん、Python・JavaScript・Rust・Kotlinなどのモダン言語でも高階関数はファーストクラスの機能として提供されている。

特に重要な高階関数が `map`・`filter`・`fold`（`reduce`）の三つである。これらはコレクション（リスト・配列など）の変換パターンを抽象化したものであり、明示的なループを書かずに宣言的なデータ処理を記述できる。また、関数を返す高階関数は「クロージャ」や「カリー化」と組み合わせることで、柔軟な関数合成を可能にする。

## map・filter・foldの比較

| 関数 | 動作 | 入出力の型（リストの場合） |
|------|------|--------------------------|
| `map(f, lst)` | 各要素に`f`を適用した新リストを返す | `[A]` → `[B]` |
| `filter(pred, lst)` | `pred`がTrueの要素だけ残したリストを返す | `[A]` → `[A]` |
| `fold/reduce(f, init, lst)` | 左から`f`で累積して単一値を返す | `[A]` → `B` |

```python
from functools import reduce

numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

# map: 各要素を2倍にする
doubled = list(map(lambda x: x * 2, numbers))
print(doubled)  # [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]

# filter: 偶数だけ残す
evens = list(filter(lambda x: x % 2 == 0, numbers))
print(evens)  # [2, 4, 6, 8, 10]

# fold(reduce): 合計を求める
total = reduce(lambda acc, x: acc + x, numbers, 0)
print(total)  # 55

# 関数を返す高階関数（カリー化の例）
def multiplier(factor: int):
    def multiply(x: int) -> int:
        return x * factor
    return multiply

triple = multiplier(3)
print(list(map(triple, [1, 2, 3, 4])))  # [3, 6, 9, 12]

# 関数合成
def compose(f, g):
    return lambda x: f(g(x))

add_one = lambda x: x + 1
double = lambda x: x * 2
add_one_then_double = compose(double, add_one)
print(add_one_then_double(3))  # (3+1)*2 = 8
```

```haskell
-- Haskellでの高階関数
numbers :: [Int]
numbers = [1..10]

-- map
doubled :: [Int]
doubled = map (*2) numbers  -- [2,4,6,8,10,12,14,16,18,20]

-- filter
evens :: [Int]
evens = filter even numbers  -- [2,4,6,8,10]

-- fold(foldl)
total :: Int
total = foldl (+) 0 numbers  -- 55

-- 関数合成演算子 (.)
addOneThenDouble :: Int -> Int
addOneThenDouble = (*2) . (+1)
-- addOneThenDouble 3 = 8
```

```typescript
// TypeScriptでの型付き高階関数
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const doubled = numbers.map(x => x * 2);
const evens = numbers.filter(x => x % 2 === 0);
const total = numbers.reduce((acc, x) => acc + x, 0);

// カリー化
const multiply = (factor: number) => (x: number): number => x * factor;
const triple = multiply(3);
console.log([1, 2, 3].map(triple)); // [3, 6, 9]
```

## 使用場面

- データ変換パイプラインで `map → filter → reduce` をチェーンして処理を記述する場合
- コールバック関数によってアルゴリズムの一部を差し替えるStrategy的な設計
- カリー化・部分適用で特定のパラメータを固定した関数を生成する場合
- JavaScriptのArray APIやRustのIteratorでコレクション処理を宣言的に書く場合

## 参考文献

- Bird, R. (1998). *Introduction to Functional Programming using Haskell*. Prentice Hall.
- [MDN — Array.prototype.map()](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/map)
- [Haskell — Data.List](https://hackage.haskell.org/package/base/docs/Data-List.html)

<AffiliateBanner site="language_navi" />
