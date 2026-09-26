import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 万能チューリング機械

## 万能チューリング機械とは

> 万能チューリング機械（Universal Turing Machine: UTM）とは、任意のチューリング機械 M の符号化 <M> と入力 w を受け取り、M が w 上で行う計算を忠実にシミュレートする特別なチューリング機械である。

万能チューリング機械はチューリングが1936年の論文で提案した画期的な概念です。それ以前の計算機械は特定の計算しかできない「専用機械」でしたが、UTM は「機械の記述をデータとして受け取り、その機械を模倣する汎用機械」です。これは現代のコンピュータの本質的な特徴——プログラムをデータとして扱える——の理論的原型です。

UTM の動作原理は次の通りです。入力として TM M の符号化 <M>（遷移関数・状態・アルファベット等のエンコード）と入力文字列 w を受け取ります。UTM は M の遷移関数を参照しながら M の動作をステップごとシミュレートします。M が w を受理すれば UTM も受理し、M が w を拒否すれば UTM も拒否し、M がループすれば UTM もループします。

任意の TM を符号化できることは、TM の数が可算無限であることを意味します（有限のアルファベットの有限列の集合は可算）。一方、言語の全体は非可算無限（実数と同じ濃度）です。したがって、ほとんどの言語はどんな TM でも認識できないことになります。この事実は停止問題の決定不能性の証明の基礎となります。

## UTM の概念と現代のコンピュータとの対応

| UTM の概念 | 現代のコンピュータ |
|-----------|-------------------|
| 万能チューリング機械 | CPU + OS |
| TM の符号化 <M> | プログラム（実行ファイル） |
| 入力 w | プログラムへの入力データ |
| UTM のシミュレーション | プログラムの実行 |
| テープ | RAM・ストレージ |
| 有限制御部 | CPU のマイクロアーキテクチャ |

```python
# TM の符号化と UTM の概念的実装
# 実際の UTM は複雑なので、概念的なシミュレーターを示す

class TuringMachineEncoding:
    """TM の符号化（<M> の生成と解析）"""

    @staticmethod
    def encode(states, alphabet, tape_alpha, transition, start, accept, reject):
        """TM を文字列として符号化する"""
        # 簡易符号化: 各要素を # で区切る
        enc_states = ','.join(sorted(states))
        enc_alpha = ','.join(sorted(alphabet))
        enc_tape = ','.join(sorted(tape_alpha))
        enc_start = start
        enc_accept = accept
        enc_reject = reject
        enc_trans = ';'.join(
            f"{s},{r}->{ns},{w},{d}"
            for (s, r), (ns, w, d) in sorted(transition.items())
        )
        return f"#{enc_states}#{enc_alpha}#{enc_tape}#{enc_start}#{enc_accept}#{enc_reject}#{enc_trans}#"

    @staticmethod
    def decode(encoding):
        """符号化文字列から TM を復元する"""
        parts = encoding.strip('#').split('#')
        states = set(parts[0].split(','))
        alphabet = set(parts[1].split(','))
        tape_alpha = set(parts[2].split(','))
        start, accept, reject = parts[3], parts[4], parts[5]
        transition = {}
        for rule in parts[6].split(';'):
            if not rule:
                continue
            lhs, rhs = rule.split('->')
            s, r = lhs.split(',')
            ns, w, d = rhs.split(',')
            transition[(s, r)] = (ns, w, d)
        return states, alphabet, tape_alpha, transition, start, accept, reject

class UniversalTM:
    """万能チューリング機械（UTM）: TM の符号化 <M> と入力 w をシミュレート"""

    def simulate(self, tm_encoding, input_w, max_steps=1000):
        """<M> と w を受け取り M の動作を模倣する"""
        states, alphabet, tape_alpha, transition, start, accept, reject = \
            TuringMachineEncoding.decode(tm_encoding)

        # M のシミュレーション
        tape = list(input_w) if input_w else ['_']
        head = 0
        state = start

        for step in range(max_steps):
            while head >= len(tape):
                tape.append('_')
            symbol = tape[head]

            if state == accept:
                return 'ACCEPT'
            if state == reject:
                return 'REJECT'

            key = (state, symbol)
            if key not in transition:
                return 'REJECT'

            next_state, write, move = transition[key]
            tape[head] = write
            state = next_state
            head += (1 if move == 'R' else -1)

        return 'LOOP (max steps exceeded)'

# 偶数個の 0 を受理する TM を符号化して UTM でシミュレート
tm_encoding = TuringMachineEncoding.encode(
    states={'q0', 'q1', 'qa', 'qr'},
    alphabet={'0'},
    tape_alpha={'0', '_'},
    transition={
        ('q0', '0'): ('q1', '0', 'R'),
        ('q0', '_'): ('qa', '_', 'R'),
        ('q1', '0'): ('q0', '0', 'R'),
        ('q1', '_'): ('qr', '_', 'R'),
    },
    start='q0', accept='qa', reject='qr'
)

print("TM の符号化 <M>:")
print(f"  {tm_encoding[:80]}...")

utM = UniversalTM()
print("\nUTM によるシミュレーション:")
for w in ['', '00', '0000', '0', '000']:
    result = utM.simulate(tm_encoding, w)
    print(f"  M('{w}') = {result}")
```

## 使用場面

- **コンピュータの理論的根拠**: 現代のプログラマブルコンピュータは UTM の物理的実装であるという理論的裏付けを提供する
- **インタープリタ・エミュレータ**: 別のコンピュータやVMをシミュレートするソフトウェアは UTM の具体的な実装例である
- **停止問題の証明**: UTM の存在を前提として「停止問題は決定不能」であることが対角線論法で証明される
- **プログラムの自己参照**: コンパイラがコンパイラ自身をコンパイルできる（ブートストラップ）のも UTM の概念が基礎にある

## 参考文献

- Turing, A. M. "On computable numbers, with an application to the Entscheidungsproblem" (1936)
- Sipser, M. "Introduction to the Theory of Computation" (Cengage Learning)
- Davis, M. "Engines of Logic: Mathematicians and the Origin of the Computer"

<AffiliateBanner site="theory_navi" />
