import AffiliateBanner from '@site/src/components/AffiliateBanner';

# BERT

## BERTとは

> BERT（Bidirectional Encoder Representations from Transformers）は、2018年にGoogleが発表した事前学習済み言語モデルです。Transformerのエンコーダを双方向に積み重ね、大規模コーパスでの自己教師あり学習により汎用的な言語表現を獲得します。その後、少量のラベルデータでファインチューニングするだけで、多様なNLPタスクでSoTAを達成しました。

BERTの特徴をBERTより前の手法と比較します。

| 特性 | ELMo | GPT | BERT |
|---|---|---|---|
| アーキテクチャ | 双方向LSTM | Transformerデコーダ | Transformerエンコーダ |
| 文脈方向 | 左→右 + 右→左（別々） | 左→右のみ | 完全双方向 |
| 事前学習タスク | 言語モデル | 言語モデル | MLM + NSP |
| パラメータ数 | 94M | 117M | 110M〜340M |

---

## 事前学習タスク

### マスク言語モデル（MLM: Masked Language Model）

入力トークンの15%をランダムにマスクし、マスクされたトークンを予測します。これにより双方向の文脈を学習します。

```
入力: "The [MASK] sat on the mat"
予測: "cat"
```

```python
from transformers import BertTokenizer, BertForMaskedLM
import torch

# BERTトークナイザとMLMモデルのロード
tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')
model = BertForMaskedLM.from_pretrained('bert-base-uncased')
model.eval()

def predict_masked_token(text: str, top_k: int = 5):
    """マスクされたトークンを予測"""
    inputs = tokenizer(text, return_tensors='pt')
    
    # マスクトークンの位置を特定
    mask_idx = (inputs['input_ids'] == tokenizer.mask_token_id).nonzero(as_tuple=True)[1]
    
    with torch.no_grad():
        outputs = model(**inputs)
    
    # マスク位置のlogitsを取得
    logits = outputs.logits[0, mask_idx, :]
    probs = torch.softmax(logits, dim=-1)
    
    top_probs, top_ids = probs.topk(top_k, dim=-1)
    
    results = []
    for prob, token_id in zip(top_probs[0], top_ids[0]):
        token = tokenizer.convert_ids_to_tokens([token_id.item()])[0]
        results.append((token, prob.item()))
    
    return results

# テスト
examples = [
    "The [MASK] sat on the mat.",
    "Paris is the capital of [MASK].",
    "Machine [MASK] is a subset of artificial intelligence.",
]

for text in examples:
    print(f"入力: '{text}'")
    predictions = predict_masked_token(text)
    for token, prob in predictions:
        print(f"  {token}: {prob:.4f}")
    print()
```

### 次の文予測（NSP: Next Sentence Prediction）

2つの文が連続しているかどうかを二値分類します（BERTv1のみ）。

```python
from transformers import BertTokenizer, BertForNextSentencePrediction
import torch

tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')
model = BertForNextSentencePrediction.from_pretrained('bert-base-uncased')
model.eval()

def predict_next_sentence(sent1: str, sent2: str):
    """sent2がsent1の次の文として自然かを予測"""
    encoding = tokenizer(sent1, sent2, return_tensors='pt')
    
    with torch.no_grad():
        outputs = model(**encoding)
    
    logits = outputs.logits
    probs = torch.softmax(logits, dim=-1)
    
    is_next_prob = probs[0, 0].item()
    not_next_prob = probs[0, 1].item()
    
    return is_next_prob, not_next_prob

examples = [
    ("I love machine learning.", "It is a fascinating field of study."),
    ("I love machine learning.", "The weather is nice today."),
    ("BERT was introduced by Google.", "It uses a Transformer encoder architecture."),
]

print("NSP（次文予測）の結果:")
for sent1, sent2 in examples:
    is_next, not_next = predict_next_sentence(sent1, sent2)
    label = "連続" if is_next > 0.5 else "非連続"
    print(f"\n文1: '{sent1}'")
    print(f"文2: '{sent2}'")
    print(f"  連続確率: {is_next:.4f} → {label}")
```

---

## BERTのアーキテクチャ

