import AffiliateBanner from '@site/src/components/AffiliateBanner';

# GPT と大規模言語モデル

## GPTと大規模言語モデルとは

> GPT（Generative Pre-trained Transformer）は、OpenAIが2018年に発表した自己回帰型言語モデルです。Transformerのデコーダを積み重ね、大規模コーパスで次トークン予測を学習します。GPT-3以降、モデル規模の拡大（スケーリング）により、明示的なファインチューニングなしに多様なタスクをこなす「創発的能力（Emergent Abilities）」が現れることが発見されました。

---

## 自己回帰型言語モデル

GPTは次の確率分布をモデル化します。

$$P(x_1, x_2, \ldots, x_n) = \prod_{t=1}^{n} P(x_t \mid x_1, \ldots, x_{t-1})$$

```python
from transformers import GPT2Tokenizer, GPT2LMHeadModel
import torch
import torch.nn.functional as F

tokenizer = GPT2Tokenizer.from_pretrained('gpt2')
model = GPT2LMHeadModel.from_pretrained('gpt2')
model.eval()

def calculate_perplexity(text: str) -> float:
    """テキストのパープレキシティを計算（低いほど自然な文）"""
    encodings = tokenizer(text, return_tensors='pt')
    input_ids = encodings['input_ids']
    
    with torch.no_grad():
        outputs = model(input_ids, labels=input_ids)
    
    loss = outputs.loss  # 平均NLLロス
    perplexity = torch.exp(loss).item()
    return perplexity

sentences = [
    "The quick brown fox jumps over the lazy dog.",
    "Machine learning is a powerful technology.",
    "Xyzzy plugh foo bar baz qux corge grault.",  # 無意味な文
    "The cat sat on the mat.",
    "Colorless green ideas sleep furiously.",  # 文法的に正しいが意味不明
]

print("パープレキシティ（低い = より自然な文）:")
for sent in sentences:
    ppl = calculate_perplexity(sent)
    print(f"  PPL={ppl:8.2f}: '{sent}'")
```

---

## テキスト生成の手法

```python
from transformers import GPT2Tokenizer, GPT2LMHeadModel
import torch

tokenizer = GPT2Tokenizer.from_pretrained('gpt2')
tokenizer.pad_token = tokenizer.eos_token
model = GPT2LMHeadModel.from_pretrained('gpt2')
model.eval()

prompt = "Artificial intelligence is"
input_ids = tokenizer.encode(prompt, return_tensors='pt')

print(f"プロンプト: '{prompt}'")
print("=" * 60)

# 1. 貪欲デコード（Greedy Decoding）
with torch.no_grad():
    greedy_output = model.generate(
        input_ids,
        max_new_tokens=30,
        do_sample=False,
    )
text = tokenizer.decode(greedy_output[0], skip_special_tokens=True)
print(f"\n1. 貪欲デコード:\n   {text}")

# 2. ビームサーチ（Beam Search）
with torch.no_grad():
    beam_output = model.generate(
        input_ids,
        max_new_tokens=30,
        num_beams=5,
        no_repeat_ngram_size=2,
        early_stopping=True,
    )
text = tokenizer.decode(beam_output[0], skip_special_tokens=True)
print(f"\n2. ビームサーチ (beams=5):\n   {text}")

# 3. サンプリング（Temperature）
with torch.no_grad():
    sample_output = model.generate(
        input_ids,
        max_new_tokens=30,
        do_sample=True,
        temperature=0.7,  # 低い = 確信度高い選択
        top_k=50,
    )
text = tokenizer.decode(sample_output[0], skip_special_tokens=True)
print(f"\n3. Temperature サンプリング (T=0.7):\n   {text}")

# 4. Top-p（Nucleus）サンプリング
with torch.no_grad():
    topp_output = model.generate(
        input_ids,
        max_new_tokens=30,
        do_sample=True,
        top_p=0.9,    # 累積確率90%の候補から選択
        temperature=1.0,
    )
text = tokenizer.decode(topp_output[0], skip_special_tokens=True)
print(f"\n4. Top-p サンプリング (p=0.9):\n   {text}")
```

---

## GPT-1〜GPT-4の進化

