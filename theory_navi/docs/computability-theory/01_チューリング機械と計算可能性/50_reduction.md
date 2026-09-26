import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 帰着（Reduction）の概念

## 帰着とは

> 帰着（Reduction）とは、問題 A の任意のインスタンスを問題 B のインスタンスに変換する計算可能な関数 f を構成することで、「B が解けるなら A も解ける」「A が解けないなら B も解けない」という関係を確立する証明技法である。

帰着は計算理論において問題の難しさを比較するための基本ツールです。A が B に多対一帰着可能（A ≤_m B）とは、計算可能な関数 f が存在して全ての x について「x ∈ A ⟺ f(x) ∈ B」が成り立つことです。これは「B を解く機械があれば A も解ける（f を前処理として組み合わせる）」ことを意味します。

帰着の主な利用方法は2つです。決定可能性の証明では「既知の決定可能問題 B に A を帰着できる」ことで A の決定可能性を示します。決定不能性の証明（より一般的）では「既知の決定不能問題 A を B に帰着できる」ことで B の決定不能性を示します（「A ≤_m B かつ A が決定不能 → B も決定不能」）。

典型的な帰着の連鎖は次の通りです。A_TM（受理問題）の決定不能性 → HALT_TM の決定不能性 → E_TM（空性問題）の決定不能性 → EQ_TM（等価性問題）の決定不能性、というように帰着を連鎖させて多くの問題の決定不能性を証明できます。

## 帰着の種類と特徴

| 種類 | 記法 | 定義 | 用途 |
|------|------|------|------|
| 多対一帰着（Mapping reduction） | A ≤_m B | 計算可能な f: x∈A ⟺ f(x)∈B | 決定可能性・認識可能性の伝達 |
| チューリング帰着（Oracle reduction） | A ≤_T B | B の神託を使い A を解く TM | 計算可能性のより広い比較 |
| 多項式時間帰着 | A ≤_p B | 多項式時間で変換可能 | NP 完全性の証明 |

```python
# 帰着の概念的実装例
# A_TM を HALT_TM に帰着させる

def reduction_a_tm_to_halt_tm(M_description, w):
    """
    A_TM = {<M,w> | M が w を受理} を
    HALT_TM = {<M,w> | M が w 上で停止} に帰着する変換 f

    変換: <M, w> -> <M', w>
    M' の動作:
      - M を w 上でシミュレートする
      - M が受理すれば M' も受理（停止）
      - M が拒否すれば M' は無限ループ（停止しない）

    これにより:
      M が w を受理 ⟺ M' が w 上で停止
    つまり <M,w> ∈ A_TM ⟺ <M',w> ∈ HALT_TM
    """
    # M' の疑似的な記述を返す
    M_prime = {
        "description": f"入力 w={w} に対して {M_description} をシミュレート",
        "on_accept": "受理（停止）",
        "on_reject": "無限ループ（停止しない）",
        "original_M": M_description,
        "input": w
    }
    return M_prime

def reduction_halt_to_e_tm(M_description):
    """
    HALT_TM を E_TM = {<M> | L(M) = ∅} に帰着（対角線の連鎖）

    変換: <M, w> -> <M''>
    M'' の動作:
      - 入力を無視して M を w 上でシミュレートする
      - M が停止すれば（受理または拒否）、M'' は受理
      - M がループすれば M'' もループ

    これにより:
      M が w 上で停止 ⟺ L(M'') ≠ ∅
    逆に言えば:
      M が w 上でループ ⟺ L(M'') = ∅
    """
    M_double_prime = {
        "description": f"{M_description} を w 上でシミュレート（入力無視）",
        "language": "M が停止するなら全文字列を受理 / ループなら空"
    }
    return M_double_prime

# 帰着の連鎖デモ
print("帰着の連鎖（決定不能性の伝播）:")
print()

problems = [
    ("A_TM", "{<M,w> | M が w を受理}", "停止問題（対角線論法で直接証明）"),
    ("HALT_TM", "{<M,w> | M が w 上で停止}", "A_TM ≤_m HALT_TM"),
    ("E_TM", "{<M> | L(M) = ∅}", "HALT_TM ≤_m E_TM"),
    ("EQ_TM", "{<M1,M2> | L(M1) = L(M2)}", "E_TM ≤_m EQ_TM"),
]

for name, definition, reason in problems:
    print(f"  {name}: {definition}")
    print(f"    → 決定不能（理由: {reason}）")
    print()

# 帰着の具体的な変換関数の実例
print("E_TM の決定不能性の証明概略:")
print("  入力 <M> に対して M'' を構成: M''(x) = M の動作を無視して M を任意の w でシミュレート")
print("  E_TM 決定器があれば HALT_TM も決定できる → 矛盾")
print()

# 決定可能性の帰着（正の方向）
print("決定可能性の帰着（正の方向）:")
print("  A_DFA ≤_m A_NFA（DFA は NFA の特殊ケース）")
print("  A_NFA ≤_m A_DFA（部分集合構成法で変換）")
print("  ∴ A_DFA と A_NFA は同じ決定可能性を持つ")
```

## 使用場面

- **決定不能性の証明**: 新しい問題の決定不能性を証明するために既知の決定不能問題（A_TM 等）から帰着する
- **NP 完全性の証明**: 新しい問題が NP 困難であることを示すために SAT や 3-SAT から多項式時間帰着を構成する
- **問題の難易度分類**: 複数の問題が「本質的に同じ難しさ」であることを帰着の相互方向性で示す
- **アルゴリズム設計**: あるアルゴリズムが別の問題を解くサブルーチンとして利用できるかを帰着の構造で考える

## 参考文献

- Sipser, M. "Introduction to the Theory of Computation" (Cengage Learning)
- Papadimitriou, C. H. "Computational Complexity" (Addison-Wesley)
- Hopcroft, J. E., Motwani, R., Ullman, J. D. "Introduction to Automata Theory, Languages, and Computation"

<AffiliateBanner site="theory_navi" />
