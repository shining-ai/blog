import AffiliateBanner from '@site/src/components/AffiliateBanner';

# LSTM / GRU

## LSTM とは

> LSTM（Long Short-Term Memory）とは、RNN の勾配消失問題を解決するために設計されたアーキテクチャである。**セル状態（Cell State）とゲート機構**を導入することで、長期にわたる依存関係を選択的に記憶・忘却・出力できるようになる。

---

## LSTM のゲート機構

LSTM には 3 つのゲートと 1 つのセル状態がある。

```
LSTM セルの内部構造（時刻 t）:

入力: x_t（現在の入力）, h_{t-1}（前の隠れ状態）, C_{t-1}（前のセル状態）

─────────────────────────────────────────────────
忘却ゲート（Forget Gate）:
  f_t = σ(W_f × [h_{t-1}, x_t] + b_f)
  → 過去の情報をどれだけ忘れるか（0: 完全忘却, 1: 完全保持）

入力ゲート（Input Gate）:
  i_t = σ(W_i × [h_{t-1}, x_t] + b_i)
  g_t = tanh(W_g × [h_{t-1}, x_t] + b_g)
  → i_t: 新情報をどれだけ書き込むか
  → g_t: 候補となる新情報

セル状態の更新:
  C_t = f_t ⊙ C_{t-1} + i_t ⊙ g_t
  （⊙ は要素積）

出力ゲート（Output Gate）:
  o_t = σ(W_o × [h_{t-1}, x_t] + b_o)
  h_t = o_t ⊙ tanh(C_t)
─────────────────────────────────────────────────
```

### 各ゲートの役割

| ゲート | 記号 | 役割 |
|---|---|---|
| 忘却ゲート | f_t | 過去の記憶をどれだけ保持するか制御 |
| 入力ゲート | i_t | 新しい情報をどれだけ書き込むか制御 |
| セル候補 | g_t | 書き込む候補情報（tanh で -1〜1） |
| 出力ゲート | o_t | セル状態から隠れ状態へ何を出力するか制御 |
| セル状態 | C_t | 長期記憶の本体（勾配が流れやすい） |

---

## GRU（Gated Recurrent Unit）

GRU は LSTM を簡略化したモデルで、ゲート数を削減しながらも同等の性能を発揮する。

```
GRU の計算（時刻 t）:

リセットゲート（Reset Gate）:
  r_t = σ(W_r × [h_{t-1}, x_t] + b_r)
  → 過去の隠れ状態をどれだけ「リセット」するか

更新ゲート（Update Gate）:
  z_t = σ(W_z × [h_{t-1}, x_t] + b_z)
  → 過去の状態をどれだけ引き継ぐか（1 - z_t が新情報の割合）

候補隠れ状態:
  h̃_t = tanh(W_h × [r_t ⊙ h_{t-1}, x_t] + b_h)

隠れ状態の更新:
  h_t = (1 - z_t) ⊙ h_{t-1} + z_t ⊙ h̃_t
```

---

## LSTM vs GRU の比較

| 比較項目 | LSTM | GRU |
|---|---|---|
| ゲート数 | 3（入力・忘却・出力） | 2（リセット・更新） |
| 状態 | C_t（セル）+ h_t（隠れ） | h_t のみ |
| パラメータ数 | 多い | 少ない（約 75%） |
| 計算コスト | 高い | 低い |
| 長期依存性 | 優秀 | ほぼ同等 |
| 小データでの性能 | 過学習しやすい | 汎化しやすい |
| 推奨場面 | 長い系列、十分なデータ | 中〜短い系列、少ないデータ |

---

## BiLSTM（双方向 LSTM）

通常の LSTM は過去から未来方向のみ処理するが、BiLSTM は**順方向と逆方向の両方**を処理し、各時刻で両方向の文脈を利用できる。

```
入力系列: x_1, x_2, x_3, x_4

順方向 LSTM:  →→→→
  h_1^f, h_2^f, h_3^f, h_4^f

逆方向 LSTM:  ←←←←
  h_1^b, h_2^b, h_3^b, h_4^b

出力: h_t = [h_t^f ; h_t^b]（結合）
```

BiLSTM は固有表現認識（NER）、感情分析、品詞タグ付けなどで広く使われる。

---

## PyTorch による実装

### LSTM セルの手動実装

```python
import torch
import torch.nn as nn
import math


class LSTMCell(nn.Module):
    """LSTM セルの手動実装（仕組みを理解するため）"""
    def __init__(self, input_size: int, hidden_size: int):
        super().__init__()
        self.hidden_size = hidden_size
        # 4 つのゲート（i, f, g, o）を一括計算するため hidden_size × 4
        self.W_ih = nn.Linear(input_size, hidden_size * 4)
        self.W_hh = nn.Linear(hidden_size, hidden_size * 4, bias=False)

    def forward(self, x, states):
        """
        Args:
            x: [batch, input_size]
            states: (h_prev, c_prev) それぞれ [batch, hidden_size]
        """
        h_prev, c_prev = states
        gates = self.W_ih(x) + self.W_hh(h_prev)  # [batch, hidden_size * 4]

        # 4 つのゲートに分割
        i, f, g, o = gates.chunk(4, dim=1)

        i = torch.sigmoid(i)   # 入力ゲート
        f = torch.sigmoid(f)   # 忘却ゲート
        g = torch.tanh(g)      # セル候補
        o = torch.sigmoid(o)   # 出力ゲート

        c = f * c_prev + i * g  # セル状態の更新
        h = o * torch.tanh(c)   # 隠れ状態の更新

        return h, (h, c)
```

