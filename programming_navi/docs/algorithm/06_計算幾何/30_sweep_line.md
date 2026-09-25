import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 走査線アルゴリズム (Sweep Line)

## 走査線アルゴリズムとは

走査線アルゴリズムとは、

> 仮想的な直線（走査線）を一方向に動かしながら、イベント（端点・交点など）が発生するたびに状態を更新して幾何学的問題を効率的に解くアルゴリズム

です。
<br/>

「一度に全部を見る」ではなく「走査線が通過する瞬間だけ処理する」という発想で、O(n²) を O(n log n) に削減できます。

## 代表的な応用

| 問題 | 計算量 | 概要 |
| --- | --- | --- |
| 線分交差の有無判定 | O(n log n) | Shamos-Hoey |
| 全交点の列挙 | O((n+k) log n) | Bentley-Ottmann |
| 矩形の和の面積 | O(n log n) | イベント + セグメント木 |
| 点の包含数 | O(n log n) | 各点を走査線でカバー |

## 動作の概要（線分交差の有無判定）

```
走査線を左から右へ移動

イベントキュー（x 座標でソート）:
  [s1左端, s2左端, s1右端, s3左端, s2右端, s3右端]

走査線上の活性線分（y 座標でソート）:
  ──────────────────────────── 走査線

STEP: s1左端 → 活性線分に s1 を追加。隣接する線分と交差チェック
STEP: s2左端 → 活性線分に s2 を追加。s1 と交差チェック
STEP: s1右端 → 活性線分から s1 を削除。s2の新しい隣接と交差チェック
...
```

## 実装

### 矩形の和の面積

```python title="矩形の和の面積（走査線 + セグメント木）"
def rectangles_union_area(rects: list[tuple[int, int, int, int]]) -> int:
    """
    矩形リスト [(x1,y1,x2,y2), ...] の和の面積を返す
    走査線を x 方向に動かし、各区間での y 方向カバー長を積算
    """
    import sortedcontainers

    # イベントリスト: (x座標, タイプ, y1, y2)
    # タイプ: +1=左辺（追加）, -1=右辺（削除）
    events = []
    y_coords = set()
    for x1, y1, x2, y2 in rects:
        events.append((x1,  1, y1, y2))
        events.append((x2, -1, y1, y2))
        y_coords.add(y1); y_coords.add(y2)

    events.sort()
    ys     = sorted(y_coords)
    y_idx  = {y: i for i, y in enumerate(ys)}
    m      = len(ys) - 1

    # セグメント木（各区間の被覆回数を管理）
    cnt    = [0] * (4 * m)
    cover  = [0] * (4 * m)

    def update(node, lo, hi, l, r, val):
        if r <= lo or hi <= l:
            return
        if l <= lo and hi <= r:
            cnt[node] += val
        else:
            mid = (lo + hi) // 2
            update(2*node, lo, mid, l, r, val)
            update(2*node+1, mid, hi, l, r, val)
        if cnt[node] > 0:
            cover[node] = ys[hi] - ys[lo]
        elif lo + 1 == hi:
            cover[node] = 0
        else:
            cover[node] = cover[2*node] + cover[2*node+1]

    area   = 0
    prev_x = None
    for x, typ, y1, y2 in events:
        if prev_x is not None:
            area += cover[1] * (x - prev_x)
        update(1, 0, m, y_idx[y1], y_idx[y2], typ)
        prev_x = x

    return area
```

```python title="使用例"
rects = [
    (1, 1, 3, 3),
    (2, 2, 4, 4),
    (3, 0, 5, 2),
]
print(rectangles_union_area(rects))  # 9
```

### 線分交差の有無（Shamos-Hoey）

```python title="線分交差の有無判定 O(n log n)"
from sortedcontainers import SortedList

def any_intersection(segments: list[tuple]) -> bool:
    """
    線分リスト [(x1,y1,x2,y2), ...] に交差があるか判定
    """
    def cross(ax, ay, bx, by, cx, cy) -> float:
        return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)

    def y_at(seg, x):
        x1, y1, x2, y2 = seg
        if x1 == x2:
            return (y1 + y2) / 2
        return y1 + (y2 - y1) * (x - x1) / (x2 - x1)

    # イベント: (x, type, seg_id)  type: 0=左端, 1=右端
    events = []
    segs   = []
    for i, (x1, y1, x2, y2) in enumerate(segments):
        if x1 > x2:
            x1, y1, x2, y2 = x2, y2, x1, y1
        segs.append((x1, y1, x2, y2))
        events.append((x1, 0, i))
        events.append((x2, 1, i))
    events.sort()

    active = SortedList(key=lambda i: y_at(segs[i], sweep_x))
    sweep_x = 0.0

    def intersects(i, j) -> bool:
        x1,y1,x2,y2 = segs[i]
        x3,y3,x4,y4 = segs[j]
        d1 = cross(x3,y3,x4,y4,x1,y1)
        d2 = cross(x3,y3,x4,y4,x2,y2)
        d3 = cross(x1,y1,x2,y2,x3,y3)
        d4 = cross(x1,y1,x2,y2,x4,y4)
        return (d1 * d2 < 0) and (d3 * d4 < 0)

    for x, etype, idx in events:
        sweep_x = x
        if etype == 0:  # 追加
            active.add(idx)
            pos = active.index(idx)
            if pos > 0 and intersects(active[pos-1], idx):
                return True
            if pos < len(active)-1 and intersects(idx, active[pos+1]):
                return True
        else:           # 削除
            pos = active.index(idx)
            if 0 < pos < len(active)-1:
                if intersects(active[pos-1], active[pos+1]):
                    return True
            active.remove(idx)

    return False
```

```python title="使用例"
segs = [
    (0, 0, 4, 4),
    (0, 4, 4, 0),
    (5, 0, 8, 3),
]
print(any_intersection(segs))   # True（最初の2線分が交差）
```

## 使用場面

- **地図・GIS**: 道路ネットワークの交差点自動検出
- **VLSI設計**: 回路配線の干渉チェック
- **ゲーム**: 複数弾丸・地形の当たり判定の効率化
- **計算幾何の基盤**: 三角形分割（Delaunay）、ボロノイ図の構築

## 参考文献

<AffiliateBanner site="antbook" />
