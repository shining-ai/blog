import AffiliateBanner from '@site/src/components/AffiliateBanner';

# テキスト前処理

## テキスト前処理とは

> テキスト前処理とは、自然言語テキストを機械学習モデルや分析ツールが扱いやすい形式に変換するための一連の処理のことです。生テキストには不要な文字・記号・揺れが含まれるため、これらを標準化・削除・変換することで、後続のモデルの精度と効率を高めます。

自然言語処理（NLP）においてテキスト前処理は最初のステップであり、全体の品質を左右する重要な工程です。主な処理として以下のものがあります。

| 処理名 | 概要 | 例 |
|---|---|---|
| トークン化 | テキストを単語・文字などの単位に分割 | "I love NLP" → ["I", "love", "NLP"] |
| ステミング | 単語を語幹形に変換（簡易的） | "running" → "run" |
| レンマタイゼーション | 単語を辞書形（見出し語）に変換 | "better" → "good" |
| ストップワード除去 | 意味を持たない頻出語の除去 | "the", "is", "a" を除去 |
| 正規化 | 大文字小文字統一・記号除去・スペル修正 | "NLP!!" → "nlp" |

---

## トークン化（Tokenization）

テキストを意味のある最小単位（トークン）に分割します。英語では空白区切りが基本ですが、日本語では形態素解析が必要です。

```python
import re
from nltk.tokenize import word_tokenize, sent_tokenize
import nltk

nltk.download('punkt', quiet=True)
nltk.download('punkt_tab', quiet=True)

text = "Natural Language Processing is amazing! Let's learn NLP step by step."

# 単語トークン化
word_tokens = word_tokenize(text)
print("単語トークン:", word_tokens)
# ['Natural', 'Language', 'Processing', 'is', 'amazing', '!', 'Let', "'s", 'learn', 'NLP', 'step', 'by', 'step', '.']

# 文トークン化
sent_tokens = sent_tokenize(text)
print("文トークン:", sent_tokens)
# ['Natural Language Processing is amazing!', "Let's learn NLP step by step."]

# 正規表現を使ったシンプルなトークン化
simple_tokens = re.findall(r'\b\w+\b', text.lower())
print("シンプルトークン:", simple_tokens)
```

---

## ステミング（Stemming）

語尾変化を除去して語幹を得る処理です。ルールベースで高速ですが、必ずしも正しい原形になるとは限りません。

```python
from nltk.stem import PorterStemmer, SnowballStemmer
import nltk

ps = PorterStemmer()
ss = SnowballStemmer("english")

words = ["running", "runs", "ran", "easily", "fairly", "studies", "studying", "better"]

print("Porter Stemmer:")
for word in words:
    print(f"  {word} → {ps.stem(word)}")

print("\nSnowball Stemmer:")
for word in words:
    print(f"  {word} → {ss.stem(word)}")
```

**出力例:**
```
Porter Stemmer:
  running → run
  runs → run
  ran → ran        ← 不規則変化は対応不可
  easily → easili  ← 必ずしも正しくない
  studies → studi
  better → better
```

---

## レンマタイゼーション（Lemmatization）

辞書情報と品詞タグを使って正確な見出し語に変換します。ステミングより精度が高く、意味的に正確です。

```python
from nltk.stem import WordNetLemmatizer
from nltk.corpus import wordnet
import nltk

nltk.download('wordnet', quiet=True)
nltk.download('averaged_perceptron_tagger', quiet=True)
nltk.download('averaged_perceptron_tagger_eng', quiet=True)

lemmatizer = WordNetLemmatizer()

# 品詞を指定することで精度が向上
examples = [
    ("running", wordnet.VERB),
    ("better", wordnet.ADJ),
    ("studies", wordnet.NOUN),
    ("studies", wordnet.VERB),
    ("ran", wordnet.VERB),
    ("wolves", wordnet.NOUN),
]

print("Lemmatization（品詞指定あり）:")
for word, pos in examples:
    lemma = lemmatizer.lemmatize(word, pos=pos)
    print(f"  {word} ({pos}) → {lemma}")

# 品詞タグを自動取得してレンマタイゼーション
def get_wordnet_pos(treebank_tag):
    """Penn Treebank品詞タグをWordNet品詞に変換"""
    if treebank_tag.startswith('J'):
        return wordnet.ADJ
    elif treebank_tag.startswith('V'):
        return wordnet.VERB
    elif treebank_tag.startswith('N'):
        return wordnet.NOUN
    elif treebank_tag.startswith('R'):
        return wordnet.ADV
    else:
        return wordnet.NOUN  # デフォルト

def lemmatize_sentence(sentence):
    tokens = nltk.word_tokenize(sentence)
    pos_tags = nltk.pos_tag(tokens)
    lemmas = [
        lemmatizer.lemmatize(token, get_wordnet_pos(tag))
        for token, tag in pos_tags
    ]
    return lemmas

sentence = "The children were running and playing in the gardens"
print("\n文のレンマタイゼーション:")
print(f"  入力: {sentence}")
print(f"  出力: {lemmatize_sentence(sentence)}")
```

