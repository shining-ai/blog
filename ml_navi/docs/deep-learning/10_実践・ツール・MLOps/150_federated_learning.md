import AffiliateBanner from '@site/src/components/AffiliateBanner';

# フェデレーテッドラーニング

## フェデレーテッドラーニングとは

> フェデレーテッドラーニング（Federated Learning, FL）とは、生データをサーバーに送らず各クライアント端末でローカルに学習し、モデルのパラメータ（勾配・重み）のみを集約することで、プライバシーを保護しながら協調的にモデルを改善する分散機械学習手法。

| 従来の中央集権的学習 | フェデレーテッドラーニング |
|---------------------|--------------------------|
| 生データをサーバーに送信 | 生データはデバイスに残留 |
| データ収集コストが高い | データ収集が不要 |
| プライバシーリスク大 | プライバシーリスク低 |
| 通信帯域：大（データ） | 通信帯域：小（モデル更新） |
| 規制対応が困難 | GDPR 等に対応しやすい |

---

## FL の主なシナリオ

| シナリオ | 説明 | 例 |
|---------|------|-----|
| 横断的 FL（Horizontal FL）| 同一特徴量・異なるサンプル | 複数病院の患者データ |
| 縦断的 FL（Vertical FL）| 異なる特徴量・同一サンプル | 銀行+EC サイトのユーザー情報 |
| FL 転移学習 | 特徴空間が異なるクライアント間 | クロスドメイン推薦 |

---

## FedAvg アルゴリズム

FedAvg（Federated Averaging）は FL の基本アルゴリズム。各ラウンドでクライアントがローカル学習し、サーバーが重み平均を計算する。

```python
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset, Subset
import copy
import numpy as np
from typing import List, Tuple

# --- シンプルなモデル ---
class SimpleModel(nn.Module):
    def __init__(self, input_dim: int = 28 * 28, num_classes: int = 10):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Linear(64, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x.flatten(1))


# --- クライアントのローカル学習 ---
def local_train(model: nn.Module, dataloader: DataLoader,
                local_epochs: int = 5,
                lr: float = 0.01) -> Tuple[dict, int]:
    """ローカルデータでモデルを学習し更新後の重みを返す"""
    local_model = copy.deepcopy(model)
    optimizer   = optim.SGD(local_model.parameters(), lr=lr, momentum=0.9)
    criterion   = nn.CrossEntropyLoss()

    local_model.train()
    for _ in range(local_epochs):
        for X_batch, y_batch in dataloader:
            optimizer.zero_grad()
            loss = criterion(local_model(X_batch), y_batch)
            loss.backward()
            optimizer.step()

    return local_model.state_dict(), len(dataloader.dataset)


# --- FedAvg によるグローバルモデルの集約 ---
def fed_avg(global_weights: dict,
            client_updates: List[Tuple[dict, int]]) -> dict:
    """加重平均によるモデル集約"""
    total_samples = sum(n for _, n in client_updates)
    averaged_weights = copy.deepcopy(global_weights)

    for key in averaged_weights:
        averaged_weights[key] = torch.zeros_like(averaged_weights[key],
                                                  dtype=torch.float32)
        for client_state, n in client_updates:
            averaged_weights[key] += client_state[key].float() * (n / total_samples)

    return averaged_weights


# --- FL シミュレーション ---
def simulate_federated_learning(
    num_clients:    int   = 5,
    num_rounds:     int   = 10,
    fraction_fit:   float = 0.6,
    local_epochs:   int   = 3,
    batch_size:     int   = 32,
) -> SimpleModel:

    device = "cpu"

    # ダミーデータセットを作成（MNIST の模擬）
    X_all = torch.randn(1000, 1, 28, 28)
    y_all = torch.randint(0, 10, (1000,))
    full_dataset = TensorDataset(X_all, y_all)

    # データをクライアントに分配
    indices    = np.random.permutation(len(full_dataset))
    splits     = np.array_split(indices, num_clients)
    client_datasets = [Subset(full_dataset, split.tolist()) for split in splits]

    # グローバルモデルの初期化
    global_model = SimpleModel().to(device)

    for round_num in range(1, num_rounds + 1):
        # 参加クライアントのサンプリング
        num_selected = max(1, int(num_clients * fraction_fit))
        selected     = np.random.choice(num_clients, num_selected, replace=False)

        # 各クライアントのローカル学習
        client_updates = []
        for client_id in selected:
            loader = DataLoader(client_datasets[client_id],
                                batch_size=batch_size, shuffle=True)
            weights, n = local_train(global_model, loader,
                                     local_epochs=local_epochs)
            client_updates.append((weights, n))

        # グローバルモデルの更新
        new_weights = fed_avg(global_model.state_dict(), client_updates)
        global_model.load_state_dict(new_weights)

        if round_num % 2 == 0:
            print(f"Round {round_num:3d}/{num_rounds} | "
                  f"参加クライアント: {len(selected)}/{num_clients}")

    return global_model


global_model = simulate_federated_learning(
    num_clients=5, num_rounds=6, fraction_fit=0.6)
print("FL 完了")
```

