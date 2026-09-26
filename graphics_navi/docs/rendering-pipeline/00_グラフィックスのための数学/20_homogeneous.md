import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 同次座標とアフィン変換

## 同次座標とは

> 同次座標（Homogeneous Coordinates）は、3D座標に第4成分 $w$ を追加することで、平行移動を含むすべてのアフィン変換を行列の掛け算だけで統一的に表現するための数学的枠組みである。

通常の3次元座標 $(x, y, z)$ は3×3行列との積で線形変換（スケール・回転）を表現できますが、平行移動はベクトルの加算が必要なため行列演算で統一できません。そこで4つ目の成分 $w$ を追加し $(x, y, z, w)$ という**同次座標**で表現します。

$w=1$ のとき通常の「点」（位置ベクトル）、$w=0$ のとき「方向ベクトル」を表します。この区別はシェーダ計算で重要で、方向ベクトルには平行移動が適用されてはいけないため、`vec4(direction, 0.0)` として変換します。

クリップ空間での透視除算（パースペクティブデビジョン）も同次座標の応用で、GPUがクリップ座標 $(x_c, y_c, z_c, w_c)$ を受け取った後、$w_c$ で割ることでNDC（正規化デバイス座標）を得ます。これにより遠くのオブジェクトが小さく見える透視投影を自動的に実現します。

## 同次座標の変換規則

| $w$ の値 | 意味 | 平行移動の影響 |
|----------|------|--------------|
| $w = 1$ | 点（位置） | 受ける |
| $w = 0$ | 方向ベクトル | 受けない |
| $w \neq 1$ | クリップ座標 | $w$ で割って正規化 |

```python
import numpy as np

def to_homogeneous_point(v3):
    """3D点を同次座標（w=1）に変換"""
    return np.append(v3, 1.0)

def to_homogeneous_vector(v3):
    """3D方向ベクトルを同次座標（w=0）に変換"""
    return np.append(v3, 0.0)

def from_homogeneous(v4):
    """同次座標からの透視除算"""
    return v4[:3] / v4[3]

# 平行移動行列
T = np.array([
    [1, 0, 0, 5],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1]
], dtype=float)

# 点には平行移動が適用される
point = to_homogeneous_point(np.array([1.0, 0.0, 0.0]))
moved_point = T @ point
print(f"点の変換後: {moved_point[:3]}")  # [6. 0. 0.]

# 方向ベクトルには平行移動が適用されない
direction = to_homogeneous_vector(np.array([1.0, 0.0, 0.0]))
moved_dir = T @ direction
print(f"方向の変換後: {moved_dir[:3]}")  # [1. 0. 0.] （変化なし）

# クリップ座標から NDC への透視除算
clip_coord = np.array([2.0, 1.0, 3.0, 2.0])  # w=2
ndc = from_homogeneous(clip_coord)
print(f"NDC座標: {ndc}")  # [1.0, 0.5, 1.5]
```

```glsl
// GLSL: 点と方向ベクトルへの変換行列適用の違い
uniform mat4 u_model;

in vec3 a_position;
in vec3 a_normal;

void main() {
    // 点（位置）: w=1 → 平行移動が適用される
    vec4 worldPos = u_model * vec4(a_position, 1.0);

    // 方向ベクトル（法線）: w=0 → 平行移動は無視される
    // 法線には転置逆行列を使うのが正しい
    vec3 worldNormal = mat3(transpose(inverse(u_model))) * a_normal;

    gl_Position = worldPos;
}
```

## 使用場面

- MVP変換（Model-View-Projection）パイプラインでの頂点変換
- 透視投影での透視除算（$w$ による割り算でパース感を生成）
- 点と方向ベクトルの変換を区別するシェーダコーディング
- 射影テクスチャマッピング（テクスチャ座標の同次変換）
- 2Dグラフィックスでのアフィン変換の統一表現

## 参考文献

- Foley et al., *Computer Graphics: Principles and Practice*, 3rd ed.
- [Homogeneous Coordinates — scratchapixel.com](https://www.scratchapixel.com/lessons/mathematics-physics-for-computer-graphics/geometry/homogeneous-coordinates-perspective-divide)
- [LearnOpenGL — Coordinate Systems](https://learnopengl.com/Getting-started/Coordinate-Systems)

<AffiliateBanner site="graphics_navi" />
