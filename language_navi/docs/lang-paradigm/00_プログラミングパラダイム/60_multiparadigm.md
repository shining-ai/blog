import AffiliateBanner from '@site/src/components/AffiliateBanner';

# マルチパラダイム言語の比較

## マルチパラダイム言語とは

> マルチパラダイム言語とは、命令型・オブジェクト指向・関数型など複数のプログラミングパラダイムを単一の言語仕様内でサポートし、問題に応じて適切なスタイルを選択できる言語である。

現代の主流プログラミング言語の多くはマルチパラダイムを採用している。Python・JavaScript・Scala・Kotlin・Rust・Swiftなどがその代表例である。純粋にひとつのパラダイムに限定した言語（純粋関数型のHaskell、論理型のPrologなど）と比べ、マルチパラダイム言語は実用上の柔軟性が高く、幅広い問題領域に対応できる。

マルチパラダイムのメリットは「問題に合ったツールを選べる」点にある。データ変換には関数型スタイルを、GUIコンポーネントにはOOP、アルゴリズムの細部には命令型と使い分けることができる。一方で、チームや個人によってスタイルが統一されないと可読性が下がるというトレードオフもある。言語設計の観点では、どのパラダイムをどれだけ深くサポートするかが言語ごとに異なる。

## 主要マルチパラダイム言語の比較

| 言語 | 命令型 | OOP | 関数型 | 並行性モデル | 型システム |
|------|--------|-----|--------|-------------|-----------|
| Python | ○ | ○ | △ | スレッド / async-await | 動的（型ヒントあり） |
| JavaScript | ○ | ○（プロトタイプ）| ○ | イベントループ / async-await | 動的 |
| TypeScript | ○ | ○ | ○ | イベントループ / async-await | 静的（段階的）|
| Scala | ○ | ○ | ○（Cats/ZIO）| アクター（Akka）/ Future | 静的（強力）|
| Kotlin | ○ | ○ | ○ | コルーチン | 静的（Null安全）|
| Rust | ○ | ○（トレイト）| ○ | async/await, スレッド | 静的（所有権）|
| Swift | ○ | ○ | ○ | async/await, アクター | 静的（Null安全）|

```python
# Pythonでのマルチパラダイム活用例

# 命令型スタイル: アルゴリズムを手順で記述
def bubble_sort(lst: list) -> list:
    lst = lst[:]
    n = len(lst)
    for i in range(n):
        for j in range(n - i - 1):
            if lst[j] > lst[j + 1]:
                lst[j], lst[j + 1] = lst[j + 1], lst[j]
    return lst

# OOPスタイル: データと振る舞いをまとめる
class BankAccount:
    def __init__(self, owner: str, balance: float = 0):
        self._owner = owner
        self._balance = balance

    def deposit(self, amount: float) -> 'BankAccount':
        return BankAccount(self._owner, self._balance + amount)

    @property
    def balance(self) -> float:
        return self._balance

# 関数型スタイル: データパイプライン
from functools import reduce

transactions = [100, -20, 50, -30, 200]
final_balance = reduce(lambda acc, x: acc + x, transactions, 1000)
print(final_balance)  # 1300
```

```scala
// Scalaでのマルチパラダイム: OOP + 関数型
case class User(name: String, age: Int)  // イミュータブルなデータクラス

val users = List(
    User("Alice", 25),
    User("Bob", 17),
    User("Charlie", 30),
    User("Dave", 15)
)

// 関数型スタイルでフィルタ・変換・集約
val adultNames: List[String] =
    users
        .filter(_.age >= 18)           // filterで絞り込み
        .map(_.name.toUpperCase)       // mapで変換
        .sorted                        // ソート

println(adultNames)  // List(ALICE, CHARLIE)

// for内包表記（モナド的なbind）
val pairs = for {
    x <- List(1, 2, 3)
    y <- List("a", "b")
} yield (x, y)
// List((1,a),(1,b),(2,a),(2,b),(3,a),(3,b))
```

```rust
// Rustでのマルチパラダイム: 命令型 + 関数型 + トレイト(OOP的)
#[derive(Debug)]
struct Point { x: f64, y: f64 }

// トレイト: OOP的なインターフェース
trait Distance {
    fn distance_from_origin(&self) -> f64;
}

impl Distance for Point {
    fn distance_from_origin(&self) -> f64 {
        (self.x.powi(2) + self.y.powi(2)).sqrt()
    }
}

fn main() {
    let points = vec![
        Point { x: 3.0, y: 4.0 },
        Point { x: 1.0, y: 1.0 },
    ];

    // 関数型スタイルでIteratorを活用
    let max_dist = points.iter()
        .map(|p| p.distance_from_origin())
        .fold(0.0_f64, f64::max);

    println!("{:.2}", max_dist);  // 5.00
}
```

## 使用場面

- Webアプリケーションで、ルーティングを関数型、ドメインモデルをOOP、データ変換を宣言型で記述する場合
- データサイエンスでPandasの操作（宣言型）とカスタム集計ロジック（命令型）を混在させる場合
- ゲームエンジンでEntityをOOP管理し、ゲームループを命令型で記述する場合
- スクリプトで素早く処理を書く際に適宜スタイルを切り替える場合

## 参考文献

- Van Roy, P. & Haridi, S. (2004). *Concepts, Techniques, and Models of Computer Programming*. MIT Press.
- [Kotlin 公式 — マルチパラダイムの概要](https://kotlinlang.org/docs/multiplatform.html)
- [Rust Book](https://doc.rust-lang.org/book/)

<AffiliateBanner site="language_navi" />
