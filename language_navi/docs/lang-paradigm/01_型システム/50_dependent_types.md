import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 依存型入門

## 依存型とは

> 依存型（Dependent Types）とは、型が値に依存できる型システムであり、「長さ5のベクタ」や「正の整数」のようにプログラムの性質を型として表現し、コンパイル時に証明できる仕組みである。

通常の型システムでは型と値は厳密に区別される。依存型ではこの境界が消え、型が値を参照できるようになる。たとえば `Vec n a`（長さ `n` のベクタ）では `n` は型の引数でありながら自然数の値である。これにより「空リストへのheadは型エラー」「行列の次元が一致しないgemmは型エラー」のような静的保証が実現できる。

依存型の代表言語はAgda・Idris・Coqであり、定理証明器としても機能する。実用的な依存型を持つ言語としてはIdris2が有名で、ゲームや組み込みシステムのプログラミングに使われつつある。TypeScriptの Template Literal Types や Rustの `const generics` も、依存型の制限された形とみなせる。

## 依存型の概念

| 概念 | 説明 | 例 |
|------|------|----|
| 依存関数型 (Π型) | 戻り値の型が引数の値に依存 | `(n: Nat) → Vec n a` |
| 依存対型 (Σ型) | 第二成分の型が第一成分の値に依存 | `(n: Nat, Vec n a)` |
| 命題としての型 | 型を論理命題として扱う (Curry-Howard対応) | `a = b` の型は `a` と `b` の等価性の証明 |

```idris
-- Idris2での依存型の例

-- 長さを型パラメータに持つベクタ
data Vect : Nat -> Type -> Type where
    Nil  : Vect 0 a
    (::) : a -> Vect n a -> Vect (S n) a

-- head は空でないベクタにしか定義できない（型レベルで保証）
head : Vect (S n) a -> a
head (x :: _) = x
-- 空ベクタでheadを呼ぶとコンパイルエラー!

-- zip は同じ長さのベクタにしか定義できない
zipWith : (a -> b -> c) -> Vect n a -> Vect n b -> Vect n c
zipWith f Nil Nil = Nil
zipWith f (x :: xs) (y :: ys) = f x y :: zipWith f xs ys
-- 異なる長さのベクタをzipすると型エラー

-- リテラルな型での利用
example : Vect 3 Int
example = [1, 2, 3]
```

```rust
// RustのConst Generics（依存型の制限版）
fn dot_product<const N: usize>(a: [f64; N], b: [f64; N]) -> f64 {
    a.iter().zip(b.iter()).map(|(x, y)| x * y).sum()
}

fn main() {
    let a = [1.0, 2.0, 3.0];
    let b = [4.0, 5.0, 6.0];
    println!("{}", dot_product(a, b));  // 32.0

    // 長さが違うとコンパイルエラー
    // dot_product([1.0, 2.0], [1.0, 2.0, 3.0]); // エラー: N が一致しない
}

// 行列演算での型安全性
struct Matrix<const R: usize, const C: usize> {
    data: [[f64; C]; R],
}

impl<const R: usize, const C: usize, const K: usize>
    std::ops::Mul<Matrix<C, K>> for Matrix<R, C>
{
    type Output = Matrix<R, K>;

    fn mul(self, rhs: Matrix<C, K>) -> Matrix<R, K> {
        todo!()  // 行列積の実装
    }
}
// M(R×C) * M(C×K) = M(R×K) の次元チェックがコンパイル時に保証される
```

```typescript
// TypeScriptのテンプレートリテラル型（依存型の制限版）
type EventName<T extends string> = `on${Capitalize<T>}`;

type ClickHandler = EventName<"click">;  // "onClick"
type ChangeHandler = EventName<"change">; // "onChange"

// タプルの長さを型レベルで表現
type Length<T extends any[]> = T["length"];
type Three = Length<[1, 2, 3]>;  // 3

// 条件型でリテラル型の演算
type IsEmpty<T extends any[]> = T extends [] ? true : false;
type Yes = IsEmpty<[]>;    // true
type No  = IsEmpty<[1]>;   // false
```

## 使用場面

- 定理証明器（Coq・Agda）でプログラムの正確性を数学的に証明する場合
- Rustの `const generics` で行列・バッファなどのサイズをコンパイル時に保証する場合
- Idrisで組み込みシステムやプロトコル実装の安全性を型で保証する場合
- TypeScriptの高度な型機能（テンプレートリテラル・条件型）で型レベルプログラミングを行う場合

## 参考文献

- Brady, E. (2013). "Idris, a General Purpose Dependently Typed Programming Language." *J. Funct. Program.* 23(5).
- Bertot, Y. & Castéran, P. (2004). *Interactive Theorem Proving and Program Development: Coq'Art*. Springer.
- [Idris2 公式ドキュメント](https://idris2.readthedocs.io/)

<AffiliateBanner site="language_navi" />
