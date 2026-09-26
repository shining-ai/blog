import AffiliateBanner from '@site/src/components/AffiliateBanner';

# プッシュダウンオートマトン（PDA）

## プッシュダウンオートマトン（PDA）とは

> プッシュダウンオートマトン（PDA: Pushdown Automaton）とは、有限オートマトンにスタック（後入れ先出しの無制限メモリ）を付加した計算モデルであり、文脈自由言語を認識する能力を持つ。

PDA は DFA / NFA を拡張し、無制限のスタックメモリを持ちます。PDA は7要素の組 (Q, Σ, Γ, δ, q0, Z0, F) で定義されます。Q は状態集合、Σ は入力アルファベット、Γ はスタックアルファベット、δ: Q × (Σ ∪ {ε}) × Γ → 2^{Q × Γ*} は遷移関数、q0 は初期状態、Z0 ∈ Γ はスタック初期記号、F は受理状態集合です。

各ステップで PDA は現在の状態・入力記号（またはε）・スタックトップを参照し、次状態へ遷移するとともにスタックトップを任意の文字列に置き換えます。受理方式は2通りあり、受理状態による受理と空スタックによる受理があり、どちらも同等の表現力を持ちます。

PDA が認識できる言語クラスはちょうど文脈自由言語（CFL）です（クリーニの定理の拡張）。典型的な認識例として {a^n b^n | n ≥ 0} が挙げられ、a を読むたびにスタックに積み、b を読むたびに1つポップすることで対応を確認できます。なお一般の PDA は非決定的であり、決定性 PDA（DPDA）は PDA より表現力が弱いです。

## PDA と DFA の比較

| 項目 | DFA | PDA |
|------|-----|-----|
| メモリ | なし（状態のみ） | 無制限スタック |
| 認識言語クラス | 正規言語 | 文脈自由言語 |
| スタック操作 | 不可 | push / pop / ε遷移 |
| 決定性 | 決定的 = 非決定的 | 非決定的 > 決定的 |
| 典型例 | 正規表現のパターン | 括弧のネスト、a^n b^n |

```python
# 非決定性 PDA のシミュレーション
# 認識言語: {a^n b^n | n >= 1}

class PDA:
    """非決定性 PDA のシミュレーター（BFS で全経路探索）"""

    def __init__(self, transition, start, start_stack, accept):
        self.transition = transition
        self.start = start
        self.start_stack = start_stack
        self.accept = accept  # 受理状態集合

    def run(self, input_string):
        from collections import deque
        # 設定: (状態, 入力位置, スタック)
        initial = (self.start, 0, [self.start_stack])
        queue = deque([initial])
        visited = set()

        while queue:
            state, pos, stack = queue.popleft()
            config = (state, pos, tuple(stack))
            if config in visited:
                continue
            visited.add(config)

            # 入力終了チェック
            if pos == len(input_string):
                if state in self.accept:
                    return True

            # ε遷移
            if stack:
                top = stack[-1]
                for (next_state, push_str) in self.transition.get((state, 'eps', top), []):
                    new_stack = stack[:-1] + list(reversed(push_str))
                    queue.append((next_state, pos, new_stack))

            # 入力消費遷移
            if pos < len(input_string):
                sym = input_string[pos]
                if stack:
                    top = stack[-1]
                    for (next_state, push_str) in self.transition.get((state, sym, top), []):
                        new_stack = stack[:-1] + list(reversed(push_str))
                        queue.append((next_state, pos + 1, new_stack))
        return False

# {a^n b^n | n >= 1} を認識する PDA
# q0: a を読みスタックに積む
# q1: b を読みスタックからポップ
# q2: 受理
transition = {
    ('q0', 'a', 'Z'): [('q0', 'AZ')],   # 最初の a: A を Z の上に積む
    ('q0', 'a', 'A'): [('q0', 'AA')],   # 続く a: A を積む
    ('q0', 'b', 'A'): [('q1', '')],      # 最初の b: A をポップ
    ('q1', 'b', 'A'): [('q1', '')],      # 続く b: A をポップ
    ('q1', 'eps', 'Z'): [('q2', 'Z')],  # スタックが底なら受理状態へ
}

pda = PDA(transition, start='q0', start_stack='Z', accept={'q2'})

tests = [('a', False), ('ab', True), ('aabb', True), ('aaabbb', True),
         ('aab', False), ('abb', False), ('ba', False)]
for s, expected in tests:
    result = pda.run(s)
    mark = 'OK' if result == expected else 'NG'
    print(f"[{mark}] '{s}' -> {'受理' if result else '拒否'}")
```

## 使用場面

- **構文解析（パーサー）**: プログラミング言語の文法（文脈自由文法）の解析に DPDA ベースの LR・LL パーサーが使われる
- **括弧の整合性検査**: HTML タグや関数の括弧が正しくネストしているかの検証にスタックを使う
- **XML/JSON 解析**: 木構造のデータ形式の解析は本質的に PDA の動作に対応する
- **自然言語処理**: 文の構文木の構築に文脈自由文法ベースの解析器を使用する

## 参考文献

- Sipser, M. "Introduction to the Theory of Computation" (Cengage Learning)
- Hopcroft, J. E., Motwani, R., Ullman, J. D. "Introduction to Automata Theory, Languages, and Computation"
- 富田悦次・横森貴「オートマトン・言語理論」(森北出版)

<AffiliateBanner site="theory_navi" />
