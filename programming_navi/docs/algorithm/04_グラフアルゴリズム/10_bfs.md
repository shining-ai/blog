import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 幅優先探索 (BFS)

## BFSとは

BFS（Breadth-First Search）とは、

> グラフや木を探索する際、始点から近い頂点から順に（層ごとに）探索するアルゴリズム

です。
<br/>

キューを用いて実装され、**辺の重みがすべて等しいグラフでの最短経路**を自然に求められます。

## 動作の概要

![BFSの動作](https://res.cloudinary.com/dtilrevrm/image/upload/v1780742020/10-bfs_eun8ju.jpg)

キューを使い、同じ距離のノードを順番にたどります。

## 計算量

| | 計算量 |
| --- | --- |
| 時間 | O(V + E) |
| 空間 | O(V) |

V = 頂点数, E = 辺数

## 実装

```python title="BFS（最短距離付き）"
from collections import deque

def bfs(graph: dict[int, list[int]], start: int) -> dict[int, int]:
    """始点からの最短距離（辺数）を返す"""
    dist  = {start: 0}
    queue = deque([start])

    while queue:
        v = queue.popleft()
        for nv in graph.get(v, []):
            if nv not in dist:
                dist[nv] = dist[v] + 1
                queue.append(nv)

    return dist
```

```python title="使用例"
graph = {1: [2, 3], 2: [4, 5], 3: [6], 4: [], 5: [], 6: []}
dist = bfs(graph, 1)
print(dist)  # {1: 0, 2: 1, 3: 1, 4: 2, 5: 2, 6: 2}
```

## DFSとの比較

| | DFS | BFS |
| --- | --- | --- |
| データ構造 | スタック（再帰） | キュー |
| メモリ | O(深さ) | O(幅) |
| 全解探索 | 得意 | 不向き |
| 最短経路探索 | 不向き | 得意 |

## 使用場面

- **最短経路（重みなし）**: SNSの友達の距離、迷路の最短手数
- **連結成分の検出**: 連結グラフのBFS木の構築
- **レベル順の木探索**: 二分木の幅優先列挙
- **0-1 BFS**: 辺の重みが0か1の場合は deque で O(V+E) の最短経路

## 参考文献

<AffiliateBanner site="tessoku" />
<AffiliateBanner site="antbook" />
<AffiliateBanner site="rasen" />
<AffiliateBanner site="algorithm_zukan" />
