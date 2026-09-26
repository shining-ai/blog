import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 有限オートマトン（DFA）

## 有限オートマトン（DFA）とは

> 決定性有限オートマトン（DFA: Deterministic Finite Automaton）とは、有限個の状態と遷移関数を持つ最も基本的な計算モデルであり、入力文字列を1文字ずつ読みながら状態を遷移させ、受理状態で終わるかどうかで言語を認識する機械である。

DFA は形式言語理論の出発点となる計算モデルです。DFA は以下の5要素の組 (Q, Σ, δ, q0, F) で定義されます。Q は有限の状態集合、Σ は入力アルファベット（有限の記号集合）、δ: Q × Σ → Q は遷移関数、q0 ∈ Q は初期状態、F ⊆ Q は受理状態の集合です。

「決定性」とは、各状態と入力記号の組に対して遷移先が一意に定まることを意味します。DFA は現在の状態と次の入力記号だけを見て次状態を決定するため、メモリを持たない計算機とも言えます。DFA が認識できる言語のクラスは「正規言語」であり、正規表現と表現力が等しいことが証明されています。

たとえば「0で終わる2進数列」を認識する DFA は、「0を読んだら受理状態へ、1を読んだら非受理状態へ遷移する」という単純な2状態機械で実現できます。DFA はコンパイラの字句解析、テキストパターンマッチング、ネットワークプロトコル設計など広範な分野で基盤技術として活用されています。

## DFA の構成要素

| 要素 | 記号 | 説明 |
|------|------|------|
| 状態集合 | Q | 有限個の状態の集まり |
| アルファベット | Σ | 入力記号の有限集合 |
| 遷移関数 | δ: Q × Σ → Q | 状態と入力から次状態を決定 |
| 初期状態 | q0 ∈ Q | 計算開始時の状態 |
| 受理状態集合 | F ⊆ Q | 入力終了時にここにいれば受理 |

```python
# DFA の実装例: 偶数個の 'a' を含む文字列を認識
class DFA:
    def __init__(self, states, alphabet, transition, start, accept):
        self.states = states
        self.alphabet = alphabet
        self.transition = transition  # dict: (state, symbol) -> state
        self.start = start
        self.accept = accept

    def run(self, input_string):
        current = self.start
        for symbol in input_string:
            if symbol not in self.alphabet:
                return False
            current = self.transition[(current, symbol)]
        return current in self.accept

# 例: {w | w は偶数個の 'a' を含む} を認識する DFA
# 状態: q0=偶数個（初期・受理）, q1=奇数個
dfa = DFA(
    states={'q0', 'q1'},
    alphabet={'a', 'b'},
    transition={
        ('q0', 'a'): 'q1',
        ('q0', 'b'): 'q0',
        ('q1', 'a'): 'q0',
        ('q1', 'b'): 'q1',
    },
    start='q0',
    accept={'q0'}
)

tests = ["", "aa", "ab", "aab", "aabb", "aba"]
for s in tests:
    print(f"'{s}' -> {'受理' if dfa.run(s) else '拒否'}")
# '' -> 受理, 'aa' -> 受理, 'ab' -> 拒否, 'aab' -> 拒否, 'aabb' -> 受理, 'aba' -> 受理
```

## 使用場面

- **字句解析（レキサー）**: コンパイラが識別子・数値リテラル・演算子を DFA でトークンに分割する
- **テキスト検索**: grep や正規表現エンジンの内部で DFA が文字列パターンマッチングを行う
- **ネットワークプロトコル**: TCP の状態遷移図（LISTEN → SYN_RCVD → ESTABLISHED など）は DFA で表現される
- **ゲームのAI**: 単純な敵キャラクターの行動パターンを有限状態機械で実装する

## 参考文献

- Sipser, M. "Introduction to the Theory of Computation" (Cengage Learning)
- Hopcroft, J. E., Motwani, R., Ullman, J. D. "Introduction to Automata Theory, Languages, and Computation"
- 富田悦次・横森貴「オートマトン・言語理論」(森北出版)

<AffiliateBanner site="theory_navi" />
