import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 二分探索 (Binary Search)

## 二分探索とは

二分探索とは、

> ソート済み配列から特定の要素を高速に見つけ出すアルゴリズム

です。
<br/>

配列の中央を確認し、目的の値と比較しながら探索範囲を半分ずつ絞り込見ます。

1回の比較で探索範囲が半分になるため、n = 10億の配列でも**最大30回**の比較で見つかります。

## アルゴリズムの手順

ソート済み配列 `[1, 2, 3, 4, 5, 6, 7, 8, 9]` から `6` を探す例を示します。

![2分探索の手順](https://res.cloudinary.com/dtilrevrm/image/upload/v1780498300/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%891_imphit.jpg)

3回の比較で範囲が 10 → 4 → 1 と絞り込まれました。

## 計算量

| | 計算量 | 備考 |
| --- | --- | --- |
| 最良 | O(1) | 中央が目的の値 |
| 平均 | O(log n) | |
| 最悪 | O(log n) | |
| 空間 | O(1) | イテレーティブ版（再帰版は O(log n)） |
| 前提 | ソート済み配列 | |

## 実装

```python title="二分探索（イテレーティブ）"
def binary_search(arr: list, target) -> int:
    """target のインデックスを返す。見つからない場合は -1"""
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
```

```python title="使用例"
arr = [1, 2, 3, 4, 5, 6, 7, 8, 9]
print(binary_search(arr, 6))   # 5
print(binary_search(arr, 10))  # -1
```

### Python の bisect モジュール

標準ライブラリの `bisect` は二分探索の実装を提供します。

```python title="bisect を使った二分探索"
import bisect

arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

# 7 の左端インデックス（bisect_left）
i = bisect.bisect_left(arr, 7)
print(arr[i] == 7)  # True → i=6 で見つかった

# 重複要素がある場合の左端・右端
arr2 = [1, 3, 3, 3, 5]
print(bisect.bisect_left(arr2, 3))   # 1  ← 最初の 3 の位置
print(bisect.bisect_right(arr2, 3))  # 4  ← 最後の 3 の次の位置

# 3 の個数
count = bisect.bisect_right(arr2, 3) - bisect.bisect_left(arr2, 3)
print(count)  # 3
```

## 二分探索の応用：条件を満たす最小値の探索

二分探索は「ソート済み配列から値を探す」だけでなく、**単調な条件を満たす最小の答えを探す**用途でも使えます。

条件が「ある閾値以下では False、それ以降は True」という形なら、その境界を O(log n) で見つけられます。

![二分探索の応用](https://res.cloudinary.com/dtilrevrm/image/upload/v1780498301/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%892_itpnda.jpg)

```python title="二分探索で答えを求める（Answer Binary Search）"
def binary_search_answer(lo: int, hi: int, condition) -> int:
    """condition(x) が True になる最小の x を返す"""
    while lo < hi:
        mid = (lo + hi) // 2
        if condition(mid):
            hi = mid       # True なので左へ絞る
        else:
            lo = mid + 1   # False なので右へ絞る
    return lo

# 例: x² ≥ 25 を満たす最小の x
result = binary_search_answer(1, 10, lambda x: x * x >= 25)
print(result)  # 5
```

## 使用場面

- **ソート済み配列の高速検索**: データベースのインデックス、辞書検索
- **lower_bound / upper_bound**: C++ `std::lower_bound` に相当する操作
- **sqrt の計算**: `binary_search_answer(0, 10**9, lambda x: x*x >= n)`

## 参考文献

<AffiliateBanner site="algorithm_zukan" />

<AffiliateBanner site="rasen" />
