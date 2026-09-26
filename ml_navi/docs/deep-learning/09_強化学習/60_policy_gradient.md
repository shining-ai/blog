import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 方策勾配法

## 方策勾配法とは

> 方策勾配法（Policy Gradient）は、方策 $\pi_\theta$ をパラメータ $\theta$ で直接表現し、期待累積報酬 $J(\theta)$ を最大化するよう $\theta$ を勾配上昇法で更新する強化学習手法である。連続行動空間や確率的方策が自然に扱える点が価値関数ベース手法との大きな違いである。

## 主要アルゴリズムの比較

| アルゴリズム | 特徴 | 分散 | バイアス |
|------------|------|------|---------|
| REINFORCE | 純粋な Monte Carlo 方策勾配 | 高 | なし |
| Actor-Critic (A2C) | V(s) をベースライン・クリティック | 中 | あり |
| PPO | クリッピングで安定した更新 | 低〜中 | あり |
| TRPO | 信頼領域制約で安定化 | 低 | あり |

## 方策勾配定理

目的関数 $J(\theta) = \mathbb{E}_{\tau \sim \pi_\theta}[G(\tau)]$ の勾配：

$$\nabla_\theta J(\theta) = \mathbb{E}_{\pi_\theta}\left[\sum_{t=0}^{T} \nabla_\theta \log \pi_\theta(A_t|S_t) \cdot G_t\right]$$

### REINFORCE アルゴリズム

$$\theta \leftarrow \theta + \alpha \sum_t \nabla_\theta \log \pi_\theta(a_t|s_t) (G_t - b)$$

ここで $b$ はベースライン（$V(s_t)$ を使うことが多い）。

## Advantage 関数

クリティック $V(s)$ を使ってアドバンテージ $A(s,a)$ を推定する：

$$A(s_t, a_t) = Q(s_t, a_t) - V(s_t) \approx R_{t+1} + \gamma V(s_{t+1}) - V(s_t) = \delta_t$$

GAE（Generalized Advantage Estimation）では $\lambda$ を使って多ステップアドバンテージを推定する：

$$\hat{A}_t^{\text{GAE}(\gamma,\lambda)} = \sum_{l=0}^{\infty} (\gamma \lambda)^l \delta_{t+l}$$

## PPO（Proximal Policy Optimization）

方策の更新が大きすぎることを防ぐため、確率比 $r_t(\theta) = \frac{\pi_\theta(a_t|s_t)}{\pi_{\theta_{\text{old}}}(a_t|s_t)}$ をクリップする：

$$L^{\text{CLIP}}(\theta) = \mathbb{E}_t\left[\min\left(r_t(\theta)\hat{A}_t,\; \text{clip}(r_t(\theta), 1-\varepsilon, 1+\varepsilon)\hat{A}_t\right)\right]$$

## PyTorch実装

