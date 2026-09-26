import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 単語埋め込み

## 単語埋め込みとは

> 単語埋め込み（Word Embeddings）とは、単語を低次元の密な実数ベクトルで表現する手法です。意味的・文法的に類似した単語は近いベクトル空間に配置されるよう学習されるため、「king - man + woman ≈ queen」のような意味的演算が可能になります。

BoWやTF-IDFによるスパース表現と対比して、単語埋め込みは以下の特性を持ちます。

| 特性 | スパース表現 | 単語埋め込み |
|---|---|---|
| 次元数 | 語彙サイズ（万〜十万） | 50〜300次元 |
| 意味的類似性 | 捉えられない | 捉えられる |
| データ要件 | 少量でも機能 | 大量コーパスが必要 |
| 解釈性 | 高い | 低い |
| 計算効率 | スパースだが高次元 | 密だが低次元 |

---

## Word2Vec

2013年にGoogleが発表した代表的な単語埋め込み手法です。2つのアーキテクチャがあります。

### CBOW（Continuous Bag of Words）

周辺語（コンテキスト）から中心語を予測します。高頻度語の表現が安定します。

```
コンテキスト: ["The", "cat", "_", "on", "the"] → 中心語: "sat"
```

### Skip-gram

中心語から周辺語を予測します。低頻度語の表現が優れています。

```
中心語: "sat" → 周辺語: ["The", "cat", "on", "the"]
```

```python
from gensim.models import Word2Vec
from gensim.utils import simple_preprocess
import numpy as np

# サンプルコーパス（実際には大規模コーパスを使用）
sentences = [
    "the king rules the kingdom",
    "the queen rules the castle",
    "man and woman are human beings",
    "the king is a man",
    "the queen is a woman",
    "paris is the capital of france",
    "london is the capital of england",
    "berlin is the capital of germany",
    "france is a european country",
    "england is a european country",
    "cats and dogs are common pets",
    "a cat is a small animal",
    "a dog is a loyal animal",
]

# 前処理
tokenized = [simple_preprocess(s) for s in sentences]

# Word2Vec モデルの学習（Skip-gram）
model_sg = Word2Vec(
    sentences=tokenized,
    vector_size=50,    # 埋め込み次元数
    window=3,          # コンテキストウィンドウサイズ
    min_count=1,       # 最低出現回数
    sg=1,              # 1=Skip-gram, 0=CBOW
    epochs=200,        # 学習エポック数
    seed=42,
)

# Word2Vec モデルの学習（CBOW）
model_cbow = Word2Vec(
    sentences=tokenized,
    vector_size=50,
    window=3,
    min_count=1,
    sg=0,              # CBOW
    epochs=200,
    seed=42,
)

print("=== Skip-gram モデル ===")
print(f"語彙サイズ: {len(model_sg.wv)}")
print(f"'king' のベクトル（先頭10次元）: {model_sg.wv['king'][:10].round(3)}")

# 意味的類似性
print("\n類似語:")
for word in ['king', 'france', 'cat']:
    similar = model_sg.wv.most_similar(word, topn=3)
    print(f"  '{word}' に近い語: {similar}")

# 意味的演算: king - man + woman ≈ queen
print("\n意味的演算 'king' - 'man' + 'woman':")
result = model_sg.wv.most_similar(positive=['king', 'woman'], negative=['man'], topn=3)
print(f"  結果: {result}")
```

---

## Word2Vec の学習の仕組み