---

## ストップワード除去（Stop Word Removal）

"the", "is", "and" などの意味的に薄い高頻度語を除去します。

```python
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
import nltk

nltk.download('stopwords', quiet=True)

stop_words = set(stopwords.words('english'))

text = "This is a simple example showing stop word removal in natural language processing"
tokens = word_tokenize(text.lower())

filtered_tokens = [w for w in tokens if w not in stop_words and w.isalpha()]

print("元のトークン:", tokens)
print("フィルタ後:", filtered_tokens)
print(f"\n除去されたトークン数: {len(tokens) - len(filtered_tokens)}")

# 英語ストップワードの一部
print("\n主なストップワード（先頭20語）:", sorted(list(stop_words))[:20])
```

---

## テキスト正規化（Text Normalization）

大文字小文字の統一、記号除去、数値の正規化、スペルの修正など多様な処理を含みます。

```python
import re
import unicodedata

def normalize_text(text: str) -> str:
    """テキスト正規化のパイプライン"""
    # Unicode正規化（NFKC: 全角→半角、合字展開など）
    text = unicodedata.normalize('NFKC', text)

    # 小文字化
    text = text.lower()

    # URLの除去
    text = re.sub(r'https?://\S+|www\.\S+', '', text)

    # メールアドレスの除去
    text = re.sub(r'\S+@\S+', '', text)

    # HTMLタグの除去
    text = re.sub(r'<[^>]+>', '', text)

    # 数字を<NUM>に置換（任意）
    text = re.sub(r'\d+', '<NUM>', text)

    # 記号・特殊文字の除去（アルファベット・スペース・<>のみ残す）
    text = re.sub(r"[^a-z\s<>]", ' ', text)

    # 複数スペースを1つに
    text = re.sub(r'\s+', ' ', text).strip()

    return text

# テスト
examples = [
    "Hello World!!! Visit https://example.com for MORE INFO.",
    "Contact us at info@example.com or call 123-456-7890",
    "<p>This is <b>HTML</b> content with éncodings</p>",
    "Ａｅｓｔｈｅｔｉｃ　ｔｅｘｔ　ｗｉｔｈ　ｆｕｌｌｗｉｄｔｈ　ｃｈａｒｓ",
]

for text in examples:
    print(f"入力: {text}")
    print(f"出力: {normalize_text(text)}")
    print()
```

---

## 完全な前処理パイプライン

