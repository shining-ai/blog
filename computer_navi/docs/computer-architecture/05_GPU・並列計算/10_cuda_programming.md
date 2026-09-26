---
sidebar_position: 1
displayed_sidebar: computerArchitectureSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# CUDAプログラミング (CUDA Programming)

## CUDAとは

CUDAとは、

> NVIDIAが開発したGPU向け並列コンピューティングプラットフォームおよびプログラミングモデルで、C/C++の拡張としてGPUカーネルを記述できる

です。
<br/>

2006年にNVIDIAが公開し、GPUコンピューティングを一般開発者に開放しました。
現在はPyTorch・TensorFlow・OpenCV等の主要ライブラリの実装基盤となっています。

## CUDAのスレッド階層


```
Grid（1カーネル呼び出し）
  └─ Block (gridDim.x × gridDim.y × gridDim.z 個)
       └─ Thread (blockDim.x × blockDim.y × blockDim.z 個)
```

### スレッドIDの計算（1次元の場合）

```
global_thread_id = blockIdx.x * blockDim.x + threadIdx.x
```

### 最適なブロックサイズの目安

| ルール | 値 |
| --- | --- |
| 1ブロックあたりのスレッド数 | 32の倍数（Warp境界） |
| 推奨ブロックサイズ | 128〜256 |
| 最大スレッド数/ブロック | 1024（一般的なGPU） |
| 占有率を最大化 | SM あたり複数ブロックを実行 |

## メモリ最適化パターン

### 合体メモリアクセス（Coalesced Access）

同じWarp内のスレッドが連続するメモリアドレスにアクセスすることで、メモリ転送を1回にまとめる。

```c title="合体アクセスの例"
// ✓ 合体アクセス（推奨）
__global__ void good(float *A, float *B, int n) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i < n) B[i] = A[i] * 2.0f;  // 連続アドレス
}

// ✗ ストライドアクセス（非効率）
__global__ void bad(float *A, float *B, int n, int stride) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i * stride < n) B[i * stride] = A[i * stride] * 2.0f;  // 非連続
}
```

## 実装

```c title="行列転置（共有メモリを使ったキャッシュ最適化）"
#include <cuda_runtime.h>
#define TILE_SIZE 32

// 共有メモリを使った転置（バンクコンフリクト回避のため +1）
__global__ void transpose_shared(const float *in, float *out, int rows, int cols) {
    __shared__ float tile[TILE_SIZE][TILE_SIZE + 1];  // +1 でバンクコンフリクト回避

    int x = blockIdx.x * TILE_SIZE + threadIdx.x;
    int y = blockIdx.y * TILE_SIZE + threadIdx.y;

    if (x < cols && y < rows)
        tile[threadIdx.y][threadIdx.x] = in[y * cols + x];

    __syncthreads();

    x = blockIdx.y * TILE_SIZE + threadIdx.x;
    y = blockIdx.x * TILE_SIZE + threadIdx.y;

    if (x < rows && y < cols)
        out[y * rows + x] = tile[threadIdx.x][threadIdx.y];
}

// ホスト側
void run_transpose(int rows, int cols) {
    const size_t bytes = rows * cols * sizeof(float);
    float *d_in, *d_out;
    cudaMalloc(&d_in, bytes);
    cudaMalloc(&d_out, bytes);

    dim3 threads(TILE_SIZE, TILE_SIZE);
    dim3 blocks((cols + TILE_SIZE - 1) / TILE_SIZE,
                (rows + TILE_SIZE - 1) / TILE_SIZE);
    transpose_shared<<<blocks, threads>>>(d_in, d_out, rows, cols);
    cudaDeviceSynchronize();

    cudaFree(d_in);
    cudaFree(d_out);
}
```

```python title="CUDAカーネルをPythonから実行（Numba）"
from numba import cuda
import numpy as np
import time

@cuda.jit
def matmul_kernel(A, B, C):
    """行列積カーネル（タイルなし版）"""
    row, col = cuda.grid(2)
    if row < C.shape[0] and col < C.shape[1]:
        tmp = 0.0
        for k in range(A.shape[1]):
            tmp += A[row, k] * B[k, col]
        C[row, col] = tmp

N = 512
A = np.random.rand(N, N).astype(np.float32)
B = np.random.rand(N, N).astype(np.float32)
C = np.zeros((N, N), dtype=np.float32)

# GPU へ転送
d_A = cuda.to_device(A)
d_B = cuda.to_device(B)
d_C = cuda.to_device(C)

# カーネル起動
threads_per_block = (16, 16)
blocks_per_grid = (
    (N + threads_per_block[0] - 1) // threads_per_block[0],
    (N + threads_per_block[1] - 1) // threads_per_block[1],
)

start = time.perf_counter()
matmul_kernel[blocks_per_grid, threads_per_block](d_A, d_B, d_C)
cuda.synchronize()
elapsed = time.perf_counter() - start

C_gpu = d_C.copy_to_host()
C_ref = A @ B
print(f"最大誤差: {np.max(np.abs(C_gpu - C_ref)):.6f}")
print(f"実行時間: {elapsed*1000:.1f} ms")
```

## 使用場面

- **深層学習**: PyTorch/TensorFlow のバックエンド演算
- **科学計算**: NVIDIA HPC SDK による物理シミュレーション
- **画像処理**: OpenCV の GPU アクセラレーション
- **データ分析**: RAPIDS cuDF による GPU データフレーム

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
