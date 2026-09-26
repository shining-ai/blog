import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 非決定性有限オートマトン（NFA）

## 非決定性有限オートマトン（NFA）とは

> 非決定性有限オートマトン（NFA: Nondeterministic Finite Automaton）とは、1つの状態から同じ入力記号で複数の次状態へ遷移でき、さらに入力を消費せずに遷移するε遷移を許す有限オートマトンである。

NFA は DFA を一般化した計算モデルです。形式的には5要素の組 (Q, Σ, δ, q0, F) で定義されますが、遷移関数が δ: Q × (Σ ∪ {ε}) → 2^Q（状態の部分集合を返す）である点が DFA と異なります。「非決定性」とは、同じ入力に対して複数の遷移が可能で、それらのうち少なくとも1つの計算経路が受理状態に至れば、その入力を受理することを意味します。

NFA は DFA と比べて直感的に設計しやすい利点があります。たとえば「abc で終わる文字列」を認識する NFA は単純に書けますが、対応する DFA は状態数が多くなることがあります。重要な定理として、NFA と DFA は表現力が等しい（認識できる言語クラスが同じ正規言語である）ことが証明されており、任意の NFA は等価な DFA に変換できます（部分集合構成法）。ただし DFA の状態数は NFA の状態数の指数倍になる場合があります。

ε遷移（空遷移）は入力を消費せずに状態を変化させる遷移で、NFA の設計をさらに簡潔にします。正規表現から NFA を構築する Thompson の構成法では ε遷移が多用されます。

## DFA と NFA の比較

| 項目 | DFA | NFA |
|------|-----|-----|
| 遷移の一意性 | 各 (状態, 記号) に対して次状態は1つ | 複数または0個の次状態が可能 |
| ε遷移 | 不可 | 可能 |
| 受理条件 | 最終状態が受理状態 | いずれかの経路が受理状態に至る |
| 設計の直感性 | やや複雑 | 直感的で簡潔 |
| 表現力 | 正規言語 | 正規言語（DFA と等価） |
| 状態数 | NFA より多くなり得る（最大 2^n） | 一般に少ない |

```python
# NFA の実装例（ε遷移あり）
# 認識する言語: 'ab' または 'b' で終わる文字列

class NFA:
    def __init__(self, states, alphabet, transition, start, accept):
        self.states = states
        self.alphabet = alphabet
        # transition: dict (state, symbol_or_epsilon) -> set of states
        self.transition = transition
        self.start = start
        self.accept = accept

    def epsilon_closure(self, states):
        """ε遷移で到達可能な全状態を返す"""
        closure = set(states)
        stack = list(states)
        while stack:
            s = stack.pop()
            for t in self.transition.get((s, 'eps'), set()):
                if t not in closure:
                    closure.add(t)
                    stack.append(t)
        return frozenset(closure)

    def run(self, input_string):
        current = self.epsilon_closure({self.start})
        for symbol in input_string:
            next_states = set()
            for state in current:
                next_states |= self.transition.get((state, symbol), set())
            current = self.epsilon_closure(next_states)
        return bool(current & self.accept)

# 例: 'ab' で終わる文字列を認識する NFA
# q0: 開始, q1: 'a' を読んだ, q2: 'ab' を読んだ（受理）
nfa = NFA(
    states={'q0', 'q1', 'q2'},
    alphabet={'a', 'b'},
    transition={
        ('q0', 'a'): {'q0', 'q1'},
        ('q0', 'b'): {'q0'},
        ('q1', 'b'): {'q2'},
    },
    start='q0',
    accept={'q2'}
)

tests = ["ab", "aab", "b", "ababab", "ba", ""]
for s in tests:
    print(f"'{s}' -> {'受理' if nfa.run(s) else '拒否'}")
# 'ab' -> 受理, 'aab' -> 受理, 'b' -> 拒否, 'ababab' -> 受理, 'ba' -> 拒否, '' -> 拒否
```

## 使用場面

- **正規表現エンジン**: Thompson の構成法で正規表現から NFA を構築し、パターンマッチングを実現する
- **自動テスト生成**: 有限状態機械のモデルから非決定的なテストケースを網羅的に生成する
- **プロトコル検証**: 非決定的な並行システムの動作を NFA でモデル化して検証する
- **コンパイラ最適化**: 字句解析での正規表現から DFA への変換過程で中間的に NFA を使用する

## 参考文献

- Sipser, M. "Introduction to the Theory of Computation" (Cengage Learning)
- Hopcroft, J. E., Motwani, R., Ullman, J. D. "Introduction to Automata Theory, Languages, and Computation"
- 岩間一雄「オートマトン・言語と計算理論」(共立出版)

<AffiliateBanner site="theory_navi" />
