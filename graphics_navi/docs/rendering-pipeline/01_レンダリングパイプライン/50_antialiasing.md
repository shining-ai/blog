import AffiliateBanner from '@site/src/components/AffiliateBanner';

# アンチエイリアシング

## アンチエイリアシングとは

> アンチエイリアシング（Anti-Aliasing, AA）は、ジャギー（階段状のギザギザ）やモアレなどのエイリアシングアーティファクトを低減するための技術群の総称であり、複数のサンプリング戦略によって画像の品質を向上させる。

デジタル画像はピクセルという離散的なグリッドで構成されているため、斜めのエッジや細かいディテールを表現するとギザギザ（ジャギー）が発生します。これを**エイリアシング**と呼びます。アンチエイリアシングはこの問題を解決するための技術です。

主なアンチエイリアシング手法は大きく3種類に分類できます。①**MSAA（Multi-Sample AA）**：各ピクセルを複数のサブサンプル位置でカバレッジ（三角形の内外判定）テストし、その結果を平均します。深度テストも複数回行いますが、シェーダは1回のみ実行するためFSAAより効率的です。②**FXAA/SMAA（ポストプロセスAA）**：レンダリング後の最終画像に対して画像処理フィルタを適用してエッジを滑らかにします。処理コストが低く、実装が容易です。③**TAA（Temporal AA）**：前フレームの情報を再利用しサブピクセル精度でジッタリングした複数フレームを蓄積します。現代のゲームエンジンで広く採用されています。

## アンチエイリアシング手法の比較

| 手法 | 品質 | 処理コスト | 特徴 |
|------|------|-----------|------|
| MSAA 4x | 高 | 中〜高 | ハードウェア支援、エッジのみ有効 |
| MSAA 8x | 非常に高 | 高 | メモリ消費が大きい |
| FXAA | 中 | 低 | ルミナンスベースのエッジ検出 |
| SMAA | 高 | 低〜中 | FXAAより高品質 |
| TAA | 非常に高 | 中 | ゴースト・ジッタに注意 |
| DLSS/FSR | 最高 | 低 | AI超解像（NVIDIA/AMD） |

```glsl
// FXAA（Fast Approximate Anti-Aliasing）の簡易実装
#version 450 core

uniform sampler2D u_scene;
uniform vec2 u_texelSize; // 1.0 / 解像度

in vec2 v_uv;
out vec4 FragColor;

float luminance(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
}

void main() {
    vec2 uv = v_uv;
    vec3 center  = texture(u_scene, uv).rgb;
    vec3 north   = texture(u_scene, uv + vec2( 0, 1) * u_texelSize).rgb;
    vec3 south   = texture(u_scene, uv + vec2( 0,-1) * u_texelSize).rgb;
    vec3 east    = texture(u_scene, uv + vec2( 1, 0) * u_texelSize).rgb;
    vec3 west    = texture(u_scene, uv + vec2(-1, 0) * u_texelSize).rgb;

    // ルミナンス差でエッジを検出
    float lum_c = luminance(center);
    float lum_n = luminance(north);
    float lum_s = luminance(south);
    float lum_e = luminance(east);
    float lum_w = luminance(west);

    float lum_min = min(lum_c, min(min(lum_n, lum_s), min(lum_e, lum_w)));
    float lum_max = max(lum_c, max(max(lum_n, lum_s), max(lum_e, lum_w)));
    float lum_range = lum_max - lum_min;

    // エッジでない場合はそのまま返す
    if (lum_range < 0.0312) {
        FragColor = vec4(center, 1.0);
        return;
    }

    // エッジ方向の計算
    float grad_h = abs(lum_n + lum_s - 2.0*lum_c) * 2.0
                 + abs(lum_e + lum_w - 2.0*lum_c);
    float grad_v = abs(lum_e + lum_w - 2.0*lum_c) * 2.0
                 + abs(lum_n + lum_s - 2.0*lum_c);
    bool is_horizontal = grad_h >= grad_v;

    // サンプリング方向を決めてブレンド
    vec2 step_dir = is_horizontal ? vec2(u_texelSize.x, 0) : vec2(0, u_texelSize.y);
    vec3 blended = (center + texture(u_scene, uv + step_dir).rgb
                           + texture(u_scene, uv - step_dir).rgb) / 3.0;
    FragColor = vec4(blended, 1.0);
}
```

```python
import numpy as np

def ssaa_downsample(high_res_image, scale=2):
    """SSAA（スーパーサンプリング）のダウンサンプル
    scale x scale ピクセルを平均して1ピクセルに"""
    h, w = high_res_image.shape[:2]
    new_h, new_w = h // scale, w // scale
    result = np.zeros((new_h, new_w) + high_res_image.shape[2:], dtype=np.float32)
    for i in range(scale):
        for j in range(scale):
            result += high_res_image[i::scale, j::scale].astype(float)
    return (result / (scale * scale)).astype(high_res_image.dtype)

# 例：4x SSAA（2x2 ブロックを平均）
rng = np.random.default_rng(42)
high_res = rng.integers(0, 256, (480, 640, 3), dtype=np.uint8)
low_res = ssaa_downsample(high_res, scale=2)
print(f"高解像度: {high_res.shape}")
print(f"ダウンサンプル後: {low_res.shape}")
```

## 使用場面

- ゲームエンジンのTAA実装（UE5・Unityなど標準採用）
- VRアプリケーションでのMSAA（快適な視認性のため高品質を優先）
- モバイルゲームでのFXAA（低コストなAA）
- ラスタライゼーション後のポストプロセスパスでのSMAA
- DLSS/FSR 2.0 による AI を使った超解像AA

## 参考文献

- [FXAA by Timothy Lottes — NVIDIA Developer](https://developer.download.nvidia.com/assets/gamedev/files/sdk/11/FXAA_WhitePaper.pdf)
- [Temporal AA — Playdead GDC 2016](https://www.gdcvault.com/play/1022970/Temporal-Reprojection-Anti-Aliasing-in)
- Akenine-Möller et al., *Real-Time Rendering*, 4th ed., Chapter 5

<AffiliateBanner site="graphics_navi" />
