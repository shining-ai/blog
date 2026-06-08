import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Prim法

## Prim法とは

Prim法とは、

> 最小全域木（Minimum Spanning Tree, MST） を求めるアルゴリズムの一つ

です。
<br/>

最小全域木とは、すべての頂点を含み、辺の重みの合計が最小となるグラフのことです。

以下の例では、最小全域木はこのように辺が選択されます。

![最小全域木とは](https://res.cloudinary.com/dtilrevrm/image/upload/v1780929485/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%891_q7swmc.jpg)



プリム法は、任意の頂点からスタートし、貪欲法で順次コストの低い頂点を追加していきます。

優先度付きキュー（ヒープ） + 隣接リストで効率的に実装でき、計算量はO（E log V）となります。

Eは辺の数、Vは頂点の数を表しています。
 

他にも最小全域木を求める方法は、　クラスカル法などがあります。


## 動作の概要

### 1. 初期化

全ての頂点に対して、コストを無限大（∞）に設定します。

次に任意の頂点をスタート地点に設定し、スタート自身のコストを0とします。

![プリム法の初期化](https://res.cloudinary.com/dtilrevrm/image/upload/v1780929489/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%892_zabf5y.jpg)


### 2. 新規ノードの追加し、隣接ノードのコストを更新

未訪問のノードの中で到達コストが最小のノードを選択して、そのノードへ移動します。

現在の頂点から伸びた辺を使い、隣接ノードの到達コストが小さくなる場合、コストを更新します。

そして現在の頂点を訪問済みにします。

![プリム法のコストの更新](https://res.cloudinary.com/dtilrevrm/image/upload/v1780929494/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%893_mhvicy.jpg)


### 3. 全頂点を訪問するまで繰り返す

全頂点が訪問済みになるまで、「2. 新規ノードの追加し、隣接ノードのコストを更新」を繰り返します。

![プリム法のコストの繰り返し](https://res.cloudinary.com/dtilrevrm/image/upload/v1780929492/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%894_qqgs4k.jpg)

![プリム法のコストの繰り返し2](https://res.cloudinary.com/dtilrevrm/image/upload/v1780929487/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%895_k4cjmr.jpg)


## 計算量

| | 計算量 |
| --- | --- |
| 時間（二分ヒープ） | O((V + E) log V) |
| 時間（フィボナッチヒープ） | O(E + V log V) |
| 空間 | O(V + E) |

## 実装

```python title="Prim法"
import heapq

def prim(
    n: int,
    graph: dict[int, list[tuple[int, int]]],
    start: int = 0,
) -> tuple[int, list[tuple[int, int, int]]]:
    """
    n 頂点（0-indexed）のグラフのMSTを返す
    graph[v] = [(next_v, weight), ...]
    Returns: (MSTの総重み, 採用された辺リスト)
    """
    in_mst    = [False] * n
    mst_cost  = 0
    mst_edges = []
    # (コスト, 到達頂点, 来た頂点)
    heap = [(0, start, -1)]

    while heap and len(mst_edges) < n - 1:
        cost, v, prev = heapq.heappop(heap)
        if in_mst[v]:
            continue
        in_mst[v] = True
        if prev != -1:
            mst_cost += cost
            mst_edges.append((prev, v, cost))
        for nv, w in graph.get(v, []):
            if not in_mst[nv]:
                heapq.heappush(heap, (w, nv, v))

    return mst_cost, mst_edges
```

```python title="使用例（0-indexed）"
graph = {
    0: [(1, 1), (2, 4)],
    1: [(0, 1), (2, 2), (3, 5)],
    2: [(0, 4), (1, 2), (3, 3)],
    3: [(1, 5), (2, 3)],
}
cost, mst = prim(4, graph, start=0)
print(cost)  # 6
print(mst)   # [(0,1,1), (1,2,2), (2,3,3)]
```

## KruskalとPrimの比較

| | Kruskal法 | Prim法 |
| --- | --- | --- |
| アプローチ | 辺ベース（全辺ソート） | 頂点ベース（木を拡張） |
| 計算量 | O(E log E) | O((V+E) log V) |
| 疎グラフ | 得意 | 同程度 |
| 密グラフ | やや不利 | 有利 |
| 実装 | Union-Find が必要 | ダイクストラと同構造 |

## 使用場面

- **通信網の設計**: 最小コストで全拠点を接続するケーブル配線
- **密グラフの MST**: 完全グラフに近いグラフでの効率的な MST 構築
- **クラスタ分析**: 階層的クラスタリングの基礎アルゴリズム

## 参考文献

<AffiliateBanner site="antbook" />
<AffiliateBanner site="rasen" />
