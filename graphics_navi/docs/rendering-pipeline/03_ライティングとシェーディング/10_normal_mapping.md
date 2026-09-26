import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 法線マッピング

## 法線マッピングとは

> 法線マッピング（Normal Mapping）は、低ポリゴンメッシュの表面にテクスチャとして法線情報を格納し、ライティング計算時に擬似的な凹凸を表現する技術であり、ポリゴン数を増やさずに高精細な表面ディテールをリアルタイムで再現できる。

3D モデルの細かい凹凸（岩の表面・金属の傷・布の織り目など）をポリゴンで表現しようとすると、膨大なポリゴン数が必要になります。法線マッピングはこの問題を解決し、数万ポリゴンのモデルを数百万ポリゴン相当の見た目にする重要な最適化手法です。

法線マップは RGB テクスチャとして保存され、RG チャンネルが接線空間の XY 方向、B チャンネルが法線の Z 方向を表します。法線マップの見た目は特徴的な青紫色をしていますが、これは多くのサーフェスでほぼ上向き（Z+ 方向）の法線が多いためです。

実装の核心は **TBN 行列** です。TBN は接線（Tangent）・従法線（Bitangent）・法線（Normal）の3つの基底ベクトルからなる行列で、法線マップのテクスチャ空間（接線空間）をワールド空間に変換します。TBN 行列はモデルの UV 展開と頂点法線から頂点シェーダで計算し、フラグメントシェーダに渡します。

視差マッピング（Parallax Mapping）や急峻視差マッピング（Steep Parallax Mapping）は法線マッピングを発展させ、UV 座標もオフセットすることでさらに立体感のある凹凸表現を実現します。

## 法線マッピングのバリエーション

| 手法 | 凹凸感 | コスト | 特徴 |
|------|--------|--------|------|
| 法線マッピング | 中 | 低 | 最も一般的、接線空間法線テクスチャ |
| 視差マッピング | 高 | 中 | UV オフセットで奥行き感を追加 |
| 急峻視差マッピング | 高 | 中高 | レイステップで視差を精密計算 |
| 視差オクルージョン | 非常に高 | 高 | セルフシャドウも再現 |

```glsl
// 頂点シェーダ: TBN 行列の計算
#version 450 core

layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec2 a_uv;
layout(location = 3) in vec3 a_tangent;   // 接線（UV の U 方向）

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;

out vec2 v_uv;
out vec3 v_tangent_light_pos;
out vec3 v_tangent_view_pos;
out vec3 v_tangent_frag_pos;

uniform vec3 u_light_pos;
uniform vec3 u_view_pos;

void main() {
    vec3 world_pos = vec3(u_model * vec4(a_position, 1.0));

    mat3 normal_matrix = transpose(inverse(mat3(u_model)));
    vec3 N = normalize(normal_matrix * a_normal);
    vec3 T = normalize(normal_matrix * a_tangent);
    T = normalize(T - dot(T, N) * N);  // グラム・シュミット直交化
    vec3 B = cross(N, T);              // 従法線

    // TBN の転置 = TBN の逆行列（直交行列）
    mat3 TBN_inv = transpose(mat3(T, B, N));

    // ライト・視点を接線空間に変換
    v_tangent_light_pos = TBN_inv * u_light_pos;
    v_tangent_view_pos  = TBN_inv * u_view_pos;
    v_tangent_frag_pos  = TBN_inv * world_pos;

    v_uv = a_uv;
    gl_Position = u_projection * u_view * vec4(world_pos, 1.0);
}
```

```glsl
// フラグメントシェーダ: 法線マップを使ったライティング
#version 450 core

in vec2 v_uv;
in vec3 v_tangent_light_pos;
in vec3 v_tangent_view_pos;
in vec3 v_tangent_frag_pos;

out vec4 FragColor;

uniform sampler2D u_albedo;
uniform sampler2D u_normal_map;

void main() {
    // アルベドテクスチャ
    vec3 albedo = texture(u_albedo, v_uv).rgb;

    // 法線マップから法線を取得し [-1, 1] の範囲に変換
    vec3 N = texture(u_normal_map, v_uv).rgb;
    N = normalize(N * 2.0 - 1.0);  // [0,1] -> [-1,1]（接線空間）

    // Blinn-Phong ライティング（接線空間）
    vec3 L = normalize(v_tangent_light_pos - v_tangent_frag_pos);
    vec3 V = normalize(v_tangent_view_pos  - v_tangent_frag_pos);
    vec3 H = normalize(L + V);

    vec3 ambient  = 0.1  * albedo;
    float diff    = max(dot(N, L), 0.0);
    vec3 diffuse  = diff * albedo;
    float spec    = pow(max(dot(N, H), 0.0), 64.0);
    vec3 specular = vec3(spec * 0.5);

    FragColor = vec4(ambient + diffuse + specular, 1.0);
}
```

```python
# Python で TBN 行列の計算ロジックを確認
import numpy as np

def compute_tangent(pos0, pos1, pos2, uv0, uv1, uv2):
    """三角形の接線ベクトルを UV から計算"""
    dp1 = pos1 - pos0
    dp2 = pos2 - pos0
    duv1 = uv1 - uv0
    duv2 = uv2 - uv0

    denom = duv1[0] * duv2[1] - duv2[0] * duv1[1]
    if abs(denom) < 1e-8:
        return np.array([1.0, 0.0, 0.0])

    f = 1.0 / denom
    tangent = f * (duv2[1] * dp1 - duv1[1] * dp2)
    return tangent / np.linalg.norm(tangent)

# 正方形の2つの三角形（XZ 平面）
p0 = np.array([0.0, 0.0, 0.0])
p1 = np.array([1.0, 0.0, 0.0])
p2 = np.array([0.0, 0.0, 1.0])
uv0 = np.array([0.0, 0.0])
uv1 = np.array([1.0, 0.0])
uv2 = np.array([0.0, 1.0])

T = compute_tangent(p0, p1, p2, uv0, uv1, uv2)
print("Tangent:", T)  # [1.0, 0.0, 0.0]
```

## 使用場面

- ゲームキャラクターの肌・装甲・服の凹凸表現
- 建築ビジュアライゼーションでのレンガ・石材・木目テクスチャ
- 車両モデルの塗装傷・ボディプレスラインの表現
- PBR ワークフローでの詳細サーフェス情報補完
- ローポリゲームアセットの見た目向上

## 参考文献

- [LearnOpenGL — Normal Mapping](https://learnopengl.com/Advanced-Lighting/Normal-Mapping)
- [Mikktspace — 接線空間の標準化](http://www.mikktspace.com/)
- [Catlike Coding — Rendering Tutorial](https://catlikecoding.com/unity/tutorials/rendering/)

<AffiliateBanner site="graphics_navi" />
