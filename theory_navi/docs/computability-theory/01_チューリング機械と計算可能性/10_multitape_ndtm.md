import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 多テープ TM と非決定性 TM

## 多テープ TM と非決定性 TM とは

> 多テープチューリング機械（Multi-tape TM）は複数のテープと対応するヘッドを持つ TM の拡張であり、非決定性チューリング機械（NDTM: Nondeterministic TM）は各ステップで複数の遷移候補から選択できる TM の拡張である。いずれも標準（1テープ決定性）TM と計算能力（認識できる言語クラス）は等価である。

多テープ TM は k 本のテープと各テープに独立したヘッドを持ちます。遷移関数は δ: Q × Γ^k → Q × Γ^k × {L, R, S}^k の形になり、k テープを同時に参照・更新できます。たとえば2テープ TM で {0^n 1^n} を認識する場合、テープ1に入力を保持し、テープ2に 0 の個数を記録することで効率的に処理できます。

重要な定理として、任意の k テープ TM は等価な1テープ TM でシミュレートできます。シミュレーション法では、k テープの内容を1本のテープ上にエンコード（区切り記号で分割）し、各ヘッド位置を特殊マークで記録します。計算量的には、k テープ TM が t(n) ステップで解ける問題を1テープ TM は O(t(n)^2) ステップで解けます。

非決定性 TM（NDTM）は各ステップで有限個の遷移候補から選択でき、受理する入力があれば受理と判定します。NDTM も1テープ決定性 TM とクラス等価です。NDTM を決定性 TM でシミュレートするには計算木を幅優先探索します。ただし計算量的には大きな差があり（P vs NP 問題の核心）、NDTM が多項式時間で解ける問題のクラスが NP です。

## TM の各変形の比較

| モデル | 特徴 | 標準TMとの等価性 | 計算量オーバーヘッド |
|--------|------|----------------|-------------------|
| 標準 TM（1テープ決定性） | 基本モデル | — | — |
| k テープ TM | k 本のテープ・ヘッド | 言語クラス等価 | O(t^2) のオーバーヘッド |
| 非決定性 TM（NDTM） | 各ステップで複数選択 | 言語クラス等価 | 指数的オーバーヘッド |
| 双方向無限テープ TM | テープが両方向に無限 | 言語クラス等価 | 定数オーバーヘッド |
| 読み取り専用入力テープ | 入力テープは読み取りのみ | 言語クラス等価 | — |

```python
# 多テープ TM のシミュレーション（2テープ版）
# 認識言語: {a^n b^n c^n | n >= 1}
# テープ1: 入力、テープ2: カウンタ用

class MultiTapeTM:
    """2テープ TM のシミュレーター"""

    def __init__(self, transition, start, accept, reject, blank='_'):
        self.transition = transition
        # (state, sym1, sym2) -> (next_state, write1, write2, move1, move2)
        self.start = start
        self.accept = accept
        self.reject = reject
        self.blank = blank

    def run(self, input_string, max_steps=500):
        tape1 = list(input_string) + [self.blank]
        tape2 = [self.blank]
        head1, head2 = 0, 0
        state = self.start

        def read(tape, pos):
            return tape[pos] if 0 <= pos < len(tape) else self.blank

        def write(tape, pos, sym):
            while pos >= len(tape):
                tape.append(self.blank)
            tape[pos] = sym

        for _ in range(max_steps):
            if state == self.accept:
                return True
            if state == self.reject:
                return False
            s1 = read(tape1, head1)
            s2 = read(tape2, head2)
            key = (state, s1, s2)
            if key not in self.transition:
                return False
            ns, w1, w2, m1, m2 = self.transition[key]
            write(tape1, head1, w1)
            write(tape2, head2, w2)
            state = ns
            head1 += (1 if m1 == 'R' else -1 if m1 == 'L' else 0)
            head2 += (1 if m2 == 'R' else -1 if m2 == 'L' else 0)
        return None

# {a^n b^n c^n}: テープ1=入力、テープ2=カウンタ(a の数 - c の数)
# 簡略化のため Python の文字列操作で検証ロジックを示す
def recognize_anbncn(s):
    """a^n b^n c^n を認識（多テープ TM の動作を示す疑似実装）"""
    from collections import Counter
    cnt = Counter(s)
    n = cnt['a']
    if n == 0:
        return False
    # テープ1で区切りを確認、テープ2でカウント
    return (cnt['a'] == cnt['b'] == cnt['c'] and
            s == 'a' * n + 'b' * n + 'c' * n)

tests = ['abc', 'aabbcc', 'aaabbbccc', 'aabbc', 'abcc', 'aabbbc']
print("{a^n b^n c^n} の認識（2テープ TM の動作）:")
for s in tests:
    print(f"  '{s}' -> {'受理' if recognize_anbncn(s) else '拒否'}")

# NDTM のシミュレーション（BFS で全計算経路を探索）
print("\nNDTM のシミュレーション（幅優先探索）:")
print("NDTM: 各ステップで複数の遷移を並行して試し、")
print("いずれかの経路が受理状態に到達すれば受理とする。")
print("決定性 TM へのシミュレーション: 計算木を BFS で探索 → 指数的空間が必要")
```

## 使用場面

- **計算量理論**: 多テープ TM は計算量クラス（P, NP 等）の定義に使われ、テープ数が結果に影響しないことを保証する
- **非決定性の理解**: NDTM は NP クラスの形式的定義の基礎であり、P vs NP 問題の中心に位置する
- **並列計算のモデル化**: 多テープ TM は並列処理の理論的モデルとして使用される
- **コンパイラ最適化**: 複数の作業領域を同時に使う最適化アルゴリズムの理論的基盤となる

## 参考文献

- Sipser, M. "Introduction to the Theory of Computation" (Cengage Learning)
- Papadimitriou, C. H. "Computational Complexity" (Addison-Wesley)
- Hopcroft, J. E., Motwani, R., Ullman, J. D. "Introduction to Automata Theory, Languages, and Computation"

<AffiliateBanner site="theory_navi" />
