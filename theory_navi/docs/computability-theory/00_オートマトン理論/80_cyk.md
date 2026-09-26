import AffiliateBanner from '@site/src/components/AffiliateBanner';

# CYK アルゴリズム

## CYK アルゴリズムとは

> CYK アルゴリズム（Cocke-Younger-Kasami algorithm）とは、チョムスキー標準形（CNF）の文脈自由文法に対して、与えられた文字列がその文法から生成可能かどうかを動的計画法で判定する O(n^3 |G|) 時間のアルゴリズムである。

CYK アルゴリズムは動的計画法を文脈自由言語の構文解析に適用した代表的なアルゴリズムです。前提として文法がチョムスキー標準形（A → BC または A → a の形のみ）である必要があります。任意の CFG は CNF に変換可能です。

アルゴリズムの核心は「部分文字列 w[i..j] を導出できる非終端記号の集合」を底-上方向（Bottom-up）に埋めていく点です。表 table[i][j] に「文字列の i 番目から j 番目の部分文字列を生成できる非終端記号の集合」を格納します。長さ1の部分文字列から始め、長さを1ずつ増やしながら全ての分割 k を試して規則 A → BC が適用できるか確認します。最終的に開始記号 S が table[0][n-1] に含まれれば文字列は受理されます。

計算量は O(n^3 × |R|) です（n は入力長、|R| は規則数）。単純なパーサーとしては効率は良くありませんが、確実に動作し、アーリー法（Earley's algorithm）等の基礎となる考え方を持ちます。

## CYK アルゴリズムの計算量

| 項目 | 値 |
|------|-----|
| 前提 | 文法がチョムスキー標準形（CNF） |
| 時間計算量 | O(n^3 \|R\|)（n: 入力長, \|R\|: 規則数） |
| 空間計算量 | O(n^2 \|V\|)（\|V\|: 非終端記号数） |
| 手法 | 動的計画法（Bottom-up） |
| 出力 | 受理 / 拒否（および解析木の再構築が可能） |

```python
def cyk(grammar, start, string):
    """
    CYK アルゴリズム（CNF 文法のみ対応）
    grammar: dict 非終端記号 -> list of (str または str のタプル)
             例: {'S': [('A','B'), 'a'], 'A': ['a'], 'B': ['b']}
    start: 開始記号
    string: 判定する文字列（リスト形式）
    """
    n = len(string)
    if n == 0:
        return [] in grammar.get(start, [])

    # table[i][j] = 部分文字列 string[i:j+1] を生成できる非終端記号の集合
    table = [[set() for _ in range(n)] for _ in range(n)]

    # 長さ1の初期化 (A -> a)
    for i, sym in enumerate(string):
        for lhs, rhs_list in grammar.items():
            for rhs in rhs_list:
                if rhs == sym:
                    table[i][i].add(lhs)

    # 長さ 2..n の部分文字列
    for length in range(2, n + 1):          # 部分文字列の長さ
        for i in range(n - length + 1):     # 開始位置
            j = i + length - 1             # 終了位置
            for k in range(i, j):          # 分割点
                # B ∈ table[i][k], C ∈ table[k+1][j] なら A → BC を適用
                for lhs, rhs_list in grammar.items():
                    for rhs in rhs_list:
                        if (isinstance(rhs, tuple) and len(rhs) == 2):
                            B, C = rhs
                            if B in table[i][k] and C in table[k+1][j]:
                                table[i][j].add(lhs)

    # デバッグ: テーブルの表示
    print(f"入力: {string}")
    print("CYK テーブル (非終端記号の集合):")
    for length in range(1, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            if table[i][j]:
                print(f"  table[{i}][{j}] ({string[i:j+1]}) = {table[i][j]}")

    return start in table[0][n - 1]

# 例: 文法 (CNF形式)
# S -> AB | BC
# A -> BA | a
# B -> CC | b
# C -> AB | a
# この文法で "baaba" を解析する
grammar = {
    'S': [('A', 'B'), ('B', 'C')],
    'A': [('B', 'A'), 'a'],
    'B': [('C', 'C'), 'b'],
    'C': [('A', 'B'), 'a'],
}

string = list('baaba')
result = cyk(grammar, 'S', string)
print(f"\n'baaba' は S から生成可能か: {result}")

# 簡単な例: S -> a b を CNF で
grammar2 = {
    'S': [('A', 'B')],
    'A': ['a'],
    'B': ['b'],
}
for s in ['ab', 'a', 'b', 'ba', 'aabb']:
    r = cyk(grammar2, 'S', list(s))
    print(f"'{s}' -> {'受理' if r else '拒否'}")
```

## 使用場面

- **構文解析**: 自然言語処理や形式言語処理で文の文法適合性を判定する場合に使用する
- **コンパイラ研究**: Bottom-up 構文解析の理論的基礎として学習・研究される
- **バイオインフォマティクス**: RNA 二次構造予測に CYK の変形版（Nussinov アルゴリズム等）が応用される
- **機械翻訳**: 統計的構文解析モデルの内部で文法構造の確率計算に使用される

## 参考文献

- Cocke, J., Schwartz, J. "Programming Languages and their Compilers" (1970)
- Younger, D. H. "Recognition and parsing of context-free languages in time n^3" (Information and Control, 1967)
- Sipser, M. "Introduction to the Theory of Computation" (Cengage Learning)

<AffiliateBanner site="theory_navi" />
