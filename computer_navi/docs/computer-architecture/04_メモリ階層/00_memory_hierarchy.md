---
sidebar_position: 0
displayed_sidebar: computerArchitectureSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# メモリ階層 (Memory Hierarchy)

## メモリ階層とは

メモリ階層とは、

> 速度・容量・コストのトレードオフを利用して複数の記憶装置を階層化し、高速かつ大容量のメモリを実現する設計手法

です。
<br/>

局所性の原理（時間的局所性・空間的局所性）を利用して、頻繁にアクセスするデータを上位階層に置きます。

## 階層別スペック


| 階層 | 容量 | アクセス時間 | 備考 |
| --- | --- | --- | --- |
| レジスタ | ~数十個 | 1サイクル未満 | CPU内部 |
| L1 キャッシュ | 32〜64 KB | 1〜4サイクル | コアごとに独立 |
| L2 キャッシュ | 256 KB〜1 MB | 10〜20サイクル | コアごと/共有 |
| L3 キャッシュ | 4〜64 MB | 30〜50サイクル | ソケット共有 |
| DRAM (メインメモリ) | 8〜256 GB | 50〜100 ns | LPDDR5等 |
| NVMe SSD | 1〜8 TB | 50〜100 μs | PCIe 4.0/5.0 |
| HDD | 1〜20 TB | 5〜10 ms | 磁気記録 |

## 局所性の原理

```
時間的局所性: 最近アクセスしたデータは近い将来また使われる
              例: ループ変数、頻繁に呼ばれる関数

空間的局所性: あるアドレスにアクセスしたとき、その近傍も使われる
              例: 配列の連続要素、構造体メンバー
```

## 実装

```c title="キャッシュ効率の違い（C）"
#include <stdio.h>
#include <time.h>
#define N 1024

float A[N][N];

/* 行優先アクセス（キャッシュフレンドリー） */
double row_major_sum(void) {
    double sum = 0;
    for (int i = 0; i < N; i++)
        for (int j = 0; j < N; j++)
            sum += A[i][j];  /* 連続メモリ → L1 ヒット率高 */
    return sum;
}

/* 列優先アクセス（キャッシュ非効率） */
double col_major_sum(void) {
    double sum = 0;
    for (int j = 0; j < N; j++)
        for (int i = 0; i < N; i++)
            sum += A[i][j];  /* 非連続メモリ → キャッシュミス増 */
    return sum;
}

int main(void) {
    /* 行優先の方が数倍〜10倍以上速い */
    clock_t t0 = clock();
    row_major_sum();
    printf("row-major:  %ldms\n", (clock() - t0) * 1000 / CLOCKS_PER_SEC);
    t0 = clock();
    col_major_sum();
    printf("col-major:  %ldms\n", (clock() - t0) * 1000 / CLOCKS_PER_SEC);
    return 0;
}
```

```python title="メモリ階層シミュレーション（Python）"
import time
import numpy as np

N = 2048
A = np.random.rand(N, N).astype(np.float32)

# 行方向アクセス（C-contiguous = 行優先）
t0 = time.perf_counter()
_ = np.sum(A)
t_row = time.perf_counter() - t0

# 列方向アクセス（Fortran-contiguous）
A_f = np.asfortranarray(A)
t0 = time.perf_counter()
_ = np.sum(A_f, axis=0)
t_col = time.perf_counter() - t0

print(f"row-major:   {t_row*1000:.2f} ms")
print(f"col-major:   {t_col*1000:.2f} ms")
```

## 使用場面

- **データベース**: バッファプールによる DRAM キャッシュ管理
- **OS**: ページキャッシュ（disk → DRAM）
- **機械学習**: テンソル演算のメモリレイアウト最適化
- **HPC**: NUMA アーキテクチャでのメモリ配置

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