### nn.LSTM を使ったシーケンス分類

```python
class LSTMClassifier(nn.Module):
    """LSTM を使ったテキスト分類器"""
    def __init__(self, vocab_size: int, embed_dim: int, hidden_size: int,
                 num_classes: int, num_layers: int = 2,
                 bidirectional: bool = True, dropout: float = 0.3):
        super().__init__()
        self.bidirectional = bidirectional
        self.num_directions = 2 if bidirectional else 1

        self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=0)
        self.lstm = nn.LSTM(
            input_size=embed_dim,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=bidirectional,
            dropout=dropout if num_layers > 1 else 0,
        )
        self.dropout = nn.Dropout(dropout)
        # 双方向の場合、出力は hidden_size × 2
        self.fc = nn.Linear(hidden_size * self.num_directions, num_classes)

    def forward(self, x: torch.Tensor):
        """
        Args:
            x: [batch, seq_len] トークンインデックス
        """
        embedded = self.dropout(self.embedding(x))  # [batch, seq, embed]

        # LSTM の出力
        # output: [batch, seq, hidden * num_directions]
        # h_n:    [num_layers * num_directions, batch, hidden]
        # c_n:    [num_layers * num_directions, batch, hidden]
        output, (h_n, c_n) = self.lstm(embedded)

        if self.bidirectional:
            # 順方向・逆方向の最終隠れ状態を結合
            h_forward = h_n[-2]   # [batch, hidden]
            h_backward = h_n[-1]  # [batch, hidden]
            last_hidden = torch.cat([h_forward, h_backward], dim=1)
        else:
            last_hidden = h_n[-1]  # [batch, hidden]

        return self.fc(self.dropout(last_hidden))


# 確認
model = LSTMClassifier(
    vocab_size=20000, embed_dim=128, hidden_size=256,
    num_classes=5, num_layers=2, bidirectional=True
)
x = torch.randint(1, 20000, (16, 100))  # batch=16, seq_len=100
out = model(x)
print(f"入力: {x.shape}")    # [16, 100]
print(f"出力: {out.shape}")  # [16, 5]
```

### GRU の実装

```python
class GRUClassifier(nn.Module):
    """GRU を使ったシーケンス分類器"""
    def __init__(self, vocab_size: int, embed_dim: int, hidden_size: int,
                 num_classes: int, num_layers: int = 2, dropout: float = 0.3):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=0)
        self.gru = nn.GRU(
            input_size=embed_dim,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=True,
            dropout=dropout if num_layers > 1 else 0,
        )
        self.dropout = nn.Dropout(dropout)
        self.fc = nn.Linear(hidden_size * 2, num_classes)

    def forward(self, x):
        embedded = self.dropout(self.embedding(x))
        output, h_n = self.gru(embedded)  # LSTM と異なり (h_n, c_n) ではなく h_n のみ

        # 双方向最終隠れ状態の結合
        last_hidden = torch.cat([h_n[-2], h_n[-1]], dim=1)
        return self.fc(self.dropout(last_hidden))
```

### LSTM による時系列予測

```python
class LSTMForecaster(nn.Module):
    """時系列予測モデル（多変量→多ステップ先予測）"""
    def __init__(self, input_size: int, hidden_size: int = 128,
                 num_layers: int = 2, forecast_horizon: int = 24):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers,
                            batch_first=True, dropout=0.2)
        self.fc = nn.Sequential(
            nn.Linear(hidden_size, 64),
            nn.ReLU(),
            nn.Linear(64, forecast_horizon),
        )

    def forward(self, x):
        """
        Args:
            x: [batch, seq_len, input_size] 過去の観測値
        Returns:
            [batch, forecast_horizon] 未来の予測値
        """
        output, (h_n, _) = self.lstm(x)
        last_output = output[:, -1, :]  # 最終時刻の出力 [batch, hidden]
        return self.fc(last_output)


# 学習例
model = LSTMForecaster(input_size=7, hidden_size=128, forecast_horizon=24)
x = torch.randn(32, 168, 7)  # batch=32, past 168 時間, 7 変数
pred = model(x)
print(f"予測: {pred.shape}")  # [32, 24]（24時間先予測）
```

---

## 使用場面

- **自然言語処理**: テキスト分類、感情分析、固有表現認識
- **機械翻訳**: Seq2Seq モデルのエンコーダ・デコーダ
- **音声認識**: 音響モデルの系列処理
- **時系列予測**: 気象予報、需要予測、異常検知
- **生命科学**: タンパク質・DNA 配列の解析

---

## 参考文献

- Hochreiter & Schmidhuber, "Long Short-Term Memory" (1997)
- Cho et al., "Learning Phrase Representations using RNN Encoder–Decoder for Statistical Machine Translation" (2014)
- Chung et al., "Empirical Evaluation of Gated Recurrent Neural Networks on Sequence Modeling" (2014)
- Graves et al., "Hybrid computing using a neural network with dynamic external memory" (2016)

<AffiliateBanner site="ml_intro" />
