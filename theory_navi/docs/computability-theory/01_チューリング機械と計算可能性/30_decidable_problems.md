import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 決定可能問題と半決定可能問題

## 決定可能問題と半決定可能問題とは

> 決定可能問題（Decidable problem）とは、全ての入力に対して有限時間で正しく「YES」または「NO」と答えるチューリング機械（決定器）が存在する問題であり、半決定可能問題（Semi-decidable / Turing-recognizable）とは「YES」の場合は有限時間で受理するが「NO」の場合はループする可能性を許す問題である。

言語 L が決定可能であるとは、L の決定器（決定性 TM で、全ての入力に対して受理か拒否かを有限ステップで返す）が存在することです。決定可能言語は再帰言語（Recursive language）とも呼ばれます。

半決定可能（チューリング認識可能）とは、入力 w ∈ L なら必ず受理するが、w ∉ L のときは拒否するかループするかが保証されない TM が存在することです。半決定可能言語は再帰的可算言語（Recursively Enumerable language: RE）とも呼ばれます。

決定可能 ⊂ 半決定可能 ⊂ 全言語 という包含関係があります。また、L が決定可能 ⟺ L も補言語 L の補集合も半決定可能、という重要な定理があります。決定可能な言語の典型例として DFA の受理問題（A_DFA）、DFA の等価性問題、CFG の空性問題などがあります。半決定可能だが決定不能な例として停止問題（A_TM）があります。

## 言語クラスの包含関係と例

| 言語クラス | 別名 | 定義 | 典型例 |
|-----------|------|------|--------|
| 正規言語 | — | DFA で認識可能 | {a^n \| n は偶数} |
| 文脈自由言語 | — | PDA で認識可能 | {a^n b^n} |
| 決定可能言語 | 再帰言語 | 決定器が存在 | A_DFA, A_CFG |
| 半決定可能言語 | 再帰的可算言語 | TM で認識可能 | A_TM（停止問題） |
| 決定不能言語 | 非 RE | TM で認識不能 | A_TM の補集合 |

```python
# 決定可能問題の例示（Pythonで実装可能な問題はすべて決定可能）

# 例1: DFA の受理問題 A_DFA
# 入力: <DFA M, 文字列 w>  問: M は w を受理するか
def a_dfa(transition, start, accept, w):
    """A_DFA の決定器: DFA M が w を受理するか判定"""
    state = start
    for symbol in w:
        state = transition.get((state, symbol), None)
        if state is None:
            return False
    return state in accept

dfa = {
    ('q0', 'a'): 'q1', ('q0', 'b'): 'q0',
    ('q1', 'a'): 'q0', ('q1', 'b'): 'q1',
}
print("A_DFA（偶数個の a を含む）:")
for w in ['', 'aa', 'ab', 'aab', 'aabb']:
    print(f"  '{w}' -> {'受理' if a_dfa(dfa, 'q0', {'q0'}, w) else '拒否'}")

# 例2: CFG の空性問題
# 入力: <CFG G>  問: G の生成する言語は空か
def cfg_empty(rules, start):
    """CFG の空性判定: 生成可能な終端記号列が存在するか"""
    # 終端記号列を生成できる非終端記号を求める
    can_generate = set()
    changed = True
    while changed:
        changed = False
        for lhs, rhs_list in rules.items():
            if lhs in can_generate:
                continue
            for rhs in rhs_list:
                # rhs の全記号が終端または生成可能非終端なら OK
                if all(c.islower() or c in can_generate for c in rhs):
                    can_generate.add(lhs)
                    changed = True
    return start not in can_generate

# 例: 生成可能な文法
rules1 = {'S': [['a'], ['S', 'b']], 'A': [['b']]}
print(f"\nCFG S -> a | Sb が空か: {cfg_empty(rules1, 'S')}")  # False

# 例: 空の文法
rules2 = {'S': [['A', 'B']], 'A': [['a', 'B']], 'B': []}
print(f"CFG S -> AB, A -> aB, B -> (なし) が空か: {cfg_empty(rules2, 'S')}")  # True

# 半決定可能だが決定不能な問題の説明
print("""
半決定可能だが決定不能な問題の例:
  A_TM = {<M, w> | TM M は入力 w を受理する}
  ・TM が受理すれば有限ステップで YES と答えられる
  ・TM がループするとき、いつまでも答えが得られない（NO と言えない）
  ・停止問題と同値であり、決定不能であることが証明されている
""")
```

## 使用場面

- **プログラム検証**: 「このプログラムは任意の入力でクラッシュしないか」は一般に決定不能問題であり、静的解析は近似的アプローチを取る
- **コンパイラ設計**: 型推論・定数伝播・終端性検査などが決定可能かどうかは言語設計に直結する
- **セキュリティ解析**: マルウェア検出問題はライス定理により一般には決定不能であることが示されている
- **モデル検査**: ハードウェアやプロトコルの仕様が特定の安全性条件を満たすかは決定可能な部分問題として定式化する

## 参考文献

- Sipser, M. "Introduction to the Theory of Computation" (Cengage Learning)
- Hopcroft, J. E., Motwani, R., Ullman, J. D. "Introduction to Automata Theory, Languages, and Computation"
- Rogers, H. "Theory of Recursive Functions and Effective Computability"

<AffiliateBanner site="theory_navi" />
