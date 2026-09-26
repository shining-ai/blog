import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 物理ベースレンダリング（PBR）

## 物理ベースレンダリングとは

> 物理ベースレンダリング（PBR: Physically Based Rendering）は、光の物理的な振る舞い（エネルギー保存・マイクロファセット理論・フレネル反射）に基づいたシェーディングモデルであり、現実世界の素材をアーティストが一貫したパラメータで表現できるようにする手法である。

従来のフォン反射モデルでは、アンビエント・ディフューズ・スペキュラのパラメータが物理的な意味を持たず、照明環境が変わるとマテリアルの見た目が大きく崩れる問題がありました。PBR はこの問題を解決し、ゲームエンジン（Unity・Unreal Engine）や映画 VFX で現在の業界標準となっています。

PBR の主要な概念は以下の3つです。**マイクロファセット理論** は、サーフェスを微細な鏡面（マイクロファセット）の集合と見なし、ラフネス（粗さ）パラメータで統計的に分布を表現します。**エネルギー保存則** は、反射光のエネルギーが入射光のエネルギーを超えないことを保証します（スペキュラが明るいほどディフューズは暗くなる）。**フレネル反射** は、視線の角度によって反射率が変化する現象で、斜め方向（グレージング角）では全ての素材が強く反射します。

一般的な PBR モデルは **Metallic-Roughness ワークフロー** を採用し、アルベド（基本色）・メタリック（金属度）・ラフネス（粗さ）の3つのテクスチャで素材を定義します。金属は光を直接反射し、非金属（誘電体）は拡散反射と一部のスペキュラ反射を持ちます。

## PBR のパラメータと照明モデル

| パラメータ | 範囲 | 説明 |
|-----------|------|------|
| Albedo | [0,1]^3 | 素材の基本色（金属の場合は反射色）|
| Metallic | [0,1] | 0=誘電体（非金属）、1=金属 |
| Roughness | [0,1] | 0=完全鏡面、1=完全拡散 |
| AO | [0,1] | アンビエントオクルージョン係数 |
| Normal | [-1,1]^3 | 法線マップからの法線 |

```glsl
#version 450 core

in vec3 v_world_pos;
in vec3 v_normal;
in vec2 v_uv;

out vec4 FragColor;

uniform sampler2D u_albedo;
uniform sampler2D u_metallic_roughness;  // G: roughness, B: metallic
uniform sampler2D u_ao;
uniform sampler2D u_normal_map;

uniform vec3 u_light_positions[4];
uniform vec3 u_light_colors[4];
uniform vec3 u_cam_pos;

const float PI = 3.14159265359;

// --- GGX 正規分布関数（NDF） ---
float DistributionGGX(vec3 N, vec3 H, float roughness) {
    float a   = roughness * roughness;
    float a2  = a * a;
    float NdH = max(dot(N, H), 0.0);
    float denom = NdH * NdH * (a2 - 1.0) + 1.0;
    return a2 / (PI * denom * denom);
}

// --- Smith のジオメトリ遮蔽関数 ---
float GeometrySchlickGGX(float NdV, float roughness) {
    float r = roughness + 1.0;
    float k = (r * r) / 8.0;
    return NdV / (NdV * (1.0 - k) + k);
}
float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
    return GeometrySchlickGGX(max(dot(N, V), 0.0), roughness)
         * GeometrySchlickGGX(max(dot(N, L), 0.0), roughness);
}

// --- シュリックのフレネル近似 ---
vec3 FresnelSchlick(float cosTheta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

void main() {
    vec3  albedo    = pow(texture(u_albedo, v_uv).rgb, vec3(2.2)); // sRGB -> linear
    float metallic  = texture(u_metallic_roughness, v_uv).b;
    float roughness = texture(u_metallic_roughness, v_uv).g;
    float ao        = texture(u_ao, v_uv).r;

    vec3 N = normalize(v_normal);
    vec3 V = normalize(u_cam_pos - v_world_pos);

    // 非金属の F0 = 0.04、金属はアルベド色
    vec3 F0 = mix(vec3(0.04), albedo, metallic);

    vec3 Lo = vec3(0.0);

    for (int i = 0; i < 4; i++) {
        vec3 L    = normalize(u_light_positions[i] - v_world_pos);
        vec3 H    = normalize(V + L);
        float dist = length(u_light_positions[i] - v_world_pos);
        float atten = 1.0 / (dist * dist);
        vec3 radiance = u_light_colors[i] * atten;

        float NDF = DistributionGGX(N, H, roughness);
        float G   = GeometrySmith(N, V, L, roughness);
        vec3  F   = FresnelSchlick(max(dot(H, V), 0.0), F0);

        // クック-トランス BRDF のスペキュラ項
        vec3  num   = NDF * G * F;
        float denom = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.0001;
        vec3  specular = num / denom;

        // エネルギー保存: kD + kS = 1
        vec3 kD = (vec3(1.0) - F) * (1.0 - metallic);

        float NdL = max(dot(N, L), 0.0);
        Lo += (kD * albedo / PI + specular) * radiance * NdL;
    }

    vec3 ambient = vec3(0.03) * albedo * ao;
    vec3 color   = ambient + Lo;

    // HDR トーンマッピング + ガンマ補正
    color = color / (color + vec3(1.0));
    color = pow(color, vec3(1.0 / 2.2));

    FragColor = vec4(color, 1.0);
}
```

## 使用場面

- ゲームエンジン（Unreal Engine・Unity HDRP）でのリアルな素材表現
- 映画・アニメの VFX での物理的に正確な素材シミュレーション
- 製品デザインレビューでのリアルタイム素材プレビュー
- 建築ビジュアライゼーションでの金属・ガラス・コンクリートの表現
- VR/AR での現実世界への 3D オブジェクト合成

## 参考文献

- [LearnOpenGL — PBR Theory](https://learnopengl.com/PBR/Theory)
- [Allegorithmic PBR Guide](https://substance3d.adobe.com/tutorials/courses/the-pbr-guide-part-1)
- [Epic Games — Physically Based Shading in Unreal Engine 4](https://cdn2.unrealengine.com/Resources/files/2013SiggraphPresentationsNotes-26915738.pdf)

<AffiliateBanner site="graphics_navi" />
