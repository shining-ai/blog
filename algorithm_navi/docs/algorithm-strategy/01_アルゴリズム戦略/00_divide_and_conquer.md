import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 分割統治法 (Divide and Conquer)

## 分割統治法とは

分割統治法とは、

> 問題を同じ構造の小さな部分問題に**分割**し、それぞれを再帰的に**解決**し、その解を**統合**して元の問題の解を得るアルゴリズム設計戦略

です。

「分けて征服する」という意味を持ち、マージソート・クイックソート・二分探索など多くの効率的アルゴリズムの基盤となっています。

## 3つのフェーズ

```
分割 (Divide)   : 問題を複数の部分問題に分割する
解決 (Conquer)  : 各部分問題を再帰的に解く（基底ケースまで）
統合 (Combine)  : 部分問題の解を統合して元の問題の解を構成する
```

## 具体例

### マージソート

```
初期: [5, 3, 8, 1, 4, 2, 7, 6]

── 分割フェーズ ──────────────────────────────────────────
            [5, 3, 8, 1, 4, 2, 7, 6]
             /                      \
      [5, 3, 8, 1]             [4, 2, 7, 6]
       /        \               /        \
   [5, 3]     [8, 1]        [4, 2]     [7, 6]
   /    \      /    \        /    \      /    \
 [5]   [3]  [8]   [1]     [4]   [2]  [7]   [6]

── 統合フェーズ ──────────────────────────────────────────
 [3,5]     [1,8]        [2,4]     [6,7]
    \        /              \        /
  [1, 3, 5, 8]           [2, 4, 6, 7]
          \                    /
         [1, 2, 3, 4, 5, 6, 7, 8]
```

### 二分探索

```
配列: [1, 3, 5, 7, 9, 11, 13, 15]   target = 7

STEP 1: 中央 index=3, 値=7
        arr[3] == target → 発見！

STEP 2（一般）:
        arr[mid] == target → 完了
        arr[mid] < target  → 右半分へ再帰
        arr[mid] > target  → 左半分へ再帰
```

## 計算量の分析：マスター定理

分割統治法の計算量は **マスター定理** で求まります。

```
再帰式: T(n) = a・T(n/b) + f(n)

  a   : 部分問題の数
  b   : 問題サイズの縮小率
  f(n): 分割・統合のコスト
```

| 条件 | T(n) の計算量 |
| --- | --- |
| f(n) = O(n^(log_b a − ε)) | O(n^(log_b a)) |
| f(n) = Θ(n^(log_b a) · log^k n) | O(n^(log_b a) · log^(k+1) n) |
| f(n) = Ω(n^(log_b a + ε)) | O(f(n)) |

**代表例:**

| アルゴリズム | a | b | f(n) | 計算量 |
| --- | --- | --- | --- | --- |
| マージソート | 2 | 2 | O(n) | O(n log n) |
| 二分探索 | 1 | 2 | O(1) | O(log n) |
| Karatsuba乗算 | 3 | 2 | O(n) | O(n^1.585) |
| Strassen行列積 | 7 | 2 | O(n²) | O(n^2.807) |

## 実装

```python title="分割統治法の基本構造"
def divide_and_conquer(problem):
    # 基底ケース
    if is_base_case(problem):
        return solve_directly(problem)

    # 分割
    subproblems = divide(problem)

    # 再帰的に解決
    sub_solutions = [divide_and_conquer(sub) for sub in subproblems]

    # 統合
    return combine(sub_solutions)
```

```python title="マージソート"
def merge_sort(arr: list) -> list:
    if len(arr) <= 1:
        return arr                     # 基底ケース

    mid = len(arr) // 2
    left  = merge_sort(arr[:mid])      # 分割・再帰
    right = merge_sort(arr[mid:])      # 分割・再帰

    return merge(left, right)          # 統合

def merge(left: list, right: list) -> list:
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i]); i += 1
        else:
            result.append(right[j]); j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result
```

```python title="最近点対問題（計算幾何への応用）"
import math

def closest_pair(points: list[tuple]) -> float:
    """O(n log n) で最近点対の距離を求める"""
    if len(points) <= 3:
        return brute_force_closest(points)

    mid   = len(points) // 2
    mid_x = points[mid][0]

    d_left  = closest_pair(points[:mid])   # 分割・再帰
    d_right = closest_pair(points[mid:])   # 分割・再帰
    d = min(d_left, d_right)

    # 境界付近の点を確認（統合フェーズ）
    strip = sorted(
        [p for p in points if abs(p[0] - mid_x) < d],
        key=lambda p: p[1]
    )
    for i in range(len(strip)):
        j = i + 1
        while j < len(strip) and strip[j][1] - strip[i][1] < d:
            d = min(d, math.dist(strip[i], strip[j]))
            j += 1
    return d

def brute_force_closest(points):
    min_d = float('inf')
    for i in range(len(points)):
        for j in range(i + 1, len(points)):
            min_d = min(min_d, math.dist(points[i], points[j]))
    return min_d
```

## 使用場面

- **ソート**: マージソート・クイックソート
- **探索**: 二分探索・範囲探索
- **行列演算**: Strassen のアルゴリズム
- **計算幾何**: 最近点対・凸包
- **数値計算**: 高速フーリエ変換 (FFT)
- **並列処理**: 部分問題を独立に並列実行

## 参考文献

<AffiliateBanner site="antbook" />
