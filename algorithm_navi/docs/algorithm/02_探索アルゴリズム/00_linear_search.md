import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 線形探索 (Linear Search)

## 線形探索とは

線形探索とは、

> 先頭から順に各要素を調べ、目的の値を探すアルゴリズム

です。
<br/>

最もシンプルな探索アルゴリズムで、**ソートされていない配列にも使える**のが強みです。

## アルゴリズムの手順

配列 `[3, 1, 4, 1, 5, 9]` から `4` を探す例を示します。

![線形探索の手順](https://res.cloudinary.com/dtilrevrm/image/upload/v1780495485/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%891_qhgc9x.jpg)

## 計算量

| | 計算量 | 条件 |
| --- | --- | --- |
| 最良 | O(1) | 先頭に目的の値がある場合 |
| 平均 | O(n) | |
| 最悪 | O(n) | 末尾にある、または存在しない |
| 空間 | O(1) | 追加メモリ不要 |

## 実装

```python title="線形探索"
def linear_search(arr: list, target) -> int:
    """target のインデックスを返す。見つからない場合は -1"""
    for i, v in enumerate(arr):
        if v == target:
            return i
    return -1
```

```python title="使用例"
arr = [3, 1, 4, 1, 5, 9, 2, 6, 7, 8]
print(linear_search(arr, 7))   # 8
print(linear_search(arr, 10))  # -1
```

### 番兵法（Sentinel）

末尾に番兵（target そのもの）を追加することで、**毎回の範囲チェック（`i < n`）を省略**できます。
比較回数を約半分にできる小さな最適化です。

![番兵法](https://res.cloudinary.com/dtilrevrm/image/upload/v1780495484/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%892_klxj6z.jpg)

```python title="番兵法"
def linear_search_sentinel(arr: list, target) -> int:
    arr_copy = arr + [target]     # 末尾に番兵を追加
    i = 0
    while arr_copy[i] != target:
        i += 1
    return i if i < len(arr) else -1  # 番兵に当たった場合は -1
```

### 条件付き探索

`find` / `filter` の代わりとして、条件を満たす要素を線形探索で取り出します。

```python title="条件付き探索"
# Python 標準の next() + ジェネレータで簡潔に書ける
arr = [3, 1, 4, 1, 5, 9, 2, 6, 7, 8]

# 最初の偶数を探す
result = next((v for v in arr if v % 2 == 0), None)
print(result)  # 4

# 5 以上の要素をすべて取り出す
results = [v for v in arr if v >= 5]
print(results)  # [5, 9, 6, 7, 8]
```

## 使用場面

- **未ソートのデータ**: ソートのコストを払いたくない場合
- **データ数が少ない（n ≤ 数十程度）**: 二分探索のセットアップコストより速い
- **1回だけの探索**: ソートしてから二分探索するより単純
- **条件付き探索**: 単純な等値比較以外の条件を扱う場合

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
<AffiliateBanner site="rasen" />
