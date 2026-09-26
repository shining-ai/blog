import AffiliateBanner from '@site/src/components/AffiliateBanner';

# GPU レイトレーシング（DXR・Vulkan Ray Tracing）

## GPU レイトレーシングとは

> GPU レイトレーシングとは、NVIDIA Turing アーキテクチャ（RTX シリーズ）以降に搭載された専用のレイトレーシングコア（RT Core）を活用し、ソフトウェアシミュレーションより数桁高速にリアルタイムレイトレーシングを実現する技術であり、DirectX Raytracing（DXR）と Vulkan Ray Tracing として標準化されている。

従来のソフトウェアレイトレーシングは映画制作や静止画レンダリングで広く使われてきたが、リアルタイム（1フレーム16ms以内）に収めることは CPU では不可能だった。GPU のシェーダによる並列化でも、BVH（Bounding Volume Hierarchy）のトラバーサルはランダムメモリアクセスが多くキャッシュが機能しにくいため、長らくリアルタイム化の壁だった。

2018年、NVIDIA は Turing アーキテクチャで RT Core を搭載し、BVH トラバーサルと光線-AABB/三角形の交差判定をハードウェアに固定実装することで大幅な高速化を実現した。同年、Microsoft は DXR（DirectX 12 の拡張）を、Khronos は Vulkan Ray Tracing を標準化し、GPU レイトレーシングのエコシステムが整備された。

**ハイブリッドレンダリング：**
実際のゲームでは、ラスタライズで一次描画を行い、反射・影・AO（Ambient Occlusion）・GI（Global Illumination）のみレイトレーシングで補完する「ハイブリッドアプローチ」が主流である。

## DXR vs Vulkan Ray Tracing の比較

| 項目 | DXR（DirectX Raytracing） | Vulkan Ray Tracing |
|------|--------------------------|-------------------|
| API 標準 | Microsoft DirectX 12 拡張 | Khronos Vulkan 拡張（VK_KHR） |
| 対応プラットフォーム | Windows 10/11・Xbox | Windows・Linux・Android |
| シェーダ言語 | HLSL | GLSL・HLSL（SPIR-V 経由） |
| TLAS/BLAS | AccelerationStructure | VkAccelerationStructureKHR |
| 光線生成シェーダ | RayGeneration | raygen |
| ミス時シェーダ | Miss | miss |
| ヒット時シェーダ | ClosestHit / AnyHit | closesthit / anyhit |
| バインドレスリソース | Descriptor Heaps | Descriptor Sets |

```hlsl
// DXR: レイトレーシングシェーダの最小構成（HLSL）

// === TLAS（トップレベル加速構造）のバインド ===
RaytracingAccelerationStructure g_tlas : register(t0);
RWTexture2D<float4> g_output           : register(u0);

// === カメラ定数 ===
cbuffer Camera : register(b0) {
    float4x4 invViewProj;
    float3   cameraPos;
};

// === レイ定義構造体 ===
struct ShadowPayload {
    bool shadowed;
};

struct PrimaryPayload {
    float3 color;
    float  distance;
};

// ===================================================
// レイ生成シェーダ: 各ピクセルから1本のレイを飛ばす
// ===================================================
[shader("raygeneration")]
void RayGen() {
    uint2 pixel = DispatchRaysIndex().xy;
    uint2 dims  = DispatchRaysDimensions().xy;

    // ピクセル中心の正規化デバイス座標
    float2 ndc = (float2(pixel) + 0.5) / float2(dims) * 2.0 - 1.0;
    ndc.y = -ndc.y;

    // ワールド空間のレイを構築
    float4 nearH = mul(float4(ndc, 0.0, 1.0), invViewProj);
    float4 farH  = mul(float4(ndc, 1.0, 1.0), invViewProj);
    float3 origin    = nearH.xyz / nearH.w;
    float3 direction = normalize(farH.xyz / farH.w - origin);

    RayDesc ray;
    ray.Origin    = origin;
    ray.Direction = direction;
    ray.TMin      = 0.001;
    ray.TMax      = 1000.0;

    PrimaryPayload payload;
    payload.color    = float3(0, 0, 0);
    payload.distance = -1.0;

    TraceRay(g_tlas,
             RAY_FLAG_CULL_BACK_FACING_TRIANGLES,
             0xFF,  // インスタンスマスク（全ジオメトリ）
             0,     // レイタイプ
             1,     // ジオメトリ数
             0,     // ミスシェーダインデックス
             ray,
             payload);

    g_output[pixel] = float4(payload.color, 1.0);
}

// ===================================================
// 最近傍ヒットシェーダ: ジオメトリにヒットした場合
// ===================================================
[shader("closesthit")]
void ClosestHit(inout PrimaryPayload payload, in BuiltInTriangleIntersectionAttributes attr) {
    // 重心座標からサーフェス法線を補間
    float3 bary = float3(
        1.0 - attr.barycentrics.x - attr.barycentrics.y,
        attr.barycentrics.x,
        attr.barycentrics.y
    );

    // 簡易シェーディング（法線を色として表示）
    float3 normal = bary.x * /* v0 法線 */ float3(0,1,0)
                  + bary.y * /* v1 法線 */ float3(0,1,0)
                  + bary.z * /* v2 法線 */ float3(0,1,0);
    normal = normalize(normal);

    // 法線を可視化（デバッグ用）
    payload.color    = normal * 0.5 + 0.5;
    payload.distance = RayTCurrent();
}

// ===================================================
// ミスシェーダ: レイがどのジオメトリにも当たらなかった場合
// ===================================================
[shader("miss")]
void Miss(inout PrimaryPayload payload) {
    // 背景色（スカイボックスの代わりにシンプルなグラデーション）
    float3 dir = WorldRayDirection();
    float  t   = dir.y * 0.5 + 0.5;
    payload.color    = lerp(float3(0.1, 0.1, 0.3), float3(0.5, 0.7, 1.0), t);
    payload.distance = -1.0;
}
```

