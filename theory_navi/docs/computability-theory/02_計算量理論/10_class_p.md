import AffiliateBanner from '@site/src/components/AffiliateBanner';

# クラス P（多項式時間で解ける問題）

## クラス P とは

> クラス P（Polynomial time）とは、決定性チューリング機械が入力サイズ n の多項式時間 O(n^k)（k は定数）で解ける判定問題の集合であり、「現実的に効率よく解ける問題」の数学的定義として広く受け入れられている。

P クラスは Cobham（1965年）と Edmonds（1965年）によって独立に提唱されました。多項式時間という条件は、実用的なアルゴリズムと非現実的なアルゴリズムを区別する自然な境界として機能します。O(n^1000) は理論上多項式ですが、実際に現れる多項式のべき数は小さい（2〜5程度）ことが多いです。

P に属する問題の例としては、整数の素因数分解の判定（AKS 素数判定）、グラフの連結性判定、最短経路問題（Dijkstra 法）、線形計画法、2-SAT、最大マッチング（一般グラフ）などがあります。

P の重要な性質は「閉包性」です。P に属する問題の補問題も P に属します（co-P = P）。また、P の問題は多項式時間帰着（many-one 帰着）に対して閉じています。

P の定義はチューリング機械のモデル（シングルテープ、マルチテープ、RAM モデルなど）によらず同一であることが証明されており、これが P クラスが「計算の物理的な限界に依存しない」ことを示しています。

## P クラスに属する代表的な問題

| 問題 | 計算量 | アルゴリズム |
|------|--------|------------|
| 整数のソート | O(n log n) | マージソート |
| 最短経路（非負重み） | O((V+E) log V) | Dijkstra 法 |
| 最小全域木 | O(E log V) | Kruskal / Prim 法 |
| 最大フロー | O(V·E²) | Edmonds-Karp |
| 素数判定 | O(log^6 n) | AKS アルゴリズム |
| 2-SAT | O(n + m) | 強連結成分分解 |
| 線形計画法 | 多項式 | 楕円体法 / 内点法 |
| GCD（最大公約数） | O(log min(a,b)) | Euclidean 法 |

```python
from collections import deque
from typing import Optional

# ===========================
# P クラスの問題例 1: グラフの連結性判定（BFS: O(V+E)）
# ===========================

def is_connected(n: int, edges: list[tuple[int, int]]) -> bool:
    """無向グラフが連結かどうかを BFS で判定（P クラスの問題）"""
    if n == 0:
        return True
    adj: list[list[int]] = [[] for _ in range(n)]
    for u, v in edges:
        adj[u].append(v)
        adj[v].append(u)

    visited = [False] * n
    queue = deque([0])
    visited[0] = True
    count = 1

    while queue:
        node = queue.popleft()
        for neighbor in adj[node]:
            if not visited[neighbor]:
                visited[neighbor] = True
                count += 1
                queue.append(neighbor)

    return count == n

# ===========================
# P クラスの問題例 2: 2-SAT（O(n+m)）
# ===========================

def solve_2sat(n: int, clauses: list[tuple[int, int]]) -> Optional[list[bool]]:
    """
    2-SAT を強連結成分分解（Kosaraju 法）で解く
    変数 x_i の真値（0 から n-1）と偽値（n から 2n-1）の 2n ノードを使う
    節 (a OR b) は (NOT a → b) と (NOT b → a) の含意グラフで表現
    """
    size = 2 * n
    # 含意グラフの構築
    graph:  list[list[int]] = [[] for _ in range(size)]
    rgraph: list[list[int]] = [[] for _ in range(size)]

    def neg(x: int) -> int:
        return x + n if x < n else x - n

    for a, b in clauses:
        # (a OR b) → (NOT a → b) かつ (NOT b → a)
        graph[neg(a)].append(b)
        graph[neg(b)].append(a)
        rgraph[b].append(neg(a))
        rgraph[a].append(neg(b))

    # Kosaraju 法でトポロジカル順序を求める
    visited = [False] * size
    order: list[int] = []

    def dfs1(v: int) -> None:
        visited[v] = True
        for u in graph[v]:
            if not visited[u]:
                dfs1(u)
        order.append(v)

    import sys
    sys.setrecursionlimit(10000)
    for v in range(size):
        if not visited[v]:
            dfs1(v)

    comp = [-1] * size
    comp_id = 0

    def dfs2(v: int, cid: int) -> None:
        comp[v] = cid
        for u in rgraph[v]:
            if comp[u] == -1:
                dfs2(u, cid)

    for v in reversed(order):
        if comp[v] == -1:
            dfs2(v, comp_id)
            comp_id += 1

    # 各変数について x_i と NOT x_i が同じ SCC なら UNSAT
    assignment = [False] * n
    for i in range(n):
        if comp[i] == comp[neg(i)]:
            return None  # UNSAT
        # SCC 番号が大きい方（後処理側）を真とする
        assignment[i] = comp[i] > comp[neg(i)]

    return assignment


# デモ
print("=== P クラスの問題デモ ===\n")

print("[グラフ連結性判定]")
edges1 = [(0, 1), (1, 2), (2, 3)]
edges2 = [(0, 1), (2, 3)]
print(f"  4頂点, 辺 {edges1}: 連結 = {is_connected(4, edges1)}")
print(f"  4頂点, 辺 {edges2}: 連結 = {is_connected(4, edges2)}")

print("\n[2-SAT]")
# (x0 OR x1) AND (NOT x0 OR x2) AND (NOT x1 OR NOT x2)
# 変数 0,1,2（真: 0,1,2 / 偽: 3,4,5）
clauses = [
    (0, 1),      # x0 OR x1
    (3, 2),      # NOT x0 OR x2   (neg(0)=3)
    (4, 5),      # NOT x1 OR NOT x2 (neg(1)=4, neg(2)=5)
]
result = solve_2sat(3, clauses)
if result:
    print(f"  充足可能  割り当て: x0={result[0]}, x1={result[1]}, x2={result[2]}")
else:
    print("  充足不能")
```

## 使用場面

- ネットワークルーティングやスケジューリングなど、現実問題がクラス P に属するか確認する場面
- NP 完全問題を P の問題に特殊化（グラフの制約を追加など）して効率的に解く設計をする場面
- 新アルゴリズムの計算量を解析して P クラスに収まることを証明する場面

## 参考文献

- Sipser, M. "Introduction to the Theory of Computation" (Cengage Learning)
- Cormen, T. H. et al. "Introduction to Algorithms" (MIT Press)
- Cobham, A. "The intrinsic computational difficulty of functions" (1965)

<AffiliateBanner site="theory_navi" />
