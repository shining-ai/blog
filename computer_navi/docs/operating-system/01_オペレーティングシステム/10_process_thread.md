---
sidebar_position: 1
displayed_sidebar: operatingSystemSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# プロセスとスレッド (Process & Thread)

## プロセスとスレッドの違い

プロセスとは、

> OS が資源割り当ての単位として管理する独立したプログラムの実行インスタンス

スレッドとは、

> プロセス内でメモリ空間を共有しながら独立して実行されるスケジューリングの最小単位

です。
<br/>

プロセスは独立したアドレス空間を持ちますが、スレッドはプロセス内のヒープ・グローバル変数・ファイルディスクリプタを共有します。

## 比較


| 項目 | プロセス | スレッド |
| --- | --- | --- |
| メモリ空間 | 独立 | 共有 |
| 生成コスト | 高い（fork） | 低い（pthread_create） |
| 切り替えコスト | 高い（TLB フラッシュ） | 低い |
| 障害影響 | 他プロセスに影響しない | 同プロセス全体に影響 |
| 通信 | IPC（パイプ・共有メモリ等） | 共有変数（要同期） |

## スケジューリングアルゴリズム

| アルゴリズム | 特徴 |
| --- | --- |
| FIFO | シンプル・飢餓あり |
| ラウンドロビン | タイムスライスで公平 |
| 優先度スケジューリング | 高優先度タスク優先 |
| CFS（Linux） | 仮想実行時間で公平 |

## 実装

```c title="POSIX スレッドと Mutex（C）"
#include <stdio.h>
#include <pthread.h>

#define N_THREADS 4
#define ITERATIONS 1000000

static long counter = 0;
static pthread_mutex_t mutex = PTHREAD_MUTEX_INITIALIZER;

void *increment(void *arg) {
    (void)arg;
    for (int i = 0; i < ITERATIONS; i++) {
        pthread_mutex_lock(&mutex);
        counter++;
        pthread_mutex_unlock(&mutex);
    }
    return NULL;
}

int main(void) {
    pthread_t threads[N_THREADS];

    for (int i = 0; i < N_THREADS; i++)
        pthread_create(&threads[i], NULL, increment, NULL);

    for (int i = 0; i < N_THREADS; i++)
        pthread_join(threads[i], NULL);

    printf("counter = %ld (期待値: %d)\n",
           counter, N_THREADS * ITERATIONS);
    return 0;
}
```

```python title="マルチプロセスとスレッドの比較（Python）"
import multiprocessing
import threading
import time

def cpu_bound(n: int) -> int:
    """CPU バウンドなタスク（素数判定）"""
    count = 0
    for i in range(2, n):
        if all(i % j != 0 for j in range(2, int(i**0.5) + 1)):
            count += 1
    return count

N = 10000
WORKERS = 4

# スレッド（GIL により CPU バウンドは並列化されない）
t0 = time.perf_counter()
threads = [threading.Thread(target=cpu_bound, args=(N,)) for _ in range(WORKERS)]
for t in threads: t.start()
for t in threads: t.join()
t_thread = time.perf_counter() - t0

# プロセス（真の並列実行）
t0 = time.perf_counter()
with multiprocessing.Pool(WORKERS) as pool:
    pool.map(cpu_bound, [N] * WORKERS)
t_process = time.perf_counter() - t0

print(f"スレッド:  {t_thread:.2f}s")
print(f"プロセス: {t_process:.2f}s")
print(f"高速化:    {t_thread/t_process:.1f}x（プロセスが有利）")
```

## 使用場面

- **Webサーバー**: マルチプロセス（Gunicorn）またはスレッドプール（スレッドモデル）
- **データ処理**: Python の multiprocessing で GIL を回避
- **ゲームエンジン**: レンダリング・物理・AI を別スレッドで並列処理
- **データベース**: 接続ごとにスレッドまたはコルーチンを割り当て

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