```python
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.distributions import Categorical
from typing import List, Tuple


class PolicyNetwork(nn.Module):
    """方策ネットワーク（離散行動空間）"""

    def __init__(self, state_dim: int, action_dim: int, hidden_dim: int = 128):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(state_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, action_dim),
        )

    def forward(self, x: torch.Tensor) -> Categorical:
        logits = self.net(x)
        return Categorical(logits=logits)


class ValueNetwork(nn.Module):
    """価値ネットワーク（クリティック）"""

    def __init__(self, state_dim: int, hidden_dim: int = 128):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(state_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x).squeeze(-1)


def compute_gae(
    rewards: List[float],
    values: List[float],
    next_value: float,
    dones: List[bool],
    gamma: float = 0.99,
    lam: float = 0.95,
) -> Tuple[List[float], List[float]]:
    """GAE（Generalized Advantage Estimation）の計算"""
    advantages = []
    gae = 0.0
    next_val = next_value

    for reward, value, done in zip(
        reversed(rewards), reversed(values), reversed(dones)
    ):
        if done:
            next_val = 0.0
            gae = 0.0
        delta = reward + gamma * next_val - value
        gae = delta + gamma * lam * gae
        advantages.insert(0, gae)
        next_val = value

    returns = [adv + val for adv, val in zip(advantages, values)]
    return advantages, returns


class PPOAgent:
    """PPO エージェント"""

    def __init__(
        self,
        state_dim: int,
        action_dim: int,
        lr: float = 3e-4,
        gamma: float = 0.99,
        lam: float = 0.95,
        clip_eps: float = 0.2,
        n_epochs: int = 4,
        batch_size: int = 64,
        entropy_coef: float = 0.01,
        value_coef: float = 0.5,
    ):
        self.gamma = gamma
        self.lam = lam
        self.clip_eps = clip_eps
        self.n_epochs = n_epochs
        self.batch_size = batch_size
        self.entropy_coef = entropy_coef
        self.value_coef = value_coef

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.policy = PolicyNetwork(state_dim, action_dim).to(self.device)
        self.value_net = ValueNetwork(state_dim).to(self.device)
        self.optimizer = optim.Adam(
            list(self.policy.parameters()) + list(self.value_net.parameters()),
            lr=lr
        )

    def select_action(
        self, state: np.ndarray
    ) -> Tuple[int, float, float]:
        state_tensor = torch.FloatTensor(state).unsqueeze(0).to(self.device)
        with torch.no_grad():
            dist = self.policy(state_tensor)
            value = self.value_net(state_tensor)
        action = dist.sample()
        log_prob = dist.log_prob(action)
        return action.item(), log_prob.item(), value.item()

    def update(
        self,
        states: np.ndarray,
        actions: np.ndarray,
        old_log_probs: np.ndarray,
        returns: np.ndarray,
        advantages: np.ndarray,
    ):
        """PPO の更新（n_epochs 回繰り返し）"""
        states_t = torch.FloatTensor(states).to(self.device)
        actions_t = torch.LongTensor(actions).to(self.device)
        old_lp_t = torch.FloatTensor(old_log_probs).to(self.device)
        returns_t = torch.FloatTensor(returns).to(self.device)
        adv_t = torch.FloatTensor(advantages).to(self.device)
        # アドバンテージを正規化
        adv_t = (adv_t - adv_t.mean()) / (adv_t.std() + 1e-8)

        for _ in range(self.n_epochs):
            indices = np.random.permutation(len(states))
            for start in range(0, len(states), self.batch_size):
                idx = indices[start: start + self.batch_size]

                dist = self.policy(states_t[idx])
                new_log_probs = dist.log_prob(actions_t[idx])
                entropy = dist.entropy().mean()
                values = self.value_net(states_t[idx])

                ratio = (new_log_probs - old_lp_t[idx]).exp()
                surr1 = ratio * adv_t[idx]
                surr2 = torch.clamp(ratio, 1 - self.clip_eps, 1 + self.clip_eps) * adv_t[idx]
                policy_loss = -torch.min(surr1, surr2).mean()
                value_loss = nn.functional.mse_loss(values, returns_t[idx])

                loss = policy_loss + self.value_coef * value_loss - self.entropy_coef * entropy
                self.optimizer.zero_grad()
                loss.backward()
                nn.utils.clip_grad_norm_(
                    list(self.policy.parameters()) + list(self.value_net.parameters()), 0.5
                )
                self.optimizer.step()


def train_ppo():
    try:
        import gymnasium as gym
        env = gym.make("CartPole-v1")
        state_dim = env.observation_space.shape[0]
        action_dim = env.action_space.n

        agent = PPOAgent(state_dim, action_dim)
        rollout_len = 512

        for iteration in range(50):
            states, actions, log_probs, rewards, dones, values = [], [], [], [], [], []
            state, _ = env.reset()

            for _ in range(rollout_len):
                action, lp, value = agent.select_action(state)
                next_state, reward, terminated, truncated, _ = env.step(action)
                done = terminated or truncated

                states.append(state)
                actions.append(action)
                log_probs.append(lp)
                rewards.append(reward)
                dones.append(done)
                values.append(value)

                state = next_state if not done else env.reset()[0]

            _, _, next_value = agent.select_action(state)
            advantages, returns = compute_gae(
                rewards, values, next_value, dones
            )

            agent.update(
                np.array(states), np.array(actions),
                np.array(log_probs), np.array(returns), np.array(advantages)
            )

            if (iteration + 1) % 10 == 0:
                avg_reward = sum(rewards) / max(sum(dones), 1)
                print(f"Iter {iteration+1}: avg_episode_reward ≈ {avg_reward:.1f}")

        env.close()
    except ImportError:
        print("gymnasium が必要です: pip install gymnasium")


if __name__ == "__main__":
    train_ppo()
```

## 使用場面

- **REINFORCE**: 簡単な連続・離散行動問題の理解・検証
- **Actor-Critic / A2C**: ロボット制御・ゲームAI
- **PPO**: 最も広く使われる汎用的な選択肢（安定・実装容易）
- **TRPO**: 安全性制約が厳しい場合（ロボティクスなど）

## 参考文献

- Williams, R. J. (1992). Simple statistical gradient-following algorithms for connectionist reinforcement learning. *Machine Learning*, 8, 229-256.
- Mnih, V., et al. (2016). Asynchronous methods for deep reinforcement learning. *ICML*.
- Schulman, J., et al. (2017). Proximal Policy Optimization Algorithms. *arXiv:1707.06347*.
- Schulman, J., et al. (2015). High-Dimensional Continuous Control Using Generalized Advantage Estimation. *ICLR 2016*.

<AffiliateBanner site="ml_intro" />
