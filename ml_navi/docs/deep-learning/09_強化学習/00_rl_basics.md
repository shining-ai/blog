import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 強化学習の基礎

## 強化学習とは

> 強化学習（Reinforcement Learning: RL）とは、エージェントが環境との相互作用を通じて試行錯誤しながら、累積報酬を最大化する行動方策を学習するフレームワークです。教師あり学習のような正解ラベルを必要とせず、行動の結果として得られる報酬信号のみから学習します。

---

## 強化学習の基本要素

```
エージェント ←── 状態 s_t ──── 環境
     │                           │
     └──── 行動 a_t ────────────→│
                                  │
     ←── 報酬 r_t, 次状態 s_{t+1} ┘
```

| 要素 | 記号 | 説明 | 例（ゲーム） |
|---|---|---|---|
| 環境 | E | エージェントが相互作用する世界 | ゲームエンジン |
| エージェント | π | 学習・行動する主体 | AIプレイヤー |
| 状態 | s | 現在の環境の観測値 | ゲーム画面 |
| 行動 | a | エージェントが取れる操作 | 上下左右・ジャンプ |
| 報酬 | r | 行動への即時フィードバック | スコア・ゲームオーバー |
| 方策 | π | 状態→行動のマッピング | 戦略 |
| 価値関数 | V, Q | 将来の累積報酬の期待値 | 局面評価 |

---

## シンプルな強化学習の実装

```python
import numpy as np
import random
from typing import List, Tuple, Optional

class Environment:
    """シンプルなグリッドワールド環境"""

    def __init__(self, size: int = 5):
        self.size = size
        self.reset()

    def reset(self) -> Tuple[int, int]:
        """環境をリセットして初期状態を返す"""
        self.agent_pos = (0, 0)
        self.goal_pos = (self.size - 1, self.size - 1)
        self.steps = 0
        return self.agent_pos

    def step(self, action: int) -> Tuple[Tuple[int, int], float, bool]:
        """
        行動を実行して次状態・報酬・終了フラグを返す
        action: 0=上, 1=下, 2=左, 3=右
        """
        self.steps += 1
        x, y = self.agent_pos

        # 行動に応じて移動
        if action == 0:    # 上
            x = max(0, x - 1)
        elif action == 1:  # 下
            x = min(self.size - 1, x + 1)
        elif action == 2:  # 左
            y = max(0, y - 1)
        elif action == 3:  # 右
            y = min(self.size - 1, y + 1)

        self.agent_pos = (x, y)

        # 報酬の計算
        if self.agent_pos == self.goal_pos:
            reward = 10.0    # ゴール到達
            done = True
        elif self.steps >= 100:
            reward = -1.0   # タイムアウト
            done = True
        else:
            reward = -0.1   # 各ステップのペナルティ（効率的な経路を促す）
            done = False

        return self.agent_pos, reward, done

    def render(self):
        """環境を表示"""
        for i in range(self.size):
            row = ""
            for j in range(self.size):
                if (i, j) == self.agent_pos:
                    row += "A "
                elif (i, j) == self.goal_pos:
                    row += "G "
                else:
                    row += ". "
            print(row)
        print()


class RandomAgent:
    """ランダムに行動するエージェント（ベースライン）"""

    def __init__(self, n_actions: int = 4):
        self.n_actions = n_actions

    def select_action(self, state) -> int:
        return random.randint(0, self.n_actions - 1)

    def update(self, state, action, reward, next_state, done):
        pass  # ランダムエージェントは学習しない


def run_episode(env: Environment, agent, render: bool = False) -> Tuple[float, int]:
    """1エピソードを実行して累積報酬とステップ数を返す"""
    state = env.reset()
    total_reward = 0.0
    step = 0

    while True:
        if render:
            print(f"ステップ {step}")
            env.render()

        action = agent.select_action(state)
        next_state, reward, done = env.step(action)

        agent.update(state, action, reward, next_state, done)

        total_reward += reward
        state = next_state
        step += 1

        if done:
            break

    return total_reward, step


# 実行
env = Environment(size=5)
random_agent = RandomAgent()

print("ランダムエージェントの評価（100エピソード）:")
rewards = []
steps_list = []

for ep in range(100):
    reward, steps = run_episode(env, random_agent)
    rewards.append(reward)
    steps_list.append(steps)

print(f"  平均累積報酬: {np.mean(rewards):.3f} ± {np.std(rewards):.3f}")
print(f"  平均ステップ数: {np.mean(steps_list):.1f}")
print(f"  ゴール到達率: {sum(1 for s in steps_list if s < 100) / len(steps_list):.2%}")
```

