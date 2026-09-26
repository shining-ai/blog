import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 最近点対 (Closest Pair of Points)

## 最近点対とは

最近点対とは、

> 平面上の n 個の点の中から、距離が最小となる2点の組を求める問題

です。
<br/>

全ペアを調べる素朴な O(n²) に対し、分割統治法を使うと **O(n log n)** で求められます。

## アルゴリズムの概要

```
分割統治のステップ:

入力点集合 P（x 座標でソート済み）:
  ●  ●  ●  ●  |  ●  ●  ●  ●
  ←  左半分  →|←  右半分  →
              中線 x = m

1. 左半分と右半分それぞれで再帰的に最近点対 dL, dR を求める
2. d = min(dL, dR)
3. 中線から ±d の帯状領域の点だけ調べる
4. 帯内の点は y 座標順に高々 7 点と比べればよい

最終的な最近点対 = min(左の最小, 右の最小, 帯をまたぐ最小)
```

帯状領域内の比較が O(n) に収まることが重要です（1点あたり高々7点との比較で十分）。

## 計算量

| 手法 | 計算量 |
| --- | --- |
| 全ペアの総当たり | O(n²) |
| 分割統治法 | O(n log n) |
| ランダム化アルゴリズム | O(n) 期待値 |

## 実装

```python title="最近点対（分割統治法）"
import math
from dataclasses import dataclass

@dataclass
class Point:
    x: float
    y: float

def dist(p: Point, q: Point) -> float:
    return math.hypot(p.x - q.x, p.y - q.y)

def _closest_pair_rec(px: list[Point]) -> tuple[float, Point, Point]:
    """x 座標ソート済みリスト px に対して最近点対を返す"""
    n = len(px)
    if n <= 3:
        best_d = float('inf')
        best_p = best_q = px[0]
        for i in range(n):
            for j in range(i + 1, n):
                d = dist(px[i], px[j])
                if d < best_d:
                    best_d, best_p, best_q = d, px[i], px[j]
        return best_d, best_p, best_q

    mid   = n // 2
    mid_x = px[mid].x
    dL, pL, qL = _closest_pair_rec(px[:mid])
    dR, pR, qR = _closest_pair_rec(px[mid:])

    if dL < dR:
        d, best_p, best_q = dL, pL, qL
    else:
        d, best_p, best_q = dR, pR, qR

    # 帯状領域の点を y 座標でソート
    strip = [p for p in px if abs(p.x - mid_x) < d]
    strip.sort(key=lambda p: p.y)

    for i in range(len(strip)):
        j = i + 1
        while j < len(strip) and strip[j].y - strip[i].y < d:
            sd = dist(strip[i], strip[j])
            if sd < d:
                d, best_p, best_q = sd, strip[i], strip[j]
            j += 1

    return d, best_p, best_q

def closest_pair(points: list[Point]) -> tuple[float, Point, Point]:
    """最近点対の距離と2点を返す"""
    if len(points) < 2:
        raise ValueError("2点以上必要")
    px = sorted(points, key=lambda p: p.x)
    return _closest_pair_rec(px)
```

```python title="使用例"
pts = [
    Point(0, 0), Point(3, 4), Point(1, 1),
    Point(5, 2), Point(2, 3), Point(6, 1),
]
d, p, q = closest_pair(pts)
print(f"最近点対: ({p.x},{p.y}) ↔ ({q.x},{q.y})")  # (0,0) ↔ (1,1)
print(f"距離: {d:.4f}")                               # 1.4142...
```

### KD-木による近傍探索

```python title="scipy を使った近傍探索"
from scipy.spatial import KDTree
import numpy as np

pts_np = np.array([(p.x, p.y) for p in pts])
tree   = KDTree(pts_np)

# 各点の最近傍（自分以外）
dd, ii = tree.query(pts_np, k=2)
min_idx = dd[:, 1].argmin()
print(f"最近点対インデックス: {min_idx}, {ii[min_idx, 1]}")
print(f"距離: {dd[min_idx, 1]:.4f}")
```

## 使用場面

- **クラスタリング**: 最近点対が距離ゼロに近いグループを検出
- **衝突検出**: ゲームや物理シミュレーションでの物体間距離
- **GIS**: 地理的に最も近い施設ペアの検索
- **機械学習**: 最近傍法（k-NN）の基礎データ構造

## 参考文献

<AffiliateBanner site="antbook" />