| バージョン | 発表年 | パラメータ数 | コンテキスト長 | 主な革新 |
|---|---|---|---|---|
| GPT-1 | 2018 | 117M | 512 | Transformer事前学習+FT |
| GPT-2 | 2019 | 1.5B | 1024 | Zero-shot学習の実証 |
| GPT-3 | 2020 | 175B | 2048 | In-context Learning |
| InstructGPT | 2022 | 175B | 2048 | RLHF・指示追従 |
| GPT-3.5 | 2022 | ~175B | 4096 | ChatGPT |
| GPT-4 | 2023 | 非公開 | 128K | マルチモーダル・推論 |

```python
# スケーリング則のシミュレーション
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# Chinchilla スケーリング則に基づく近似
# Loss ≈ A / N^a + B / D^b  (N: パラメータ数, D: トークン数)
# Kaplan et al. (2020): N と D は約 N ~ D の比率が最適

model_sizes = {
    'GPT-1': 0.117,
    'GPT-2': 1.5,
    'GPT-3': 175,
    'GPT-4 (推定)': 1000,
    'Claude (推定)': 500,
}

print("GPTシリーズのスケールアップ:")
print(f"{'モデル':20s} {'パラメータ':>12} {'増加倍率':>10}")
print("-" * 45)
prev_size = None
for name, size in model_sizes.items():
    if prev_size:
        ratio = size / prev_size
        print(f"{name:20s} {size:>10.1f}B {ratio:>9.1f}x")
    else:
        print(f"{name:20s} {size:>10.3f}B {'(基準)':>10}")
    prev_size = size

# スケーリング則のプロット
params = np.logspace(8, 12, 100)  # 10^8 〜 10^12
# 近似的なスケーリング則（定性的）
loss = 3.0 / (params / 1e8) ** 0.076  # 簡略化

fig, ax = plt.subplots(figsize=(8, 5))
ax.loglog(params / 1e9, loss, 'b-', linewidth=2, label='Test Loss')
ax.set_xlabel('パラメータ数 (Billions)', fontsize=12)
ax.set_ylabel('テストロス', fontsize=12)
ax.set_title('スケーリング則: パラメータ数と性能の関係', fontsize=13)
ax.grid(True, alpha=0.3, which='both')
ax.legend()
plt.tight_layout()
plt.savefig('scaling_law.png', dpi=100)
print("\nスケーリング則のプロットを保存: scaling_law.png")
```

---

## In-context Learning（ICL）

GPT-3以降の大規模モデルが示す能力で、プロンプト中に少数の例を示すだけで（重みを更新せずに）新しいタスクを解きます。

```python
from transformers import pipeline

# GPT-2を使ったICLのデモ（実際にはGPT-3以上で効果的）
generator = pipeline('text-generation', model='gpt2', max_new_tokens=30)

# Zero-shot
zero_shot_prompt = """Classify the sentiment of the following text as positive or negative.
Text: I love this movie!
Sentiment:"""

# Few-shot（3-shot）
few_shot_prompt = """Classify the sentiment of the following text as positive or negative.

Text: This is wonderful!
Sentiment: Positive

Text: I hate this.
Sentiment: Negative

Text: Amazing experience!
Sentiment: Positive

Text: I love this movie!
Sentiment:"""

print("Zero-shot ICL:")
result = generator(zero_shot_prompt, do_sample=False)
print(result[0]['generated_text'])

print("\nFew-shot ICL (3-shot):")
result = generator(few_shot_prompt, do_sample=False)
print(result[0]['generated_text'])
```

---

## 創発的能力（Emergent Abilities）

小規模モデルでは現れないが、大規模モデルで突然現れる能力のことです。

```python
# 算術推論（Chain-of-Thought が必要）
# 小さなモデルでは解けないが、大規模モデルで突然解ける例

emergent_abilities = {
    "3桁の算術": {
        "threshold": "~1B",
        "example": "123 + 456 = ?",
    },
    "多段階推論": {
        "threshold": "~10B",
        "example": "If A>B and B>C, is A>C?",
    },
    "コード生成": {
        "threshold": "~100B",
        "example": "Write a function to sort a list",
    },
    "論理パズル": {
        "threshold": "~540B",
        "example": "Complex logical deduction tasks",
    },
}

print("創発的能力（スケールで突然現れる能力）:")
print("-" * 60)
for ability, info in emergent_abilities.items():
    print(f"\n能力: {ability}")
    print(f"  出現閾値: {info['threshold']} パラメータ")
    print(f"  例: {info['example']}")

print("\n重要な観察:")
print("  - 能力は段階的ではなく突然（相転移的）に現れる")
print("  - 小規模モデルでは訓練データを増やしても解けない")
print("  - GPT-4等では多くのタスクで人間を超えるレベルに")
```

