import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Dinic法

## Dinic法とは

Dinic法とは、

> BFSでレベルグラフを構築し、DFSでブロッキングフローを見つけることを繰り返す最大フローアルゴリズム

です。
<br/>

Ford-Fulkersonの O(E × max_flow) に対し、Dinic法は **O(V² E)**、二部グラフ上では **O(E√V)** で動作します。実用上は非常に高速で、競技プログラミングの標準実装です。

## 動作の概要

```
ネットワーク（容量）:
  s→a:3, s→b:3, a→t:3, b→t:3, a→b:1

フェーズ1:
  BFS でレベルグラフ構築: s(0)→a(1)→t(2), s(0)→b(1)→t(2)
  DFS でブロッキングフロー: s→a→t(3), s→b→t(3) → flow=6

フェーズ2:
  BFS でレベルグラフ構築: s→a→b→t (長さ3の増加路)
  DFS でブロッキングフロー: s→a→b→t(1) → flow=7 → 終了

最大フロー = 7 （スループット制約により a→b の余剰1を活用）
```

## 計算量

| | 計算量 |
| --- | --- |
| 一般グラフ | O(V² E) |
| 二部グラフ | O(E√V) |
| 単位容量グラフ | O(E√V) |

## 実装

```python title="Dinic法（効率的な実装）"
from collections import deque

class Dinic:
    def __init__(self, n: int):
        self.n     = n
        self.graph = [[] for _ in range(n)]
        # graph[v] の各要素: [to, rev_idx, cap]

    def add_edge(self, u: int, v: int, cap: int):
        """有向辺 u→v（容量cap）を追加"""
        self.graph[u].append([v, len(self.graph[v]),     cap])
        self.graph[v].append([u, len(self.graph[u]) - 1, 0  ])  # 逆辺

    def _bfs(self, s: int, t: int) -> bool:
        """BFSでレベルグラフを構築。t に到達できれば True"""
        self.level = [-1] * self.n
        self.level[s] = 0
        queue = deque([s])
        while queue:
            v = queue.popleft()
            for to, _, cap in self.graph[v]:
                if cap > 0 and self.level[to] < 0:
                    self.level[to] = self.level[v] + 1
                    queue.append(to)
        return self.level[t] >= 0

    def _dfs(self, v: int, t: int, f: int) -> int:
        if v == t:
            return f
        while self.iter[v] < len(self.graph[v]):
            to, rev, cap = self.graph[v][self.iter[v]]
            if cap > 0 and self.level[v] < self.level[to]:
                d = self._dfs(to, t, min(f, cap))
                if d > 0:
                    self.graph[v][self.iter[v]][2] -= d
                    self.graph[to][rev][2] += d
                    return d
            self.iter[v] += 1
        return 0

    def max_flow(self, s: int, t: int) -> int:
        flow = 0
        while self._bfs(s, t):
            self.iter = [0] * self.n
            while True:
                f = self._dfs(s, t, float('inf'))
                if f == 0:
                    break
                flow += f
        return flow
```

```python title="使用例"
dinic = Dinic(6)  # 頂点0=s, 5=t
dinic.add_edge(0, 1, 10)
dinic.add_edge(0, 2, 10)
dinic.add_edge(1, 3, 10)
dinic.add_edge(2, 4, 10)
dinic.add_edge(3, 5, 10)
dinic.add_edge(4, 5, 10)
dinic.add_edge(3, 4, 2)
print(dinic.max_flow(0, 5))  # 20
```

## Ford-FulkersonとDinicの比較

| | Ford-Fulkerson | Dinic |
| --- | --- | --- |
| 計算量 | O(E × max_flow) | O(V² E) |
| 二部グラフ | O(VE) | O(E√V) |
| 実装複雑度 | 簡単 | やや複雑 |
| 実用速度 | 遅い（大きな容量で問題） | 非常に速い |

## 使用場面

- **競技プログラミング**: 最大フロー問題の標準実装
- **二部マッチング**: O(E√V) で高速マッチング
- **プロジェクト選択問題**: 利益最大化（最小カット問題として定式化）
- **画像セグメンテーション**: グラフカットによる物体抽出

## 参考文献

<AffiliateBanner site="antbook" />
