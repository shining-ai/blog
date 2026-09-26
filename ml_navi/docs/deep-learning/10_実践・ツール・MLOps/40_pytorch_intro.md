import AffiliateBanner from '@site/src/components/AffiliateBanner';

# PyTorch 入門

## PyTorch とは

> PyTorch は Meta（旧 Facebook）が開発したオープンソースの深層学習フレームワーク。動的計算グラフ（Define-by-Run）を採用しており、Python の制御フローをそのままモデル定義に利用できる。研究・プロトタイピングから本番デプロイまで幅広く使われている。

| 特徴 | 内容 |
|------|------|
| 計算グラフ | 動的（実行時に構築） |
| 自動微分 | `autograd` モジュール |
| GPU 対応 | CUDA / MPS（Apple Silicon）|
| モデル定義 | `nn.Module` 継承 |
| 本番デプロイ | TorchScript / ONNX |
| エコシステム | torchvision / torchaudio / torchtext |

---

## テンソルの作成と操作

PyTorch の基本データ構造は `torch.Tensor`。NumPy の ndarray に似た API を持つ。

```python
import torch
import numpy as np

# --- テンソルの作成 ---
t_zeros = torch.zeros(3, 4)           # 3x4 のゼロテンソル
t_ones  = torch.ones(2, 3)            # 2x3 の 1 テンソル
t_rand  = torch.rand(5, 5)            # 一様乱数 [0, 1)
t_randn = torch.randn(4, 4)           # 標準正規分布
t_range = torch.arange(0, 10, 2)      # [0, 2, 4, 6, 8]
t_list  = torch.tensor([[1, 2], [3, 4]], dtype=torch.float32)

# NumPy との相互変換
arr = np.array([1.0, 2.0, 3.0])
t_from_np = torch.from_numpy(arr)     # メモリ共有
np_from_t = t_rand.numpy()            # CPU テンソルのみ

# --- 基本操作 ---
print(t_list.shape)    # torch.Size([2, 2])
print(t_list.dtype)    # torch.float32
print(t_list.device)   # cpu

# 形状変換
t = torch.randn(6)
reshaped = t.reshape(2, 3)            # 2x3
viewed   = t.view(3, 2)               # 3x2（連続メモリが必要）
squeezed = torch.randn(1, 3, 1).squeeze()   # [3]
unsqueezed = t.unsqueeze(0)           # [1, 6]

# 演算
a = torch.tensor([1.0, 2.0, 3.0])
b = torch.tensor([4.0, 5.0, 6.0])
print(a + b)           # element-wise 加算
print(a @ b)           # 内積（スカラー）
print(torch.matmul(a.unsqueeze(0), b.unsqueeze(1)))  # 行列積

# GPU への転送
device = "cuda" if torch.cuda.is_available() else "cpu"
t_gpu = t_rand.to(device)
```

---

## 自動微分（autograd）

`requires_grad=True` を設定したテンソルの演算を追跡し、`.backward()` で勾配を自動計算する。

```python
import torch

# スカラー関数の微分
x = torch.tensor(3.0, requires_grad=True)
y = x ** 2 + 2 * x + 1   # y = x^2 + 2x + 1
y.backward()              # dy/dx = 2x + 2
print(x.grad)             # tensor(8.)  (2*3 + 2 = 8)

# ベクトル値関数（勾配の蓄積に注意）
x = torch.randn(3, requires_grad=True)
z = (x ** 2).sum()
z.backward()
print(x.grad)             # 2 * x

# 勾配計算を無効化（推論時）
with torch.no_grad():
    val = x ** 2          # 勾配追跡なし

# 計算グラフの構造確認
a = torch.tensor(2.0, requires_grad=True)
b = torch.tensor(3.0, requires_grad=True)
c = a * b + a             # c = a*b + a
c.backward()
print(a.grad)  # dc/da = b + 1 = 4.0
print(b.grad)  # dc/db = a     = 2.0
```

---

## nn.Module でのモデル定義

```python
import torch
import torch.nn as nn
import torch.nn.functional as F

# --- シンプルな全結合ネットワーク ---
class SimpleNet(nn.Module):
    def __init__(self, input_dim: int, hidden_dim: int, output_dim: int):
        super().__init__()
        self.fc1 = nn.Linear(input_dim, hidden_dim)
        self.bn1 = nn.BatchNorm1d(hidden_dim)
        self.fc2 = nn.Linear(hidden_dim, hidden_dim)
        self.fc3 = nn.Linear(hidden_dim, output_dim)
        self.dropout = nn.Dropout(p=0.3)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = F.relu(self.bn1(self.fc1(x)))
        x = self.dropout(x)
        x = F.relu(self.fc2(x))
        x = self.fc3(x)          # 最終層は活性化なし（損失関数側で処理）
        return x

model = SimpleNet(input_dim=784, hidden_dim=256, output_dim=10)
print(model)

# パラメータ数の確認
total_params = sum(p.numel() for p in model.parameters())
trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
print(f"総パラメータ数: {total_params:,}")
print(f"学習可能パラメータ数: {trainable_params:,}")

# --- CNN の例 ---
class SimpleCNN(nn.Module):
    def __init__(self, num_classes: int = 10):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(1, 32, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
        )
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(64 * 7 * 7, 128),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(128, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.features(x)
        return self.classifier(x)
```

