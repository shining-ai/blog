import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 部分型と共変・反変

## 部分型とは

> 部分型（Subtyping）とは、型 S が型 T の部分型であるとき、T を期待する文脈で S の値を安全に使えるという関係であり、リスコフの置換原則（LSP）がその理論的根拠となる。

部分型の基本は「is-a 関係」である。`Cat` は `Animal` の部分型であれば、`Animal` を期待する場所に `Cat` を渡せる。しかし型コンストラクタ（`List<Cat>` と `List<Animal>` など）に対して部分型関係がどう伝播するかは「変位（Variance）」によって決まり、これが共変・反変・不変の概念である。

変位を正しく理解しないと、型安全性を破るコードを書いてしまう危険がある。Javaの配列共変バグ（`Object[] arr = new String[1]; arr[0] = 42;` がコンパイルを通る）はその典型例である。Kotlin・Scala・TypeScriptは宣言サイト変位または利用サイト変位を使い、型安全な変位制御を実現している。

## 変位の種類

| 変位 | 意味 | `S <: T` のとき | 典型的な用途 |
|------|------|---------------|-------------|
| 共変（Covariant） | `F<S>` は `F<T>` の部分型 | `List<Cat> <: List<Animal>` | 読み取り専用コンテナ |
| 反変（Contravariant） | `F<T>` は `F<S>` の部分型 | `Consumer<Animal> <: Consumer<Cat>` | 書き込み専用コンテナ |
| 不変（Invariant） | どちらの部分型でもない | `List<Cat>` と `List<Animal>` は無関係 | 読み書き両方のコンテナ |

```typescript
// TypeScript での共変・反変

class Animal { breathe() {} }
class Cat extends Animal { meow() {} }
class Dog extends Animal { bark() {} }

// 共変: 戻り値型は共変（安全に読み取れる）
type Producer<T> = () => T;
const catProducer: Producer<Cat> = () => new Cat();
const animalProducer: Producer<Animal> = catProducer; // OK: Catを返す関数はAnimalを返す関数として使える

// 反変: 引数型は反変（安全に書き込める）
type Consumer<T> = (value: T) => void;
const animalConsumer: Consumer<Animal> = (a) => a.breathe();
const catConsumer: Consumer<Cat> = animalConsumer; // OK: Animalを受け取る関数はCatを受け取れる

// TypeScriptの配列は読み書き両対応なので実質は不変 (型エラーになる場合あり)
// ただしTypeScriptは実用上 bivariant になることもある

// 関数型の変位: 引数は反変、戻り値は共変
type Transformer<In, Out> = (input: In) => Out;
// Transformer<Animal, Cat> は Transformer<Cat, Animal> の部分型?
// → 引数: Cat <: Animal (Catはより具体的) → 引数は反変なので Animal <: Cat が必要
// → 戻り値: Cat <: Animal (Catはより具体的) → 戻り値は共変なのでOK
```

```kotlin
// Kotlinの宣言サイト変位 (out/in)

// out T: Tを読み取るだけ → 共変
interface Producer<out T> {
    fun produce(): T
}

// in T: Tを書き込むだけ → 反変
interface Consumer<in T> {
    fun consume(value: T)
}

class CatProducer : Producer<Cat> {
    override fun produce(): Cat = Cat()
}

val animalProducer: Producer<Animal> = CatProducer()  // 共変なのでOK

// Listはout T (読み取り専用) → 共変
val cats: List<Cat> = listOf(Cat())
val animals: List<Animal> = cats  // OK (Listはout T)

// MutableListはinvariant → 部分型関係なし
// val mutableAnimals: MutableList<Animal> = mutableListOf<Cat>() // コンパイルエラー
```

```scala
// Scalaの変位アノテーション
class Box[+A](val value: A)  // +A: 共変
class Sink[-A] {              // -A: 反変
    def put(a: A): Unit = println(s"Got $a")
}

val catBox: Box[Cat] = Box(new Cat)
val animalBox: Box[Animal] = catBox  // OK: 共変

val animalSink: Sink[Animal] = new Sink[Animal]
val catSink: Sink[Cat] = animalSink  // OK: 反変
```

## 使用場面

- コレクション型（List・Set・Map）の設計で読み取り専用か読み書き両対応かを決定する場合
- コールバック関数の型を設計し、安全な多相的な使い方を保証する場合
- ジェネリックなAPIで `extends`（上限境界）と `super`（下限境界）を使い型安全性を維持する場合（Javaの PECS 原則）
- TypeScriptで複雑な関数型の互換性を検証する場合

## 参考文献

- Liskov, B. & Wing, J. (1994). "A Behavioral Notion of Subtyping." *ACM TOPLAS*, 16(6).
- [Kotlin 公式 — ジェネリクスの変位](https://kotlinlang.org/docs/generics.html)
- [TypeScript Handbook — Variance](https://www.typescriptlang.org/docs/handbook/2/generics.html)

<AffiliateBanner site="language_navi" />