```python
from dataclasses import dataclass, field
from typing import List, Optional
import re
import unicodedata
from nltk.tokenize import word_tokenize
from nltk.stem import WordNetLemmatizer
from nltk.corpus import stopwords, wordnet
import nltk

# 必要なリソースをダウンロード
for resource in ['punkt', 'wordnet', 'stopwords', 'averaged_perceptron_tagger',
                  'punkt_tab', 'averaged_perceptron_tagger_eng']:
    nltk.download(resource, quiet=True)

@dataclass
class TextPreprocessor:
    """テキスト前処理パイプライン"""
    lowercase: bool = True
    remove_urls: bool = True
    remove_html: bool = True
    remove_numbers: bool = False
    remove_punctuation: bool = True
    remove_stopwords: bool = True
    lemmatize: bool = True
    min_token_length: int = 2
    language: str = 'english'

    def __post_init__(self):
        self.lemmatizer = WordNetLemmatizer()
        self.stop_words = set(stopwords.words(self.language))

    def _get_wordnet_pos(self, tag: str) -> str:
        mapping = {'J': wordnet.ADJ, 'V': wordnet.VERB,
                   'N': wordnet.NOUN, 'R': wordnet.ADV}
        return mapping.get(tag[0], wordnet.NOUN)

    def preprocess(self, text: str) -> List[str]:
        # Unicode正規化
        text = unicodedata.normalize('NFKC', text)

        if self.remove_html:
            text = re.sub(r'<[^>]+>', ' ', text)
        if self.remove_urls:
            text = re.sub(r'https?://\S+|www\.\S+', ' ', text)
        if self.lowercase:
            text = text.lower()
        if self.remove_numbers:
            text = re.sub(r'\d+', ' ', text)
        if self.remove_punctuation:
            text = re.sub(r'[^\w\s]', ' ', text)

        text = re.sub(r'\s+', ' ', text).strip()

        # トークン化
        tokens = word_tokenize(text)

        # 長さフィルタ
        tokens = [t for t in tokens if len(t) >= self.min_token_length]

        # ストップワード除去
        if self.remove_stopwords:
            tokens = [t for t in tokens if t not in self.stop_words]

        # レンマタイゼーション
        if self.lemmatize:
            pos_tags = nltk.pos_tag(tokens)
            tokens = [
                self.lemmatizer.lemmatize(token, self._get_wordnet_pos(tag))
                for token, tag in pos_tags
            ]

        return tokens

    def preprocess_batch(self, texts: List[str]) -> List[List[str]]:
        return [self.preprocess(text) for text in texts]


# 使用例
preprocessor = TextPreprocessor()

texts = [
    "Machine learning is transforming industries! Visit https://ml.example.com",
    "The dogs were running quickly in the park yesterday.",
    "NLP techniques include tokenization, stemming, and lemmatization.",
]

for text in texts:
    tokens = preprocessor.preprocess(text)
    print(f"入力: {text}")
    print(f"出力: {tokens}")
    print()
```

---

## 日本語テキスト前処理

日本語は単語間にスペースがないため、形態素解析ライブラリが必要です。

```python
# MeCabを使った日本語前処理（インストール: pip install mecab-python3 unidic-lite）
# import MeCab
# tagger = MeCab.Tagger()
# result = tagger.parse("自然言語処理は面白い技術です")

# janomeを使った日本語前処理（インストール: pip install janome）
from janome.tokenizer import Tokenizer

tokenizer = Tokenizer()

text = "自然言語処理は機械学習の重要な分野です。テキストの前処理が重要です。"

# 形態素解析
tokens = []
stop_pos = {'助詞', '助動詞', '記号', '接続詞'}  # 除去する品詞

for token in tokenizer.tokenize(text):
    pos = token.part_of_speech.split(',')[0]  # 品詞（大分類）
    if pos not in stop_pos and token.surface != '。':
        # 基本形（原形）を使用
        base_form = token.base_form if token.base_form != '*' else token.surface
        tokens.append(base_form)

print("形態素解析結果:", tokens)
```

---

## 使用場面

| 用途 | 推奨する前処理 |
|---|---|
| 文書分類・感情分析 | トークン化 + ストップワード除去 + レンマタイゼーション |
| 情報検索 | 正規化 + ステミングまたはレンマタイゼーション |
| 文書類似度計算 | TF-IDF用にストップワード除去 + 正規化 |
| 深層学習（BERT等） | 最小限の正規化のみ（モデル側でサブワードトークン化） |
| テキスト生成 | ほぼ生テキストのまま（大文字/記号は保持） |

**注意点:**
- BERTなどの事前学習済みモデルでは過度な前処理は逆効果
- ドメインによってストップワードリストをカスタマイズする
- 日本語は形態素解析器の選択（MeCab/Janome/Sudachi）が品質を左右する

---

## 参考文献

- [NLTK Documentation](https://www.nltk.org/)
- [spaCy: Industrial-strength NLP](https://spacy.io/)
- [Jurafsky & Martin, Speech and Language Processing](https://web.stanford.edu/~jurafsky/slp3/)
- [Janome Documentation](https://mocobeta.github.io/janome/)

<AffiliateBanner site="ml_intro" />
