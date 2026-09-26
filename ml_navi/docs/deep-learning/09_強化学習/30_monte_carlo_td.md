import AffiliateBanner from '@site/src/components/AffiliateBanner';

# モンテカルロ法と TD 学習

## モンテカルロ法・TD学習とは

> モンテカルロ法（MC法）と時間差分学習（Temporal Difference Learning, TD学習）は、環境モデルを必要とせず、エージェントが実際に環境と相互作用することで得られるサンプルから価値関数を推定する手法である。モデルフリー強化学習の根幹をなす。

## MC法 vs TD学習 vs DP の比較

| 手法 | 更新タイミング | ブートストラップ | モデル必要性 | バイアス | 分散 |
|------|-------------|----------------|------------|--------|------|
| DP | 全状態を一括更新 | あり（V を利用） | 必要 | 低 | 低 |
| MC法 | エピソード終了後 | なし | 不要 | 低 | 高 |
| TD(0) | 各ステップ後 | あり | 不要 | 高 | 低 |
| TD(λ) | 各ステップ後 | あり（λで調整） | 不要 | 中 | 中 |

## モンテカルロ法（MC法）

エピソード全体の収益 $G_t = \sum_{k=0}^{T-t-1} \gamma^k R_{t+k+1}$ を使って更新する：

$$V(S_t) \leftarrow V(S_t) + \alpha \left[ G_t - V(S_t) \right]$$

### On-policy vs Off-policy MC

| 種類 | 収集方策 | 評価方策 | 特徴 |
|------|---------|---------|------|
| On-policy（First-visit） | $\pi$ | $\pi$ | 各エピソードで各状態を最初に訪れた時刻のみ更新 |
| On-policy（Every-visit） | $\pi$ | $\pi$ | 全訪問時刻で更新 |
| Off-policy | 行動方策 $\mu$ | 評価方策 $\pi$ | 重点サンプリングが必要 |

## TD(0) 学習

1ステップ先の推定値を使ってブートストラップする：

$$V(S_t) \leftarrow V(S_t) + \alpha \left[ R_{t+1} + \gamma V(S_{t+1}) - V(S_t) \right]$$

$\delta_t = R_{t+1} + \gamma V(S_{t+1}) - V(S_t)$ を **TD誤差** と呼ぶ。

## TD(λ) と Eligibility Traces

$\lambda$ パラメータで MC と TD(0) を補間する：

$$G_t^\lambda = (1-\lambda) \sum_{n=1}^{\infty} \lambda^{n-1} G_t^{(n)}$$

Eligibility Trace $e_t(s)$ を使った Forward/Backward view の等価実装：

$$e_t(s) = \gamma \lambda \, e_{t-1}(s) + \mathbf{1}[S_t = s]$$
$$V(s) \leftarrow V(s) + \alpha \delta_t e_t(s)$$

## Python実装

