---
sidebar_position: 6
displayed_sidebar: operatingSystemSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# デッドロック (Deadlock)

## デッドロックとは

デッドロックとは、

> 複数プロセスが互いに相手の保持するリソースを待ち合い、すべてが永久に進めなくなる状態

です。<br/>

デッドロックは1971年にCoffmanらが定式化しました。OSの教科書で必ず登場する概念であり、データベースのロック管理・分散システム・カーネル開発など、あらゆる並行システムで考慮が必要です。

## Coffman条件（4条件すべてが同時に成立したときにデッドロックが発生する）

| 条件 | 説明 | 破る方法の例 |
| --- | --- | --- |
| 相互排除（Mutual Exclusion） | リソースは一度に1プロセスしか使用できない | 読み取り専用にする（常に破れるとは限らない） |
| 保持と待機（Hold and Wait） | リソースを保持しながら他のリソースを待つ | すべてのリソースを一括取得し、取れなければ全て放棄 |
| 横取り不可（No Preemption） | 保持中のリソースを強制的に奪えない | OSが強制的にリソースを剥奪する（ロールバック必要） |
| 循環待ち（Circular Wait） | プロセスA→B→C→Aの円環状待ち関係が存在 | リソースに順序番号を付け、常に昇順で取得する |

## 対処戦略の比較

| 戦略 | 概要 | 長所 | 短所 |
| --- | --- | --- | --- |
| 予防（Prevention） | 4条件のどれか1つを恒久的に禁止 | デッドロック発生ゼロ | リソース使用効率が下がる |
| 回避（Avoidance） | 要求時に安全状態を確認（銀行家アルゴリズム） | 安全な範囲で最大限のリソースを活用 | 最大要求量の事前申告が必要 |
| 検出+復旧（Detection & Recovery） | デッドロックを検出後に強制終了/ロールバック | 事前制限が不要 | 復旧コストが高い |
| 無視（Ostrich Algorithm） | デッドロックを無視する | 実装コストゼロ | 稀だが発生時は手動再起動が必要 |

## 銀行家アルゴリズム

安全状態とは、全プロセスが最終的に完了できるような資源割り当て順序（安全シーケンス）が存在する状態です。

```
行列定義:
  n プロセス、m リソース種類とする

  Allocation[n][m] : 各プロセスが現在保持しているリソース量
  Max[n][m]        : 各プロセスが最大要求するリソース量
  Need[n][m]       : Max - Allocation（あと必要な量）
  Available[m]     : 現在空きのリソース量

安全状態の判定手順（Banker's Safety Algorithm）:
  1. Work = Available のコピー
     Finish[i] = false（全プロセス）
  2. Finish[i] == false かつ Need[i] <= Work を満たす i を探す
     見つからなければ step 4 へ
  3. Work += Allocation[i]、Finish[i] = true にして step 2 へ
  4. 全 Finish[i] == true なら安全状態、そうでなければ危険状態

例（リソース A:10, B:5, C:7）:
         Allocation   Max       Need      Available
  P0:    0 1 0       7 5 3    7 4 3      3 3 2
  P1:    2 0 0       3 2 2    1 2 2
  P2:    3 0 2       9 0 2    6 0 0
  P3:    2 1 1       2 2 2    0 1 1
  P4:    0 0 2       4 3 3    4 3 1

  安全シーケンス: <P1, P3, P4, P2, P0>
```

## 資源割り当てグラフとサイクル検出

```
ノード:
  プロセス: 円（○）
  リソース: 四角（□、ドットはインスタンス数）

辺の種類:
  要求辺: P → R（プロセスがリソースを要求中）
  割当辺: R → P（リソースがプロセスに割り当て済み）

デッドロック判定:
  リソースが単一インスタンスの場合: グラフにサイクルがあれば必ずデッドロック
  複数インスタンスの場合: サイクルはデッドロックの必要条件だが十分条件ではない

サイクル検出: DFS + 訪問済みスタックによる色分け（白/灰/黒）
```

## 実装