---

## OpenAI API を使った実装

```python
# openai ライブラリを使ったGPT-4 APIの呼び出し例
# pip install openai

import os
# from openai import OpenAI

# client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

def chat_completion_example():
    """GPT-4 APIの使用例"""
    # response = client.chat.completions.create(
    #     model="gpt-4",
    #     messages=[
    #         {"role": "system", "content": "あなたは親切なアシスタントです。"},
    #         {"role": "user", "content": "機械学習の主要な手法を3つ教えてください。"},
    #     ],
    #     temperature=0.7,
    #     max_tokens=500,
    # )
    # return response.choices[0].message.content
    
    # APIなしのモックレスポンス
    return """機械学習の主要な手法を3つ紹介します：

1. **教師あり学習**：ラベル付きデータを使って予測モデルを学習
2. **教師なし学習**：ラベルなしデータからパターンを発見
3. **強化学習**：環境との相互作用から最適な行動方策を学習"""

print("GPT-4 APIレスポンス例:")
print(chat_completion_example())

# ストリーミングレスポンスの例
def streaming_example():
    """ストリーミングで逐次的にトークンを受信"""
    print("\nストリーミングレスポンスの概念:")
    print("  GPT APIはstream=Trueでトークンを逐次受信できます")
    print("  ユーザー体験が向上し、早期の出力が可能になります")
    
    # 実際のコード（APIキーが必要）:
    code = '''
    stream = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": "Tell me a story"}],
        stream=True,
    )
    for chunk in stream:
        if chunk.choices[0].delta.content:
            print(chunk.choices[0].delta.content, end="", flush=True)
    '''
    print(code)

streaming_example()
```

---

## ローカルLLMの実行

```python
# llama-cpp-python や transformers でローカルLLMを実行

from transformers import AutoTokenizer, AutoModelForCausalLM
import torch

# 小規模モデルでのデモ（GPT-2）
# 実際にはLlama-3, Phi-3, Mistral等のより大きなモデルを使用

def load_and_generate(model_name: str, prompt: str, max_tokens: int = 100):
    """モデルをロードしてテキストを生成"""
    print(f"モデル '{model_name}' をロード中...")
    
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        torch_dtype=torch.float32,
        device_map='auto',
    )
    
    inputs = tokenizer(prompt, return_tensors='pt')
    
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_tokens,
            do_sample=True,
            temperature=0.7,
            top_p=0.9,
            pad_token_id=tokenizer.eos_token_id,
        )
    
    generated = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return generated

# 使用例
prompt = "The future of artificial intelligence is"
result = load_and_generate('gpt2', prompt, max_tokens=50)
print(f"\n生成結果:\n{result}")
```

---

## 使用場面

| ユースケース | モデル選択 | ポイント |
|---|---|---|
| チャットボット | GPT-3.5/4, Claude | RLHF/指示追従が重要 |
| テキスト要約 | GPT-4, Llama-3 | 長コンテキスト対応 |
| コード生成 | GPT-4, CodeLlama | コード特化型が有利 |
| 翻訳 | GPT-4, NLLB | 多言語対応モデル |
| ローカル実行 | Llama-3, Phi-3, Mistral | 量子化で軽量化 |
| RAGシステム | 任意 + 検索DB | ハルシネーション軽減 |

---

## 参考文献

- [Radford et al., GPT-1: Improving Language Understanding by Generative Pre-Training (2018)](https://openai.com/research/language-unsupervised)
- [Brown et al., Language Models are Few-Shot Learners (GPT-3, 2020)](https://arxiv.org/abs/2005.14165)
- [Wei et al., Emergent Abilities of Large Language Models (2022)](https://arxiv.org/abs/2206.07682)
- [Kaplan et al., Scaling Laws for Neural Language Models (2020)](https://arxiv.org/abs/2001.08361)

<AffiliateBanner site="ml_intro" />
