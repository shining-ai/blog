import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 頂点処理とプリミティブ組み立て

## 頂点処理とは

> 頂点処理（Vertex Processing）はレンダリングパイプラインの最初の GPU ステージであり、各頂点にモデル・ビュー・プロジェクション変換を適用してクリップ空間座標に変換するとともに、ライティングに必要な属性（法線・UV・接線）も変換する。

頂点処理は **頂点シェーダ** というプログラムによって制御されます。GPUは頂点バッファ（VBO）に格納された各頂点を並列処理し、頂点シェーダが各頂点に対して1回呼び出されます。

頂点シェーダの主な役割は3つです。①**座標変換**：モデル空間の頂点座標をMVP行列でクリップ空間に変換します。②**法線変換**：ライティング計算用の法線ベクトルをワールド空間に変換します（スケールがある場合は転置逆行列を使用）。③**属性の転送**：テクスチャUV座標・頂点カラーなどをフラグメントシェーダに渡します。

**プリミティブ組み立て（Primitive Assembly）**は頂点処理の後のステージで、変換済みの頂点を三角形・直線・点などのプリミティブにまとめます。この後クリッピング（視錐台外の頂点除去）が行われ、ラスタライゼーションへ進みます。

## 頂点属性の種類

| 属性名 | GLSL 型 | 典型的な用途 |
|--------|---------|------------|
| 位置（Position） | `vec3` / `vec4` | 変換後のクリップ座標 |
| 法線（Normal） | `vec3` | ライティング計算 |
| UV座標 | `vec2` | テクスチャサンプリング |
| 接線（Tangent） | `vec4` | 法線マッピング |
| 頂点カラー | `vec4` | 頂点ごとの色情報 |
| ボーンウェイト | `vec4` | スキニングアニメーション |

```glsl
// 頂点シェーダ: 法線マッピングに対応した実装例
#version 450 core

// 頂点バッファの属性
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec2 a_uv;
layout(location = 3) in vec4 a_tangent; // w成分は接線の向き符号

// ユニフォーム行列
uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;

// フラグメントシェーダへの出力
out vec3 v_worldPos;
out vec2 v_uv;
out mat3 v_TBN; // Tangent-Bitangent-Normal 行列

void main() {
    vec4 worldPos = u_model * vec4(a_position, 1.0);
    v_worldPos = worldPos.xyz;
    v_uv = a_uv;

    // TBN 行列の構築（法線マッピング用）
    mat3 normalMatrix = mat3(transpose(inverse(u_model)));
    vec3 N = normalize(normalMatrix * a_normal);
    vec3 T = normalize(normalMatrix * a_tangent.xyz);
    // グラム・シュミット直交化
    T = normalize(T - dot(T, N) * N);
    vec3 B = cross(N, T) * a_tangent.w;
    v_TBN = mat3(T, B, N);

    gl_Position = u_projection * u_view * worldPos;
}
```

```python
# 三角形プリミティブの頂点バッファ（インターリーブ形式）
import numpy as np

# 各頂点: [x, y, z,  nx, ny, nz,  u, v]
vertices = np.array([
    # 位置              法線           UV
    [-0.5, -0.5, 0.0,  0,0,1,  0.0, 0.0],
    [ 0.5, -0.5, 0.0,  0,0,1,  1.0, 0.0],
    [ 0.0,  0.5, 0.0,  0,0,1,  0.5, 1.0],
], dtype=np.float32)

# インデックスバッファ（三角形1枚）
indices = np.array([0, 1, 2], dtype=np.uint32)

stride = vertices.shape[1] * vertices.itemsize  # バイト単位のストライド
print(f"頂点数: {len(vertices)}")
print(f"ストライド: {stride} bytes")
print(f"位置オフセット: 0 bytes")
print(f"法線オフセット: {3 * vertices.itemsize} bytes")
print(f"UVオフセット: {6 * vertices.itemsize} bytes")
```

## 使用場面

- スキニング（ボーン行列を頂点シェーダで適用するGPUスキニング）
- 頂点アニメーション（モーフターゲットの線形補間）
- テッセレーションの前処理（LOD制御のためのフィードバック計算）
- インスタンスレンダリング（gl_InstanceID を使ったインスタンス別変換）
- パーティクルシステムでの大量頂点の並列変換

## 参考文献

- [LearnOpenGL — Hello Triangle](https://learnopengl.com/Getting-started/Hello-Triangle)
- [Khronos OpenGL Wiki — Vertex Shader](https://www.khronos.org/opengl/wiki/Vertex_Shader)
- Akenine-Möller et al., *Real-Time Rendering*, 4th ed.

<AffiliateBanner site="graphics_navi" />