```python
import numpy as np
import torch
import torch.nn as nn
from collections import Counter

# シンプルなSkip-gramの実装（教育用）
class SimpleSkipGram(nn.Module):
    def __init__(self, vocab_size: int, embed_dim: int):
        super().__init__()
        # 入力埋め込み（中心語）
        self.in_embed = nn.Embedding(vocab_size, embed_dim)
        # 出力埋め込み（文脈語）
        self.out_embed = nn.Embedding(vocab_size, embed_dim)

    def forward(self, center_words, context_words):
        # center_words: (batch_size,)
        # context_words: (batch_size,)
        center_vec = self.in_embed(center_words)    # (batch, embed_dim)
        context_vec = self.out_embed(context_words) # (batch, embed_dim)
        # 内積でスコアを計算
        scores = torch.sum(center_vec * context_vec, dim=1)  # (batch,)
        return scores

def build_vocab(sentences):
    """語彙とインデックスの辞書を構築"""
    all_words = [word for sent in sentences for word in sent]
    word_counts = Counter(all_words)
    vocab = {word: idx for idx, (word, _) in enumerate(word_counts.most_common())}
    idx_to_word = {idx: word for word, idx in vocab.items()}
    return vocab, idx_to_word

def generate_skipgram_pairs(sentences, vocab, window=2):
    """Skip-gramの学習ペアを生成"""
    pairs = []
    for sent in sentences:
        indices = [vocab[w] for w in sent if w in vocab]
        for i, center in enumerate(indices):
            for j in range(max(0, i - window), min(len(indices), i + window + 1)):
                if i != j:
                    pairs.append((center, indices[j]))
    return pairs

# ミニデモ
sentences = [
    ["the", "cat", "sat", "on", "the", "mat"],
    ["the", "dog", "lay", "on", "the", "floor"],
    ["cats", "and", "dogs", "are", "pets"],
]
vocab, idx_to_word = build_vocab(sentences)
pairs = generate_skipgram_pairs(sentences, vocab)

model = SimpleSkipGram(vocab_size=len(vocab), embed_dim=10)
optimizer = torch.optim.Adam(model.parameters(), lr=0.01)
criterion = nn.BCEWithLogitsLoss()

# ミニ学習ループ
for epoch in range(100):
    total_loss = 0
    for center, context in pairs:
        center_t = torch.tensor([center])
        context_t = torch.tensor([context])
        label = torch.tensor([1.0])  # 正例

        score = model(center_t, context_t)
        loss = criterion(score, label)
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        total_loss += loss.item()

    if (epoch + 1) % 50 == 0:
        print(f"Epoch {epoch+1}, Loss: {total_loss/len(pairs):.4f}")
```

---

## GloVe（Global Vectors for Word Representation）

スタンフォード大学が2014年に発表した手法です。コーパス全体の共起行列を使い、グローバルな統計情報を活用します。

```python
# GloVeの事前学習済みベクトルを使用
# インストール: pip install gensim

import gensim.downloader as api
import numpy as np

# 事前学習済みGloVeモデルのロード（初回はダウンロードが必要）
# glove_model = api.load("glove-wiki-gigaword-100")  # 100次元、Wikipedia学習済み

# 手動でGloVeベクトルファイルを読み込む例
def load_glove_vectors(filepath: str) -> dict:
    """GloVeのテキスト形式ファイルを読み込む"""
    embeddings = {}
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            values = line.strip().split()
            word = values[0]
            vector = np.array(values[1:], dtype=np.float32)
            embeddings[word] = vector
    return embeddings

# GloVeの特徴：共起統計からの学習
# J(theta) = sum_{i,j} f(X_ij) * (w_i^T * w_j + b_i + b_j - log(X_ij))^2
# X_ij: 単語iとjの共起回数

print("GloVeの仕組み:")
print("  - コーパス全体の共起行列を構築")
print("  - 共起頻度の対数を内積で近似するよう学習")
print("  - ローカル（周辺語）とグローバル（全体統計）両方を活用")
print()

# Gensimでのロード例（実際に使用する場合）
try:
    # 小さなモデルのロード例
    model = api.load("glove-wiki-gigaword-50")
    print("GloVeモデルをロードしました")
    print(f"語彙サイズ: {len(model)}")
    print(f"ベクトル次元: {model.vector_size}")
    # 類似語
    print("'computer'に類似した語:", model.most_similar('computer', topn=5))
except Exception as e:
    print(f"モデルのロードをスキップ: {e}")
    print("（実際の使用時はgensim.downloader.load()でダウンロード）")
```

---

## FastText

Facebookが2016年に発表した手法です。単語をサブワード（文字n-gram）の組み合わせとして表現するため、未知語（OOV）にも対応できます。

```python
from gensim.models import FastText
from gensim.utils import simple_preprocess

sentences = [
    "machine learning algorithms process data efficiently",
    "deep learning neural networks require large datasets",
    "natural language processing analyzes text data",
    "computer vision processes image data",
    "reinforcement learning agents learn through interaction",
    "unsupervised learning discovers patterns in data",
    "supervised learning trains on labeled examples",
    "semi-supervised learning uses both labeled and unlabeled data",
]

tokenized = [simple_preprocess(s) for s in sentences]

# FastTextモデルの学習
ft_model = FastText(
    sentences=tokenized,
    vector_size=50,
    window=3,
    min_count=1,
    min_n=2,        # 最小サブワード長
    max_n=5,        # 最大サブワード長
    epochs=100,
    seed=42,
)

print("=== FastText の特徴 ===")
print("\nサブワードへの分解例:")
word = "learning"
print(f"  '{word}' のサブワード (n=2〜5):")
subwords = [word[i:j] for i in range(len(word)) for j in range(i+2, min(i+6, len(word)+1))]
print(f"  {subwords}")

# 既知語の類似語
print("\n'learning'に類似した語:")
print(ft_model.wv.most_similar('learning', topn=5))

# FastTextの強み：OOV（未知語）にも対応
# （学習データにない単語もサブワードから推定）
unknown_word = "learningz"  # 学習データにない単語
try:
    vec = ft_model.wv[unknown_word]
    print(f"\n未知語 '{unknown_word}' のベクトル: {vec[:5].round(3)}...")
    print("FastTextはサブワードから未知語を推定できます")
except KeyError:
    print(f"'{unknown_word}' は未知語です")
```

