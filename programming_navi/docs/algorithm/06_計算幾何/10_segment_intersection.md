import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 線分交差判定

## 線分交差判定とは

線分交差判定とは、

> 2本の線分が交差するかどうかを外積（クロス積）の符号で判定するアルゴリズム

です。
<br/>

浮動小数点の除算を使わず整数の外積だけで判定できるため、数値的に安定しています。

## 判定の考え方

線分 AB と 線分 CD が交差する条件：
1. A, B が線分 CD を**挟む**（CD の両側にある）
2. C, D が線分 AB を**挟む**（AB の両側にある）

```
外積の符号で「点がどちら側にあるか」を判定:

  cross(CD, CA) × cross(CD, CB) < 0  →  A と B が CD の両側
  cross(AB, AC) × cross(AB, AD) < 0  →  C と D が AB の両側

両方成立 → 交差する！
```

### 端点が線分上にある場合（共線）

端点が相手の線分上に乗っているケースも処理が必要です。

## 計算量

| 操作 | 計算量 |
| --- | --- |
| 2線分の交差判定 | O(1) |
| 交点の座標計算 | O(1) |
| n 本の線分の全交差列挙 | O(n² ) 素朴 / O((n+k) log n) 走査線 |

## 実装

```python title="外積と交差判定"
from dataclasses import dataclass

@dataclass
class Point:
    x: float
    y: float

def cross2d(o: Point, a: Point, b: Point) -> float:
    """o 基点の外積 (a-o) × (b-o)"""
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)

def on_segment(p: Point, a: Point, b: Point) -> bool:
    """点 p が線分 ab 上にあるか（外積=0 前提）"""
    return (min(a.x, b.x) <= p.x <= max(a.x, b.x) and
            min(a.y, b.y) <= p.y <= max(a.y, b.y))

def segments_intersect(a: Point, b: Point, c: Point, d: Point) -> bool:
    """線分 AB と線分 CD が交差するか判定"""
    d1 = cross2d(c, d, a)
    d2 = cross2d(c, d, b)
    d3 = cross2d(a, b, c)
    d4 = cross2d(a, b, d)

    if ((d1 > 0 and d2 < 0) or (d1 < 0 and d2 > 0)) and \
       ((d3 > 0 and d4 < 0) or (d3 < 0 and d4 > 0)):
        return True  # 通常の交差

    # 端点が線分上にある特殊ケース
    if d1 == 0 and on_segment(a, c, d): return True
    if d2 == 0 and on_segment(b, c, d): return True
    if d3 == 0 and on_segment(c, a, b): return True
    if d4 == 0 and on_segment(d, a, b): return True

    return False
```

```python title="交点座標の計算"
def intersection_point(
    a: Point, b: Point, c: Point, d: Point
) -> Point | None:
    """2線分の交点座標を返す（平行なら None）"""
    denom = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x)
    if abs(denom) < 1e-10:
        return None  # 平行または一致

    t = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / denom
    return Point(a.x + t * (b.x - a.x), a.y + t * (b.y - a.y))
```

```python title="使用例"
# X字型に交差する線分
p1, p2 = Point(0, 0), Point(4, 4)
p3, p4 = Point(0, 4), Point(4, 0)
print(segments_intersect(p1, p2, p3, p4))  # True
q = intersection_point(p1, p2, p3, p4)
print(f"交点: ({q.x}, {q.y})")             # (2.0, 2.0)

# 平行な線分
p5, p6 = Point(0, 1), Point(4, 1)
p7, p8 = Point(0, 2), Point(4, 2)
print(segments_intersect(p5, p6, p7, p8))  # False
```

### 点が凸多角形の内部にあるかの判定

```python title="点と多角形の内外判定（ray casting）"
def point_in_polygon(pt: Point, polygon: list[Point]) -> bool:
    """Ray Casting法: 点が多角形の内部にあるか（境界上はFalse）"""
    n       = len(polygon)
    inside  = False
    px, py  = pt.x, pt.y
    j = n - 1
    for i in range(n):
        xi, yi = polygon[i].x, polygon[i].y
        xj, yj = polygon[j].x, polygon[j].y
        if ((yi > py) != (yj > py)) and \
           (px < (xj - xi) * (py - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside
```

## 使用場面

- **ゲーム開発**: 弾丸・壁の当たり判定
- **地図処理**: 道路や川の交差点検出
- **CAD/GIS**: 図形の重なり・干渉チェック
- **走査線アルゴリズム**: 線分集合の交差点一括検出の基礎

## 参考文献

<AffiliateBanner site="antbook" />