---

## 損失関数と最適化器

| 損失関数 | PyTorch クラス | 用途 |
|----------|----------------|------|
| 交差エントロピー | `nn.CrossEntropyLoss` | 多クラス分類 |
| バイナリ交差エントロピー | `nn.BCEWithLogitsLoss` | 二値分類 |
| 平均二乗誤差 | `nn.MSELoss` | 回帰 |
| 平均絶対誤差 | `nn.L1Loss` | 回帰（外れ値に頑健） |
| Huber 損失 | `nn.HuberLoss` | 回帰（MSE と MAE の中間）|

| 最適化器 | クラス | 特徴 |
|---------|--------|------|
| SGD | `optim.SGD` | 基本的な確率的勾配降下法 |
| Adam | `optim.Adam` | 適応学習率・収束が速い |
| AdamW | `optim.AdamW` | Adam + 重み減衰修正 |
| RMSprop | `optim.RMSprop` | RNN に効果的 |

```python
import torch
import torch.nn as nn
import torch.optim as optim
from torch.optim.lr_scheduler import CosineAnnealingLR

model = SimpleCNN(num_classes=10)
device = "cuda" if torch.cuda.is_available() else "cpu"
model = model.to(device)

# 損失関数
criterion = nn.CrossEntropyLoss()

# 最適化器
optimizer = optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)

# 学習率スケジューラ
scheduler = CosineAnnealingLR(optimizer, T_max=50, eta_min=1e-6)
```

---

## 基本的な学習ループ

```python
import torch
from torch.utils.data import DataLoader, TensorDataset

# ダミーデータセット
X = torch.randn(1000, 1, 28, 28)
y = torch.randint(0, 10, (1000,))
dataset = TensorDataset(X, y)
train_size = int(0.8 * len(dataset))
val_size   = len(dataset) - train_size
train_ds, val_ds = torch.utils.data.random_split(dataset, [train_size, val_size])

train_loader = DataLoader(train_ds, batch_size=32, shuffle=True,  num_workers=0)
val_loader   = DataLoader(val_ds,   batch_size=64, shuffle=False, num_workers=0)

def train_one_epoch(model, loader, criterion, optimizer, device):
    model.train()
    total_loss, correct = 0.0, 0
    for X_batch, y_batch in loader:
        X_batch, y_batch = X_batch.to(device), y_batch.to(device)
        optimizer.zero_grad()          # 勾配をリセット
        logits = model(X_batch)        # 順伝播
        loss = criterion(logits, y_batch)
        loss.backward()                # 逆伝播
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()               # パラメータ更新
        total_loss += loss.item() * len(X_batch)
        correct    += (logits.argmax(1) == y_batch).sum().item()
    n = len(loader.dataset)
    return total_loss / n, correct / n

def evaluate(model, loader, criterion, device):
    model.eval()
    total_loss, correct = 0.0, 0
    with torch.no_grad():
        for X_batch, y_batch in loader:
            X_batch, y_batch = X_batch.to(device), y_batch.to(device)
            logits = model(X_batch)
            total_loss += criterion(logits, y_batch).item() * len(X_batch)
            correct    += (logits.argmax(1) == y_batch).sum().item()
    n = len(loader.dataset)
    return total_loss / n, correct / n

# --- メインの学習ループ ---
NUM_EPOCHS = 20
best_val_acc = 0.0

for epoch in range(1, NUM_EPOCHS + 1):
    train_loss, train_acc = train_one_epoch(model, train_loader, criterion, optimizer, device)
    val_loss,   val_acc   = evaluate(model, val_loader, criterion, device)
    scheduler.step()

    print(f"Epoch {epoch:3d} | "
          f"Train Loss: {train_loss:.4f}  Acc: {train_acc:.4f} | "
          f"Val Loss: {val_loss:.4f}  Acc: {val_acc:.4f}")

    # チェックポイント保存
    if val_acc > best_val_acc:
        best_val_acc = val_acc
        torch.save({"epoch": epoch,
                    "model_state_dict": model.state_dict(),
                    "optimizer_state_dict": optimizer.state_dict(),
                    "val_acc": val_acc},
                   "best_model.pt")

# モデルのロード
checkpoint = torch.load("best_model.pt", map_location=device)
model.load_state_dict(checkpoint["model_state_dict"])
```

---

## 使用場面

- 画像分類・物体検出・セグメンテーションなどのコンピュータビジョンタスク
- 自然言語処理（BERT・GPT 系モデルのファインチューニング）
- 強化学習エージェントのポリシーネットワーク実装
- 研究プロトタイプから本番システムへの一貫した開発
- カスタム損失関数や独自アーキテクチャの実験

---

## 参考文献

- [PyTorch 公式ドキュメント](https://pytorch.org/docs/stable/index.html)
- [PyTorch チュートリアル](https://pytorch.org/tutorials/)
- [深層学習 — PyTorch による実装](https://pytorch.org/tutorials/beginner/deep_learning_60min_blitz.html)

<AffiliateBanner site="ml_intro" />
