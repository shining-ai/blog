import AffiliateBanner from '@site/src/components/AffiliateBanner';

# マージソート (Merge Sort)

## マージソートとは

マージソートとは、

> 分割して整列し、最後に統合するソート

です。
<br/>

配列を半分ずつに分け、各部分を整列したあと、順番を保ちながら結合（マージ）して完成させます。

## アルゴリズムの手順

配列 `[5, 3, 8, 1, 2, 7, 4, 6]` をソートする例を示します。


![分割の動作](https://res.cloudinary.com/dtilrevrm/image/upload/v1779984880/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%891_wgqy6z.jpg)

![マージの動作1](https://res.cloudinary.com/dtilrevrm/image/upload/v1779984881/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%892_v7bdkc.jpg)

![マージの動作2](https://res.cloudinary.com/dtilrevrm/image/upload/v1779984881/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%893_jbtfdl.jpg)

## 計算量

| | 計算量 | 備考 |
| --- | --- | --- |
| 最良 | O(n log n) | 常に同じ |
| 平均 | O(n log n) | |
| 最悪 | O(n log n) | 最悪ケースでも保証される |
| 空間 | O(n) | マージ用の作業配列が必要 |
| 安定性 | 安定 | 等しい要素の順序を保つ |

分割のレベル数は log n 段、各レベルで合計 n 回の比較・コピーが行われるため O(n log n) です。

## 実装

```python title="マージソート（再帰版）"
def merge_sort(arr: list) -> list:
    if len(arr) <= 1:
        return arr

    mid = len(arr) // 2
    left  = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return _merge(left, right)

def _merge(left: list, right: list) -> list:
    result = []
    i = j = 0
    # 両配列の先頭を比較して小さい方を追加
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:   # <= で安定性を保証
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
    # 残りを追加
    result.extend(left[i:])
    result.extend(right[j:])
    return result
```

```python title="使用例"
arr = [5, 3, 8, 1, 2, 7, 4, 6]
print(merge_sort(arr))  # [1, 2, 3, 4, 5, 6, 7, 8]
```

### インプレース版（追加メモリを削減）

```python title="マージソート（インプレース版）"
def merge_sort_inplace(arr: list, lo: int = 0, hi: int = None) -> list:
    if hi is None:
        hi = len(arr) - 1
    if lo >= hi:
        return arr

    mid = (lo + hi) // 2
    merge_sort_inplace(arr, lo, mid)
    merge_sort_inplace(arr, mid + 1, hi)
    _merge_inplace(arr, lo, mid, hi)
    return arr

def _merge_inplace(arr: list, lo: int, mid: int, hi: int):
    left  = arr[lo : mid + 1]
    right = arr[mid + 1 : hi + 1]
    i = j = 0
    k = lo
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            arr[k] = left[i]; i += 1
        else:
            arr[k] = right[j]; j += 1
        k += 1
    while i < len(left):
        arr[k] = left[i]; i += 1; k += 1
    while j < len(right):
        arr[k] = right[j]; j += 1; k += 1
```

### 長所

- 最良・平均・最悪すべて O(n log n) を保証する
- 安定ソートである
- 連結リストのソートに適している（追加メモリ不要でマージできる）
- 外部ソート（ディスク上の大量データ）にも応用できる

### 短所

- O(n) の追加メモリが必要
- クイックソートと比べてキャッシュ効率が悪く実測値がやや遅い
- 再帰の深さが O(log n) 分のスタックを消費する

## 使用場面

- **安定性が必要なとき**: 同値要素の元の順序を保ちたい場合
- **最悪ケースを保証したいとき**: O(n log n) が確実に必要な場合
- **リストのソート**: 連結リストは追加メモリなしでマージソートができる
- **外部ソート**: ディスク上の大量データのソート（分割してファイルに保存し順にマージ）

:::tip Python の sorted() との関係
Python の `sorted()` と `list.sort()` は **Timsort** を採用しています。
Timsort は既存の「連続した昇順・降順のラン」を活用したマージソートの変種で、
実データに対して非常に高速です。
:::

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
<AffiliateBanner site="rasen" />
