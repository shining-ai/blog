import AffiliateBanner from '@site/src/components/AffiliateBanner';

# シェーダとは・GLSL の基本

## シェーダとは

> シェーダ（Shader）は GPU 上で並列実行される小さなプログラムであり、グラフィックスパイプラインの特定のステージで頂点やフラグメントの処理をカスタマイズする。

かつての OpenGL は固定機能パイプライン（Fixed Function Pipeline）で、ライティングや色計算が固定のアルゴリズムで行われていました。OpenGL 2.0（2004年）からシェーダが導入され、開発者が GPU の処理を自由にプログラムできるようになりました。

シェーダは **GLSL（OpenGL Shading Language）** というC言語に近い言語で記述します。シェーダの種類は主に「頂点シェーダ」「フラグメントシェーダ」「コンピュートシェーダ」などがあります。GPU は各頂点・各フラグメントに対してシェーダを**大量並列実行**するため、`if` 文の多用や条件分岐はパフォーマンスに影響します。

GLSL のデータ型には `float`・`vec2`/`vec3`/`vec4`（ベクトル型）・`mat3`/`mat4`（行列型）・`sampler2D`（テクスチャサンプラー）などがあります。組み込み関数には `dot()`・`cross()`・`normalize()`・`mix()`・`clamp()`・`texture()` などがあり、シェーダ記述の核心となります。

## GLSL のデータ型と組み込み関数

| 型 | 説明 | 例 |
|----|------|----|
| `float` | 浮動小数点スカラー | `float x = 1.0;` |
| `vec2/3/4` | 2〜4成分ベクトル | `vec3 color = vec3(1,0,0);` |
| `mat3/4` | 3×3〜4×4行列 | `mat4 mvp;` |
| `sampler2D` | 2Dテクスチャサンプラー | `uniform sampler2D tex;` |
| `int` / `uint` | 整数型 | `int id = 0;` |
| `bool` | 論理型 | `bool visible = true;` |

```glsl
// GLSL 最小構成のシェーダペア

// === 頂点シェーダ ===
#version 450 core

// 入力属性（頂点バッファから）
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec2 a_uv;

// フラグメントシェーダへの出力（補間される）
out vec2 v_uv;
out vec3 v_color;

// ユニフォーム（CPUから設定）
uniform mat4 u_mvp;
uniform float u_time;

void main() {
    v_uv = a_uv;

    // 時間によるカラーアニメーション
    v_color = vec3(
        sin(u_time) * 0.5 + 0.5,
        cos(u_time * 0.7) * 0.5 + 0.5,
        0.5
    );

    gl_Position = u_mvp * vec4(a_position, 1.0);
}

// === フラグメントシェーダ ===
#version 450 core

in vec2 v_uv;
in vec3 v_color;

out vec4 FragColor;

uniform sampler2D u_texture;

void main() {
    // テクスチャ色と頂点カラーを乗算合成
    vec4 texColor = texture(u_texture, v_uv);
    FragColor = texColor * vec4(v_color, 1.0);
}
```

```python
# GLSL 組み込み関数の Python 等価実装
import numpy as np

def glsl_mix(x, y, a):
    """mix(x, y, a) = x*(1-a) + y*a（線形補間）"""
    return x * (1 - a) + y * a

def glsl_clamp(x, min_val, max_val):
    """clamp(x, min, max): min以上max以下に制限"""
    return np.clip(x, min_val, max_val)

def glsl_smoothstep(edge0, edge1, x):
    """smoothstep: 滑らかなステップ関数"""
    t = np.clip((x - edge0) / (edge1 - edge0), 0, 1)
    return t * t * (3 - 2 * t)

def glsl_fract(x):
    """fract(x): 小数部の取得"""
    return x - np.floor(x)

# サンプル使用
print(glsl_mix(0.0, 1.0, 0.3))        # 0.3
print(glsl_clamp(-0.5, 0.0, 1.0))     # 0.0
print(glsl_smoothstep(0.2, 0.8, 0.5)) # ~0.5
print(glsl_fract(3.7))                 # 0.7
```

## 使用場面

- カスタムライティングモデル（Phong・Blinn-Phong・PBR）の実装
- テクスチャの動的合成・マスク処理・色変換
- 頂点アニメーション（波・旗・モーフィング）
- ポストプロセスエフェクト（ブルーム・DOF・カラーグレーディング）
- プロシージャルテクスチャ生成（ノイズ・炎・水）

## 参考文献

- [The Book of Shaders](https://thebookofshaders.com/) — インタラクティブなGLSL入門
- [Khronos GLSL Specification](https://www.khronos.org/opengl/wiki/Core_Language_(GLSL))
- [Shadertoy](https://www.shadertoy.com/) — GLSL シェーダのギャラリー・実験場

<AffiliateBanner site="graphics_navi" />
