import AffiliateBanner from '@site/src/components/AffiliateBanner';

# フラグメントシェーダの実装

## フラグメントシェーダとは

> フラグメントシェーダ（Fragment Shader）は、ラスタライゼーションによって生成された各フラグメント（ピクセル候補）に対して実行されるプログラムであり、テクスチャサンプリング・ライティング計算・カラーブレンディングなどを経て最終的な出力色を決定する。

フラグメントシェーダはパイプライン中で最も「見た目」に直結するステージです。頂点シェーダから補間された `in` 変数（UV 座標・法線・ワールド座標）を受け取り、テクスチャのサンプリング、ライティングモデルの適用、アルファ透明度の計算などを行います。

ライティング計算の代表的手法は **Blinn-Phong** モデルです。アンビエント（環境光）・ディフューズ（拡散反射）・スペキュラ（鏡面反射）の3成分を合算して最終色を導出します。スペキュラ計算には、視線方向と光方向の中間ベクトル（ハーフベクトル）を使う Blinn の最適化版がよく用いられます。

テクスチャサンプリングは `texture(sampler, uv)` 関数で行います。ミップマップや異方性フィルタリングは GPU ドライバが自動的に適用しますが、`textureGrad()` や `textureLod()` を使って手動制御することも可能です。

アルファブレンディングはフラグメントシェーダの出力 `FragColor.a` と深度テストを組み合わせて実現します。半透明オブジェクトは奥から手前の順にソートして描画する必要があります（Order-Independent Transparency でこの制約を回避する手法もあります）。

## フラグメントシェーダの入出力と組み込み変数

| 変数 | 種別 | 説明 |
|------|------|------|
| `in vec2 v_uv` | 補間入力 | 頂点シェーダから補間された UV |
| `in vec3 v_normal` | 補間入力 | 補間されたワールド法線 |
| `uniform sampler2D u_texture` | テクスチャ | CPU から渡されたテクスチャ |
| `out vec4 FragColor` | 出力 | 最終ピクセル色（RGBA）|
| `gl_FragCoord` | 組み込み | スクリーン座標・深度 |
| `gl_FrontFacing` | 組み込み | 表面/裏面判定 |

```glsl
#version 450 core

in vec3 v_world_pos;
in vec3 v_normal;
in vec2 v_uv;

out vec4 FragColor;

uniform sampler2D u_albedo;      // アルベドテクスチャ
uniform sampler2D u_specular_map;
uniform vec3 u_light_pos;        // ライト位置（ワールド空間）
uniform vec3 u_view_pos;         // カメラ位置
uniform vec3 u_light_color;

void main() {
    // テクスチャサンプリング
    vec3 albedo   = texture(u_albedo,      v_uv).rgb;
    float spec_m  = texture(u_specular_map, v_uv).r;

    // 法線・ライト方向・視線方向の正規化
    vec3 N = normalize(v_normal);
    vec3 L = normalize(u_light_pos - v_world_pos);
    vec3 V = normalize(u_view_pos  - v_world_pos);
    vec3 H = normalize(L + V);   // Blinn-Phong ハーフベクトル

    // アンビエント
    vec3 ambient  = 0.1 * albedo;

    // ディフューズ（ランバート）
    float diff    = max(dot(N, L), 0.0);
    vec3 diffuse  = diff * albedo * u_light_color;

    // スペキュラ（Blinn-Phong）
    float shininess = 64.0;
    float spec      = pow(max(dot(N, H), 0.0), shininess) * spec_m;
    vec3 specular   = spec * u_light_color;

    vec3 result = ambient + diffuse + specular;

    // ガンマ補正（リニア→sRGB）
    result = pow(result, vec3(1.0 / 2.2));

    FragColor = vec4(result, 1.0);
}
```

```python
# Blinn-Phong ライティングの Python 実装（シェーダのデバッグ用）
import numpy as np

def blinn_phong(albedo, N, L, V, light_color,
                ambient_k=0.1, shininess=64.0):
    """
    albedo     : vec3 テクスチャ色
    N          : 正規化済み法線
    L          : 正規化済みライト方向
    V          : 正規化済み視線方向
    light_color: ライトの色
    """
    H = (L + V) / np.linalg.norm(L + V)

    ambient  = ambient_k * albedo
    diff     = max(np.dot(N, L), 0.0)
    diffuse  = diff * albedo * light_color
    spec     = max(np.dot(N, H), 0.0) ** shininess
    specular = spec * light_color

    return ambient + diffuse + specular

# テスト
albedo      = np.array([0.8, 0.4, 0.1])
N           = np.array([0.0, 1.0, 0.0])
L           = np.normalize = lambda v: v / np.linalg.norm(v)
L           = np.array([1.0, 1.0, 0.0]) / np.linalg.norm([1.0, 1.0, 0.0])
V           = np.array([0.0, 1.0, 1.0]) / np.linalg.norm([0.0, 1.0, 1.0])
light_color = np.array([1.0, 1.0, 1.0])

color = blinn_phong(albedo, N, L, V, light_color)
print("Blinn-Phong color:", np.clip(color, 0, 1))
```

## 使用場面

- Blinn-Phong・Phong・PBR ライティングモデルの実装
- テクスチャの合成・マスキング・色変換（カラーグレーディング）
- アルファテストによる草・葉・フェンスの描画
- アウトライン描画（バックフェースカリング反転でのセルシェーディング）
- デカールやステンシルバッファを使ったエフェクト

## 参考文献

- [LearnOpenGL — Basic Lighting](https://learnopengl.com/Lighting/Basic-Lighting)
- [OpenGL Wiki — Fragment Shader](https://www.khronos.org/opengl/wiki/Fragment_Shader)
- [Shadertoy](https://www.shadertoy.com/) — フラグメントシェーダの実験場

<AffiliateBanner site="graphics_navi" />
