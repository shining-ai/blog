import AffiliateBanner from '@site/src/components/AffiliateBanner';

# プロンプトエンジニアリング

## プロンプトエンジニアリングとは

> プロンプトエンジニアリングとは、大規模言語モデル（LLM）から望ましい出力を引き出すために、入力テキスト（プロンプト）を設計・最適化する技術です。モデルの重みを更新せずに性能を向上させる手法であり、Few-shot学習やChain-of-Thoughtなど多様なテクニックが存在します。

---

## プロンプトの基本構造

```python
# プロンプトの構成要素
def build_prompt(
    instruction: str,
    context: str = "",
    examples: list = None,
    query: str = "",
) -> str:
    """構造化プロンプトを構築"""
    parts = []

    # 1. 役割/ペルソナ指定
    parts.append(instruction)

    # 2. コンテキスト（背景情報）
    if context:
        parts.append(f"\nコンテキスト:\n{context}")

    # 3. 例示（Few-shot）
    if examples:
        parts.append("\n例:")
        for i, (inp, out) in enumerate(examples, 1):
            parts.append(f"例{i}:")
            parts.append(f"  入力: {inp}")
            parts.append(f"  出力: {out}")

    # 4. 実際のクエリ
    if query:
        parts.append(f"\n入力: {query}")
        parts.append("出力:")

    return "\n".join(parts)

# 例：感情分析プロンプト
prompt = build_prompt(
    instruction="あなたは感情分析の専門家です。以下のテキストの感情を「ポジティブ」「ネガティブ」「中立」のいずれかで分類してください。",
    examples=[
        ("この製品は素晴らしい！大満足です。", "ポジティブ"),
        ("品質が悪くてがっかりしました。", "ネガティブ"),
        ("商品は説明通りでした。", "中立"),
    ],
    query="配送が早くて助かりました。商品の品質も期待通りです。",
)
print(prompt)
```

---

## Zero-shot プロンプティング

例を与えずに、指示だけでタスクを解かせます。

```python
# Zero-shot の例
zero_shot_prompts = {
    "分類": """
以下のニュース記事を「政治」「経済」「スポーツ」「技術」「エンタメ」に分類してください。
答えはカテゴリ名のみ回答してください。

記事: 「AIスタートアップが10億円の資金調達を発表。次世代の自然言語処理技術の開発に注力する。」
カテゴリ:""",

    "要約": """
以下のテキストを1〜2文で簡潔に要約してください。

テキスト: 「機械学習は、明示的にプログラムすることなく、
データからパターンを学習するAIの一分野です。
コンピュータが経験から自動的に学習し改善する能力を与え、
予測モデルの構築から画像認識まで幅広い応用があります。」

要約:""",

    "翻訳": """
以下の日本語を英語に翻訳してください。

日本語: 「深層学習は機械学習の強力な手法であり、多層のニューラルネットワークを使用します。」
英語:""",
}

for task, prompt in zero_shot_prompts.items():
    print(f"=== Zero-shot: {task} ===")
    print(prompt)
    print()
```

---

## Few-shot プロンプティング

いくつかの例示（shots）をプロンプトに含めることで、モデルの精度を向上させます。

```python
# Few-shot の比較実験

# 0-shot
zero_shot = """テキストの感情を分類してください（ポジティブ/ネガティブ）。

テキスト: 「このレストランは最高でした！」
感情:"""

# 1-shot
one_shot = """テキストの感情を分類してください（ポジティブ/ネガティブ）。

テキスト: 「映画がとても面白かった！」
感情: ポジティブ

テキスト: 「このレストランは最高でした！」
感情:"""

# 3-shot（バランスの取れた例示）
three_shot = """テキストの感情を分類してください（ポジティブ/ネガティブ）。

テキスト: 「映画がとても面白かった！」
感情: ポジティブ

テキスト: 「サービスが悪くて不満です。」
感情: ネガティブ

テキスト: 「スタッフが親切で快適でした。」
感情: ポジティブ

テキスト: 「このレストランは最高でした！」
感情:"""

# Few-shotのベストプラクティス
best_practices = [
    "例の数: 3〜8が一般的（多すぎるとコンテキスト長を圧迫）",
    "例のバランス: 各クラスから均等にサンプリング",
    "例の多様性: エッジケースも含める",
    "例の形式: 実際のクエリと同じ形式で提示",
    "例の順序: ランダムに並べることで順序バイアスを減らす",
]

print("Few-shot プロンプティングのベストプラクティス:")
for i, practice in enumerate(best_practices, 1):
    print(f"  {i}. {practice}")
```

---

## Chain-of-Thought（CoT）プロンプティング

思考ステップを明示することで、複雑な推論タスクの精度を向上させます。

