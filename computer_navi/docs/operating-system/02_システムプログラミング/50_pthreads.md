---
sidebar_position: 5
displayed_sidebar: operatingSystemSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# pthreads による並行プログラミング (POSIX Threads)

## pthreadsとは

pthreadsとは、

> Unix系OSでスレッドを操作するための標準C APIで、libpthread（-lpthread）として提供されるPOSIX標準スレッドライブラリ

です。<br/>

スレッドはプロセスと異なりヒープ・グローバル変数・ファイルディスクリプタを共有するため、低オーバーヘッドで並行処理が可能ですが、共有データへのアクセスには排他制御が必要です。pthreadsはC11の`<threads.h>`・C++のstd::thread・Goのgoroutine等の概念的基盤となっています。

## 主要 API

| API | 機能 |
| --- | --- |
| `pthread_create(tid, attr, func, arg)` | 新スレッドを生成して`func(arg)`を実行 |
| `pthread_join(tid, retval)` | 指定スレッドの終了を待ちリソースを回収 |
| `pthread_exit(retval)` | 呼び出しスレッドを終了（returnと同等） |
| `pthread_mutex_lock(mutex)` | ミューテックスを取得（取れるまでブロック） |
| `pthread_mutex_unlock(mutex)` | ミューテックスを解放 |
| `pthread_mutex_trylock(mutex)` | 非ブロッキングで取得を試みる |
| `pthread_cond_wait(cond, mutex)` | 条件変数で待機（mutex をアトミックに解放） |
| `pthread_cond_signal(cond)` | 条件変数で1スレッドを起こす |
| `pthread_cond_broadcast(cond)` | 条件変数で全待機スレッドを起こす |
| `pthread_rwlock_rdlock(rwlock)` | 読み取りロックを取得（複数スレッドが同時に取得可） |
| `pthread_rwlock_wrlock(rwlock)` | 書き込みロックを取得（排他） |

## スレッドとプロセスのリソース共有

```
プロセス内のスレッド構成:

  プロセス (PID=200)
  ┌──────────────────────────────────────────────────────┐
  │  共有リソース（全スレッドがアクセス可能）                  │
  │    仮想アドレス空間（ヒープ・テキスト・データ・mmap）        │
  │    グローバル変数・static変数                            │
  │    ファイルディスクリプタテーブル                          │
  │    シグナルハンドラ                                      │
  ├──────────┬───────────┬────────────────────────────────┤
  │  Thread1 │  Thread2  │  Thread3                        │
  │  (独立)  │  (独立)   │  (独立)                          │
  │  スタック │  スタック  │  スタック（各スレッドごとに独立）   │
  │  レジスタ │  レジスタ  │  レジスタ                        │
  │  TLS     │  TLS      │  TLS（Thread Local Storage）    │
  └──────────┴───────────┴────────────────────────────────┘
```

## 条件変数のパターン

条件変数は「特定の状態になるまで待つ」用途に使います。`if`ではなく`while`を使う理由はspurious wakeup（偽の起床）対策です。

```c
/* 生産者: データを追加して消費者を起こす */
pthread_mutex_lock(&mutex);
buffer[tail] = item;
count++;
pthread_cond_signal(&not_empty);  /* 消費者に通知 */
pthread_mutex_unlock(&mutex);

/* 消費者: データが来るまで待つ */
pthread_mutex_lock(&mutex);
while (count == 0) {                   /* ← if ではなく while が必須 */
    pthread_cond_wait(&not_empty, &mutex);
    /* wait はアトミックに mutex を解放してスリープ
       起床時に mutex を再取得してから返る           */
}
item = buffer[head];
count--;
pthread_cond_signal(&not_full);
pthread_mutex_unlock(&mutex);

/* while が必要な理由:
   1. Spurious wakeup: OSがランダムにスレッドを起こすことがある
   2. 複数消費者: signal で複数が起きると最初の1つが消費し残りは再確認が必要 */
```

## デッドロック予防: ロック順序の一貫性