---

## マルチアームバンディット問題

最も基本的な強化学習問題で、探索（Exploration）と活用（Exploitation）のトレードオフを学習します。

```python
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

class MultiArmBandit:
    """k-アームバンディット問題"""

    def __init__(self, k: int = 10, seed: int = 42):
        self.k = k
        rng = np.random.default_rng(seed)
        # 各アームの真の報酬期待値（未知）
        self.true_means = rng.normal(0, 1, k)
        self.best_arm = np.argmax(self.true_means)
        print(f"各アームの真の期待値: {self.true_means.round(2)}")
        print(f"最適アーム: {self.best_arm} (期待値: {self.true_means[self.best_arm]:.2f})")

    def pull(self, arm: int) -> float:
        """アームを引いて報酬を得る（ガウスノイズあり）"""
        return np.random.normal(self.true_means[arm], 1.0)


class EpsilonGreedyAgent:
    """ε-greedy戦略エージェント"""

    def __init__(self, k: int, epsilon: float):
        self.k = k
        self.epsilon = epsilon
        self.Q = np.zeros(k)     # 推定行動価値
        self.N = np.zeros(k)     # 各アームの選択回数
        self.rewards_history = []

    def select_action(self) -> int:
        if np.random.random() < self.epsilon:
            return np.random.randint(self.k)  # 探索
        else:
            return np.argmax(self.Q)           # 活用

    def update(self, arm: int, reward: float):
        self.N[arm] += 1
        # 増分更新則
        self.Q[arm] += (reward - self.Q[arm]) / self.N[arm]
        self.rewards_history.append(reward)


class UCBAgent:
    """UCB（Upper Confidence Bound）エージェント"""

    def __init__(self, k: int, c: float = 2.0):
        self.k = k
        self.c = c
        self.Q = np.zeros(k)
        self.N = np.zeros(k)
        self.t = 0
        self.rewards_history = []

    def select_action(self) -> int:
        self.t += 1
        # 未選択のアームは最優先
        if np.any(self.N == 0):
            return np.argmin(self.N)
        # UCBスコアで選択
        ucb_scores = self.Q + self.c * np.sqrt(np.log(self.t) / self.N)
        return np.argmax(ucb_scores)

    def update(self, arm: int, reward: float):
        self.N[arm] += 1
        self.Q[arm] += (reward - self.Q[arm]) / self.N[arm]
        self.rewards_history.append(reward)


# 実験
bandit = MultiArmBandit(k=10)
n_steps = 1000

agents = {
    "ε-greedy (ε=0.1)": EpsilonGreedyAgent(10, epsilon=0.1),
    "ε-greedy (ε=0.01)": EpsilonGreedyAgent(10, epsilon=0.01),
    "ε-greedy (ε=0.5)": EpsilonGreedyAgent(10, epsilon=0.5),
    "UCB (c=2)": UCBAgent(10, c=2.0),
}

results = {}
for name, agent in agents.items():
    for _ in range(n_steps):
        arm = agent.select_action()
        reward = bandit.pull(arm)
        agent.update(arm, reward)

    avg_reward = np.mean(agent.rewards_history)
    results[name] = {
        "avg_reward": avg_reward,
        "history": agent.rewards_history,
        "Q": agent.Q,
    }
    print(f"\n{name}:")
    print(f"  平均報酬: {avg_reward:.4f}")
    print(f"  推定価値: {agent.Q.round(2)}")

# プロット
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# 累積平均報酬の推移
ax = axes[0]
window = 50
for name, res in results.items():
    history = np.array(res["history"])
    cumulative_avg = np.cumsum(history) / np.arange(1, len(history) + 1)
    ax.plot(cumulative_avg, label=name)
ax.axhline(bandit.true_means[bandit.best_arm], color='black', linestyle='--',
           label=f'最適 ({bandit.true_means[bandit.best_arm]:.2f})')
ax.set_xlabel('ステップ')
ax.set_ylabel('累積平均報酬')
ax.set_title('探索戦略の比較')
ax.legend(fontsize=8)
ax.grid(True, alpha=0.3)

# 最終的な推定値 vs 真の値
ax = axes[1]
agent_name = "ε-greedy (ε=0.1)"
true_vals = bandit.true_means
est_vals = results[agent_name]["Q"]
x = np.arange(len(true_vals))
ax.bar(x - 0.2, true_vals, 0.4, label='真の期待値', alpha=0.7)
ax.bar(x + 0.2, est_vals, 0.4, label='推定値', alpha=0.7)
ax.set_xlabel('アーム番号')
ax.set_ylabel('価値')
ax.set_title(f'{agent_name} の推定精度')
ax.legend()
ax.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig('bandit_comparison.png', dpi=100)
print("\nプロットを保存: bandit_comparison.png")
```

