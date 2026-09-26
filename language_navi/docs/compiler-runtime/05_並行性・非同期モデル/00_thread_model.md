import AffiliateBanner from '@site/src/components/AffiliateBanner';

# スレッドモデルと共有メモリ

## スレッドモデルとは

> スレッドモデルとは、プログラム内の並行処理をどのような単位で管理し、スレッド間でどのようにデータを共有・同期するかを定義する概念であり、OS スレッド・グリーンスレッド・ファイバーといった実装の違いが並行処理のコストと安全性に直接影響する。

**OS スレッド（カーネルスレッド）**は OS が直接管理するスレッドであり、マルチコアを真に活用できる反面、スレッド生成・コンテキストスイッチのコストが大きい。**グリーンスレッド（ユーザーランドスレッド）**はランタイムが管理する軽量スレッドで、数千〜数百万のスレッドを低コストで生成できる（Go の goroutine・Erlang のプロセスなど）。

共有メモリモデルでは、複数スレッドが同一のメモリ空間にアクセスするため、**競合状態（Race Condition）**と**デッドロック**が主要な問題となる。これらに対処するためにミューテックス（相互排他ロック）・セマフォ・読み書きロック（RWLock）・条件変数などの同期プリミティブが使われる。

メモリモデル（Memory Model）も重要な概念で、コンパイラや CPU の命令並び替え（リオーダリング）により、あるスレッドの書き込みが他スレッドから見えるタイミングが不定になることがある。Java Memory Model（JMM）・C++ のメモリオーダー・Go のメモリモデルはそれぞれ「いつ書き込みが他スレッドに可視になるか」を規定する。

## スレッド実装の比較

| 種類 | 管理者 | コンテキストスイッチ | 生成コスト | 採用言語 |
|------|--------|---------------------|------------|---------|
| OS スレッド | カーネル | 重い（~μs） | 高い（~1MB スタック） | C++・Java・Rust |
| グリーンスレッド | ランタイム | 軽い（~ns） | 低い（~数KB） | Go・Erlang |
| 非同期タスク | ランタイム + イベントループ | 最軽量 | 最低 | Python asyncio・JavaScript |

```python
# スレッドと共有メモリの競合状態・ロックのデモ

import threading
import time
from threading import Lock, RLock

# ===== 競合状態のデモ =====
class UnsafeCounter:
    def __init__(self):
        self.value = 0

    def increment(self, n: int = 1000):
        for _ in range(n):
            # 読み取り → 加算 → 書き込み はアトミックでない
            self.value += 1


class SafeCounter:
    def __init__(self):
        self.value = 0
        self._lock = Lock()

    def increment(self, n: int = 1000):
        for _ in range(n):
            with self._lock:  # ロック取得・解放を自動管理
                self.value += 1

    def get(self) -> int:
        with self._lock:
            return self.value


def run_threads(counter, num_threads: int = 10, increments: int = 1000):
    threads = [
        threading.Thread(target=counter.increment, args=(increments,))
        for _ in range(num_threads)
    ]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    return getattr(counter, 'get', lambda: counter.value)()


print("=== 競合状態（アンセーフカウンタ）===")
unsafe = UnsafeCounter()
result = run_threads(unsafe)
expected = 10 * 1000
print(f"期待値: {expected}, 実際: {result}, 一致: {result == expected}")
# 競合状態により期待値より小さい値になることが多い

print("\n=== スレッドセーフカウンタ（ロックあり）===")
safe = SafeCounter()
result = run_threads(safe)
print(f"期待値: {expected}, 実際: {result}, 一致: {result == expected}")
# ロックにより常に期待値と一致する


# ===== デッドロックのデモ（回避策付き） =====
lock_a = Lock()
lock_b = Lock()

def task_deadlock_prone(name: str, first: Lock, second: Lock):
    """ロック取得順序が異なるとデッドロックが発生しうる"""
    print(f"  [{name}] {first} の取得を試みる")
    with first:
        time.sleep(0.01)  # デッドロックを発生させやすくするために待機
        print(f"  [{name}] {second} の取得を試みる")
        with second:
            print(f"  [{name}] 両方のロックを取得")


# 回避策: 常に同じ順序でロックを取得する
print("\n=== デッドロック回避: 常に lock_a → lock_b の順でロック ===")
t1 = threading.Thread(target=task_deadlock_prone, args=("T1", lock_a, lock_b))
t2 = threading.Thread(target=task_deadlock_prone, args=("T2", lock_a, lock_b))
t1.start()
t2.start()
t1.join(timeout=2)
t2.join(timeout=2)
print("デッドロックなし（同一順序でのロック取得）")
```

## 使用場面

- CPU バウンドなタスクを複数コアで並列化するとき（OS スレッド）
- 大量の I/O 待ちタスクを効率的に処理するとき（グリーンスレッド・非同期）
- 共有データ構造へのスレッドセーフなアクセスが必要なとき（ロック設計）
- 高スループットなサーバーでリクエストを並行処理するとき

## 参考文献

- Goetz, B. et al. (2006). *Java Concurrency in Practice*. Addison-Wesley.
- [Go memory model](https://go.dev/ref/mem)
- Herlihy, M. & Shavit, N. (2008). *The Art of Multiprocessor Programming*. Elsevier.

<AffiliateBanner site="language_navi" />
