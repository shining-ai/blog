import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 区間木 (Interval Tree)

## 区間木とは

区間木（Interval Tree）とは、

> 複数の区間を管理し、指定した点や区間と重なる区間を効率的に検索できるデータ構造

です。
<br/>

たとえば「時刻 t に開催されているイベントをすべて列挙する」や
「座標 x と重なる矩形を検索する」といった処理に使われます。

![区間木が解決する問題](https://res.cloudinary.com/dtilrevrm/image/upload/v1778165491/%E5%8C%BA%E9%96%93%E6%9C%A8%E3%81%8C%E8%A7%A3%E3%81%8F%E5%95%8F%E9%A1%8C_vkz59n.jpg)

## 区間木の構造

セグメント木は、[二分探索木(BST)](10_binary_search_tree.md)と同じ形をしています。

各ノードは**区間**と**部分木の最大値**を持っています。

![区間木の構造](https://res.cloudinary.com/dtilrevrm/image/upload/v1778165493/%E5%8C%BA%E9%96%93%E6%9C%A8%E3%81%AE%E6%A7%8B%E9%80%A0_pwyywx.jpg)

### 検索

検索は、上から順に区間が重なるか確認していきます。
そして、左の子と右の子が区間に重なる可能性があるか検証して、可能性がなければ枝刈りをしていきます。

![区間木の検索](https://res.cloudinary.com/dtilrevrm/image/upload/v1778165495/%E5%8C%BA%E9%96%93%E6%9C%A8%E3%81%AE%E6%A4%9C%E7%B4%A2_l03jrz.jpg)

枝刈りのパターンは以下のパターンです。
* 左の枝刈り：サブツリーのmax < start
* 右の枝刈り：サブツリーのend < start



## 計算量

ナイーブに全区間をチェックするとO(n)ですが、

区間木を使うとO(log n + k)（k は結果の数）で検索できます。
 
| 操作 | 計算量 |
| --- | --- |
| 構築 | O(n log n) |
| 点を含む区間の検索 | O(log n + k) |
| 挿入 | O(log n) |

## 実装方法

Pythonでは `intervaltree` ライブラリを使うと簡単に利用できます。

```python title="intervaltreeライブラリの使用"
# pip install intervaltree
from intervaltree import IntervalTree

it = IntervalTree()
it[1:5] = "イベントA"
it[3:8] = "イベントB"
it[6:10] = "イベントC"

# 点 p = 4 と重なる区間を検索
print(it[4])
# {Interval(1, 5, 'イベントA'), Interval(3, 8, 'イベントB')}

# 区間 [2, 7] と重なる区間を検索
print(it[2:7])
# {Interval(1, 5, 'イベントA'), Interval(3, 8, 'イベントB')}
```

### 簡易実装（BST ベース）

```python title="区間木の簡易実装"
class Interval:
    def __init__(self, low, high, data=None):
        self.low = low
        self.high = high
        self.max = high  # 部分木内の最大上限
        self.data = data
        self.left = None
        self.right = None

class IntervalTree:
    def __init__(self):
        self.root = None

    def insert(self, low, high, data=None):
        self.root = self._insert(self.root, low, high, data)

    def _insert(self, node, low, high, data):
        if node is None:
            return Interval(low, high, data)
        if low < node.low:
            node.left = self._insert(node.left, low, high, data)
        else:
            node.right = self._insert(node.right, low, high, data)
        if node.max < high:
            node.max = high
        return node

    def search(self, point):
        """点 point を含む区間をひとつ返す"""
        return self._search(self.root, point)

    def _search(self, node, point):
        if node is None:
            return None
        if node.low <= point <= node.high:
            return node
        if node.left and node.left.max >= point:
            return self._search(node.left, point)
        return self._search(node.right, point)
```

## sweep line + heap による解法

ある**時点**で同時に存在するイベント数を求めるだけであれば、
区間木を使わずに、「開始時間ソート + min-heap」 で解くこともできます。

典型的には以下の流れです。

* イベントを開始時間でソート
* 現在時刻より前に終了したイベントを heap から取り除く
* heap に現在のイベントの終了時間を追加する
* heap サイズが「現在重なっているイベント数」になる

この方法は sweep line 的に左から右へ一度だけ走査する問題に強く、実装も比較的シンプルです。
```python title="heapによる実装"
import heapq

events = [
    (1, 5),
    (2, 7),
    (4, 6),
    (8, 10),
]

# 開始時間でソート
events.sort()

heap = []
max_overlap = 0

for start, end in events:
    # すでに終了したイベントを削除
    while heap and heap[0] <= start:
        heapq.heappop(heap)

    # 現在のイベントを追加
    heapq.heappush(heap, end)

    # 現在の重複数
    max_overlap = max(max_overlap, len(heap))

print(max_overlap)  # 3
```


一方、区間木(interval tree)は、

* 「ある区間と重なるイベントを探したい」
* 「後から任意の区間を問い合わせたい」
* 「イベントを動的に追加・削除したい」

といった、より一般的な区間検索に向いています。

特に heap は「現在アクティブな区間集合」を管理する構造であり、
任意区間との衝突検索には適していません。


| | 区間木 | heap |
| --- | --- | --- |
| 主な用途 | ある区間との重複検索 | ある点での重複検索 |
| 区間の動的追加 | 可能 | 困難 |
| 計算量 | O(log n + k) | O(n log n) |


## 参考文献

[intervaltree - PyPI](https://pypi.org/project/intervaltree/)
