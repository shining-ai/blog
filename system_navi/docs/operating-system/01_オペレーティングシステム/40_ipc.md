---
sidebar_position: 4
displayed_sidebar: operatingSystemSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# プロセス間通信 (Inter-Process Communication)

## プロセス間通信とは

> 異なるプロセス間でデータを交換・同期するOSが提供する仕組みの総称（IPC）

です。<br/>

プロセスはそれぞれ独立したアドレス空間を持つため、直接メモリを共有できません。カーネルが仲介するIPCによってデータの受け渡しや同期を実現します。

## IPC手法の比較

| 手法 | 通信先 | 方向 | 速度 | 特徴 |
| --- | --- | --- | --- | --- |
| 無名パイプ | 親子プロセス間のみ | 単方向 | 中 | fork後に使用・カーネル内リングバッファ |
| 名前付きパイプ（FIFO） | 任意のプロセス間 | 単方向 | 中 | ファイルシステム上に存在・mkfifo |
| 共有メモリ | 同一ホスト内 | 双方向 | 最速 | メモリコピー不要・別途同期機構が必要 |
| メッセージキュー | 同一ホスト内 | 双方向 | 中 | 非同期・構造化データ・カーネルバッファリング |
| Unixドメインソケット | 同一ホスト内 | 双方向 | 速い | ファイルシステムのパスで識別 |
| TCPソケット | ネットワーク越し可 | 双方向 | 遅い（ネットワーク依存） | 異なるホスト間でも通信可能 |
| シグナル | 同一ホスト内 | 単方向 | 最速（通知のみ） | 軽量・データ本体は送れない |

## 共有メモリの仕組み（POSIX shm）

```
手順:
  1. shm_open()    → 共有メモリオブジェクトを作成（/dev/shm/name）
  2. ftruncate()   → サイズを設定
  3. mmap()        → プロセスのアドレス空間にマップ
  4. 読み書き       → 通常のポインタ操作でアクセス
  5. munmap()      → マッピング解除
  6. shm_unlink()  → オブジェクト削除

物理メモリ
  ┌──────────────┐
  │ 共有メモリ領域 │
  └──────┬───────┘
         │ mmap
    ┌────┴────┐
  [プロセスA] [プロセスB]
  アドレス空間  アドレス空間
```

## パイプのカーネル内実装

```
パイプ = カーネル内の固定サイズリングバッファ（通常64KB）

write端 ──→ [バッファ: 0〜65535] ──→ read端

- バッファが満杯 → write側がブロック
- バッファが空   → read側がブロック
- write端が全てclose → read側がEOFを受け取る
```

## 実装

```c title="POSIX共有メモリ（shm_open/mmap）を使った生産者-消費者（C）"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>
#include <sys/mman.h>
#include <sys/wait.h>
#include <semaphore.h>

#define SHM_NAME  "/ipc_example"
#define SEM_NAME  "/ipc_sem"
#define BUF_SIZE  256

typedef struct {
    sem_t sem;
    char  message[BUF_SIZE];
    int   ready;
} SharedData;

int main(void) {
    /* 共有メモリ作成 */
    int fd = shm_open(SHM_NAME, O_CREAT | O_RDWR, 0600);
    if (fd < 0) { perror("shm_open"); return 1; }
    ftruncate(fd, sizeof(SharedData));

    SharedData *shm = mmap(NULL, sizeof(SharedData),
                           PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);
    close(fd);

    /* セマフォ初期化（共有メモリ内に配置） */
    sem_init(&shm->sem, 1 /* プロセス間共有 */, 0);
    shm->ready = 0;

    pid_t pid = fork();
    if (pid == 0) {
        /* 子プロセス: 消費者 */
        sem_wait(&shm->sem);   /* 生産者が書くのを待つ */
        printf("[Consumer] 受信: \"%s\"\n", shm->message);
        munmap(shm, sizeof(SharedData));
        exit(0);
    }

    /* 親プロセス: 生産者 */
    usleep(50000); /* 子プロセス起動待ち */
    snprintf(shm->message, BUF_SIZE, "Hello from producer! PID=%d", getpid());
    printf("[Producer] 送信: \"%s\"\n", shm->message);
    sem_post(&shm->sem);   /* 消費者に通知 */

    wait(NULL);
    sem_destroy(&shm->sem);
    munmap(shm, sizeof(SharedData));
    shm_unlink(SHM_NAME);
    printf("[Main] 完了\n");
    return 0;
}
```

```python title="multiprocessing.QueueとsharedMemoryを使ったIPC（Python）"
import multiprocessing as mp
from multiprocessing import shared_memory
import struct
import time

# ─── Queue を使ったメッセージパッシング ──────────────────────────────────────
def producer(queue: mp.Queue, items: list) -> None:
    for item in items:
        print(f"[Producer] 送信: {item}")
        queue.put(item)
        time.sleep(0.05)
    queue.put(None)  # 終了シグナル

def consumer(queue: mp.Queue) -> None:
    while True:
        item = queue.get()
        if item is None:
            break
        print(f"[Consumer] 受信: {item}")

# ─── shared_memory を使った高速データ共有 ────────────────────────────────────
def writer_proc(shm_name: str, event_ready: mp.Event) -> None:
    shm = shared_memory.SharedMemory(name=shm_name)
    data = [1.0, 2.0, 3.0, 4.0]  # float64 x 4 = 32バイト
    for i, val in enumerate(data):
        struct.pack_into('d', shm.buf, i * 8, val)
    print(f"[Writer] {len(data)}個のfloatを書き込み")
    shm.close()
    event_ready.set()

def reader_proc(shm_name: str, event_ready: mp.Event) -> None:
    event_ready.wait()
    shm = shared_memory.SharedMemory(name=shm_name)
    values = [struct.unpack_from('d', shm.buf, i * 8)[0] for i in range(4)]
    print(f"[Reader] 読み込み: {values}")
    shm.close()

# ─── 実行 ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=== Queue メッセージパッシング ===")
    q: mp.Queue = mp.Queue()
    p1 = mp.Process(target=producer, args=(q, [10, 20, 30]))
    p2 = mp.Process(target=consumer, args=(q,))
    p1.start(); p2.start()
    p1.join();  p2.join()

    print("\n=== shared_memory 高速共有 ===")
    shm = shared_memory.SharedMemory(create=True, size=32)
    event = mp.Event()
    pw = mp.Process(target=writer_proc, args=(shm.name, event))
    pr = mp.Process(target=reader_proc, args=(shm.name, event))
    pw.start(); pr.start()
    pw.join();  pr.join()
    shm.close()
    shm.unlink()
```

## 使用場面

- **DBとWebサーバ間（Unix domain socket）**: PostgreSQLやMySQLはローカル接続にUnixドメインソケットを使用してTCPオーバーヘッドを回避
- **マイクロサービス（メッセージキュー）**: RabbitMQやKafkaでサービス間を非同期に接続し疎結合を実現
- **並列処理（共有メモリ）**: OpenMPやMPIの共有メモリモードで高速なデータ共有
- **シェルパイプライン（無名パイプ）**: `ls | grep | sort` のようなコマンド連結

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
