import AffiliateBanner from '@site/src/components/AffiliateBanner';

# テキストの数値表現

## テキストの数値表現とは

> テキストの数値表現とは、文字列データを機械学習モデルが処理できる数値ベクトルに変換する手法の総称です。モデルは文字を直接扱えないため、意味や統計的特性を保ちながらテキストを固定長または可変長のベクトルとして表現します。

テキストを数値に変換する手法は大きく以下に分類されます。

| 手法 | 次元数 | 意味的類似性 | スパース性 |
|---|---|---|---|
| Bag of Words | 語彙サイズ | なし | 高スパース |
| TF-IDF | 語彙サイズ | なし | 高スパース |
| n-gram | n×語彙サイズ | 部分的 | 高スパース |
| 単語埋め込み (Word2Vec等) | 50〜300次元 | あり | 密ベクトル |
| 文埋め込み (BERT等) | 768〜1024次元 | あり | 密ベクトル |

---

## Bag of Words（BoW）

文書中の各単語の出現回数をカウントし、語彙サイズの次元ベクトルとして表現します。語順情報は失われます。

```python
from sklearn.feature_extraction.text import CountVectorizer
import numpy as np

# サンプルコーパス
corpus = [
    "I love machine learning",
    "machine learning is great",
    "I love natural language processing",
    "natural language processing is fun",
]

# CountVectorizerでBoWを作成
vectorizer = CountVectorizer()
X = vectorizer.fit_transform(corpus)

print("語彙:", vectorizer.get_feature_names_out())
print("\nBoW行列（密表現）:")
print(X.toarray())
print(f"\n形状: {X.shape}（文書数 × 語彙サイズ）")
print(f"スパース率: {1 - X.nnz / (X.shape[0] * X.shape[1]):.2%}")
```

**出力例:**
```
語彙: ['fun' 'great' 'is' 'language' 'learning' 'love' 'machine' 'natural' 'processing']

BoW行列:
[[0 0 0 0 1 1 1 0 0]
 [0 1 1 0 1 0 1 0 0]
 [0 0 0 1 0 1 0 1 1]
 [1 0 1 1 0 0 0 1 1]]
```

---

## TF-IDF（Term Frequency-Inverse Document Frequency）

単語の出現頻度（TF）と文書頻度の逆数（IDF）を組み合わせることで、文書を特徴づける重要な単語を高く評価します。

**数式:**

$$\text{TF}(t, d) = \frac{\text{単語 } t \text{ の文書 } d \text{ での出現回数}}{\text{文書 } d \text{ の総単語数}}$$

$$\text{IDF}(t) = \log\left(\frac{N}{1 + \text{df}(t)}\right) + 1$$

$$\text{TF-IDF}(t, d) = \text{TF}(t, d) \times \text{IDF}(t)$$

```python
from sklearn.feature_extraction.text import TfidfVectorizer
import pandas as pd

corpus = [
    "I love machine learning",
    "machine learning is great",
    "I love natural language processing",
    "natural language processing is fun",
]

# TF-IDFベクトル化
tfidf_vectorizer = TfidfVectorizer(norm='l2')  # L2正規化（デフォルト）
X_tfidf = tfidf_vectorizer.fit_transform(corpus)

# 結果をDataFrameで表示
vocab = tfidf_vectorizer.get_feature_names_out()
df_tfidf = pd.DataFrame(X_tfidf.toarray(), columns=vocab,
                         index=[f"Doc{i+1}" for i in range(len(corpus))])

print("TF-IDF行列:")
print(df_tfidf.round(3).to_string())

# IDFの確認（高いIDFほど希少な単語）
idf_df = pd.Series(tfidf_vectorizer.idf_, index=vocab).sort_values(ascending=False)
print("\nIDF値（高い = 希少）:")
print(idf_df.round(3))
```

---

## BoWとTF-IDFの比較実験

```python
from sklearn.datasets import fetch_20newsgroups
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, classification_report
import numpy as np

# 20newsgroupsデータセット（一部）
categories = ['sci.space', 'rec.sport.hockey', 'talk.politics.guns']
train = fetch_20newsgroups(subset='train', categories=categories, remove=('headers', 'footers', 'quotes'))
test = fetch_20newsgroups(subset='test', categories=categories, remove=('headers', 'footers', 'quotes'))

# BoW + Naive Bayes
bow_pipeline = Pipeline([
    ('vectorizer', CountVectorizer(max_features=10000, stop_words='english')),
    ('classifier', MultinomialNB()),
])

# TF-IDF + Naive Bayes
tfidf_pipeline = Pipeline([
    ('vectorizer', TfidfVectorizer(max_features=10000, stop_words='english')),
    ('classifier', MultinomialNB()),
])

for name, pipeline in [("BoW", bow_pipeline), ("TF-IDF", tfidf_pipeline)]:
    pipeline.fit(train.data, train.target)
    predictions = pipeline.predict(test.data)
    acc = accuracy_score(test.target, predictions)
    print(f"\n{name} 精度: {acc:.4f}")
    print(classification_report(test.target, predictions, target_names=categories))
```

---

## n-gram

連続するn個のトークンを1単位として扱い、局所的な語順情報を捉えます。

