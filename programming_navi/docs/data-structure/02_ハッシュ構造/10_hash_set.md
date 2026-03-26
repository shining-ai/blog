import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ハッシュセット (Hash Set)

## ハッシュセットとは

ハッシュセットとは、

> 重複のない要素の集合を管理するデータ構造

です。
<br/>

ハッシュテーブルをベースに実装されており、**値のみ**を格納します（キーと値のペアではない）。

「この値はすでに登録済みか？」を高速に判定したい場合に使われます。

ハッシュセットは以下のような特徴を持つデータ構造です。
* 重複を許さない : setの中では、同じ要素を複数回追加しても一つしか保持されません。
* 順序がない : 要素の順序は保持されません
* 集合演算が可能 : 数学的な集合（和集合・積集合など）に基づく演算ができます。

![重複しない](https://res.cloudinary.com/dtilrevrm/image/upload/v1757686236/set_%E9%87%8D%E8%A4%87%E3%82%92%E8%A8%B1%E3%81%95%E3%81%AA%E3%81%84_xgfvn3.jpg)

![集合演算が可能](https://res.cloudinary.com/dtilrevrm/image/upload/v1757686237/set_%E9%9B%86%E5%90%88%E6%BC%94%E7%AE%97%E3%81%8C%E5%8F%AF%E8%83%BD_mzyjgb.jpg)


## ハッシュセットの計算量

| 操作 | 平均 | 最悪 |
| --- | --- | --- |
| 追加（add） | O(1) | O(n) |
| 削除（remove） | O(1) | O(n) |
| 存在確認（in） | O(1) | O(n) |

## ハッシュテーブルとの違い

| | ハッシュテーブル | ハッシュセット |
| --- | --- | --- |
| 格納内容 | キーと値のペア | 値のみ |
| 主な用途 | キーから値を引く | 重複排除・存在確認 |
| Python | `dict` | `set` |

## ハッシュセットの実装

ハッシュセットはハッシュテーブルを使って実装されます。

このハッシュテーブルを活用することで、高速な要素の追加・削除・検索が可能です。

```python title="ハッシュセットの実装"
class Myset:
    def __init__(self):
        self.data = {}

    def add(self, value):
        self.data[value] = True

    def remove(self, value):
        if value in self.data:
            del self.data[value]
        else:
            raise KeyError("Value not found")

    def union(self, other_set):
        # 和集合の実装
        result = Myset()
        for value in self.data:
            result.add(value)
        for value in other_set.data:
            result.add(value)
        return result

    def intersection(self, other_set):
        # 積集合の実装
        result = Myset()
        for value in self.data:
            if value in other_set.data:
                result.add(value)
        return result

    def difference(self, other_set):
        # 差集合の実装
        result = Myset()
        for value in self.data:
            if value not in other_set.data:
                result.add(value)
        return result

# 使用例
set_A = Myset()
set_A.add(1)
set_A.add(2)
set_A.add(3)

set_B = Myset()
set_B.add(3)
set_B.add(4)
set_B.add(5)

print("A:", set_A.data)
print("B:", set_B.data)

print("A union B:", set_A.union(set_B).data.keys())
print("A intersection B:", set_A.intersection(set_B).data.keys())
print("A difference B:", set_A.difference(set_B).data.keys())
```
```text title="実行結果"
A: {1: True, 2: True, 3: True}
B: {3: True, 4: True, 5: True}
A union B: dict_keys([1, 2, 3, 4, 5])
A intersection B: dict_keys([3])
A difference B: dict_keys([1, 2])
```

## 標準ライブラリ
Pythonでは `set` としてハッシュセットが標準ライブラリに含まれています。

```python title="ライブラリを使った操作"
set_A = set([1, 2, 3])
set_B = set([3, 4, 5])

print("A:", set_A)
print("B:", set_B)

print("A union B:", set_A.union(set_B))
print("A intersection B:", set_A.intersection(set_B))
print("A difference B:", set_A.difference(set_B))
```

```text title="実行結果"
A: {1, 2, 3}
B: {3, 4, 5}
A union B: {1, 2, 3, 4, 5}
A intersection B: {3}
A difference B: {1, 2}
```


### 集合演算

```python title="集合演算"
a = {1, 2, 3, 4}
b = {3, 4, 5, 6}

# 和集合
print(a | b)   # {1, 2, 3, 4, 5, 6}

# 積集合（共通部分）
print(a & b)   # {3, 4}

# 差集合
print(a - b)   # {1, 2}

# 対称差（どちらか一方にだけ含まれる）
print(a ^ b)   # {1, 2, 5, 6}
```

### 典型的な使用例：重複チェック

```python title="訪問済みチェック（グラフの探索など）"
visited = set()

def visit(node):
    if node in visited:
        return  # 既に訪問済み
    visited.add(node)
    print(f"visiting {node}")

visit("A")  # visiting A
visit("B")  # visiting B
visit("A")  # （何も出力されない）
```

## 注意点

- `set` は順序を保持しません（Python 3.7以降の `dict` と異なる）
- 要素は**ハッシュ可能**である必要があります（リストは要素にできない）

```python title="ハッシュ不可能な型はエラーになる"
s = set()
s.add([1, 2, 3])  # TypeError: unhashable type: 'list'
```

## 参考文献

[組み込み型 — Python 3.13.0 ドキュメント](https://docs.python.org/ja/3/library/stdtypes.html#set)