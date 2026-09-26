import AffiliateBanner from '@site/src/components/AffiliateBanner';

# グローバルイルミネーション概要

## グローバルイルミネーションとは

> グローバルイルミネーション（GI: Global Illumination）は、光源から直接届く直接照明だけでなく、サーフェスで反射・散乱した光が他のサーフェスを照らす間接照明も含めて計算する照明手法であり、現実世界の光の振る舞いをより忠実に再現する。

直接照明のみのレンダリングでは、光が直接届かない部分は一律に暗くなり、現実の柔らかい陰りや色の滲み（カラーブリーディング）が表現できません。GI はこの制約を取り除き、環境全体の光の相互作用を計算することで映画品質の映像を実現します。

GI の実装手法は大きく「事前計算型」と「リアルタイム型」に分かれます。**ライトマップ（Light Maps）** はオフラインで GI を計算してテクスチャに焼き付ける手法で、静的なシーンに適しています。Unity の Enlighten や Unreal Engine のライトマスがこれに相当します。

リアルタイム GI の代表手法として、**LPV（Light Propagation Volumes）** はボクセルグリッドで間接光を伝播させる手法、**VXGI（Voxel Cone Tracing GI）** はシーンをボクセル化してコーントレーシングで GI を近似する手法です。Unreal Engine 5 の **Lumen** は動的 GI を高品質に実現した最新手法で、スクリーンスペース・レイトレーシング・SDF（Signed Distance Field）を組み合わせて使います。

リフレクションの GI 表現には **IBL（Image Based Lighting）** が広く使われます。環境 HDR 画像を事前フィルタリングしたキューブマップを使い、PBR のスペキュラ・アンビエント項を計算します。

## グローバルイルミネーション手法の比較

| 手法 | 動的対応 | 品質 | コスト | 主な用途 |
|------|---------|------|--------|---------|
| ライトマップ | 静的のみ | 高 | 低（実行時）| ゲーム・建築 VIZ |
| SSAO / SSGI | 部分的 | 中 | 低〜中 | スクリーン空間近似 |
| LPV | 動的 | 中 | 中 | モバイル・旧世代 |
| VXGI | 動的 | 高 | 高 | ハイエンド PC |
| Lumen (UE5) | 動的 | 高 | 高 | AAA ゲーム |
| パストレーシング | 動的 | 最高 | 非常に高 | RTX・映画 |

```glsl
// IBL（Image Based Lighting）でのスペキュラ間接光
// PBR フラグメントシェーダの IBL 部分
#version 450 core

in vec3 v_world_pos;
in vec3 v_normal;
in vec2 v_uv;

out vec4 FragColor;

uniform samplerCube u_irradiance_map;   // 拡散間接光用（事前フィルタ済み）
uniform samplerCube u_prefilter_map;    // スペキュラ間接光用（ミップマップ）
uniform sampler2D   u_brdf_lut;         // BRDF 積分テーブル
uniform sampler2D   u_albedo;
uniform sampler2D   u_metallic_roughness;
uniform vec3        u_cam_pos;

// シュリックのフレネル（ラフネス考慮）
vec3 FresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness) {
    return F0 + (max(vec3(1.0 - roughness), F0) - F0)
              * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

void main() {
    vec3  albedo    = pow(texture(u_albedo, v_uv).rgb, vec3(2.2));
    float metallic  = texture(u_metallic_roughness, v_uv).b;
    float roughness = texture(u_metallic_roughness, v_uv).g;

    vec3 N  = normalize(v_normal);
    vec3 V  = normalize(u_cam_pos - v_world_pos);
    vec3 R  = reflect(-V, N);  // 反射方向

    vec3 F0 = mix(vec3(0.04), albedo, metallic);
    vec3 F  = FresnelSchlickRoughness(max(dot(N, V), 0.0), F0, roughness);

    // エネルギー保存
    vec3 kS = F;
    vec3 kD = (vec3(1.0) - kS) * (1.0 - metallic);

    // 拡散間接光（イラジアンスマップからサンプリング）
    vec3 irradiance = texture(u_irradiance_map, N).rgb;
    vec3 diffuse    = kD * irradiance * albedo;

    // スペキュラ間接光（プレフィルタマップ + BRDF LUT）
    const float MAX_REFLECTION_LOD = 4.0;
    float lod = roughness * MAX_REFLECTION_LOD;
    vec3 prefiltered = textureLod(u_prefilter_map, R, lod).rgb;

    vec2 brdf = texture(u_brdf_lut,
                        vec2(max(dot(N, V), 0.0), roughness)).rg;
    vec3 specular = prefiltered * (F * brdf.x + brdf.y);

    // 直接照明 Lo は別途計算（省略）
    vec3 ambient  = diffuse + specular;
    vec3 color    = ambient; // + Lo

    color = color / (color + vec3(1.0));  // Reinhard トーンマッピング
    color = pow(color, vec3(1.0 / 2.2));

    FragColor = vec4(color, 1.0);
}
```

```python
# ライトマップの UV 展開とテクセル密度の概算
import numpy as np

def lightmap_resolution(surface_area_m2, texel_density=50):
    """
    surface_area_m2: サーフェス面積（m²）
    texel_density: テクセル/m（例: 50 texels/m）
    returns: 必要なライトマップ解像度の一辺（ピクセル）
    """
    total_texels = surface_area_m2 * (texel_density ** 2)
    side = int(np.ceil(np.sqrt(total_texels)))
    # 2の累乗に切り上げ
    pow2 = 1
    while pow2 < side:
        pow2 *= 2
    return pow2

# 部屋の壁（20m²）のライトマップ解像度
room_area = 20.0  # m²
res = lightmap_resolution(room_area, texel_density=50)
print(f"室内壁面 {room_area}m² のライトマップ推奨解像度: {res}x{res}")
# => 2048x2048 程度
```

## 使用場面

- AAA ゲームの室内・屋外シーンでのリアルな間接照明
- 建築・インテリアビジュアライゼーションの事前ライトベイク
- HDR 環境マップを使った製品レンダリング（IBL）
- VR 体験での没入感のある照明表現
- Unreal Engine 5 Lumen を使った映画品質のリアルタイム GI

## 参考文献

- [LearnOpenGL — IBL: Diffuse Irradiance](https://learnopengl.com/PBR/IBL/Diffuse-irradiance)
- [Unreal Engine 5 — Lumen Global Illumination](https://docs.unrealengine.com/5.0/en-US/lumen-global-illumination-and-reflections-in-unreal-engine/)
- Christophe Schlick, "An Inexpensive BRDF Model for Physically-based Rendering" (1994)

<AffiliateBanner site="graphics_navi" />
