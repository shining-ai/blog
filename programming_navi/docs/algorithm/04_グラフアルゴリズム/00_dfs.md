import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 深さ優先探索 (DFS)

## DFSとは

DFS（Depth-First Search）とは、

> グラフや木を探索する際、できるだけ深い方向に進み、行き詰まったら戻るアルゴリズム

です。
<br/>

スタック（または再帰）を用いて実装されます。

連結性の確認・サイクル検出・トポロジカルソートなどに広く利用されます。

## 動作の概要

![DFSの動作](https://res.cloudinary.com/dtilrevrm/image/upload/v1780735932/00-dfs_ypt2ap.jpg)


スタック（再帰）を使い、隣接頂点をできるだけ深く辿り、行き詰まったら直前の頂点に戻ります。

## 計算量

| | 計算量 |
| --- | --- |
| 時間 | O(V + E) |
| 空間（再帰スタック） | O(V) |

V = 頂点数, E = 辺数

## 実装

```python title="DFS（再帰版）"
def dfs_recursive(graph: dict[int, list[int]], start: int) -> list[int]:
    visited = set()
    order   = []

    def dfs(v: int):
        visited.add(v)
        order.append(v)
        for nv in graph.get(v, []):
            if nv not in visited:
                dfs(nv)

    dfs(start)
    return order
```

```python title="DFS（スタック反復版）"
def dfs_iterative(graph: dict[int, list[int]], start: int) -> list[int]:
    visited = set()
    order   = []
    stack   = [start]

    while stack:
        v = stack.pop()
        if v in visited:
            continue
        visited.add(v)
        order.append(v)
        for nv in reversed(graph.get(v, [])):  # 辞書順を保つため逆順push
            if nv not in visited:
                stack.append(nv)

    return order
```

```python title="使用例"
graph = {1: [2, 3], 2: [4, 5], 3: [], 4: [], 5: []}
print(dfs_recursive(graph, 1))  # [1, 2, 4, 5, 3]
print(dfs_iterative(graph, 1))  # [1, 2, 4, 5, 3]
```

## 使用場面

- **連結性の確認**: グラフが連結かどうか・到達可能な頂点の列挙
- **サイクル検出**: 有向グラフ・無向グラフのサイクル検出
- **トポロジカルソート**: DAGの逆後順DFSで実現
- **強連結成分分解（SCC）**: Kosarajuアルゴリズムの基礎
- **迷路・パズル**: バックトラッキングによる全解探索

## 参考文献

<AffiliateBanner site="tessoku" />
<AffiliateBanner site="antbook" />
<AffiliateBanner site="rasen" />
<AffiliateBanner site="algorithm_zukan" />
