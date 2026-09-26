import AffiliateBanner from '@site/src/components/AffiliateBanner';

# JIT コンパイルの仕組み

## JIT コンパイルとは

> JIT（Just-In-Time）コンパイルとは、プログラムの実行時にバイトコードや中間表現をネイティブマシンコードに動的コンパイルする技術であり、インタープリタの起動速度と AOT コンパイルの実行速度を両立させる手法である。

通常のインタープリタはバイトコードを1命令ずつ解釈実行するため、オーバーヘッドが大きい。AOT（Ahead-Of-Time）コンパイルは起動前に全コードをコンパイルするため実行は速いが、配布の柔軟性が失われる。JIT はその中間に位置し、実行しながらホットスポット（頻繁に実行されるコード）を特定してコンパイルする。

JIT の中核となる技術は**プロファイリング**と**特殊化（Specialization）**である。JVM の HotSpot JIT や V8 の TurboFan は実行中に型情報・分岐頻度・呼び出し回数などのプロファイル情報を収集し、「この関数の引数は常に int である」という推測のもとで特殊化されたコードを生成する。推測が外れた場合は**脱最適化（Deoptimization）**してインタープリタに戻る。

**ウォームアップ問題**は JIT の典型的な課題で、起動直後はまだコンパイルが完了していないためパフォーマンスが低い。Java アプリケーションのデプロイ時にトラフィックを徐々に流すウォームアップ戦略はこれに対応したものである。GraalVM Native Image のような AOT + JIT ハイブリッドもこの問題へのアプローチの一つである。

## JIT の最適化技法

| 最適化手法 | 内容 | 効果 |
|------------|------|------|
| インライン展開 | 関数呼び出しを呼び出し元に展開 | 呼び出しオーバーヘッド削減 |
| 型特殊化 | 型が確定している場合に特化コード生成 | 型チェックの除去 |
| エスケープ解析 | ヒープ割り当てをスタック割り当てに変換 | GC 負荷の軽減 |
| ループ最適化 | ループ不変式のホイスティング・アンロール | ループ実行の高速化 |
| デッドコード除去 | 実行されないコードの削除 | コードサイズと分岐削減 |
| 脱仮想化 | 仮想関数呼び出しを直接呼び出しに変換 | 間接呼び出しコスト削減 |

```python
# JIT コンパイルの効果をプロファイリングで確認するデモ

import time
import sys

def fib_interpreted(n: int) -> int:
    """再帰フィボナッチ（JIT なしの場合の模擬）"""
    if n <= 1:
        return n
    return fib_interpreted(n - 1) + fib_interpreted(n - 2)


def fib_iterative(n: int) -> int:
    """繰り返しフィボナッチ（JIT が最適化しやすい形）"""
    if n <= 1:
        return n
    a, b = 0, 1
    for _ in range(n - 1):
        a, b = b, a + b
    return b


# ===== PyPy vs CPython での JIT 効果の測定 =====
def benchmark(func, n: int, iterations: int) -> float:
    start = time.perf_counter()
    for _ in range(iterations):
        func(n)
    return time.perf_counter() - start


N = 30
ITER = 100

t1 = benchmark(fib_interpreted, N, ITER)
t2 = benchmark(fib_iterative, N, ITER)

print(f"fib_interpreted(n={N}) x{ITER}: {t1:.4f}s")
print(f"fib_iterative(n={N})   x{ITER}: {t2:.4f}s")
print(f"反復版の高速化比: {t1 / t2:.1f}x")
print(f"実行環境: {sys.implementation.name} {sys.version}")
# PyPy で実行すると JIT によりさらに大幅に高速化される
```

```javascript
// V8 JIT の特殊化と脱最適化の例（Node.js）

// V8 の JIT が型特殊化を行いやすい関数
function addNumbers(a, b) {
  return a + b;  // 常に数値 → number特殊化コードを生成
}

// ウォームアップ（JIT コンパイルを促す）
for (let i = 0; i < 100000; i++) {
  addNumbers(i, i + 1);  // 常に整数 → V8 が最適化
}

// 型が変わると脱最適化が発生
// addNumbers("hello", "world");  // 文字列を渡すと deoptimize

// --v8-options --trace-opt で JIT コンパイルのログを確認できる
// node --trace-opt --trace-deopt script.js

// V8 の JIT ティア構成:
// 1. Ignition (インタープリタ) → バイトコード実行
// 2. Sparkplug (ベースラインコンパイラ) → 高速な非最適化コンパイル
// 3. Maglev (中間最適化) → 型フィードバックを活用
// 4. TurboFan (最適化コンパイラ) → ホットスポットを高度最適化
console.log("JIT warmup complete");
console.log(`Result: ${addNumbers(42, 58)}`);
```

## 使用場面

- JVM（Java・Kotlin・Scala）の HotSpot C1/C2 コンパイラによる長時間稼働サービス
- V8 の TurboFan による Node.js サーバーやブラウザの JavaScript 高速化
- PyPy の RPython JIT による Python コードの高速化
- .NET の CLR（RyuJIT）による C# アプリケーションのランタイム最適化

## 参考文献

- Aycock, J. (2003). A brief history of just-in-time. *ACM Computing Surveys*, 35(2).
- [V8 の JIT アーキテクチャ解説](https://v8.dev/blog/turbofan-jit)
- [JVM JIT コンパイルの仕組み](https://docs.oracle.com/en/java/javase/21/vm/java-hotspot-virtual-machine-performance-enhancements.html)

<AffiliateBanner site="language_navi" />
