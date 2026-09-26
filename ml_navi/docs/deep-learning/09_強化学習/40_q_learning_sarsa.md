import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Q 学習と SARSA

## Q学習・SARSAとは

> Q学習（Q-Learning）と SARSA（State-Action-Reward-State-Action）は、行動価値関数 $Q(s,a)$ をモデルなしで学習する代表的なアルゴリズムである。Q学習は off-policy（最大価値行動で更新）、SARSA は on-policy（実際に選択した行動で更新）という点が根本的な違いである。

## Q学習 vs SARSA の比較

| 特性 | Q学習 | SARSA |
|------|-------|-------|
| 方策タイプ | Off-policy | On-policy |
| 更新式 | $\max_{a'} Q(s',a')$ を使用 | 実際の次行動 $a'$ を使用 |
| 探索方法 | ε-greedy（更新は greedy） | ε-greedy（更新も ε-greedy） |
| 収束先 | 最適方策 $Q^*$ | ε-greedy 方策の $Q^\pi$ |
| 安全性 | 崖歩き問題で危険な経路 | 崖歩き問題で安全な経路 |
| 適用場面 | 最終的に greedy 方策を使う場合 | 探索中の安全性が重要な場合 |

## 更新式

### Q学習

$$Q(S_t, A_t) \leftarrow Q(S_t, A_t) + \alpha \left[ R_{t+1} + \gamma \max_{a'} Q(S_{t+1}, a') - Q(S_t, A_t) \right]$$

TD ターゲット: $R_{t+1} + \gamma \max_{a'} Q(S_{t+1}, a')$（次状態での最大Q値を使用）

### SARSA

$$Q(S_t, A_t) \leftarrow Q(S_t, A_t) + \alpha \left[ R_{t+1} + \gamma Q(S_{t+1}, A_{t+1}) - Q(S_t, A_t) \right]$$

TD ターゲット: $R_{t+1} + \gamma Q(S_{t+1}, A_{t+1})$（実際に選択した次行動のQ値を使用）

## ε-greedy 探索

$$\pi(a|s) = \begin{cases} 1 - \varepsilon + \varepsilon/|\mathcal{A}| & (a = \arg\max_{a'} Q(s,a')) \\ \varepsilon/|\mathcal{A}| & (\text{otherwise}) \end{cases}$$

| パラメータ | 効果 |
|----------|------|
| ε = 0 | 完全貪欲（探索なし） |
| ε = 1 | 完全ランダム（搾取なし） |
| ε を徐々に減少 | 初期に探索、後期に収束 |

## Python実装（崖歩き問題）

```python
import numpy as np
import matplotlib.pyplot as plt
from typing import Tuple

class CliffWalkingEnv:
    """崖歩き環境（4x12 GridWorld）"""

    def __init__(self):
        self.rows, self.cols = 4, 12
        self.start = (3, 0)
        self.goal = (3, 11)
        # 崖: (3, 1) ~ (3, 10)
        self.cliff = {(3, c) for c in range(1, 11)}
        self.actions = [0, 1, 2, 3]  # 上, 下, 左, 右
        self.action_delta = [(-1, 0), (1, 0), (0, -1), (0, 1)]

    def reset(self) -> Tuple[int, int]:
        return self.start

    def step(self, state: Tuple[int, int], action: int):
        dr, dc = self.action_delta[action]
        r = max(0, min(self.rows - 1, state[0] + dr))
        c = max(0, min(self.cols - 1, state[1] + dc))
        next_state = (r, c)

        if next_state in self.cliff:
            return self.start, -100.0, False  # 崖: 大ペナルティでスタートへ
        elif next_state == self.goal:
            return next_state, -1.0, True     # ゴール
        else:
            return next_state, -1.0, False    # 通常移動

    def state_to_idx(self, state: Tuple[int, int]) -> int:
        return state[0] * self.cols + state[1]


class TabularAgent:
    """Q-table を使った tabular エージェント"""

    def __init__(
        self,
        n_states: int,
        n_actions: int,
        alpha: float = 0.5,
        gamma: float = 1.0,
        epsilon: float = 0.1,
    ):
        self.n_states = n_states
        self.n_actions = n_actions
        self.alpha = alpha
        self.gamma = gamma
        self.epsilon = epsilon
        self.Q = np.zeros((n_states, n_actions))

    def select_action(self, state_idx: int) -> int:
        """ε-greedy 行動選択"""
        if np.random.random() < self.epsilon:
            return np.random.randint(self.n_actions)
        return int(np.argmax(self.Q[state_idx]))

    def update_q_learning(
        self,
        s: int, a: int, r: float, s_next: int, done: bool
    ):
        """Q学習の更新"""
        target = r if done else r + self.gamma * np.max(self.Q[s_next])
        self.Q[s, a] += self.alpha * (target - self.Q[s, a])

    def update_sarsa(
        self,
        s: int, a: int, r: float, s_next: int, a_next: int, done: bool
    ):
        """SARSA の更新"""
        target = r if done else r + self.gamma * self.Q[s_next, a_next]
        self.Q[s, a] += self.alpha * (target - self.Q[s, a])


def run_q_learning(env: CliffWalkingEnv, n_episodes: int = 500) -> list:
    n_states = env.rows * env.cols
    agent = TabularAgent(n_states, len(env.actions))
    rewards_per_episode = []

    for ep in range(n_episodes):
        state = env.reset()
        total_reward = 0.0
        done = False

        while not done:
            s = env.state_to_idx(state)
            a = agent.select_action(s)
            next_state, reward, done = env.step(state, a)
            s_next = env.state_to_idx(next_state)
            agent.update_q_learning(s, a, reward, s_next, done)
            state = next_state
            total_reward += reward

        rewards_per_episode.append(total_reward)

    return rewards_per_episode, agent.Q


def run_sarsa(env: CliffWalkingEnv, n_episodes: int = 500) -> list:
    n_states = env.rows * env.cols
    agent = TabularAgent(n_states, len(env.actions))
    rewards_per_episode = []

    for ep in range(n_episodes):
        state = env.reset()
        s = env.state_to_idx(state)
        a = agent.select_action(s)
        total_reward = 0.0
        done = False

        while not done:
            next_state, reward, done = env.step(state, a)
            s_next = env.state_to_idx(next_state)
            a_next = agent.select_action(s_next)
            agent.update_sarsa(s, a, reward, s_next, a_next, done)
            state, s, a = next_state, s_next, a_next
            total_reward += reward

        rewards_per_episode.append(total_reward)

    return rewards_per_episode, agent.Q


# 実行
env = CliffWalkingEnv()
ql_rewards, ql_Q = run_q_learning(env, n_episodes=500)
sarsa_rewards, sarsa_Q = run_sarsa(env, n_episodes=500)

# 学習曲線の比較（移動平均）
def moving_average(data, window=20):
    return np.convolve(data, np.ones(window)/window, mode='valid')

print("Q学習  最後50エピソード平均報酬:",
      np.mean(ql_rewards[-50:]).round(2))
print("SARSA  最後50エピソード平均報酬:",
      np.mean(sarsa_rewards[-50:]).round(2))

# 最終方策の表示
action_symbols = ["↑", "↓", "←", "→"]
print("\nQ学習の最終方策:")
for r in range(env.rows):
    line = ""
    for c in range(env.cols):
        s = r * env.cols + c
        if (r, c) == env.goal:
            line += " G"
        elif (r, c) in env.cliff:
            line += " X"
        else:
            line += f" {action_symbols[np.argmax(ql_Q[s])]}"
    print(line)
```

## 使用場面

- **Q学習**: ゲームAI・最適制御・探索後に greedy 方策を使いたい場合
- **SARSA**: ロボット制御など安全性が重要な実タスク
- **Expected SARSA**: SARSA の期待値版、分散を低減した安定した学習
- **Q-table**: 状態・行動空間が小〜中規模の離散問題

## 参考文献

- Watkins, C. J. C. H., & Dayan, P. (1992). Q-learning. *Machine Learning*, 8, 279-292.
- Rummery, G. A., & Niranjan, M. (1994). On-line Q-learning using connectionist systems. Technical Report CUED/F-INFENG/TR 166, Cambridge University.
- Sutton, R. S., & Barto, A. G. (2018). *Reinforcement Learning: An Introduction* (2nd ed.)

<AffiliateBanner site="ml_intro" />