```python
from transformers import BertModel, BertConfig
import torch

# BERTの設定を確認
config = BertConfig.from_pretrained('bert-base-uncased')
print("BERT-base 設定:")
print(f"  語彙サイズ: {config.vocab_size:,}")
print(f"  隠れ層サイズ: {config.hidden_size}")
print(f"  Transformerブロック数: {config.num_hidden_layers}")
print(f"  アテンションヘッド数: {config.num_attention_heads}")
print(f"  中間層サイズ: {config.intermediate_size}")
print(f"  最大系列長: {config.max_position_embeddings}")

# パラメータ数の計算
model = BertModel.from_pretrained('bert-base-uncased')
total_params = sum(p.numel() for p in model.parameters())
trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
print(f"\n総パラメータ数: {total_params:,} ({total_params/1e6:.1f}M)")
print(f"学習可能パラメータ数: {trainable_params:,}")
```

### 入力表現の構造

```python
from transformers import BertTokenizer
import torch

tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')

# BERTの入力形式
sentence_a = "Hello, how are you?"
sentence_b = "I am fine, thank you."

encoding = tokenizer(
    sentence_a,
    sentence_b,
    padding='max_length',
    max_length=32,
    truncation=True,
    return_tensors='pt'
)

# トークンの確認
tokens = tokenizer.convert_ids_to_tokens(encoding['input_ids'][0])
print("BERTの入力トークン:")
print(tokens[:20])

print("\n各テンソルの説明:")
print(f"  input_ids      ({encoding['input_ids'].shape}): トークンID")
print(f"  attention_mask ({encoding['attention_mask'].shape}): 実トークン=1, パディング=0")
print(f"  token_type_ids ({encoding['token_type_ids'].shape}): 文A=0, 文B=1")

# 特殊トークン
print("\n特殊トークン:")
print(f"  [CLS]: {tokenizer.cls_token_id} (文の開始・分類用)")
print(f"  [SEP]: {tokenizer.sep_token_id} (文の区切り)")
print(f"  [MASK]: {tokenizer.mask_token_id} (マスク)")
print(f"  [PAD]: {tokenizer.pad_token_id} (パディング)")
```

---

## ファインチューニング

BERTをテキスト分類タスクにファインチューニングします。

```python
from transformers import (
    BertTokenizer, BertForSequenceClassification,
    TrainingArguments, Trainer
)
from torch.utils.data import Dataset
import torch
import numpy as np
from sklearn.metrics import accuracy_score, f1_score

class SentimentDataset(Dataset):
    """感情分析用データセット"""
    def __init__(self, texts, labels, tokenizer, max_length=128):
        self.encodings = tokenizer(
            texts,
            padding='max_length',
            max_length=max_length,
            truncation=True,
            return_tensors='pt'
        )
        self.labels = torch.tensor(labels)

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, idx):
        item = {key: val[idx] for key, val in self.encodings.items()}
        item['labels'] = self.labels[idx]
        return item

# サンプルデータ（実際はより大規模なデータを使用）
train_texts = [
    "This movie is fantastic and amazing!",
    "I really enjoyed this film.",
    "Great story and wonderful acting.",
    "This was a terrible waste of time.",
    "I hated every minute of this movie.",
    "Boring and poorly written script.",
    "Absolutely loved it, would watch again.",
    "The worst movie I've ever seen.",
]
train_labels = [1, 1, 1, 0, 0, 0, 1, 0]  # 1=ポジティブ, 0=ネガティブ

val_texts = [
    "An excellent and thrilling experience.",
    "Not worth watching at all.",
]
val_labels = [1, 0]

# モデルとトークナイザのロード
tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')
model = BertForSequenceClassification.from_pretrained(
    'bert-base-uncased',
    num_labels=2  # 二値分類
)

# データセット作成
train_dataset = SentimentDataset(train_texts, train_labels, tokenizer)
val_dataset = SentimentDataset(val_texts, val_labels, tokenizer)

# 評価指標
def compute_metrics(eval_pred):
    logits, labels = eval_pred
    predictions = np.argmax(logits, axis=-1)
    return {
        'accuracy': accuracy_score(labels, predictions),
        'f1': f1_score(labels, predictions, average='weighted'),
    }

# 学習設定
training_args = TrainingArguments(
    output_dir='./bert_sentiment',
    num_train_epochs=3,
    per_device_train_batch_size=4,
    per_device_eval_batch_size=4,
    learning_rate=2e-5,
    weight_decay=0.01,
    evaluation_strategy='epoch',
    save_strategy='epoch',
    load_best_model_at_end=True,
    logging_steps=10,
    warmup_steps=100,
)

# Trainerの作成と学習
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=val_dataset,
    compute_metrics=compute_metrics,
)

# trainer.train()  # 実際に学習する場合はコメントアウトを外す
print("ファインチューニングの設定が完了しました")
print(f"学習データ数: {len(train_dataset)}")
print(f"検証データ数: {len(val_dataset)}")
```

