---
sidebar_position: 2
displayed_sidebar: operatingSystemSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# プロセススケジューリング (Process Scheduling)

## プロセススケジューリングとは

> OSがCPU時間をプロセス/スレッドに割り当てる政策と仕組み

です。<br/>

CPUは同時に1つのスレッドしか実行できないため、スケジューラが複数のプロセスをどの順番でどれだけの時間実行するかを決定します。

## スケジューリングの目標

| 目標 | 説明 |
| --- | --- |
| CPU利用率最大化 | CPUをアイドル状態にしない（目標: 90〜99%） |
| 応答時間最小化 | ユーザーへの最初の応答を早くする（インタラクティブ性） |
| スループット最大化 | 単位時間あたりの完了ジョブ数を増やす |
| 公平性 | 各プロセスにCPU時間を平等に配分する |
| 待ち時間最小化 | プロセスがレディキューで待つ時間を短くする |

## アルゴリズム比較

| アルゴリズム | 概要 | 飢餓 | 特徴 |
| --- | --- | --- | --- |
| FCFS（先入先出） | 到着順に実行 | なし | 実装簡単・コンボイ効果あり |
| SJF（最短ジョブ優先） | 実行時間が短いものを優先 | あり | 平均待ち時間最小・実行時間の予測が必要 |
| SRTF（プリエンプティブSJF） | 残り実行時間が最短のものを優先 | あり | 最適な平均待ち時間・オーバーヘッド大 |
| ラウンドロビン（RR） | タイムスライスで順番に実行 | なし | 公平・タイムスライス設定が重要 |
| 優先度スケジューリング | 優先度が高いものを優先 | あり（低優先度） | エージング（時間経過で優先度上昇）で飢餓防止 |
| 多段フィードバックキュー | 複数キューで動的に優先度調整 | なし | 最も汎用的・Linux/Windowsで採用 |

## ガントチャートによる比較

プロセス情報:

```
プロセス  到着時刻  実行時間
P1        0         6
P2        1         4
P3        2         2
```

**FCFS（先入先出）:**

```
| P1(0-6) | P2(6-10) | P3(10-12) |
0         6         10          12

平均待ち時間: (0 + 5 + 8) / 3 = 4.33
```

**SJF（非プリエンプティブ）:**

```
| P1(0-6) | P3(6-8) | P2(8-12) |
0         6        8           12

平均待ち時間: (0 + 7 + 4) / 3 = 3.67
```

**ラウンドロビン（タイムスライス=2）:**

```
| P1(0-2) | P2(2-4) | P3(4-6) | P1(6-8) | P2(8-10) | P1(10-12) |
0         2        4         6         8          10          12

平均待ち時間: (0+6+8)/3 → コンテキスト数は多いが応答性が高い
```

## LinuxのCFS（Completely Fair Scheduler）

LinuxはカーネルバージョンFrom 2.6.23からCFSを採用しています。

```
仮想実行時間 (vruntime) = 実際の実行時間 × (デフォルト重み / プロセスの重み)

- 赤黒木（Red-Black Tree）でvruntimeの小さいプロセスをO(log n)で選択
- nice値（-20〜+19）が重みに変換される
- ターゲットレイテンシ（通常6ms）を実行可能プロセス数で均等分割
```

| 項目 | 内容 |
| --- | --- |
| データ構造 | 赤黒木（vruntime順） |
| 選択コスト | O(log n) |
| 公平性保証 | vruntimeが最小のプロセスを選択 |
| プリエンプション | タイマー割り込みで定期的に再スケジュール |

## 実装

