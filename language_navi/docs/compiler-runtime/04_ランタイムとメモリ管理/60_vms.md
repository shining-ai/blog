import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 仮想マシン（JVM・CPython・V8）の概要

## 仮想マシンとは

> 仮想マシン（VM: Virtual Machine）とは、特定のハードウェアアーキテクチャに依存しない抽象的な実行環境であり、ソースコードをバイトコード（中間表現）にコンパイルしてその上で実行することでプラットフォーム独立性と実行時最適化を両立する。

仮想マシンの主目的は2つある。第一に**プラットフォーム独立性**（Write Once, Run Anywhere）であり、バイトコードは OS・CPU に依存しないため、VM が動く環境であればどこでも実行できる。第二に**実行時最適化**であり、VM はプログラムの実行パターンをプロファイリングしながら JIT コンパイルや型特殊化を動的に行える。

3大 VM の特徴を概観すると、**JVM**（Java Virtual Machine）はスタックベースの VM で、Java・Kotlin・Scala・Groovy などの言語が動作する。HotSpot JIT、世代別 GC（G1GC・ZGC）、スレッドとモニターロックによる並行制御を持つ。**CPython**は Python の参照実装で、バイトコードインタープリタ（スタックベース）と参照カウント GC が中心である。GIL（Global Interpreter Lock）により同時に実行できるスレッドは1つに制限される。**V8**は Google が開発した JavaScript VM で、Ignition インタープリタ・Sparkplug・Maglev・TurboFan という多段 JIT パイプラインと Orinoco GC（世代別・並行 GC）を持つ。

## 3大 VM の比較

| 特性 | JVM | CPython | V8 |
|------|-----|---------|-----|
| 中間表現 | Java バイトコード（.class） | .pyc バイトコード | バイトコード（内部） |
| VM 方式 | スタックベース | スタックベース | レジスタ + スタック |
| JIT | HotSpot C1/C2（強力） | なし（PyPy は別） | TurboFan（多段JIT） |
| GC | 世代別 + 並行 GC | 参照カウント + 補完 GC | 世代別 + 並行 GC |
| 並行性 | ネイティブスレッド + モニタ | GIL（1スレッド制限） | シングルスレッド + イベントループ |
| 起動速度 | 遅い（JVM 起動コスト） | 速い | 速い |
| ピーク性能 | 非常に高い（JIT効果大） | 低め | 高い（JIT効果大） |

```python
# CPython VM の内部確認 - dis モジュールでバイトコードを逆アセンブル

import dis
import sys

def add_two_numbers(a: int, b: int) -> int:
    result = a + b
    return result

def sum_list(items: list) -> int:
    total = 0
    for item in items:
        total += item
    return total

print(f"CPython バージョン: {sys.version}")
print(f"CPython バイトコード（add_two_numbers）:")
print("=" * 50)
dis.dis(add_two_numbers)

print(f"\nCPython バイトコード（sum_list）:")
print("=" * 50)
dis.dis(sum_list)

# code オブジェクトの内部確認
code = add_two_numbers.__code__
print(f"\ncode オブジェクトの情報:")
print(f"  引数の数: {code.co_argcount}")
print(f"  ローカル変数: {code.co_varnames}")
print(f"  定数: {code.co_consts}")
print(f"  スタックサイズ: {code.co_stacksize}")
```

```java
// JVM バイトコードの確認 - javap コマンドで逆アセンブル
// javap -c -verbose AddExample.class で確認できる

public class AddExample {
    // このコードは以下の JVM バイトコードにコンパイルされる:
    // iconst_1  (定数1をスタックにプッシュ)
    // iconst_2  (定数2をスタックにプッシュ)
    // iadd      (スタックトップ2値を整数加算)
    // ireturn   (結果を返す)
    public static int addNumbers(int a, int b) {
        return a + b;
    }

    // JVM スタックフレームの概念確認
    public static void demonstrateStackFrame() {
        // 各メソッド呼び出しはスタックフレームを生成
        // フレームには: ローカル変数配列・オペランドスタック・参照が含まれる
        int x = 10;    // ローカル変数スロット 0
        int y = 20;    // ローカル変数スロット 1
        int z = x + y; // ローカル変数スロット 2
        System.out.println(z);
    }

    public static void main(String[] args) {
        // JVM の起動順序:
        // 1. クラスローディング（ClassLoader が .class ファイルを読み込む）
        // 2. バイトコード検証（型安全性・スタック深さの検証）
        // 3. インタープリタ実行（Interpreter）
        // 4. JIT コンパイル（ホットスポット検出後）
        System.out.println("JVM started");
        System.out.println(addNumbers(1, 2));
        demonstrateStackFrame();
    }
}
```

## 使用場面

- JVM: 長時間稼働するエンタープライズシステム・Android アプリ（ART）・Spark/Hadoop のビッグデータ処理
- CPython: データサイエンス・機械学習（NumPy/PyTorch が C 拡張で速度補完）・スクリプティング
- V8: Node.js によるバックエンドサーバー・ブラウザの JavaScript 実行・Deno ランタイム

## 参考文献

- Lindholm, T. et al. (2023). *The Java Virtual Machine Specification, Java SE 21 Edition*. Oracle.
- [CPython Internals - Your Guide to the CPython Source Code](https://realpython.com/products/cpython-internals-book/)
- [V8 の設計ドキュメント](https://v8.dev/docs)

<AffiliateBanner site="language_navi" />
