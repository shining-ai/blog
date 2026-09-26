import AffiliateBanner from '@site/src/components/AffiliateBanner';

# マルコフ決定過程（MDP）

## マルコフ決定過程とは

> マルコフ決定過程（Markov Decision Process, MDP）とは、意思決定エージェントが環境と相互作用しながら累積報酬を最大化する問題を定式化する数学的フレームワークである。状態遷移がマルコフ性（現在の状態のみに依存する）を満たすことが前提となる。

MDP は強化学習の理論的基盤であり、$\mathcal{M} = (\mathcal{S}, \mathcal{A}, P, R, \gamma)$ という5つ組で定義される。

## MDPの構成要素

| 構成要素 | 記号 | 説明 |
|---------|------|------|
| 状態空間 | $\mathcal{S}$ | エージェントが取りうる状態の集合 |
| 行動空間 | $\mathcal{A}$ | エージェントが取りうる行動の集合 |
| 遷移確率 | $P(s'\|s,a)$ | 状態 $s$ で行動 $a$ をとったとき状態 $s'$ に遷移する確率 |
| 報酬関数 | $R(s, a, s')$ | 遷移時に得られる即時報酬 |
| 割引率 | $\gamma \in [0, 1)$ | 将来の報酬の現在価値への割引係数 |

## 価値関数とベルマン方程式

### 状態価値関数 V(s)

状態 $s$ から方策 $\pi$ に従って行動したときの期待累積報酬：

$$V^\pi(s) = \mathbb{E}_\pi\left[\sum_{t=0}^{\infty} \gamma^t R_{t+1} \mid S_0 = s\right]$$

### 行動価値関数 Q(s, a)

状態 $s$ で行動 $a$ を取り、その後方策 $\pi$ に従ったときの期待累積報酬：

$$Q^\pi(s, a) = \mathbb{E}_\pi\left[\sum_{t=0}^{\infty} \gamma^t R_{t+1} \mid S_0 = s, A_0 = a\right]$$

### ベルマン方程式

$$V^\pi(s) = \sum_a \pi(a|s) \sum_{s'} P(s'|s,a)\left[R(s,a,s') + \gamma V^\pi(s')\right]$$

$$Q^\pi(s,a) = \sum_{s'} P(s'|s,a)\left[R(s,a,s') + \gamma \sum_{a'} \pi(a'|s') Q^\pi(s',a')\right]$$

### 最適ベルマン方程式

$$V^*(s) = \max_a \sum_{s'} P(s'|s,a)\left[R(s,a,s') + \gamma V^*(s')\right]$$

$$Q^*(s,a) = \sum_{s'} P(s'|s,a)\left[R(s,a,s') + \gamma \max_{a'} Q^*(s',a')\right]$$

最適方策は $\pi^*(s) = \arg\max_a Q^*(s, a)$ で得られる。

## V と Q の関係

| 関係式 | 意味 |
|--------|------|
| $V^\pi(s) = \sum_a \pi(a\|s) Q^\pi(s,a)$ | V は Q の方策での期待値 |
| $Q^\pi(s,a) = R(s,a) + \gamma \sum_{s'} P(s'\|s,a) V^\pi(s')$ | Q から V への変換 |
| $V^*(s) = \max_a Q^*(s,a)$ | 最適 V は最適 Q の最大値 |

## Python実装

```python
import numpy as np
from typing import Dict, Tuple, List

class MDP:
    """マルコフ決定過程の実装"""

    def __init__(
        self,
        states: List[int],
        actions: List[int],
        transitions: Dict[Tuple, float],  # (s, a, s') -> probability
        rewards: Dict[Tuple, float],       # (s, a, s') -> reward
        gamma: float = 0.9
    ):
        self.states = states
        self.actions = actions
        self.transitions = transitions
        self.rewards = rewards
        self.gamma = gamma

    def get_transition_prob(self, s: int, a: int, s_next: int) -> float:
        return self.transitions.get((s, a, s_next), 0.0)

    def get_reward(self, s: int, a: int, s_next: int) -> float:
        return self.rewards.get((s, a, s_next), 0.0)

    def bellman_expectation(
        self, V: Dict[int, float], policy: Dict[int, Dict[int, float]]
    ) -> Dict[int, float]:
        """ベルマン期待方程式による価値関数の更新"""
        V_new = {}
        for s in self.states:
            v = 0.0
            for a in self.actions:
                pi_a = policy[s].get(a, 0.0)
                if pi_a == 0:
                    continue
                for s_next in self.states:
                    p = self.get_transition_prob(s, a, s_next)
                    r = self.get_reward(s, a, s_next)
                    v += pi_a * p * (r + self.gamma * V[s_next])
            V_new[s] = v
        return V_new

    def bellman_optimality(self, V: Dict[int, float]) -> Dict[int, float]:
        """ベルマン最適方程式による価値関数の更新"""
        V_new = {}
        for s in self.states:
            action_values = []
            for a in self.actions:
                q = 0.0
                for s_next in self.states:
                    p = self.get_transition_prob(s, a, s_next)
                    r = self.get_reward(s, a, s_next)
                    q += p * (r + self.gamma * V[s_next])
                action_values.append(q)
            V_new[s] = max(action_values) if action_values else 0.0
        return V_new


def compute_q_from_v(
    mdp: MDP, V: Dict[int, float]
) -> Dict[Tuple, float]:
    """V関数からQ関数を計算"""
    Q = {}
    for s in mdp.states:
        for a in mdp.actions:
            q = 0.0
            for s_next in mdp.states:
                p = mdp.get_transition_prob(s, a, s_next)
                r = mdp.get_reward(s, a, s_next)
                q += p * (r + mdp.gamma * V[s_next])
            Q[(s, a)] = q
    return Q


# 簡単な例: 2状態 MDP
# 状態: 0（非終端）, 1（終端）
# 行動: 0（左）, 1（右）
states = [0, 1]
actions = [0, 1]

transitions = {
    (0, 0, 0): 0.7,  # 状態0で左 -> 状態0（確率0.7）
    (0, 0, 1): 0.3,  # 状態0で左 -> 状態1（確率0.3）
    (0, 1, 0): 0.2,
    (0, 1, 1): 0.8,
    (1, 0, 1): 1.0,  # 終端状態からは遷移なし
    (1, 1, 1): 1.0,
}

rewards = {
    (0, 0, 0): -1.0,
    (0, 0, 1): 10.0,
    (0, 1, 0): -1.0,
    (0, 1, 1): 10.0,
    (1, 0, 1): 0.0,
    (1, 1, 1): 0.0,
}

mdp = MDP(states, actions, transitions, rewards, gamma=0.9)

# 均一方策（各行動を等確率で選択）
uniform_policy = {s: {a: 0.5 for a in actions} for s in states}

# 初期価値関数
V = {s: 0.0 for s in states}

# 反復によるベルマン期待方程式の計算
for i in range(100):
    V = mdp.bellman_expectation(V, uniform_policy)

print("均一方策での価値関数:")
for s in states:
    print(f"  V({s}) = {V[s]:.4f}")

# Q関数の計算
Q = compute_q_from_v(mdp, V)
print("\nQ関数:")
for (s, a), q in sorted(Q.items()):
    print(f"  Q({s}, {a}) = {q:.4f}")

# 最適方策の導出
optimal_policy = {}
for s in states:
    best_action = max(actions, key=lambda a: Q[(s, a)])
    optimal_policy[s] = best_action
print("\n最適方策:")
for s, a in optimal_policy.items():
    print(f"  π*({s}) = {a}")
```

## 使用場面

- ロボット制御・自律移動エージェントの行動計画
- ゲームAI（囲碁・将棋・ビデオゲーム）の戦略設計
- 資源配分・スケジューリング問題の最適化
- 医療における治療方針決定支援
- 金融ポートフォリオ最適化

## 参考文献

- Sutton, R. S., & Barto, A. G. (2018). *Reinforcement Learning: An Introduction* (2nd ed.)
- Bellman, R. (1957). *Dynamic Programming*. Princeton University Press.
- Puterman, M. L. (1994). *Markov Decision Processes*. Wiley.

<AffiliateBanner site="ml_intro" />