```c title="優先度キューを使ったスケジューラシミュレーション（C）"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX_PROCS 16

typedef struct {
    int  pid;
    int  priority;   /* 小さいほど高優先 */
    int  burst;      /* 残り実行時間 */
    int  arrival;    /* 到着時刻 */
} Process;

/* 簡易最小ヒープ（優先度順） */
typedef struct {
    Process heap[MAX_PROCS];
    int     size;
} PQueue;

static void pq_push(PQueue *q, Process p) {
    int i = q->size++;
    q->heap[i] = p;
    /* バブルアップ */
    while (i > 0) {
        int parent = (i - 1) / 2;
        if (q->heap[parent].priority <= q->heap[i].priority) break;
        Process tmp = q->heap[parent];
        q->heap[parent] = q->heap[i];
        q->heap[i] = tmp;
        i = parent;
    }
}

static Process pq_pop(PQueue *q) {
    Process top = q->heap[0];
    q->heap[0] = q->heap[--q->size];
    /* バブルダウン */
    int i = 0;
    while (1) {
        int l = 2*i+1, r = 2*i+2, smallest = i;
        if (l < q->size && q->heap[l].priority < q->heap[smallest].priority)
            smallest = l;
        if (r < q->size && q->heap[r].priority < q->heap[smallest].priority)
            smallest = r;
        if (smallest == i) break;
        Process tmp = q->heap[smallest];
        q->heap[smallest] = q->heap[i];
        q->heap[i] = tmp;
        i = smallest;
    }
    return top;
}

int main(void) {
    /* プロセス定義: {pid, priority, burst, arrival} */
    Process procs[] = {
        {1, 3, 6, 0},
        {2, 1, 4, 1},
        {3, 2, 2, 2},
        {4, 1, 3, 3},
    };
    int n = sizeof(procs) / sizeof(procs[0]);

    PQueue ready = {.size = 0};
    int time = 0, done = 0, idx = 0;

    printf("時刻  PID  優先度  残り時間\n");
    printf("--------------------------------\n");

    while (done < n) {
        /* 現在時刻までに到着したプロセスをキューへ */
        for (int i = 0; i < n; i++) {
            if (procs[i].arrival == time)
                pq_push(&ready, procs[i]);
        }

        if (ready.size == 0) { time++; continue; }

        Process cur = pq_pop(&ready);
        printf("%3d   P%d   %3d     %3d→%d\n",
               time, cur.pid, cur.priority,
               cur.burst, cur.burst - 1);
        cur.burst--;
        time++;

        if (cur.burst > 0) {
            pq_push(&ready, cur);
        } else {
            printf("        P%d 完了（time=%d）\n", cur.pid, time);
            done++;
        }
    }
    return 0;
}
```

```python title="heapqを使った優先度スケジューラとCFS vruntimeシミュレーション（Python）"
import heapq
from dataclasses import dataclass, field
from typing import List

# ─── 優先度スケジューラ ───────────────────────────────────────────────────────
@dataclass(order=True)
class Process:
    priority: int
    pid: int = field(compare=False)
    burst: int = field(compare=False)
    arrival: int = field(compare=False)

def priority_scheduler(processes: List[Process]) -> None:
    heap: list = []
    time = 0
    procs = sorted(processes, key=lambda p: p.arrival)
    idx = 0
    print(f"{'時刻':>4}  {'PID':>4}  {'優先度':>6}  {'実行時間':>8}")
    print("-" * 30)
    while heap or idx < len(procs):
        while idx < len(procs) and procs[idx].arrival <= time:
            heapq.heappush(heap, procs[idx])
            idx += 1
        if not heap:
            time += 1
            continue
        cur = heapq.heappop(heap)
        print(f"{time:>4}  P{cur.pid:<3}  {cur.priority:>6}  {cur.burst:>8}")
        time += cur.burst

# ─── CFS vruntime シミュレーション ────────────────────────────────────────────
DEFAULT_WEIGHT = 1024  # nice=0 の重み

NICE_TO_WEIGHT = {
    -20: 88761, -15: 29154, -10: 9548, -5: 3121,
      0: 1024,   5:  335,  10:  110,  15:   36, 20: 15
}

def cfs_vruntime(actual_ns: int, nice: int) -> int:
    """実行時間（ns）をvruntimeに変換"""
    weight = NICE_TO_WEIGHT.get(nice, 1024)
    return actual_ns * DEFAULT_WEIGHT // weight

# ─── 実行例 ───────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    procs = [
        Process(priority=3, pid=1, burst=6, arrival=0),
        Process(priority=1, pid=2, burst=4, arrival=1),
        Process(priority=2, pid=3, burst=2, arrival=2),
    ]
    print("=== 優先度スケジューラ ===")
    priority_scheduler(procs)

    print("\n=== CFS vruntime 計算 ===")
    runs = [(1, 0, 10_000_000), (2, 5, 10_000_000), (3, -5, 10_000_000)]
    for pid, nice, actual_ns in runs:
        vr = cfs_vruntime(actual_ns, nice)
        print(f"P{pid}  nice={nice:+d}  actual={actual_ns//1_000_000}ms"
              f"  vruntime={vr//1_000_000}ms")
    # nice=-5 のプロセスはvruntimeが小さく→次に選択されにくい（より多くCPUを得る）
```

## 使用場面

- **RTOS (EDF: Earliest Deadline First)**: デッドラインが最も近いタスクを優先実行し、リアルタイム性を保証する
- **Linux tasklet/workqueue**: ソフト割り込みのスケジューリングにCFSとは別の仕組みを使用
- **Kubernetes CPUリクエスト**: コンテナのCPU要求をcgroupsのCFSクォータに変換してスロットリング制御
- **ゲームエンジン**: フレームレート維持のためレンダリングスレッドに高優先度を割り当て

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
