import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 初期化と勾配消失問題

深いニューラルネットワークを訓練する際の大きな課題が「勾配消失・爆発問題」である。初期化戦略と残差接続はこの問題を解決するための重要な手法であり、現代の深層学習の成功を支える基盤技術である。

## 勾配消失・爆発問題とは

> 勾配消失問題は、誤差逆伝播時に勾配が層を遡るにつれて指数的に小さくなり、浅い層のパラメータがほとんど更新されなくなる現象である。逆に勾配爆発は勾配が指数的に大きくなり、学習が発散する問題である。どちらも深いネットワークの学習を困難にする。

---

## 勾配消失・爆発の原因

### 数学的分析

$L$ 層のネットワークで第1層への勾配は：

$$
\frac{\partial L}{\partial W^{(1)}} = \frac{\partial L}{\partial a^{(L)}} \cdot \prod_{l=2}^{L} \left( W^{(l)} \cdot \text{diag}(f'(z^{(l)})) \right)
$$

- 各層の Jacobian の積になる
- $|W^{(l)}|$ が 1 より小さければ消失、大きければ爆発

| 活性化関数 | 勾配の最大値 | 問題 |
|----------|-----------|------|
| Sigmoid | 0.25 | 消失しやすい |
| Tanh | 1.0 | 飽和域で消失 |
| ReLU | 0 or 1 | Dying ReLU |
| ReLU + 適切な初期化 | 1に近い | 比較的安定 |

---

## 重み初期化戦略

### Xavier（Glorot）初期化

Sigmoid・Tanh 用に設計された初期化。

$$
W \sim \mathcal{U}\left(-\sqrt{\frac{6}{n_{\text{in}} + n_{\text{out}}}}, \sqrt{\frac{6}{n_{\text{in}} + n_{\text{out}}}}\right)
$$

または正規分布版：

$$
W \sim \mathcal{N}\left(0, \frac{2}{n_{\text{in}} + n_{\text{out}}}\right)
$$

### He（Kaiming）初期化

ReLU 系用に設計された初期化。

$$
W \sim \mathcal{N}\left(0, \frac{2}{n_{\text{in}}}\right)
$$

- ReLU はニューロンの約半分が不活性化するため、分散を 2 倍にする

```python
import numpy as np
import torch
import torch.nn as nn
import matplotlib.pyplot as plt


# ===== 初期化の比較実験 =====

def simulate_forward_pass(init_name: str, n_layers: int = 20, n_units: int = 512):
    """各初期化方法での順伝播における活性化の分散を計測"""
    np.random.seed(42)
    x = np.random.randn(100, n_units)

    variances = [x.var()]

    for _ in range(n_layers):
        if init_name == "zero":
            W = np.zeros((n_units, n_units))
        elif init_name == "large":
            W = np.random.randn(n_units, n_units) * 1.0  # 大きすぎる初期化
        elif init_name == "small":
            W = np.random.randn(n_units, n_units) * 0.01  # 小さすぎる初期化
        elif init_name == "xavier":
            std = np.sqrt(2.0 / (n_units + n_units))
            W = np.random.randn(n_units, n_units) * std
        elif init_name == "he":
            std = np.sqrt(2.0 / n_units)
            W = np.random.randn(n_units, n_units) * std

        x = x @ W
        x = np.maximum(0, x)   # ReLU
        variances.append(x.var())

    return variances


fig, ax = plt.subplots(figsize=(10, 5))
for name in ["small", "large", "xavier", "he"]:
    variances = simulate_forward_pass(name)
    ax.semilogy(variances, label=name)

ax.set_xlabel("層の深さ")
ax.set_ylabel("活性化の分散（対数スケール）")
ax.set_title("初期化方法による活性化の分散の変化")
ax.legend()
ax.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig("initialization_comparison.png", dpi=150)
plt.show()


# ===== PyTorch での初期化 =====
def init_weights(module: nn.Module, init_type: str = "he"):
    if isinstance(module, nn.Linear):
        if init_type == "xavier":
            nn.init.xavier_uniform_(module.weight)
        elif init_type == "he":
            nn.init.kaiming_uniform_(module.weight, nonlinearity="relu")
        elif init_type == "orthogonal":
            nn.init.orthogonal_(module.weight)
        nn.init.zeros_(module.bias)
    elif isinstance(module, nn.Conv2d):
        nn.init.kaiming_normal_(module.weight, mode="fan_out", nonlinearity="relu")
        if module.bias is not None:
            nn.init.zeros_(module.bias)


model = nn.Sequential(
    nn.Linear(128, 256),
    nn.ReLU(),
    nn.Linear(256, 256),
    nn.ReLU(),
    nn.Linear(256, 10),
)

model.apply(lambda m: init_weights(m, "he"))
print("He 初期化後の重みの標準偏差:")
for name, param in model.named_parameters():
    if "weight" in name:
        print(f"  {name}: std={param.std().item():.4f}")
```

---

## ResNet の残差接続（Residual Connection）

> 残差接続（Skip Connection）は、ある層の入力をその層の出力に直接加算する接続方法で、勾配が深い層まで直接流れることを可能にする。ResNet（He et al., 2016）で導入され、100層を超える超深層ネットワークの学習を初めて実現した。

$$
\mathbf{a}^{(l+2)} = F(\mathbf{a}^{(l)}, \{W^{(l)}, W^{(l+1)}\}) + \mathbf{a}^{(l)}
$$

残差接続がある場合の勾配：

$$
\frac{\partial L}{\partial \mathbf{a}^{(l)}} = \frac{\partial L}{\partial \mathbf{a}^{(l+2)}} \left(1 + \frac{\partial F}{\partial \mathbf{a}^{(l)}}\right)
$$

「+1」の項により、勾配が最低でも 1 以上（元の値）が確保される。

```python
import torch
import torch.nn as nn
import torch.nn.functional as F


class ResidualBlock(nn.Module):
    """残差ブロックの実装"""

    def __init__(self, in_channels: int, out_channels: int, stride: int = 1):
        super().__init__()
        self.conv1 = nn.Conv2d(in_channels, out_channels, kernel_size=3,
                               stride=stride, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(out_channels)
        self.conv2 = nn.Conv2d(out_channels, out_channels, kernel_size=3,
                               stride=1, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(out_channels)

        # 次元が変わる場合はショートカットを射影
        self.shortcut = nn.Sequential()
        if stride != 1 or in_channels != out_channels:
            self.shortcut = nn.Sequential(
                nn.Conv2d(in_channels, out_channels, kernel_size=1,
                          stride=stride, bias=False),
                nn.BatchNorm2d(out_channels),
            )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        identity = x

        out = F.relu(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        out += self.shortcut(identity)   # 残差接続！
        out = F.relu(out)
        return out


class SimpleResNet(nn.Module):
    """シンプルな ResNet"""

    def __init__(self, num_classes: int = 10):
        super().__init__()
        self.conv1 = nn.Conv2d(1, 16, kernel_size=3, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(16)
        self.layer1 = self._make_layer(16, 16, n_blocks=2, stride=1)
        self.layer2 = self._make_layer(16, 32, n_blocks=2, stride=2)
        self.layer3 = self._make_layer(32, 64, n_blocks=2, stride=2)
        self.pool = nn.AdaptiveAvgPool2d(1)
        self.fc = nn.Linear(64, num_classes)

    def _make_layer(self, in_ch, out_ch, n_blocks, stride):
        layers = [ResidualBlock(in_ch, out_ch, stride)]
        for _ in range(1, n_blocks):
            layers.append(ResidualBlock(out_ch, out_ch, stride=1))
        return nn.Sequential(*layers)

    def forward(self, x):
        x = F.relu(self.bn1(self.conv1(x)))
        x = self.layer1(x)
        x = self.layer2(x)
        x = self.layer3(x)
        x = self.pool(x)
        x = x.view(x.size(0), -1)
        return self.fc(x)


model = SimpleResNet(num_classes=10)
x = torch.randn(4, 1, 28, 28)  # MNIST サイズ
print("ResNet 出力形状:", model(x).shape)
print("パラメータ数:", sum(p.numel() for p in model.parameters()))
```

---

## Gradient Clipping

勾配爆発を防ぐために、勾配のノルムが閾値を超えた場合にスケールダウンする手法。

$$
\text{if } \|\mathbf{g}\| > \text{clip\_value}: \quad \mathbf{g} \leftarrow \frac{\text{clip\_value}}{\|\mathbf{g}\|} \mathbf{g}
$$

```python
import torch
import torch.nn as nn
import torch.optim as optim


model = nn.LSTM(input_size=10, hidden_size=64, num_layers=3, batch_first=True)
optimizer = optim.Adam(model.parameters(), lr=1e-3)
criterion = nn.MSELoss()

x = torch.randn(8, 20, 10)   # (batch, seq_len, input_size)
target = torch.randn(8, 20, 64)

for step in range(5):
    optimizer.zero_grad()
    output, _ = model(x)
    loss = criterion(output, target)
    loss.backward()

    # 勾配クリッピング（RNN では特に重要）
    total_norm = torch.nn.utils.clip_grad_norm_(
        model.parameters(), max_norm=1.0
    )
    print(f"Step {step} | Loss: {loss.item():.4f} | Grad norm (before clip): {total_norm:.4f}")
    optimizer.step()
```

---

## 初期化・勾配問題の対策まとめ

| 問題 | 対策 | 具体的な手法 |
|------|------|------------|
| 勾配消失 | 適切な活性化関数 | ReLU、Leaky ReLU |
| 勾配消失 | 残差接続 | ResNet、DenseNet |
| 勾配消失 | 正規化 | Batch Norm、Layer Norm |
| 勾配爆発 | 勾配クリッピング | clip_grad_norm_ |
| 不安定な初期化 | Xavier 初期化 | Sigmoid/Tanh 用 |
| 不安定な初期化 | He 初期化 | ReLU 系用 |

---

## 使用場面

| モデル・タスク | 推奨する初期化 | 推奨する対策 |
|--------------|-------------|------------|
| CNN（ReLU） | He 初期化 | Batch Norm + Residual |
| Transformer | Xavier + 特殊スケーリング | Layer Norm |
| RNN / LSTM | Orthogonal 初期化 | Gradient Clipping |
| 非常に深いネットワーク | He 初期化 | ResNet 構造 |

---

## 参考文献

- Glorot, X., & Bengio, Y. (2010). "Understanding the difficulty of training deep feedforward neural networks." *AISTATS*.
- He, K., et al. (2015). "Delving deep into rectifiers: Surpassing human-level performance on ImageNet classification." *ICCV*.
- He, K., et al. (2016). "Deep residual learning for image recognition." *CVPR*.
- Pascanu, R., Mikolov, T., & Bengio, Y. (2013). "On the difficulty of training recurrent neural networks." *ICML*.

<AffiliateBanner site="ml_intro" />
