import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Metal / DirectX 12 の概要

## Metal / DirectX 12 とは

> Metal（Apple）と DirectX 12（Microsoft）は Vulkan と同世代の「次世代グラフィックス API」であり、それぞれ macOS/iOS/iPadOS、Windows 10/11/Xbox 向けの低レベルで明示的制御型のグラフィックス/コンピュート API として設計されている。

2015〜2016年に Metal（2014年）・DirectX 12（2015年）・Vulkan（2016年）が相次いでリリースされ、グラフィックス API の世界は「高レベル・暗黙的」（OpenGL・D3D11）から「低レベル・明示的」（Vulkan・DX12・Metal）へと大きく転換した。

**Metal：**
Apple のハードウェア（M1/M2/M3 チップ・A シリーズ）に最適化された Apple 独自の API。macOS Monterey 以降では OpenGL・OpenCL が deprecated となり、すべての新規開発で Metal が推奨される。Apple Silicon では CPU と GPU が統合メモリを共有するため、Metal は CPU/GPU 間のバッファコピーをゼロオーバーヘッドで行える（Unified Memory Architecture）。

**DirectX 12：**
Windows 10/11 と Xbox Series X/S 向けの API。D3D11 に比べて CPU オーバーヘッドを劇的に削減し、マルチスレッドレンダリングを完全サポートする。DirectX Raytracing（DXR）を含むため、RTX GPU でのリアルタイムレイトレーシングの基盤となる。

## 3つの次世代 API の比較

| 項目 | Vulkan | Metal | DirectX 12 |
|------|--------|-------|-----------|
| 開発元 | Khronos Group（オープン標準）| Apple | Microsoft |
| プラットフォーム | Win / Linux / Android / Switch | macOS / iOS / iPadOS | Windows / Xbox |
| 初版リリース | 2016年 | 2014年 | 2015年 |
| シェーダ言語 | GLSL / HLSL（SPIR-V 変換） | Metal Shading Language（MSL）| HLSL |
| レイトレーシング | VK_KHR_ray_tracing | Metal Ray Tracing | DirectX Raytracing（DXR） |
| コンピュートシェーダ | 完全対応 | 完全対応 | 完全対応 |
| 学習難易度 | 最も難しい | 中程度 | 中〜難しい |

```metal
// Metal Shading Language（MSL）の基本シェーダ例

#include <metal_stdlib>
using namespace metal;

// === 頂点シェーダの入出力定義 ===
struct VertexIn {
    float3 position [[attribute(0)]];
    float3 normal   [[attribute(1)]];
    float2 uv       [[attribute(2)]];
};

struct VertexOut {
    float4 position [[position]];  // クリップ空間の位置（必須）
    float3 normal;
    float2 uv;
    float3 worldPos;
};

// ユニフォームバッファ（CPU から渡す定数）
struct Uniforms {
    float4x4 modelMatrix;
    float4x4 viewMatrix;
    float4x4 projectionMatrix;
    float4x4 normalMatrix;
};

// === 頂点シェーダ ===
vertex VertexOut vertexShader(
    VertexIn         in        [[stage_in]],    // 頂点バッファから自動取得
    constant Uniforms& uniforms [[buffer(1)]]   // ユニフォームバッファ
) {
    VertexOut out;

    float4 worldPos = uniforms.modelMatrix * float4(in.position, 1.0);
    out.worldPos = worldPos.xyz;
    out.position = uniforms.projectionMatrix * uniforms.viewMatrix * worldPos;
    out.normal   = (uniforms.normalMatrix * float4(in.normal, 0.0)).xyz;
    out.uv       = in.uv;

    return out;
}

// === フラグメントシェーダ（Phong シェーディング）===
fragment float4 fragmentShader(
    VertexOut        in      [[stage_in]],
    texture2d<float> albedo  [[texture(0)]],
    sampler          samplr  [[sampler(0)]]
) {
    // テクスチャサンプリング
    float4 baseColor = albedo.sample(samplr, in.uv);

    // 簡易ライティング（平行光源）
    float3 lightDir = normalize(float3(1, 2, 1));
    float3 normal   = normalize(in.normal);
    float  diffuse  = max(dot(normal, lightDir), 0.0);

    float3 ambient = 0.1 * baseColor.rgb;
    float3 diffuseColor = diffuse * baseColor.rgb;

    return float4(ambient + diffuseColor, baseColor.a);
}
```

