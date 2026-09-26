import AffiliateBanner from '@site/src/components/AffiliateBanner';

# RNN（再帰型ニューラルネットワーク）

## RNN とは

> RNN（Recurrent Neural Network：再帰型ニューラルネットワーク）とは、**前の時刻の出力を次の時刻の入力に再帰的に利用する**ことで、系列データ（時系列・文章・音声など）を処理するニューラルネットワークである。隠れ状態（Hidden State）がこれまでの文脈情報を保持する「メモリ」の役割を果たす。

---

## 隠れ状態の仕組み

RNN の基本的な計算は以下の通りである。

```
時刻 t における計算:

h_t = tanh(W_hh × h_{t-1} + W_xh × x_t + b_h)
y_t = W_hy × h_t + b_y

記号の説明:
  x_t    : 時刻 t の入力
  h_t    : 時刻 t の隠れ状態（文脈情報）
  h_{t-1}: 直前の隠れ状態
  y_t    : 時刻 t の出力
  W_hh   : 隠れ→隠れの重み行列
  W_xh   : 入力→隠れの重み行列
  W_hy   : 隠れ→出力の重み行列
```

---

## 展開グラフ（Unrolled Graph）

RNN は時間方向に「展開」して表現できる。各時刻で同じ重みを共有している点が特徴である。

```
x_1      x_2      x_3      x_4
 ↓        ↓        ↓        ↓
[RNN] → [RNN] → [RNN] → [RNN]
 ↓        ↓        ↓        ↓
y_1      y_2      y_3      y_4

←────── 同じ重み W_hh, W_xh, W_hy を全時刻で共有 ──────→

h_0 → h_1 → h_2 → h_3 → h_4（隠れ状態の伝播）
```

---

## RNN の入出力パターン

| パターン | 概要 | 応用例 |
|---|---|---|
| one-to-many | 1入力 → 系列出力 | 画像キャプション |
| many-to-one | 系列入力 → 1出力 | 感情分析、文章分類 |
| many-to-many（同期） | 系列入力 → 系列出力（同長） | 品詞タグ付け |
| many-to-many（非同期） | 系列入力 → 系列出力（異長） | 機械翻訳 |

---

## BPTT（Backpropagation Through Time）

RNN の学習では、展開したグラフ全体に対して誤差逆伝播を行う。これを BPTT（時間方向の誤差逆伝播）と呼ぶ。

```
損失関数: L = Σ_t L_t（各時刻の損失の合計）

勾配の計算（時刻 T から t=1 に向かって逆伝播）:
∂L/∂W_hh = Σ_t ∂L_t/∂W_hh

連鎖律により:
∂L_t/∂h_k = ∂L_t/∂h_t × Π_{j=k}^{t-1} ∂h_{j+1}/∂h_j
           = ∂L_t/∂h_t × Π_{j=k}^{t-1} W_hh^T × diag(tanh'(h_j))
```

### Truncated BPTT

長い系列では計算コストと勾配消失の問題があるため、一定のステップ数ごとに勾配の流れを切り詰める手法。

---

## 長期依存の問題と勾配消失

### 勾配消失（Vanishing Gradient）

BPTT で時刻を遡るにつれ、勾配が指数的に小さくなる現象。

```
勾配の伝播: ∂h_t/∂h_1 = Π_{k=1}^{t-1} W_hh × tanh'(h_k)

tanh'(x) の最大値は 1.0（x=0 のとき）
W_hh のスペクトル半径 < 1 → 勾配が消失
W_hh のスペクトル半径 > 1 → 勾配が爆発

例: 重みが 0.9 の場合
  t=10: 0.9^10 ≈ 0.35
  t=50: 0.9^50 ≈ 0.005
  t=100: 0.9^100 ≈ 0.000027  ← ほぼゼロ
```

### 勾配消失の影響

- 遠い過去の情報が学習に反映されなくなる
- 長距離依存関係（例：文の最初の主語と最後の動詞の対応）が学習できない

### 対策

| 問題 | 対策 |
|---|---|
| 勾配消失 | LSTM/GRU、残差接続、勾配クリッピング |
| 勾配爆発 | 勾配クリッピング（gradient clipping） |
| 長期依存 | LSTM/GRU、Attention 機構、Transformer |

---

## PyTorch による実装

### 基本的な RNN モジュール