```python
from sklearn.feature_extraction.text import CountVectorizer

corpus = [
    "natural language processing is fascinating",
    "language processing involves machine learning",
    "machine learning is a powerful technology",
]

# unigram（1-gram）
unigram = CountVectorizer(ngram_range=(1, 1))
# bigram（2-gram）
bigram = CountVectorizer(ngram_range=(2, 2))
# unigram + bigram
uni_bi_gram = CountVectorizer(ngram_range=(1, 2))

for name, vec in [("Unigram", unigram), ("Bigram", bigram), ("Uni+Bigram", uni_bi_gram)]:
    X = vec.fit_transform(corpus)
    print(f"\n{name}:")
    print(f"  語彙サイズ: {len(vec.get_feature_names_out())}")
    print(f"  特徴の例: {vec.get_feature_names_out()[:8]}")
    print(f"  行列形状: {X.shape}")
    print(f"  スパース率: {1 - X.nnz / (X.shape[0] * X.shape[1]):.2%}")
```

---

## スパース表現の問題と対策

```python
import numpy as np
from scipy.sparse import csr_matrix

# スパース問題のシミュレーション
vocab_sizes = [1000, 10000, 100000]
n_docs = 1000

print("スパース表現の課題:")
print("-" * 60)
print(f"{'語彙サイズ':>12} {'行列サイズ':>15} {'メモリ（密）':>12} {'実際の使用語数':>12}")
print("-" * 60)

for vocab_size in vocab_sizes:
    # 平均的な文書では200語程度しか使わない
    avg_words_per_doc = 200
    dense_memory_mb = (n_docs * vocab_size * 8) / (1024 ** 2)  # float64
    print(f"{vocab_size:>12,} {n_docs}×{vocab_size:>10,} {dense_memory_mb:>10.1f}MB {avg_words_per_doc:>12}")

print("\n対策:")
print("1. max_features でよく出現する語のみ使用")
print("2. min_df / max_df で極端な頻度の語を除外")
print("3. 次元削減（SVD/LSA）でコンパクトに表現")
print("4. 単語埋め込みへの移行（Word2Vec, GloVe等）")

# スパース行列の効率的な扱い
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import TruncatedSVD  # LSA（潜在意味解析）

corpus = [
    "I enjoy reading books about machine learning",
    "deep learning is a subset of machine learning",
    "natural language processing uses deep learning",
    "I love books and reading in my free time",
    "neural networks are used in deep learning",
]

# TF-IDF → LSA（次元削減）
vectorizer = TfidfVectorizer()
X_tfidf = vectorizer.fit_transform(corpus)

# SVDで次元削減（LSA: Latent Semantic Analysis）
n_components = 3
svd = TruncatedSVD(n_components=n_components, random_state=42)
X_lsa = svd.fit_transform(X_tfidf)

print(f"\nLSA（潜在意味解析）での次元削減:")
print(f"  元の次元数: {X_tfidf.shape[1]}")
print(f"  削減後の次元数: {X_lsa.shape[1]}")
print(f"  説明分散比: {svd.explained_variance_ratio_.sum():.3f}")
print(f"\n文書ベクトル（{n_components}次元）:")
for i, vec in enumerate(X_lsa):
    print(f"  Doc{i+1}: {vec.round(3)}")
```

---

## 文書類似度計算

```python
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

documents = [
    "Machine learning algorithms learn from data",
    "Deep learning is a type of machine learning",
    "Natural language processing uses neural networks",
    "I love cooking pasta and pizza",
    "Italian cuisine includes pasta and risotto",
]

vectorizer = TfidfVectorizer(stop_words='english')
X = vectorizer.fit_transform(documents)

# コサイン類似度行列
sim_matrix = cosine_similarity(X)

print("文書間コサイン類似度行列:")
labels = [f"Doc{i+1}" for i in range(len(documents))]
print("        " + "  ".join(f"{l:>6}" for l in labels))
for i, (label, row) in enumerate(zip(labels, sim_matrix)):
    print(f"{label}: " + "  ".join(f"{v:>6.3f}" for v in row))

# クエリに最も類似する文書を検索
query = "neural network machine learning"
query_vec = vectorizer.transform([query])
similarities = cosine_similarity(query_vec, X).flatten()

print(f"\nクエリ: '{query}'")
ranked = sorted(enumerate(similarities), key=lambda x: x[1], reverse=True)
for rank, (idx, score) in enumerate(ranked):
    print(f"  {rank+1}位 (score={score:.3f}): {documents[idx]}")
```

---

## 使用場面

| 手法 | 適した用途 |
|---|---|
| BoW | テキスト分類（小規模）・スパム検出 |
| TF-IDF | 情報検索・文書検索エンジン |
| n-gram | 言語モデル・文書分類（語順が重要な場合） |
| LSA/LSI | トピック抽出・文書クラスタリング |
| 単語埋め込み | 意味的類似性・感情分析・下流タスク全般 |

**選択指針:**
- データが少なく解釈性を重視する場合 → TF-IDF
- 語順が重要な場合 → n-gram を追加
- 大規模データで高精度が必要 → 単語/文章埋め込みへ移行

---

## 参考文献

- [scikit-learn: Text Feature Extraction](https://scikit-learn.org/stable/modules/feature_extraction.html#text-feature-extraction)
- [Manning et al., Introduction to Information Retrieval](https://nlp.stanford.edu/IR-book/)
- [Turney & Pantel, From Frequency to Meaning](https://arxiv.org/abs/1003.1141)

<AffiliateBanner site="ml_intro" />
