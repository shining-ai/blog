import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 局所探索法 (Local Search)

## 局所探索法とは

局所探索法とは、

> 現在の解の「近傍」（小さな変更で到達できる解の集合）を調べ、より良い解があれば移動することを繰り返す最適化手法

です。
<br/>

厳密な最適解を保証しませんが、**実装がシンプルで大規模問題にも適用しやすい**ため、組合せ最適化の実用的な出発点となります。

## 局所探索の概念

```
解空間のイメージ:

    ↑ 目的関数値
    |     ★ グローバル最適
    |    /\
    |   /  \   局所的な山
    |  /    \/\
    | /      ★ ← ここに止まってしまう
    |/           （局所最適）
    ─────────────────→ 解空間
```

局所探索は**局所最適**に陥る可能性があります。これを克服するのが焼きなまし法・タブー探索などのメタヒューリスティクスです。

## 近傍の設計

近傍の設計がアルゴリズムの性能を大きく左右します。

```
TSP（巡回セールスマン）の近傍例:

現在の経路: 1→2→3→4→5→1

2-opt 近傍: 2つの辺を削除して繋ぎ直す
  元:   1→2→3→4→5→1
  2-opt: 1→2→4→3→5→1  （辺 2-3, 4-5 を削除して入れ替え）

3-opt 近傍: 3つの辺を削除して繋ぎ直す（より強力だが計算量大）
```

## 計算量

| 操作 | 計算量 |
| --- | --- |
| 1ステップ（2-opt） | O(n²)（全近傍を評価） |
| 収束までのステップ数 | 問題依存 |
| 最悪 | 指数的（局所最適多数の場合） |

## 実装

```python title="局所探索の汎用フレームワーク"
import random
from typing import Callable, TypeVar

T = TypeVar('T')

def local_search(
    initial_solution: T,
    get_neighbors: Callable[[T], list[T]],
    evaluate: Callable[[T], float],
    maximize: bool = True,
) -> tuple[T, float]:
    """
    汎用局所探索法
    get_neighbors: 近傍解のリストを返す関数
    evaluate: 評価値（大きいほど良い場合 maximize=True）
    """
    current      = initial_solution
    current_val  = evaluate(current)
    sign         = 1 if maximize else -1

    while True:
        neighbors = get_neighbors(current)
        best_neighbor     = None
        best_neighbor_val = current_val

        for nb in neighbors:
            val = evaluate(nb)
            if sign * val > sign * best_neighbor_val:
                best_neighbor     = nb
                best_neighbor_val = val

        if best_neighbor is None:
            break  # 局所最適に到達
        current     = best_neighbor
        current_val = best_neighbor_val

    return current, current_val
```

```python title="TSP の 2-opt 局所探索"
import math

def tsp_distance(route: list[int], dist_matrix: list[list[float]]) -> float:
    n   = len(route)
    return sum(dist_matrix[route[i]][route[(i+1) % n]] for i in range(n))

def two_opt_neighbors(route: list[int]) -> list[list[int]]:
    """2-opt 近傍全て（O(n²) 個）"""
    n  = len(route)
    nb = []
    for i in range(n - 1):
        for j in range(i + 2, n):
            new_route = route[:i+1] + route[i+1:j+1][::-1] + route[j+1:]
            nb.append(new_route)
    return nb

def tsp_local_search(cities: list[tuple[float, float]]) -> tuple[list[int], float]:
    n    = len(cities)
    dist = [[math.hypot(cities[i][0]-cities[j][0], cities[i][1]-cities[j][1])
             for j in range(n)] for i in range(n)]

    # 初期解：貪欲法（最近傍）
    visited = [False] * n
    route   = [0]; visited[0] = True
    for _ in range(n - 1):
        last = route[-1]
        nxt  = min((j for j in range(n) if not visited[j]),
                   key=lambda j: dist[last][j])
        route.append(nxt); visited[nxt] = True

    # 2-opt 局所探索
    improved = True
    while improved:
        improved = False
        for i in range(n - 1):
            for j in range(i + 2, n):
                d_old = dist[route[i]][route[i+1]] + dist[route[j]][route[(j+1)%n]]
                d_new = dist[route[i]][route[j]]   + dist[route[i+1]][route[(j+1)%n]]
                if d_new < d_old - 1e-10:
                    route[i+1:j+1] = route[i+1:j+1][::-1]
                    improved = True

    return route, tsp_distance(route, dist)
```

```python title="使用例"
import random
random.seed(42)
cities = [(random.uniform(0, 100), random.uniform(0, 100)) for _ in range(20)]
route, dist = tsp_local_search(cities)
print(f"2-opt 後の経路長: {dist:.2f}")
```

## タブー探索（局所最適を回避）

```python title="タブー探索（概念）"
from collections import deque

def tabu_search(initial, get_neighbors, evaluate, tabu_tenure=10, max_iter=1000):
    """タブーリストで過去の解を一定期間禁止し局所最適を回避"""
    current     = initial
    best        = initial
    best_val    = evaluate(initial)
    tabu_list   = deque(maxlen=tabu_tenure)

    for _ in range(max_iter):
        neighbors = [(nb, evaluate(nb)) for nb in get_neighbors(current)
                     if nb not in tabu_list]
        if not neighbors:
            break
        best_nb, best_nb_val = max(neighbors, key=lambda x: x[1])
        tabu_list.append(current)
        current = best_nb
        if best_nb_val > best_val:
            best, best_val = best_nb, best_nb_val

    return best, best_val
```

## 使用場面

- **TSP・配送計画**: 2-opt / 3-opt による経路改善
- **クラスタリング**: k-means は局所探索の一種
- **VLSI 配置**: 回路素子のフロアプランニング
- **メタヒューリスティクスの基盤**: 焼きなまし法・遺伝的アルゴリズムと組合せ

## 参考文献

<AffiliateBanner site="antbook" />
