import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 関数型プログラミングの核心（純粋関数・副作用）

## 関数型プログラミングとは

> 関数型プログラミングとは、数学的な関数の概念を基盤とし、状態変更や副作用を排除して、関数の合成によってプログラムを構築するパラダイムである。

関数型プログラミング（FP）のルーツはλ計算（1930年代、Alonzo Church）にある。Lisp・ML・Haskellを経て、現代ではScala・Rust・Kotlin・JavaScriptなど主流言語にも関数型の概念が取り込まれている。FPの核心にあるのは「純粋関数」と「副作用の制御」である。

純粋関数とは、同じ入力に対して常に同じ出力を返し、外部の状態を変更しない関数のことである。参照透過性と呼ばれるこの性質があると、関数を単独でテストでき、並列実行が安全になり、プログラムの挙動を予測しやすくなる。副作用（ファイルI/O・グローバル変数の変更・乱数生成など）は必要悪として存在するが、FPではその範囲を明示的に限定する手法をとる。

## 純粋関数 vs 不純な関数

| 比較軸 | 純粋関数 | 不純な関数（副作用あり） |
|--------|----------|-------------------------|
| 出力の決定性 | 同じ入力 → 常に同じ出力 | 外部状態により出力が変わる |
| 外部への影響 | なし | グローバル変数変更・I/Oなど |
| テストのしやすさ | 容易（モック不要） | 難しい（環境に依存） |
| 並列実行の安全性 | 安全 | 競合状態のリスクあり |
| デバッグのしやすさ | 容易 | 難しい |

```python
# 不純な関数（副作用あり）
total = 0

def add_to_total(x):
    global total
    total += x  # グローバル変数を変更 = 副作用
    return total

print(add_to_total(5))  # 5
print(add_to_total(5))  # 10 (同じ入力でも結果が変わる!)


# 純粋関数（副作用なし）
def add(x: int, y: int) -> int:
    return x + y  # 外部状態に依存しない、変更もしない

print(add(3, 5))  # 8 (常に8)
print(add(3, 5))  # 8 (同じ入力 → 同じ出力)


# イミュータブルなデータ変換
def update_user_name(user: dict, new_name: str) -> dict:
    # 元のdictを変更せず、新しいdictを返す
    return {**user, "name": new_name}

original = {"name": "Alice", "age": 30}
updated = update_user_name(original, "Bob")
print(original)  # {"name": "Alice", "age": 30} (変更なし)
print(updated)   # {"name": "Bob", "age": 30}
```

```haskell
-- Haskell: 純粋関数が言語仕様で保証される
-- IO型を使わない関数は必ず純粋

add :: Int -> Int -> Int
add x y = x + y

-- 副作用はIOモナドに隔離される
greet :: String -> IO ()
greet name = putStrLn ("Hello, " ++ name)
-- putStrLnはIOモナド内にあり、副作用の範囲が型に現れる
```

```rust
// Rustでの不変性デフォルト
fn double(x: i32) -> i32 {
    x * 2  // 純粋: 同じxに対して常に同じ結果
}

fn main() {
    let x = 5;
    // x = 10; // コンパイルエラー: 変数はデフォルトで不変
    let y = double(x);
    println!("{}", y); // 10
}
```

## 使用場面

- データパイプライン処理でデータ変換を副作用なく連鎖させる場合
- 並列・並行処理で共有状態なしに安全に実行する場合
- ユニットテストを書きやすくするためにビジネスロジックを純粋関数として切り出す場合
- Reactのようなフロントエンドフレームワークで状態管理を予測可能に保つ場合

## 参考文献

- Hughes, J. (1989). "Why Functional Programming Matters." *The Computer Journal*, 32(2), 98–107.
- [Haskell 公式ドキュメント](https://www.haskell.org/documentation/)
- [Python functools モジュール](https://docs.python.org/ja/3/library/functools.html)

<AffiliateBanner site="language_navi" />