```python
# 標準的な Few-shot（CoTなし）
standard_prompt = """Q: Rogerは5個のテニスボールを持っています。
2缶のテニスボールをさらに買いました。各缶には3個入っています。
今、何個ボールを持っていますか？
A: 11

Q: 食堂には23個のリンゴがありました。
昼食に20個使い、さらに6個購入しました。
リンゴは何個残っていますか？
A:"""

# Chain-of-Thought Few-shot
cot_prompt = """Q: Rogerは5個のテニスボールを持っています。
2缶のテニスボールをさらに買いました。各缶には3個入っています。
今、何個ボールを持っていますか？
A: Rogerは最初5個持っていました。2缶 × 3個/缶 = 6個を購入しました。
5 + 6 = 11個。答えは11。

Q: 食堂には23個のリンゴがありました。
昼食に20個使い、さらに6個購入しました。
リンゴは何個残っていますか？
A: 最初23個ありました。20個使ったので23 - 20 = 3個残りました。
6個購入したので3 + 6 = 9個。答えは9。"""

print("Chain-of-Thought の効果:")
print("  - 数学的推論で精度が大幅向上")
print("  - 論理パズルや多段階推論に特に有効")
print("  - モデルに「考え方の手順」を示す")
```

---

## Zero-shot Chain-of-Thought

「Let's think step by step」（ステップバイステップで考えましょう）という魔法の呪文が、Zero-shot推論を改善します。

```python
# Zero-shot CoT の実装例

def apply_zero_shot_cot(question: str) -> str:
    """Zero-shot CoTプロンプトを生成"""
    cot_trigger = "この問題をステップバイステップで考えましょう。"
    
    return f"""問題: {question}

{cot_trigger}"""

def apply_self_consistency(question: str, n_samples: int = 5) -> str:
    """Self-Consistency: 複数のCoT推論パスで多数決"""
    prompt = f"""問題: {question}

この問題をステップバイステップで考えてください。
{n_samples}通りの異なる解き方で考え、最も多く得られた答えを最終解答としてください。"""
    return prompt

# 算術問題の例
math_problem = "太郎は1時間に15個のリンゴを袋に詰められます。1日8時間働き、週5日間働くとします。4週間で何個のリンゴを詰められますか？"

print("Zero-shot CoT:")
print(apply_zero_shot_cot(math_problem))
print("\nSelf-Consistency:")
print(apply_self_consistency(math_problem))

# Zero-shot CoTの仕組み
steps = [
    "ステップ1（推論）: 'ステップバイステップで考えましょう'を付加",
    "ステップ2（抽出）: 生成された推論から最終答えを抽出",
    "Self-Consistency: 複数の推論パスで多数決（さらに精度向上）",
]
print("\nZero-shot CoTのステップ:")
for step in steps:
    print(f"  - {step}")
```

---

## ReAct（Reasoning + Acting）

推論（Reasoning）と行動（Acting）を交互に行うことで、ツールを使ったエージェント的な問題解決を実現します。

```python
# ReActのプロンプトテンプレート

REACT_SYSTEM_PROMPT = """あなたは問題を解決するエージェントです。
以下のツールを使用できます：

- Search(query): Webを検索して情報を取得
- Calculator(expression): 数式を計算
- Lookup(term): 用語の定義を調べる

形式:
Thought: [問題についての考え]
Action: [ToolName(引数)]
Observation: [ツールの結果]
... (Thought/Action/Observationを繰り返す)
Thought: [最終的な考え]
Answer: [最終回答]
"""

react_example = """
Q: 現在のOpenAIのCEOの年齢と、その人が30歳の時から現在までの年数は？

Thought: OpenAIのCEOが誰かを調べ、その年齢を確認する必要があります。
Action: Search("OpenAI CEO 2024")
Observation: Sam Altmanは2023年末にOpenAIのCEOに復帰しました。

Thought: Sam Altmanの生年月日を調べます。
Action: Lookup("Sam Altman age")
Observation: Sam Altmanは1985年4月22日生まれです。2024年で38歳です。

Thought: 38歳 - 30歳 = 8年前、2024 - 8 = 2016年から現在まで8年間です。
Action: Calculator(2024 - 1985)
Observation: 39

Thought: 2025年では39歳となります。30歳は2015年。2025-2015=10年間です。
Answer: Sam Altmanは2025年時点で約39歳です。彼が30歳（2015年）から現在まで約10年間が経過しています。
"""

print("ReActのプロンプト例:")
print(REACT_SYSTEM_PROMPT)
print("\n実行例:")
print(react_example)
```

---

## プロンプト設計のベストプラクティス

