import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 選択ソート (Selection Sort)

## 選択ソートとは

選択ソートとは、

> 最小値を順に先頭へ確定していくソートアルゴリズム

です。
<br/>

未ソート部分から最小値を選択して、先頭へ移動させることを繰り返します。

## アルゴリズムの手順

配列 `[5, 3, 8, 1, 2]` をソートする例を示します。

![選択ソート1](https://res.cloudinary.com/dtilrevrm/image/upload/v1779895051/%E9%81%B8%E6%8A%9E%E3%82%BD%E3%83%BC%E3%83%882_i1qlk7.jpg)

![選択ソート2](https://res.cloudinary.com/dtilrevrm/image/upload/v1779895050/%E9%81%B8%E6%8A%9E%E3%82%BD%E3%83%BC%E3%83%881_qau2dn.jpg)

## 計算量

| | 計算量 | 備考 |
| --- | --- | --- |
| 最良 | O(n²) | 比較回数は常に n(n-1)/2 |
| 平均 | O(n²) | |
| 最悪 | O(n²) | |
| 空間 | O(1) | インプレース |
| 安定性 | 不安定 | 非隣接交換により同値要素の順序が崩れる |

:::info 交換回数は最小
選択ソートの**交換回数は最大 n-1 回**です。バブルソートや挿入ソートと比べて交換コストが高い場合（レコードが大きいなど）に有利なことがあります。
:::

## 実装

```python title="選択ソート"
def selection_sort(arr: list) -> list:
    n = len(arr)
    for i in range(n - 1):
        # 未ソート部分 (i 〜 n-1) の最小値のインデックスを探す
        min_idx = i
        for j in range(i + 1, n):
            if arr[j] < arr[min_idx]:
                min_idx = j
        # 最小値を先頭（確定位置）へ移動
        if min_idx != i:
            arr[i], arr[min_idx] = arr[min_idx], arr[i]
    return arr
```

```python title="使用例"
arr = [5, 3, 8, 1, 2]
print(selection_sort(arr))  # [1, 2, 3, 5, 8]
```



## 特徴

### 長所

- 交換回数が最大 n-1 回と少ない（書き込みコストが高い場合に有利）
- 実装がシンプルで理解しやすい
- 追加メモリが不要（インプレース）

### 短所

- 最良・平均・最悪すべて O(n²) で早期終了ができない
- 不安定ソートのため同値要素の順序が保証されない
- 同じ O(n²) でも挿入ソートより実用的な場面が少ない

### 使用場面

- **メモリ書き込みコストが高い環境**: 交換回数を最小限に抑えたい場合
- **教育目的**: 「最小値を選ぶ」というシンプルな考え方の説明
- 実用上はより高速なアルゴリズムを使うことが多い

## バブルソートとの違い

| | バブルソート | 選択ソート |
| --- | --- | --- |
| 比較回数 | 最悪 O(n²) | 常に n(n-1)/2 |
| 交換回数 | 最悪 O(n²) | 最大 n-1 回 |
| 安定性 | 安定 | 不安定 |
| 早期終了 | 可能 | 不可 |

## 参考文献

<AffiliateBanner site="antbook" />
