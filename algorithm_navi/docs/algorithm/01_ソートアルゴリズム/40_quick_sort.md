import AffiliateBanner from '@site/src/components/AffiliateBanner';

# クイックソート (Quick Sort)

## クイックソートとは

クイックソートとは、

> ピボット（基準値）を選び、それより小さい要素と大きい要素に分割することを再帰的に繰り返すソートアルゴリズム

です。
<br/>

平均 O(n log n) で、定数係数が小さいため実用上最も高速なソートアルゴリズムの1つです。
C++ の `std::sort` や多くの標準ライブラリで採用されています。

![クイックソートの概要](https://res.cloudinary.com/dtilrevrm/image/upload/v1780239748/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%891_mufvh8.jpg)



## アルゴリズムの手順

配列 `[5, 3, 8, 1, 2]` をソートする例を示します（ピボット = 末尾要素）。

![クイックソートの手順1](https://res.cloudinary.com/dtilrevrm/image/upload/v1780239748/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%892_fpgqxj.jpg)

![クイックソートの手順2](https://res.cloudinary.com/dtilrevrm/image/upload/v1780239748/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%891_mufvh8.jpg)

## 計算量

| | 計算量 | 条件 |
| --- | --- | --- |
| 最良 | O(n log n) | 毎回均等に分割できる場合 |
| 平均 | O(n log n) | ランダムな配列 |
| 最悪 | O(n²) | すでにソート済み・逆順など偏ったピボット選択 |
| 空間 | O(log n) | 再帰スタックの深さ（平均） |
| 安定性 | 不安定 | 非隣接交換により同値要素の順序が崩れる |

:::caution 最悪ケースの回避
ソート済みの配列に末尾ピボットを使うと O(n²) になります。
**ランダムピボット** または **中央値（median-of-3）** を使うことで実用上の最悪ケースを回避できます。
:::

## 実装

```python title="クイックソート（ランダムピボット版）"
import random

def quick_sort(arr: list, lo: int = 0, hi: int = None) -> list:
    if hi is None:
        hi = len(arr) - 1
    if lo < hi:
        p = _partition(arr, lo, hi)
        quick_sort(arr, lo, p - 1)
        quick_sort(arr, p + 1, hi)
    return arr

def _partition(arr: list, lo: int, hi: int) -> int:
    # ランダムにピボットを選んで末尾と交換
    pivot_idx = random.randint(lo, hi)
    arr[pivot_idx], arr[hi] = arr[hi], arr[pivot_idx]

    pivot = arr[hi]
    i = lo - 1
    for j in range(lo, hi):
        if arr[j] <= pivot:
            i += 1
            arr[i], arr[j] = arr[j], arr[i]
    arr[i + 1], arr[hi] = arr[hi], arr[i + 1]
    return i + 1
```

```python title="使用例"
arr = [5, 3, 8, 1, 2]
print(quick_sort(arr))  # [1, 2, 3, 5, 8]
```

### 3方向分割（重複要素に強い版）

同じ値が多いときに効果的です（Dutch National Flag 問題の応用）。

![3方向分割の概要](https://res.cloudinary.com/dtilrevrm/image/upload/v1780239747/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%894_p3omtl.jpg)


```python title="3方向クイックソート"
def quick_sort_3way(arr: list, lo: int = 0, hi: int = None) -> list:
    if hi is None:****
        hi = len(arr) - 1
    if lo >= hi:
        return arr

    pivot = arr[lo + (hi - lo) // 2]
    lt, gt = lo, hi
    i = lo
    while i <= gt:
        if arr[i] < pivot:
            arr[lt], arr[i] = arr[i], arr[lt]
            lt += 1; i += 1
        elif arr[i] > pivot:
            arr[gt], arr[i] = arr[i], arr[gt]
            gt -= 1
        else:
            i += 1
    # arr[lo..lt-1] < pivot == arr[lt..gt] < arr[gt+1..hi]
    quick_sort_3way(arr, lo, lt - 1)
    quick_sort_3way(arr, gt + 1, hi)
    return arr
```

## マージソートとの比較

| | クイックソート | マージソート |
| --- | --- | --- |
| 平均計算量 | O(n log n) | O(n log n) |
| 最悪計算量 | O(n²) | O(n log n) |
| 空間計算量 | O(log n) | O(n) |
| 安定性 | 不安定 | 安定 |
| キャッシュ効率 | 良い（インプレース） | 悪い（別配列を使う） |
| 実際の速度 | 速い | やや遅い |

### 長所

- 平均 O(n log n) で定数係数が小さく実用上最速クラス
- 追加メモリがほぼ不要（インプレース）
- キャッシュ局所性が高く、ハードウェアとの相性が良い

### 短所

- 最悪 O(n²) になる場合がある（ピボット選択が偏ると）
- 不安定ソートのため同値要素の順序が保証されない
- 再帰が深くなるとスタックオーバーフローの可能性がある

## 使用場面

- **汎用ソート**: 実用上最も高速なため、多くの標準ライブラリで採用
- **追加メモリを使えない状況**: インプレースでソートできる
- ただし最悪 O(n²) が許容できない場合はマージソートやヒープソートを選択

## 参考文献

