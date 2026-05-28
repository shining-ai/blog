import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 挿入ソート (Insertion Sort)

## 挿入ソートとは

挿入ソートとは、

> 要素を1つずつ正しい位置に挿し込んで並べるソートアルゴリズム

です。
<br/>

左側を「すでに整列済み」とみなし、新しい要素を適切な位置へ差し込んでいきます。
トランプの手札を整理するとき「新しい1枚を正しい位置に差し込む」動作と同じです。

## アルゴリズムの手順

配列 `[5, 3, 8, 1, 2]` をソートする例を示します。

![挿入ソート](https://res.cloudinary.com/dtilrevrm/image/upload/v1779980571/20-insertion-sort_h9vaxj.jpg)

## 計算量

| | 計算量 | 条件 |
| --- | --- | --- |
| 最良 | O(n) | すでにソート済み（比較のみで挿入不要） |
| 平均 | O(n²) | |
| 最悪 | O(n²) | 逆順に並んでいる |
| 空間 | O(1) | インプレース |
| 安定性 | 安定 | 等しい要素の順序を保つ |

## 実装

```python title="挿入ソート"
def insertion_sort(arr: list) -> list:
    for i in range(1, len(arr)):
        key = arr[i]        # 挿入する要素
        j = i - 1
        # key より大きい要素を1つ右にずらす
        while j >= 0 and arr[j] > key:
            arr[j + 1] = arr[j]
            j -= 1
        # 空いたスペースに key を挿入
        arr[j + 1] = key
    return arr
```

```python title="使用例"
arr = [5, 3, 8, 1, 2]
print(insertion_sort(arr))  # [1, 2, 3, 5, 8]
```

## バイナリ挿入ソート

挿入位置の探索を**二分探索**で O(log n) にできます（ただし移動コストは O(n) のまま）。

```python title="バイナリ挿入ソート"
import bisect

def binary_insertion_sort(arr: list) -> list:
    for i in range(1, len(arr)):
        key = arr[i]
        # 二分探索で挿入位置を決定
        pos = bisect.bisect_left(arr, key, 0, i)
        # pos の位置に key を挿入（後ろにずらす）
        arr[pos + 1: i + 1] = arr[pos:i]
        arr[pos] = key
    return arr
```

## 特徴

### 長所

- ほぼソート済みの場合は O(n) で動作する
- 追加メモリが不要（インプレース）
- 安定ソートである
- 要素が1つずつ届くオンライン処理に対応できる
- 小規模配列では定数係数が小さく実用的に速い

### 短所

- 平均・最悪が O(n²) で大規模データには不向き
- 要素の移動（シフト）回数が多くなる場合がある

### 使用場面

- **小規模な配列（n ≤ 30 程度）**: オーバーヘッドが小さく実用的に速い
- **ほぼソート済みの配列**: O(n) に近い性能が出る
- **オンラインソート**: 要素が1つずつ来る場合でも逐次処理できる
- **ハイブリッドソート**: Timsort（Python 標準）は挿入ソートと マージソートを組み合わせています

:::tip Python の標準ソート
Python の `list.sort()` / `sorted()` は **Timsort** という手法を使っており、
小さな部分配列には挿入ソートを適用して高速化しています。
:::

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
<AffiliateBanner site="rasen" />
