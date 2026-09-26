import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 文脈自由言語のポンピング補題

## 文脈自由言語のポンピング補題とは

> 文脈自由言語のポンピング補題とは、「言語が文脈自由ならば、十分長い文字列は uvwxy の5つに分割でき、v と x を同じ回数ポンピング（繰り返し）しても言語に属し続ける」という性質であり、ある言語が文脈自由でないことを証明するために用いられる。

文脈自由言語のポンピング補題（Bar-Hillel の補題）の主張は次の通りです。言語 L が文脈自由言語ならば、あるポンピング長 p ≥ 1 が存在して、長さ p 以上の任意の文字列 w ∈ L について、w = uvwxy と分割できます（ただし |vwx| ≤ p、|vx| ≥ 1）。そしてすべての i ≥ 0 に対して uv^i wx^i y ∈ L が成り立ちます。

正規言語のポンピング補題との違いは、分割が5つの部分（uvwxy）になり、v と x を同時にポンピングする点です。直感的には、文脈自由言語の解析木でポンプ長以上の文字列を解析すると、木のある分岐で同じ非終端記号が繰り返し現れます（鳩の巣原理）。その繰り返し部分が v と x に対応し、繰り返し回数を変えても解析木を作れます。

典型的な非 CFL の例として {a^n b^n c^n | n ≥ 0} があります。この言語はどのように5分割しても v と x の両方が同時に a・b・c の3種の文字を含むことはできないため、ポンピング後に a・b・c の個数が崩れます。

## 正規言語 vs CFL のポンピング補題の比較

| 項目 | 正規言語のポンピング補題 | CFL のポンピング補題 |
|------|------------------------|---------------------|
| 分割 | w = xyz（3分割） | w = uvwxy（5分割） |
| ポンプ条件 | \|xy\| ≤ p, \|y\| ≥ 1 | \|vwx\| ≤ p, \|vx\| ≥ 1 |
| ポンピング | xy^i z ∈ L | uv^i wx^i y ∈ L |
| 対象クラス | 正規言語（DFA が認識） | 文脈自由言語（PDA が認識） |
| 典型的な反例 | {0^n 1^n} | {a^n b^n c^n} |

```python
def pumping_lemma_cfl_demo(p=3):
    """
    CFL ポンピング補題の反例シミュレーション
    言語: {a^n b^n c^n | n >= 1} （CFL でないことを示す）
    """
    # w = a^p b^p c^p を選ぶ
    w = 'a' * p + 'b' * p + 'c' * p
    print(f"選んだ文字列 w = a^{p}b^{p}c^{p} = '{w}' (長さ {len(w)})")

    def in_L(s):
        """s が a^n b^n c^n に属するか"""
        n = len(s) // 3
        if len(s) != 3 * n or n == 0:
            return False
        return s == 'a' * n + 'b' * n + 'c' * n

    print(f"w は L に属するか: {in_L(w)}")
    print()

    violations = 0
    checks = 0
    # |vwx| <= p, |vx| >= 1 の全分割を試す
    for u_len in range(len(w) + 1):
        for vwx_len in range(1, p + 1):
            if u_len + vwx_len > len(w):
                break
            for v_len in range(0, vwx_len + 1):
                for x_len in range(0, vwx_len - v_len + 1):
                    if v_len + x_len == 0:
                        continue  # |vx| >= 1 が必要
                    w_len = vwx_len - v_len - x_len
                    y_len = len(w) - u_len - vwx_len

                    u = w[:u_len]
                    v = w[u_len:u_len + v_len]
                    middle_w = w[u_len + v_len:u_len + v_len + w_len]
                    x = w[u_len + v_len + w_len:u_len + v_len + w_len + x_len]
                    y = w[u_len + v_len + w_len + x_len:]

                    # i=0 または i=2 でチェック
                    for i in [0, 2]:
                        pumped = u + v * i + middle_w + x * i + y
                        checks += 1
                        if not in_L(pumped):
                            violations += 1
                            if violations <= 3:
                                print(f"違反例: u='{u}', v='{v}', w='{middle_w}', x='{x}', y='{y}'")
                                print(f"  i={i}: uv^{i}wx^{i}y = '{pumped}' → L に属さない")

    print(f"\n確認した分割数: {checks}, ポンピング補題違反数: {violations}")
    print(f"→ この言語はポンピング補題を満たさない分割が存在するため CFL でない")

    # 対比: {a^n b^n} は CFL である例
    print("\n参考: {a^n b^n} は CFL（PDA で認識可能）:")
    def in_ab(s):
        n = len(s) // 2
        return len(s) == 2 * n and s == 'a' * n + 'b' * n
    w2 = 'a' * p + 'b' * p
    print(f"  '{w2}' の5分割でポンピングが常に成功することを確認できる")

pumping_lemma_cfl_demo(p=3)
```

## 使用場面

- **言語クラスの判別**: 文脈自由文法では記述できない言語を識別して、文脈依存文法や計算可能な解析手法を選択する
- **コンパイラ設計の限界理解**: 「変数が宣言済みかどうか」は CFL では検査できないことの理論的根拠となる
- **形式言語理論の教育**: チョムスキー階層の各レベルの限界を証明する主要な道具として使われる
- **プログラム解析**: 型整合性の検証など、CFG の限界を超える解析が必要な場面を理論的に識別する

## 参考文献

- Bar-Hillel, Y., Perles, M., Shamir, E. "On formal properties of simple phrase structure grammars" (1961)
- Sipser, M. "Introduction to the Theory of Computation" (Cengage Learning)
- Hopcroft, J. E., Motwani, R., Ullman, J. D. "Introduction to Automata Theory, Languages, and Computation"

<AffiliateBanner site="theory_navi" />
