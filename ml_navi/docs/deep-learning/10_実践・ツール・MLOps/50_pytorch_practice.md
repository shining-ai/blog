import AffiliateBanner from '@site/src/components/AffiliateBanner';

# PyTorch 実践

## PyTorch 実践とは

> PyTorch の実践的な使い方では、カスタム Dataset / DataLoader による効率的なデータ読み込み、GPU 利用、モデルの保存・読み込み、TensorBoard / W&B による可視化、そして本番品質の学習ループの実装が中心となる。入門知識をもとに、実際のプロジェクトで使えるスキルを習得する。

## 実践的な主要コンポーネント

| コンポーネント | 役割 |
|------------|------|
| `Dataset` | データの読み込み・前処理ロジックの定義 |
| `DataLoader` | バッチ化・シャッフル・マルチプロセス読み込み |
| `.to(device)` | テンソル・モデルの GPU/CPU 転送 |
| `torch.save` / `torch.load` | モデルのチェックポイント保存・復元 |
| `SummaryWriter` | TensorBoard へのログ書き込み |
| `wandb` | 実験メタデータ・モデルの管理 |

## PyTorch実装

```python
import os
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, random_split
from torchvision import transforms
import numpy as np
from pathlib import Path
from typing import Optional, Tuple

# ==============================
# 1. カスタム Dataset
# ==============================
class TabularDataset(Dataset):
    """CSV など表形式データ用のカスタム Dataset"""

    def __init__(
        self,
        X: np.ndarray,
        y: np.ndarray,
        transform=None,
        target_transform=None,
    ):
        self.X = torch.FloatTensor(X)
        self.y = torch.LongTensor(y)
        self.transform = transform
        self.target_transform = target_transform

    def __len__(self) -> int:
        return len(self.X)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        x, y = self.X[idx], self.y[idx]
        if self.transform:
            x = self.transform(x)
        if self.target_transform:
            y = self.target_transform(y)
        return x, y


class ImageDataset(Dataset):
    """画像ファイルを読み込むカスタム Dataset の雛形"""

    def __init__(self, image_paths: list, labels: list, transform=None):
        self.image_paths = image_paths
        self.labels = labels
        self.transform = transform

    def __len__(self):
        return len(self.image_paths)

    def __getitem__(self, idx):
        from PIL import Image
        image = Image.open(self.image_paths[idx]).convert("RGB")
        label = self.labels[idx]
        if self.transform:
            image = self.transform(image)
        return image, label


# ==============================
# 2. DataLoader の設定
# ==============================
np.random.seed(42)
X = np.random.randn(1000, 20).astype(np.float32)
y = np.random.randint(0, 5, 1000)

dataset = TabularDataset(X, y)

# train / val / test に分割
train_size = int(0.7 * len(dataset))
val_size   = int(0.15 * len(dataset))
test_size  = len(dataset) - train_size - val_size
train_ds, val_ds, test_ds = random_split(
    dataset, [train_size, val_size, test_size],
    generator=torch.Generator().manual_seed(42)
)

train_loader = DataLoader(
    train_ds, batch_size=64, shuffle=True,
    num_workers=0,      # 本番では 2〜4 が典型
    pin_memory=True,    # GPU 転送を高速化
    drop_last=True,     # 最後のバッチがBatchNormに悪影響のある場合に有用
)
val_loader  = DataLoader(val_ds,  batch_size=128, shuffle=False)
test_loader = DataLoader(test_ds, batch_size=128, shuffle=False)

# ==============================
# 3. GPU 利用
# ==============================
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"使用デバイス: {device}")
if device.type == "cuda":
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")


class SimpleClassifier(nn.Module):
    def __init__(self, input_dim: int, n_classes: int):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 128), nn.ReLU(), nn.Dropout(0.3),
            nn.Linear(128, 64),        nn.ReLU(), nn.Dropout(0.3),
            nn.Linear(64, n_classes),
        )

    def forward(self, x):
        return self.net(x)


model = SimpleClassifier(input_dim=20, n_classes=5).to(device)

# ==============================
# 4. モデルの保存と読み込み
# ==============================
CHECKPOINT_DIR = Path("/tmp/checkpoints")
CHECKPOINT_DIR.mkdir(exist_ok=True)

def save_checkpoint(
    model: nn.Module,
    optimizer: optim.Optimizer,
    epoch: int,
    val_loss: float,
    path: Path,
):
    torch.save({
        "epoch": epoch,
        "model_state_dict": model.state_dict(),
        "optimizer_state_dict": optimizer.state_dict(),
        "val_loss": val_loss,
    }, path)
    print(f"  Checkpoint saved: {path}")


def load_checkpoint(
    model: nn.Module,
    optimizer: Optional[optim.Optimizer],
    path: Path,
) -> dict:
    checkpoint = torch.load(path, map_location=device)
    model.load_state_dict(checkpoint["model_state_dict"])
    if optimizer:
        optimizer.load_state_dict(checkpoint["optimizer_state_dict"])
    return checkpoint


# ==============================
# 5. 本番品質の学習ループ
# ==============================
def train_one_epoch(model, loader, criterion, optimizer, device) -> float:
    model.train()
    total_loss, correct, total = 0.0, 0, 0
    for X_batch, y_batch in loader:
        X_batch, y_batch = X_batch.to(device), y_batch.to(device)
        optimizer.zero_grad()
        outputs = model(X_batch)
        loss = criterion(outputs, y_batch)
        loss.backward()
        nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()
        total_loss += loss.item() * len(X_batch)
        correct += (outputs.argmax(1) == y_batch).sum().item()
        total += len(X_batch)
    return total_loss / total, correct / total


def evaluate(model, loader, criterion, device) -> Tuple[float, float]:
    model.eval()
    total_loss, correct, total = 0.0, 0, 0
    with torch.no_grad():
        for X_batch, y_batch in loader:
            X_batch, y_batch = X_batch.to(device), y_batch.to(device)
            outputs = model(X_batch)
            loss = criterion(outputs, y_batch)
            total_loss += loss.item() * len(X_batch)
            correct += (outputs.argmax(1) == y_batch).sum().item()
            total += len(X_batch)
    return total_loss / total, correct / total


criterion = nn.CrossEntropyLoss()
optimizer = optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-2)
scheduler = optim.lr_scheduler.OneCycleLR(
    optimizer, max_lr=1e-2, epochs=20, steps_per_epoch=len(train_loader)
)

# TensorBoard ロギング（インストール済みの場合）
try:
    from torch.utils.tensorboard import SummaryWriter
    writer = SummaryWriter(log_dir="/tmp/runs/experiment_01")
    use_tb = True
except ImportError:
    use_tb = False

best_val_loss = float("inf")
for epoch in range(1, 21):
    train_loss, train_acc = train_one_epoch(
        model, train_loader, criterion, optimizer, device
    )
    val_loss, val_acc = evaluate(model, val_loader, criterion, device)
    scheduler.step()

    if use_tb:
        writer.add_scalars("loss", {"train": train_loss, "val": val_loss}, epoch)
        writer.add_scalars("acc",  {"train": train_acc,  "val": val_acc},  epoch)
        writer.add_scalar("lr", optimizer.param_groups[0]["lr"], epoch)

    if val_loss < best_val_loss:
        best_val_loss = val_loss
        save_checkpoint(
            model, optimizer, epoch, val_loss,
            CHECKPOINT_DIR / "best_model.pt"
        )

    if epoch % 5 == 0:
        print(f"Epoch {epoch:3d}: "
              f"train_loss={train_loss:.4f} acc={train_acc:.4f} | "
              f"val_loss={val_loss:.4f} acc={val_acc:.4f}")

if use_tb:
    writer.close()

# テストデータでの最終評価
ckpt = load_checkpoint(model, None, CHECKPOINT_DIR / "best_model.pt")
test_loss, test_acc = evaluate(model, test_loader, criterion, device)
print(f"\nTest: loss={test_loss:.4f}, acc={test_acc:.4f}")
print(f"Best checkpoint: epoch {ckpt['epoch']}, val_loss={ckpt['val_loss']:.4f}")
```

## 使用場面

- 画像分類・物体検出など大規模データの効率的な読み込み
- GPU を活用した大規模モデルの学習
- 実験のチェックポイント管理と再開
- 学習状況のリアルタイム監視とデバッグ

## 参考文献

- PyTorch 公式ドキュメント: https://pytorch.org/docs/stable/
- Stevens, E., Antiga, L., & Viehmann, T. (2020). *Deep Learning with PyTorch*. Manning.
- PyTorch Lightning: https://lightning.ai/

<AffiliateBanner site="ml_intro" />
