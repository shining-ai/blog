import AffiliateBanner from '@site/src/components/AffiliateBanner';

# セグメント木(Segment Tree)

## セグメント木(Segment Tree)とは

セグメント木(Segment Tree)とは、

> 区間に対する処理を効率的に行うためのデータ構造

です。<br/><br/>

区間に対する処理とは「〇〇番目から△△番目までの要素の最大値を求める」というようなものとなります。

具体的には以下のようなことを繰り返し行うときにセグメント木を使うと効率的に計算することができます。

* 区間の要素の最小値、最大値などを求める(RMQ)
* 区間の総和などを求める(RSQ)
* 区間の要素を一定の値で更新する


 区間に対する検索は、ナイーブに実装するとO(N)の計算量が必要になりますが、セグメント木を使うとO(log N)の計算量で実行可能です。

ただし、セグメント木の構築はO(N)の計算量となります。


## セグメント木の構造
セグメント木は、完全二分木の形をしています。

葉の節点が配列の各要素に対応しており、その上の節点は子の節点の値から求められる値(総和、最小値、最大値など)を持っています。

ここでは、最小値を求めるセグメント木を例を示します。

![](https://res.cloudinary.com/dtilrevrm/image/upload/v1757686009/%E3%82%BB%E3%82%B0%E3%83%A1%E3%83%B3%E3%83%88%E6%9C%A8%E3%81%AE%E6%A7%8B%E9%80%A0_bn7ybr.jpg)

### 値の求め方
できるだけ広い区間の組み合わせで要素をカバーできるようにします。

0~6番目の要素の最小値を取得することを考えてみましょう。

セグメント木では0~6番目の要素を過不足なく含んでいるオレンジの部分を見れば良いので、この3つの値の最小値が答えとなります。

![](https://res.cloudinary.com/dtilrevrm/image/upload/v1757686012/%E3%82%BB%E3%82%B0%E3%83%A1%E3%83%B3%E3%83%88%E6%9C%A8%E3%81%AE%E6%A4%9C%E7%B4%A2_hg2jbw.jpg)


このようにして、区間の値は木の頂点から計算できるようになっています。

### 値の更新方法
要素を更新する場合、その要素の親を順に確認していけば必要最低限の操作で済みます。

要素0を更新した場合は、その親であるオレンジの部分を順番に確認していきます。

![](https://res.cloudinary.com/dtilrevrm/image/upload/v1757686011/%E3%82%BB%E3%82%B0%E3%83%A1%E3%83%B3%E3%83%88%E6%9C%A8%E3%81%AE%E6%9B%B4%E6%96%B0_i3csnf.jpg)


### 番号付けの性質
完全二分木の根を1として図のように番号を割り振ると、親ノードと子ノードの関係は以下のようになります。

* 親：n / 2(切り捨て)
* 子：2n, 2n + 1

![](https://res.cloudinary.com/dtilrevrm/image/upload/v1757686010/%E3%82%BB%E3%82%B0%E3%83%A1%E3%83%B3%E3%83%88%E6%9C%A8%E3%81%AE%E3%82%A4%E3%83%B3%E3%83%87%E3%83%83%E3%82%AF%E3%82%B9%E3%81%AE%E9%96%A2%E4%BF%82_xrlnjf.jpg)


## セグメント木の実装方法
rootのインデックスは 1、半開区間で最小値を求めるセグメント木を実装します。

``` python title="セグメント木の実装"
# rootのindexは1
class SegmentTree:
    def __init__(self, nums):
        self.size = 1
        while self.size < len(nums):
            self.size *= 2
        self.tree = [(float("inf"))] * (self.size * 2)
        # 葉ノードに値をセット
        for i, num in enumerate(nums):
            self.tree[self.size + i] = num
        # 葉ノード以外に最小値をセット
        for i in range(self.size - 1, 0, -1):
            self.tree[i] = min(self.tree[i * 2], self.tree[i * 2 + 1])

    # 最上段から下がっていき、[begin, end)の最小値を取得
    # [node_begin, node_end)が現在のノードの区間
    def query(self, begin, end, node=1, node_begin=0, node_end=None):
        if node_end is None:
            node_end = self.size
        if node_end <= begin or end <= node_begin:  # 対象区間が被らない
            return float("inf")
        if begin <= node_begin and node_end <= end:  # 対象区間が完全に被る
            return self.tree[node]
        # 一部だけ被る  -> 子ノードに問い合わせ
        node_middle = (node_begin + node_end) // 2
        left_min = self.query(begin, end, node * 2, node_begin, node_middle)
        right_min = self.query(begin, end, node * 2 + 1, node_middle, node_end)
        return min(left_min, right_min)

    # 最下段の要素から親を辿っていき、値を更新
    def update(self, index, val):
        index += self.size
        self.tree[index] = val
        while index > 1:
            index //= 2
            self.tree[index] = min(self.tree[index * 2], self.tree[index * 2 + 1])
```

nums = [80, 50, 20, 60, 40, 30, 10, 70]を使って、実際に動かしてみます。

``` python title="セグメント木の構築例"
nums = [80, 50, 20, 60, 40, 30, 10, 70]
segment_tree = SegmentTree(nums)
print(segment_tree.tree)
for i in range(4):
    for i in range(2**(i), 2 ** (i+1)):
        print(segment_tree.tree[i], end=" ")
    print()
```

```text title="実行結果"
[inf, 10, 20, 10, 50, 20, 30, 10, 80, 50, 20, 60, 40, 30, 10, 70]
10 
20 10 
50 20 30 10 
80 50 20 60 40 30 10 70
```

ツリーの要素0は使っていないので、初期値が入っています。

``` python title="セグメント木の検索例"
print(segment_tree.query(1, 5))  # 50, 20, 60, 40, 30
```

```text title="実行結果"
20
```

最小値の検索はO(log N)の計算量で実行可能です。

``` python title="セグメント木の更新例"
segment_tree.update(2, 5)
for i in range(4):
    for i in range(2**(i), 2 ** (i+1)):
        print(segment_tree.tree[i], end=" ")
    print()
```

```text title="実行結果"
5 
5 10 
50 5 30 10 
80 50 5 60 40 30 10 70
```

値の更新も同じくO(log N)の計算量で実行可能です。

## 参考文献
<AffiliateBanner site="tessoku" />
<AffiliateBanner site="antbook" />
[プログラミングコンテストでのデータ構造](https://www.slideshare.net/slideshow/ss-3578491/3578491)