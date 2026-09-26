import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 動的計画法（強化学習）

## 動的計画法とは

> 動的計画法（Dynamic Programming, DP）とは、環境のモデル（遷移確率・報酬関数）が既知であるという仮定のもと、ベルマン方程式を反復的に解くことで最適方策を求める手法群である。モデルベース強化学習の代表的アルゴリズムを含む。

DPにはおもに「価値反復法」と「方策反復法」の2つがあり、どちらも有限MDPにおいて最適解に収束することが保証されている。

## 主要アルゴリズムの比較

| アルゴリズム | 更新対象 | 収束性 | 計算量（1反復） |
|------------|---------|--------|--------------|
| 価値反復法 | V(s) のみ | 最適 V* へ収束 | $O(\|\mathcal{S}\|^2 \|\mathcal{A}\|)$ |
| 方策反復法 | π + V の交互更新 | 有限回で収束 | $O(\|\mathcal{S}\|^3 + \|\mathcal{S}\|^2\|\mathcal{A}\|)$ |
| 修正方策反復法 | π + 部分評価 V | 有限回で収束 | 中間的 |

## 価値反復法（Value Iteration）

最適ベルマン方程式を直接使って価値関数を更新する：

$$V_{k+1}(s) \leftarrow \max_a \sum_{s'} P(s'|s,a)\left[R(s,a,s') + \gamma V_k(s')\right]$$

収束後、$\pi^*(s) = \arg\max_a Q^*(s,a)$ で最適方策を取得する。

## 方策反復法（Policy Iteration）

**方策評価** と **方策改善** を交互に繰り返す：

1. 方策評価：$V^\pi$ を収束まで計算
2. 方策改善：$\pi'(s) = \arg\max_a \sum_{s'} P(s'|s,a)[R + \gamma V^\pi(s')]$
3. $\pi' = \pi$ になったら終了（最適方策）

## Python実装（GridWorld）