```python
from typing import List, Dict

class PromptTemplate:
    """再利用可能なプロンプトテンプレート"""

    def __init__(self, template: str, input_variables: List[str]):
        self.template = template
        self.input_variables = input_variables

    def format(self, **kwargs) -> str:
        missing = set(self.input_variables) - set(kwargs.keys())
        if missing:
            raise ValueError(f"必要な変数が不足: {missing}")
        return self.template.format(**kwargs)

# テンプレートの定義
classification_template = PromptTemplate(
    template="""あなたは{domain}の専門家です。
以下のテキストを{categories}のいずれかに分類してください。
必ず指定されたカテゴリのみ回答してください。

テキスト: {text}
カテゴリ:""",
    input_variables=["domain", "categories", "text"]
)

# 具体的なプロンプトの生成
prompt = classification_template.format(
    domain="メールフィルタリング",
    categories="「重要」「通常」「スパム」",
    text="おめでとうございます！1億円の宝くじに当選しました！",
)
print("生成されたプロンプト:")
print(prompt)

# ベストプラクティスのまとめ
best_practices = {
    "明確性": [
        "タスクを具体的かつ明確に指定する",
        "曖昧な表現を避け、期待する出力形式を明示する",
        "制約条件（文字数、形式等）を明確にする",
    ],
    "文脈": [
        "必要な背景情報をプロンプトに含める",
        "ロール（役割）を指定してモデルの振る舞いを制御",
        "出力の用途や対象読者を指定する",
    ],
    "例示": [
        "Few-shotで期待する入出力の形式を示す",
        "多様なケースをカバーする例を選ぶ",
        "ネガティブな例（してはいけないこと）も効果的",
    ],
    "反復改善": [
        "プロンプトをバージョン管理する",
        "複数のバリエーションをA/Bテストする",
        "失敗ケースを分析してプロンプトを改善する",
    ],
}

print("\nプロンプト設計のベストプラクティス:")
for category, practices in best_practices.items():
    print(f"\n【{category}】")
    for p in practices:
        print(f"  - {p}")
```

---

## プロンプトの評価フレームワーク

```python
import json
from typing import List, Tuple

def evaluate_prompt(
    prompt_template: PromptTemplate,
    test_cases: List[Tuple[dict, str]],
    model_fn,  # LLMを呼び出す関数
) -> dict:
    """プロンプトの品質を評価"""
    results = []
    
    for inputs, expected in test_cases:
        prompt = prompt_template.format(**inputs)
        # actual = model_fn(prompt)  # 実際のLLM呼び出し
        actual = expected  # モックとして期待値をそのまま返す
        
        results.append({
            "inputs": inputs,
            "expected": expected,
            "actual": actual,
            "correct": actual.strip() == expected.strip(),
        })
    
    accuracy = sum(r["correct"] for r in results) / len(results)
    
    return {
        "accuracy": accuracy,
        "total": len(results),
        "correct": sum(r["correct"] for r in results),
        "results": results,
    }

# プロンプトのバージョン管理
prompt_versions = {
    "v1": PromptTemplate(
        template="分類してください: {text}",
        input_variables=["text"]
    ),
    "v2": PromptTemplate(
        template="以下のテキストの感情を「ポジティブ」「ネガティブ」「中立」で分類: {text}",
        input_variables=["text"]
    ),
    "v3": PromptTemplate(
        template="""感情分析タスク。
ポジティブ: 喜び・満足・称賛を表すテキスト
ネガティブ: 不満・怒り・悲しみを表すテキスト
中立: 事実の記述や感情が中立のテキスト

テキスト: {text}
感情:""",
        input_variables=["text"]
    ),
}

print("プロンプトバージョン比較:")
for version, template in prompt_versions.items():
    example = template.format(text="この製品は期待通りでした。")
    print(f"\n{version}:")
    print(f"  {example}")
```

---

## 使用場面

| テクニック | 適した状況 |
|---|---|
| Zero-shot | 単純なタスク・モデル能力が高い |
| Few-shot | 出力形式の制御・特定ドメイン |
| CoT | 算術・論理推論・多段階問題 |
| Zero-shot CoT | FewShotの例がない推論タスク |
| Self-Consistency | 精度重視・計算コストを許容 |
| ReAct | ツール使用・情報検索が必要 |

---

## 参考文献

- [Wei et al., Chain-of-Thought Prompting (2022)](https://arxiv.org/abs/2201.11903)
- [Kojima et al., Large Language Models are Zero-Shot Reasoners (2022)](https://arxiv.org/abs/2205.11916)
- [Yao et al., ReAct: Synergizing Reasoning and Acting in Language Models (2022)](https://arxiv.org/abs/2210.03629)
- [Prompt Engineering Guide](https://www.promptingguide.ai/)

<AffiliateBanner site="ml_intro" />
