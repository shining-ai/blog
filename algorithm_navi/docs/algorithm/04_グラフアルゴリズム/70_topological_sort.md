import AffiliateBanner from '@site/src/components/AffiliateBanner';

# トポロジカルソート

## トポロジカルソートとは

トポロジカルソートとは、

> 有向非巡回グラフ（DAG）の頂点を、全ての辺 u→v について u が v より前に来るように並べる操作

です。
<br/>

「依存関係を持つタスクの実行順序」を求めるときに使われます。DAGでのみ存在し、閉路があると実現不可能です。

## 動作の概要

```
DAG:
  1 → 3
  2 → 3 → 5
  2 → 4 → 5

入次数（in-degree）:
  1:0, 2:0, 3:2, 4:1, 5:2

Kahn's algorithm:
  初期キュー（in-degree=0）: [1, 2]
  → 1を出力、3のin-degree: 2→1
  → 2を出力、3のin-degree: 1→0, 4のin-degree: 1→0
  → 3,4をキューに追加
  → 3を出力、5のin-degree: 2→1
  → 4を出力、5のin-degree: 1→0
  → 5を出力

結果: [1, 2, 3, 4, 5]
```

## 計算量

| | 計算量 |
| --- | --- |
| 時間 | O(V + E) |
| 空間 | O(V + E) |

## 実装

```python title="Kahnのアルゴリズム（BFSベース）"
from collections import deque

def topological_sort_kahn(
    n: int,
    edges: list[tuple[int, int]],
) -> list[int] | None:
    """
    n 頂点（0-indexed）のDAGのトポロジカル順序を返す
    閉路があれば None を返す
    """
    in_degree = [0] * n
    graph     = [[] for _ in range(n)]

    for u, v in edges:
        graph[u].append(v)
        in_degree[v] += 1

    queue  = deque(v for v in range(n) if in_degree[v] == 0)
    order  = []

    while queue:
        v = queue.popleft()
        order.append(v)
        for nv in graph[v]:
            in_degree[nv] -= 1
            if in_degree[nv] == 0:
                queue.append(nv)

    return order if len(order) == n else None  # None = 閉路あり
```

```python title="DFSベース（後順の逆）"
def topological_sort_dfs(
    n: int,
    edges: list[tuple[int, int]],
) -> list[int] | None:
    """DFSの後順の逆がトポロジカル順序"""
    graph   = [[] for _ in range(n)]
    for u, v in edges:
        graph[u].append(v)

    visited = [0] * n  # 0:未訪問 1:訪問中 2:完了
    order   = []

    def dfs(v: int) -> bool:
        if visited[v] == 1:
            return False   # 閉路検出
        if visited[v] == 2:
            return True
        visited[v] = 1
        for nv in graph[v]:
            if not dfs(nv):
                return False
        visited[v] = 2
        order.append(v)
        return True

    for v in range(n):
        if visited[v] == 0 and not dfs(v):
            return None  # 閉路あり

    return order[::-1]
```

```python title="使用例"
# タスクの依存関係: 0→2, 1→2, 1→3, 2→4, 3→4
edges = [(0, 2), (1, 2), (1, 3), (2, 4), (3, 4)]
order = topological_sort_kahn(5, edges)
print(order)  # [0, 1, 2, 3, 4] など（複数の正答あり）
```

```python title="DAGの最長経路（DP）"
def dag_longest_path(n: int, edges: list[tuple[int, int, int]]) -> int:
    """DAGの最長経路長（辺の重みあり）"""
    graph     = [[] for _ in range(n)]
    in_degree = [0] * n
    for u, v, w in edges:
        graph[u].append((v, w))
        in_degree[v] += 1

    order = topological_sort_kahn(n, [(u, v) for u, v, _ in edges])
    dp    = [0] * n
    for v in order:
        for nv, w in graph[v]:
            dp[nv] = max(dp[nv], dp[v] + w)
    return max(dp)
```

## 使用場面

- **ビルドシステム**: Makefileの依存関係解決（Make, Gradle, Cargo）
- **タスクスケジューリング**: 前提条件のある作業の順序決定
- **パッケージ管理**: pip, npm のインストール順序解決
- **DAGのDP**: 最長経路・最短経路・経路数の計算

## 参考文献

<AffiliateBanner site="antbook" />