```
悪い例（循環待ちが発生する可能性あり）:
  Thread A: lock(mutex1) → lock(mutex2)
  Thread B: lock(mutex2) → lock(mutex1)  ← 逆順 → デッドロックの危険

良い例（常に同じ順序で取得）:
  Thread A: lock(mutex1) → lock(mutex2)
  Thread B: lock(mutex1) → lock(mutex2)  ← 同順 → 安全
```

## 実装

```c title="生産者-消費者問題（mutex + cond variable + 有界バッファ）（C）"
#include <stdio.h>
#include <stdlib.h>
#include <pthread.h>
#include <unistd.h>

#define BUFFER_SIZE  8
#define N_PRODUCERS  2
#define N_CONSUMERS  3
#define ITEMS_PER_PRODUCER 10

typedef struct {
    int  buf[BUFFER_SIZE];
    int  head, tail, count;
    pthread_mutex_t mutex;
    pthread_cond_t  not_full;
    pthread_cond_t  not_empty;
    int  done;       /* 全生産者が終了したフラグ */
} BoundedBuffer;

static BoundedBuffer g_bb;

static void bb_init(BoundedBuffer *bb) {
    bb->head = bb->tail = bb->count = bb->done = 0;
    pthread_mutex_init(&bb->mutex, NULL);
    pthread_cond_init(&bb->not_full,  NULL);
    pthread_cond_init(&bb->not_empty, NULL);
}

static void bb_put(BoundedBuffer *bb, int val) {
    pthread_mutex_lock(&bb->mutex);
    while (bb->count == BUFFER_SIZE)
        pthread_cond_wait(&bb->not_full, &bb->mutex);
    bb->buf[bb->tail] = val;
    bb->tail = (bb->tail + 1) % BUFFER_SIZE;
    bb->count++;
    pthread_cond_signal(&bb->not_empty);
    pthread_mutex_unlock(&bb->mutex);
}

/* 戻り値 -1 は「生産完了かつバッファ空」を示す */
static int bb_get(BoundedBuffer *bb) {
    pthread_mutex_lock(&bb->mutex);
    while (bb->count == 0 && !bb->done)
        pthread_cond_wait(&bb->not_empty, &bb->mutex);
    if (bb->count == 0 && bb->done) {
        pthread_mutex_unlock(&bb->mutex);
        return -1;
    }
    int val = bb->buf[bb->head];
    bb->head = (bb->head + 1) % BUFFER_SIZE;
    bb->count--;
    pthread_cond_signal(&bb->not_full);
    pthread_mutex_unlock(&bb->mutex);
    return val;
}

static void *producer(void *arg) {
    int id = *(int *)arg;
    for (int i = 0; i < ITEMS_PER_PRODUCER; i++) {
        int val = id * 100 + i;
        bb_put(&g_bb, val);
        printf("Producer %d: put %d (buf=%d)\n", id, val, g_bb.count);
        usleep(1000);
    }
    return NULL;
}

static void *consumer(void *arg) {
    int id  = *(int *)arg;
    int sum = 0, n = 0;
    while (1) {
        int val = bb_get(&g_bb);
        if (val < 0) break;
        sum += val;
        n++;
        printf("Consumer %d: got %d\n", id, val);
    }
    printf("Consumer %d: 合計=%d, 個数=%d\n", id, sum, n);
    return NULL;
}

int main(void) {
    bb_init(&g_bb);

    pthread_t prod[N_PRODUCERS], cons[N_CONSUMERS];
    int prod_ids[N_PRODUCERS], cons_ids[N_CONSUMERS];

    for (int i = 0; i < N_PRODUCERS; i++) {
        prod_ids[i] = i;
        pthread_create(&prod[i], NULL, producer, &prod_ids[i]);
    }
    for (int i = 0; i < N_CONSUMERS; i++) {
        cons_ids[i] = i;
        pthread_create(&cons[i], NULL, consumer, &cons_ids[i]);
    }

    /* 生産者の終了を待つ */
    for (int i = 0; i < N_PRODUCERS; i++)
        pthread_join(prod[i], NULL);

    /* 全生産者が終了したことを消費者に伝える */
    pthread_mutex_lock(&g_bb.mutex);
    g_bb.done = 1;
    pthread_cond_broadcast(&g_bb.not_empty);
    pthread_mutex_unlock(&g_bb.mutex);

    for (int i = 0; i < N_CONSUMERS; i++)
        pthread_join(cons[i], NULL);

    pthread_mutex_destroy(&g_bb.mutex);
    pthread_cond_destroy(&g_bb.not_full);
    pthread_cond_destroy(&g_bb.not_empty);
    printf("全スレッド完了\n");
    return 0;
}
```

