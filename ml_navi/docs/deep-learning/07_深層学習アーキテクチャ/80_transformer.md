import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Transformer

## Transformer とは

> Transformer とは、RNN や CNN を一切使わず、**Self-Attention 機構のみで系列データを処理する**アーキテクチャである。並列計算が可能で長距離依存を直接捉えられるため、自然言語処理のみならず画像・音声・科学計算など広範な分野で標準的なアーキテクチャとなっている。

---

## 全体アーキテクチャ

```
入力トークン列: [x_1, x_2, ..., x_n]
         ↓
  Input Embedding
         ↓
  Positional Encoding（+）
         ↓
┌─────────────────────────────────────┐
│         Encoder × N 層               │
│  ┌─────────────────────────────┐    │
│  │ Multi-Head Self-Attention   │    │
│  │     → Add & Norm            │    │
│  │ Feed Forward Network        │    │
│  │     → Add & Norm            │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
         ↓ Memory
┌─────────────────────────────────────┐
│         Decoder × N 層               │
│  ┌─────────────────────────────┐    │
│  │ Masked Multi-Head Self-Attn │    │
│  │     → Add & Norm            │    │
│  │ Multi-Head Cross-Attention  │    │
│  │     → Add & Norm            │    │
│  │ Feed Forward Network        │    │
│  │     → Add & Norm            │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
         ↓
  Linear + Softmax
         ↓
  出力トークン列
```

---

## Self-Attention（自己注意機構）

Self-Attention は系列内の各トークンが他の全トークンとの関係を直接計算することで、長距離依存を効率よく捉える。

### Q・K・V の計算

```
入力: X ∈ R^{n × d_model}

Q (Query)  = X × W_Q  ∈ R^{n × d_k}
K (Key)    = X × W_K  ∈ R^{n × d_k}
V (Value)  = X × W_V  ∈ R^{n × d_v}
```

### Scaled Dot-Product Attention

```
Attention(Q, K, V) = softmax(Q × K^T / √d_k) × V

スケーリング（/ √d_k）の理由:
  d_k が大きくなると Q×K^T の内積が大きくなり、
  softmax の勾配が消失しやすくなるため、
  √d_k で割ることで安定化する

計算量: O(n^2 × d_k)（n はシーケンス長）
```

---

## Multi-Head Attention

複数の Attention ヘッドを並列に実行し、異なる「注目パターン」を同時に学習する。

```
MultiHead(Q, K, V) = Concat(head_1, head_2, ..., head_h) × W_O

head_i = Attention(Q × W_Q^i, K × W_K^i, V × W_V^i)

パラメータ:
  h = ヘッド数（例: 8）
  d_k = d_v = d_model / h（例: 512 / 8 = 64）
```

| ヘッドの例 | 学習する傾向 |
|---|---|
| Head 1 | 構文的依存関係（主語-動詞） |
| Head 2 | 照応関係（代名詞-先行詞） |
| Head 3 | 意味的類似性 |
| Head h | その他の関係パターン |

---

## Positional Encoding

Transformer は順序を持たないため、位置情報を埋め込みに加算する。

```python
# 位置エンコーディングの計算
PE(pos, 2i)   = sin(pos / 10000^(2i / d_model))
PE(pos, 2i+1) = cos(pos / 10000^(2i / d_model))

pos: トークンの位置（0, 1, 2, ...）
i:   次元のインデックス（0, 1, ..., d_model/2 - 1）

特性:
- 各位置に一意のパターンが割り当てられる
- 相対的な位置関係を内積で表現できる
- 任意の長さの系列に対応可能
```

---

## Add & Norm（残差接続と層正規化）

```
Sub-layer の後:
  出力 = LayerNorm(x + SubLayer(x))

残差接続（Residual Connection）:
  勾配消失を防ぎ、深いネットワークの学習を安定化

Layer Normalization:
  バッチではなく、各サンプルの特徴次元で正規化
  系列長が可変でも安定して機能する
```

---

## Feed Forward Network (FFN)

各トークンに独立して適用される 2 層の全結合層。

```
FFN(x) = max(0, x × W_1 + b_1) × W_2 + b_2

パラメータ:
  入力次元: d_model（例: 512）
  中間次元: d_ff（例: 2048、d_model × 4）
```

---

## PyTorch による実装

### Scaled Dot-Product Attention

```python
import torch
import torch.nn as nn
import torch.nn.functional as F
import math


def scaled_dot_product_attention(Q, K, V, mask=None):
    """
    Scaled Dot-Product Attention
    Args:
        Q: [batch, heads, seq_len, d_k]
        K: [batch, heads, seq_len, d_k]
        V: [batch, heads, seq_len, d_v]
        mask: [batch, 1, seq_len, seq_len] or None
    Returns:
        output: [batch, heads, seq_len, d_v]
        attn_weights: [batch, heads, seq_len, seq_len]
    """
    d_k = Q.size(-1)
    scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(d_k)

    if mask is not None:
        scores = scores.masked_fill(mask == 0, float('-inf'))

    attn_weights = F.softmax(scores, dim=-1)
    attn_weights = F.dropout(attn_weights, p=0.1, training=True)
    output = torch.matmul(attn_weights, V)
    return output, attn_weights
```

### Multi-Head Attention

