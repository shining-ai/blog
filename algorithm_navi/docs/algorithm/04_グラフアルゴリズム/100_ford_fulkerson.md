import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Ford-Fulkerson法

## Ford-Fulkerson法とは

Ford-Fulkerson法とは、

> 増加路（ソースからシンクへの残余容量が正のパス）を繰り返し見つけて流量を増やし、最大フローを求めるアルゴリズム

です。
<br/>

残余グラフ上でDFS/BFSにより増加路を探し、その最小容量だけフローを増加させます。最大流最小カット定理により、最大フロー = 最小カットが保証されます。

## 動作の概要

```
ネットワーク（容量）:
  s→a:10, s→b:10, a→t:10, b→t:10, a→b:1

残余グラフを使って増加路を探索:
  STEP 1: s→a→t (流量10) → flow=10
  STEP 2: s→b→t (流量10) → flow=20
  増加路なし → 最大フロー=20
```

逆辺（キャンセル可能な流れ）を残余グラフに持つことで、誤った経路選択を後から修正できます。

## 計算量

| | 計算量 |
| --- | --- |
| 時間 | O(E × max_flow) |
| 空間 | O(V + E) |

整数容量ならば有限回で終了しますが、無理数容量では収束しないことがあります。

## 実装

```python title="Ford-Fulkerson法（DFSベース）"
from collections import defaultdict

class MaxFlow:
    def __init__(self, n: int):
        self.n     = n
        self.graph = defaultdict(dict)  # graph[u][v] = 残余容量

    def add_edge(self, u: int, v: int, cap: int):
        """有向辺 u→v（容量cap）を追加"""
        self.graph[u][v] = self.graph[u].get(v, 0) + cap
        if v not in self.graph[u] or u not in self.graph[v]:
            self.graph[v][u] = self.graph[v].get(u, 0)  # 逆辺（初期容量0）

    def _dfs(self, v: int, t: int, f: int, visited: set) -> int:
        if v == t:
            return f
        visited.add(v)
        for nv, cap in self.graph[v].items():
            if nv not in visited and cap > 0:
                d = self._dfs(nv, t, min(f, cap), visited)
                if d > 0:
                    self.graph[v][nv] -= d
                    self.graph[nv][v]  = self.graph[nv].get(v, 0) + d
                    return d
        return 0

    def max_flow(self, s: int, t: int) -> int:
        flow = 0
        while True:
            f = self._dfs(s, t, float('inf'), set())
            if f == 0:
                break
            flow += f
        return flow
```

```python title="使用例"
mf = MaxFlow(6)  # 頂点0=s, 5=t
mf.add_edge(0, 1, 10)
mf.add_edge(0, 2, 10)
mf.add_edge(1, 3, 10)
mf.add_edge(2, 4, 10)
mf.add_edge(3, 5, 10)
mf.add_edge(4, 5, 10)
mf.add_edge(1, 2, 1)   # ボトルネック
print(mf.max_flow(0, 5))  # 20
```

## 使用場面

- **物流・輸送**: 輸送ネットワークの最大輸送量
- **二部マッチング**: 最大フローとして解ける（ハンガリアン法の基礎）
- **画像セグメンテーション**: グラフカットによる領域分割
- **スポーツスケジュール**: チームの最大勝利可能数

## 参考文献

<AffiliateBanner site="antbook" />
