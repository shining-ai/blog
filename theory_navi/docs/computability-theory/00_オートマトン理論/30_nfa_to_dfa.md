import AffiliateBanner from '@site/src/components/AffiliateBanner';

# NFA → DFA 変換（部分集合構成法）

## NFA → DFA 変換とは

> 部分集合構成法（Subset Construction / Powerset Construction）とは、任意の NFA と等価な DFA を体系的に構築するアルゴリズムであり、DFA の各状態を NFA の状態集合の部分集合（べき集合の要素）に対応させることで変換を実現する。

NFA は設計が簡潔ですが、シミュレーションには非決定性の処理が必要です。部分集合構成法は NFA を同じ言語を認識する DFA に変換することで、決定的な実行を可能にします。アイデアは「DFA の1つの状態が、NFA が並行して取り得る全状態集合を表す」という点にあります。

変換手順は次の通りです。まず NFA の初期状態 q0 のε閉包（ε遷移のみで到達可能な全状態）を DFA の初期状態とします。次に各 DFA 状態（NFA 状態の集合）S と各入力記号 a について、S の全状態から a を読んで遷移できる全状態のε閉包を計算し、それを新しい DFA 状態とします。これを未処理の DFA 状態がなくなるまで繰り返します。最後に NFA の受理状態を少なくとも1つ含む DFA 状態を受理状態とします。

変換後の DFA の状態数は最大で 2^n（n は NFA の状態数）になります。実際には到達可能な部分集合のみが生成されるため、多くの場合はそれより少なくなります。

## 変換手順のまとめ

| ステップ | 操作 |
|---------|------|
| 1. 初期状態 | ε-closure({q0}) を DFA の初期状態に |
| 2. 遷移計算 | 各 DFA 状態 S と記号 a に対し ε-closure(δ(S, a)) を計算 |
| 3. 繰り返し | 新しい DFA 状態が出なくなるまで 2 を繰り返す |
| 4. 受理状態 | NFA の受理状態を含む部分集合を DFA の受理状態とする |
| 5. 状態数 | 最大 2^n（n = NFA の状態数）、実際は到達可能な分のみ |

```python
from collections import deque

def epsilon_closure(nfa_transition, states):
    """ε遷移で到達可能な全状態を返す"""
    closure = set(states)
    queue = deque(states)
    while queue:
        s = queue.popleft()
        for t in nfa_transition.get((s, 'eps'), set()):
            if t not in closure:
                closure.add(t)
                queue.append(t)
    return frozenset(closure)

def nfa_to_dfa(nfa_states, alphabet, nfa_transition, nfa_start, nfa_accept):
    """部分集合構成法で NFA を DFA に変換する"""
    start_dfa = epsilon_closure(nfa_transition, {nfa_start})
    dfa_states = {}   # frozenset -> DFA 状態名
    dfa_transition = {}
    dfa_accept = set()
    queue = deque([start_dfa])
    counter = 0

    def state_name(s):
        return '{' + ','.join(sorted(s)) + '}'

    while queue:
        current = queue.popleft()
        if current in dfa_states:
            continue
        name = state_name(current)
        dfa_states[current] = name
        # 受理状態チェック
        if current & nfa_accept:
            dfa_accept.add(name)
        # 各記号への遷移
        for symbol in alphabet:
            next_nfa = set()
            for s in current:
                next_nfa |= nfa_transition.get((s, symbol), set())
            next_dfa = epsilon_closure(nfa_transition, next_nfa)
            dfa_transition[(name, symbol)] = state_name(next_dfa)
            if next_dfa not in dfa_states:
                queue.append(next_dfa)

    return dfa_states, dfa_transition, dfa_states[start_dfa], dfa_accept

# 例: a*(ab)+ を認識する NFA (a で始まり ab で終わる文字列)
# 状態: q0(開始), q1('a'読んだ), q2('ab'読んだ=受理)
nfa_transition = {
    ('q0', 'a'): {'q0', 'q1'},
    ('q0', 'b'): {'q0'},
    ('q1', 'b'): {'q2'},
}
dfa_states, dfa_trans, dfa_start, dfa_accept = nfa_to_dfa(
    {'q0', 'q1', 'q2'}, {'a', 'b'}, nfa_transition, 'q0', {'q2'}
)

print(f"DFA 初期状態: {dfa_start}")
print(f"DFA 受理状態: {dfa_accept}")
print("DFA 遷移表:")
for (s, sym), t in sorted(dfa_trans.items()):
    print(f"  δ({s}, {sym}) = {t}")
```

## 使用場面

- **正規表現エンジン**: Thompson 構成で NFA を作成後、部分集合構成で DFA に変換して高速マッチングを実現する
- **コンパイラの字句解析**: 複数のトークンパターンを NFA で合成し、DFA に変換して実装する
- **形式検証**: 非決定的モデルを決定的モデルに変換して網羅的な状態空間探索を行う
- **ハードウェア設計**: 状態機械の合成において NFA を DFA に変換して回路実装を行う

## 参考文献

- Hopcroft, J. E., Motwani, R., Ullman, J. D. "Introduction to Automata Theory, Languages, and Computation"
- Sipser, M. "Introduction to the Theory of Computation" (Cengage Learning)
- Aho, A. V., Lam, M. S., Sethi, R., Ullman, J. D. "Compilers: Principles, Techniques, and Tools"

<AffiliateBanner site="theory_navi" />
