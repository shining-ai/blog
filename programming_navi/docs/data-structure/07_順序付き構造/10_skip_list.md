import AffiliateBanner from '@site/src/components/AffiliateBanner';

# スキップリスト (Skip List)

## スキップリストとは

スキップリストとは、

> 複数のリンクリストを重ねることで、検索・挿入・削除を高速化したデータ構造

です。
<br/>

通常の連結リストは先頭から順にたどるため O(n) の検索コストがかかります。

スキップリストは「高速レーン」となる上位レベルのリストを用意し、大きくスキップしながら目的の値に近づくことで検索を高速化します。

![スキップリストの構造](https://res.cloudinary.com/dtilrevrm/image/upload/v1779204627/skiplist%E3%81%AE%E6%A7%8B%E9%80%A0_qylze2.jpg)

- **Level 0** がすべての要素を含む (通常のソート済み連結リスト)
- 上位レベルは確率的に（50% の確率で）ノードを「高速レーン」に追加
- レベルが高いほどノード数は少なく、大きく飛び越えられる

## 検索の手順

1. 一番上の階層の先頭から開始する
2. 右の値を見て、探したい値以下なら右へ進む
3. 右へ進めなくなったら、1段下へ移動する
4. これを繰り返し、目的の値が見つかれば検索成功、見つからなければ存在しない


「6」を検索する例を示します。

![検索の手順](https://res.cloudinary.com/dtilrevrm/image/upload/v1779204627/skiplist%E3%81%AE%E6%A4%9C%E7%B4%A2_qwjhad.jpg)

上位レベルで大きくスキップし、下位レベルで細かく絞り込む動作が特徴です。

## 挿入の手順

1. 検索と同じ要領で挿入位置を特定し、各レベルで「更新が必要なノード」を記録
2. ランダムにレベル数を決定（コインを投げて表が出る間レベルを上げる）
3. 決定したレベルまで、各レベルのポインタを繋ぎ直す

![挿入の手順](https://res.cloudinary.com/dtilrevrm/image/upload/v1779204626/skiplist%E3%81%AE%E6%8C%BF%E5%85%A5_opxc5y.jpg)

## 計算量

| 操作 | 平均 | 最悪 |
| --- | --- | --- |
| 検索 | O(log n) | O(n) |
| 挿入 | O(log n) | O(n) |
| 削除 | O(log n) | O(n) |
| メモリ | O(n) | O(n log n) |

最悪ケースは確率的に極めてまれで、実用上は O(log n) として扱います。
レベル数の期待値は O(log n) 個に収まります。

## 平衡BST との比較

| | スキップリスト | 平衡BST（赤黒木など） |
| --- | --- | --- |
| 実装の複雑さ | シンプル | 複雑（回転操作が必要） |
| 性能保証 | 確率的 | 決定的 |
| 並行処理 | 実装しやすい | 難しい |
| 範囲検索 | 得意（Level 0 を順にたどる） | 可能だが実装が煩雑 |
| 用途 | Redis SortedSet など | C++ `map`, Java `TreeMap` |

並行処理に強い理由は、ノード挿入時に影響範囲が局所的なため、ロックの粒度を小さくできるからです。

## 実装

```python title="スキップリストの実装"
import random

class SkipNode:
    def __init__(self, val, level):
        self.val = val
        self.next = [None] * (level + 1)

class SkipList:
    MAX_LEVEL = 16
    P = 0.5  # レベルを上げる確率

    def __init__(self):
        self.head = SkipNode(float('-inf'), self.MAX_LEVEL)
        self.level = 0

    def _random_level(self):
        """コイントスでレベルを決定する"""
        level = 0
        while random.random() < self.P and level < self.MAX_LEVEL:
            level += 1
        return level

    def insert(self, val):
        # 各レベルで更新が必要なノードを記録
        update = [None] * (self.MAX_LEVEL + 1)
        current = self.head
        for i in range(self.level, -1, -1):
            while current.next[i] and current.next[i].val < val:
                current = current.next[i]
            update[i] = current

        new_level = self._random_level()
        if new_level > self.level:
            for i in range(self.level + 1, new_level + 1):
                update[i] = self.head
            self.level = new_level

        new_node = SkipNode(val, new_level)
        for i in range(new_level + 1):
            new_node.next[i] = update[i].next[i]
            update[i].next[i] = new_node

    def delete(self, val):
        update = [None] * (self.MAX_LEVEL + 1)
        current = self.head
        for i in range(self.level, -1, -1):
            while current.next[i] and current.next[i].val < val:
                current = current.next[i]
            update[i] = current

        target = current.next[0]
        if target is None or target.val != val:
            return False  # 見つからない

        for i in range(self.level + 1):
            if update[i].next[i] != target:
                break
            update[i].next[i] = target.next[i]

        # 不要になった上位レベルを削除
        while self.level > 0 and self.head.next[self.level] is None:
            self.level -= 1
        return True

    def search(self, val):
        current = self.head
        for i in range(self.level, -1, -1):
            while current.next[i] and current.next[i].val < val:
                current = current.next[i]
        current = current.next[0]
        return current is not None and current.val == val
```

```python title="使用例"
sl = SkipList()
for v in [3, 1, 4, 1, 5, 9, 2, 6]:
    sl.insert(v)

print(sl.search(4))   # True
print(sl.search(7))   # False
sl.delete(4)
print(sl.search(4))   # False
```

## 実用例

- **Redis** の SortedSet（ZSET）はスキップリストで実装されています
- スコア付きの順序付き集合で、**ランキング機能**・**リーダーボード**に活用
- **LevelDB / RocksDB** のメモリ上の書き込みバッファ（MemTable）にも採用

## 参考文献

[Skip Lists: A Probabilistic Alternative to Balanced Trees](https://15721.courses.cs.cmu.edu/spring2018/papers/08-oltpindexes1/pugh-skiplists-cacm1990.pdf)
