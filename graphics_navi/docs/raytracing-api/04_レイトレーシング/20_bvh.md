import AffiliateBanner from '@site/src/components/AffiliateBanner';

# BVH（バウンディングボリューム階層）による高速化

## BVH とは

> BVH（Bounding Volume Hierarchy、バウンディングボリューム階層）は、シーン内のジオメトリを軸平行境界ボックス（AABB）で階層的にグループ化した木構造であり、レイとジオメトリの交差判定を O(n) から O(log n) に削減するレイトレーシングの標準的な高速化手法である。

ブルートフォースのレイトレーシングでは、1本のレイがシーン内の全三角形と交差判定を行うため O(n) のコストがかかります。現代のゲームアセットは数百万ポリゴンを持つため、BVH による加速構造は実用上不可欠です。

BVH の構築は **上から下（Top-Down）** か **底から上（Bottom-Up）** のアプローチで行います。最も一般的な手法は **SAH（Surface Area Heuristic）** に基づく Top-Down 分割で、各ノードで分割後の AABB の表面積と子ノードの要素数を考慮して最も効率的な分割軸・分割位置を選びます。より単純な実装としては、最も長い軸の中央値で分割する方法もあります。

BVH のトラバーサルは、レイとルートノードの AABB が交差するかチェックし、交差すれば子ノードへ再帰するという処理です。AABB と交差しない枝は即座にスキップされるため、実際に交差判定を行う三角形数を大幅に削減できます。GPU では再帰が使えないため、スタックをシミュレートした反復的なトラバーサルを実装します。

## BVH の実装方針比較

| 手法 | 構築コスト | トラバーサル品質 | 用途 |
|------|-----------|----------------|------|
| 中央値分割 | 低 | 中 | 学習・プロトタイプ |
| SAH 分割（Binned）| 中 | 高 | CPU レイトレーサー |
| LBVH（Morton Code）| 低（並列化容易）| 中高 | GPU ビルド |
| SBVH | 高 | 最高 | 映画品質オフライン |

```python
import numpy as np
from dataclasses import dataclass, field
from typing import Optional, List

@dataclass
class AABB:
    minimum: np.ndarray
    maximum: np.ndarray

    def hit(self, ray_origin, ray_dir, t_min, t_max):
        """Slab 法による AABB とレイの交差判定"""
        for i in range(3):
            if abs(ray_dir[i]) < 1e-8:
                if ray_origin[i] < self.minimum[i] or ray_origin[i] > self.maximum[i]:
                    return False
                continue
            t0 = (self.minimum[i] - ray_origin[i]) / ray_dir[i]
            t1 = (self.maximum[i] - ray_origin[i]) / ray_dir[i]
            if t0 > t1:
                t0, t1 = t1, t0
            t_min = max(t_min, t0)
            t_max = min(t_max, t1)
            if t_max <= t_min:
                return False
        return True

    @staticmethod
    def surrounding(a, b):
        """2つの AABB を包む AABB を返す"""
        small = np.minimum(a.minimum, b.minimum)
        big   = np.maximum(a.maximum, b.maximum)
        return AABB(small, big)

    @property
    def surface_area(self):
        d = self.maximum - self.minimum
        return 2.0 * (d[0]*d[1] + d[1]*d[2] + d[2]*d[0])


@dataclass
class BVHNode:
    aabb:  AABB
    left:  Optional['BVHNode'] = None
    right: Optional['BVHNode'] = None
    primitives: List = field(default_factory=list)  # 葉ノードの場合

    @property
    def is_leaf(self):
        return len(self.primitives) > 0


def build_bvh(primitives, depth=0, max_leaf_prims=4):
    """
    中央値分割による BVH 構築（再帰）
    primitives: [{'aabb': AABB, 'data': ...}, ...]
    """
    if len(primitives) <= max_leaf_prims or depth > 32:
        # 葉ノード
        merged_aabb = primitives[0]['aabb']
        for p in primitives[1:]:
            merged_aabb = AABB.surrounding(merged_aabb, p['aabb'])
        return BVHNode(aabb=merged_aabb, primitives=primitives)

    # 最も長い軸を選択
    centroids = np.array([
        (p['aabb'].minimum + p['aabb'].maximum) / 2 for p in primitives
    ])
    axis = np.argmax(np.max(centroids, axis=0) - np.min(centroids, axis=0))

    # 中央値で分割
    mid = len(primitives) // 2
    sorted_prims = sorted(primitives,
                          key=lambda p: (p['aabb'].minimum[axis] + p['aabb'].maximum[axis]) / 2)

    left  = build_bvh(sorted_prims[:mid], depth + 1)
    right = build_bvh(sorted_prims[mid:], depth + 1)

    combined_aabb = AABB.surrounding(left.aabb, right.aabb)
    return BVHNode(aabb=combined_aabb, left=left, right=right)


def traverse_bvh(node, ray_origin, ray_dir, t_min=1e-4, t_max=float('inf')):
    """BVH トラバーサル: 交差した葉ノードの primitive を返す"""
    if not node.aabb.hit(ray_origin, ray_dir, t_min, t_max):
        return []

    if node.is_leaf:
        return node.primitives

    hits = []
    hits += traverse_bvh(node.left,  ray_origin, ray_dir, t_min, t_max)
    hits += traverse_bvh(node.right, ray_origin, ray_dir, t_min, t_max)
    return hits


# テスト: 100 個の球を BVH に格納してトラバーサル
rng = np.random.default_rng(0)
test_prims = []
for _ in range(100):
    center = rng.random(3) * 10 - 5
    r = 0.3
    aabb = AABB(center - r, center + r)
    test_prims.append({'aabb': aabb, 'center': center})

root = build_bvh(test_prims)
ray_o = np.array([0.0, 0.0, 10.0])
ray_d = np.array([0.0, 0.0, -1.0])
hits = traverse_bvh(root, ray_o, ray_d)
print(f"BVH ノード数（葉まで）: 交差候補 {len(hits)}/{len(test_prims)} 個")
```

## 使用場面

- CPU・GPU レイトレーサーの標準的な加速構造として
- DXR・Vulkan Ray Tracing の BLAS/TLAS（ボトム/トップ AS）構造
- ゲームエンジンの衝突検出・物理シミュレーションの空間分割
- BVH を使ったリアルタイムレイトレーシング（RTX 系 GPU でのハードウェア BVH トラバーサル）
- 大規模なオフラインレンダリング（Pixar RenderMan・Arnold Renderer）

## 参考文献

- Peter Shirley, *Ray Tracing: The Next Week* — BVH の章
- [PBRT — Bounding Volume Hierarchies](https://pbr-book.org/3ed-2018/Primitives_and_Intersection_Acceleration/Bounding_Volume_Hierarchies)
- Ingo Wald, "On fast Construction of SAH-based Bounding Volume Hierarchies" (2007)

<AffiliateBanner site="graphics_navi" />
