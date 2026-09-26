import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ポリゴンメッシュの表現

## ポリゴンメッシュとは

> ポリゴンメッシュとは、3Dオブジェクトの表面を三角形や四角形などの多角形（ポリゴン）の集合で表現するデータ構造であり、頂点（Vertex）・辺（Edge）・面（Face）の3要素で構成され、3Dグラフィックスの基本単位となる。

現代のリアルタイム3Dグラフィックスでは、ほぼすべてのオブジェクトがポリゴンメッシュとして表現される。GPUが最も効率よく処理できるのは**三角形（Triangle）**であるため、四角形や多角形メッシュは最終的に三角形に分割（テッセレーション）されてGPUに送られる。

**ポリゴンメッシュのデータ構造：**
最もシンプルな表現は「頂点配列 + インデックス配列」である。頂点配列は各頂点の位置（xyz）と追加属性（法線・UV・カラー等）を保持し、インデックス配列は3つの頂点インデックスを組み合わせて1つの三角形を定義する。

**法線の役割：**
法線（Normal）は面または頂点に定義される単位ベクトルで、ライティング計算に不可欠。**フェイス法線**（面ごとに計算）は角ばった見た目、**頂点法線**（隣接する面の法線を平均化）は滑らかな見た目になる。

## メッシュデータ構造の比較

| 構造 | メモリ | アクセス速度 | 用途 |
|------|-------|------------|------|
| **インデックスバッファ方式** | 中 | 高速 | GPUリアルタイムレンダリング |
| **ハーフエッジ構造** | 中〜大 | 高速（隣接辺の走査） | モデリングツール・メッシュ編集 |
| **ウィング・エッジ構造** | 大 | 最速（全隣接情報） | ジオメトリ処理・LOD生成 |
| **点群（Point Cloud）** | 小 | 低（接続情報なし） | LiDAR・フォトグラメトリ |

```python
import numpy as np
from dataclasses import dataclass

@dataclass
class Mesh:
    """
    3D ポリゴンメッシュの基本データ構造。
    GPUバッファに送る前の CPU 側表現。
    """
    vertices: np.ndarray     # shape: (N, 3) — 各頂点の XYZ 座標
    normals: np.ndarray      # shape: (N, 3) — 各頂点の法線
    uvs: np.ndarray          # shape: (N, 2) — UV テクスチャ座標
    indices: np.ndarray      # shape: (M, 3) — 三角形を定義するインデックス（uint32）

    @property
    def vertex_count(self) -> int:
        return len(self.vertices)

    @property
    def triangle_count(self) -> int:
        return len(self.indices)


def compute_face_normals(vertices: np.ndarray, indices: np.ndarray) -> np.ndarray:
    """
    三角形メッシュのフェイス法線を計算する。
    各三角形の辺ベクトルの外積で法線を求め、正規化する。
    """
    v0 = vertices[indices[:, 0]]
    v1 = vertices[indices[:, 1]]
    v2 = vertices[indices[:, 2]]

    edge1 = v1 - v0
    edge2 = v2 - v0
    normals = np.cross(edge1, edge2)

    # 正規化（長さが0の縮退三角形を除外）
    lengths = np.linalg.norm(normals, axis=1, keepdims=True)
    lengths = np.where(lengths < 1e-10, 1.0, lengths)
    return normals / lengths


def compute_vertex_normals(
    vertices: np.ndarray,
    indices: np.ndarray
) -> np.ndarray:
    """
    頂点法線を計算する（面法線を共有頂点で平均化）。
    滑らかなシェーディングに必要。
    """
    face_normals = compute_face_normals(vertices, indices)
    vertex_normals = np.zeros_like(vertices)

    # 各三角形の法線を構成頂点に加算
    for i, tri in enumerate(indices):
        for v_idx in tri:
            vertex_normals[v_idx] += face_normals[i]

    # 正規化
    lengths = np.linalg.norm(vertex_normals, axis=1, keepdims=True)
    lengths = np.where(lengths < 1e-10, 1.0, lengths)
    return vertex_normals / lengths


def create_unit_cube() -> Mesh:
    """単位立方体のメッシュを生成する（学習用）"""
    vertices = np.array([
        [-0.5, -0.5, -0.5], [ 0.5, -0.5, -0.5],
        [ 0.5,  0.5, -0.5], [-0.5,  0.5, -0.5],
        [-0.5, -0.5,  0.5], [ 0.5, -0.5,  0.5],
        [ 0.5,  0.5,  0.5], [-0.5,  0.5,  0.5],
    ], dtype=np.float32)

    # 6面 × 2三角形 = 12三角形
    indices = np.array([
        [0,1,2],[0,2,3],  # 前面
        [4,6,5],[4,7,6],  # 背面
        [0,4,5],[0,5,1],  # 下面
        [2,6,7],[2,7,3],  # 上面
        [0,3,7],[0,7,4],  # 左面
        [1,5,6],[1,6,2],  # 右面
    ], dtype=np.uint32)

    uvs = np.zeros((8, 2), dtype=np.float32)  # 簡略化（実際は展開が必要）
    normals = compute_vertex_normals(vertices, indices)

    return Mesh(vertices=vertices, normals=normals, uvs=uvs, indices=indices)


cube = create_unit_cube()
print(f"頂点数:    {cube.vertex_count}")
print(f"三角形数:  {cube.triangle_count}")
print(f"頂点法線サンプル (V0): {cube.normals[0].round(3)}")

# LOD（Level of Detail）の重要性
print("\n=== LOD（Level of Detail）の考え方 ===")
lod_levels = {
    "LOD0（最高品質）": "100,000 ポリゴン - カメラに近い場合",
    "LOD1（中品質）":   "10,000 ポリゴン - 中距離",
    "LOD2（低品質）":   "1,000 ポリゴン - 遠距離",
    "LOD3（最低品質）": "100 ポリゴン - 非常に遠距離（ほぼ点）",
}
for lod, desc in lod_levels.items():
    print(f"  {lod}: {desc}")
```

## 使用場面

- Three.js・Babylon.js でのカスタムジオメトリ（BufferGeometry）の作成
- Blender からエクスポートした OBJ・FBX・glTF の頂点データの解析
- LOD システムの実装（遠距離オブジェクトのポリゴン数を削減）
- プロシージャルメッシュ生成（地形・建物の自動生成）
- メッシュの衝突判定（Physics エンジンへの入力データ）

## 参考文献

- [Real-Time Rendering, 4th Edition - Akenine-Möller et al.](https://www.realtimerendering.com/)
- [OpenGL Tutorial - Meshes](https://learnopengl.com/Model-Loading/Assimp)
- [Scratchapixel - Polygon Mesh](https://www.scratchapixel.com/lessons/3d-basic-rendering/introduction-polygon-mesh.html)

<AffiliateBanner site="graphics_navi" />
