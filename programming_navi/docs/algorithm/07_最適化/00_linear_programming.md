import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 線形計画法 (Linear Programming)

## 線形計画法とは

線形計画法とは、

> 変数が線形な目的関数を、線形な制約条件のもとで最大化・最小化する最適化手法

です。
<br/>

製造計画・輸送問題・資源配分など、現実の多くの最適化問題を定式化できます。シンプレックス法により効率よく解けます。

## 標準形

```
最大化: z = c₁x₁ + c₂x₂ + ... + cₙxₙ

制約:   a₁₁x₁ + a₁₂x₂ + ... + a₁ₙxₙ ≤ b₁
        a₂₁x₁ + a₂₂x₂ + ... + a₂ₙxₙ ≤ b₂
        ...
        xᵢ ≥ 0  （非負制約）
```

## 具体例：製品生産計画

```
製品A・製品B を生産する工場:
  製品A: 機械1を2時間・機械2を1時間使用・利益3万円
  製品B: 機械1を1時間・機械2を3時間使用・利益4万円
  機械1の利用可能時間: 8時間以内
  機械2の利用可能時間: 9時間以内

最大化: z = 3x + 4y
制約:   2x + y ≤ 8
        x + 3y ≤ 9
        x, y ≥ 0

実行可能領域の頂点を調べると:
  (0,3): z = 12
  (3,2): z = 17 ← 最適解
  (4,0): z = 12
```

最適解は必ず実行可能領域の**頂点**（vertex）に存在します。

## 計算量

| アルゴリズム | 計算量 | 特徴 |
| --- | --- | --- |
| シンプレックス法 | 最悪 O(2ⁿ)・実用上高速 | 頂点を辿る。実際は多項式的 |
| 内点法 | O(n³·⁵) | 多項式時間保証 |
| 楕円体法 | O(n⁶) | 理論的に多項式 |

## 実装

```python title="scipy を使った線形計画法"
from scipy.optimize import linprog

# 最大化 z = 3x + 4y を最小化 -z に変換
c = [-3, -4]

# 不等式制約 (Ax ≤ b)
A_ub = [[2, 1], [1, 3]]
b_ub = [8, 9]

# 変数の下界（デフォルトは 0）
x_bounds = [(0, None), (0, None)]

result = linprog(c, A_ub=A_ub, b_ub=b_ub, bounds=x_bounds, method='highs')
print(f"最適解: x={result.x[0]:.2f}, y={result.x[1]:.2f}")  # 3.00, 2.00
print(f"最大利益: {-result.fun:.2f} 万円")                   # 17.00
```

```python title="PuLP を使った定式化（より直感的）"
from pulp import *

prob = LpProblem("製品生産計画", LpMaximize)

x = LpVariable("製品A", lowBound=0)
y = LpVariable("製品B", lowBound=0)

# 目的関数
prob += 3 * x + 4 * y, "利益"

# 制約条件
prob += 2 * x + y <= 8, "機械1"
prob += x + 3 * y <= 9, "機械2"

status = prob.solve(PULP_CBC_CMD(msg=0))
print(f"状態: {LpStatus[status]}")
print(f"製品A: {value(x):.0f} 個")   # 3
print(f"製品B: {value(y):.0f} 個")   # 2
print(f"利益: {value(prob.objective):.0f} 万円")  # 17
```

```python title="輸送問題（LP の典型例）"
from scipy.optimize import linprog
import numpy as np

# 工場 i から倉庫 j への輸送コスト行列
cost = np.array([
    [2, 3, 1],
    [5, 4, 8],
    [5, 6, 8],
])
supply = [120, 80, 80]     # 各工場の供給量
demand = [150, 70, 60]     # 各倉庫の需要量

# 変数を1次元に並べる: x[i*3+j] = 工場i→倉庫j の輸送量
n_s, n_d = len(supply), len(demand)
c_flat = cost.flatten()

# 供給制約: 各工場から出る量 ≤ supply[i]
A_ub = []
b_ub = []
for i in range(n_s):
    row = [0] * (n_s * n_d)
    for j in range(n_d):
        row[i * n_d + j] = 1
    A_ub.append(row); b_ub.append(supply[i])

# 需要制約: 各倉庫に入る量 ≥ demand[j] → -x ≤ -demand[j]
for j in range(n_d):
    row = [0] * (n_s * n_d)
    for i in range(n_s):
        row[i * n_d + j] = -1
    A_ub.append(row); b_ub.append(-demand[j])

res = linprog(c_flat, A_ub=A_ub, b_ub=b_ub,
              bounds=[(0, None)] * (n_s * n_d))
print(f"最小輸送コスト: {res.fun:.0f}")
```

## 使用場面

- **サプライチェーン最適化**: 輸送コスト最小化・在庫管理
- **金融ポートフォリオ**: リターン最大化・リスク制約付き資産配分
- **スケジューリング**: シフト・生産ラインの最適割り当て
- **ゲーム理論**: ゼロ和ゲームの混合戦略（LP と等価）

## 参考文献

<AffiliateBanner site="antbook" />
