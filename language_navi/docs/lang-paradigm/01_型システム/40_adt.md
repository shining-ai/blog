import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 代数的データ型とパターンマッチング

## 代数的データ型とは

> 代数的データ型（ADT: Algebraic Data Type）とは、既存の型を「積（product）」または「和（sum）」によって組み合わせて新たな型を構成する仕組みであり、データの構造を型として厳密に表現することができる。

ADTには二種類ある。「積型（Product Type）」はフィールドを「かつ」で組み合わせたもので、構造体やレコードに相当する（例: `Person = String × Int`）。「和型（Sum Type）」は取りうる形を「または」で列挙したもので、タグ付き共用体や列挙型の拡張に相当する（例: `Shape = Circle(Float) | Rectangle(Float, Float)`）。

和型はOOPの「継承の代替」として非常に強力である。`null` チェックの代わりに `Option<T> = Some(T) | None`、エラー処理の代わりに `Result<T, E> = Ok(T) | Err(E)` を使うことで、「値がないケース」や「エラーのケース」を型レベルで強制的に処理させることができる。パターンマッチングはADTの各ケースを網羅的に処理するための構文であり、コンパイラが「処理漏れ」を検出できる。

## 積型と和型の比較

| 種類 | 意味 | 構成要素 | 例 |
|------|------|----------|-----|
| 積型 | フィールドを「かつ」で結合 | タプル・レコード・構造体 | `Point(x: Int, y: Int)` |
| 和型 | 取りうる形を「または」で列挙 | 列挙型の拡張・バリアント | `Option = Some(T) | None` |
| 再帰型 | 自身を含む型 | 木・リスト | `Tree = Leaf | Node(Tree, T, Tree)` |

```haskell
-- Haskellでの代数的データ型とパターンマッチング

-- 和型（Sum Type）: Shapeはいずれか一つの形
data Shape
    = Circle Double          -- 半径
    | Rectangle Double Double  -- 幅と高さ
    | Triangle Double Double Double  -- 三辺の長さ

-- パターンマッチングで各ケースを網羅的に処理
area :: Shape -> Double
area (Circle r)       = pi * r * r
area (Rectangle w h)  = w * h
area (Triangle a b c) = -- ヘロンの公式
    let s = (a + b + c) / 2
    in sqrt (s * (s-a) * (s-b) * (s-c))

-- 再帰的なADT: 二分木
data Tree a = Leaf | Node (Tree a) a (Tree a)

insert :: Ord a => a -> Tree a -> Tree a
insert x Leaf = Node Leaf x Leaf
insert x (Node l v r)
    | x < v     = Node (insert x l) v r
    | x > v     = Node l v (insert x r)
    | otherwise = Node l v r

-- Option型（Maybeの別名）
data Maybe a = Nothing | Just a

safeHead :: [a] -> Maybe a
safeHead []    = Nothing
safeHead (x:_) = Just x
```

```rust
// RustのEnum（代数的データ型）
#[derive(Debug)]
enum Shape {
    Circle(f64),
    Rectangle(f64, f64),
    Triangle(f64, f64, f64),
}

impl Shape {
    fn area(&self) -> f64 {
        match self {
            Shape::Circle(r) => std::f64::consts::PI * r * r,
            Shape::Rectangle(w, h) => w * h,
            Shape::Triangle(a, b, c) => {
                let s = (a + b + c) / 2.0;
                (s * (s - a) * (s - b) * (s - c)).sqrt()
            }
        }
    }
}

// 標準ライブラリのOption・Result
fn safe_divide(x: f64, y: f64) -> Option<f64> {
    if y == 0.0 { None } else { Some(x / y) }
}

fn main() {
    let shapes = vec![
        Shape::Circle(5.0),
        Shape::Rectangle(4.0, 6.0),
    ];

    for s in &shapes {
        println!("{:?}: area = {:.2}", s, s.area());
    }

    // パターンマッチングによるOption処理
    match safe_divide(10.0, 2.0) {
        Some(result) => println!("Result: {}", result),
        None => println!("Division by zero"),
    }
}
```

```typescript
// TypeScriptでの判別共用体（ADTに相当）
type Shape =
    | { kind: "circle"; radius: number }
    | { kind: "rectangle"; width: number; height: number }
    | { kind: "triangle"; a: number; b: number; c: number };

function area(shape: Shape): number {
    switch (shape.kind) {
        case "circle":
            return Math.PI * shape.radius ** 2;
        case "rectangle":
            return shape.width * shape.height;
        case "triangle": {
            const { a, b, c } = shape;
            const s = (a + b + c) / 2;
            return Math.sqrt(s * (s - a) * (s - b) * (s - c));
        }
    }
    // 全ケースを処理しないとコンパイルエラー（never型で検出）
}
```

## 使用場面

- エラー処理で `Result<T, E>` を使い、例外ではなく値としてエラーを型安全に扱う場合
- AST（抽象構文木）を表現する際に各ノード種別をADTで定義する場合
- 状態機械（FSM）の状態をADTで表現し、遷移を網羅的に処理する場合
- ドメインモデルで「無効な状態を表現不可能にする（Making Illegal States Unrepresentable）」設計をする場合

## 参考文献

- Milner, R. et al. (1997). *The Definition of Standard ML*. MIT Press.
- [Rust Book — Enums and Pattern Matching](https://doc.rust-lang.org/book/ch06-00-enums.html)
- [Haskell Wiki — Algebraic data type](https://wiki.haskell.org/Algebraic_data_type)

<AffiliateBanner site="language_navi" />
