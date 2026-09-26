import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 座標系の変換（モデル→ワールド→カメラ→クリップ）

## 座標系の変換とは

> 3Dレンダリングパイプラインでは頂点座標がモデル空間・ワールド空間・カメラ（ビュー）空間・クリップ空間・NDC・スクリーン空間という複数の座標空間を順番に変換されて画面に描画される。

3Dオブジェクトを画面に描画するまでには、頂点座標が複数の「座標系」を経由して変換されます。この変換の連鎖を理解することは、シェーダの実装やグラフィックスデバッグの基礎となります。

各変換を担う行列は次の通りです。**モデル行列**はオブジェクト固有の座標系（モデル空間）からワールド座標系へ変換します。**ビュー行列**はワールド空間からカメラを基準とした座標系（カメラ空間・ビュー空間）へ変換します。**プロジェクション行列**はカメラ空間からクリップ空間へ変換し、透視投影または正射影の変換を行います。

これら3つを合成した行列が **MVP行列（Model-View-Projection）** です。GPUはクリップ空間の座標を受け取り、$w$ で割って NDC（正規化デバイス座標：$[-1, 1]^3$）に変換し、最後にビューポート変換でスクリーン座標に変換します。

## 座標変換の各ステージ

| 空間 | 変換行列 | 説明 |
|------|---------|------|
| モデル空間 | — | オブジェクト独自のローカル座標 |
| ワールド空間 | モデル行列 M | すべてのオブジェクトを統一した座標 |
| カメラ空間 | ビュー行列 V | カメラを原点とした座標 |
| クリップ空間 | プロジェクション行列 P | 視錐台内の同次座標 |
| NDC | 透視除算（÷w） | $[-1,1]^3$ の正規化座標 |
| スクリーン空間 | ビューポート変換 | ピクセル座標 |

```python
import numpy as np

def look_at(eye, center, up):
    """ビュー行列の生成（lookAt）"""
    f = center - eye
    f /= np.linalg.norm(f)
    r = np.cross(f, up / np.linalg.norm(up))
    r /= np.linalg.norm(r)
    u = np.cross(r, f)
    return np.array([
        [ r[0],  r[1],  r[2], -np.dot(r, eye)],
        [ u[0],  u[1],  u[2], -np.dot(u, eye)],
        [-f[0], -f[1], -f[2],  np.dot(f, eye)],
        [    0,     0,     0,              1  ]
    ])

def perspective(fov_y_rad, aspect, near, far):
    """透視投影行列の生成"""
    f = 1.0 / np.tan(fov_y_rad / 2)
    return np.array([
        [f/aspect, 0,                          0,  0],
        [       0, f,                          0,  0],
        [       0, 0, (far+near)/(near-far), 2*far*near/(near-far)],
        [       0, 0,                         -1,  0]
    ])

# シーンの設定
eye    = np.array([0.0, 2.0, 5.0])
center = np.array([0.0, 0.0, 0.0])
up     = np.array([0.0, 1.0, 0.0])

V = look_at(eye, center, up)
P = perspective(np.radians(60), 16/9, 0.1, 100.0)

# モデル行列（単位行列 = 原点に配置）
M = np.eye(4)

# MVP行列
MVP = P @ V @ M

# 頂点の変換（モデル空間の原点）
vertex_model = np.array([0.0, 0.0, 0.0, 1.0])
vertex_clip = MVP @ vertex_model

# 透視除算で NDC へ
ndc = vertex_clip[:3] / vertex_clip[3]
print(f"クリップ座標: {vertex_clip}")
print(f"NDC: {ndc}")
```

```glsl
// GLSL 頂点シェーダ: MVP変換のフルパイプライン
uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;

in vec3 a_position;
in vec3 a_normal;

out vec3 v_worldPos;
out vec3 v_worldNormal;

void main() {
    // ワールド空間での位置（ライティング計算に使用）
    vec4 worldPos = u_model * vec4(a_position, 1.0);
    v_worldPos = worldPos.xyz;

    // 法線もワールド空間に変換（転置逆行列を使用）
    v_worldNormal = mat3(transpose(inverse(u_model))) * a_normal;

    // クリップ空間への最終変換
    gl_Position = u_projection * u_view * worldPos;
}
```

## 使用場面

- シェーダ内でのライティング計算（ワールド空間で法線・光源を統一）
- シャドウマッピング（光源視点の VP 行列でテクスチャ座標を計算）
- デプスバッファの精度設計（near/far の比率によるZ精度問題）
- スクリーンスペースエフェクト（SSAO・SSR）でのカメラ空間活用
- ビルボード（常にカメラに正面を向かせる処理）

## 参考文献

- [LearnOpenGL — Coordinate Systems](https://learnopengl.com/Getting-started/Coordinate-Systems)
- [Scratchapixel — The Rendering Pipeline](https://www.scratchapixel.com/lessons/3d-basic-rendering/rendering-3d-scene-overview)
- Akenine-Möller et al., *Real-Time Rendering*, 4th ed.

<AffiliateBanner site="graphics_navi" />
