import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 頂点シェーダの実装

## 頂点シェーダとは

> 頂点シェーダ（Vertex Shader）は、グラフィックスパイプラインの最初のプログラマブルステージであり、頂点バッファから読み込まれた各頂点に対して一度ずつ実行され、座標変換・法線変換・テクスチャ座標計算などを担う。

頂点シェーダの主な役割は **MVP（Model-View-Projection）変換** です。モデル空間の頂点座標をワールド空間・ビュー空間・クリップ空間へと変換し、最終的に `gl_Position` に書き込むことで GPU がラスタライゼーション処理を開始できます。

変換行列は CPU 側から `uniform` 変数として渡します。`u_model` はオブジェクトのワールド配置、`u_view` はカメラの逆行列、`u_projection` は透視投影または正射影行列です。この3つを乗算した MVP 行列を頂点に掛けることで、最終的なスクリーン座標が決まります。

法線変換には注意が必要です。モデル行列に非均一スケール（X・Y・Z で異なるスケール）が含まれると、法線をそのままモデル行列で変換すると方向が歪みます。この問題を解決するには **法線行列（Normal Matrix）** = `transpose(inverse(mat3(u_model)))` を使用します。

頂点シェーダはフラグメントシェーダへ `out` 変数でデータを渡し、ラスタライゼーション中に各フラグメントへ自動で線形補間されます。この補間された値を使ってフラグメントシェーダ側でライティング計算や UV サンプリングを行います。

## 頂点シェーダの入出力

| 変数種別 | 宣言 | 説明 |
|---------|------|------|
| 入力属性 | `in vec3 a_position` | 頂点バッファから per-vertex で供給 |
| uniform | `uniform mat4 u_mvp` | CPU から全頂点共通で設定 |
| 出力 | `out vec2 v_uv` | フラグメントシェーダへ補間して渡す |
| 組み込み出力 | `gl_Position` | クリップ空間座標（必須）|
| 組み込み出力 | `gl_PointSize` | ポイントスプライトのサイズ |

```glsl
#version 450 core

// --- 入力属性 ---
layout(location = 0) in vec3 a_position;   // モデル空間座標
layout(location = 1) in vec3 a_normal;     // モデル空間法線
layout(location = 2) in vec2 a_uv;         // テクスチャ座標

// --- uniform ---
uniform mat4 u_model;       // モデル行列
uniform mat4 u_view;        // ビュー行列
uniform mat4 u_projection;  // 投影行列

// --- フラグメントシェーダへの出力 ---
out vec3 v_world_pos;    // ワールド空間座標
out vec3 v_normal;       // ワールド空間法線
out vec2 v_uv;

void main() {
    // ワールド空間に変換
    vec4 world_pos = u_model * vec4(a_position, 1.0);
    v_world_pos = world_pos.xyz;

    // 法線行列で法線を変換（非均一スケール対応）
    mat3 normal_matrix = transpose(inverse(mat3(u_model)));
    v_normal = normalize(normal_matrix * a_normal);

    v_uv = a_uv;

    // クリップ空間座標を出力
    gl_Position = u_projection * u_view * world_pos;
}
```

```python
# CPU 側での MVP 行列構築（Python / NumPy 例）
import numpy as np

def look_at(eye, center, up):
    """ビュー行列（カメラ行列）の構築"""
    f = center - eye
    f = f / np.linalg.norm(f)
    r = np.cross(f, up)
    r = r / np.linalg.norm(r)
    u = np.cross(r, f)

    view = np.eye(4)
    view[0, :3] = r
    view[1, :3] = u
    view[2, :3] = -f
    view[0, 3] = -np.dot(r, eye)
    view[1, 3] = -np.dot(u, eye)
    view[2, 3] =  np.dot(f, eye)
    return view

def perspective(fov_y, aspect, near, far):
    """透視投影行列の構築"""
    f = 1.0 / np.tan(np.radians(fov_y) / 2)
    proj = np.zeros((4, 4))
    proj[0, 0] = f / aspect
    proj[1, 1] = f
    proj[2, 2] = (far + near) / (near - far)
    proj[2, 3] = (2 * far * near) / (near - far)
    proj[3, 2] = -1.0
    return proj

eye    = np.array([0, 2, 5], dtype=float)
center = np.array([0, 0, 0], dtype=float)
up     = np.array([0, 1, 0], dtype=float)

view = look_at(eye, center, up)
proj = perspective(fov_y=45.0, aspect=16/9, near=0.1, far=100.0)
print("View matrix:\n", view)
print("Projection matrix:\n", proj)
```

## 使用場面

- オブジェクトのワールド配置・カメラ視点変換・投影変換の適用
- スキニング（ボーンアニメーション）での頂点変形
- 頂点ベースのウェーブアニメーション（旗・水面の揺れ）
- テッセレーションシェーダと組み合わせたサブディビジョン
- モーフターゲットアニメーション（表情変形）

## 参考文献

- [LearnOpenGL — Transformations](https://learnopengl.com/Getting-started/Transformations)
- [OpenGL Wiki — Vertex Shader](https://www.khronos.org/opengl/wiki/Vertex_Shader)
- Akenine-Möller et al., *Real-Time Rendering*, 4th ed. — Chapter 4

<AffiliateBanner site="graphics_navi" />