```python
# Metal / DirectX 12 の概念解説と使い分けガイド

print("=== Metal の特徴 ===\n")
metal_features = {
    "Unified Memory Architecture (UMA)": """
    Apple Silicon (M1/M2/M3) では CPU と GPU が同一メモリを共有する。
    MTLBuffer は CPU/GPU 双方から直接アクセスでき、コピーが不要。
    AI/ML ワークロードと3Dグラフィックスの連携が非常に効率的。""",

    "MetalKit": """
    NSViewController/UIViewController との統合、MTKView による
    レンダーループの管理、テクスチャ読み込みを提供する補助フレームワーク。
    生の Metal より大幅にボイラープレートが削減される。""",

    "Metal Performance Shaders (MPS)": """
    畳み込み・行列積・FFT などの GPU 最適化済みカーネルを提供。
    Core ML / Create ML でも内部で使用されている。""",

    "Metal Ray Tracing": """
    iOS 15+ / macOS 12+ で利用可能。
    Intersection Function を使って任意のプリミティブとの交差判定が可能。
    Apple Silicon の RT コアを活用。""",
}

for feature, desc in metal_features.items():
    print(f"[{feature}]")
    print(desc.strip())
    print()

print("\n=== DirectX 12 の特徴 ===\n")
dx12_features = {
    "コマンドリスト / コマンドキュー": """
    D3D12 でも Vulkan 同様にコマンドリストを事前記録してコマンドキューに送信する。
    グラフィックス・コンピュート・コピーの3種類のキューを独立して使用できる。""",

    "ルートシグネチャ": """
    シェーダがどのリソース（テクスチャ・バッファ・定数）にアクセスするかの「コントラクト」。
    Vulkan のパイプラインレイアウト・デスクリプタセットに相当する概念。""",

    "DescriptorHeap": """
    SRV（テクスチャ・バッファの読み取りビュー）・UAV・CBV・RTV・DSV を
    ヒープ単位で管理する。GPU アドレスを直接使えるため非常に高速。""",

    "DirectML": """
    DirectX 12 上で動く機械学習アクセラレーション API。
    WinML（Windows Machine Learning）のバックエンドとして使用される。""",
}

for feature, desc in dx12_features.items():
    print(f"[{feature}]")
    print(desc.strip())
    print()

# 使い分けガイド
print("=== プラットフォーム別 API 選択ガイド ===")
api_guide = {
    "Windows ゲーム（PC / Xbox）": "DirectX 12",
    "macOS / iOS / iPadOS アプリ": "Metal",
    "Linux ゲーム / Android": "Vulkan",
    "クロスプラットフォーム": "Vulkan（または抽象化ライブラリ: bgfx・SDL_GPU・wgpu）",
    "Web ブラウザ": "WebGPU（内部で DX12 / Metal / Vulkan を使用）",
    "ゲームエンジン（Unreal / Unity）": "エンジンが自動選択（各プラットフォームに最適なAPIを使用）",
}
for platform, api in api_guide.items():
    print(f"  {platform:40s}  →  {api}")
```

## 使用場面

- macOS/iOS の新規3D アプリケーション開発（Metal が唯一の選択肢）
- Windows ゲームのグラフィックスバックエンドの最適化（DX12 へ移行）
- Apple Silicon の Unified Memory を活用したCPU/GPU 連携処理
- DirectX 12 の DXR を使ったリアルタイムレイトレーシングの実装
- クロスプラットフォーム対応のためのアブストラクション層（wgpu・Dawn）の活用

## 参考文献

- [Apple Developer - Metal Documentation](https://developer.apple.com/metal/)
- [Microsoft - DirectX 12 Programming Guide](https://learn.microsoft.com/en-us/windows/win32/direct3d12/direct3d-12-graphics)
- [3D Game Shaders for Beginners](https://github.com/lettier/3d-game-shaders-for-beginners)
- [DirectX-Graphics-Samples - Microsoft GitHub](https://github.com/microsoft/DirectX-Graphics-Samples)

<AffiliateBanner site="graphics_navi" />
