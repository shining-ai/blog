import AffiliateBanner from '@site/src/components/AffiliateBanner';

# スキニングとボーンアニメーション

## スキニングとは

> スキニングとは、3Dキャラクターの骨格（ボーン・スケルトン）の変形に合わせてメッシュの頂点位置を変形する技術であり、各頂点がどのボーンにどれだけ影響されるかを示す「ウェイト」によって滑らかなアニメーションを実現する。

キャラクターアニメーションの実装は「**スケルトン**（ボーンの階層構造）」と「**スキン**（ウェイトを持ったメッシュ）」の2つで構成される。アニメーション再生時はボーンの変換行列（回転・移動・スケール）を計算し、その行列をウェイトで混合してメッシュ頂点を変形する。

**スキニングの種類：**
- **リニアブレンドスキニング（LBS）**：各頂点の最終位置をボーン行列のウェイト付き線形和で計算。実装が簡単でGPUに実装しやすいが「キャンディーラッパー問題」（捻じれ時の体積収縮）が発生する。
- **デュアルクォータニオンスキニング（DQS）**：クォータニオンを使って体積収縮を防ぐ。ゲームエンジンで広く採用。

**バインドポーズ（T ポーズ）：**
スキニングのリファレンスとなる初期姿勢。各ボーンの「逆バインド行列（Inverse Bind Matrix）」を事前計算し、アニメーション時のボーン変換に掛け合わせて頂点を変形する。

## スキニング計算の仕組み

| 概念 | 説明 | 用途 |
|------|------|------|
| **バインドポーズ** | スキニング設定時の基準姿勢（T ポーズ等） | 逆バインド行列の計算 |
| **逆バインド行列** | バインドポーズでのボーン行列の逆行列 | 頂点をボーン空間に変換 |
| **ボーン変換行列** | アニメーション中の現在のボーン行列 | 変形後の位置を計算 |
| **スキニング行列** | 逆バインド × ボーン変換 | 頂点を変形する最終行列 |
| **ウェイト** | 各頂点が各ボーンから受ける影響度（合計=1） | 複数ボーンの影響を混合 |

