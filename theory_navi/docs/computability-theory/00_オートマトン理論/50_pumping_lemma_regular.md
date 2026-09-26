import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 正規言語のポンピング補題

## 正規言語のポンピング補題とは

> 正規言語のポンピング補題とは、「ある言語が正規言語であれば、十分長い文字列はすべてポンピング（繰り返し）可能である」という性質であり、特定の言語が正規言語でないことを証明するために用いられる。

ポンピング補題（Pumping Lemma for Regular Languages）の主張は次の通りです。言語 L が正規言語ならば、あるポンピング長 p ≥ 1 が存在して、長さ p 以上の任意の文字列 w ∈ L について、w = xyz と分割できる（ただし |xy| ≤ p かつ |y| ≥ 1）。そしてすべての i ≥ 0 に対して xy^i z ∈ L が成り立つ。

直感的には、DFA が p 状態を持つとき、長さ p 以上の入力を読むと必ずどこかの状態を2度通ります（鳩の巣原理）。その繰り返し部分（ループ）を何度でも繰り返せるため、受理される文字列になります。

ポンピング補題は正規言語でないことを証明する道具として使います。手順は「その言語がポンピング補題を満たさないこと」を示す対偶証明です。典型例として \{0^n 1^n | n ≥ 0} が正規言語でないことを証明できます。注意点として、ポンピング補題は正規言語であるための十分条件ではありません（満たしても正規とは限らない）。

## ポンピング補題の証明手順

| ステップ | 操作 |
|---------|------|
| 1. 仮定 | 言語 L が正規であると仮定し、ポンピング長 p が存在するとする |
| 2. 文字列選択 | L に属する長さ ≥ p の具体的な文字列 w を選ぶ |
| 3. 分割の網羅 | w = xyz のすべての分割（\|xy\| ≤ p, \|y\| ≥ 1）に対して |
| 4. 矛盾の導出 | ある i ≥ 0 で xy^i z ∉ L となることを示す |
| 5. 結論 | 矛盾したので L は正規言語でない |

```python
def check_pumping_lemma_counterexample(language_test, p_candidate):
    """
    ポンピング補題の反例探索（教育目的のシミュレーション）
    language_test: 文字列が言語に属するか判定する関数
    p_candidate: 試すポンピング長
    """
    # {0^n 1^n | n >= 1} を例とする
    # w = 0^p 1^p を選ぶ
    n = p_candidate
    w = '0' * n + '1' * n
    print(f"選んだ文字列 w = 0^{n}1^{n} = '{w}' (長さ {len(w)})")
    print(f"w は L に属するか: {language_test(w)}")
    print()

    # |xy| <= p, |y| >= 1 の全分割を試す
    for split in range(1, p_candidate + 1):  # |xy| = split, |y| >= 1
        for y_len in range(1, split + 1):    # |y| = y_len
            x_len = split - y_len
            x = w[:x_len]
            y = w[x_len:x_len + y_len]
            z = w[x_len + y_len:]

            # y の内容を確認（0だけで構成されているはず）
            pumped_0 = x + y * 0 + z  # i=0: y を0回繰り返す
            pumped_2 = x + y * 2 + z  # i=2: y を2回繰り返す

            in_L_0 = language_test(pumped_0)
            in_L_2 = language_test(pumped_2)

            if not in_L_0 or not in_L_2:
                print(f"分割 x='{x}', y='{y}', z='{z}'")
                print(f"  xy^0 z = '{pumped_0}' → L に属するか: {in_L_0}")
                print(f"  xy^2 z = '{pumped_2}' → L に属するか: {in_L_2}")
                if not in_L_0 or not in_L_2:
                    print("  → ポンピング補題に違反！この言語は正規ではない")
                    return
    print("この分割では矛盾が見つからなかった")

def is_equal_zeros_ones(s):
    """0^n 1^n 言語: 0が n個, 1が n個"""
    if not s:
        return False
    mid = len(s) // 2
    return s[:mid] == '0' * mid and s[mid:] == '1' * mid and len(s) % 2 == 0

print("言語 {0^n 1^n | n >= 1} の正規性検証:")
check_pumping_lemma_counterexample(is_equal_zeros_ones, p_candidate=3)
```

## 使用場面

- **言語クラスの分類**: ある言語が正規言語でないことを形式的に証明する場合に使用する
- **コンパイラ理論**: 字句解析（正規表現）と構文解析（文脈自由文法）の境界を理解するために使用する
- **アルゴリズム設計**: 有限オートマトンで解けない問題を識別してより強力な計算モデルを選択する
- **教育**: 形式言語理論の学習で帰納的証明と計算モデルの限界を理解するための重要な補題である

## 参考文献

- Sipser, M. "Introduction to the Theory of Computation" (Cengage Learning)
- Hopcroft, J. E., Motwani, R., Ullman, J. D. "Introduction to Automata Theory, Languages, and Computation"
- 岩間一雄「オートマトン・言語と計算理論」(共立出版)

<AffiliateBanner site="theory_navi" />
