import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 静的型付けと動的型付け

## 静的型付けと動的型付けとは

> 静的型付けとは型チェックをコンパイル時に行う方式であり、動的型付けとは型チェックを実行時に行う方式である。この違いはプログラムの安全性・柔軟性・開発生産性に大きな影響を与える。

型システムの目的は「プログラムが正しい種類のデータを正しい方法で操作しているか」を保証することにある。静的型付け言語（C・Java・Rust・Haskell・TypeScriptなど）ではコンパイル時に型エラーを検出できるため、実行前にバグを発見できる。一方、動的型付け言語（Python・JavaScript・Rubyなど）では型を明示せずに柔軟に書けるため、プロトタイプ開発や小規模スクリプトで素早く試行錯誤できる。

「強い型付け（Strong Typing）」と「弱い型付け（Weak Typing）」も重要な軸である。強い型付けでは暗黙の型変換を制限する（PythonやHaskell）。弱い型付けでは自動キャストが多く行われる（JavaScript・C）。この2軸（静的/動的、強い/弱い）は独立しており、組み合わせにより各言語の特性が決まる。

## 型付け方式の比較

| 比較軸 | 静的型付け | 動的型付け |
|--------|-----------|-----------|
| 型チェックのタイミング | コンパイル時 | 実行時 |
| 型宣言 | 必要（型推論で省略可） | 不要 |
| バグ検出のタイミング | 早い（コンパイル時） | 遅い（実行時） |
| 実行速度 | 一般に速い | 一般に遅い |
| 柔軟性・記述の簡潔さ | 低め | 高め |
| 代表言語 | Java, Rust, Haskell, TypeScript | Python, JavaScript, Ruby |

```python
# Pythonは動的型付け: 型エラーは実行時に発生
def add(x, y):
    return x + y

print(add(1, 2))       # 3
print(add("a", "b"))   # "ab" (型が異なっても実行できる)

# 型ヒント（静的型付けに近い安全性をオプションで追加）
def add_typed(x: int, y: int) -> int:
    return x + y

# add_typed("a", "b") は実行はできるが mypy でエラーになる

# 実行時型チェック
value = "hello"
print(type(value))       # <class 'str'>
print(isinstance(value, str))  # True
```

```typescript
// TypeScriptは静的型付け: コンパイル時にエラーを検出
function add(x: number, y: number): number {
    return x + y;
}

add(1, 2);        // OK
// add("a", "b"); // コンパイルエラー: 型 'string' は 'number' に割り当てられない

// 型安全な Union 型
type Result = { success: true; value: number } | { success: false; error: string };

function divide(x: number, y: number): Result {
    if (y === 0) return { success: false, error: "Division by zero" };
    return { success: true, value: x / y };
}

const r = divide(10, 2);
if (r.success) {
    console.log(r.value);  // 型ガードで value が安全にアクセスできる
}
```

```rust
// Rustは静的型付け + 型推論
fn main() {
    let x = 5;       // 型推論: i32
    let y = 3.14;    // 型推論: f64

    // コンパイル時エラー:
    // let z: i32 = "hello"; // expected i32, found &str

    // 明示的な型変換が必要
    let sum = x as f64 + y;
    println!("{}", sum);  // 8.14
}
```

## 使用場面

- 大規模チーム開発では静的型付けにより型の契約が明確になり、コードナビゲーション・リファクタリングが容易になる
- 動的型付けはスクリプト・プロトタイプ・DSLで素早く書きたい場合に有利
- TypeScriptのような「段階的型付け（Gradual Typing）」を使い、既存のJSコードに徐々に型を導入する場合
- 型ヒント（Python mypy）でCI上で静的型チェックを導入しつつ、動的な柔軟性を保つ場合

## 参考文献

- Pierce, B. C. (2002). *Types and Programming Languages*. MIT Press.
- [TypeScript 公式ドキュメント](https://www.typescriptlang.org/docs/)
- [mypy 公式ドキュメント](https://mypy.readthedocs.io/)

<AffiliateBanner site="language_navi" />
