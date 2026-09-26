---
sidebar_position: 5
displayed_sidebar: operatingSystemSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 競合状態と排他制御 (Race Condition & Synchronization)

## 競合状態とは

> 複数スレッドが共有データに非アトミックにアクセスし、結果が実行順序に依存してしまうバグ

です。<br/>

`counter++` は一見1命令に見えますが、実際にはload→increment→storeの3命令に展開されるため、スレッド間で割り込みが発生すると不整合が起きます。

## counter++ のアセンブリ展開

```
C コード:
  counter++;   ← 非アトミック（3命令）

x86-64 アセンブリ展開:
  mov eax, [counter]   ← (1) メモリからレジスタへロード
  add eax, 1           ← (2) レジスタをインクリメント
  mov [counter], eax   ← (3) レジスタからメモリへストア

競合例（counter = 0 から始まり、2スレッドが各1回インクリメント）:
  Thread1: (1) eax=0
  Thread2: (1) eax=0   ← Thread1がstoreする前に割り込み
  Thread1: (2) eax=1
  Thread1: (3) counter=1
  Thread2: (2) eax=1   ← Thread2も0をベースに計算
  Thread2: (3) counter=1  ← 期待値は2だが1になる
```

## 排他制御の手法比較

| 手法 | 待機方式 | CPU消費 | 優先度逆転 | 適用場面 |
| --- | --- | --- | --- | --- |
| ミューテックス（mutex） | スリープ待ち | 低い | あり | 一般的なクリティカルセクション |
| スピンロック | ビジーウェイト | 高い（待機中） | なし | 保持時間が極めて短い場合（カーネル内） |
| セマフォ | スリープ待ち | 低い | あり | 複数リソースのカウント管理 |
| 読み書きロック（rwlock） | スリープ待ち | 低い | あり | 読み多・書き少の場面 |
| アトミック操作 | なし（ロックなし） | 最小 | なし | カウンタ・フラグなど単純な操作 |

## メモリオーダリング

```
メモリモデルの順序付け強度（強い順）:

  seq_cst  （逐次一貫性）: 全スレッドから同じ順序で見える・最もコスト高
     ↓
  acq_rel  （取得解放）:   acquire=それ以降の読み書きを遅延不可
                           release=それ以前の読み書きを前倒し不可
     ↓
  relaxed  （緩和）:       順序の保証なし・カウンタのみに使用可

一般的な使い方:
  - ミューテックス: acquire（lock時）+ release（unlock時）
  - フラグの公開: release（書き手）+ acquire（読み手）
  - 統計カウンタ: relaxed（順序不問）
```

## 実装

```c title="pthread_mutex vs __atomic_fetch_addでのカウンタ競合実験（C）"
#include <stdio.h>
#include <pthread.h>
#include <stdatomic.h>

#define N_THREADS  4
#define ITERATIONS 500000

/* 非保護カウンタ（競合状態が発生する） */
static long unsafe_counter = 0;

/* ミューテックス保護 */
static long   mutex_counter = 0;
static pthread_mutex_t mtx = PTHREAD_MUTEX_INITIALIZER;

/* アトミック操作 */
static atomic_long atomic_counter = 0;

static void *unsafe_inc(void *arg) {
    (void)arg;
    for (int i = 0; i < ITERATIONS; i++)
        unsafe_counter++;   /* 競合状態 */
    return NULL;
}

static void *mutex_inc(void *arg) {
    (void)arg;
    for (int i = 0; i < ITERATIONS; i++) {
        pthread_mutex_lock(&mtx);
        mutex_counter++;
        pthread_mutex_unlock(&mtx);
    }
    return NULL;
}

static void *atomic_inc(void *arg) {
    (void)arg;
    for (int i = 0; i < ITERATIONS; i++)
        atomic_fetch_add_explicit(&atomic_counter, 1, memory_order_relaxed);
    return NULL;
}

static void run_bench(void *(*fn)(void*), const char *label) {
    pthread_t threads[N_THREADS];
    for (int i = 0; i < N_THREADS; i++)
        pthread_create(&threads[i], NULL, fn, NULL);
    for (int i = 0; i < N_THREADS; i++)
        pthread_join(threads[i], NULL);
    long expected = (long)N_THREADS * ITERATIONS;
    printf("%-12s: unsafe=%ld  mutex=%ld  atomic=%ld  (期待値=%ld)\n",
           label, unsafe_counter, mutex_counter, atomic_counter, expected);
}

int main(void) {
    printf("競合実験: スレッド数=%d, 繰り返し=%d\n", N_THREADS, ITERATIONS);
    run_bench(unsafe_inc, "unsafe");
    /* mutex と atomicは独立してカウントするため reset は不要 */
    run_bench(mutex_inc,  "mutex");
    run_bench(atomic_inc, "atomic");
    return 0;
}
```

