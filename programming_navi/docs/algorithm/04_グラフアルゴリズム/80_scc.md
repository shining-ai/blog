import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 強連結成分分解 (SCC)

## SCCとは

強連結成分分解（Strongly Connected Components）とは、

> 有向グラフをどの頂点間でも相互に到達できる最大部分グラフ（強連結成分）に分解するアルゴリズム

です。
<br/>

Kosarajuアルゴリズムや Tarjanアルゴリズムで O(V + E) で求められ、分解後のグラフは必ずDAGになります。

## 動作の概要

```
有向グラフ:
  1 → 2 → 3 → 1   (閉路)
  3 → 4
  4 → 5 → 4   (閉路)

強連結成分:
  SCC1: {1, 2, 3}  (互いに到達可能)
  SCC2: {4, 5}     (互いに到達可能)

凝縮グラフ（DAG）:
  SCC1 → SCC2
```

Kosarajuアルゴリズムの手順:
1. 元のグラフでDFSし、帰りがけ順を記録
2. 逆グラフで帰りがけ順の逆順にDFS → 各DFS木が1つのSCC

## 計算量

| | 計算量 |
| --- | --- |
| 時間 | O(V + E) |
| 空間 | O(V + E) |

## 実装

```python title="KosarajuアルゴリズムによるSCC"
def kosaraju_scc(
    n: int,
    edges: list[tuple[int, int]],
) -> list[list[int]]:
    """
    n 頂点（0-indexed）のグラフをSCC分解する
    Returns: SCCのリスト（トポロジカル順）
    """
    graph  = [[] for _ in range(n)]
    rgraph = [[] for _ in range(n)]
    for u, v in edges:
        graph[u].append(v)
        rgraph[v].append(u)

    # フェーズ1: 元グラフでDFS（帰りがけ順を記録）
    visited = [False] * n
    order   = []

    def dfs1(v: int):
        stack = [(v, 0)]
        while stack:
            node, idx = stack[-1]
            if not visited[node]:
                visited[node] = True
            if idx < len(graph[node]):
                stack[-1] = (node, idx + 1)
                nv = graph[node][idx]
                if not visited[nv]:
                    stack.append((nv, 0))
            else:
                order.append(node)
                stack.pop()

    for v in range(n):
        if not visited[v]:
            dfs1(v)

    # フェーズ2: 逆グラフで逆順にDFS
    visited = [False] * n
    sccs    = []

    def dfs2(v: int) -> list[int]:
        comp  = []
        stack = [v]
        while stack:
            node = stack.pop()
            if visited[node]:
                continue
            visited[node] = True
            comp.append(node)
            for nv in rgraph[node]:
                if not visited[nv]:
                    stack.append(nv)
        return comp

    for v in reversed(order):
        if not visited[v]:
            sccs.append(dfs2(v))

    return sccs
```

```python title="使用例"
# グラフ: 0→1→2→0, 2→3, 3→4→3
edges = [(0,1),(1,2),(2,0),(2,3),(3,4),(4,3)]
sccs  = kosaraju_scc(5, edges)
print(sccs)  # [[0,2,1], [3,4]] など（SCC内の順序は不定）
```

```python title="凝縮グラフの構築"
def condensation(n: int, edges: list[tuple[int, int]]) -> tuple[int, list[tuple[int, int]]]:
    """凝縮グラフ（SCCをノードとするDAG）を返す"""
    sccs   = kosaraju_scc(n, edges)
    comp   = [0] * n
    for i, scc in enumerate(sccs):
        for v in scc:
            comp[v] = i

    dag_edges = set()
    for u, v in edges:
        cu, cv = comp[u], comp[v]
        if cu != cv:
            dag_edges.add((cu, cv))

    return len(sccs), list(dag_edges)
```

## 使用場面

- **2-SAT**: 論理式の充足可能性判定（SCCのトポロジカル順で解を構成）
- **Web クロール**: URL間のリンクのSCC（循環参照の検出）
- **コンパイラ**: 相互再帰関数グループの検出
- **ゲーム理論**: 強連結成分内では勝敗が等価

## 参考文献

<AffiliateBanner site="antbook" />
