import AffiliateBanner from '@site/src/components/AffiliateBanner';

# コンピュートシェーダ

## コンピュートシェーダとは

> コンピュートシェーダ（Compute Shader）は、頂点処理やフラグメント処理といったグラフィックスパイプラインの制約を受けずに GPU 上で汎用並列計算を実行できるシェーダステージであり、OpenGL 4.3・Vulkan・DirectX 11 以降でサポートされている。

コンピュートシェーダが登場する以前は、GPU の並列演算能力を活かすためにレンダリングパイプライン（フラグメントシェーダへのレンダーターゲット出力など）を「流用」する GPGPU 手法が一般的でした。コンピュートシェーダはこの制約を解消し、**任意のデータ構造に対する読み書きと並列計算** を明示的に行えるようにしました。

コンピュートシェーダはワークグループ（Work Group）という単位で実行されます。各ワークグループ内には複数のスレッド（インボケーション）があり、`shared` メモリを通じてワークグループ内でデータを共有できます。ワークグループのサイズは `layout(local_size_x, local_size_y, local_size_z)` で宣言し、ディスパッチ時にワークグループ数を指定します。

代表的な用途には、パーティクルシステムの位置・速度更新、画像処理フィルタ（ブラー・SSAO・ブルーム）、スキニングの GPU 側計算、ライトカリング（タイルベースレンダリング）、機械学習の推論などがあります。

データのやり取りには `SSBO（Shader Storage Buffer Object）` や `Image2D（テクスチャの読み書き）` を使用します。バリア（`glMemoryBarrier`）を挿入してコンピュートシェーダとレンダリングパイプラインの同期を取ることが重要です。

## コンピュートシェーダの主要概念

| 概念 | 説明 |
|------|------|
| ワークグループ | 並列実行の単位。`local_size` で内部スレッド数を定義 |
| gl_GlobalInvocationID | グローバルなスレッドID（x, y, z）|
| gl_LocalInvocationID | ワークグループ内のローカルID |
| `shared` メモリ | ワークグループ内で共有できる高速メモリ |
| SSBO | 任意サイズの読み書き可能バッファ |
| `barrier()` | ワークグループ内スレッドの同期 |

```glsl
#version 450 core

// ワークグループサイズ: 16x16 スレッド = 256 スレッド/グループ
layout(local_size_x = 16, local_size_y = 16, local_size_z = 1) in;

// 入力テクスチャ（読み取り専用）
layout(binding = 0, rgba8) uniform readonly image2D u_input;
// 出力テクスチャ（書き込み専用）
layout(binding = 1, rgba8) uniform writeonly image2D u_output;

// ワークグループ内共有メモリ（16x16 タイル）
shared vec4 tile[16][16];

void main() {
    ivec2 gid = ivec2(gl_GlobalInvocationID.xy);  // グローバルピクセル座標
    ivec2 lid = ivec2(gl_LocalInvocationID.xy);   // ローカル座標

    // タイルにテクスチャデータをロード
    tile[lid.y][lid.x] = imageLoad(u_input, gid);

    // 全スレッドがロードを完了するまで待機
    barrier();

    // 3x3 均一ブラーフィルタ（shared メモリから読み取り）
    vec4 result = vec4(0.0);
    float weight = 1.0 / 9.0;

    for (int dy = -1; dy <= 1; dy++) {
        for (int dx = -1; dx <= 1; dx++) {
            int sx = clamp(lid.x + dx, 0, 15);
            int sy = clamp(lid.y + dy, 0, 15);
            result += tile[sy][sx] * weight;
        }
    }

    // 出力テクスチャに書き込み
    imageStore(u_output, gid, result);
}
```

```python
# CPU 側でのコンピュートシェーダディスパッチ（PyOpenGL 疑似コード）
import numpy as np

# 画像サイズ
width, height = 1024, 1024

# ワークグループサイズ（シェーダの local_size に対応）
local_size_x = 16
local_size_y = 16

# ディスパッチ数の計算（切り上げ除算）
num_groups_x = (width  + local_size_x - 1) // local_size_x   # 64
num_groups_y = (height + local_size_y - 1) // local_size_y   # 64

print(f"DispatchCompute({num_groups_x}, {num_groups_y}, 1)")
# => DispatchCompute(64, 64, 1)
# 合計スレッド数 = 64 * 64 * 16 * 16 = 1,048,576 スレッドが並列実行

# PyOpenGL での実際のディスパッチ
# gl.UseProgram(compute_program)
# gl.BindImageTexture(0, tex_in,  0, False, 0, gl.READ_ONLY,  gl.RGBA8)
# gl.BindImageTexture(1, tex_out, 0, False, 0, gl.WRITE_ONLY, gl.RGBA8)
# gl.DispatchCompute(num_groups_x, num_groups_y, 1)
# gl.MemoryBarrier(gl.SHADER_IMAGE_ACCESS_BARRIER_BIT)
```

## 使用場面

- GPU パーティクルシステム（位置・速度の毎フレーム更新）
- ポストプロセスフィルタ（ブルーム・SSAO・モーションブラー）
- タイルベースライトカリング（Forward+ レンダリング）
- GPU スキニング（骨格アニメーションの頂点計算オフロード）
- ニューラルネットワーク推論・物理シミュレーション

## 参考文献

- [LearnOpenGL — Compute Shaders](https://learnopengl.com/Guest-Articles/2022/Compute-Shaders/Introduction)
- [Khronos OpenGL Wiki — Compute Shader](https://www.khronos.org/opengl/wiki/Compute_Shader)
- [GPU Gems 3 — Chapter 39: Parallel Prefix Sum](https://developer.nvidia.com/gpugems/gpugems3/part-vi-gpu-computing/chapter-39-parallel-prefix-sum-scan-cuda)

<AffiliateBanner site="graphics_navi" />
