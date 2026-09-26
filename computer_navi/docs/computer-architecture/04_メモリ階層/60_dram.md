---
sidebar_position: 6
displayed_sidebar: computerArchitectureSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# DRAM の仕組みとメモリ帯域 (DRAM & Memory Bandwidth)

## DRAM とは

DRAM とは、

> キャパシタとトランジスタを 1 対で 1 ビットを保持するダイナミック RAM で、時間経過による電荷リークを補うため定期的なリフレッシュが必要なメモリデバイス

です。
<br/>

SRAMと比べてセル構造が単純なため高集積・低コストですが、リフレッシュ動作中はアクセスが発生できないオーバーヘッドがあります。現代のPCやサーバに搭載されるDIMMはDDR SDRAM（Double Data Rate Synchronous DRAM）で、クロックの立ち上がりと立ち下がりの両エッジでデータを転送します。

## DRAM の構造

```
DIMM（メモリモジュール）
  └─ チップ（×8 or ×16）
       └─ バンク（Bank 0〜7）
            └─ 行（Row / Word Line）  ← RAS（Row Address Strobe）で選択
                 └─ 列（Column / Bit Line）← CAS（Column Address Strobe）で選択
                      └─ セル（キャパシタ + トランジスタ = 1 bit）

アクセス手順:
  1. Bank Activate（RAS）: 行を開く → センスアンプに行全体を読み出す（tRCD 待機）
  2. Column Read/Write（CAS）: 列を選択してデータ転送（CL 待機）
  3. Precharge: 次の行アクセスのためにビットラインをリセット（tRP 待機）
```

## DRAM タイミングパラメータ

| パラメータ | 意味 | DDR4-3200 典型値 |
| --- | --- | --- |
| **CL** (CAS Latency) | CASコマンドからデータ出力までのサイクル数 | 16 |
| **tRCD** | RASからCASまでの最小サイクル数（行を開いてから列を選択できるまで） | 18 |
| **tRP** | Prechargeの最小サイクル数（次の行を開けるまでの待機） | 18 |
| **tRAS** | 行を開いてからPrechargeを開始できるまでの最小サイクル数 | 38 |

表記例 `16-18-18-38` は `CL-tRCD-tRP-tRAS` の順です。数値が小さいほど低レイテンシになります。

## DDR 世代比較表

| 規格 | クロック | 転送速度 | バス幅 | ピーク帯域（1ch） | 電圧 | 最大容量/DIMM |
| --- | --- | --- | --- | --- | --- | --- |
| DDR3-1600 | 800 MHz | 12.8 GB/s | 64 bit | 12.8 GB/s | 1.5 V | 16 GiB |
| DDR4-3200 | 1600 MHz | 25.6 GB/s | 64 bit | 25.6 GB/s | 1.2 V | 64 GiB |
| DDR5-6400 | 3200 MHz | 51.2 GB/s | 64 bit | 51.2 GB/s | 1.1 V | 128 GiB |

DDR5では内部アーキテクチャが2チャンネル32bitに分割され、バースト長が16に増加しています。

## メモリ帯域幅の計算

```
帯域幅 [GB/s] = クロック周波数 × 2（DDR）× バス幅（bit）/ 8 × チャンネル数

例: DDR4-3200 デュアルチャンネル
  = 1600 MHz × 2 × 64 bit / 8 × 2
  = 1,600,000,000 × 2 × 8 byte × 2
  = 51.2 GB/s

例: DDR5-6400 クアッドチャンネル（Xeon/EPYC）
  = 3200 MHz × 2 × 64 bit / 8 × 4
  = 204.8 GB/s
```

## 実装

```c title="メモリ帯域測定（連続アクセス vs ランダムアクセス）（C）"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#define SIZE_MB   256UL
#define SIZE      (SIZE_MB * 1024 * 1024)
#define ELEM_NUM  (SIZE / sizeof(uint64_t))

typedef unsigned long long u64;

static double now_sec(void) {
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return ts.tv_sec + ts.tv_nsec * 1e-9;
}

/* 連続読み取り（キャッシュライン単位で prefetch フレンドリー）*/
u64 sequential_read(u64 *buf, size_t n) {
    u64 sum = 0;
    for (size_t i = 0; i < n; i++) sum += buf[i];
    return sum;
}

/* ランダム読み取り（TLBミス + DRAMページミス多発）*/
u64 random_read(u64 *buf, size_t n, size_t *idx) {
    u64 sum = 0;
    for (size_t i = 0; i < n; i++) sum += buf[idx[i]];
    return sum;
}

/* 連続書き込み（memset相当）*/
void sequential_write(u64 *buf, size_t n) {
    for (size_t i = 0; i < n; i++) buf[i] = (u64)i;
}

int main(void) {
    u64 *buf = malloc(SIZE);
    if (!buf) { perror("malloc"); return 1; }
    sequential_write(buf, ELEM_NUM);  /* ウォームアップ + 初期化 */

    /* ランダムインデックス生成 */
    const size_t SAMPLE = 1024 * 1024;
    size_t *idx = malloc(SAMPLE * sizeof(size_t));
    for (size_t i = 0; i < SAMPLE; i++)
        idx[i] = (size_t)rand() % ELEM_NUM;

    /* --- 連続読み取り --- */
    double t0 = now_sec();
    u64 s1 = sequential_read(buf, ELEM_NUM);
    double dt_seq = now_sec() - t0;
    double bw_seq = (double)SIZE / dt_seq / 1e9;
    printf("連続読取:  %.2f GB/s (sum=%llu)\n", bw_seq, (unsigned long long)s1);

    /* --- 連続書き込み --- */
    t0 = now_sec();
    sequential_write(buf, ELEM_NUM);
    double dt_wr = now_sec() - t0;
    printf("連続書込:  %.2f GB/s\n", (double)SIZE / dt_wr / 1e9);

    /* --- ランダム読み取り --- */
    t0 = now_sec();
    u64 s2 = random_read(buf, SAMPLE, idx);
    double dt_rnd = now_sec() - t0;
    double bw_rnd = (double)(SAMPLE * sizeof(u64)) / dt_rnd / 1e9;
    printf("ランダム読取: %.2f GB/s (sum=%llu)\n", bw_rnd, (unsigned long long)s2);
    printf("帯域比 (連続/ランダム): %.1fx\n", bw_seq / bw_rnd);

    free(idx);
    free(buf);
    return 0;
}

/*
 * より詳細な計測ツール:
 *   STREAM ベンチマーク: https://www.cs.virginia.edu/stream/
 *     gcc -O2 -fopenmp stream.c -o stream && ./stream
 *   Intel MLC (Memory Latency Checker):
 *     mlc --bandwidth_matrix
 */
```

