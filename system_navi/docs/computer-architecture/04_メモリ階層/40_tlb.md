---
sidebar_position: 4
displayed_sidebar: computerArchitectureSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# TLB とアドレス変換 (TLB & Address Translation)

## TLB とは

TLB（Translation Lookaside Buffer）とは、

> 仮想アドレスから物理アドレスへの変換結果をキャッシュするハードウェア構造で、ページテーブルウォークのコストを1サイクル程度に削減する

です。
<br/>

ページテーブルウォークにはメモリへの複数回アクセス（x86-64では4段階で最大4回）が必要で、100〜数百サイクルかかります。TLBがヒットすれば変換は1サイクルで完了するため、TLBのヒット率はプログラムのメモリアクセス性能に直結します。

## TLB の役割

```
仮想アドレス
    │
    ├─ TLB ヒット（約1サイクル）
    │       ↓
    │   物理アドレス（即座に返却）
    │
    └─ TLB ミス（100〜数百サイクル）
            ↓
        ハードウェアページウォーク（x86）
        or ソフトウェアTLBミスハンドラ（MIPS）
            ↓ PML4 → PDPT → PD → PT → PFN
        TLB に新エントリを登録
            ↓
        物理アドレス
```

## TLB の構成

| 項目 | 説明 | 典型値 |
| --- | --- | --- |
| L1 TLB エントリ数（命令） | 命令フェッチ用、最高速 | 64〜128エントリ |
| L1 TLB エントリ数（データ） | データ読書用 | 64〜1024エントリ |
| L2 TLB（共有） | 統合TLB、L1ミス時に参照 | 1024〜4096エントリ |
| アソシアティビティ | セットアソシアティブ構成 | 4〜12 way |
| TLB フラッシュ | コンテキストスイッチ時に全エントリ無効化 | INVLPG命令 / CR3再ロード |
| ASID | Address Space ID。フラッシュ不要でプロセスを識別 | 8〜16 ビット |

ASID（ARM: ASID / x86: PCID）を使うと、コンテキストスイッチ時にTLBをフラッシュせず、ASIDでエントリをタグ付けして複数プロセスのエントリを共存させられます。

## TLB ミスの 2 種類

| 方式 | 採用アーキテクチャ | 動作 | 特徴 |
| --- | --- | --- | --- |
| ハードウェアページウォーク | x86 / x86-64 / ARM | CPUのMMUが自動的にページテーブルを辿り、PTEをTLBに登録 | OS負荷なし・高速 |
| ソフトウェア管理TLB | MIPS / RISC-V（一部） | TLBミス時に例外が発生し、OSのTLBミスハンドラがPTEを取得してTLBに書き込む | 柔軟なページテーブル構造が可能 |

## ヒュージページによる TLB プレッシャー低減

| ページサイズ | 必要 TLB エントリ数（1 GiBカバー） | 用途 |
| --- | --- | --- |
| 4 KiB（標準） | 262,144 エントリ | 汎用 |
| 2 MiB（Large Page） | 512 エントリ | データベース・JVM |
| 1 GiB（Huge Page） | 1 エントリ | HPC・機械学習 |

2 MiB のヒュージページを使うと同じ 1 GiB のメモリをカバーするのに必要な TLB エントリが 1/512 になり、TLB ミスが大幅に減少します。

## 実装

```c title="perf_event_open で TLB ミスを計測（C）"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/mman.h>
#include <linux/perf_event.h>
#include <sys/syscall.h>
#include <sys/ioctl.h>

static long perf_event_open(struct perf_event_attr *hw, pid_t pid,
                             int cpu, int grp, unsigned long flags) {
    return syscall(SYS_perf_event_open, hw, pid, cpu, grp, flags);
}

int open_tlb_counter(uint32_t config) {
    struct perf_event_attr pe = {
        .type           = PERF_TYPE_HW_CACHE,
        .size           = sizeof(pe),
        .config         = config,
        .disabled       = 1,
        .exclude_kernel = 1,
        .exclude_hv     = 1,
    };
    int fd = (int)perf_event_open(&pe, 0, -1, -1, 0);
    if (fd < 0) perror("perf_event_open");
    return fd;
}

void benchmark_access(char *mem, size_t size, int stride) {
    volatile char sink = 0;
    for (size_t i = 0; i < size; i += (size_t)stride)
        sink ^= mem[i];
    (void)sink;
}

int main(void) {
    const size_t SIZE   = 256 * 1024 * 1024UL; /* 256 MiB */
    const int    STRIDE = 4096;                 /* 1ページ毎: TLBミス多発 */

    char *mem = mmap(NULL, SIZE, PROT_READ | PROT_WRITE,
                     MAP_PRIVATE | MAP_ANONYMOUS | MAP_POPULATE, -1, 0);
    if (mem == MAP_FAILED) { perror("mmap"); return 1; }

    /* PERF_COUNT_HW_CACHE_DTLB | MISS | READ */
    uint32_t cfg = (PERF_COUNT_HW_CACHE_DTLB)
                 | (PERF_COUNT_HW_CACHE_OP_READ    << 8)
                 | (PERF_COUNT_HW_CACHE_RESULT_MISS << 16);
    int fd = open_tlb_counter(cfg);

    if (fd >= 0) {
        ioctl(fd, PERF_EVENT_IOC_RESET,  0);
        ioctl(fd, PERF_EVENT_IOC_ENABLE, 0);
    }

    benchmark_access(mem, SIZE, STRIDE);   /* 1ページ毎アクセス */

    if (fd >= 0) {
        ioctl(fd, PERF_EVENT_IOC_DISABLE, 0);
        long long count = 0;
        read(fd, &count, sizeof(count));
        printf("DTLBミス数 (stride=%d): %lld\n", STRIDE, count);
        close(fd);
    }

    munmap(mem, SIZE);
    return 0;
}

/*
 * コマンドラインでの計測:
 *   perf stat -e dTLB-load-misses,dTLB-loads ./a.out
 *
 * ヒュージページの有効化:
 *   echo 128 > /proc/sys/vm/nr_hugepages
 *   mmap(..., MAP_HUGETLB | MAP_HUGE_2MB, ...)
 */
```