```python
import numpy as np
from dataclasses import dataclass, field

@dataclass
class Bone:
    """スケルトンの1つのボーン（関節）"""
    name: str
    parent_idx: int         # 親ボーンのインデックス（ルートは -1）
    bind_matrix: np.ndarray = field(default_factory=lambda: np.eye(4))  # (4,4)

    def inverse_bind_matrix(self) -> np.ndarray:
        """逆バインド行列を計算する"""
        return np.linalg.inv(self.bind_matrix)


@dataclass
class SkinVertex:
    """スキニングされた頂点の情報"""
    position: np.ndarray    # (3,) バインドポーズ時の位置
    bone_indices: list[int]  # 影響するボーンのインデックス（最大4）
    bone_weights: list[float] # 対応するウェイト（合計=1.0）


def compute_skinned_position(
    vertex: SkinVertex,
    bone_matrices: list[np.ndarray],
    inverse_bind_matrices: list[np.ndarray],
) -> np.ndarray:
    """
    リニアブレンドスキニング（LBS）による頂点位置の計算。

    最終位置 = Σ (weight_i × bone_matrix_i × inv_bind_i × bind_position)

    GPUのバーテックスシェーダでは各頂点に対してこの計算を並列実行する。
    一般的にボーンの影響は最大4本（GPUの vec4 に対応）。
    """
    pos_h = np.array([*vertex.position, 1.0])  # 同次座標
    result = np.zeros(4)

    for bone_idx, weight in zip(vertex.bone_indices, vertex.bone_weights):
        if weight <= 0.0:
            continue
        # スキニング行列 = ボーン変換行列 × 逆バインド行列
        skinning_matrix = bone_matrices[bone_idx] @ inverse_bind_matrices[bone_idx]
        result += weight * (skinning_matrix @ pos_h)

    return result[:3]


def make_rotation_y(angle_rad: float) -> np.ndarray:
    """Y 軸回りの回転行列（4x4）"""
    c, s = np.cos(angle_rad), np.sin(angle_rad)
    return np.array([
        [c,  0, s, 0],
        [0,  1, 0, 0],
        [-s, 0, c, 0],
        [0,  0, 0, 1],
    ], dtype=np.float32)


def make_translation(tx: float, ty: float, tz: float) -> np.ndarray:
    """平行移動行列（4x4）"""
    m = np.eye(4, dtype=np.float32)
    m[0, 3] = tx
    m[1, 3] = ty
    m[2, 3] = tz
    return m


# === シンプルな腕のスケルトンのシミュレーション ===
print("=== LBS スキニングのデモ（2ボーンの腕）===\n")

# バインドポーズ（T ポーズ）でのボーン行列
shoulder_bind = make_translation(0, 0, 0)   # 肩: 原点
elbow_bind    = make_translation(1, 0, 0)   # 肘: 肩から X+1

bones = [
    Bone("shoulder", -1, shoulder_bind),
    Bone("elbow",     0, elbow_bind),
]

inv_bind_matrices = [b.inverse_bind_matrix() for b in bones]

# アニメーション: 肘を 45度 曲げる
elbow_rotation = make_rotation_y(np.radians(45))
# 現在のボーン行列（肘は肩から移動 + 45度回転）
current_matrices = [
    shoulder_bind,           # 肩は動かない
    elbow_bind @ elbow_rotation  # 肘は回転
]

# 肘寄り（ウェイト 0.3/0.7）の頂点が変形される様子
vertex = SkinVertex(
    position=np.array([1.2, 0.0, 0.0], dtype=np.float32),
    bone_indices=[0, 1],
    bone_weights=[0.3, 0.7],
)

original_pos = vertex.position
deformed_pos = compute_skinned_position(vertex, current_matrices, inv_bind_matrices)

print(f"バインドポーズ位置: {original_pos}")
print(f"アニメーション後位置: {deformed_pos.round(4)}")
print(f"（肘 45度屈曲・肘寄りウェイト 70%）")

# GLSL シェーダでの LBS 実装例
print("\n=== GLSL 頂点シェーダでの LBS（コード概要）===")
glsl_skinning = """
layout(location = 0) in vec3  a_position;
layout(location = 3) in ivec4 a_boneIndices;   // 最大4ボーン
layout(location = 4) in vec4  a_boneWeights;   // 対応するウェイト

uniform mat4 u_boneMatrices[128];  // ボーン行列の配列（128本まで）

void main() {
    // LBS: ウェイト付きボーン行列の合計
    mat4 skinMatrix =
        a_boneWeights.x * u_boneMatrices[a_boneIndices.x] +
        a_boneWeights.y * u_boneMatrices[a_boneIndices.y] +
        a_boneWeights.z * u_boneMatrices[a_boneIndices.z] +
        a_boneWeights.w * u_boneMatrices[a_boneIndices.w];

    vec4 skinnedPos = skinMatrix * vec4(a_position, 1.0);
    gl_Position = u_mvp * skinnedPos;
}
"""
print(glsl_skinning)
```

## 使用場面

- glTF 形式のスキニングメッシュを Three.js・Babylon.js で再生する
- Unreal Engine / Unity でのヒューマノイドキャラクターのアニメーションリターゲット
- GLSL / HLSL の頂点シェーダに LBS を実装してカスタムアニメーション制御
- アニメーションブレンドツリー（歩行・走行・攻撃のブレンド）の実装
- GPU スキニングによるパフォーマンス最適化（CPU スキニングからの移行）

## 参考文献

- [Real-Time Rendering, 4th Ed. - Chapter 4: Transforms](https://www.realtimerendering.com/)
- [glTF 2.0 - Skinning](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#skins)
- [Learn OpenGL - Skeletal Animation](https://learnopengl.com/Guest-Articles/2020/Skeletal-Animation)
- [Skinned Mesh Rendering - GPU Gems](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-4-dawn-demo-rendering-detail)

<AffiliateBanner site="graphics_navi" />
