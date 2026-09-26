import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 文脈自由文法（CFG）

## 文脈自由文法（CFG）とは

> 文脈自由文法（CFG: Context-Free Grammar）とは、非終端記号を文脈に依らず書き換えることができる生成規則の体系であり、文脈自由言語を定義する。プログラミング言語の構文規則やマークアップ言語の記述に広く用いられる。

CFG は4要素の組 (V, Σ, R, S) で定義されます。V は非終端記号の有限集合、Σ は終端記号の有限集合（V ∩ Σ = ∅）、R は生成規則の有限集合（各規則は A → α の形で A ∈ V, α ∈ (V ∪ Σ)*）、S ∈ V は開始記号です。「文脈自由」とは、規則 A → α が A の周囲（文脈）に関わらず適用できることを意味します。

導出（Derivation）は開始記号 S から生成規則を繰り返し適用して文字列を生成するプロセスです。左端導出（Leftmost derivation）では常に最左の非終端記号を書き換えます。ある文字列が複数の異なる解析木を持つ場合、その文法は曖昧（Ambiguous）と言います。

チョムスキー標準形（CNF: Chomsky Normal Form）は CFG を A → BC または A → a の形の規則のみに変換した標準形で、CYK アルゴリズムなどの解析に便利です。CFG と PDA の表現力は等しく、CFG が生成する言語クラスがちょうど文脈自由言語です。

## CFG の主要な概念

| 概念 | 説明 |
|------|------|
| 生成規則 | A → α: 非終端記号 A を文字列 α に書き換える |
| 導出 | 生成規則を繰り返し適用して終端記号列を生成 |
| 解析木 | 導出の木構造表現。葉が終端記号、内部節が非終端記号 |
| 曖昧文法 | 1つの文字列に複数の解析木が存在する文法 |
| CNF | A → BC または A → a の形のみの標準形 |

```python
class CFG:
    """文脈自由文法の表現と CYK 前処理（CNF 変換なし簡易版）"""

    def __init__(self, rules, start):
        self.rules = rules  # dict: str -> list of str
        self.start = start

    def generate(self, symbol, depth=0, max_depth=5):
        """文法からランダムに文字列を生成（深さ制限付き）"""
        import random
        if depth > max_depth:
            return ''
        if symbol not in self.rules:
            return symbol  # 終端記号
        production = random.choice(self.rules[symbol])
        return ''.join(self.generate(s, depth + 1, max_depth)
                       for s in production)

    def show_rules(self):
        for lhs, rhs_list in self.rules.items():
            for rhs in rhs_list:
                print(f"  {lhs} -> {' '.join(rhs) if rhs else 'ε'}")

# 例1: 算術式の CFG
# E -> E + T | T
# T -> T * F | F
# F -> ( E ) | id
expr_grammar = CFG(
    rules={
        'E': [['E', '+', 'T'], ['T']],
        'T': [['T', '*', 'F'], ['F']],
        'F': [['(', 'E', ')'], ['id']],
    },
    start='E'
)

print("算術式文法の生成規則:")
expr_grammar.show_rules()

# 例2: 回文言語の CFG
# S -> a S a | b S b | a | b | ε
palindrome_grammar = CFG(
    rules={
        'S': [['a', 'S', 'a'], ['b', 'S', 'b'], ['a'], ['b'], ['']],
    },
    start='S'
)

print("\n回文文法の生成規則:")
palindrome_grammar.show_rules()
print("\n回文文法から生成した例:")
for _ in range(5):
    print(f"  {palindrome_grammar.generate('S', max_depth=3) or 'ε'}")

# CNF 変換の説明（手順のみ）
print("""
チョムスキー標準形（CNF）への変換手順:
  1. START: 新しい開始記号 S0 → S を追加
  2. TERM:  終端記号 a を新非終端 Na → a で置き換える
  3. BIN:   右辺が3記号以上の規則を2項規則に分割
  4. DEL:   ε規則を除去（開始記号のみ例外）
  5. UNIT:  単位規則 A → B を展開
変換後: 全規則が A → BC または A → a の形になる
""")
```

## 使用場面

- **プログラミング言語設計**: BNF（バッカス-ナウア記法）は CFG であり、言語仕様書でC・Java などの構文を定義する
- **コンパイラ構文解析**: LL(1) パーサー・LR(1) パーサーは CFG から自動生成され、ソースコードの解析木を構築する
- **自然言語処理**: 文の構文解析（係り受け解析）に CFG ベースのモデルが使われる
- **XML/HTML バリデーション**: 文書型定義（DTD）は文脈自由文法で XML 文書の構造を規定する

## 参考文献

- Sipser, M. "Introduction to the Theory of Computation" (Cengage Learning)
- Aho, A. V., Lam, M. S., Sethi, R., Ullman, J. D. "Compilers: Principles, Techniques, and Tools"
- 岩間一雄「オートマトン・言語と計算理論」(共立出版)

<AffiliateBanner site="theory_navi" />