```python
import numpy as np
from collections import defaultdict
from typing import List, Tuple, Dict

class SimpleEnv:
    """5状態の線形環境（ランダムウォーク）"""

    def __init__(self, n_states: int = 7):
        self.n_states = n_states
        self.start = n_states // 2
        self.terminal_left = 0
        self.terminal_right = n_states - 1

    def reset(self) -> int:
        return self.start

    def step(self, state: int) -> Tuple[int, float, bool]:
        """左右にランダム移動"""
        next_state = state + np.random.choice([-1, 1])
        if next_state == self.terminal_right:
            return next_state, 1.0, True
        elif next_state == self.terminal_left:
            return next_state, 0.0, True
        return next_state, 0.0, False

    def generate_episode(
        self, policy=None
    ) -> List[Tuple[int, int, float]]:
        """エピソードを生成して (state, action, reward) のリストを返す"""
        trajectory = []
        state = self.reset()
        done = False
        while not done:
            action = 0  # ランダムウォークでは行動不要
            next_state, reward, done = self.step(state)
            trajectory.append((state, action, reward))
            state = next_state
        return trajectory


class MCPredictor:
    """First-visit モンテカルロ法による方策評価"""

    def __init__(self, n_states: int, gamma: float = 1.0, alpha: float = 0.1):
        self.n_states = n_states
        self.gamma = gamma
        self.alpha = alpha
        self.V = np.zeros(n_states)
        self.returns = defaultdict(list)

    def update(self, episode: List[Tuple[int, int, float]]):
        """エピソードから価値関数を更新（First-visit MC）"""
        visited = set()
        G = 0.0
        # エピソードを逆順に処理
        for t in reversed(range(len(episode))):
            state, _, reward = episode[t]
            G = self.gamma * G + reward
            if state not in visited:
                visited.add(state)
                self.returns[state].append(G)
                # 増分更新
                self.V[state] += self.alpha * (G - self.V[state])


class TDPredictor:
    """TD(0) による方策評価"""

    def __init__(self, n_states: int, gamma: float = 1.0, alpha: float = 0.1):
        self.n_states = n_states
        self.gamma = gamma
        self.alpha = alpha
        self.V = np.zeros(n_states)

    def update(self, state: int, reward: float, next_state: int, done: bool):
        """TD(0) の更新"""
        target = reward if done else reward + self.gamma * self.V[next_state]
        td_error = target - self.V[state]
        self.V[state] += self.alpha * td_error
        return td_error


class TDLambdaPredictor:
    """TD(λ) with Eligibility Traces"""

    def __init__(
        self,
        n_states: int,
        gamma: float = 1.0,
        alpha: float = 0.1,
        lam: float = 0.5,
    ):
        self.n_states = n_states
        self.gamma = gamma
        self.alpha = alpha
        self.lam = lam
        self.V = np.zeros(n_states)

    def run_episode(self, env: SimpleEnv):
        """1エピソード実行して価値関数を更新"""
        e = np.zeros(self.n_states)  # Eligibility traces
        state = env.reset()
        done = False

        while not done:
            next_state, reward, done = env.step(state)
            td_error = (
                reward
                + (0 if done else self.gamma * self.V[next_state])
                - self.V[state]
            )
            e[state] += 1.0
            self.V += self.alpha * td_error * e
            e *= self.gamma * self.lam
            state = next_state


# 実験: 各手法による価値関数推定
env = SimpleEnv(n_states=7)
n_episodes = 1000

# 真の価値関数（線形補間）
true_V = np.array([0, 1/6, 2/6, 3/6, 4/6, 5/6, 1])

mc = MCPredictor(env.n_states, gamma=1.0, alpha=0.1)
td0 = TDPredictor(env.n_states, gamma=1.0, alpha=0.1)
tdlam = TDLambdaPredictor(env.n_states, gamma=1.0, alpha=0.1, lam=0.5)

for ep in range(n_episodes):
    episode = env.generate_episode()
    mc.update(episode)

    state = env.reset()
    done = False
    while not done:
        next_state, reward, done = env.step(state)
        td0.update(state, reward, next_state, done)
        state = next_state

    tdlam.run_episode(env)

# 内部状態（終端除く）での RMSE
inner = slice(1, 6)
print(f"MC   RMSE: {np.sqrt(np.mean((mc.V[inner] - true_V[inner])**2)):.4f}")
print(f"TD(0) RMSE: {np.sqrt(np.mean((td0.V[inner] - true_V[inner])**2)):.4f}")
print(f"TD(λ) RMSE: {np.sqrt(np.mean((tdlam.V[inner] - true_V[inner])**2)):.4f}")
print("\n推定された価値関数（MC）:", mc.V.round(3))
print("推定された価値関数（TD0）:", td0.V.round(3))
print("真の価値関数:              ", true_V.round(3))
```

## 使用場面

- **MC法**: エピソードが有限・短い問題、バイアスを避けたい場合
- **TD(0)**: 継続タスク・オンライン学習・速い収束が必要な場合
- **TD(λ)**: MC と TD のトレードオフを調整したい場合
- **実装上**: Q学習・SARSA・Actor-Critic の基盤となる推定手法

## 参考文献

- Sutton, R. S., & Barto, A. G. (2018). *Reinforcement Learning: An Introduction* (2nd ed.)
- Sutton, R. S. (1988). Learning to predict by the methods of temporal differences. *Machine Learning*, 3, 9-44.
- Singh, S., & Sutton, R. S. (1996). Reinforcement learning with replacing eligibility traces. *Machine Learning*, 22, 123-158.

<AffiliateBanner site="ml_intro" />