```python title="ページサイズ確認とヒュージページ検証（Python）"
import mmap
import os
import resource
import struct

def show_page_info():
    """システムのページサイズとTLB関連情報を表示"""
    page_size = os.sysconf("SC_PAGESIZE")
    print(f"標準ページサイズ: {page_size} bytes ({page_size // 1024} KiB)")

    # /proc/meminfo からヒュージページ情報を取得
    hugepage_info = {}
    try:
        with open("/proc/meminfo", "r") as f:
            for line in f:
                if "Huge" in line or "huge" in line:
                    key, _, val = line.partition(":")
                    hugepage_info[key.strip()] = val.strip()
    except FileNotFoundError:
        pass

    if hugepage_info:
        print("\n--- ヒュージページ情報 ---")
        for k, v in hugepage_info.items():
            print(f"  {k}: {v}")

def compare_stride_access():
    """
    ストライドアクセスの性能比較。
    小さいストライド → TLBエントリ再利用 → ミス少
    大きいストライド → 毎アクセスで新ページ → TLBミス多
    """
    import time
    SIZE = 64 * 1024 * 1024  # 64 MiB

    with mmap.mmap(-1, SIZE, access=mmap.ACCESS_WRITE) as m:
        # 初期化
        m.write(b"\x01" * SIZE)

        results = {}
        for stride in [64, 4096, 65536]:
            m.seek(0)
            start = time.perf_counter()
            total = 0
            for offset in range(0, SIZE, stride):
                m.seek(offset)
                byte = m.read(1)
                if byte:
                    total += byte[0]
            elapsed = time.perf_counter() - start
            results[stride] = elapsed
            print(f"ストライド {stride:>6} bytes: {elapsed:.3f} 秒 (sum={total})")

    print("\n考察: ストライドが大きいほどTLBミスが増加し、アクセス時間が増大します。")

def check_transparent_hugepages():
    """Transparent Huge Pages (THP) の設定確認"""
    thp_path = "/sys/kernel/mm/transparent_hugepage/enabled"
    try:
        with open(thp_path, "r") as f:
            status = f.read().strip()
        print(f"\nTransparent Huge Pages 設定: {status}")
        print("  [always]: 常にヒュージページを使用（TLBミス削減）")
        print("  [madvise]: madvise(MADV_HUGEPAGE)指定時のみ")
        print("  [never]: 無効")
    except FileNotFoundError:
        print("\nTHP情報: /sys/kernel/mm 非対応環境")

if __name__ == "__main__":
    show_page_info()
    check_transparent_hugepages()
    print("\n=== ストライドアクセス性能比較 ===")
    compare_stride_access()
```

## 使用場面

- **データベース（PostgreSQL・MySQL）**: バッファプールに2 MiBヒュージページを使うことでTLBエントリ消費を大幅に削減し、クエリスループットを向上させる
- **JVM（Java仮想マシン）**: `-XX:+UseHugeTLBFS` または `-XX:+UseLargePages` でヒープにヒュージページを割り当て、GC時のTLBミスを削減
- **機械学習フレームワーク（PyTorch・TensorFlow）**: テンソル用の大規模メモリ領域にヒュージページを使い、行列演算中のTLBスラッシングを防止
- **コンテキストスイッチの最適化**: LinuxのPCID（Process-Context ID）サポートでコンテキストスイッチ時のTLBフラッシュを回避し、切り替えコストを削減

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
