---
sidebar_position: 3
displayed_sidebar: computerArchitectureSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# CUDA カーネル最適化 (CUDA Kernel Optimization)

## CUDAカーネル最適化とは

CUDAカーネル最適化とは、

> CUDAカーネルの実行効率を最大化するための、メモリアクセス・SM占有率・命令スループット最適化技術

です。<br/>

GPUは数千コアを持ちますが、メモリアクセスのボトルネックやWarp Divergenceによる実行効率の低下が起きやすく、適切な最適化なしに理論性能の数分の一しか発揮できないことがあります。プロファイリングで律速要因を特定してから最適化するのが原則です。

## 最適化チェックリスト

| 最適化項目 | 目的 | 効果 |
| --- | --- | --- |
| 合体アクセス（Coalescing） | グローバルメモリ帯域幅を最大化 | 非合体時比 最大32倍向上 |
| 共有メモリ活用 | グローバルメモリアクセス回数を削減 | 帯域幅使用量を大幅削減 |
| ループアンロール（`#pragma unroll`） | 命令発行オーバーヘッドを削減 | 命令スループット数%〜数十%改善 |
| Warp Divergence回避 | ワープ内シリアル実行を防ぐ | 分岐依存で最大32倍の性能差 |
| Occupancy改善 | SM内アクティブワープを増やす | レイテンシ隠蔽効果が向上 |
| レジスタ数制御（`__launch_bounds__`） | レジスタspillを防ぎOccupancyを上げる | レジスタ不足時に有効 |

## SM占有率（Occupancy）

SM占有率はアクティブワープ数÷最大ワープ数で、値が高いほどメモリレイテンシを隠蔽しやすくなります。

```
Occupancy = アクティブワープ数 / SM最大ワープ数

制限要因:
  1. レジスタ数       : スレッドあたり使用レジスタが多いとブロック数が減る
  2. 共有メモリ使用量 : ブロックあたり使用量が多いと同時ブロック数が減る
  3. ブロックサイズ   : 小さすぎるとSMの全ワープスロットを埋められない

例（SM最大1024スレッド・共有メモリ64KB・レジスタ65536個の場合）:
  ブロック256スレッド・レジスタ32個/スレッド・共有メモリ8KB/ブロック
    → レジスタ制限: 65536 / (256*32) = 8ブロック → 2048スレッド
    → 共有メモリ制限: 64KB / 8KB = 8ブロック
    → 実際のアクティブスレッド: min(2048, 1024) = 1024 → Occupancy 100%
```

## Warp Divergence

同一ワープ（32スレッド）内で分岐が異なると、各パスがシリアルに実行されます。

```
Warp Divergenceの例:
  if (threadIdx.x % 2 == 0) {
      // 偶数スレッドのみ実行 → 奇数スレッドはアイドル
  } else {
      // 奇数スレッドのみ実行 → 偶数スレッドはアイドル
  }
  → 実効スループットが最大1/2に低下

回避策:
  - データに応じた分岐ではなくワープ単位で均一な処理に再設計
  - インデックスの並び替えで同じ分岐をとるスレッドを同一ワープに集める
```

## プロファイリングツール

| ツール | 特徴 | 主な指標 |
| --- | --- | --- |
| nvprof | コマンドラインプロファイラ（旧世代） | カーネル時間・メモリ帯域幅 |
| Nsight Compute | GUI/CLIの詳細カーネルプロファイラ | Occupancy・メモリスループット・Warp状態 |
| Nsight Systems | システム全体のタイムライン解析 | CPU/GPU連携・ストリーム・転送 |

## 実装