---

## 方策と価値関数

```python
# 方策（Policy）の種類
class Policy:
    """方策の基底クラス"""
    def select_action(self, state, n_actions: int) -> int:
        raise NotImplementedError

class GreedyPolicy(Policy):
    """常に最大価値の行動を選択（決定的方策）"""
    def __init__(self, Q: dict):
        self.Q = Q

    def select_action(self, state, n_actions: int) -> int:
        q_values = [self.Q.get((state, a), 0.0) for a in range(n_actions)]
        return int(np.argmax(q_values))

class EpsilonGreedyPolicy(Policy):
    """ε確率でランダム探索、1-εで貪欲選択（確率的方策）"""
    def __init__(self, Q: dict, epsilon: float):
        self.Q = Q
        self.epsilon = epsilon

    def select_action(self, state, n_actions: int) -> int:
        if np.random.random() < self.epsilon:
            return np.random.randint(n_actions)
        q_values = [self.Q.get((state, a), 0.0) for a in range(n_actions)]
        return int(np.argmax(q_values))

class SoftmaxPolicy(Policy):
    """Softmax（Boltzmann）探索（温度パラメータで探索度を制御）"""
    def __init__(self, Q: dict, temperature: float = 1.0):
        self.Q = Q
        self.temperature = temperature

    def select_action(self, state, n_actions: int) -> int:
        q_values = np.array([self.Q.get((state, a), 0.0) for a in range(n_actions)])
        exp_q = np.exp(q_values / self.temperature)
        probs = exp_q / exp_q.sum()
        return np.random.choice(n_actions, p=probs)


# 価値関数の説明
print("価値関数の種類:")
print("""
状態価値関数 V^π(s):
  - 状態 s から方策 π に従った場合の期待累積報酬
  - V^π(s) = E_π[G_t | s_t = s]
  - G_t = r_t + γ*r_{t+1} + γ²*r_{t+2} + ...（割引報酬）

行動価値関数 Q^π(s, a):
  - 状態 s で行動 a を取り、その後 π に従った場合の期待累積報酬
  - Q^π(s, a) = E_π[G_t | s_t = s, a_t = a]
  - V^π(s) = Σ_a π(a|s) * Q^π(s, a)

最適価値関数:
  - V*(s) = max_π V^π(s)
  - Q*(s, a) = max_π Q^π(s, a)
  - 最適方策: π*(s) = argmax_a Q*(s, a)
""")
```

---

## 使用場面

| 応用分野 | 具体例 | 特徴 |
|---|---|---|
| ゲームAI | AtariゲームのDQN、AlphaGo | 多数の試行が可能 |
| ロボット制御 | 歩行・把持動作の学習 | 物理シミュレーション活用 |
| 推薦システム | 広告入札・コンテンツ推薦 | 長期ユーザーエンゲージメント |
| LLMのRLHF | ChatGPT、Claude | 人間フィードバックで調整 |
| 金融 | 取引戦略・ポートフォリオ最適化 | リスク管理が重要 |

---

## 参考文献

- [Sutton & Barto, Reinforcement Learning: An Introduction (2018)](http://incompleteideas.net/book/the-book-2nd.html)
- [OpenAI Spinning Up in Deep RL](https://spinningup.openai.com/)
- [David Silver's RL Course (UCL)](https://www.davidsilver.uk/teaching/)

<AffiliateBanner site="ml_intro" />
