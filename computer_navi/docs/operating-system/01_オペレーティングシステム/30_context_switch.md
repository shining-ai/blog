---
sidebar_position: 3
displayed_sidebar: operatingSystemSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# コンテキストスイッチ (Context Switch)

## コンテキストスイッチとは

> CPUが実行するプロセス/スレッドを切り替える際に現在の実行状態を保存し、別の状態を復元する操作

です。<br/>

スケジューラが別のプロセスやスレッドを実行するとき、現在の実行コンテキスト（レジスタ値など）をPCB（Process Control Block）またはTCB（Thread Control Block）に退避してから次のコンテキストを読み込みます。

## 保存される状態

| カテゴリ | 保存内容 |
| --- | --- |
| 汎用レジスタ | RAX, RBX, RCX, RDX, RSI, RDI, R8〜R15（x86-64） |
| プログラムカウンタ | 次に実行する命令のアドレス（RIP） |
| スタックポインタ | 現在のスタックトップ（RSP）とベースポインタ（RBP） |
| フラグレジスタ | 演算結果フラグ（RFLAGS） |
| FPU/SIMD状態 | 浮動小数点レジスタ・XMM/YMM/ZMMレジスタ（fxsave/xsave） |
| TLBフラッシュ | プロセス切替時のみ: CR3レジスタ変更でTLBを無効化 |

## プロセス切替 vs スレッド切替

| 比較項目 | プロセス切替 | スレッド切替 |
| --- | --- | --- |
| コスト | 高い（数〜数十マイクロ秒） | 低い（数マイクロ秒） |
| TLBフラッシュ | あり（CR3レジスタ書き換え） | なし（同一アドレス空間） |
| メモリ空間 | 別アドレス空間 | 同一アドレス空間 |
| キャッシュ影響 | L1/L2キャッシュが汚染される | 比較的影響が少ない |
| 保存対象 | PCB全体（ファイルディスクリプタ等含む） | TCB（レジスタのみ） |

## コンテキストスイッチのコスト

```
一般的なコスト（x86-64 Linux）:
  スレッド切替:  1〜5 μs   （レジスタ保存/復元のみ）
  プロセス切替:  5〜50 μs  （TLBフラッシュ + キャッシュウォームアップ含む）

コスト内訳:
  1. 現在のレジスタをPCB/TCBへ保存    ← 数百ns
  2. 次のPCB/TCBからレジスタを復元    ← 数百ns
  3. TLBフラッシュ（プロセスのみ）    ← 数μs
  4. L1/L2キャッシュの再ウォームアップ ← 数μs〜数十μs
```

## コンテキストスイッチの発生タイミング

| タイミング | 説明 |
| --- | --- |
| タイムスライス終了 | スケジューラのタイマー割り込みで強制切替 |
| I/O待ち | システムコール（read/write等）でブロック |
| 明示的yield | sched_yield()でCPUを自発的に解放 |
| 優先度の高いプロセス起床 | ブロックが解除されたプロセスが現在のプロセスより優先度が高い場合 |
| ページフォルト | メモリアクセス違反でカーネルが割り込み処理 |

## 実装

```c title="getcontext/swapcontextによるユーザ空間コンテキストスイッチ（C）"
#include <stdio.h>
#include <stdlib.h>
#include <ucontext.h>

#define STACK_SIZE 65536

static ucontext_t ctx_main, ctx_task1, ctx_task2;
static char stack1[STACK_SIZE], stack2[STACK_SIZE];

static void task1(void) {
    for (int i = 0; i < 3; i++) {
        printf("[Task1] ステップ %d\n", i);
        swapcontext(&ctx_task1, &ctx_task2); /* Task2へ切替 */
    }
    printf("[Task1] 完了 → mainへ戻る\n");
    swapcontext(&ctx_task1, &ctx_main);
}

static void task2(void) {
    for (int i = 0; i < 3; i++) {
        printf("[Task2] ステップ %d\n", i);
        swapcontext(&ctx_task2, &ctx_task1); /* Task1へ切替 */
    }
    printf("[Task2] 完了 → mainへ戻る\n");
    swapcontext(&ctx_task2, &ctx_main);
}

int main(void) {
    /* Task1 コンテキスト設定 */
    getcontext(&ctx_task1);
    ctx_task1.uc_stack.ss_sp   = stack1;
    ctx_task1.uc_stack.ss_size = STACK_SIZE;
    ctx_task1.uc_link          = NULL;
    makecontext(&ctx_task1, task1, 0);

    /* Task2 コンテキスト設定 */
    getcontext(&ctx_task2);
    ctx_task2.uc_stack.ss_sp   = stack2;
    ctx_task2.uc_stack.ss_size = STACK_SIZE;
    ctx_task2.uc_link          = NULL;
    makecontext(&ctx_task2, task2, 0);

    printf("[Main] 協調スケジューリング開始\n");
    swapcontext(&ctx_main, &ctx_task1); /* Task1へ最初の切替 */
    printf("[Main] 全タスク完了\n");
    return 0;
}
```

```python title="perf_counter_nsとthreadingでコンテキストスイッチコスト計測（Python）"
import threading
import time
from statistics import mean, stdev

# ─── コンテキストスイッチのコスト計測 ────────────────────────────────────────
def measure_context_switch(n_switches: int = 10_000) -> list[float]:
    """2スレッド間でイベントを交互に通知してコスト計測"""
    event_a = threading.Event()
    event_b = threading.Event()
    latencies: list[float] = []

    def thread_b():
        for _ in range(n_switches // 2):
            event_a.wait(); event_a.clear()
            event_b.set()

    t = threading.Thread(target=thread_b, daemon=True)
    t.start()

    for _ in range(n_switches // 2):
        t0 = time.perf_counter_ns()
        event_a.set()
        event_b.wait(); event_b.clear()
        t1 = time.perf_counter_ns()
        latencies.append((t1 - t0) / 1_000)  # ns → μs

    t.join()
    return latencies

# ─── 協調スケジューリング（コルーチン） ──────────────────────────────────────
def producer(items: list[int]):
    for item in items:
        print(f"  [producer] 生成: {item}")
        yield item

def consumer(gen):
    for item in gen:
        print(f"  [consumer] 消費: {item}")

# ─── 実行 ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=== スレッドコンテキストスイッチ コスト計測 ===")
    lats = measure_context_switch(2_000)
    print(f"  平均: {mean(lats):.1f} μs")
    print(f"  標準偏差: {stdev(lats):.1f} μs")
    print(f"  最小: {min(lats):.1f} μs")
    print(f"  最大: {max(lats):.1f} μs")
    # ※ Pythonスレッドは OSスレッドなので実際のコンテキストスイッチが発生する

    print("\n=== コルーチン（ユーザ空間の協調スケジューリング） ===")
    consumer(producer([10, 20, 30]))
```

## 使用場面

- **協調型スケジューリング（コルーチン）**: Python の asyncio やLuaコルーチンはユーザ空間でコンテキストを切り替えOSを介さないため高速
- **Go goroutine（軽量コンテキスト）**: Goランタイムが独自スケジューラを持ち、OSスレッドより軽量なコンテキストスイッチを実現（数百ns）
- **ファイバー/グリーンスレッド**: libcoroやBoost.Coroutineがucontext_tを使ってユーザ空間コルーチンを実装
- **データベース接続プール**: スレッドの代わりにコルーチンを使ってコンテキストスイッチコストを削減

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