```c title="pthread_mutex 2本でデッドロック再現と trylock による回避（C）"
#include <stdio.h>
#include <pthread.h>
#include <unistd.h>

static pthread_mutex_t lock_a = PTHREAD_MUTEX_INITIALIZER;
static pthread_mutex_t lock_b = PTHREAD_MUTEX_INITIALIZER;

/* デッドロックが発生するスレッド: A → B の順で取得 */
static void *thread_ab(void *arg) {
    (void)arg;
    pthread_mutex_lock(&lock_a);
    printf("Thread AB: lock_a 取得\n");
    usleep(1000);  /* 意図的に遅延を入れてデッドロックを誘発 */
    /* ここで thread_ba が lock_b を取得済みのためデッドロック */
    pthread_mutex_lock(&lock_b);
    printf("Thread AB: lock_b 取得（デッドロックなら到達しない）\n");
    pthread_mutex_unlock(&lock_b);
    pthread_mutex_unlock(&lock_a);
    return NULL;
}

/* デッドロックが発生するスレッド: B → A の順で取得（循環待ちを生む） */
static void *thread_ba(void *arg) {
    (void)arg;
    pthread_mutex_lock(&lock_b);
    printf("Thread BA: lock_b 取得\n");
    usleep(1000);
    pthread_mutex_lock(&lock_a);
    printf("Thread BA: lock_a 取得（デッドロックなら到達しない）\n");
    pthread_mutex_unlock(&lock_a);
    pthread_mutex_unlock(&lock_b);
    return NULL;
}

/* trylock 回避版: 取れなければリトライ */
static void *thread_trylock(void *arg) {
    int id = *(int *)arg;
    int retry = 0;
    while (1) {
        if (pthread_mutex_trylock(&lock_a) == 0) {
            if (pthread_mutex_trylock(&lock_b) == 0) {
                printf("Thread %d: 両ロック取得成功（リトライ=%d回）\n", id, retry);
                pthread_mutex_unlock(&lock_b);
                pthread_mutex_unlock(&lock_a);
                break;
            }
            pthread_mutex_unlock(&lock_a);  /* 一方だけ取れた場合は手放す */
        }
        retry++;
        usleep(100);  /* バックオフ */
    }
    return NULL;
}

int main(void) {
    printf("=== デッドロック回避デモ（trylock版のみ実行）===\n");
    int ids[2] = {0, 1};
    pthread_t t1, t2;
    pthread_create(&t1, NULL, thread_trylock, &ids[0]);
    pthread_create(&t2, NULL, thread_trylock, &ids[1]);
    pthread_join(t1, NULL);
    pthread_join(t2, NULL);
    return 0;
    /* デッドロック版の実行は意図的にコメントアウト:
     * pthread_create(&t1, NULL, thread_ab, NULL);
     * pthread_create(&t2, NULL, thread_ba, NULL);
     * → プロセスが永久にハングする */
}
```

```python title="threading.Lock 2本でデッドロック再現と解決（ロック順序統一）（Python）"
import threading
import time

lock_a = threading.Lock()
lock_b = threading.Lock()

# ─── デッドロック版（コメントアウト・実行しない）──────────────────────────
def bad_thread_ab():
    """A → B の順で取得（B → A と循環してデッドロック）"""
    with lock_a:
        print("bad_ab: lock_a 取得")
        time.sleep(0.01)
        with lock_b:  # bad_ba が lock_b を持っていると永久ブロック
            print("bad_ab: lock_b 取得（デッドロックなら到達しない）")

def bad_thread_ba():
    """B → A の順で取得"""
    with lock_b:
        print("bad_ba: lock_b 取得")
        time.sleep(0.01)
        with lock_a:
            print("bad_ba: lock_a 取得（デッドロックなら到達しない）")

# ─── 解決版: ロック取得順序を統一（常に A → B）──────────────────────────────
def good_thread_1(name: str):
    """常に lock_a → lock_b の順で取得"""
    with lock_a:
        print(f"{name}: lock_a 取得")
        time.sleep(0.01)
        with lock_b:
            print(f"{name}: lock_b 取得 → 処理完了")

def good_thread_2(name: str):
    """同様に常に lock_a → lock_b（循環待ちが発生しない）"""
    with lock_a:
        print(f"{name}: lock_a 取得")
        time.sleep(0.01)
        with lock_b:
            print(f"{name}: lock_b 取得 → 処理完了")


print("=== デッドロック解決版（ロック順序統一）===")
t1 = threading.Thread(target=good_thread_1, args=("Thread-1",))
t2 = threading.Thread(target=good_thread_2, args=("Thread-2",))
t1.start()
t2.start()
t1.join()
t2.join()
print("全スレッド完了（デッドロックなし）")

# ─── タイムアウトで検出する方法 ───────────────────────────────────────────────
def thread_with_timeout(name: str):
    acquired = lock_a.acquire(timeout=0.5)
    if not acquired:
        print(f"{name}: タイムアウト → デッドロック疑いを検知")
        return
    try:
        print(f"{name}: lock_a 取得")
    finally:
        lock_a.release()

t3 = threading.Thread(target=thread_with_timeout, args=("TimeoutThread",))
t3.start()
t3.join()
```

## 使用場面

- **DBの2相ロッキング（2PL）**: PostgreSQLは行ロックの循環をlock graphで検出し、デッドロックを自動ロールバックで解消
- **分散システム**: 分散デッドロック検出にはWait-For Graph（WFG）を用いた検出プロトコルが使われる
- **OS開発**: Linuxカーネルの lockdep（ロック依存関係検証）ツールは起動時にデッドロック可能性を静的に検出する

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
