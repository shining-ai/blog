import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 平衡二分探索木 (Balanced BST)

## 平衡二分探索木とは

平衡二分探索木とは、

> 左右の部分木の高さの差を小さく保ちながら、BST の順序制約を維持する木構造

です。
<br/>

通常の二分探索木は、偏った挿入順でO(n)まで劣化します。

平衡二分探索木はこれを防ぎ、常に O(log n) の性能を保証します。

![偏った二分探索木](https://res.cloudinary.com/dtilrevrm/image/upload/v1777825363/BST%E3%81%AE%E5%BC%B1%E7%82%B9_gp2sjq.jpg)


## 代表的な実装

### AVL木
各ノードで左右の部分木の高さの差が **1以下** になるよう保ちます。
- 挿入・削除のたびに**回転操作**でバランスを回復する

![AVL木の解説](https://res.cloudinary.com/dtilrevrm/image/upload/v1777910928/AVL%E6%9C%A8_sagfzn.jpg)

赤黒木より厳密にバランスが取れており、検索が高速です。


### 赤黒木（Red-Black Tree）
各ノードを赤か黒に色付けし、**色の変更**や**回転操作**で以下の4つのルール守り、バランスを保ちます。
- 全ノードは赤か黒
- 根(root)は黒
- 赤ノードの子は必ず黒
- 全ての葉から根までの黒ノード数は同じ

![赤黒木の解説](https://res.cloudinary.com/dtilrevrm/image/upload/v1777910936/%E8%B5%A4%E9%BB%92%E6%9C%A8_fdzju2.jpg)

AVL木より緩い制約でバランスを取るため、挿入・削除が高速です。



## 計算量

| 操作 | 計算量 | 備考 |
| --- | --- | --- |
| 検索 | O(log n) | 保証された最悪ケース |
| 挿入 | O(log n) | 回転操作含む |
| 削除 | O(log n) | 回転操作含む |

通常の BST と異なり、最悪ケースでも O(log n) が**保証**されます。

## 回転操作

バランスが崩れたとき、木の形を変えて高さを調整する操作です。

BST の順序制約を保ちながら構造を変換します。

### 右回転（Right Rotation）

![右回転](https://res.cloudinary.com/dtilrevrm/image/upload/v1777910931/%E5%8F%B3%E5%9B%9E%E8%BB%A2_dcfse6.jpg)

### 左回転（Left Rotation）

![左回転](https://res.cloudinary.com/dtilrevrm/image/upload/v1777910934/%E5%B7%A6%E5%9B%9E%E8%BB%A2_bba6bv.jpg)

## Pythonでの利用

Pythonの標準ライブラリには平衡BST は含まれていませんが、

`sortedcontainers` ライブラリの `SortedList` / `SortedDict` が同等の機能を提供します。

```python title="SortedContainersの使用例"
from sortedcontainers import SortedList

sl = SortedList([5, 3, 8, 2, 4])
sl.add(6)
print(sl)          # SortedList([2, 3, 4, 5, 6, 8])
print(sl[0])       # 2（最小値）
print(sl[-1])      # 8（最大値）
sl.remove(3)
print(sl)          # SortedList([2, 4, 5, 6, 8])
```

## 各言語での対応

| 言語 | 型 | 内部実装 |
| --- | --- | --- |
| Python | `sortedcontainers.SortedDict` | B木系 |
| C++ | `std::map` / `std::set` | 赤黒木 |
| Java | `TreeMap` / `TreeSet` | 赤黒木 |
| JavaScript | なし（標準では未提供） | - |
| Go | なし（標準では未提供） | - |

## 参考文献

[sortedcontainers documentation](http://www.grantjenks.com/docs/sortedcontainers/)
