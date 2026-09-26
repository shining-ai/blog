import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 行列と変換（スケール・回転・平行移動）

## 行列と変換とは

> 行列（Matrix）は複数の線形変換を一つのデータ構造で表現する仕組みであり、3Dグラフィックスではスケール・回転・平行移動のすべてを4×4行列で統一的に扱う。

3Dグラフィックスパイプラインでは、オブジェクトの頂点座標に対して「拡大縮小」「回転」「移動」という3種類の変換を適用します。それぞれを個別に適用するのではなく、4×4の変換行列として合成してから一度に掛けることで、GPUの処理を効率化できます。

**スケール行列**は各軸方向に座標を拡大縮小します。**回転行列**はX・Y・Z軸を中心とした回転を表現します。**平行移動行列**は4×4行列の右端列を使って移動量を埋め込みます（3×3行列では平行移動を表現できないため同次座標を使います）。

これら3種類の変換を合成した行列を**モデル行列（Model Matrix）**と呼び、シェーダに渡します。行列の掛け算は非可換（順序に注意）なため、通常は「スケール → 回転 → 平行移動」の順で合成します。

## 変換行列の種類

| 変換 | 行列サイズ | 特徴 |
|------|----------|------|
| スケール | 4×4 | 対角成分にスケール値 |
| X軸回転 | 4×4 | Y-Z平面内で回転 |
| Y軸回転 | 4×4 | X-Z平面内で回転 |
| Z軸回転 | 4×4 | X-Y平面内で回転 |
| 平行移動 | 4×4 | 右端列に移動量 |
| モデル行列 | 4×4 | 上記の合成 |

```python
import numpy as np

def scale_matrix(sx, sy, sz):
    return np.array([
        [sx,  0,  0, 0],
        [ 0, sy,  0, 0],
        [ 0,  0, sz, 0],
        [ 0,  0,  0, 1]
    ], dtype=float)

def rotate_y_matrix(angle_rad):
    c, s = np.cos(angle_rad), np.sin(angle_rad)
    return np.array([
        [ c, 0, s, 0],
        [ 0, 1, 0, 0],
        [-s, 0, c, 0],
        [ 0, 0, 0, 1]
    ], dtype=float)

def translate_matrix(tx, ty, tz):
    return np.array([
        [1, 0, 0, tx],
        [0, 1, 0, ty],
        [0, 0, 1, tz],
        [0, 0, 0,  1]
    ], dtype=float)

# モデル行列の合成：スケール → 回転 → 平行移動
S = scale_matrix(2.0, 2.0, 2.0)
R = rotate_y_matrix(np.radians(45))
T = translate_matrix(3.0, 0.0, 0.0)

# 右から左に掛ける（列ベクトル方式）
model_matrix = T @ R @ S
print("モデル行列:")
print(np.round(model_matrix, 3))

# 頂点に変換を適用（同次座標）
vertex = np.array([1.0, 0.0, 0.0, 1.0])
transformed = model_matrix @ vertex
print(f"\n変換後の頂点: {transformed[:3]}")
```

```glsl
// GLSL: 頂点シェーダでの行列適用
uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;

in vec3 a_position;

void main() {
    // MVP変換：モデル → ビュー → プロジェクション
    gl_Position = u_projection * u_view * u_model * vec4(a_position, 1.0);
}
```

## 使用場面

- オブジェクトのワールド空間への配置（モデル行列）
- カメラ視点への変換（ビュー行列）
- 透視投影・正射影変換（プロジェクション行列）
- スケルタルアニメーションでのボーン変換行列の合成
- インスタンスレンダリングでの複数オブジェクトへの一括変換

## 参考文献

- Akenine-Möller et al., *Real-Time Rendering*, 4th ed.
- [OpenGL Matrix Math — LearnOpenGL](https://learnopengl.com/Getting-started/Transformations)
- [glm (OpenGL Mathematics) Library](https://github.com/g-truc/glm)

<AffiliateBanner site="graphics_navi" />
