import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 凸包 (Convex Hull)

## 凸包とは

凸包とは、

> 平面上の点集合を全て含む最小の凸多角形（どの2点を結んでも線分が多角形の内部に収まる）

です。
<br/>

点群を「輪ゴムで囲んだ形」と直感的に理解できます。Graham Scan や Andrew's Monotone Chain により O(n log n) で構築できます。

## 構造の概要

```
点集合:
  ●  ●
●   ●  ●
  ●  ●
●       ●

凸包（外周だけ）:
  /‾‾‾‾‾\
 /    ●  ●\
|  ●  ●    |
 \●      ●/
  \_______/
```

内部の点は凸包に含まれません。最外周の点だけが凸包の頂点となります。

## アルゴリズムの種類

| アルゴリズム | 計算量 | 特徴 |
| --- | --- | --- |
| Jarvis March（Gift Wrapping） | O(nh) | h=凸包頂点数。実装シンプル |
| Graham Scan | O(n log n) | 極角ソートで反時計回りに構築 |
| Andrew's Monotone Chain | O(n log n) | x座標ソートで上包と下包を結合。実装が明快 |
| Chan's Algorithm | O(n log h) | 最適だが実装が複雑 |

## 外積による左折り判定

凸包構築のキーは「3点が左折り（反時計回り）か右折り（時計回り）か」を外積で判定することです。

```
点 O, A, B に対して:
  cross = (A-O) × (B-O)
       = (A.x-O.x)*(B.y-O.y) - (A.y-O.y)*(B.x-O.x)

cross > 0: 反時計回り（左折り）
cross = 0: 一直線
cross < 0: 時計回り（右折り）
```

## 実装

```python title="外積"
from __future__ import annotations
from dataclasses import dataclass

@dataclass
class Point:
    x: float
    y: float
    def __sub__(self, other: Point) -> Point:
        return Point(self.x - other.x, self.y - other.y)
    def __lt__(self, other: Point) -> bool:
        return (self.x, self.y) < (other.x, other.y)

def cross(o: Point, a: Point, b: Point) -> float:
    """o を基点とした a→b の外積（正=反時計回り）"""
    da, db = a - o, b - o
    return da.x * db.y - da.y * db.x
```

```python title="Andrew's Monotone Chain O(n log n)"
def convex_hull(points: list[Point]) -> list[Point]:
    """
    凸包を反時計回りの頂点リストとして返す。
    共線上の点は含まない（>0 を >=0 にすると含む）
    """
    pts = sorted(set((p.x, p.y) for p in points))
    pts = [Point(x, y) for x, y in pts]
    n   = len(pts)
    if n <= 1:
        return pts

    # 下包（left→right）
    lower: list[Point] = []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)

    # 上包（right→left）
    upper: list[Point] = []
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)

    # 端点を重複除去
    return lower[:-1] + upper[:-1]
```

```python title="使用例"
pts = [
    Point(0, 0), Point(1, 1), Point(2, 2),
    Point(0, 2), Point(2, 0), Point(1, 0),
    Point(0, 1), Point(2, 1),
]
hull = convex_hull(pts)
for p in hull:
    print(f"({p.x}, {p.y})")
# (0.0, 0.0) → (2.0, 0.0) → (2.0, 2.0) → (0.0, 2.0)
```

```python title="凸包の面積"
def polygon_area(hull: list[Point]) -> float:
    """shoelace 公式で凸多角形の面積を計算"""
    n = len(hull)
    area = 0.0
    for i in range(n):
        j = (i + 1) % n
        area += hull[i].x * hull[j].y
        area -= hull[j].x * hull[i].y
    return abs(area) / 2.0
```

## 使用場面

- **ロボット経路計画**: 障害物の凸包で衝突判定を簡略化
- **画像処理**: 物体の輪郭から凸型の境界を求める
- **最遠点対問題**: 凸包上の2点が直径となる（回転キャリパー法）
- **競技プログラミング**: 多角形の包含判定・面積計算の前処理

## 参考文献

<AffiliateBanner site="antbook" />
