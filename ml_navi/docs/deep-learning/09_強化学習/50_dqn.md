import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 深層 Q ネットワーク（DQN）

## DQNとは

> 深層 Q ネットワーク（Deep Q-Network, DQN）は、Q学習とディープニューラルネットワークを組み合わせた強化学習アルゴリズムである。状態を入力として各行動のQ値を出力するニューラルネットワークを学習し、Atari ゲームで人間レベルの性能を達成したことで注目を集めた（Mnih et al., 2015）。

## DQNの主要技術

| 技術 | 問題点 | 解決方法 |
|-----|--------|---------|
| Experience Replay | 連続データの相関 | 経験をバッファに蓄積しランダムサンプリング |
| Target Network | ブートストラップによる不安定性 | 更新頻度の低い別ネットワークで TD ターゲットを計算 |
| 勾配クリッピング | 勾配爆発 | 勾配を [-1, 1] などにクリップ |
| Huber 損失 | 外れ値への過敏 | MSE と MAE のハイブリッド損失 |

## DQNの学習ループ

1. 状態 $s_t$ をニューラルネットに入力し、Q値ベクトルを得る
2. ε-greedy で行動 $a_t$ を選択し、報酬 $r_t$、次状態 $s_{t+1}$ を得る
3. 経験 $(s_t, a_t, r_t, s_{t+1}, \text{done})$ をリプレイバッファに保存
4. バッファからミニバッチをサンプリング
5. Target Network で TD ターゲットを計算: $y = r + \gamma \max_{a'} Q_{\text{target}}(s', a')$
6. 現在の Q Network を損失 $\mathcal{L} = \mathbb{E}[(y - Q(s,a))^2]$ で更新
7. 一定間隔で Target Network を Q Network のパラメータでコピー

## DQNの発展形

| 手法 | 改良点 |
|------|--------|
| Double DQN | 行動選択と価値評価を分離し過大評価を防ぐ |
| Dueling DQN | $Q = V + A$（状態価値 + アドバンテージ）に分解 |
| Prioritized Replay | TD誤差が大きい経験を優先的にサンプリング |
| Rainbow | 上記複数の改良を組み合わせた手法 |

## PyTorch実装

```python
import random
import numpy as np
from collections import deque
from dataclasses import dataclass
from typing import Tuple, List

import torch
import torch.nn as nn
import torch.optim as optim
import torch.nn.functional as F


@dataclass
class Transition:
    state: np.ndarray
    action: int
    reward: float
    next_state: np.ndarray
    done: bool


class ReplayBuffer:
    """Experience Replay バッファ"""

    def __init__(self, capacity: int = 10000):
        self.buffer = deque(maxlen=capacity)

    def push(self, transition: Transition):
        self.buffer.append(transition)

    def sample(self, batch_size: int) -> List[Transition]:
        return random.sample(self.buffer, batch_size)

    def __len__(self):
        return len(self.buffer)


class DQNNetwork(nn.Module):
    """Q Network（全結合層）"""

    def __init__(self, state_dim: int, action_dim: int, hidden_dim: int = 128):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(state_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, action_dim),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


class DuelingDQNNetwork(nn.Module):
    """Dueling DQN: V(s) + A(s,a) に分解"""

    def __init__(self, state_dim: int, action_dim: int, hidden_dim: int = 128):
        super().__init__()
        self.feature = nn.Sequential(
            nn.Linear(state_dim, hidden_dim),
            nn.ReLU(),
        )
        # 状態価値ストリーム
        self.value_stream = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, 1),
        )
        # アドバンテージストリーム
        self.advantage_stream = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, action_dim),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        feat = self.feature(x)
        V = self.value_stream(feat)
        A = self.advantage_stream(feat)
        # Q = V + (A - mean(A)) で分解
        return V + A - A.mean(dim=-1, keepdim=True)


class DQNAgent:
    """DQN エージェント（Double DQN + Target Network）"""

    def __init__(
        self,
        state_dim: int,
        action_dim: int,
        lr: float = 1e-3,
        gamma: float = 0.99,
        epsilon_start: float = 1.0,
        epsilon_end: float = 0.01,
        epsilon_decay: float = 0.995,
        buffer_size: int = 10000,
        batch_size: int = 64,
        target_update_freq: int = 100,
        use_dueling: bool = False,
    ):
        self.action_dim = action_dim
        self.gamma = gamma
        self.epsilon = epsilon_start
        self.epsilon_end = epsilon_end
        self.epsilon_decay = epsilon_decay
        self.batch_size = batch_size
        self.target_update_freq = target_update_freq
        self.step_count = 0

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        NetworkClass = DuelingDQNNetwork if use_dueling else DQNNetwork
        self.q_net = NetworkClass(state_dim, action_dim).to(self.device)
        self.target_net = NetworkClass(state_dim, action_dim).to(self.device)
        self.target_net.load_state_dict(self.q_net.state_dict())
        self.target_net.eval()

        self.optimizer = optim.Adam(self.q_net.parameters(), lr=lr)
        self.replay_buffer = ReplayBuffer(buffer_size)

    def select_action(self, state: np.ndarray) -> int:
        """ε-greedy 行動選択"""
        if random.random() < self.epsilon:
            return random.randint(0, self.action_dim - 1)
        state_tensor = torch.FloatTensor(state).unsqueeze(0).to(self.device)
        with torch.no_grad():
            q_values = self.q_net(state_tensor)
        return q_values.argmax().item()

    def update(self):
        """Q Network の更新"""
        if len(self.replay_buffer) < self.batch_size:
            return None

        transitions = self.replay_buffer.sample(self.batch_size)
        states = torch.FloatTensor(
            np.array([t.state for t in transitions])
        ).to(self.device)
        actions = torch.LongTensor(
            [t.action for t in transitions]
        ).to(self.device)
        rewards = torch.FloatTensor(
            [t.reward for t in transitions]
        ).to(self.device)
        next_states = torch.FloatTensor(
            np.array([t.next_state for t in transitions])
        ).to(self.device)
        dones = torch.FloatTensor(
            [t.done for t in transitions]
        ).to(self.device)

        # 現在の Q 値
        q_values = self.q_net(states).gather(1, actions.unsqueeze(1)).squeeze()

        # Double DQN: 行動選択は q_net、価値評価は target_net
        with torch.no_grad():
            next_actions = self.q_net(next_states).argmax(dim=1)
            next_q_values = self.target_net(next_states).gather(
                1, next_actions.unsqueeze(1)
            ).squeeze()
            targets = rewards + self.gamma * next_q_values * (1 - dones)

        loss = F.smooth_l1_loss(q_values, targets)  # Huber 損失

        self.optimizer.zero_grad()
        loss.backward()
        nn.utils.clip_grad_norm_(self.q_net.parameters(), 1.0)
        self.optimizer.step()

        self.step_count += 1
        if self.step_count % self.target_update_freq == 0:
            self.target_net.load_state_dict(self.q_net.state_dict())

        self.epsilon = max(self.epsilon_end, self.epsilon * self.epsilon_decay)
        return loss.item()


# CartPole での学習例（gym がある場合）
def train_cartpole():
    try:
        import gymnasium as gym
        env = gym.make("CartPole-v1")
        state_dim = env.observation_space.shape[0]  # 4
        action_dim = env.action_space.n              # 2

        agent = DQNAgent(
            state_dim, action_dim,
            use_dueling=True,
            target_update_freq=50,
        )

        rewards = []
        for episode in range(300):
            state, _ = env.reset()
            total_reward = 0
            done = False

            while not done:
                action = agent.select_action(state)
                next_state, reward, terminated, truncated, _ = env.step(action)
                done = terminated or truncated

                agent.replay_buffer.push(
                    Transition(state, action, reward, next_state, done)
                )
                agent.update()
                state = next_state
                total_reward += reward

            rewards.append(total_reward)
            if (episode + 1) % 50 == 0:
                avg = np.mean(rewards[-50:])
                print(f"Episode {episode+1}: avg reward = {avg:.1f}, ε = {agent.epsilon:.3f}")

        env.close()
        return rewards
    except ImportError:
        print("gymnasium が必要です: pip install gymnasium")


if __name__ == "__main__":
    train_cartpole()
```

## 使用場面

- 連続状態空間・離散行動空間を持つ問題（Atari, CartPole など）
- ゲームAIの学習（State をピクセルや特徴量で表現できる場合）
- 自律走行・ロボット制御の初期検証
- Q-table では状態空間が大きすぎて扱えない問題

## 参考文献

- Mnih, V., et al. (2015). Human-level control through deep reinforcement learning. *Nature*, 518, 529-533.
- Van Hasselt, H., Guez, A., & Silver, D. (2016). Deep Reinforcement Learning with Double Q-learning. *AAAI*.
- Wang, Z., et al. (2016). Dueling Network Architectures for Deep Reinforcement Learning. *ICML*.

<AffiliateBanner site="ml_intro" />