```python title="threading.Thread + Lock + Condition で生産者-消費者パターン（Python）"
import threading
import time
import queue
from typing import Optional

# ─── threading.Queue を使う実装（推奨・スレッドセーフ）───────────────────────
def demo_queue_producer_consumer():
    print("=== Queue を使った生産者-消費者 ===")
    q: queue.Queue[Optional[int]] = queue.Queue(maxsize=8)
    SENTINEL = None  # 終了シグナル

    def producer(pid: int, n: int) -> None:
        for i in range(n):
            val = pid * 100 + i
            q.put(val)
            print(f"  Producer {pid}: put {val}")
            time.sleep(0.001)
        q.put(SENTINEL)

    def consumer(cid: int) -> None:
        total = 0
        while True:
            val = q.get()
            q.task_done()
            if val is None:
                # sentinelを次の消費者に回す
                q.put(SENTINEL)
                break
            total += val
            print(f"  Consumer {cid}: got {val}")
        print(f"  Consumer {cid}: 合計={total}")

    t_prod = threading.Thread(target=producer, args=(0, 5))
    t_cons = [threading.Thread(target=consumer, args=(i,)) for i in range(2)]

    t_prod.start()
    for t in t_cons: t.start()

    t_prod.join()
    for t in t_cons: t.join()


# ─── Lock + Condition で低レベルに実装（pthreads の直接対応）──────────────────
def demo_condition_producer_consumer():
    print("\n=== Condition を使った生産者-消費者 ===")
    BUFFER_SIZE = 4
    buf = []
    done = False
    cond_not_full  = threading.Condition()
    cond_not_empty = threading.Condition()

    def producer():
        for i in range(8):
            with cond_not_full:
                while len(buf) >= BUFFER_SIZE:
                    cond_not_full.wait()
                buf.append(i)
                print(f"  producer: put {i} (size={len(buf)})")
            with cond_not_empty:
                cond_not_empty.notify()
            time.sleep(0.005)

        nonlocal done
        done = True
        with cond_not_empty:
            cond_not_empty.notify_all()

    def consumer(cid: int):
        while True:
            with cond_not_empty:
                while len(buf) == 0 and not done:
                    cond_not_empty.wait()  # spurious wakeup 対策に while
                if len(buf) == 0 and done:
                    break
                val = buf.pop(0)
                print(f"  Consumer {cid}: got {val}")
            with cond_not_full:
                cond_not_full.notify()

    t_prod = threading.Thread(target=producer)
    t_cons = [threading.Thread(target=consumer, args=(i,)) for i in range(2)]

    t_prod.start()
    for t in t_cons: t.start()

    t_prod.join()
    for t in t_cons: t.join()
    print("  全スレッド完了")


demo_queue_producer_consumer()
demo_condition_producer_consumer()
```

## 使用場面

- **WebサーバのI/Oスレッドプール**: Apacheのprefork・worker MPMやNginxのworkerプロセスはpthreadsベースでリクエストを並列処理
- **並列演算**: OpenMPは`#pragma omp parallel`をpthreads呼び出しに展開して数値計算を並列化
- **バックグラウンドタスク**: GUIアプリでI/Oや重い処理をバックグラウンドスレッドに委譲してメインスレッドの応答性を維持
- **Go goroutineの基盤概念**: GoのGoroutineはM:NスレッドモデルでOSスレッド（=pthread）に多重化して動作する

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
