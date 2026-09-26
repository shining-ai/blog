---
sidebar_position: 7
displayed_sidebar: operatingSystemSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# メモリ管理 (OS Memory Management)

## OSメモリ管理とは

OSメモリ管理とは、

> OSがプロセスへの物理メモリ割り当て・回収・仮想アドレスとのマッピングを管理する仕組み

です。<br/>

現代のOSは仮想アドレス空間を用いてプロセスを互いに隔離し、物理メモリの断片化を防ぎます。Linuxは小さな割り当てにはスラブアロケータ、ページフレーム管理にはバディシステムを使い、ユーザ空間の`malloc`はglibc内で複数の戦略を組み合わせて実装されています。

## malloc の内部実装

| 割り当てサイズ | 使用するシステムコール | 説明 |
| --- | --- | --- |
| 小〜中（≤128KB） | `brk` / `sbrk` | ヒープ領域を上方向に拡張。解放しても仮想アドレス空間は縮まりにくい |
| 大（>128KB） | `mmap(MAP_ANONYMOUS)` | 任意のアドレスにページをマップ。`free`時に`munmap`でOSへ即時返却 |

```
プロセスの仮想アドレス空間（64bit Linux、低アドレスが下）:

  0x0000...0000  ← NULL（アクセス禁止）
  テキスト(コード)
  データ（初期化済み）
  BSS（未初期化）
  ヒープ ↑ 成長方向（brk で拡張）
  ...
  mmap 領域（共有ライブラリ・匿名マッピング）
  スタック ↓ 成長方向
  カーネル空間（ユーザ不可視）
  0xFFFF...FFFF
```

## Linuxカーネルアロケータ

### バディシステム（Buddy System）

物理ページフレームを 2^n ページ単位のブロックで管理します。

```
order: 0   1    2    3    4
       1P  2P   4P   8P   16P

4ページ要求 → order-2ブロックを割り当て
2ページ解放 → 隣接する "buddy" ブロックと合体 → order-3ブロックに昇格
```

### スラブアロケータ（SLUB）

同サイズのオブジェクト（task_struct, inode, mm_struct等）専用のプールです。

```
kmem_cache（例: task_struct用）
  └─ slab1: [obj][obj][obj]...
  └─ slab2: [obj][obj][free]...
  └─ slab3: [free][free][free]... ← 次の割り当てはここから

利点: 内部断片化ゼロ・初期化済みオブジェクトの再利用
```

## OOM Killer

物理メモリが枯渇したとき、Linuxカーネルは`oom_score`をもとにプロセスを選択して強制終了します。

```
oom_score の計算要素:
  - 使用メモリ量（大きいほど高スコア）
  - プロセスの実行時間（長いほど低スコア）
  - /proc/PID/oom_score_adj の手動調整値（-1000〜1000）

確認コマンド:
  cat /proc/$(pgrep firefox)/oom_score
  echo -500 > /proc/$(pgrep sshd)/oom_score_adj  # 保護したい場合
```

## カーネルメモリゾーン

| ゾーン | 64bitアドレス範囲（目安） | 用途 |
| --- | --- | --- |
| ZONE_DMA | 0〜16MB | ISA DMAデバイス用（古い制約の名残） |
| ZONE_DMA32 | 16MB〜4GB | 32bitアドレスしか扱えないPCIデバイス用 |
| ZONE_NORMAL | 4GB〜 | 汎用カーネル・ユーザスペースページ |
| ZONE_HIGHMEM | 32bit OSのみ存在 | 4GB超の物理メモリ（32bitカーネル用） |

## 実装

