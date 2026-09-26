---
sidebar_position: 2
displayed_sidebar: computerArchitectureSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# CUDA メモリ階層 (CUDA Memory Hierarchy)

## CUDA メモリ階層とは

CUDAメモリ階層とは、

> CUDAが用途別に速度・容量・スコープが異なる複数のメモリ空間を提供する階層構造

です。<br/>

適切なメモリ空間を選択することがCUDAプログラムの性能を左右します。グローバルメモリは容量が大きい反面アクセスが遅く、共有メモリはブロック内スレッドが高速に共有できる小容量のオンチップメモリです。

## CUDAメモリ空間の比較

| メモリ空間 | スコープ | 容量目安 | レイテンシ | 揮発性 | 備考 |
| --- | --- | --- | --- | --- | --- |
| グローバルメモリ | 全スレッド | 数GB | 400〜800サイクル | いいえ | cudaMallocで確保 |
| 共有メモリ | ブロック内 | 16〜96KB/SM | ~1サイクル | はい | `__shared__`宣言 |
| レジスタ | スレッド固有 | 64KB/SM（最大255個/スレッド） | ~1サイクル | はい | 自動変数が対象 |
| コンスタントメモリ | 全スレッド（読取専用） | 64KB | ~1サイクル（キャッシュヒット時） | いいえ | `__constant__`宣言 |
| ローカルメモリ | スレッド固有 | グローバルに配置 | 400〜800サイクル | はい | レジスタspill時に使用 |
| テクスチャ/サーフェスメモリ | 全スレッド | グローバルにキャッシュ | キャッシュ依存 | いいえ | 空間的局所性を活用 |

## 共有メモリとバンクコンフリクト

共有メモリは32個のバンクに分割されており、連続する4バイトワードが順番にバンク0〜31に割り当てられます。

```
バンク番号 = (アドレス / 4) % 32
```

同じワープ内の複数スレッドが同一バンクに同時アクセスすると**バンクコンフリクト**が発生し、アクセスがシリアル化されます。

```
通常アクセス（バンクコンフリクトなし）:
  Thread 0 → Bank 0
  Thread 1 → Bank 1
  Thread 2 → Bank 2
  ...        (並列実行)

バンクコンフリクト発生例（2-way conflict）:
  Thread 0 → Bank 0  ┐
  Thread 1 → Bank 1  │ (並列)
  Thread 2 → Bank 0  ┘ ← Thread 0 と競合 → シリアル化
```

回避策: 共有メモリ配列のパディング（`[TILE][TILE+1]`）によりアドレスをずらす。

## 合体アクセス（Coalescing）

グローバルメモリへのアクセスを効率化するには、同一ワープ内のスレッドが連続するアドレスにアクセスする必要があります。

```
合体アクセス（1回のメモリトランザクションで完結）:
  Warp内 Thread 0 → addr 0
  Warp内 Thread 1 → addr 4
  Warp内 Thread 2 → addr 8
  ...

ストライドアクセス（非効率・複数トランザクション発生）:
  Warp内 Thread 0 → addr 0
  Warp内 Thread 1 → addr 256
  Warp内 Thread 2 → addr 512
  ...
```

## 実装

```c title="共有メモリを使った行列転置カーネル（バンクコンフリクト回避付き）"
#include <cuda_runtime.h>
#include <stdio.h>

#define TILE_SIZE 32

/* +1 パディングでバンクコンフリクトを回避 */
__global__ void transpose_shared(const float *in, float *out, int rows, int cols) {
    __shared__ float tile[TILE_SIZE][TILE_SIZE + 1];

    int x = blockIdx.x * TILE_SIZE + threadIdx.x;
    int y = blockIdx.y * TILE_SIZE + threadIdx.y;

    /* グローバルメモリから共有メモリへ合体ロード */
    if (x < cols && y < rows)
        tile[threadIdx.y][threadIdx.x] = in[y * cols + x];

    __syncthreads();

    /* 転置したインデックスで共有メモリからグローバルメモリへ書き出し */
    x = blockIdx.y * TILE_SIZE + threadIdx.x;
    y = blockIdx.x * TILE_SIZE + threadIdx.y;

    if (x < rows && y < cols)
        out[y * rows + x] = tile[threadIdx.x][threadIdx.y];
}

int main(void) {
    const int rows = 1024, cols = 1024;
    const size_t bytes = rows * cols * sizeof(float);

    float *d_in, *d_out;
    cudaMalloc(&d_in,  bytes);
    cudaMalloc(&d_out, bytes);

    /* 入力データ初期化（ホスト→デバイス転送は省略） */

    dim3 threads(TILE_SIZE, TILE_SIZE);
    dim3 blocks((cols + TILE_SIZE - 1) / TILE_SIZE,
                (rows + TILE_SIZE - 1) / TILE_SIZE);

    transpose_shared<<<blocks, threads>>>(d_in, d_out, rows, cols);
    cudaDeviceSynchronize();

    printf("転置完了\n");
    cudaFree(d_in);
    cudaFree(d_out);
    return 0;
}
```

```python title="Numba で共有メモリを使ったベクトル加算（@cuda.jit）"
from numba import cuda
import numpy as np

@cuda.jit
def vector_add_shared(a, b, c):
    """共有メモリを介したベクトル加算"""
    # 共有メモリ確保（ブロックサイズ分）
    shared_a = cuda.shared.array(shape=256, dtype=np.float32)
    shared_b = cuda.shared.array(shape=256, dtype=np.float32)

    tx = cuda.threadIdx.x
    bx = cuda.blockIdx.x
    bw = cuda.blockDim.x
    i  = bx * bw + tx

    if i < a.shape[0]:
        # グローバルメモリから共有メモリへロード
        shared_a[tx] = a[i]
        shared_b[tx] = b[i]

    cuda.syncthreads()

    if i < c.shape[0]:
        c[i] = shared_a[tx] + shared_b[tx]


N = 1024 * 1024
a = np.ones(N, dtype=np.float32)
b = np.ones(N, dtype=np.float32) * 2.0
c = np.zeros(N, dtype=np.float32)

d_a = cuda.to_device(a)
d_b = cuda.to_device(b)
d_c = cuda.to_device(c)

threads_per_block = 256
blocks_per_grid   = (N + threads_per_block - 1) // threads_per_block

vector_add_shared[blocks_per_grid, threads_per_block](d_a, d_b, d_c)
cuda.synchronize()

result = d_c.copy_to_host()
print(f"最大誤差: {np.max(np.abs(result - 3.0)):.6f}")  # 期待値 3.0
```

## 使用場面

- **GEMM（cuBLAS）**: cuBLASのgemm実装は共有メモリタイリングで帯域幅を最大化し、ピーク演算性能に迫る
- **CNN畳み込み（cuDNN）**: cuDNNはフィルタ係数をコンスタントメモリや共有メモリに格納し、テンソルコアを活用
- **粒子シミュレーション**: 近傍粒子データを共有メモリにキャッシュすることで、グローバルメモリ帯域幅の消費を削減

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
