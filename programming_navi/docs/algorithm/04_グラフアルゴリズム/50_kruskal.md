import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Kruskal法

## Kruskal法とは

Kruskal法とは、

> 最小全域木（Minimum Spanning Tree, MST） を求めるアルゴリズムの一つ

です。
<br/>

最小全域木とは、すべての頂点を含み、辺の重みの合計が最小となるグラフのことです。

以下の例では、最小全域木はこのように辺が選択されます。

![最小全域木とは](https://res.cloudinary.com/dtilrevrm/image/upload/v1780847457/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%891_utufnl.jpg)

クラスカル法は、辺をコストの小さい順に選択していき、閉路（サイクル）が生じないように最小全域木を構築していきます。

全辺のソートをするため、 計算量は`O（E log E）`となります。

`E`は辺の数を表しています。

<br/>
他にも最小全域木を求める方法は、　プリム法などがあります。

## 動作の概要

### 1. 全ての辺をソート
全ての辺をコストの昇順にソートします。

ソート結果は以下のようになりました。

* B-E間(3)
* A-D間(5)
* C-F間(7)
* E-F間(7)
* B-C間(10)
* D-E間(10)
* A-E間(11)
* C-E間(15)
* A-B間(20)

![すべての辺のソート](https://res.cloudinary.com/dtilrevrm/image/upload/v1780847460/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%892_enzlb5.jpg)


### 2. 辺を順に取り出し、頂点を連結する.

まず、一番コストの小さいB-E間(3)が取り出されます。

頂点Bと頂点Eは連結されていないので、B-E間(3)の辺でつなぎます。

![頂点の連結1](https://res.cloudinary.com/dtilrevrm/image/upload/v1780847462/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%893_lbgjy2.jpg)


### 3. 全ての頂点が連結するまで繰り返す

全頂点が連結済みになるまで、「2. 辺を順に取り出し、頂点を連結する」を繰り返します。

![頂点の連結2](https://res.cloudinary.com/dtilrevrm/image/upload/v1780847465/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%894_dw7ptw.jpg)

![頂点の連結3](https://res.cloudinary.com/dtilrevrm/image/upload/v1780847456/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%895_kgjjcr.jpg)


## 計算量

| | 計算量 |
| --- | --- |
| 辺のソート | O(E log E) |
| Union-Find操作 | O(E α(V)) ≈ O(E) |
| 合計 | O(E log E) |

α は逆アッカーマン関数（実質定数）

## 実装

```python title="Union-Find（経路圧縮 + ランク）"
class UnionFind:
    def __init__(self, n: int):
        self.parent = list(range(n))
        self.rank   = [0] * n

    def find(self, x: int) -> int:
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])  # 経路圧縮
        return self.parent[x]

    def union(self, x: int, y: int) -> bool:
        rx, ry = self.find(x), self.find(y)
        if rx == ry:
            return False  # 同じ集合 → 閉路
        if self.rank[rx] < self.rank[ry]:
            rx, ry = ry, rx
        self.parent[ry] = rx
        if self.rank[rx] == self.rank[ry]:
            self.rank[rx] += 1
        return True
```

```python title="Kruskal法"
def kruskal(
    n: int,
    edges: list[tuple[int, int, int]],
) -> tuple[int, list[tuple[int, int, int]]]:
    """
    n 頂点（0-indexed）のグラフのMSTを返す
    edges = [(u, v, weight), ...]
    Returns: (MSTの総重み, 採用された辺リスト)
    """
    uf       = UnionFind(n)
    mst_cost = 0
    mst_edges = []

    for u, v, w in sorted(edges, key=lambda e: e[2]):
        if uf.union(u, v):
            mst_cost += w
            mst_edges.append((u, v, w))
            if len(mst_edges) == n - 1:
                break   # V-1 辺で MST 完成

    return mst_cost, mst_edges
```

```python title="使用例（0-indexed）"
edges = [
    (0, 1, 1), (1, 2, 3), (2, 3, 2),
    (3, 4, 4), (0, 2, 6), (1, 3, 5),
]
cost, mst = kruskal(5, edges)
print(cost)  # 10
print(mst)   # [(0,1,1), (2,3,2), (1,2,3), (3,4,4)]
```

## 使用場面

- **通信網の設計**: 最小コストで全拠点を接続するケーブル配線
- **クラスタリング**: 最大スパニングツリーによるグループ分割
- **画像処理**: 画素間の最小スパニングツリーを用いたセグメンテーション
- **近似アルゴリズム**: 巡回セールスマン問題の近似解

## 参考文献

<AffiliateBanner site="antbook" />
