import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 停止問題の証明（対角線論法）

## 停止問題とは

> 停止問題（Halting Problem）とは「任意のチューリング機械 M と入力 w が与えられたとき、M は w 上で停止するか（受理または拒否するか）」という問題であり、チューリングが1936年に対角線論法を使って決定不能であることを証明した。

停止問題は最も基本的な決定不能問題です。形式的には HALT_TM = \{\<M, w> | TM M は入力 w 上で停止する} と定義されます。この言語を決定する TM が存在しないことを対角線論法（Cantor の対角線論法に類似）で証明します。

証明の概略は次の通りです。HALT_TM を決定する TM H が存在すると仮定します。H を利用して「入力として TM の符号化 \<M> を受け取り、H(\<M, \<M>>) が受理なら無限ループし、拒否なら受理する」という TM D を構成します。ここで D に D 自身の符号化 \<D> を入力すると矛盾が生じます。D(\<D>) が受理なら（「\<D> は停止しない」と H が判定したことを意味するので）D はループするはずですが、D は受理しています。D(\<D>) がループするなら D は受理することになります。この矛盾から H の存在が否定されます。

対角線論法の名前は、TM と入力のペアを「表」として並べたとき、D が表の対角線を「逆転」する機械として構成される点に由来します。停止問題の決定不能性は計算の究極の限界を示す最重要定理の一つです。

## 停止問題に関連する言語クラス

| 言語 | 決定可能 | 半決定可能 | 説明 |
|------|---------|-----------|------|
| A_TM = \{\<M,w> \| M が w を受理} | 否 | はい | 停止問題と同値 |
| HALT_TM = \{\<M,w> \| M が停止} | 否 | はい | 基本的な停止問題 |
| A_TM の補集合 | 否 | 否 | TM が拒否する問題 |
| A_DFA = \{\<M,w> \| DFA M が w を受理} | はい | はい | 決定可能 |
| E_TM = \{\<M> \| L(M) = ∅} | 否 | 否 | ライス定理で決定不能 |

```python
# 停止問題の対角線論法の概念的実装
# ※ 実際の TM は Python では直接実装できないため、概念を示すコードです

def demonstrate_diagonalization():
    """
    対角線論法の概念的デモンストレーション

    TM を M1, M2, M3, ... と列挙し、
    各 TM Mi が入力 <Mi>（自身の符号化）を受理するかどうかの「表」を作る。
    D は対角線を逆転させる TM として定義される。
    """
    # TM の有限サンプルで対角線論法を概念的に示す
    # 各 TM を「自己受理するか」という特性で表す
    # True = <Mi> を受理、False = 受理しない（拒否またはループ）

    # 架空の TM の「自己受理」テーブル（概念的）
    # M1(<M1>) M2(<M2>) M3(<M3>) M4(<M4>) ...
    turing_machines_self_accept = [True, False, True, False, True]
    # 対角線: [True, False, True, False, True]

    # D の動作: 対角線を逆転
    # D(<Mi>) = 受理  if Mi(<Mi>) = ループ
    # D(<Mi>) = ループ if Mi(<Mi>) = 受理
    D_behavior = [not x for x in turing_machines_self_accept]
    print("対角線論法の概念的デモ:")
    print(f"TM M1...M5 の自己受理テーブル（対角線）: {turing_machines_self_accept}")
    print(f"D の動作（対角線の逆転）:                {D_behavior}")
    print()
    print("D を TM M_k として列挙すると...")
    for k in range(1, len(turing_machines_self_accept) + 1):
        expected = D_behavior[k - 1]  # D が M_k の位置でとるべき動作
        actual_diag = turing_machines_self_accept[k - 1]  # D=M_k の場合の対角線の値
        actual_D = not actual_diag  # D の逆転
        print(f"  D(<M_{k}>): 期待={expected}, 実際（対角線逆転）={actual_D} "
              f"→ {'矛盾なし（たまたま）' if expected == actual_D else '矛盾！'}")
    print()
    print("D が M_k であると仮定した場合、D(<D>) = D(<M_k>) について:")
    print("  D(<D>) が受理 → D は「ループする TM」として定義されたので矛盾")
    print("  D(<D>) がループ → D は「受理する TM」として定義されたので矛盾")
    print("  ∴ D を決定する HALT_TM 決定器 H は存在しない")

demonstrate_diagonalization()

# 停止問題の決定不能性から導かれる実用的な帰結
print("\n停止問題の決定不能性の実用的帰結:")
print("  1. 任意のプログラムの停止性を100%保証する汎用ツールは作れない")
print("  2. ウイルス検知は停止問題に帰着されるため完全な検知は不可能")
print("  3. プログラムが仕様を満たすかの完全な自動検証は不可能")
print("  4. これらは理論的限界 — 部分的解決策（タイムアウト、形式手法）は有用")
```

## 使用場面

- **プログラム検証の限界理解**: 任意のプログラムの停止性を自動判定する汎用ツールが原理的に作れないことを理解するために使用する
- **静的解析ツール設計**: 完全な解析が不可能であることを踏まえ、偽陽性・偽陰性を許容した近似的解析を設計する
- **型システム設計**: 完全な型チェックと決定可能性のトレードオフを理解するために停止問題の知識が重要となる
- **セキュリティ**: マルウェアの挙動解析が決定不能であることを踏まえ、実践的な検知手法を設計する

## 参考文献

- Turing, A. M. "On computable numbers, with an application to the Entscheidungsproblem" (1936)
- Sipser, M. "Introduction to the Theory of Computation" (Cengage Learning)
- Davis, M. "Computability and Unsolvability"

<AffiliateBanner site="theory_navi" />