---

## Non-IID データの課題

フェデレーテッドラーニングでは各クライアントのデータ分布が異なる（Non-IID）ことが多く、モデル性能を低下させる。

```python
import numpy as np
import matplotlib.pyplot as plt

def create_non_iid_split(labels: np.ndarray, num_clients: int,
                          num_classes_per_client: int = 2) -> dict:
    """
    各クライアントが一部のクラスのみ保有する Non-IID 分割
    （Dirichlet 分布によるより現実的な Non-IID 分割も使われる）
    """
    num_classes = len(np.unique(labels))
    client_indices = {i: [] for i in range(num_clients)}
    classes_per_client = num_classes_per_client

    # クラスごとにインデックスをシャッフル
    class_indices = {c: np.where(labels == c)[0].tolist()
                     for c in range(num_classes)}
    for c in class_indices:
        np.random.shuffle(class_indices[c])

    # ラウンドロビンでクラスをクライアントに割り当て
    assigned = [[] for _ in range(num_clients)]
    for c in range(num_classes):
        primary_clients = [c % num_clients,
                           (c + 1) % num_clients][:classes_per_client]
        chunk = len(class_indices[c]) // len(primary_clients)
        for i, client in enumerate(primary_clients):
            assigned[client].extend(
                class_indices[c][i*chunk:(i+1)*chunk]
            )

    return {i: assigned[i] for i in range(num_clients)}

# Non-IID 分割の可視化（ラベル分布）
labels_dummy = np.random.randint(0, 10, 1000)
split = create_non_iid_split(labels_dummy, num_clients=5,
                              num_classes_per_client=3)
for client_id, idxs in split.items():
    unique, counts = np.unique(labels_dummy[idxs], return_counts=True)
    print(f"Client {client_id}: クラス分布 = "
          f"{dict(zip(unique.tolist(), counts.tolist()))}")
```

---

## 差分プライバシー（Differential Privacy）

モデル更新に統計的ノイズを加えることで、個人情報のリバースエンジニアリングをさらに困難にする。