```python
import torch
import torch.nn as nn


class SimpleRNN(nn.Module):
    """手動実装の RNN セル（仕組みを理解するため）"""
    def __init__(self, input_size: int, hidden_size: int, output_size: int):
        super().__init__()
        self.hidden_size = hidden_size

        # 重み行列
        self.W_xh = nn.Linear(input_size, hidden_size, bias=False)
        self.W_hh = nn.Linear(hidden_size, hidden_size)  # bias を含む
        self.W_hy = nn.Linear(hidden_size, output_size)

    def forward(self, x: torch.Tensor, h0: torch.Tensor = None):
        """
        Args:
            x: [batch, seq_len, input_size]
            h0: [batch, hidden_size] 初期隠れ状態
        Returns:
            outputs: [batch, seq_len, output_size]
            h_n: [batch, hidden_size] 最終隠れ状態
        """
        batch_size, seq_len, _ = x.shape

        if h0 is None:
            h = torch.zeros(batch_size, self.hidden_size, device=x.device)
        else:
            h = h0

        outputs = []
        for t in range(seq_len):
            x_t = x[:, t, :]  # [batch, input_size]
            h = torch.tanh(self.W_xh(x_t) + self.W_hh(h))  # [batch, hidden_size]
            y_t = self.W_hy(h)  # [batch, output_size]
            outputs.append(y_t)

        outputs = torch.stack(outputs, dim=1)  # [batch, seq_len, output_size]
        return outputs, h


# PyTorch の nn.RNN を使用した実装（推奨）
class TextClassifierRNN(nn.Module):
    """RNN を使ったテキスト分類器（many-to-one）"""
    def __init__(self, vocab_size: int, embed_dim: int, hidden_size: int,
                 num_classes: int, num_layers: int = 2, dropout: float = 0.3):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=0)
        self.rnn = nn.RNN(
            input_size=embed_dim,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,     # [batch, seq, feature] 形式
            dropout=dropout if num_layers > 1 else 0,
            bidirectional=False,
        )
        self.dropout = nn.Dropout(dropout)
        self.fc = nn.Linear(hidden_size, num_classes)

    def forward(self, x: torch.Tensor, lengths: torch.Tensor = None):
        """
        Args:
            x: [batch, seq_len] トークンインデックス
            lengths: [batch] 各系列の実際の長さ（パディング対応）
        """
        embedded = self.dropout(self.embedding(x))  # [batch, seq_len, embed_dim]

        if lengths is not None:
            # パディングを無視して効率的に処理
            packed = nn.utils.rnn.pack_padded_sequence(
                embedded, lengths.cpu(), batch_first=True, enforce_sorted=False
            )
            output, h_n = self.rnn(packed)
            output, _ = nn.utils.rnn.pad_packed_sequence(output, batch_first=True)
        else:
            output, h_n = self.rnn(embedded)

        # 最終時刻の隠れ状態を使って分類
        # h_n: [num_layers, batch, hidden_size] → 最終層を取得
        last_hidden = h_n[-1]  # [batch, hidden_size]
        return self.fc(self.dropout(last_hidden))


# 動作確認
vocab_size = 10000
model = TextClassifierRNN(vocab_size=vocab_size, embed_dim=128,
                          hidden_size=256, num_classes=5, num_layers=2)
x = torch.randint(0, vocab_size, (32, 50))  # batch=32, seq_len=50
out = model(x)
print(f"入力: {x.shape}")    # [32, 50]
print(f"出力: {out.shape}")  # [32, 5]
```

### 学習ループ（勾配クリッピング付き）

```python
def train_rnn(model, train_loader, num_epochs=20, max_grad_norm=5.0):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)

    for epoch in range(num_epochs):
        model.train()
        total_loss = 0.0

        for texts, labels in train_loader:
            texts, labels = texts.to(device), labels.to(device)

            optimizer.zero_grad()
            outputs = model(texts)
            loss = criterion(outputs, labels)
            loss.backward()

            # 勾配爆発を防ぐためのクリッピング（重要）
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=max_grad_norm)

            optimizer.step()
            total_loss += loss.item()

        print(f"Epoch {epoch+1}: Loss={total_loss/len(train_loader):.4f}")
```

### 系列生成（language model）の例

```python
class LanguageModelRNN(nn.Module):
    """文字レベルの言語モデル（many-to-many）"""
    def __init__(self, vocab_size: int, embed_dim: int = 64,
                 hidden_size: int = 256, num_layers: int = 2):
        super().__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers

        self.embedding = nn.Embedding(vocab_size, embed_dim)
        self.rnn = nn.RNN(embed_dim, hidden_size, num_layers,
                          batch_first=True, dropout=0.3)
        self.fc = nn.Linear(hidden_size, vocab_size)

    def forward(self, x, h=None):
        embedded = self.embedding(x)
        output, h = self.rnn(embedded, h)
        logits = self.fc(output)  # [batch, seq_len, vocab_size]
        return logits, h

    def generate(self, start_token: int, length: int, temperature: float = 1.0):
        """テキスト生成"""
        self.eval()
        device = next(self.parameters()).device
        x = torch.tensor([[start_token]], device=device)
        h = None
        generated = [start_token]

        with torch.no_grad():
            for _ in range(length):
                logits, h = self.forward(x, h)
                probs = torch.softmax(logits[0, -1] / temperature, dim=-1)
                next_token = torch.multinomial(probs, num_samples=1).item()
                generated.append(next_token)
                x = torch.tensor([[next_token]], device=device)

        return generated
```

---

## 使用場面

- **言語モデル**: 文字・単語レベルのテキスト生成
- **時系列予測**: 株価・気温・センサーデータの予測
- **音声認識**: 音響特徴量の系列処理
- **機械翻訳の前身**: Seq2Seq モデルのエンコーダ・デコーダ
- **楽曲生成**: MIDI データの系列生成

---

## 参考文献

- Rumelhart et al., "Learning representations by back-propagating errors" (1986)
- Hochreiter & Schmidhuber, "Long Short-Term Memory" (1997)
- Bengio et al., "Learning long-term dependencies with gradient descent is difficult" (1994)
- Pascanu et al., "On the difficulty of training recurrent neural networks" (2013)

<AffiliateBanner site="ml_intro" />