---

## パイプラインAPIを使った簡易実装

```python
from transformers import pipeline

# 感情分析パイプライン
sentiment_analyzer = pipeline(
    "sentiment-analysis",
    model="distilbert-base-uncased-finetuned-sst-2-english"
)

texts = [
    "I love this product! It's amazing.",
    "This is terrible and disappointing.",
    "The quality is okay, nothing special.",
    "Best purchase I've ever made!",
]

print("感情分析結果:")
for text in texts:
    result = sentiment_analyzer(text)[0]
    print(f"  '{text}'")
    print(f"  → {result['label']}: {result['score']:.4f}")
    print()

# 固有表現認識（NER）
ner_pipeline = pipeline("ner", aggregation_strategy="simple")
ner_text = "Apple Inc. was founded by Steve Jobs in Cupertino, California."
ner_results = ner_pipeline(ner_text)

print("固有表現認識:")
print(f"  テキスト: '{ner_text}'")
for entity in ner_results:
    print(f"  {entity['word']:20s} → {entity['entity_group']} ({entity['score']:.3f})")

# 質問応答
qa_pipeline = pipeline("question-answering")
context = """
BERT is a large language model developed by Google in 2018.
It uses a Transformer encoder architecture and is pre-trained on Wikipedia and BookCorpus.
BERT stands for Bidirectional Encoder Representations from Transformers.
"""
questions = [
    "When was BERT developed?",
    "What does BERT stand for?",
    "What data was BERT trained on?",
]

print("\n質問応答:")
for question in questions:
    result = qa_pipeline(question=question, context=context)
    print(f"  Q: {question}")
    print(f"  A: {result['answer']} (score: {result['score']:.4f})")
```

---

## BERTの派生モデル

| モデル | 特徴 | パラメータ数 |
|---|---|---|
| BERT-base | 標準版 | 110M |
| BERT-large | 大規模版・高精度 | 340M |
| DistilBERT | 知識蒸留で60%小型化 | 66M |
| RoBERTa | NSPを除去・より大規模学習 | 125M |
| ALBERT | パラメータ共有で大幅圧縮 | 12M |
| DeBERTa | Disentangled Attentionで改善 | 184M |
| XLM-R | 多言語対応（100言語） | 270M |

---

## 使用場面

| タスク | アプローチ |
|---|---|
| 文書分類・感情分析 | [CLS]トークンの出力 + 線形層 |
| 固有表現認識（NER） | 各トークンの出力 + 線形層 |
| 質問応答 | 開始/終了位置の予測 |
| 文の類似度 | [CLS]出力 or Sentence-BERTで比較 |
| テキスト生成 | BERTは不向き（GPTが適切） |

**ファインチューニングのコツ:**
- 学習率: 2e-5〜5e-5 が一般的
- エポック数: 3〜5 程度（過学習に注意）
- バッチサイズ: メモリに応じて 16〜32
- Warmup: 全ステップの 10% 程度

---

## 参考文献

- [Devlin et al., BERT: Pre-training of Deep Bidirectional Transformers (2018)](https://arxiv.org/abs/1810.04805)
- [HuggingFace Transformers Documentation](https://huggingface.co/docs/transformers/)
- [The Illustrated BERT by Jay Alammar](https://jalammar.github.io/illustrated-bert/)

<AffiliateBanner site="ml_intro" />
