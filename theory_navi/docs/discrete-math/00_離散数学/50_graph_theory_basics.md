import AffiliateBanner from '@site/src/components/AffiliateBanner';

# グラフ理論の基礎（次数・閉路・木）

## グラフ理論とは

> グラフ理論（Graph Theory）とは、頂点（Vertex）と辺（Edge）からなる離散構造「グラフ」の性質を研究する数学の分野であり、ネットワーク・スケジューリング・経路問題など広範な応用を持つ。

グラフ G = (V, E) は頂点集合 V と辺集合 E ⊆ V × V（または E ⊆ {V choose 2}）の対です。辺に向きがある**有向グラフ**（Directed Graph / Digraph）と向きのない**無向グラフ**（Undirected Graph）があります。頂点 v の**次数**（degree）は v に接続する辺の本数で、有向グラフでは入次数（in-degree）と出次数（out-degree）に分けられます。無向グラフでは「すべての頂点の次数の和 = 辺数の2倍」（握手補題）が成立します。

**歩道**（walk）は頂点と辺を順に辿る列、**道**（path）は頂点が繰り返さない歩道、**閉路**（cycle）は始点と終点が同じ道です。閉路を持たない無向連結グラフを**木**（Tree）と言い、|V| 頂点 |V|-1 辺の性質を持ちます。木は一意のパスを任意の頂点対間に保証する最小連結グラフであり、スパニングツリー（全域木）はグラフの全頂点を繋ぐ木の部分グラフです。

**連結性**はグラフの重要な性質で、無向グラフが連結（任意の2頂点間にパスが存在）かどうか、有向グラフが強連結（任意の2頂点間に有向パスが存在）かどうかが問われます。オイラー路（すべての辺をちょうど1度通る路）の存在条件は奇次数頂点が0または2個という定理（オイラー）が有名です。

## グラフの基本用語

| 用語 | 定義 |
|------|------|
| 頂点 / ノード | グラフの基本要素 |
| 辺 / エッジ | 頂点を結ぶ線 |
| 次数 | 頂点に接続する辺の数 |
| 連結 | 任意の2頂点間にパスが存在 |
| 木 | 連結かつ閉路を持たないグラフ |
| 森 | 閉路を持たないグラフ（連結でなくてもよい） |
| 完全グラフ K_n | n 頂点すべてが辺で繋がれたグラフ |
| 二部グラフ | 頂点を2組に分け、辺が組間のみに存在 |

```python
from collections import defaultdict, deque

class Graph:
    """無向グラフの隣接リスト表現"""
    def __init__(self, n: int):
        self.n = n
        self.adj = defaultdict(list)
        self.edges = 0

    def add_edge(self, u: int, v: int):
        self.adj[u].append(v)
        self.adj[v].append(u)
        self.edges += 1

    def degree(self, v: int) -> int:
        return len(self.adj[v])

    def is_connected(self) -> bool:
        """BFS で連結性を確認"""
        if self.n == 0:
            return True
        visited = set()
        queue = deque([0])
        visited.add(0)
        while queue:
            u = queue.popleft()
            for w in self.adj[u]:
                if w not in visited:
                    visited.add(w)
                    queue.append(w)
        return len(visited) == self.n

    def is_tree(self) -> bool:
        """木かどうかを判定（連結 かつ 辺数 = 頂点数 - 1）"""
        return self.is_connected() and self.edges == self.n - 1

# グラフの構築と検証
g = Graph(5)
for u, v in [(0,1),(1,2),(2,3),(3,4)]:
    g.add_edge(u, v)

print("連結:", g.is_connected())  # True
print("木:", g.is_tree())          # True
print("頂点0の次数:", g.degree(0)) # 1

# 握手補題の検証
total_degree = sum(g.degree(v) for v in range(g.n))
print(f"次数の合計={total_degree}, 辺数の2倍={2*g.edges}")  # 等しい

# 閉路の検出（DFS）
def has_cycle(graph: Graph) -> bool:
    visited = set()
    def dfs(v, parent):
        visited.add(v)
        for w in graph.adj[v]:
            if w not in visited:
                if dfs(w, v):
                    return True
            elif w != parent:
                return True  # 後退辺 = 閉路
        return False
    return any(dfs(v, -1) for v in range(graph.n) if v not in visited)

print("閉路あり:", has_cycle(g))  # False（木なので）
```

## 使用場面

- **ネットワーク解析**: ソーシャルネットワークの連結成分・次数分布の分析
- **経路探索**: BFS・DFS・ダイクストラ法など最短路アルゴリズムの基盤
- **コンパイラ**: 制御フローグラフ・依存グラフの構築
- **スケジューリング**: トポロジカルソートによるタスク依存関係の解決

## 参考文献

- West, D. B. "Introduction to Graph Theory" (Prentice Hall)
- 茨木俊秀「グラフ理論入門」(オーム社)

<AffiliateBanner site="theory_navi" />
