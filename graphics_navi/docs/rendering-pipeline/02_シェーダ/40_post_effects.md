import AffiliateBanner from '@site/src/components/AffiliateBanner';

# シェーダによるポストエフェクト

## ポストエフェクトとは

> ポストエフェクト（Post-Processing Effect）は、3D シーンを一度オフスクリーンテクスチャ（レンダーターゲット）に描画した後、そのテクスチャをフルスクリーンクワッドに適用するフラグメントシェーダで画像処理を行う手法である。

ポストエフェクトはゲームエンジンやリアルタイム映像制作において、映画的な視覚表現を低コストで実現する重要な手法です。シーン全体をピクセル単位で加工できるため、カメラレンズの物理特性（被写界深度・レンズフレア）や映像表現（カラーグレーディング・ビネット）を後付けで付与できます。

代表的な手法は以下の通りです。**ブルーム（Bloom）** は輝度の高い部分を抽出してガウスブラーをかけ、光の滲みを表現します。**被写界深度（Depth of Field）** は深度バッファを参照し、ピントの外れた部分をボカします。**FXAA（Fast Approximate Anti-Aliasing）** はエッジを検出して補間するポストエフェクト型アンチエイリアスです。**カラーグレーディング** は LUT（ルックアップテーブル）テクスチャを使って色調を一括変換します。

ポストエフェクトのパイプラインは、1) シーンを FBO（Framebuffer Object）にレンダリング → 2) カラーテクスチャと深度テクスチャを取得 → 3) フルスクリーンクワッドにエフェクトシェーダを適用、という流れです。複数のエフェクトをチェーンする場合は「ピンポンバッファ」（2枚の FBO を交互に使う）が一般的です。

## 主要なポストエフェクト比較

| エフェクト | 入力 | アルゴリズム概要 | コスト |
|-----------|------|----------------|--------|
| ブルーム | カラーバッファ | 輝度抽出 + ガウスブラー + 加算合成 | 中 |
| 被写界深度 | カラー + 深度 | 深度に応じたボケ半径でブラー | 高 |
| SSAO | 法線 + 深度 | サンプリングによるオクルージョン推定 | 高 |
| FXAA | カラーバッファ | エッジ検出 + 方向補間 | 低 |
| カラーグレーディング | カラーバッファ | 3D LUT テクスチャルックアップ | 低 |
| モーションブラー | カラー + 速度 | 速度方向へのサンプリング加算 | 中 |

```glsl
// ========================
// ブルームの第1パス: 輝度抽出
// ========================
#version 450 core

in vec2 v_uv;
out vec4 FragColor;

uniform sampler2D u_scene;
uniform float u_threshold;  // 輝度しきい値（例: 1.0）

// 輝度（luminance）計算
float luminance(vec3 color) {
    return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
    vec3 color = texture(u_scene, v_uv).rgb;
    float lum  = luminance(color);

    // しきい値以上の輝度成分のみを抽出
    float soft   = lum - u_threshold;
    float contrib = max(0.0, soft) / max(lum, 0.0001);
    FragColor = vec4(color * contrib, 1.0);
}
```

```glsl
// ========================
// ブルームの第2パス: ガウスブラー（横方向）
// ========================
#version 450 core

in vec2 v_uv;
out vec4 FragColor;

uniform sampler2D u_bloom_tex;
uniform vec2 u_texel_size;  // 1.0 / textureSize

// ガウスカーネル係数（σ=1.0, 9タップ）
const float weights[5] = float[](0.227027, 0.194595, 0.121622, 0.054054, 0.016216);

void main() {
    vec3 result = texture(u_bloom_tex, v_uv).rgb * weights[0];

    for (int i = 1; i < 5; i++) {
        // 横方向サンプリング
        result += texture(u_bloom_tex, v_uv + vec2(u_texel_size.x * i, 0.0)).rgb * weights[i];
        result += texture(u_bloom_tex, v_uv - vec2(u_texel_size.x * i, 0.0)).rgb * weights[i];
    }

    FragColor = vec4(result, 1.0);
}
```

```glsl
// ========================
// 最終合成: シーン + ブルーム + トーンマッピング
// ========================
#version 450 core

in vec2 v_uv;
out vec4 FragColor;

uniform sampler2D u_scene;
uniform sampler2D u_bloom;
uniform float u_bloom_strength;  // 例: 0.04

// ACES フィルミックトーンマッピング
vec3 aces(vec3 x) {
    float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
    return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0);
}

void main() {
    vec3 scene = texture(u_scene, v_uv).rgb;
    vec3 bloom = texture(u_bloom, v_uv).rgb;

    // ブルーム加算合成
    vec3 hdr = scene + bloom * u_bloom_strength;

    // トーンマッピング（HDR → LDR）
    vec3 ldr = aces(hdr);

    // ガンマ補正
    ldr = pow(ldr, vec3(1.0 / 2.2));

    FragColor = vec4(ldr, 1.0);
}
```

## 使用場面

- ゲームのポストプロセスチェーン（ブルーム・DoF・モーションブラー・FXAA）
- 映像制作ツールでのリアルタイムカラーグレーディング
- VR アプリケーションでのレンズ歪み補正
- UI オーバーレイ描画前の背景ブラー（毛ガラスエフェクト）
- スクリーンスペースリフレクション（SSR）

## 参考文献

- [LearnOpenGL — Bloom](https://learnopengl.com/Advanced-Lighting/Bloom)
- [LearnOpenGL — HDR](https://learnopengl.com/Advanced-Lighting/HDR)
- [FXAA White Paper — NVIDIA Timothy Lottes](https://developer.download.nvidia.com/assets/gamedev/files/sdk/11/FXAA_WhitePaper.pdf)

<AffiliateBanner site="graphics_navi" />