```python title="numpy でストライドアクセスのパフォーマンス比較（Python）"
import numpy as np
import time

def measure_bandwidth(arr: np.ndarray, stride: int, label: str) -> float:
    """指定ストライドでの読み取り帯域幅を測定"""
    n_warmup = 3
    n_iter   = 10

    # ウォームアップ
    for _ in range(n_warmup):
        _ = arr[::stride].sum()

    start = time.perf_counter()
    for _ in range(n_iter):
        result = arr[::stride].sum()
    elapsed = time.perf_counter() - start

    bytes_read = arr[::stride].nbytes * n_iter
    bw_gb = bytes_read / elapsed / 1e9
    print(f"{label:30s}: {bw_gb:.2f} GB/s  ({arr[::stride].size:,} 要素)")
    return bw_gb

def ddr_bandwidth_demo():
    """メモリアクセスパターン別の実効帯域幅比較"""
    SIZE_MB = 256
    n = SIZE_MB * 1024 * 1024 // 8  # float64 要素数

    print(f"配列サイズ: {SIZE_MB} MiB (float64 × {n:,})\n")
    arr = np.random.rand(n).astype(np.float64)

    bw_seq   = measure_bandwidth(arr, 1,    "連続アクセス（stride=1）")
    bw_s8    = measure_bandwidth(arr, 8,    "stride=8 （キャッシュライン境界）")
    bw_s64   = measure_bandwidth(arr, 64,   "stride=64 （1KiB ごと）")
    bw_s512  = measure_bandwidth(arr, 512,  "stride=512（4KiB=1ページごと）")

    print(f"\n帯域比 連続 vs 1ページ毎: {bw_seq / bw_s512:.1f}x")

def copy_bandwidth():
    """メモリコピー（STREAM Copy ベンチマーク相当）"""
    n = 32 * 1024 * 1024  # 256 MiB
    a = np.ones(n, dtype=np.float64)
    b = np.empty_like(a)

    n_iter = 5
    start = time.perf_counter()
    for _ in range(n_iter):
        np.copyto(b, a)  # b[:] = a[:]
    elapsed = time.perf_counter() - start

    bytes_transferred = a.nbytes * 2 * n_iter  # 読取 + 書込
    bw = bytes_transferred / elapsed / 1e9
    print(f"\nメモリコピー帯域幅: {bw:.2f} GB/s ({a.nbytes / 1e6:.0f} MiB × 2)")

def latency_demo():
    """ランダムアクセスレイテンシの推定"""
    sizes_kb = [32, 256, 1024, 8192, 65536, 262144]  # KiB単位
    print("\n=== ランダムアクセスレイテンシ（容量別）===")
    for size_kb in sizes_kb:
        n = size_kb * 1024 // 8
        arr = np.zeros(n, dtype=np.int64)
        # ポインタチェーン（ランダム順のインデックス）
        idx = np.random.permutation(n).astype(np.int64)

        n_iter = max(1, 10_000_000 // n)
        start = time.perf_counter()
        pos = 0
        for _ in range(n_iter):
            pos = idx[pos % n]
        elapsed = time.perf_counter() - start

        ns_per_access = elapsed / (n_iter * n) * 1e9
        print(f"  {size_kb:>7} KiB: ~{ns_per_access:.1f} ns/アクセス", end="")
        if size_kb <= 512:
            print(" ← L2/L3キャッシュ")
        elif size_kb <= 8192:
            print(" ← L3キャッシュ")
        else:
            print(" ← DRAM")

if __name__ == "__main__":
    ddr_bandwidth_demo()
    copy_bandwidth()
    latency_demo()
```

## 使用場面

- **ゲーミング PC（XMP/EXPO）**: IntelのXMP（eXtreme Memory Profile）やAMDのEXPO（EXtended Profiles for Overclocking）でDDR5-6000超の動作クロックを設定し、ゲームFPS向上を図る
- **HPC（High Performance Computing）**: NVIDIAのA100/H100はHBM2e/HBM3を採用し、3〜5 TB/sの帯域幅を実現。DDR5の10倍以上の帯域で行列演算性能を最大化
- **組み込みシステム**: LPDDR5（スマートフォン・タブレット）は省電力（0.5 V）と高帯域（68 GB/s）を両立。エッジAI推論に活用される
- **メモリ帯域バウンドな処理**: ストリーミング処理（画像処理・FFT）は計算よりメモリ帯域が律速要因になるため、DRAMの選定がシステム性能に直結する

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
