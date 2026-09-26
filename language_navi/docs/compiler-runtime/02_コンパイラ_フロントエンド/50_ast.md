import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 抽象構文木（AST）の構築

## 抽象構文木とは

> 抽象構文木（Abstract Syntax Tree, AST）とは、ソースコードの構文構造をツリー状に表現したデータ構造であり、括弧や区切り文字など文法的な補助記号を取り除いてプログラムの本質的な意味構造だけを保持する。

パーサが生成する「具象構文木（CST）」はすべてのトークンを含むが、AST は意味解析・最適化・コード生成に不要な情報を捨てたスリムな表現である。たとえば `(3 + 5)` の括弧は演算の優先順位を表すだけなので AST には現れず、`BinOp('+', 3, 5)` のようなノードとして格納される。

AST の各ノードはプログラムの構成要素（式・文・宣言）に対応する。型システム、意味解析、最適化、コード生成など以降のすべてのフェーズは AST を入力として受け取る。また、IDEの自動補完・リファクタリング・静的解析ツールも AST を活用して動作する。

AST の走査にはビジターパターンが広く使われる。各ノード型に対して `visit_xxx` メソッドを定義し、ノード型に応じた処理を行う。これにより AST の構造とノードへの操作を分離できる。

## AST ノードの種類と対応するコード

| ノード種別 | コード例 | AST 表現 |
|-----------|---------|---------|
| 数値リテラル | `42` | `Num(42)` |
| 変数参照 | `x` | `Var("x")` |
| 二項演算 | `x + 1` | `BinOp("+", Var("x"), Num(1))` |
| 代入文 | `x = 3` | `Assign("x", Num(3))` |
| if 文 | `if c: ...` | `If(cond, then_body, else_body)` |
| 関数定義 | `def f(x): ...` | `FuncDef("f", ["x"], body)` |
| 関数呼び出し | `f(1, 2)` | `Call(Var("f"), [Num(1), Num(2)])` |

```python
# AST の定義・構築・ビジターパターンによる評価
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Union, Any
import re

# --- AST ノード定義 ---
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
class Assign:
    name: str
    value: 'Node'

@dataclass
class Block:
    stmts: list['Node']

@dataclass
class If:
    cond: 'Node'
    then_body: 'Node'
    else_body: 'Node | None' = None

@dataclass
class FuncDef:
    name: str
    params: list[str]
    body: 'Node'

@dataclass
class Call:
    func: 'Node'
    args: list['Node']

Node = Union[Num, Var, BinOp, Assign, Block, If, FuncDef, Call]

# --- ビジターパターン ---
class ASTVisitor:
    def visit(self, node: Node) -> Any:
        method = f'visit_{type(node).__name__}'
        return getattr(self, method)(node)

    def visit_Num(self, node: Num) -> Any:
        raise NotImplementedError

    def visit_Var(self, node: Var) -> Any:
        raise NotImplementedError

    def visit_BinOp(self, node: BinOp) -> Any:
        raise NotImplementedError

# --- AST プリンタ（ツリー構造を可視化） ---
class ASTPrinter(ASTVisitor):
    def __init__(self):
        self.indent = 0

    def _indent(self) -> str:
        return "  " * self.indent

    def visit_Num(self, node: Num):
        print(f"{self._indent()}Num({node.value})")

    def visit_Var(self, node: Var):
        print(f"{self._indent()}Var({node.name!r})")

    def visit_BinOp(self, node: BinOp):
        print(f"{self._indent()}BinOp({node.op!r})")
        self.indent += 1
        self.visit(node.left)
        self.visit(node.right)
        self.indent -= 1

    def visit_Assign(self, node: Assign):
        print(f"{self._indent()}Assign({node.name!r})")
        self.indent += 1
        self.visit(node.value)
        self.indent -= 1

    def visit_Block(self, node: Block):
        print(f"{self._indent()}Block")
        self.indent += 1
        for stmt in node.stmts:
            self.visit(stmt)
        self.indent -= 1

# --- 評価器（インタプリタ） ---
class Evaluator(ASTVisitor):
    def __init__(self):
        self.env: dict[str, int] = {}

    def visit_Num(self, node: Num) -> int:
        return node.value

    def visit_Var(self, node: Var) -> int:
        return self.env[node.name]

    def visit_BinOp(self, node: BinOp) -> int:
        l, r = self.visit(node.left), self.visit(node.right)
        ops = {'+': l + r, '-': l - r, '*': l * r, '/': l // r}
        return ops[node.op]

    def visit_Assign(self, node: Assign) -> None:
        self.env[node.name] = self.visit(node.value)

    def visit_Block(self, node: Block) -> None:
        for stmt in node.stmts:
            self.visit(stmt)

# 動作確認
# x = 3 + 5 * 2
# y = x - 4
ast = Block([
    Assign("x", BinOp("+", Num(3), BinOp("*", Num(5), Num(2)))),
    Assign("y", BinOp("-", Var("x"), Num(4))),
])

print("=== AST 構造 ===")
ASTPrinter().visit(ast)

print("\n=== 評価結果 ===")
ev = Evaluator()
ev.visit(ast)
print(f"x = {ev.env['x']}")  # x = 13
print(f"y = {ev.env['y']}")  # y = 9
```

## 使用場面

- コンパイラ・インタプリタのフロントエンドからバックエンドへの橋渡しデータ構造として
- ESLint・Pylint・Rustfmt などの静的解析ツール・フォーマッタの内部表現として
- Babel・SWC などのトランスパイラでコード変換・マクロ展開の基盤として
- IDE の自動補完・リファクタリング・型推論エンジンの中間表現として

## 参考文献

- Nystrom, R. (2021). *Crafting Interpreters*. Genever Benning.（[無料公開](https://craftinginterpreters.com/)）
- [Python ast モジュール — 公式ドキュメント](https://docs.python.org/ja/3/library/ast.html)
- [TypeScript Compiler API — AST の操作](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API)

<AffiliateBanner site="language_navi" />
