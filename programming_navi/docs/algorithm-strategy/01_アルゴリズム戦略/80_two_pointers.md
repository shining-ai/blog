import AffiliateBanner from '@site/src/components/AffiliateBanner';

# しゃくとり法（Two Pointers）

## しゃくとり法とは

しゃくとり法（Two Pointers）とは、

> 配列に対して **2つのポインタを使い、条件を満たす区間を線形時間で全列挙する**手法

です。

「左端 l を固定したとき、条件を満たす最大の右端 r」が単調増加するとき（尺取り虫のように区間を動かせるとき）に適用できます。

## 適用条件

```
条件 C(l, r) が成り立つとき、C(l, r-1) も成り立つ
（区間を縮めても条件が壊れない＝区間が短いほど条件が満たされやすい）
```

このとき、l を 1 つ右に動かすと r もそのまま or 右へしか動かないため、l と r の移動回数はそれぞれ O(n) で済みます。

## アルゴリズムの手順

```
① l=0, r=0 で初期化
② l を 0 から n-1 まで動かす:
   a. 条件を満たす間 r を右へ伸ばす
   b. [l, r-1] が条件を満たす最大区間 → 集計
   c. l を 1 つ右へ（区間を縮める）
```

## 計算量

| | 計算量 |
| --- | --- |
| 時間 | O(n)（l, r ともに最大 n 回移動） |
| 空間 | O(1) |

## 実装

```python title="条件を満たす部分配列の個数（合計が K 以下）"
def count_subarrays_le_k(arr: list[int], k: int) -> int:
    """合計が k 以下の部分配列の個数"""
    n = len(arr)
    count = 0
    total = 0
    r = 0

    for l in range(n):
        # r を可能な限り右へ伸ばす
        while r < n and total + arr[r] <= k:
            total += arr[r]
            r += 1
        # [l, r-1] が条件を満たす最大区間
        count += r - l
        # l を右へ
        if r > l:
            total -= arr[l]
        else:
            r = l + 1  # r が l より左にならないよう調整

    return count
```

```python title="合計がちょうど K になる部分配列の個数（非負整数）"
def count_subarrays_eq_k(arr: list[int], k: int) -> int:
    """
    合計がちょうど k の個数 = 合計が k 以下 - 合計が k-1 以下
    """
    def at_most(target):
        if target < 0:
            return 0
        count = total = r = 0
        for l in range(len(arr)):
            while r < len(arr) and total + arr[r] <= target:
                total += arr[r]
                r += 1
            count += r - l
            total -= arr[l]
        return count

    return at_most(k) - at_most(k - 1)
```

```python title="長さ K の部分配列の最大和（スライディングウィンドウ）"
def max_sum_fixed_window(arr: list[int], k: int) -> int:
    """固定長 k の部分配列で最大の合計"""
    window = sum(arr[:k])
    max_sum = window

    for i in range(k, len(arr)):
        window += arr[i] - arr[i - k]
        max_sum = max(max_sum, window)

    return max_sum
```

```python title="ソート済み配列で和が target の対の個数"
def count_pairs_with_sum(arr: list[int], target: int) -> int:
    """ソート済み配列で合計が target になるペアの個数"""
    arr.sort()
    l, r = 0, len(arr) - 1
    count = 0

    while l < r:
        s = arr[l] + arr[r]
        if s == target:
            if arr[l] == arr[r]:
                # 残り全部が同じ値
                m = r - l + 1
                count += m * (m - 1) // 2
                break
            # 重複を数える
            cnt_l = cnt_r = 1
            while l + 1 < r and arr[l] == arr[l + 1]:
                l += 1
                cnt_l += 1
            while r - 1 > l and arr[r] == arr[r - 1]:
                r -= 1
                cnt_r += 1
            count += cnt_l * cnt_r
            l += 1
            r -= 1
        elif s < target:
            l += 1
        else:
            r -= 1

    return count
```

## しゃくとり法が使えないケース

- 負の数を含む配列で「合計がちょうど K」（単調性が崩れる）
  → ハッシュマップによる prefix sum で解く
- 条件が単調でない場合（区間を縮めると条件が壊れる場合も）

## 使用場面

- **部分配列の条件付き数え上げ**: 合計・積・最大値などに関する制約
- **スライディングウィンドウ**: 固定長または可変長の窓の最大・最小
- **ソート済み配列でのペア探索**: 2 sum、3 sum 問題

## 参考文献

<AffiliateBanner site="tessoku" />
<AffiliateBanner site="rasen" />