```python
class MultiHeadAttention(nn.Module):
    def __init__(self, d_model: int, num_heads: int, dropout: float = 0.1):
        super().__init__()
        assert d_model % num_heads == 0

        self.d_model = d_model
        self.num_heads = num_heads
        self.d_k = d_model // num_heads

        self.W_Q = nn.Linear(d_model, d_model)
        self.W_K = nn.Linear(d_model, d_model)
        self.W_V = nn.Linear(d_model, d_model)
        self.W_O = nn.Linear(d_model, d_model)
        self.dropout = nn.Dropout(dropout)

    def split_heads(self, x: torch.Tensor) -> torch.Tensor:
        """[batch, seq, d_model] → [batch, heads, seq, d_k]"""
        batch, seq, _ = x.shape
        x = x.view(batch, seq, self.num_heads, self.d_k)
        return x.transpose(1, 2)

    def forward(self, Q, K, V, mask=None):
        Q = self.split_heads(self.W_Q(Q))
        K = self.split_heads(self.W_K(K))
        V = self.split_heads(self.W_V(V))

        attn_out, _ = scaled_dot_product_attention(Q, K, V, mask)

        # [batch, heads, seq, d_k] → [batch, seq, d_model]
        batch, _, seq, _ = attn_out.shape
        attn_out = attn_out.transpose(1, 2).contiguous().view(batch, seq, self.d_model)

        return self.W_O(attn_out)
```

### Positional Encoding

```python
class PositionalEncoding(nn.Module):
    def __init__(self, d_model: int, max_len: int = 5000, dropout: float = 0.1):
        super().__init__()
        self.dropout = nn.Dropout(dropout)

        # PE テーブルの作成
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(
            torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model)
        )
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        pe = pe.unsqueeze(0)  # [1, max_len, d_model]
        self.register_buffer('pe', pe)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """x: [batch, seq_len, d_model]"""
        x = x + self.pe[:, :x.size(1), :]
        return self.dropout(x)
```

### Transformer Encoder Layer

```python
class TransformerEncoderLayer(nn.Module):
    def __init__(self, d_model: int, num_heads: int, d_ff: int, dropout: float = 0.1):
        super().__init__()
        self.self_attn = MultiHeadAttention(d_model, num_heads, dropout)
        self.ffn = nn.Sequential(
            nn.Linear(d_model, d_ff),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(d_ff, d_model),
        )
        self.norm1 = nn.LayerNorm(d_model)
        self.norm2 = nn.LayerNorm(d_model)
        self.dropout = nn.Dropout(dropout)

    def forward(self, x: torch.Tensor, mask=None) -> torch.Tensor:
        # Self-Attention + Add & Norm
        attn_out = self.self_attn(x, x, x, mask)
        x = self.norm1(x + self.dropout(attn_out))

        # FFN + Add & Norm
        ffn_out = self.ffn(x)
        x = self.norm2(x + self.dropout(ffn_out))

        return x


class TransformerEncoder(nn.Module):
    def __init__(self, vocab_size: int, d_model: int = 512, num_heads: int = 8,
                 d_ff: int = 2048, num_layers: int = 6, dropout: float = 0.1):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, d_model, padding_idx=0)
        self.pos_encoding = PositionalEncoding(d_model, dropout=dropout)
        self.layers = nn.ModuleList([
            TransformerEncoderLayer(d_model, num_heads, d_ff, dropout)
            for _ in range(num_layers)
        ])
        self.norm = nn.LayerNorm(d_model)
        self.scale = math.sqrt(d_model)

    def forward(self, x: torch.Tensor, mask=None) -> torch.Tensor:
        """
        Args:
            x: [batch, seq_len] トークンインデックス
        Returns:
            [batch, seq_len, d_model]
        """
        x = self.embedding(x) * self.scale  # スケーリング
        x = self.pos_encoding(x)
        for layer in self.layers:
            x = layer(x, mask)
        return self.norm(x)


# 動作確認
encoder = TransformerEncoder(vocab_size=30000, d_model=512, num_heads=8,
                              d_ff=2048, num_layers=6)
x = torch.randint(1, 30000, (4, 64))   # batch=4, seq_len=64
out = encoder(x)
print(f"入力: {x.shape}")    # [4, 64]
print(f"出力: {out.shape}")  # [4, 64, 512]
```

---

## 計算量の比較

| モデル | 系列長 n に対する計算量 | 長距離依存の最大経路長 |
|---|---|---|
| RNN | O(n) | O(n) |
| CNN（カーネル k） | O(k × n) | O(log_k n) |
| Transformer | O(n^2 × d) | O(1) |

Transformer は計算量は大きいが、**任意の 2 トークン間を 1 ステップで接続できる**点が優れている。

---

## 使用場面

- **自然言語処理**: BERT、GPT、T5 などの基盤モデル
- **画像認識**: Vision Transformer (ViT)
- **音声処理**: Whisper、Wav2Vec2
- **タンパク質構造予測**: AlphaFold2
- **強化学習**: Decision Transformer

---

## 参考文献

- Vaswani et al., "Attention Is All You Need" (2017)
- Devlin et al., "BERT: Pre-training of Deep Bidirectional Transformers" (2019)
- Brown et al., "Language Models are Few-Shot Learners (GPT-3)" (2020)
- Dosovitskiy et al., "An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale" (2020)

<AffiliateBanner site="ml_intro" />