```python title="threading.LockとSemaphoreとバリア同期の実演（Python）"
import threading
import time
from typing import Callable

# ─── 基本的なLockでのクリティカルセクション ──────────────────────────────────
def demo_race_and_fix() -> None:
    counter_unsafe = 0
    counter_safe   = 0
    lock = threading.Lock()

    def unsafe_inc(n: int) -> None:
        nonlocal counter_unsafe
        for _ in range(n):
            counter_unsafe += 1  # 競合状態（CPythonのGILで偶然動くことも多いが保証なし）

    def safe_inc(n: int) -> None:
        nonlocal counter_safe
        for _ in range(n):
            with lock:
                counter_safe += 1

    N, THREADS = 100_000, 4
    threads = [threading.Thread(target=safe_inc, args=(N,)) for _ in range(THREADS)]
    for t in threads: t.start()
    for t in threads: t.join()
    print(f"safe_counter  = {counter_safe}  (期待値: {N * THREADS})")

# ─── Semaphore で同時アクセス数を制限 ────────────────────────────────────────
def demo_semaphore() -> None:
    sem = threading.Semaphore(2)  # 最大2スレッドが同時にリソースにアクセス可能

    def worker(wid: int) -> None:
        with sem:
            print(f"  Worker {wid}: 開始")
            time.sleep(0.05)
            print(f"  Worker {wid}: 終了")

    print("=== Semaphore (最大2並列) ===")
    threads = [threading.Thread(target=worker, args=(i,)) for i in range(5)]
    for t in threads: t.start()
    for t in threads: t.join()

# ─── Barrier で全スレッドを同期 ───────────────────────────────────────────────
def demo_barrier() -> None:
    NTHREADS = 4
    barrier  = threading.Barrier(NTHREADS)

    def phase_worker(wid: int) -> None:
        print(f"  Worker {wid}: フェーズ1 開始")
        time.sleep(0.01 * wid)
        print(f"  Worker {wid}: フェーズ1 完了 → バリア待機")
        barrier.wait()          # 全スレッドが揃うまで待機
        print(f"  Worker {wid}: フェーズ2 開始")

    print("=== Barrier 同期 ===")
    threads = [threading.Thread(target=phase_worker, args=(i,)) for i in range(NTHREADS)]
    for t in threads: t.start()
    for t in threads: t.join()

# ─── 実行 ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=== Lock でのカウンタ保護 ===")
    demo_race_and_fix()
    demo_semaphore()
    demo_barrier()
```

## 使用場面

- **DBのトランザクション（MVCC/2PL）**: PostgreSQLはMVCCでロックなし読み取りを実現し、書き込みには行ロックを使用
- **カーネルのスピンロック**: Linuxカーネルの割り込みハンドラではスリープできないためスピンロックを使用
- **Go の sync.Mutex**: Goのミューテックスはスピン後スリープに遷移するハイブリッド方式
- **ロックフリーデータ構造**: CAS（Compare-And-Swap）操作でロックなしキュー・スタックを実装

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
