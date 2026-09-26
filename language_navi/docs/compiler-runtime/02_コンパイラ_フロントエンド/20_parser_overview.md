import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 構文解析の概要（BNF・EBNF）

## 構文解析とは

> 構文解析（Syntax Analysis / Parsing）とは、字句解析で得られたトークン列を、言語の文法規則に従ってツリー状のデータ構造（構文木）に変換する処理であり、コンパイラのフロントエンドの中核をなす。

構文解析器（パーサ）は、プログラムの「文法的な正しさ」を検証し、意味解析・コード生成が扱いやすい構造へ変換する。字句解析が「単語」を扱うのに対し、構文解析は「文」の構造を扱う。たとえば `x = 3 + 5 * 2` というトークン列は、演算子の優先順位を反映したツリーに変換される。

文法を形式的に記述する記法として BNF（バッカス・ナウア記法）と EBNF（拡張 BNF）が広く使われる。BNF は `<expr> ::= <term> | <expr> "+" <term>` のように非終端記号の書き換え規則を定義する。EBNF は `{ }` による繰り返しや `[ ]` による省略可能を追加して可読性を高めた記法である。

パーサには大きく「トップダウン型」と「ボトムアップ型」の二種類がある。トップダウン型はスタート記号から始めてトークンを消費しながら木を上から構築し、ボトムアップ型はトークンから始めて還元を繰り返しスタート記号を目指す。代表的なアルゴリズムとして再帰下降パーサ（トップダウン）と LR パーサ（ボトムアップ）がある。

## BNF と EBNF の記法比較

| 概念 | BNF | EBNF |
|------|-----|------|
| 定義 | `<A> ::= ...` | `A = ...` |
| 選択（OR） | `<A> ::= <B> \| <C>` | `A = B \| C` |
| 連接 | `<A> ::= <B> <C>` | `A = B C` |
| 繰り返し（0回以上） | 再帰規則で表現 | `A = { B }` |
| 省略可能 | 再帰規則で表現 | `A = [ B ]` |
| グループ化 | 非終端記号で分割 | `A = ( B \| C ) D` |

```python
# EBNF で定義した算術式文法の例
# expr   = term { ("+" | "-") term }
# term   = factor { ("*" | "/") factor }
# factor = NUMBER | "(" expr ")"

# この文法を PEG (Parsing Expression Grammar) 風に Python で実装する

from dataclasses import dataclass
from typing import Union

# --- AST ノード ---
@dataclass
class Num:
    value: int

@dataclass
class BinOp:
    op: str
    left: 'Expr'
    right: 'Expr'

Expr = Union[Num, BinOp]

# --- トークン列を消費する簡易パーサ ---
class Parser:
    def __init__(self, tokens: list):
        self.tokens = tokens
        self.pos = 0

    def peek(self) -> str:
        return self.tokens[self.pos].kind if self.pos < len(self.tokens) else 'EOF'

    def consume(self, kind: str):
        tok = self.tokens[self.pos]
        assert tok.kind == kind, f"Expected {kind}, got {tok.kind}"
        self.pos += 1
        return tok

    def parse_expr(self) -> Expr:
        # expr = term { ("+" | "-") term }
        left = self.parse_term()
        while self.peek() in ('PLUS', 'MINUS'):
            op = self.tokens[self.pos].value
            self.pos += 1
            right = self.parse_term()
            left = BinOp(op, left, right)
        return left

    def parse_term(self) -> Expr:
        # term = factor { ("*" | "/") factor }
        left = self.parse_factor()
        while self.peek() in ('STAR', 'SLASH'):
            op = self.tokens[self.pos].value
            self.pos += 1
            right = self.parse_factor()
            left = BinOp(op, left, right)
        return left

    def parse_factor(self) -> Expr:
        # factor = NUMBER | "(" expr ")"
        if self.peek() == 'NUMBER':
            tok = self.consume('NUMBER')
            return Num(int(tok.value))
        elif self.peek() == 'LPAREN':
            self.consume('LPAREN')
            node = self.parse_expr()
            self.consume('RPAREN')
            return node
        else:
            raise SyntaxError(f"Unexpected token: {self.peek()}")
```

```
BNF による算術式文法の定義:

  <expr>   ::= <term> | <expr> "+" <term> | <expr> "-" <term>
  <term>   ::= <factor> | <term> "*" <factor> | <term> "/" <factor>
  <factor> ::= NUMBER | "(" <expr> ")"

EBNF による同等の定義（より簡潔）:

  expr   = term { ("+" | "-") term } .
  term   = factor { ("*" | "/") factor } .
  factor = NUMBER | "(" expr ")" .
```

## 使用場面

- プログラミング言語の文法仕様書を形式的に記述する場合
- パーサジェネレータ（Yacc・Bison・ANTLR）への入力文法を定義する場合
- プロトコルや設定ファイル形式の構文を設計・文書化する場合
- 言語処理系の学習・教育で構文規則を理解する場合

## 参考文献

- Aho, A. V. et al. (2006). *Compilers: Principles, Techniques, and Tools* (2nd ed.). Addison-Wesley.
- Grune, D. & Jacobs, C. J. H. (2008). *Parsing Techniques: A Practical Guide* (2nd ed.). Springer.
- [ANTLR 公式ドキュメント](https://www.antlr.org/)

<AffiliateBanner site="language_navi" />