```c title="非合体アクセスから合体アクセスへの改善例とOccupancy API使用（CUDA C）"
#include <cuda_runtime.h>
#include <stdio.h>

/* 非合体アクセス: 行方向スレッドが列方向に配置 → ストライドアクセス */
__global__ void bad_access(const float *in, float *out, int rows, int cols) {
    int row = blockIdx.x * blockDim.x + threadIdx.x;
    int col = blockIdx.y * blockDim.y + threadIdx.y;
    if (row < rows && col < cols)
        out[col * rows + row] = in[row * cols + col];  /* 書き込みが非合体 */
}

/* 合体アクセス: スレッドX方向が連続列アドレスに対応 */
__global__ void good_access(const float *in, float *out, int rows, int cols) {
    int col = blockIdx.x * blockDim.x + threadIdx.x;  /* X → 列方向 */
    int row = blockIdx.y * blockDim.y + threadIdx.y;
    if (row < rows && col < cols)
        out[row * cols + col] = in[row * cols + col];  /* 連続アドレス */
}

/* __launch_bounds__ でレジスタ数を制限し Occupancy を改善 */
__launch_bounds__(256, 2)  /* 最大256スレッド/ブロック, 最小2ブロック/SM */
__global__ void optimized_kernel(const float *in, float *out, int n) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i < n) out[i] = in[i] * 2.0f;
}

int main(void) {
    /* Occupancy API で最適なブロックサイズを取得 */
    int min_grid, block_size;
    cudaOccupancyMaxPotentialBlockSize(&min_grid, &block_size,
                                       optimized_kernel, 0, 0);
    printf("推奨ブロックサイズ: %d, 最小グリッドサイズ: %d\n",
           block_size, min_grid);

    const int N = 1 << 20;
    int grid = (N + block_size - 1) / block_size;

    float *d_in, *d_out;
    cudaMalloc(&d_in,  N * sizeof(float));
    cudaMalloc(&d_out, N * sizeof(float));

    optimized_kernel<<<grid, block_size>>>(d_in, d_out, N);
    cudaDeviceSynchronize();

    /* Occupancy 計算 */
    int active_blocks;
    cudaOccupancyMaxActiveBlocksPerMultiprocessor(&active_blocks,
                                                   optimized_kernel,
                                                   block_size, 0);
    int device;
    cudaGetDevice(&device);
    cudaDeviceProp prop;
    cudaGetDeviceProperties(&prop, device);
    float occupancy = (float)(active_blocks * block_size) /
                      (float)prop.maxThreadsPerMultiProcessor;
    printf("理論Occupancy: %.1f%%\n", occupancy * 100.0f);

    cudaFree(d_in);
    cudaFree(d_out);
    return 0;
}
```

```python title="Numba で Occupancy 計算と最適ブロックサイズの取得（Python）"
from numba import cuda
import numpy as np
from numba.cuda.cudadrv.devicearray import DeviceNDArray

@cuda.jit
def simple_kernel(a, b, c):
    i = cuda.grid(1)
    if i < c.shape[0]:
        c[i] = a[i] + b[i]


def main():
    N = 1 << 20

    a = np.ones(N, dtype=np.float32)
    b = np.ones(N, dtype=np.float32) * 2.0
    c = np.zeros(N, dtype=np.float32)

    d_a = cuda.to_device(a)
    d_b = cuda.to_device(b)
    d_c = cuda.to_device(c)

    # 最大アクティブブロック数からOccupancyを計算
    block_size = 128
    try:
        max_blocks = cuda.occupancy_max_active_blocks_per_multiprocessor(
            simple_kernel, block_size, 0)
        device = cuda.get_current_device()
        max_warps = device.MAX_THREADS_PER_MULTIPROCESSOR // 32
        active_warps = max_blocks * (block_size // 32)
        occupancy = active_warps / max_warps
        print(f"ブロックサイズ {block_size}: 理論Occupancy = {occupancy * 100:.1f}%")
    except Exception as e:
        print(f"Occupancy計算エラー: {e}")

    grid = (N + block_size - 1) // block_size
    simple_kernel[grid, block_size](d_a, d_b, d_c)
    cuda.synchronize()

    result = d_c.copy_to_host()
    print(f"最大誤差: {np.max(np.abs(result - 3.0)):.6f}")


if __name__ == "__main__":
    main()
```

## 使用場面

- **深層学習（cuDNN最適化）**: cuDNNは合体アクセス・テンソルコア利用・Occupancy最大化を組み合わせてConvolutionを実装
- **科学計算HPC**: NVIDIA HPC SDKのOpenACC/OpenMPオフロードはカーネル最適化を自動適用
- **リアルタイムレイトレーシング**: NVIDIAのOptixではBVH走査カーネルのWarp Divergence削減が性能の鍵

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
