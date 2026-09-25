---
sidebar_position: 1
displayed_sidebar: computerArchitectureSidebar
---

# CUDA プログラミングモデル（グリッド・ブロック・スレッド）

## 概要

CUDA（Compute Unified Device Architecture）とは、

> NVIDIA が提供する GPU 汎用並列計算プラットフォームとプログラミングモデル

です。

GPU をグラフィックス以外の計算（GPGPU）に利用するための C/C++ 拡張仕様であり、カーネル関数を数万〜数億スレッドで同時実行できます。

## スレッド階層

```
グリッド（Grid）
└── ブロック（Block）× 数千
    └── スレッド（Thread）× 最大 1024 / ブロック

各スレッドは自身の ID を使ってデータを選択:
  threadIdx.x, threadIdx.y, threadIdx.z  ← ブロック内インデックス
  blockIdx.x,  blockIdx.y,  blockIdx.z   ← グリッド内ブロックインデックス
  blockDim.x   ← ブロックサイズ

グローバル ID（1次元の場合）:
  int gid = blockIdx.x * blockDim.x + threadIdx.x;
```

## メモリ空間

| 種類 | スコープ | レイテンシ | サイズ |
|---|---|---|---|
| レジスタ | スレッド | 〜1 クロック | 数十 KB/SM |
| 共有メモリ | ブロック | 〜100 クロック | 48〜96 KB/SM |
| L1 キャッシュ | SM | 〜100 クロック | 32〜128 KB/SM |
| グローバルメモリ | すべて | 〜600 クロック | 数 GB〜数十 GB |
| 定数メモリ | すべて（読み取り専用） | 〜 L1 と同等 | 64 KB |

## CUDA カーネルの例

```cuda title="ベクトル加算カーネル"
#include <cuda_runtime.h>
#include <stdio.h>

// GPU で実行されるカーネル関数
__global__ void vec_add(float *a, float *b, float *c, int n) {
    int gid = blockIdx.x * blockDim.x + threadIdx.x;
    if (gid < n) {
        c[gid] = a[gid] + b[gid];
    }
}

int main(void) {
    const int N = 1 << 20;  // 1M 要素
    size_t bytes = N * sizeof(float);

    // ホスト（CPU）メモリ確保
    float *h_a = (float*)malloc(bytes);
    float *h_b = (float*)malloc(bytes);
    float *h_c = (float*)malloc(bytes);

    // デバイス（GPU）メモリ確保
    float *d_a, *d_b, *d_c;
    cudaMalloc(&d_a, bytes);
    cudaMalloc(&d_b, bytes);
    cudaMalloc(&d_c, bytes);

    // データを GPU に転送
    cudaMemcpy(d_a, h_a, bytes, cudaMemcpyHostToDevice);
    cudaMemcpy(d_b, h_b, bytes, cudaMemcpyHostToDevice);

    // カーネル起動: スレッド数=256/ブロック
    int threads = 256;
    int blocks  = (N + threads - 1) / threads;
    vec_add<<<blocks, threads>>>(d_a, d_b, d_c, N);

    // 結果を CPU に転送
    cudaMemcpy(h_c, d_c, bytes, cudaMemcpyDeviceToHost);

    cudaFree(d_a); cudaFree(d_b); cudaFree(d_c);
    free(h_a);     free(h_b);     free(h_c);
    return 0;
}
```

## 最適化のポイント

| 最適化 | 説明 |
|---|---|
| コアレスアクセス | 隣接スレッドが連続アドレスを読む（メモリ帯域最大化） |
| 共有メモリの活用 | 複数回アクセスするデータを共有メモリにキャッシュ |
| ワープダイバージェンス回避 | 分岐を減らして SIMD 効率を維持 |
| 占有率の最適化 | レジスタ・共有メモリ使用量と SM スロット数のバランス |

## 使用場面

- **深層学習フレームワーク**: PyTorch・TensorFlow のバックエンド
- **HPC**: 分子動力学・気象シミュレーション
- **画像処理**: リアルタイムフィルタ・コンピュータビジョン
