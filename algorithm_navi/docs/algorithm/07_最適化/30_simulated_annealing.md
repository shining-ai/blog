import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 焼きなまし法 (Simulated Annealing)

## 焼きなまし法とは

焼きなまし法（Simulated Annealing）とは、

> 金属の焼きなまし（高温で加熱後ゆっくり冷却して結晶化させる）を模倣し、温度パラメータによって悪化する解への移動を確率的に許可することで局所最適から脱出する最適化手法

です。
<br/>

局所探索の弱点（局所最適への陥没）を「悪化を確率的に受け入れる」という操作で克服します。

## アルゴリズムの仕組み

```
現在の解 s から近傍解 s' を生成:

  Δ = f(s') - f(s)  （最小化の場合: Δ < 0 が改善）

  Δ < 0 → 必ず移動（改善）
  Δ ≥ 0 → 確率 exp(-Δ/T) で移動（悪化を受け入れる）

温度 T が高い: 悪化も受け入れやすい（広域探索）
温度 T が低い: ほとんど改善のみ受け入れる（局所精密化）

冷却スケジュール（温度の下げ方）:
  線形冷却:  T ← T - α
  幾何冷却:  T ← T × α  （α ≈ 0.99, 最も一般的）
  対数冷却:  T ← T₀ / log(t)  （理論的に最適解に収束）
```

## 計算量

| | 計算量 |
| --- | --- |
| 1ステップ | O(近傍評価のコスト) |
| 反復回数 | 問題依存（通常 10⁴〜10⁷ ステップ） |
| 最適収束 | 対数冷却なら理論上 → 最適解（実用的でない） |

## 実装

```python title="汎用焼きなまし法"
import math, random

def simulated_annealing(
    initial_solution,
    get_neighbor,
    evaluate,
    T_init: float = 100.0,
    T_min:  float = 0.01,
    alpha:  float = 0.995,
    maximize: bool = False,
) -> tuple:
    """
    汎用焼きなまし法
    get_neighbor: 解からランダムな近傍解を1つ返す関数
    evaluate: 評価値（maximize=False なら小さいほど良い）
    """
    current     = initial_solution
    current_val = evaluate(current)
    best        = current
    best_val    = current_val
    sign        = -1 if maximize else 1  # 最小化に統一
    T           = T_init

    while T > T_min:
        neighbor     = get_neighbor(current)
        neighbor_val = evaluate(neighbor)
        delta        = sign * (neighbor_val - current_val)

        if delta < 0 or random.random() < math.exp(-delta / T):
            current     = neighbor
            current_val = neighbor_val

        if sign * current_val < sign * best_val:
            best     = current
            best_val = current_val

        T *= alpha

    return best, best_val
```

```python title="TSP への適用"
import math, random, copy

def tsp_sa(cities: list[tuple[float, float]],
           T_init=1000.0, T_min=1.0, alpha=0.9995) -> tuple:
    n    = len(cities)
    dist = [[math.hypot(cities[i][0]-cities[j][0], cities[i][1]-cities[j][1])
             for j in range(n)] for i in range(n)]

    def total_dist(route):
        return sum(dist[route[i]][route[(i+1)%n]] for i in range(n))

    def get_neighbor(route):
        """2点をランダムに選んで経路の一部を反転（2-opt）"""
        r  = list(route)
        i, j = sorted(random.sample(range(n), 2))
        r[i:j+1] = r[i:j+1][::-1]
        return r

    route = list(range(n))
    random.shuffle(route)
    return simulated_annealing(route, get_neighbor, total_dist,
                               T_init=T_init, T_min=T_min, alpha=alpha)
```

```python title="使用例"
random.seed(42)
cities = [(random.uniform(0,100), random.uniform(0,100)) for _ in range(30)]
best_route, best_dist = tsp_sa(cities)
print(f"SA後の経路長: {best_dist:.2f}")
```

```python title="冷却スケジュールの比較"
import numpy as np

def cooling_schedules(T0=100, steps=1000):
    T_linear = [max(0, T0 - T0/steps * t) for t in range(steps)]
    T_geom   = [T0 * (0.995 ** t) for t in range(steps)]
    T_log    = [T0 / math.log(t + 2) for t in range(steps)]
    return T_linear, T_geom, T_log
```

## 受理確率のグラフ

```
温度 T と悪化量 Δ による受理確率 exp(-Δ/T):

Δ=1:  T=100 → 99.0%, T=10 → 90.5%, T=1 → 36.8%, T=0.1 → 0.005%
Δ=5:  T=100 → 95.1%, T=10 → 60.7%, T=1 → 0.7%,  T=0.1 → ~0%
Δ=10: T=100 → 90.5%, T=10 → 36.8%, T=1 → ~0%,   T=0.1 → ~0%
```

## 使用場面

- **TSP・VRP**: 配送経路の最適化
- **VLSI 配置**: チップ上の素子配置最適化
- **タンパク質折り畳み**: 分子の安定構造探索
- **競技プログラミング**: 制限時間内の良質解探索（T=初期値高め・α=0.99以上）

## 参考文献

<AffiliateBanner site="antbook" />
