---
sidebar_position: 1
displayed_sidebar: operatingSystemSidebar
---

# プロセスとスレッド

## 概要

プロセスとは、

> 実行中のプログラムのインスタンスであり、独立したメモリ空間・ファイルディスクリプタ・PID を持つ OS の基本的な資源管理単位

です。

スレッドは同じプロセス内で動作し、コードセグメント・データセグメント・ヒープを共有しつつ、スタックとレジスタセットは独立します。

## プロセスとスレッドの比較

| 属性 | プロセス | スレッド |
|---|---|---|
| アドレス空間 | 独立 | 共有（プロセス内） |
| 生成コスト | 高い（fork: ページテーブルコピー） | 低い（スタックのみ） |
| 通信方法 | IPC（パイプ・ソケット・共有メモリ） | 共有メモリ直接アクセス |
| 障害分離 | クラッシュしても他プロセスに影響なし | バグが他スレッドに波及 |
| 並列性 | マルチコア活用 | マルチコア活用 |
| 例 | Chrome の各タブ | Web サーバの各接続処理 |

## プロセスの状態遷移

```
          fork()
NEW ──────────────→ READY
                     ↓↑ スケジューラ
                   RUNNING
                   /     \
          wait()  /       \  I/O要求
                ↓          ↓
           ZOMBIE       BLOCKED（WAITING）
                ↑          ↓
             exit()   I/O完了 → READY
```

## プロセスのメモリレイアウト

```
高アドレス  ┌──────────────┐
            │ カーネル空間  │  （リング0）
            ├──────────────┤
            │    スタック   │  ← rsp / ローカル変数
            │    ↓          │
            │               │
            │    ↑          │
            │    ヒープ     │  ← malloc / new
            ├──────────────┤
            │  BSS セグメント│  未初期化グローバル変数
            │  データセグメント│  初期化済みグローバル変数
低アドレス  │  テキスト     │  コード（実行可能）
            └──────────────┘
```

## 実装

```c title="マルチスレッドの例（pthreads）"
#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>

#define NTHREADS 4

typedef struct { int id; long sum; } Arg;

void *worker(void *arg) {
    Arg *a = (Arg *)arg;
    a->sum = 0;
    for (int i = a->id * 1000; i < (a->id + 1) * 1000; i++)
        a->sum += i;
    return NULL;
}

int main(void) {
    pthread_t threads[NTHREADS];
    Arg       args[NTHREADS];
    long      total = 0;

    for (int i = 0; i < NTHREADS; i++) {
        args[i].id = i;
        pthread_create(&threads[i], NULL, worker, &args[i]);
    }
    for (int i = 0; i < NTHREADS; i++) {
        pthread_join(threads[i], NULL);
        total += args[i].sum;
    }
    printf("Total: %ld\n", total);  // 0〜3999の合計 = 7998000
    return 0;
}
```

```python title="Python でのプロセス・スレッド"
import threading, multiprocessing, time

def task(name: str) -> None:
    print(f"{name}: start")
    time.sleep(0.1)
    print(f"{name}: done")

# スレッド（GIL の制約あり）
t = threading.Thread(target=task, args=("Thread",))
t.start(); t.join()

# プロセス（GIL を回避可能）
p = multiprocessing.Process(target=task, args=("Process",))
p.start(); p.join()
```

## 使用場面

- **Web サーバ**: 接続ごとにスレッドまたはプロセスを割り当て（Apache: prefork/worker MPM）
- **ブラウザ**: タブをプロセス分離してクラッシュ影響を最小化（Chrome）
- **並列計算**: データ並列処理にマルチプロセス（Python: multiprocessing）
