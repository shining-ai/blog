import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Seq2Seq と Attention

## Seq2Seq とは

> Seq2Seq（Sequence-to-Sequence）とは、**任意長の入力系列から任意長の出力系列を生成する**ニューラルネットワークアーキテクチャである。エンコーダが入力系列を固定長のベクトル（Context Vector）に圧縮し、デコーダがそのベクトルから出力系列を生成する。機械翻訳、要約、対話システムなどに応用される。

---

## エンコーダ・デコーダ構造

```
入力: "I love deep learning"

エンコーダ（Encoder）:
  I → [LSTM] → h_1
  love → [LSTM] → h_2
  deep → [LSTM] → h_3
  learning → [LSTM] → h_4 = Context Vector (c)

デコーダ（Decoder）:
  <SOS> + c → [LSTM] → "私"
  "私" + c → [LSTM] → "は"
  "は" + c → [LSTM] → "深層"
  "深層" + c → [LSTM] → "学習"
  "学習" + c → [LSTM] → "が"
  "が" + c → [LSTM] → "好き"
  "好き" + c → [LSTM] → <EOS>

出力: "私は深層学習が好き"
```

### ボトルネック問題

通常の Seq2Seq では、入力系列全体を固定長の Context Vector に圧縮するため、**長い系列で情報が失われる**ボトルネック問題がある。Attention 機構はこの問題を解決する。

---

## Attention 機構

> Attention（注意機構）とは、デコーダが出力を生成する各時刻で**入力のどの部分に注目すべきかを動的に学習する**仕組みである。固定長のContext Vectorに頼らず、入力の全隠れ状態を重み付きで参照できる。

---

## Bahdanau Attention（加法的 Attention）

Bahdanau et al. (2015) が提案したAttention。デコーダの前の隠れ状態と各エンコーダの隠れ状態を比較してスコアを計算する。

```
計算手順（デコーダの時刻 t）:

1. アライメントスコアの計算:
   e_{t,s} = v^T × tanh(W_1 × h_s^enc + W_2 × h_{t-1}^dec)
   （h_s^enc: エンコーダの時刻 s の隠れ状態）
   （h_{t-1}^dec: デコーダの時刻 t-1 の隠れ状態）

2. アテンション重みの計算:
   α_{t,s} = softmax(e_{t,s}) = exp(e_{t,s}) / Σ_s' exp(e_{t,s'})

3. コンテキストベクトルの計算:
   c_t = Σ_s α_{t,s} × h_s^enc

4. デコーダの隠れ状態更新:
   h_t^dec = LSTM(h_{t-1}^dec, [y_{t-1} ; c_t])

5. 出力の生成:
   y_t = softmax(W_y × [h_t^dec ; c_t])
```

---

## Luong Attention（乗法的 Attention）

Luong et al. (2015) が提案した、よりシンプルな Attention。

```
スコア計算（3種類）:

dot:      e_{t,s} = h_t^dec · h_s^enc
general:  e_{t,s} = h_t^dec · W_a · h_s^enc
concat:   e_{t,s} = v^T × tanh(W_a × [h_t^dec ; h_s^enc])

違い:
- Bahdanau: デコーダの前の状態 h_{t-1} を使用
- Luong:    デコーダの現在の状態 h_t を使用
```

| 比較項目 | Bahdanau Attention | Luong Attention |
|---|---|---|
| スコア計算 | 加法的 | 乗法的 |
| 入力状態 | h_{t-1}^dec | h_t^dec |
| パラメータ数 | 多い | 少ない |
| 性能 | 同等〜やや優位 | 同等〜やや優位 |

---

## PyTorch による実装

### Bahdanau Attention の実装

