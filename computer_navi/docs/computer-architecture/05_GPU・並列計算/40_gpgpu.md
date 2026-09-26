---
sidebar_position: 4
displayed_sidebar: computerArchitectureSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# GPGPU と計算加速 (GPGPU & Compute Acceleration)

## GPGPUとは

GPGPUとは、

> グラフィックス以外の汎用科学計算にGPUの大規模並列性を活用する技術（General-Purpose computing on GPU）

です。<br/>

現代のGPUはNVIDIAのA100で6912コア、H100で16896コアを搭載しており、CPUが数十コアであるのに対して圧倒的なデータ並列処理性能を持ちます。2007年のCUDA公開をきっかけに深層学習・物理シミュレーション・暗号計算など広範な分野で活用されています。

## CPU vs GPU 適用ガイド

| 処理特性 | 適した処理器 | 理由 |
| --- | --- | --- |
| 複雑な制御フロー・深い分岐 | CPU | 分岐予測・アウトオブオーダー実行が強力 |
| 逐次依存性の強いアルゴリズム | CPU | パイプラインコアが少数スレッドを高速処理 |
| 低レイテンシが必要な単一タスク | CPU | キャッシュ・クロック周波数で単スレッド高速 |
| 大規模データ並列処理 | GPU | 数千コアで同一演算を並列実行 |
| 行列演算・テンソル演算 | GPU | テンソルコアで混合精度演算を高速化 |
| 繰り返し同一カーネルを実行 | GPU | ウォームアップ後の安定したスループット |

## GPU加速プラットフォーム比較

| プラットフォーム | ベンダー | 言語 | 特徴 |
| --- | --- | --- | --- |
| CUDA | NVIDIA | C/C++/Fortran/Python(Numba) | 最も成熟・エコシステムが豊富 |
| ROCm / HIP | AMD | C/C++ | CUDAとのHIPify変換でポーティング可能 |
| Metal | Apple | Metal Shading Language | macOS/iOS専用・Apple Silicon統合 |
| OpenCL | Khronos Group | C | クロスベンダー対応・GPU/CPU/FPGA |
| SYCL / DPC++ | Khronos / Intel | C++17 | OpenCLの後継・Intel oneAPIの基盤 |

## 活用領域

| 分野 | 具体例 | GPU活用の理由 |
| --- | --- | --- |
| 深層学習 | GEMM・Conv・Attention | テンソル演算の圧倒的並列性 |
| 分子動力学 | AMBER・GROMACS | 粒子間力の全ペア計算 |
| 流体シミュレーション（CFD） | Lattice Boltzmann法 | 格子点の独立更新が並列化に適する |
| 暗号・ブロックチェーン | SHA-256マイニング | 独立したハッシュ計算の並列実行 |
| 画像処理 | フィルタリング・物体検出 | 画素単位の独立演算 |

## 実装

```c title="ベクトル加算カーネルとホストコード全体（CUDA C）"
#include <cuda_runtime.h>
#include <stdio.h>
#include <stdlib.h>

/* GPU カーネル: 各スレッドが1要素を処理 */
__global__ void vector_add(const float *a, const float *b, float *c, int n) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i < n)
        c[i] = a[i] + b[i];
}

int main(void) {
    const int N     = 1 << 24;   /* 16M 要素 */
    const size_t bytes = N * sizeof(float);

    /* ─── ホストメモリ確保 ─── */
    float *h_a = (float *)malloc(bytes);
    float *h_b = (float *)malloc(bytes);
    float *h_c = (float *)malloc(bytes);

    for (int i = 0; i < N; i++) {
        h_a[i] = (float)i;
        h_b[i] = (float)(N - i);
    }

    /* ─── デバイスメモリ確保 ─── */
    float *d_a, *d_b, *d_c;
    cudaMalloc(&d_a, bytes);
    cudaMalloc(&d_b, bytes);
    cudaMalloc(&d_c, bytes);

    /* ─── ホスト → デバイス転送 ─── */
    cudaMemcpy(d_a, h_a, bytes, cudaMemcpyHostToDevice);
    cudaMemcpy(d_b, h_b, bytes, cudaMemcpyHostToDevice);

    /* ─── カーネル起動 ─── */
    const int BLOCK = 256;
    const int GRID  = (N + BLOCK - 1) / BLOCK;
    vector_add<<<GRID, BLOCK>>>(d_a, d_b, d_c, N);
    cudaDeviceSynchronize();

    /* ─── デバイス → ホスト転送 ─── */
    cudaMemcpy(h_c, d_c, bytes, cudaMemcpyDeviceToHost);

    /* ─── 検証 ─── */
    float max_err = 0.0f;
    for (int i = 0; i < N; i++) {
        float diff = h_c[i] - (float)N;
        if (diff < 0) diff = -diff;
        if (diff > max_err) max_err = diff;
    }
    printf("最大誤差: %f\n", max_err);

    /* ─── 解放 ─── */
    cudaFree(d_a);  cudaFree(d_b);  cudaFree(d_c);
    free(h_a);      free(h_b);      free(h_c);
    return 0;
}
```

```python title="PyTorch と CuPy を使った GPU 計算とデバイス間転送（Python）"
import numpy as np

# ─── PyTorch による GPU 計算 ─────────────────────────────────────────────────
try:
    import torch

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"PyTorch デバイス: {device}")

    N = 1 << 24
    # CPU テンソル作成
    a_cpu = torch.arange(N, dtype=torch.float32)
    b_cpu = torch.arange(N, 0, -1, dtype=torch.float32)

    # GPU へ転送
    a_gpu = a_cpu.to(device)
    b_gpu = b_cpu.to(device)

    # GPU 上で演算
    c_gpu = a_gpu + b_gpu

    # CPU へ転送して検証
    c_cpu = c_gpu.cpu()
    print(f"最大誤差(PyTorch): {torch.max(torch.abs(c_cpu - N)).item():.6f}")

    # GPU メモリ使用量の確認
    if device.type == "cuda":
        allocated = torch.cuda.memory_allocated() / 1e9
        reserved  = torch.cuda.memory_reserved()  / 1e9
        print(f"GPU 使用メモリ: {allocated:.2f}GB / 予約済み: {reserved:.2f}GB")

except ImportError:
    print("PyTorch がインストールされていません")

# ─── CuPy による GPU 計算（NumPy 互換 API）──────────────────────────────────
try:
    import cupy as cp

    N = 1 << 24
    # CPU(NumPy) 配列
    a_np = np.arange(N, dtype=np.float32)
    b_np = np.arange(N, 0, -1, dtype=np.float32)

    # GPU へ転送（NumPy → CuPy）
    a_cp = cp.asarray(a_np)
    b_cp = cp.asarray(b_np)

    # GPU 上で演算（NumPy と同じ API）
    c_cp = a_cp + b_cp

    # CPU へ転送（CuPy → NumPy）
    c_np = cp.asnumpy(c_cp)
    print(f"最大誤差(CuPy): {np.max(np.abs(c_np - N)):.6f}")

except ImportError:
    print("CuPy がインストールされていません")
```

## 使用場面

- **AI推論サーバ（A100/H100）**: NVIDIA TensorRT + A100/H100でLLM（GPT-4等）の低レイテンシ推論を実現
- **スーパーコンピュータ（Top500）**: Top500上位機（Frontier・Summit）はAMD/NVIDIA GPUで1ExaFLOPS超を達成
- **ゲームエンジン**: Unreal Engine 5のLumen・NaniteはGPGPUを活用したリアルタイムレイトレーシングを実現

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