```python
import torch
import torch.nn as nn
import numpy as np

def add_gaussian_noise_to_gradients(model: nn.Module,
                                     clip_norm: float = 1.0,
                                     noise_multiplier: float = 0.1) -> nn.Module:
    """
    差分プライバシーのための勾配クリッピング + ガウスノイズ付加
    Clip Norm: 感度の制御
    Noise Multiplier: プライバシー予算 ε の調整
    """
    with torch.no_grad():
        # 1. 勾配のクリッピング（L2 ノルムで制限）
        total_norm = torch.nn.utils.clip_grad_norm_(
            model.parameters(), max_norm=clip_norm)

        # 2. ガウスノイズの付加
        sensitivity = clip_norm
        noise_std   = noise_multiplier * sensitivity
        for param in model.parameters():
            if param.grad is not None:
                noise = torch.randn_like(param.grad) * noise_std
                param.grad.data.add_(noise)

    return model


# DP-SGD の簡易実装例
class DPOptimizer:
    """差分プライバシー付き SGD ラッパー"""

    def __init__(self, optimizer: torch.optim.Optimizer,
                 noise_multiplier: float = 1.0,
                 max_grad_norm: float = 1.0):
        self.optimizer       = optimizer
        self.noise_multiplier = noise_multiplier
        self.max_grad_norm   = max_grad_norm

    def step(self, model: nn.Module):
        # 勾配クリッピング
        torch.nn.utils.clip_grad_norm_(
            model.parameters(), self.max_grad_norm)
        # ノイズ付加
        for p in model.parameters():
            if p.grad is not None:
                noise = torch.randn_like(p.grad) * (
                    self.noise_multiplier * self.max_grad_norm)
                p.grad.data.add_(noise)
        self.optimizer.step()

    def zero_grad(self):
        self.optimizer.zero_grad()
```

---

## Flower（flwr）フレームワークの概要

```python
# pip install flwr

import flwr as fl
import torch
import torch.nn as nn
from typing import List, Tuple
import numpy as np

# --- クライアントの定義 ---
class FlowerClient(fl.client.NumPyClient):
    def __init__(self, model: nn.Module, trainloader, valloader):
        self.model       = model
        self.trainloader = trainloader
        self.valloader   = valloader
        self.criterion   = nn.CrossEntropyLoss()

    def get_parameters(self, config):
        return [p.cpu().detach().numpy()
                for p in self.model.parameters()]

    def set_parameters(self, parameters):
        for p, new_p in zip(self.model.parameters(), parameters):
            p.data = torch.tensor(new_p, dtype=torch.float32)

    def fit(self, parameters, config):
        self.set_parameters(parameters)
        self.model.train()
        optimizer = torch.optim.SGD(self.model.parameters(), lr=0.01)
        for X, y in self.trainloader:
            optimizer.zero_grad()
            self.criterion(self.model(X), y).backward()
            optimizer.step()
        return self.get_parameters(config), len(self.trainloader.dataset), {}

    def evaluate(self, parameters, config):
        self.set_parameters(parameters)
        self.model.eval()
        loss, correct = 0.0, 0
        with torch.no_grad():
            for X, y in self.valloader:
                out  = self.model(X)
                loss += self.criterion(out, y).item()
                correct += (out.argmax(1) == y).sum().item()
        accuracy = correct / len(self.valloader.dataset)
        return loss, len(self.valloader.dataset), {"accuracy": accuracy}

# --- サーバーの起動例 ---
# strategy = fl.server.strategy.FedAvg(
#     fraction_fit=0.5,
#     fraction_evaluate=0.5,
#     min_fit_clients=2,
#     min_evaluate_clients=2,
#     min_available_clients=2,
# )
# fl.server.start_server(
#     server_address="0.0.0.0:8080",
#     config=fl.server.ServerConfig(num_rounds=10),
#     strategy=strategy,
# )
print("Flower クライアント定義完了（実行には flwr サーバーが必要）")
```

---

## 使用場面

- スマートフォン上のキーボード予測モデルの改善（Google Gboard）
- 医療機関をまたいだ診断 AI の協調学習（データ共有不要）
- 金融機関間での不正検知モデルの共同改善
- 自動車の走行データを用いた運転支援 AI の更新
- IoT デバイスのローカル推論モデルの継続的改善

---

## 参考文献

- [Flower（flwr）公式ドキュメント](https://flower.dev/docs/)
- [FedAvg 論文（McMahan et al., 2017）](https://arxiv.org/abs/1602.05629)
- [PySyft ライブラリ](https://github.com/OpenMined/PySyft)
- [TensorFlow Federated](https://www.tensorflow.org/federated)

<AffiliateBanner site="ml_intro" />
