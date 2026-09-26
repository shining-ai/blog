---
sidebar_position: 0
displayed_sidebar: computerArchitectureSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# GPU アーキテクチャ (GPU Architecture)

## GPU とは

GPU（Graphics Processing Unit）とは、

> 数千〜数万のシンプルなコアを持ち、データ並列計算を高スループットで実行するプロセッサ

です。
<br/>

CPU が少数の高性能コアでレイテンシを最小化するのに対し、GPU は大量のコアでスループットを最大化します。

## CPU vs GPU の構造比較


| 特徴 | CPU | GPU |
| --- | --- | --- |
| コア数 | 4〜128 | 数千〜数万 |
| コアの複雑さ | 高い（OOO実行等） | 低い（単純なALU） |
| キャッシュ | 大容量（L3: 数十MB） | 小容量（L2: 数MB） |
| メモリ帯域幅 | 50〜100 GB/s | 500〜1000+ GB/s |
| 得意な処理 | 逐次処理・低レイテンシ | 大規模並列・高スループット |

## GPU メモリ階層（NVIDIA）

```
グローバルメモリ  (VRAM, 数GB〜数十GB, 高帯域幅)
  └─ L2 キャッシュ（数MB）
       └─ L1 キャッシュ / 共有メモリ（Streaming Multiprocessor ごと）
            └─ レジスタファイル（スレッドごと）
```

## SIMT 実行モデル

```
SIMT (Single Instruction Multiple Threads):
  - 32スレッドがWarpを構成
  - Warp内全スレッドが同一命令を実行
  - 分岐があるとWarpが分裂 → 効率低下（Warp Divergence）
```

## 実装

```python title="NumPy CPU vs GPU（CuPy）比較（Python）"
import numpy as np
import time

try:
    import cupy as cp
    HAS_GPU = True
except ImportError:
    HAS_GPU = False

N = 4096
A = np.random.rand(N, N).astype(np.float32)
B = np.random.rand(N, N).astype(np.float32)

# CPU 行列積
t0 = time.perf_counter()
C_cpu = A @ B
t_cpu = time.perf_counter() - t0
print(f"CPU: {t_cpu*1000:.1f} ms")

if HAS_GPU:
    d_A = cp.asarray(A)
    d_B = cp.asarray(B)
    cp.cuda.Stream.null.synchronize()
    t0 = time.perf_counter()
    d_C = d_A @ d_B
    cp.cuda.Stream.null.synchronize()
    t_gpu = time.perf_counter() - t0
    print(f"GPU: {t_gpu*1000:.1f} ms")
    print(f"高速化: {t_cpu/t_gpu:.1f}x")
```

```c title="GPU スレッド数計算（C ヘルパー）"
#include <stdio.h>

/* CUDA グリッド・ブロックサイズの計算 */
typedef struct { int x, y, z; } dim3_t;

dim3_t calc_grid(int n, int block_size) {
    dim3_t grid;
    grid.x = (n + block_size - 1) / block_size;
    grid.y = 1;
    grid.z = 1;
    return grid;
}

int main(void) {
    int n = 1024 * 1024;  /* 要素数 */
    int block = 256;       /* ブロックあたりスレッド数 */
    dim3_t grid = calc_grid(n, block);
    printf("要素数: %d\n", n);
    printf("ブロックサイズ: %d\n", block);
    printf("グリッドサイズ: %d\n", grid.x);
    printf("総スレッド数: %d\n", grid.x * block);
    return 0;
}
```

## 使用場面

- **深層学習**: Tensor Core による行列積の高速化
- **科学計算**: 分子動力学・流体シミュレーション
- **レイトレーシング**: RT Core によるリアルタイムレンダリング
- **暗号通貨**: SHA-256 等のハッシュ計算

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
