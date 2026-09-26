import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Null安全とOption型

## Null安全とは

> Null安全（Null Safety）とは、`null`（または`nil`・`None`）参照によるランタイムエラー（NullPointerException等）をコンパイル時に型システムで防ぐ仕組みであり、`Option`型（または`Maybe`型）はその主要な実装パターンである。

C.A.R. Hoareは`null`参照の発明を「十億ドルの過ち」と述べた。`null`を特別扱いせずにあらゆる型に代入できる言語（Java・C#・JavaScript等の旧仕様）では、`null`チェックの漏れが実行時クラッシュの原因となり続けた。`Option<T>`型はこの問題を「値がある（`Some(T)`）」か「値がない（`None`）」かを型で区別することで解決する。

Kotlin・Swift・Rust・Haskell・ScalaはNull安全をネイティブに実装している。TypeScriptは `strictNullChecks` オプションで `null` と `undefined` を型として分離できる。Javaは `Optional<T>` クラスで後付け対応している。重要なのは「`null`かもしれない値を扱う場合はコンパイラが明示的な処理を強制する」点にある。

## Null安全の実装方式

| 言語 | 方式 | `null`かもしれない型 | チェック方法 |
|------|------|---------------------|-------------|
| Kotlin | 型レベルで `T?` を区別 | `String?` | `?.` / `!!` / `?:` / `let` |
| Swift | Optional型 `T?` | `String?` | `if let` / `guard let` / `??` |
| Rust | `Option<T>` enum | `Option<String>` | `match` / `if let` / `?` 演算子 |
| Haskell | `Maybe a` | `Maybe String` | `case` / `>>=` |
| TypeScript | `T \| null` | `string \| null` | 型ガード / `?.` / `??` |
| Java | `Optional<T>` | `Optional<String>` | `.isPresent()` / `.map()` |

```kotlin
// KotlinのNull安全
fun findUser(id: Int): String? {  // ?でnullableを明示
    return if (id == 1) "Alice" else null
}

fun main() {
    val name: String? = findUser(1)

    // nullでない場合のみ処理 (安全呼び出し演算子)
    println(name?.length)         // 5

    // null合体演算子: nullの場合はデフォルト値を使う
    val displayName = name ?: "Unknown"
    println(displayName)          // Alice

    // スコープ関数で安全に処理
    name?.let { n ->
        println("Found: $n")     // Found: Alice
    }

    val notFound: String? = findUser(99)
    println(notFound?.length)     // null (エラーにならない)
    // println(notFound!!)        // NullPointerException (強制解除は危険)
}
```

```rust
// RustのOption<T>
fn find_user(id: u32) -> Option<String> {
    if id == 1 { Some("Alice".to_string()) } else { None }
}

fn main() {
    // match でパターンマッチング
    match find_user(1) {
        Some(name) => println!("Found: {}", name),
        None => println!("Not found"),
    }

    // ? 演算子: Noneなら即座に返す（エラー伝播）
    fn get_length(id: u32) -> Option<usize> {
        let name = find_user(id)?;  // Noneならこの関数からNoneを返す
        Some(name.len())
    }

    // map, unwrap_or でチェーン
    let length = find_user(1)
        .map(|n| n.len())
        .unwrap_or(0);
    println!("Length: {}", length);  // 5
}
```

```typescript
// TypeScriptのstrictNullChecks
function findUser(id: number): string | null {
    return id === 1 ? "Alice" : null;
}

const name = findUser(1);

// 型ガードで絞り込み
if (name !== null) {
    console.log(name.length);  // nameはstring型として扱われる
}

// Optional chaining + Nullish coalescing
const user = { profile: null as { age: number } | null };
const age = user.profile?.age ?? 0;  // profile が null なら 0

// Null安全なユーティリティ型
type NonNullable<T> = T extends null | undefined ? never : T;
type SafeName = NonNullable<string | null>;  // string
```

## 使用場面

- データベースやAPIレスポンスで「値がない」状態を `Option` 型で表し、nullチェック漏れをコンパイル時に防ぐ場合
- KotlinでAndroidアプリ開発を行う際に `NullPointerException` を根絶する場合
- Rustで `Option<T>` を使い、返り値がない場合を安全に伝播させる場合
- TypeScriptで `strictNullChecks: true` を有効化し、既存コードの`null`関連バグを発見する場合

## 参考文献

- Hoare, C. A. R. (2009). "Null References: The Billion Dollar Mistake." QCon London.
- [Kotlin 公式 — Null 安全](https://kotlinlang.org/docs/null-safety.html)
- [Rust 公式 — Option](https://doc.rust-lang.org/std/option/)

<AffiliateBanner site="language_navi" />