```python
# Python での DXR / Vulkan Ray Tracing の構築ステップ（擬似コード）
# 実際の実装は C++ + DX12 または C++ + Vulkan で行う

raytracing_setup_steps = """
=== GPU レイトレーシングのセットアップ手順（DXR の場合）===

1. 加速構造の構築
   ┌─ BLAS（Bottom Level AS）
   │    └ 各メッシュ（頂点バッファ + インデックスバッファ）から構築
   │      D3D12_RAYTRACING_GEOMETRY_DESC を設定して BuildRaytracingAccelerationStructure()
   │
   └─ TLAS（Top Level AS）
        └ BLAS インスタンス（変換行列 + シェーダテーブルオフセット）の配列から構築
          ジオメトリの位置・向きを変更しても TLAS の再構築は BLAS より高速

2. レイトレーシングパイプラインの作成
   D3D12_STATE_OBJECT_DESC にシェーダ（RayGen・Hit・Miss）を登録
   最大再帰深度（MaxTraceRecursionDepth）を設定（通常 1〜4 程度）

3. シェーダテーブルの構築
   各ジオメトリに対してどの HitGroup（ClosestHit・AnyHit・Intersection）を使うかを定義
   GPU メモリ上にシェーダ識別子 + ローカルルート引数を並べる

4. レイトレーシングの実行
   DispatchRays() でレイ生成シェーダを全ピクセルに対して起動
   GPU が各ピクセルのレイを並列に処理する

5. 出力テクスチャの合成
   レイトレーシング結果（RWTexture2D）をラスタライズ結果と合成
   DLSS / FSR などのアップスケーリングを適用して解像度を補完
"""

denoising_note = """
=== RTXDI / RESTIR / DLSS の役割 ===

リアルタイムレイトレーシングでは1ピクセルあたり1〜数本しかレイを飛ばせないため、
出力画像には激しいノイズが生じる。以下の技術でノイズを除去する：

- DLSS（Deep Learning Super Sampling）: AI でノイズ除去 + 低解像度から高解像度に拡大
- NRD（NVIDIA Real-Time Denoisers）: Temporal Accumulation + Spatial Filtering
- SVGF（Spatiotemporal Variance-Guided Filter）: 分散に基づいたフィルタリング
- ReSTIR（Reservoir-based Spatiotemporal Importance Resampling）: GI / Direct Lighting の効率的サンプリング
"""

print(raytracing_setup_steps)
print(denoising_note)
```

## 使用場面

- ゲームエンジン（Unreal Engine 5 Lumen・Unity HDRP）でのリアルタイムGI・反射の実装
- DXR のチュートリアル（Microsoft D3D12 Raytracing Samples）を通じた基礎学習
- ラスタライズのシャドウマップをレイトレーシングのソフトシャドウで置き換えるハイブリッド実装
- NVIDIA RTXDI を使ったリアルタイムのグローバルイルミネーション
- Vulkan Ray Tracing を使ったクロスプラットフォームなパストレーサーの開発

## 参考文献

- [Microsoft - DirectX Raytracing (DXR)](https://microsoft.github.io/DirectX-Specs/d3d/Raytracing.html)
- [Khronos - Vulkan Ray Tracing](https://www.khronos.org/blog/vulkan-ray-tracing-final-specification-release)
- [NVIDIA - Ray Tracing Gems（無料 PDF）](https://www.realtimerendering.com/raytracinggems/)
- [Scratchapixel - Ray Tracing from Scratch](https://www.scratchapixel.com/)

<AffiliateBanner site="graphics_navi" />