```python
import numpy as np
import matplotlib.pyplot as plt
from typing import Dict, Tuple, List

class GridWorld:
    """4x4 GridWorld 環境"""

    def __init__(self, size: int = 4, gamma: float = 0.9):
        self.size = size
        self.gamma = gamma
        self.n_states = size * size
        self.actions = [0, 1, 2, 3]  # 上, 下, 左, 右
        self.action_names = ["上", "下", "左", "右"]
        self.action_delta = [(-1, 0), (1, 0), (0, -1), (0, 1)]

        # 終端状態: 左上(0)と右下(15)
        self.terminal_states = {0, self.n_states - 1}

    def _pos_to_state(self, row: int, col: int) -> int:
        return row * self.size + col

    def _state_to_pos(self, s: int) -> Tuple[int, int]:
        return s // self.size, s % self.size

    def get_transitions(self, s: int, a: int) -> List[Tuple[float, int, float]]:
        """(確率, 次状態, 報酬) のリストを返す"""
        if s in self.terminal_states:
            return [(1.0, s, 0.0)]

        row, col = self._state_to_pos(s)
        dr, dc = self.action_delta[a]
        new_row = max(0, min(self.size - 1, row + dr))
        new_col = max(0, min(self.size - 1, col + dc))
        s_next = self._pos_to_state(new_row, new_col)
        reward = -1.0  # 各ステップのコスト
        return [(1.0, s_next, reward)]

    def value_iteration(self, theta: float = 1e-6) -> Tuple[np.ndarray, np.ndarray]:
        """価値反復法"""
        V = np.zeros(self.n_states)
        iteration = 0

        while True:
            delta = 0.0
            V_new = V.copy()

            for s in range(self.n_states):
                if s in self.terminal_states:
                    continue
                action_values = []
                for a in self.actions:
                    q = sum(
                        p * (r + self.gamma * V[s_next])
                        for p, s_next, r in self.get_transitions(s, a)
                    )
                    action_values.append(q)
                V_new[s] = max(action_values)
                delta = max(delta, abs(V_new[s] - V[s]))

            V = V_new
            iteration += 1
            if delta < theta:
                break

        print(f"価値反復法: {iteration} 回で収束")

        # 最適方策の抽出
        policy = np.zeros(self.n_states, dtype=int)
        for s in range(self.n_states):
            if s in self.terminal_states:
                continue
            action_values = [
                sum(p * (r + self.gamma * V[s_next])
                    for p, s_next, r in self.get_transitions(s, a))
                for a in self.actions
            ]
            policy[s] = np.argmax(action_values)

        return V, policy

    def policy_evaluation(
        self, policy: np.ndarray, theta: float = 1e-6
    ) -> np.ndarray:
        """方策評価"""
        V = np.zeros(self.n_states)
        while True:
            delta = 0.0
            for s in range(self.n_states):
                if s in self.terminal_states:
                    continue
                a = policy[s]
                v_new = sum(
                    p * (r + self.gamma * V[s_next])
                    for p, s_next, r in self.get_transitions(s, a)
                )
                delta = max(delta, abs(v_new - V[s]))
                V[s] = v_new
            if delta < theta:
                break
        return V

    def policy_improvement(self, V: np.ndarray) -> np.ndarray:
        """方策改善"""
        policy = np.zeros(self.n_states, dtype=int)
        for s in range(self.n_states):
            if s in self.terminal_states:
                continue
            action_values = [
                sum(p * (r + self.gamma * V[s_next])
                    for p, s_next, r in self.get_transitions(s, a))
                for a in self.actions
            ]
            policy[s] = np.argmax(action_values)
        return policy

    def policy_iteration(self) -> Tuple[np.ndarray, np.ndarray]:
        """方策反復法"""
        policy = np.zeros(self.n_states, dtype=int)  # 初期方策: すべて「上」
        iteration = 0

        while True:
            V = self.policy_evaluation(policy)
            new_policy = self.policy_improvement(V)
            iteration += 1

            if np.array_equal(new_policy, policy):
                break
            policy = new_policy

        print(f"方策反復法: {iteration} 回で収束")
        return V, policy

    def print_value_grid(self, V: np.ndarray, title: str = "価値関数"):
        """価値関数をグリッド表示"""
        print(f"\n{title}:")
        grid = V.reshape(self.size, self.size)
        for row in grid:
            print("  " + " ".join(f"{v:6.2f}" for v in row))

    def print_policy_grid(self, policy: np.ndarray, title: str = "方策"):
        """方策をグリッド表示"""
        symbols = ["↑", "↓", "←", "→"]
        print(f"\n{title}:")
        grid = policy.reshape(self.size, self.size)
        for r, row in enumerate(grid):
            line = "  "
            for c, a in enumerate(row):
                s = r * self.size + c
                if s in self.env_terminal_states:
                    line += "  G "
                else:
                    line += f"  {symbols[a]} "
            print(line)


# 実行
env = GridWorld(size=4, gamma=0.9)
env.env_terminal_states = env.terminal_states  # 表示用

print("=== 価値反復法 ===")
V_vi, policy_vi = env.value_iteration()
env.print_value_grid(V_vi, "価値関数（価値反復法）")
env.print_policy_grid(policy_vi, "最適方策（価値反復法）")

print("\n=== 方策反復法 ===")
V_pi, policy_pi = env.policy_iteration()
env.print_value_grid(V_pi, "価値関数（方策反復法）")
env.print_policy_grid(policy_pi, "最適方策（方策反復法）")

# 2つの方法の一致確認
print("\n価値関数の最大差:", np.max(np.abs(V_vi - V_pi)))
print("方策の一致:", np.array_equal(policy_vi, policy_pi))
```

## 使用場面

- 環境モデルが完全に既知な場合の最適制御
- ゲーム（チェス・将棋など）の完全情報問題
- 在庫管理・生産計画などの運用研究
- 他の強化学習アルゴリズム（Q学習など）の理論的基盤
- 方策評価を正確に行いたい場合のベースライン

## 参考文献

- Sutton, R. S., & Barto, A. G. (2018). *Reinforcement Learning: An Introduction* (2nd ed.)
- Bertsekas, D. P. (2012). *Dynamic Programming and Optimal Control* (4th ed.)
- Howard, R. A. (1960). *Dynamic Programming and Markov Processes*. MIT Press.

<AffiliateBanner site="ml_intro" />
