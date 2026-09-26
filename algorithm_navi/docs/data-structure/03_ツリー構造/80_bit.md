import AffiliateBanner from '@site/src/components/AffiliateBanner';

# BIT（Binary Indexed Tree / Fenwick Tree）

## BITとは

BIT（Binary Indexed Tree）とは、

> 配列の**前置和**（prefix sum）を O(log n) で更新・取得できるデータ構造

です。

Fenwick Tree とも呼ばれます。

セグメント木より実装が簡潔で定数倍が小さく、**1点更新 + 前置和クエリ**の組み合わせに特化しています。

## 仕組み

各インデックス `i` が「最下位ビットの値」個分の要素の合計を管理します。

```
インデックス（1-based）:  1    2    3    4    5    6    7    8
最下位ビット:             1    2    1    4    1    2    1    8
管理する区間:            [1]  [1,2] [3] [1,4] [5] [5,6] [7] [1,8]
```

- **更新**: `i += i & (-i)` で親へ伝播
- **クエリ**: `i -= i & (-i)` で前置和を累積

## 計算量

| 操作 | 計算量 |
| --- | --- |
| 構築 | O(n log n) |
| 1点更新 | O(log n) |
| 前置和クエリ | O(log n) |
| 区間和クエリ | O(log n) |

## 実装

```python title="BIT（Fenwick Tree）"
class BIT:
    def __init__(self, n: int):
        self.n = n
        self.tree = [0] * (n + 1)  # 1-indexed

    def update(self, i: int, delta: int) -> None:
        """i 番目の要素に delta を加算する（1-indexed）"""
        while i <= self.n:
            self.tree[i] += delta
            i += i & (-i)  # 次の担当区間へ

    def query(self, i: int) -> int:
        """1 から i までの前置和を返す（1-indexed）"""
        total = 0
        while i > 0:
            total += self.tree[i]
            i -= i & (-i)  # 親区間へ
        return total

    def range_query(self, l: int, r: int) -> int:
        """l から r までの区間和を返す（1-indexed, 両端含む）"""
        return self.query(r) - self.query(l - 1)
```

```python title="使用例"
bit = BIT(8)
nums = [3, 1, 4, 1, 5, 9, 2, 6]

# 初期化
for i, x in enumerate(nums):
    bit.update(i + 1, x)  # 1-indexed

print(bit.query(4))          # 9  (3+1+4+1)
print(bit.range_query(3, 6)) # 19 (4+1+5+9)

# 3番目の要素を +10 更新
bit.update(3, 10)
print(bit.query(4))          # 19 (3+1+14+1)
```

## 2次元BIT

行列の矩形和クエリに対応できます。

```python title="2次元BIT"
class BIT2D:
    def __init__(self, h: int, w: int):
        self.h = h
        self.w = w
        self.tree = [[0] * (w + 1) for _ in range(h + 1)]

    def update(self, y: int, x: int, delta: int) -> None:
        i = y
        while i <= self.h:
            j = x
            while j <= self.w:
                self.tree[i][j] += delta
                j += j & (-j)
            i += i & (-i)

    def query(self, y: int, x: int) -> int:
        total = 0
        i = y
        while i > 0:
            j = x
            while j > 0:
                total += self.tree[i][j]
                j -= j & (-j)
            i -= i & (-i)
        return total
```

## セグメント木との比較

| 項目 | BIT | セグメント木 |
| --- | --- | --- |
| 実装の複雑さ | 簡単 | やや複雑 |
| 定数倍 | 小さい | 大きい |
| 対応クエリ | 前置和のみ | 任意の区間演算 |
| 区間更新 | 差分BITで対応可 | 遅延伝播で対応可 |
| 空間計算量 | O(n) | O(n) |

## 使用場面

- **転倒数の計算**: 要素を左から処理し、自分より大きい値の個数をBITで取得
- **座標圧縮との組み合わせ**: 値域が広い場合に圧縮して使用
- **累積和の動的更新**: 配列要素が頻繁に変わる場合

## 参考文献

<AffiliateBanner site="tessoku" />
<AffiliateBanner site="antbook" />
