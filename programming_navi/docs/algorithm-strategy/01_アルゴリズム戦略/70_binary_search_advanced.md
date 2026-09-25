import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 二分探索の応用（答えで二分探索）

## 概要

二分探索の応用とは、

> 「答え x が条件を満たすか」を判定する関数を用いて、**答えそのものを二分探索する**手法

です。

「答えを仮定して検証する」という発想の転換により、直接解くのが難しい最適化問題を O(log N × 判定コスト) で解けます。

## 適用できる問題の形

```
「条件を満たす最小の x を求めよ」
または
「条件を満たす最大の x を求めよ」

かつ

「x が条件を満たすとき、x+1 も満たす（単調性がある）」
```

この単調性があれば、二分探索で境界を O(log N) で見つけられます。

## 典型例

### 例1: 最小化問題

「n 人の仕事をそれぞれ最大 x 時間以内に終わらせるために必要な最小の作業者数」

→ 「x 時間以内に k 人以下で終わるか？」を判定し、x について二分探索

### 例2: K番目の値

「無限数列のK番目の値を求めよ」

→ 「x 以下の要素が K 個以上あるか？」を判定し、x について二分探索

## 実装テンプレート

```python title="答えで二分探索（最小値を求める）"
def binary_search_answer(lo: int, hi: int, is_ok) -> int:
    """
    is_ok(x) が True になる最小の x を返す
    is_ok は単調増加（False...False, True...True）
    """
    while lo < hi:
        mid = (lo + hi) // 2
        if is_ok(mid):
            hi = mid       # True なので左（小さい方）へ
        else:
            lo = mid + 1   # False なので右（大きい方）へ
    return lo
```

## 具体的な問題

```python title="例1: 荷物を K 台のトラックで運ぶ最小積載量（LeetCode 1011）"
def ship_within_days(weights: list[int], days: int) -> int:
    """
    days 日以内にすべての荷物を順番に運ぶ最小積載容量
    """
    def can_ship(capacity: int) -> bool:
        """capacity のトラックで days 日以内に運べるか"""
        current = 0
        day_count = 1
        for w in weights:
            if current + w > capacity:
                day_count += 1
                current = 0
            current += w
        return day_count <= days

    lo = max(weights)       # 最低でも最大の荷物が積める必要がある
    hi = sum(weights)       # 1日で全部運ぶ場合
    return binary_search_answer(lo, hi, can_ship)

print(ship_within_days([1,2,3,4,5,6,7,8,9,10], 5))  # 15
```

```python title="例2: ソート済み2次元行列の K番目に小さい要素（LeetCode 378）"
def kth_smallest(matrix: list[list[int]], k: int) -> int:
    n = len(matrix)

    def count_le(x: int) -> int:
        """x 以下の要素数を O(n) で数える"""
        count = 0
        row, col = n - 1, 0
        while row >= 0 and col < n:
            if matrix[row][col] <= x:
                count += row + 1
                col += 1
            else:
                row -= 1
        return count

    lo, hi = matrix[0][0], matrix[n-1][n-1]
    return binary_search_answer(lo, hi, lambda x: count_le(x) >= k)
```

```python title="例3: 牛を M 頭配置する最大の最小距離（ICPC 古典題）"
def max_min_distance(positions: list[int], m: int) -> int:
    """
    ソート済みの配置場所に m 頭の牛を置く
    隣接する牛の最小距離を最大化
    """
    positions.sort()

    def can_place(min_dist: int) -> bool:
        """最小距離 min_dist 以上を保ちながら m 頭置けるか"""
        count = 1
        last = positions[0]
        for pos in positions[1:]:
            if pos - last >= min_dist:
                count += 1
                last = pos
        return count >= m

    lo, hi = 1, positions[-1] - positions[0]
    return binary_search_answer(lo, hi + 1, lambda x: not can_place(x)) - 1
```

## 計算量

| | 計算量 |
| --- | --- |
| 二分探索部分 | O(log(hi - lo)) |
| 全体 | O(log(hi - lo) × 判定関数のコスト) |

## 使用場面

- **最小化・最大化問題**: 「最小の x で条件を満たすものを求めよ」
- **K番目の要素**: ソートせずに K 番目の値を求める
- **割り当て問題**: 最大値を最小化、最小値を最大化
- **パラメータ探索**: 実数値の最適パラメータを二分探索

## 参考文献

<AffiliateBanner site="tessoku" />
<AffiliateBanner site="rasen" />