```python
import torch
import torch.nn as nn
import torch.nn.functional as F
import random


class BahdanauAttention(nn.Module):
    """Bahdanau（加法的）Attention"""
    def __init__(self, enc_hidden: int, dec_hidden: int, attn_dim: int):
        super().__init__()
        self.W1 = nn.Linear(enc_hidden, attn_dim)
        self.W2 = nn.Linear(dec_hidden, attn_dim)
        self.v = nn.Linear(attn_dim, 1, bias=False)

    def forward(self, enc_outputs: torch.Tensor, dec_hidden: torch.Tensor):
        """
        Args:
            enc_outputs: [batch, src_len, enc_hidden]
            dec_hidden:  [batch, dec_hidden]
        Returns:
            context:     [batch, enc_hidden]
            attn_weights:[batch, src_len]
        """
        # [batch, src_len, attn_dim]
        energy = torch.tanh(
            self.W1(enc_outputs) + self.W2(dec_hidden).unsqueeze(1)
        )
        scores = self.v(energy).squeeze(-1)  # [batch, src_len]
        attn_weights = F.softmax(scores, dim=1)  # [batch, src_len]

        # コンテキストベクトルの計算
        context = torch.bmm(attn_weights.unsqueeze(1), enc_outputs).squeeze(1)
        return context, attn_weights
```

### Seq2Seq with Attention の完全実装

```python
class Encoder(nn.Module):
    def __init__(self, vocab_size: int, embed_dim: int, hidden_size: int,
                 num_layers: int = 2, dropout: float = 0.3):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=0)
        self.rnn = nn.LSTM(embed_dim, hidden_size, num_layers,
                           batch_first=True, dropout=dropout, bidirectional=True)
        # 双方向 → 単方向への変換
        self.fc_h = nn.Linear(hidden_size * 2, hidden_size)
        self.fc_c = nn.Linear(hidden_size * 2, hidden_size)
        self.dropout = nn.Dropout(dropout)

    def forward(self, src):
        """
        Args:
            src: [batch, src_len]
        Returns:
            enc_outputs: [batch, src_len, hidden*2]
            (h, c): 各 [num_layers, batch, hidden]
        """
        embedded = self.dropout(self.embedding(src))
        enc_outputs, (h_n, c_n) = self.rnn(embedded)

        # 双方向の最終状態を変換（デコーダの初期状態に使用）
        # h_n: [num_layers*2, batch, hidden] → 各層の前後を結合
        h = torch.tanh(self.fc_h(
            torch.cat([h_n[-2], h_n[-1]], dim=1)
        )).unsqueeze(0)
        c = torch.tanh(self.fc_c(
            torch.cat([c_n[-2], c_n[-1]], dim=1)
        )).unsqueeze(0)

        return enc_outputs, (h, c)


class Decoder(nn.Module):
    def __init__(self, vocab_size: int, embed_dim: int, hidden_size: int,
                 enc_hidden: int, dropout: float = 0.3):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=0)
        self.attention = BahdanauAttention(enc_hidden * 2, hidden_size, hidden_size)
        # 入力: [前の出力 + コンテキスト]
        self.rnn = nn.LSTMCell(embed_dim + enc_hidden * 2, hidden_size)
        self.fc_out = nn.Linear(hidden_size + enc_hidden * 2 + embed_dim, vocab_size)
        self.dropout = nn.Dropout(dropout)

    def forward(self, tgt_token, enc_outputs, h, c):
        """
        Args:
            tgt_token: [batch] 現在の入力トークン
            enc_outputs: [batch, src_len, enc_hidden*2]
            h, c: [batch, hidden_size]
        Returns:
            output: [batch, vocab_size]
            h, c:   更新された隠れ状態
            attn_weights: [batch, src_len]
        """
        embedded = self.dropout(self.embedding(tgt_token))  # [batch, embed]
        context, attn_weights = self.attention(enc_outputs, h)

        # LSTM セルの入力: 埋め込み + コンテキスト
        rnn_input = torch.cat([embedded, context], dim=1)
        h, c = self.rnn(rnn_input, (h, c))

        # 出力の計算
        output = self.fc_out(torch.cat([h, context, embedded], dim=1))
        return output, h, c, attn_weights


class Seq2SeqWithAttention(nn.Module):
    def __init__(self, encoder, decoder, tgt_vocab_size: int):
        super().__init__()
        self.encoder = encoder
        self.decoder = decoder
        self.tgt_vocab_size = tgt_vocab_size

    def forward(self, src, tgt, teacher_forcing_ratio: float = 0.5):
        """
        Args:
            src: [batch, src_len]
            tgt: [batch, tgt_len]
            teacher_forcing_ratio: 教師強制の確率
        Returns:
            outputs: [batch, tgt_len, vocab_size]
        """
        batch_size, tgt_len = tgt.shape
        enc_outputs, (h, c) = self.encoder(src)
        h, c = h.squeeze(0), c.squeeze(0)

        outputs = torch.zeros(batch_size, tgt_len, self.tgt_vocab_size,
                              device=src.device)
        input_token = tgt[:, 0]  # <SOS>

        for t in range(1, tgt_len):
            output, h, c, _ = self.decoder(input_token, enc_outputs, h, c)
            outputs[:, t] = output

            # 教師強制: 確率的に正解トークンを次の入力に使う
            use_teacher_forcing = random.random() < teacher_forcing_ratio
            input_token = tgt[:, t] if use_teacher_forcing else output.argmax(1)

        return outputs
```

