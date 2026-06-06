import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ダイクストラ法

## ダイクストラ法とは

ダイクストラ法とは、

> 重み付きグラフにおいて最短経路を求めるアルゴリズムの一つ

です。
<br/>

最小経路とはスタートからゴールまでに通るパスの和が最小になるもののことです。

以下の例では、AからFまでの最短経路はA→D→E→B→C→Fとなります。

![最短経路を求める](https://res.cloudinary.com/dtilrevrm/image/upload/v1780748494/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%898_xubaz3.jpg)

ただし、ダイクストラ法では負の重みをもつグラフには適用できない点に注意が必要です。

重みをもつグラフに対しては、ベルマンフォードのアルゴリズムやワーシャルフロイドのアルゴリズム等を適用することができます。


## 動作の概要

### 1. 初期化

スタート地点を設定し、スタートから各頂点への距離を無限大（∞）に設定します。

ただし、スタート自身の距離は0とします。

![ダイクストラの初期化](https://res.cloudinary.com/dtilrevrm/image/upload/v1780748507/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%897_nrmj0u.jpg)

### 2. 隣接ノードの距離を更新
未確定の頂点の中から、現在の最短距離が最小の頂点を選択します。

その頂点を確定済みにして、隣接する頂点の距離を更新します。

更新する距離の計算は、

> 現在の頂点までの距離 + 辺の重み

で計算し、これが既存の距離よりも小さい場合に更新します。

![距離の更新](https://res.cloudinary.com/dtilrevrm/image/upload/v1780748505/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%896_xohqc9.jpg)

### 3. 繰り返し
「2. 隣接ノードの距離を更新」を繰り返します。

全ての頂点が確定するか、更新する必要がなくなれば終了します。

![繰り返し1](https://res.cloudinary.com/dtilrevrm/image/upload/v1780748503/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%895_hrcahw.jpg)

![繰り返し2](https://res.cloudinary.com/dtilrevrm/image/upload/v1780748501/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%894_ivgkzf.jpg)

![繰り返し3](https://res.cloudinary.com/dtilrevrm/image/upload/v1780748499/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%893_zxanbe.jpg)

![繰り返し4](https://res.cloudinary.com/dtilrevrm/image/upload/v1780748497/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%892_vazwzy.jpg)

![繰り返し5](https://res.cloudinary.com/dtilrevrm/image/upload/v1780748494/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%891_lt44hl.jpg)

## 計算量

| | 計算量 |
| --- | --- |
| 時間（二分ヒープ） | O((V + E) log V) |
| 時間（フィボナッチヒープ） | O(E + V log V) |
| 空間 | O(V + E) |

## 実装

```python title="ダイクストラ法"
import heapq

def dijkstra(graph: dict[int, list[tuple[int, int]]], start: int) -> dict[int, float]:
    """
    graph[v] = [(next_v, weight), ...]
    Returns: 始点 start からの最短距離辞書
    """
    dist = {start: 0}
    heap = [(0, start)]   # (コスト, 頂点)

    while heap:
        cost, v = heapq.heappop(heap)
        if cost > dist.get(v, float('inf')):
            continue  # 古いエントリをスキップ
        for nv, w in graph.get(v, []):
            new_cost = cost + w
            if new_cost < dist.get(nv, float('inf')):
                dist[nv] = new_cost
                heapq.heappush(heap, (new_cost, nv))

    return dist
```

```python title="使用例"
graph = {
    1: [(2, 2), (3, 5)],
    2: [(4, 3)],
    3: [(4, 1)],
    4: [],
}
dist = dijkstra(graph, 1)
print(dist)  # {1: 0, 2: 2, 3: 5, 4: 5}
```

```python title="最短経路の復元"
def dijkstra_with_path(
    graph: dict[int, list[tuple[int, int]]],
    start: int,
    goal: int,
) -> tuple[float, list[int]]:
    dist = {start: 0}
    prev = {start: None}
    heap = [(0, start)]

    while heap:
        cost, v = heapq.heappop(heap)
        if cost > dist.get(v, float('inf')):
            continue
        for nv, w in graph.get(v, []):
            new_cost = cost + w
            if new_cost < dist.get(nv, float('inf')):
                dist[nv] = new_cost
                prev[nv]  = v
                heapq.heappush(heap, (new_cost, nv))

    # 経路復元
    path, cur = [], goal
    while cur is not None:
        path.append(cur)
        cur = prev.get(cur)
    return dist.get(goal, float('inf')), path[::-1]

cost, path = dijkstra_with_path(graph, 1, 4)
print(cost, path)  # 5 [1, 2, 4]
```

## 注意点

:::caution 負の辺はNG
ダイクストラ法は**辺の重みが非負**のグラフにのみ適用できます。
負の辺がある場合はBellman-Ford法を使います。
:::

## 使用場面

- **地図アプリ**: 道路ネットワークの最短経路（Google Maps 等）
- **ネットワーク経路制御**: OSPF（Open Shortest Path First）プロトコル
- **ゲームAI**: グリッドマップ上の最短移動経路（A*の基礎）
- **コスト最小化**: 重み付きグラフ上の最小コスト問題

## 参考文献

<AffiliateBanner site="tessoku" />
<AffiliateBanner site="antbook" />
<AffiliateBanner site="rasen" />
<AffiliateBanner site="algorithm_zukan" />