---

## 意味的類似性の可視化

```python
import numpy as np
from sklearn.decomposition import PCA
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from gensim.models import Word2Vec
from gensim.utils import simple_preprocess

# 国と首都の関係を可視化
sentences = [
    "paris is the capital city of france",
    "berlin is the capital city of germany",
    "london is the capital city of england",
    "tokyo is the capital city of japan",
    "rome is the capital city of italy",
    "france is a country in europe",
    "germany is a country in europe",
    "england is a country in europe",
    "japan is a country in asia",
    "italy is a country in europe",
    "paris is a beautiful city in europe",
    "berlin is a modern city in germany",
    "london is a historic city in england",
    "tokyo is a large city in japan",
    "rome is an ancient city in italy",
]

tokenized = [simple_preprocess(s) for s in sentences]
model = Word2Vec(tokenized, vector_size=50, window=3, min_count=1,
                 sg=1, epochs=500, seed=42)

words_to_plot = ['paris', 'berlin', 'london', 'tokyo', 'rome',
                 'france', 'germany', 'england', 'japan', 'italy']

# PCAで2次元に削減
vectors = np.array([model.wv[w] for w in words_to_plot if w in model.wv])
valid_words = [w for w in words_to_plot if w in model.wv]

pca = PCA(n_components=2)
reduced = pca.fit_transform(vectors)

# プロット
fig, ax = plt.subplots(figsize=(10, 8))
colors = ['blue'] * 5 + ['red'] * 5  # 首都=青、国=赤

for i, (word, coords) in enumerate(zip(valid_words, reduced)):
    ax.scatter(coords[0], coords[1], c=colors[i], s=100, zorder=3)
    ax.annotate(word, coords, fontsize=11, ha='right',
                xytext=(-5, 5), textcoords='offset points')

ax.set_title('Word2Vec Embeddings (PCA 2D)')
ax.set_xlabel('PC1')
ax.set_ylabel('PC2')
ax.legend(handles=[
    plt.scatter([], [], c='blue', label='Capitals'),
    plt.scatter([], [], c='red', label='Countries'),
])
ax.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig('word_embeddings_pca.png', dpi=100)
print("プロットを保存: word_embeddings_pca.png")

# 意味的演算の確認
print("\n意味的演算（国-首都の関係）:")
for country, capital in [('france', 'paris'), ('germany', 'berlin')]:
    if all(w in model.wv for w in [country, capital, 'tokyo', 'japan']):
        result = model.wv.most_similar(
            positive=[capital, 'japan'],
            negative=[country],
            topn=3
        )
        print(f"  '{capital}' - '{country}' + 'japan' ≈ {result}")
```

---

## 手法の比較

| 手法 | 発表年 | 学習方式 | 特徴 | OOV対応 |
|---|---|---|---|---|
| Word2Vec | 2013 | ローカル（周辺語） | 高速・シンプル | なし |
| GloVe | 2014 | グローバル（共起行列） | 統計情報を活用 | なし |
| FastText | 2016 | サブワード | OOV対応・形態論的 | あり |
| ELMo | 2018 | 双方向LSTM | 文脈依存表現 | あり |
| BERT | 2018 | Transformer | 最高精度・文脈依存 | あり |

---

## 使用場面

| タスク | 推奨手法 |
|---|---|
| テキスト分類（小規模） | 事前学習済みWord2Vec/GloVe |
| 形態論的に豊かな言語（日本語・ドイツ語等） | FastText |
| 文書検索・情報検索 | TF-IDF + 単語埋め込みの組み合わせ |
| 下流タスク全般 | BERT等のTransformerベース |
| リソース制約のある環境 | 軽量なWord2Vec/GloVe |

---

## 参考文献

- [Mikolov et al., Efficient Estimation of Word Representations in Vector Space (2013)](https://arxiv.org/abs/1301.3781)
- [Pennington et al., GloVe: Global Vectors for Word Representation (2014)](https://nlp.stanford.edu/projects/glove/)
- [Bojanowski et al., Enriching Word Vectors with Subword Information (2017)](https://arxiv.org/abs/1607.04606)
- [Gensim Documentation](https://radimrehurek.com/gensim/)

<AffiliateBanner site="ml_intro" />
