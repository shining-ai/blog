import AffiliateBanner from '@site/src/components/AffiliateBanner';

# レイトレーシングの基礎（レイキャスティング）

## レイキャスティングとは

> レイキャスティング（Ray Casting）は、カメラのピクセルごとにレイ（光線）を仮想空間に飛ばし、シーン内のジオメトリとの交差判定を行ってピクセルの色を決定するレンダリング手法の基礎であり、レイトレーシングパイプライン全体の出発点となる。

ラスタライゼーション（頂点→ラスタ変換）がオブジェクト中心の処理であるのに対し、レイトレーシングはピクセル中心の処理です。現実の光は光源から目へ向かって進みますが、計算効率のために「目からシーンへ」レイを飛ばす逆方向のトレースが一般的です。

レイは **原点 O と方向ベクトル D** で表現され、`P(t) = O + t * D`（t > 0）がレイ上の点です。ジオメトリとの交差判定は素材によって異なります。**球との交差** は2次方程式の解として求まります。**三角形との交差** には Möller–Trumbore アルゴリズムが最も広く使われ、バリセントリック座標を使って効率的に計算します。**AABB（軸平行境界ボックス）** との交差は slab 法によりスラブ平面との交差区間で判定します。

レイキャスティングだけではシャドウ・反射・屈折は表現できません。これを再帰的に拡張したものが **ホイットのレイトレーシング（Whitted Ray Tracing, 1980）** で、交差点からシャドウレイ・反射レイ・屈折レイを再帰的に飛ばすことで鏡面反射や透明素材を表現します。

## レイとジオメトリの交差判定

| ジオメトリ | アルゴリズム | 時間計算量 |
|-----------|------------|----------|
| 球 | 2次方程式の解 | O(1) |
| 三角形 | Möller–Trumbore | O(1) |
| AABB | Slab 法 | O(1) |
| BVH ツリー | 再帰的 AABB 判定 | O(log n) |
| ブルートフォース | 全三角形との判定 | O(n) |

```python
import numpy as np

class Ray:
    def __init__(self, origin, direction):
        self.origin    = np.array(origin,    dtype=float)
        self.direction = np.array(direction, dtype=float)
        self.direction /= np.linalg.norm(self.direction)  # 正規化

    def at(self, t):
        return self.origin + t * self.direction


def intersect_sphere(ray, center, radius):
    """
    球とレイの交差判定（2次方程式）
    |O + t*D - C|^2 = r^2
    返値: t（交差距離）, None（交差なし）
    """
    oc = ray.origin - center
    a = np.dot(ray.direction, ray.direction)
    b = 2.0 * np.dot(oc, ray.direction)
    c = np.dot(oc, oc) - radius * radius

    discriminant = b * b - 4 * a * c
    if discriminant < 0:
        return None  # 交差なし

    t1 = (-b - np.sqrt(discriminant)) / (2 * a)
    t2 = (-b + np.sqrt(discriminant)) / (2 * a)
    t  = t1 if t1 > 1e-4 else t2
    return t if t > 1e-4 else None


def intersect_triangle_moller_trumbore(ray, v0, v1, v2):
    """
    Möller–Trumbore アルゴリズムによる三角形とレイの交差判定
    返値: (t, u, v) または None
    """
    EPSILON = 1e-8
    edge1 = v1 - v0
    edge2 = v2 - v0
    h = np.cross(ray.direction, edge2)
    a = np.dot(edge1, h)

    if abs(a) < EPSILON:
        return None  # 平行

    f = 1.0 / a
    s = ray.origin - v0
    u = f * np.dot(s, h)
    if u < 0.0 or u > 1.0:
        return None

    q = np.cross(s, edge1)
    v = f * np.dot(ray.direction, q)
    if v < 0.0 or u + v > 1.0:
        return None

    t = f * np.dot(edge2, q)
    return (t, u, v) if t > EPSILON else None


def ray_color(ray, scene_objects, depth=0):
    """再帰的レイトレーシング（最大深度で停止）"""
    if depth >= 5:
        return np.array([0.0, 0.0, 0.0])

    closest_t   = float('inf')
    closest_obj = None

    # 全オブジェクトとの交差判定（ブルートフォース）
    for obj in scene_objects:
        t = intersect_sphere(ray, obj['center'], obj['radius'])
        if t is not None and t < closest_t:
            closest_t   = t
            closest_obj = obj

    if closest_obj is None:
        # 背景色（空のグラデーション）
        t_bg   = 0.5 * (ray.direction[1] + 1.0)
        return (1.0 - t_bg) * np.array([1.0, 1.0, 1.0]) + t_bg * np.array([0.5, 0.7, 1.0])

    # 交差点での法線
    hit_pos = ray.at(closest_t)
    normal  = (hit_pos - closest_obj['center']) / closest_obj['radius']
    return (normal + 1.0) * 0.5  # 法線カラー表示


# シンプルなシーンをレイキャスティング
scene = [
    {'center': np.array([ 0.0,  0.0, -1.0]), 'radius': 0.5},
    {'center': np.array([ 0.0, -100.5, -1.0]), 'radius': 100.0},  # 地面
]

# ピクセル(320, 160) → レイを生成して色を取得
image_width, image_height = 320, 160
aspect = image_width / image_height

ray = Ray(
    origin=[0, 0, 0],
    direction=[(2 * 160/320 - 1) * aspect, (1 - 2 * 80/160), -1.0]
)
color = ray_color(ray, scene)
print("Pixel color (normalized):", color)
```

## 使用場面

- ピクセル精度の衝突判定（ゲーム・CAD のピッキング）
- シンプルなレイトレーサーの実装・学習
- レイマーチングやボリュームレンダリングの基礎
- BVH などの高速化構造の評価・ベンチマーク
- CPU ベースのオフラインレンダラーのコア処理

## 参考文献

- Peter Shirley, *Ray Tracing in One Weekend* — [無料で公開中](https://raytracing.github.io/)
- Tomas Möller & Ben Trumbore, "Fast, Minimum Storage Ray-Triangle Intersection" (1997)
- [Scratchapixel — Ray-Sphere Intersection](https://www.scratchapixel.com/lessons/3d-basic-rendering/minimal-ray-tracer-rendering-simple-shapes/ray-sphere-intersection.html)

<AffiliateBanner site="graphics_navi" />
