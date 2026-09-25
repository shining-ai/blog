import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 最小共通祖先 (LCA)

## LCAとは

LCA（Lowest Common Ancestor）とは、

> 根付き木において、2頂点 u, v の共通の祖先のうち最も深いもの（= 最小共通祖先）を求めるアルゴリズム

です。
<br/>

ダブリング（Binary Lifting）を使うと、前処理 O(n log n)・クエリ O(log n) で効率よく求められます。

## 動作の概要

```
根付き木（根=1）:
        1
       / \
      2   3
     / \   \
    4   5   6
           /
          7

LCA(4, 5) = 2  （4と5の共通の祖先で最も深い）
LCA(4, 6) = 1  （4と6の共通の祖先で最も深い）
LCA(5, 7) = 1
LCA(6, 7) = 3
```

ダブリング法の前処理: `anc[v][k]` = 頂点vの 2^k 個上の祖先

## 計算量

| | 計算量 |
| --- | --- |
| 前処理 | O(n log n) |
| クエリ | O(log n) |
| 空間 | O(n log n) |

## 実装

```python title="LCA（ダブリング法）"
import math
from collections import deque

class LCA:
    def __init__(self, n: int, tree: list[list[int]], root: int = 0):
        """
        n 頂点（0-indexed）の根付き木を初期化
        tree[v] = [隣接頂点, ...]（無向木）
        """
        self.n     = n
        self.LOG   = max(1, math.ceil(math.log2(n + 1)))
        self.depth = [0] * n
        # anc[v][k] = v の 2^k 個上の祖先（存在しない場合は根）
        self.anc   = [[root] * n for _ in range(self.LOG)]

        # BFSで深さと直接の親を設定
        parent = [-1] * n
        queue  = deque([root])
        visited = [False] * n
        visited[root] = True

        while queue:
            v = queue.popleft()
            for nv in tree[v]:
                if not visited[nv]:
                    visited[nv]    = True
                    parent[nv]     = v
                    self.depth[nv] = self.depth[v] + 1
                    self.anc[0][nv] = v
                    queue.append(nv)

        # ダブリングテーブルを構築
        for k in range(1, self.LOG):
            for v in range(n):
                self.anc[k][v] = self.anc[k-1][self.anc[k-1][v]]

    def query(self, u: int, v: int) -> int:
        """u と v の LCA を返す"""
        # u を深い方に統一
        if self.depth[u] < self.depth[v]:
            u, v = v, u

        # 深さを揃える
        diff = self.depth[u] - self.depth[v]
        for k in range(self.LOG):
            if (diff >> k) & 1:
                u = self.anc[k][u]

        if u == v:
            return u

        # 同時に遡って LCA を見つける
        for k in range(self.LOG - 1, -1, -1):
            if self.anc[k][u] != self.anc[k][v]:
                u = self.anc[k][u]
                v = self.anc[k][v]

        return self.anc[0][u]
```

```python title="使用例"
# 頂点0-6（0が根）の木
# 0-1, 0-2, 1-3, 1-4, 2-5, 5-6
n = 7
tree = [[] for _ in range(n)]
for u, v in [(0,1),(0,2),(1,3),(1,4),(2,5),(5,6)]:
    tree[u].append(v)
    tree[v].append(u)

lca = LCA(n, tree, root=0)
print(lca.query(3, 4))  # 1
print(lca.query(3, 5))  # 0
print(lca.query(5, 6))  # 5
print(lca.query(4, 6))  # 0
```

```python title="2頂点間の距離"
def dist(lca_obj: LCA, u: int, v: int) -> int:
    """木上のu-v間の辺数"""
    l = lca_obj.query(u, v)
    return lca_obj.depth[u] + lca_obj.depth[v] - 2 * lca_obj.depth[l]
```

## 使用場面

- **木上のパスクエリ**: 2点間の距離・パス上の最大値（Heavy-Light Decompositionと組合せ）
- **系統樹の比較**: バイオインフォマティクスでの共通祖先の特定
- **競技プログラミング**: 木の問題全般でLCAは基本ツール

## 参考文献

<AffiliateBanner site="antbook" />