### ビームサーチによるデコード

```python
def beam_search_decode(model, src, sos_idx, eos_idx, beam_size=5, max_len=50):
    """
    ビームサーチによる推論
    Args:
        src: [1, src_len] 入力系列（バッチサイズ=1）
        beam_size: ビーム幅
    Returns:
        best_sequence: 最もスコアの高い出力系列
    """
    model.eval()
    device = src.device

    with torch.no_grad():
        enc_outputs, (h, c) = model.encoder(src)
        h, c = h.squeeze(0), c.squeeze(0)

        # 各ビーム: (累積スコア, トークン列, h, c)
        beams = [(0.0, [sos_idx], h, c)]
        completed = []

        for _ in range(max_len):
            new_beams = []
            for score, tokens, h, c in beams:
                input_token = torch.tensor([tokens[-1]], device=device)
                output, h_new, c_new, _ = model.decoder(input_token, enc_outputs, h, c)
                log_probs = F.log_softmax(output[0], dim=-1)

                top_scores, top_tokens = log_probs.topk(beam_size)
                for s, t in zip(top_scores, top_tokens):
                    new_score = score + s.item()
                    new_tokens = tokens + [t.item()]
                    if t.item() == eos_idx:
                        completed.append((new_score, new_tokens))
                    else:
                        new_beams.append((new_score, new_tokens, h_new, c_new))

            # 上位 beam_size 個を保持
            new_beams.sort(key=lambda x: x[0] / len(x[1]), reverse=True)
            beams = new_beams[:beam_size]

            if not beams:
                break

        if completed:
            completed.sort(key=lambda x: x[0] / len(x[1]), reverse=True)
            return completed[0][1]
        return beams[0][1]
```

---

## 使用場面

- **機械翻訳**: 原言語の文章から目標言語へ変換
- **文書要約**: 長い文書から短い要約を生成
- **対話システム**: ユーザーの発話に応答を生成
- **コード生成**: 自然言語の仕様からコードを生成
- **音声合成（TTS）**: テキストから音響特徴量を生成

---

## 参考文献

- Sutskever et al., "Sequence to Sequence Learning with Neural Networks" (2014)
- Bahdanau et al., "Neural Machine Translation by Jointly Learning to Align and Translate" (2015)
- Luong et al., "Effective Approaches to Attention-based Neural Machine Translation" (2015)
- Wu et al., "Google's Neural Machine Translation System" (2016)

<AffiliateBanner site="ml_intro" />
