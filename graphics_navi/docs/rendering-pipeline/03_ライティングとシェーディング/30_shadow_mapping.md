import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 影の生成（シャドウマッピング）

## シャドウマッピングとは

> シャドウマッピング（Shadow Mapping）は、光源の視点からシーンを深度テクスチャ（シャドウマップ）に描画し、通常レンダリング時にフラグメントの光源からの距離をシャドウマップと比較することで、影にあるかどうかを判定する2パスレンダリング手法である。

1978年に Lance Williams によって提案されたシャドウマッピングは、今日でもリアルタイムグラフィックスで最も広く使われる影生成手法です。物理的な光の遮蔽を「深度の比較」という単純な操作に落とし込んでいるため、GPU に適した効率的な実装が可能です。

実装は2パスに分かれます。**第1パス（深度パス）** では、光源の視点から見たシーンを深度テクスチャに描画します。この際カラー出力は不要なため、深度バッファのみのフレームバッファを使用します。**第2パス（シェーディングパス）** では通常のカメラ視点でレンダリングし、各フラグメントを光源空間に変換してシャドウマップの深度値と比較します。フラグメントの深度がシャドウマップの値より大きければ影の中にあります。

シャドウマッピングの主な問題点は「シャドウアクネ」と「ピーターパン問題」です。シャドウアクネはサーフェスが自身の影を誤判定するセルフシャドウのアーティファクトで、**バイアス値**をフラグメント深度に加算することで緩和します。ピーターパン問題はバイアスが過大だと影がサーフェスから浮いて見える現象です。

精度向上には **PCF（Percentage Closer Filtering）** が有効で、シャドウマップ周辺の複数サンプルの平均を取ることで影の境界をソフトにします。より高品質な **PCSS（Percentage Closer Soft Shadows）** はライトサイズに応じてフィルタ半径を変化させ、遠いオブジェクトほどソフトな影を実現します。

## シャドウマッピングの各手法比較

| 手法 | 品質 | コスト | 特徴 |
|------|------|--------|------|
| Basic Shadow Map | 低 | 低 | ハードシャドウ、ジャギーあり |
| PCF | 中 | 中 | ソフトシャドウ、サンプリングコスト増 |
| PCSS | 高 | 高 | 距離依存のソフトシャドウ |
| VSM | 中高 | 中 | 分散を使う、出血アーティファクトあり |
| Cascaded Shadow Maps | 高 | 高 | 遠近で複数マップを使い分け |

```glsl
// === 第1パス: 深度マップ描画 ===
// 頂点シェーダ（深度パス）
#version 450 core

layout(location = 0) in vec3 a_position;
uniform mat4 u_light_space_matrix;  // light の projection * view
uniform mat4 u_model;

void main() {
    gl_Position = u_light_space_matrix * u_model * vec4(a_position, 1.0);
}
// フラグメントシェーダ（深度パスでは出力不要）
// void main() {} // 深度バッファのみを書き込む
```

```glsl
// === 第2パス: シャドウ付きシェーディング ===
#version 450 core

in vec3 v_world_pos;
in vec3 v_normal;
in vec4 v_light_space_pos;  // 光源空間での座標

out vec4 FragColor;

uniform sampler2D u_shadow_map;
uniform vec3 u_light_dir;
uniform vec3 u_light_color;
uniform vec3 u_object_color;

// PCF を使ったソフトシャドウ
float shadow_pcf(vec4 light_space_pos, float bias) {
    // パースペクティブ除算で NDC 座標へ（-1〜1 → 0〜1）
    vec3 proj = light_space_pos.xyz / light_space_pos.w;
    proj = proj * 0.5 + 0.5;

    // シャドウマップ外は影なし
    if (proj.z > 1.0) return 0.0;

    float shadow     = 0.0;
    vec2  texel_size = 1.0 / textureSize(u_shadow_map, 0);

    // 3x3 PCF カーネル
    for (int x = -1; x <= 1; x++) {
        for (int y = -1; y <= 1; y++) {
            float pcf_depth = texture(u_shadow_map,
                                      proj.xy + vec2(x, y) * texel_size).r;
            shadow += (proj.z - bias > pcf_depth) ? 1.0 : 0.0;
        }
    }
    return shadow / 9.0;
}

void main() {
    vec3 N = normalize(v_normal);
    vec3 L = normalize(-u_light_dir);

    // バイアス（シャドウアクネ防止：法線と光方向に依存する適応バイアス）
    float bias = max(0.005 * (1.0 - dot(N, L)), 0.0005);

    float shadow  = shadow_pcf(v_light_space_pos, bias);
    float diff    = max(dot(N, L), 0.0);

    vec3 ambient  = 0.15 * u_object_color;
    vec3 diffuse  = (1.0 - shadow) * diff * u_light_color * u_object_color;

    FragColor = vec4(ambient + diffuse, 1.0);
}
```

```python
# 光源空間の投影行列計算（平行光源 = 正射影）
import numpy as np

def ortho_projection(left, right, bottom, top, near, far):
    """正射影行列（平行光源のシャドウマップ用）"""
    proj = np.zeros((4, 4))
    proj[0, 0] = 2.0 / (right - left)
    proj[1, 1] = 2.0 / (top - bottom)
    proj[2, 2] = -2.0 / (far - near)
    proj[0, 3] = -(right + left) / (right - left)
    proj[1, 3] = -(top + bottom) / (top - bottom)
    proj[2, 3] = -(far + near)  / (far - near)
    proj[3, 3] = 1.0
    return proj

# シーンを覆う光源の正射影範囲
light_proj = ortho_projection(-10, 10, -10, 10, 1.0, 50.0)
print("Light orthographic projection:\n", light_proj)
```

## 使用場面

- ゲームシーンでのキャラクター・環境のリアルタイム影生成
- サンライト・スポットライト・ポイントライト全ての影表現
- カスケードシャドウマップ（CSM）による広大な屋外シーンの影
- レイトレーシングが使えない場合の高速影代替手法
- 映像・アニメーションの事前焼き付け（ライトマップ生成）

## 参考文献

- [LearnOpenGL — Shadow Mapping](https://learnopengl.com/Advanced-Lighting/Shadows/Shadow-Mapping)
- Lance Williams, "Casting Curved Shadows on Curved Surfaces" (1978)
- [NVIDIA Developer — Percentage Closer Soft Shadows](https://developer.download.nvidia.com/shaderlibrary/docs/shadow_PCSS.pdf)

<AffiliateBanner site="graphics_navi" />
