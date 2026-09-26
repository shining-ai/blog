import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 計数ソート (Counting Sort)

## 計数ソートとは

計数ソートとは、

> 各値の出現回数を数え上げ、その累積和から正確な配置位置を計算するソートアルゴリズム

です。
<br/>

比較を一切行わないため、**比較ソートの理論下限 O(n log n) を超えられます**。
ただし、要素が小さい整数（0 〜 k）であるという制約があります。

## アルゴリズムの手順

配列 `[4, 2, 3, 1, 2, 4, 1]` をソートする例を示します（値域: 0〜4）。

![計数ソートの手順1](https://res.cloudinary.com/dtilrevrm/image/upload/v1780334555/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%891_w4ppqf.jpg)

![計数ソートの手順2](https://res.cloudinary.com/dtilrevrm/image/upload/v1780334555/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%892_r6xu3b.jpg)

![計数ソートの手順3](https://res.cloudinary.com/dtilrevrm/image/upload/v1780334555/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%893_ck9s1y.jpg)

![計数ソートの手順4](https://res.cloudinary.com/dtilrevrm/image/upload/v1780334555/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%894_wva9sj.jpg)

## 計算量

| | 計算量 | 備考 |
| --- | --- | --- |
| 時間 | O(n + k) | n: 要素数、k: 値の範囲 |
| 空間 | O(n + k) | カウント配列と出力配列 |
| 安定性 | 安定 | 後ろから処理することで安定性を保つ |

k が n に対して小さい（例: k = O(n)）場合、O(n) のソートが実現できます。

:::caution k が大きい場合
k が非常に大きい場合（例: 1億）はメモリが膨大になり非実用的です。
その場合は基数ソートが有効です。
:::

## 実装

```python title="計数ソート（安定版）"
def counting_sort(arr: list) -> list:
    if not arr:
        return arr

    max_val = max(arr)
    min_val = min(arr)
    offset  = min_val          # 負の値にも対応

    k = max_val - min_val + 1
    count = [0] * k

    # STEP 1: 出現回数を数える
    for x in arr:
        count[x - offset] += 1

    # STEP 2: 累積和（各値の最終配置位置）
    for i in range(1, k):
        count[i] += count[i - 1]

    # STEP 3: 後ろから走査して出力（安定性確保）
    output = [0] * len(arr)
    for x in reversed(arr):
        count[x - offset] -= 1
        output[count[x - offset]] = x

    return output
```

```python title="使用例"
arr = [4, 2, 3, 1, 2, 4, 1]
print(counting_sort(arr))  # [1, 1, 2, 2, 3, 4, 4]

# 負の値を含む例
arr2 = [3, -1, 0, -2, 2]
print(counting_sort(arr2))  # [-2, -1, 0, 2, 3]
```

### シンプル版（安定性不要の場合）

```python title="計数ソート（シンプル版）"
def counting_sort_simple(arr: list) -> list:
    if not arr:
        return arr
    count = [0] * (max(arr) + 1)
    for x in arr:
        count[x] += 1
    return [x for x, c in enumerate(count) for _ in range(c)]
```

## 基数ソートのサブルーチンとして

計数ソートは基数ソートの内部でも使われます。
桁ごとに計数ソートを適用することで、大きな値域でも効率的にソートできます。

```python title="1桁分の計数ソート（基数ソート用）"
def counting_sort_digit(arr: list, exp: int) -> list:
    """exp 桁目（1, 10, 100, ...）で安定ソート"""
    n = len(arr)
    count  = [0] * 10
    output = [0] * n

    for x in arr:
        count[(x // exp) % 10] += 1
    for i in range(1, 10):
        count[i] += count[i - 1]
    for x in reversed(arr):
        idx = (x // exp) % 10
        count[idx] -= 1
        output[count[idx]] = x

    return output
```

### 長所

- O(n + k) で比較ソートの理論下限 O(n log n) を超えられる
- 安定ソートである
- 実装が比較的シンプル

### 短所

- 整数（または整数に変換できる値）にしか使えない
- 値域 k が大きいとメモリと処理時間が膨大になる
- 浮動小数点数や文字列には直接適用できない

## 使用場面

- **値域が小さい整数のソート**: 年齢、評価（1〜5）、0〜255 のバイト値など
- **基数ソートの内部サブルーチン**
- **安定ソートが必要で値域が限られる場合**

## 参考文献

<AffiliateBanner site="rasen" />