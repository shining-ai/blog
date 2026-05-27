import AffiliateBanner from '@site/src/components/AffiliateBanner';

# バブルソート (Bubble Sort)

## バブルソートとは

バブルソートとは、

> 隣接する要素を比較し、必要に応じて交換を繰り返すシンプルなソートアルゴリズム

です。
<br/>

泡（バブル）が水面に浮かび上がるように、大きい値が末尾へ向かって移動することが名前の由来です。

## アルゴリズムの手順

配列 `[5, 3, 8, 1, 2]` をソートする例を示します。

![バブルソート1](https://res.cloudinary.com/dtilrevrm/image/upload/v1779892288/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%893_cwf3xg.jpg)

![バブルソート2](https://res.cloudinary.com/dtilrevrm/image/upload/v1779892288/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%892_mc0rtc.jpg)

![バブルソート3](https://res.cloudinary.com/dtilrevrm/image/upload/v1779892288/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%891_ghhtbj.jpg)

各パスで末尾側から 1 つずつ確定し、交換が 1 回も起きなければ早期終了できます。

## 計算量

| | 計算量 | 条件 |
| --- | --- | --- |
| 最良 | O(n) | ほぼソート済み（早期終了） |
| 平均 | O(n²) | |
| 最悪 | O(n²) | 逆順に並んでいる |
| 空間 | O(1) | インプレース |
| 安定性 | 安定 | 等しい要素の順序を保つ |

## 実装

```python title="バブルソート"
def bubble_sort(arr: list) -> list:
    n = len(arr)
    for i in range(n):
        swapped = False
        # 未確定部分 (0 〜 n-i-1) を走査
        for j in range(n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True
        # 交換がなければソート済み → 早期終了
        if not swapped:
            break
    return arr
```

```python title="使用例"
arr = [5, 3, 8, 1, 2]
print(bubble_sort(arr))  # [1, 2, 3, 5, 8]
```

## 特徴

### 長所 
 - 実装がシンプルで理解しやすい 
 - 追加メモリが不要（インプレース）
 - 安定ソートである
 - ほぼソート済みの場合は O(n) で終了できる

### 短所
 - 平均・最悪が O(n²) で大規模データには不向き
 - 同じ O(n²) でも挿入ソートより交換回数が多い

### 使用場面
- 教育目的 (アルゴリズムの入門として最もシンプルな例)
- ほぼソート済みの配列 (早期終了により O(n) になる場合がある)

## 参考文献

<AffiliateBanner site="rasen" />
<AffiliateBanner site="algorithm_zukan" />