```c title="sbrk() で簡易バンプアロケータを実装（C）"
#include <stdio.h>
#include <unistd.h>
#include <string.h>
#include <stdint.h>

/* 最小限のバンプアロケータ（解放機能なし） */
typedef struct {
    void    *heap_start;
    void    *current;
    size_t   total_allocated;
} BumpAllocator;

static BumpAllocator g_alloc;

void bump_init(void) {
    g_alloc.heap_start    = sbrk(0);   /* 現在のプログラムブレークを取得 */
    g_alloc.current       = g_alloc.heap_start;
    g_alloc.total_allocated = 0;
}

void *bump_alloc(size_t size) {
    /* アライメント調整（8バイト境界） */
    size_t aligned = (size + 7) & ~(size_t)7;

    void *ptr = sbrk((intptr_t)aligned);
    if (ptr == (void *)-1) {
        return NULL;  /* sbrk失敗 */
    }
    g_alloc.total_allocated += aligned;
    return ptr;
}

void bump_reset(void) {
    /* 全領域を一括解放（ヒープをスタートに戻す） */
    brk(g_alloc.heap_start);
    g_alloc.current       = g_alloc.heap_start;
    g_alloc.total_allocated = 0;
}

int main(void) {
    bump_init();

    char *s = bump_alloc(64);
    int  *arr = bump_alloc(sizeof(int) * 10);

    if (s && arr) {
        strncpy(s, "hello, bump allocator", 63);
        for (int i = 0; i < 10; i++) arr[i] = i * i;

        printf("文字列: %s\n", s);
        printf("配列: ");
        for (int i = 0; i < 10; i++) printf("%d ", arr[i]);
        printf("\n合計割り当て: %zu バイト\n", g_alloc.total_allocated);
    }

    bump_reset();
    printf("ヒープをリセット完了\n");
    return 0;
}
```

```python title="resource.getrlimit でメモリ制限確認・tracemalloc でヒープスナップショット（Python）"
import resource
import tracemalloc
import linecache

# ─── リソース制限の確認と設定 ──────────────────────────────────────────────────
def show_memory_limits():
    soft, hard = resource.getrlimit(resource.RLIMIT_AS)
    rss_soft, rss_hard = resource.getrlimit(resource.RLIMIT_RSS)

    def fmt(v):
        if v == resource.RLIM_INFINITY:
            return "無制限"
        return f"{v / 1024 / 1024:.0f}MB"

    print(f"仮想メモリ制限 (RLIMIT_AS) : soft={fmt(soft)}, hard={fmt(hard)}")
    print(f"常駐メモリ制限 (RLIMIT_RSS) : soft={fmt(rss_soft)}, hard={fmt(rss_hard)}")

# ─── tracemalloc でメモリ割り当てを追跡 ───────────────────────────────────────
def trace_allocations():
    tracemalloc.start(10)  # 10フレームのスタックトレースを保存

    # 意図的にメモリを割り当て
    data = [list(range(1000)) for _ in range(100)]

    snapshot = tracemalloc.take_snapshot()
    top_stats = snapshot.statistics("lineno")

    print("\n=== トップ5メモリ割り当て箇所 ===")
    for i, stat in enumerate(top_stats[:5], 1):
        frame = stat.traceback[0]
        print(f"{i}. {frame.filename}:{frame.lineno} - "
              f"{stat.size / 1024:.1f}KB ({stat.count}回)")

    tracemalloc.stop()
    del data

# ─── /proc/self/status からメモリ使用量を読む ─────────────────────────────────
def read_proc_status():
    try:
        with open("/proc/self/status") as f:
            for line in f:
                if line.startswith(("VmRSS", "VmPeak", "VmSize")):
                    print(f"  {line.rstrip()}")
    except FileNotFoundError:
        print("  /proc/self/status は Linux のみ利用可能")

print("=== メモリ制限情報 ===")
show_memory_limits()
print("\n=== 現在のメモリ使用状況 (/proc/self/status) ===")
read_proc_status()
trace_allocations()
```

## 使用場面

- **Dockerメモリ制限（cgroups v2）**: `memory.max`でコンテナのメモリ上限を設定。超過するとOOM Killerが起動される
- **JVMヒープ管理**: `-Xmx`でJVMヒープ上限を設定。G1GCやZGCはリージョンベースのメモリ管理を実装
- **Redis maxmemory**: `maxmemory`設定超過時にLRU/LFU/allkeys-randomポリシーでキーを退避

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
