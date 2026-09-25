import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 整数計画法 (Integer Programming)

## 整数計画法とは

整数計画法（IP）とは、

> 変数の一部または全部が整数値をとる線形計画問題。0-1 変数による「やる / やらない」の二値決定も扱える

です。
<br/>

LP を整数に限定するだけで問題は NP 困難になりますが、分枝限定法・カット平面法により実用的に解けます。

## LP と IP の違い

```
同じ問題を LP と IP で解く例:

最大化: z = x + y
制約:   2x + 5y ≤ 16
        x, y ≥ 0

LP 解: x=8, y=0  → z=8（実数）
       または x=0, y=3.2 → z=3.2

y を整数に制限（IP）:
  y=3: 2x ≤ 1 → x=0.5 → z=3.5
  y=2: 2x ≤ 6 → x=3   → z=5 ← 最適整数解

LP 緩和の最適値 ≥ IP の最適値（LP は IP の上界）
```

## 0-1 整数計画（Binary IP）

変数が 0 か 1 の場合は「やる/やらない」の選択を表します。

```
ナップサック問題:
  アイテム: (重さ, 価値) = (2,3), (3,4), (4,5), (5,6)
  容量: 8

  最大化: 3x₁ + 4x₂ + 5x₃ + 6x₄
  制約:   2x₁ + 3x₂ + 4x₃ + 5x₄ ≤ 8
          xᵢ ∈ {0, 1}
```

## 計算量

| 手法 | 計算量 | 特徴 |
| --- | --- | --- |
| 総当たり（0-1 IP） | O(2ⁿ) | 確実だが変数数が多いと現実的でない |
| 分枝限定法（B&B） | 最悪 O(2ⁿ) | LP 緩和で枝刈り。実用上高速 |
| カット平面法 | — | 整数制約を徐々に追加 |
| B&B + カット（B&C） | — | 商用ソルバーの標準手法 |

## 実装

```python title="PuLP を使った整数計画法"
from pulp import *

# ナップサック問題
items   = ["A", "B", "C", "D"]
weights = {"A": 2, "B": 3, "C": 4, "D": 5}
values  = {"A": 3, "B": 4, "C": 5, "D": 6}
capacity = 8

prob = LpProblem("ナップサック", LpMaximize)

# 0-1 変数
x = {i: LpVariable(f"x_{i}", cat="Binary") for i in items}

# 目的関数
prob += lpSum(values[i] * x[i] for i in items)

# 制約
prob += lpSum(weights[i] * x[i] for i in items) <= capacity

prob.solve(PULP_CBC_CMD(msg=0))
print(f"最大価値: {value(prob.objective):.0f}")
for i in items:
    print(f"  {i}: {'選ぶ' if value(x[i]) > 0.5 else '選ばない'}")
# 最大価値: 10 → B(4) + D(6)
```

```python title="分枝限定法の概念（簡略実装）"
def branch_and_bound_knapsack(weights, values, capacity):
    """0-1 ナップサック問題の分枝限定法"""
    n    = len(weights)
    best = [0]

    def ub(idx, remaining, cur_val):
        """LP 緩和による上界"""
        val = cur_val
        for i in range(idx, n):
            if weights[i] <= remaining:
                remaining -= weights[i]
                val       += values[i]
            else:
                val += values[i] * remaining / weights[i]
                break
        return val

    def bb(idx, remaining, cur_val):
        if idx == n or remaining == 0:
            best[0] = max(best[0], cur_val)
            return
        if ub(idx, remaining, cur_val) <= best[0]:
            return  # 枝刈り
        # 選ぶ
        if weights[idx] <= remaining:
            bb(idx + 1, remaining - weights[idx], cur_val + values[idx])
        # 選ばない
        bb(idx + 1, remaining, cur_val)

    # 価値密度でソート（上界計算のため）
    order  = sorted(range(n), key=lambda i: values[i] / weights[i], reverse=True)
    weights = [weights[i] for i in order]
    values  = [values[i] for i in order]
    bb(0, capacity, 0)
    return best[0]

ws = [2, 3, 4, 5]
vs = [3, 4, 5, 6]
print(branch_and_bound_knapsack(ws, vs, 8))  # 10
```

```python title="スケジューリング問題（0-1 IP の応用）"
from pulp import *

# シフトスケジューリング: 従業員をシフトに割り当て
employees = ["Alice", "Bob", "Carol"]
shifts    = ["朝", "昼", "夜"]
# 各従業員がシフトをこなせるか
availability = {
    ("Alice", "朝"): 1, ("Alice", "昼"): 1, ("Alice", "夜"): 0,
    ("Bob",   "朝"): 0, ("Bob",   "昼"): 1, ("Bob",   "夜"): 1,
    ("Carol", "朝"): 1, ("Carol", "昼"): 0, ("Carol", "夜"): 1,
}

prob = LpProblem("シフトスケジューリング", LpMinimize)
x    = {(e, s): LpVariable(f"x_{e}_{s}", cat="Binary")
        for e in employees for s in shifts}

prob += lpSum(x[e, s] for e in employees for s in shifts)  # 最小人数

# 各シフトに1人以上
for s in shifts:
    prob += lpSum(x[e, s] for e in employees) >= 1
# 各従業員は可能なシフトのみ
for e in employees:
    for s in shifts:
        prob += x[e, s] <= availability.get((e, s), 0)

prob.solve(PULP_CBC_CMD(msg=0))
for e in employees:
    for s in shifts:
        if value(x[e, s]) > 0.5:
            print(f"{e} → {s}シフト")
```

## 使用場面

- **ナップサック問題**: 荷物の積載・投資先選択
- **集合被覆問題**: 最小施設配置・スケジューリング
- **巡回セールスマン問題（TSP）**: IP として定式化可能（Dantzig-Fulkerson-Johnson）
- **ジョブショップスケジューリング**: 製造ラインの工程最適化

## 参考文献

<AffiliateBanner site="antbook" />
