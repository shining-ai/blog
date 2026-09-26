import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 再帰下降パーサの実装

## 再帰下降パーサとは

> 再帰下降パーサ（Recursive Descent Parser）とは、文法の各非終端記号に対して1つの関数を対応させ、それらが相互に再帰呼び出しすることで構文解析を行うトップダウン型パーサの実装手法である。

再帰下降パーサは、文法規則をそのままコードに写し取れるため、可読性が高く手書きしやすいという特長がある。GCC・Clang・Rustコンパイラ・TypeScript コンパイラなど、多くの実用的なコンパイラが手書きの再帰下降パーサを採用している。

文法が `LL(1)` の条件を満たす場合（先読みトークン1つで次の規則が確定する場合）、実装は特に単純になる。ただし左再帰（`expr ::= expr "+" term` のような規則）は直接再帰下降では扱えないため、右再帰や反復に書き換える必要がある。また、エラーメッセージのカスタマイズが容易な点も実用上の大きな利点である。パーサジェネレータ生成のパーサよりもエラーリカバリを細かく制御できる。

## LL(1) 文法の条件

| 条件 | 説明 |
|------|------|
| 左再帰なし | `A ::= A α` のような規則を含まない |
| 先読み1トークン | 次の1トークンだけで適用規則が一意に決まる |
| FIRST 集合が互いに素 | 各選択肢の開始トークン集合が重複しない |
| FOLLOW 集合との整合性 | ε 規則がある場合も先読みで規則が確定する |

```python
# 完全な算術式パーサ（再帰下降・演算子優先順位対応）
# 文法:
#   program = stmt { stmt }
#   stmt    = "print" expr ";" | assignment ";"
#   assignment = IDENT "=" expr
#   expr    = term { ("+" | "-") term }
#   term    = unary { ("*" | "/") unary }
#   unary   = "-" unary | factor
#   factor  = NUMBER | IDENT | "(" expr ")"

from dataclasses import dataclass, field
from typing import Optional, Union
import re

# --- トークン ---
@dataclass
class Token:
    kind: str
    value: str

def tokenize(src: str) -> list[Token]:
    spec = [
        ('NUMBER', r'\d+'),
        ('IDENT',  r'[a-zA-Z_]\w*'),
        ('OP',     r'==|!=|[+\-*/=;()]'),
        ('SKIP',   r'\s+'),
    ]
    pattern = '|'.join(f'(?P<{k}>{p})' for k, p in spec)
    tokens = []
    for m in re.finditer(pattern, src):
        if m.lastgroup != 'SKIP':
            tokens.append(Token(m.lastgroup, m.group()))
    tokens.append(Token('EOF', ''))
    return tokens

# --- AST ノード ---
@dataclass
class Num:
    value: int

@dataclass
class Var:
    name: str

@dataclass
class BinOp:
    op: str
    left: 'Node'
    right: 'Node'

@dataclass
class Unary:
    op: str
    operand: 'Node'

@dataclass
class Assign:
    name: str
    value: 'Node'

@dataclass
class Print:
    value: 'Node'

Node = Union[Num, Var, BinOp, Unary, Assign, Print]

# --- パーサ ---
class RecursiveDescentParser:
    def __init__(self, tokens: list[Token]):
        self.tokens = tokens
        self.pos = 0

    @property
    def current(self) -> Token:
        return self.tokens[self.pos]

    def eat(self, expected_value: str = None) -> Token:
        tok = self.current
        if expected_value and tok.value != expected_value:
            raise SyntaxError(
                f"Expected '{expected_value}', got '{tok.value}'"
            )
        self.pos += 1
        return tok

    def parse_program(self) -> list[Node]:
        stmts = []
        while self.current.kind != 'EOF':
            stmts.append(self.parse_stmt())
        return stmts

    def parse_stmt(self) -> Node:
        if self.current.value == 'print':
            self.eat('print')
            val = self.parse_expr()
            self.eat(';')
            return Print(val)
        else:
            name = self.eat().value  # IDENT
            self.eat('=')
            val = self.parse_expr()
            self.eat(';')
            return Assign(name, val)

    def parse_expr(self) -> Node:
        # expr = term { ("+" | "-") term }
        node = self.parse_term()
        while self.current.value in ('+', '-'):
            op = self.eat().value
            node = BinOp(op, node, self.parse_term())
        return node

    def parse_term(self) -> Node:
        # term = unary { ("*" | "/") unary }
        node = self.parse_unary()
        while self.current.value in ('*', '/'):
            op = self.eat().value
            node = BinOp(op, node, self.parse_unary())
        return node

    def parse_unary(self) -> Node:
        # unary = "-" unary | factor
        if self.current.value == '-':
            self.eat('-')
            return Unary('-', self.parse_unary())
        return self.parse_factor()

    def parse_factor(self) -> Node:
        # factor = NUMBER | IDENT | "(" expr ")"
        tok = self.current
        if tok.kind == 'NUMBER':
            self.eat()
            return Num(int(tok.value))
        elif tok.kind == 'IDENT':
            self.eat()
            return Var(tok.value)
        elif tok.value == '(':
            self.eat('(')
            node = self.parse_expr()
            self.eat(')')
            return node
        raise SyntaxError(f"Unexpected token: {tok.value!r}")


# 動作確認
src = "x = 3 + 5 * 2; print x;"
tokens = tokenize(src)
parser = RecursiveDescentParser(tokens)
ast = parser.parse_program()
for node in ast:
    print(node)
# Assign(name='x', value=BinOp(op='+', left=Num(value=3),
#         right=BinOp(op='*', left=Num(value=5), right=Num(value=2))))
# Print(value=Var(name='x'))
```

## 使用場面

- GCC・Clang・Rustc など実用コンパイラのフロントエンド実装
- TypeScript・Go・Swift のコンパイラでのパーサ実装
- 小規模 DSL（設定ファイル・クエリ言語）のパーサを手書きで実装する場合
- エラーメッセージを詳細にカスタマイズしたい言語処理系の開発

## 参考文献

- Crafting Interpreters — Robert Nystrom（[無料公開](https://craftinginterpreters.com/)）
- Aho, A. V. et al. (2006). *Compilers: Principles, Techniques, and Tools* (2nd ed.). Addison-Wesley.
- [Go パーサの実装（go/parser）](https://pkg.go.dev/go/parser)

<AffiliateBanner site="language_navi" />
