import AffiliateBanner from '@site/src/components/AffiliateBanner';

# チューリング機械の定義

## チューリング機械とは

> チューリング機械（Turing Machine: TM）とは、アラン・チューリングが1936年に提案した計算の理論的モデルであり、無限長のテープ・読み書きヘッド・有限制御部から構成され、任意のアルゴリズムをシミュレートできる普遍的な計算モデルである。

チューリング機械は計算理論の中心的概念で、「計算とは何か」を厳密に定義します。TM は7要素の組 (Q, Σ, Γ, δ, q0, q_accept, q_reject) で定義されます。Q は状態の有限集合、Σ は入力アルファベット（空白記号 ␣ を含まない）、Γ はテープアルファベット（Σ ∪ \{␣} ⊆ Γ）、δ: Q × Γ → Q × Γ × \{L, R} は遷移関数（次状態・書き込み記号・ヘッド移動方向）、q0 は初期状態、q_accept は受理状態、q_reject は拒否状態です。

DFA・PDA との決定的な違いはテープへの書き込みと双方向移動です。PDA のスタックとは異なり、TM はテープ上の任意の場所を読み書きでき、ヘッドを左右に自由に動かせます。これにより TM は任意のアルゴリズムを表現できます。チャーチ-チューリングのテーゼとは「直感的に計算可能な関数はすべてチューリング機械で計算できる」という命題で、証明も反証もできない哲学的命題ですが、広く受け入れられています。

TM が受理・拒否を決定できる言語を「決定可能言語」（再帰的言語）、受理はするが拒否は確定しない（ループの可能性あり）言語を「チューリング認識可能言語」（再帰的可算言語）と言います。

## チューリング機械の構成要素

| 要素 | 説明 |
|------|------|
| 無限テープ | 両方向に無限に伸びるセルの列。各セルに記号1つを格納 |
| 読み書きヘッド | テープ上の1セルを指し、読み書きと左右移動が可能 |
| 有限制御部 | 現在の状態を保持。状態数は有限 |
| 遷移関数 | (現在状態, 読んだ記号) → (次状態, 書く記号, 移動方向) |
| 空白記号 ␣ | テープの未書き込み部分を表す特殊記号 |

```python
class TuringMachine:
    """決定性チューリング機械のシミュレーター"""

    def __init__(self, states, input_alpha, tape_alpha, transition,
                 start, accept, reject, blank='_'):
        self.states = states
        self.input_alpha = input_alpha
        self.tape_alpha = tape_alpha
        self.transition = transition  # (state, symbol) -> (next_state, write, move)
        self.start = start
        self.accept = accept
        self.reject = reject
        self.blank = blank

    def run(self, input_string, max_steps=1000, verbose=False):
        tape = list(input_string) if input_string else [self.blank]
        head = 0
        state = self.start

        for step in range(max_steps):
            # テープ範囲を必要に応じて拡張
            while head < 0:
                tape.insert(0, self.blank)
                head += 1
            while head >= len(tape):
                tape.append(self.blank)

            symbol = tape[head]
            if verbose:
                tape_str = ''.join(tape)
                print(f"Step {step:3d}: state={state}, head={head}, "
                      f"tape='{''.join(tape[:head])}[{symbol}]{''.join(tape[head+1:])}'")

            if state == self.accept:
                return True
            if state == self.reject:
                return False

            key = (state, symbol)
            if key not in self.transition:
                return False  # 未定義遷移 -> 拒否

            next_state, write, move = self.transition[key]
            tape[head] = write
            state = next_state
            head += (1 if move == 'R' else -1)

        return None  # 最大ステップ数超過（ループの可能性）

# 例: {0^n 1^n | n >= 1} を認識する TM
# 戦略: 0と1を交互にマーク（Xに置き換え）し、最終的に全部マーク済みなら受理
tm = TuringMachine(
    states={'q0', 'q1', 'q2', 'q3', 'q4', 'qa', 'qr'},
    input_alpha={'0', '1'},
    tape_alpha={'0', '1', 'X', 'Y', '_'},
    transition={
        # q0: 左端から開始、0をXにマーク
        ('q0', '0'): ('q1', 'X', 'R'),  # 0をXに変えて右へ
        ('q0', 'Y'): ('q3', 'Y', 'R'),  # Yのみ残っていれば右端確認へ
        ('q0', '_'): ('qr', '_', 'R'),  # 空なら拒否
        # q1: 1を探して右へ移動
        ('q1', '0'): ('q1', '0', 'R'),
        ('q1', 'Y'): ('q1', 'Y', 'R'),
        ('q1', '1'): ('q2', 'Y', 'L'),  # 1をYにマークして左へ戻る
        ('q1', '_'): ('qr', '_', 'R'),  # 1が見つからない
        # q2: 左端に戻る
        ('q2', '0'): ('q2', '0', 'L'),
        ('q2', 'X'): ('q0', 'X', 'R'),  # Xに戻ったら次の0を探す
        ('q2', 'Y'): ('q2', 'Y', 'L'),
        # q3: 右端確認（全てYかブランクなら受理）
        ('q3', 'Y'): ('q3', 'Y', 'R'),
        ('q3', '_'): ('qa', '_', 'R'),
    },
    start='q0', accept='qa', reject='qr'
)

print("TM で {0^n 1^n} を認識:")
tests = ['01', '0011', '000111', '001', '0111', '']
for s in tests:
    r = tm.run(s)
    result = '受理' if r else ('拒否' if r is False else 'ループ')
    print(f"  '{s}' -> {result}")
```

## 使用場面

- **計算可能性の基準**: アルゴリズムが存在するかどうかを TM で計算可能かどうかとして形式的に定義する
- **計算量理論の基盤**: 時間・空間計算量を TM のステップ数・テープ使用量として厳密に定義する
- **停止問題の定式化**: 「任意のプログラムが停止するか判定できるか」という問いを TM の停止問題として形式化する
- **コンパイラ・言語設計**: 任意の計算可能な言語処理は理論上 TM で実現できるという保証の下で設計する

## 参考文献

- Turing, A. M. "On computable numbers, with an application to the Entscheidungsproblem" (1936)
- Sipser, M. "Introduction to the Theory of Computation" (Cengage Learning)
- 岩間一雄「オートマトン・言語と計算理論」(共立出版)

<AffiliateBanner site="theory_navi" />
