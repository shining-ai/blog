import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 意味解析と型検査

## 意味解析とは

> 意味解析（Semantic Analysis）とは、構文的に正しい AST に対して「意味的な正しさ」を検証する処理であり、型検査・スコープ解析・名前解決・定数評価などを通じて、コード生成フェーズに渡す前に意味エラーを検出する。

構文解析が「文法規則への適合」を確認するのに対し、意味解析は「その式が意味をなすか」を検証する。たとえば `int x = "hello"` は構文的には正しいが、型が一致しないため意味エラーとなる。また、宣言前の変数参照や、存在しない関数の呼び出しも意味解析で検出される。

意味解析の主要な処理は「型検査」と「スコープ/名前解決」の2つである。型検査では各式の型を推論・検証し、演算子の適用可能性・関数引数の型一致・代入の型互換性などを確認する。Hindley-Milner 型推論アルゴリズムは、型アノテーションなしで型を自動推論する手法として ML・Haskell・Rust で採用されている。

意味解析後の AST には型情報が付与される（型注釈 AST または装飾 AST と呼ぶ）。この情報はコード生成フェーズで適切なバイトコード・機械語命令を選択するために使われる。

## 意味エラーの種類

| エラー種別 | 例 | 説明 |
|-----------|-----|------|
| 型不一致 | `x: int = "hello"` | 代入先と値の型が合わない |
| 未定義変数 | `print(y)` （y未宣言） | スコープ内に名前が存在しない |
| 引数数不一致 | `f(1, 2)` （f は引数1つ） | 関数定義と呼び出しの引数数が違う |
| 演算子型エラー | `"a" + 1` （静的型付き言語） | 演算子が対応しない型に適用された |
| 多重定義 | `int x; int x;` | 同スコープ内で同名変数を再定義 |
| 到達不能コード | `return; x = 1;` | return の後の文は実行されない |

```python
# 単純な型検査器の実装
# 対応する型: int, bool, str
# 対応する式: リテラル・変数・二項演算・代入・if 文

from __future__ import annotations
from dataclasses import dataclass
from typing import Union, Optional

# --- 型 ---
Type = str  # 'int' | 'bool' | 'str' | None

# --- AST（再掲・簡略版） ---
@dataclass
class Num:
    value: int

@dataclass
class StrLit:
    value: str

@dataclass
class BoolLit:
    value: bool

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
    type_hint: Optional[str]
    value: 'Node'

@dataclass
class IfStmt:
    cond: 'Node'
    then_body: list['Node']

Node = Union[Num, StrLit, BoolLit, Var, BinOp, Assign, IfStmt]

# --- 型検査器 ---
class TypeChecker:
    def __init__(self):
        # シンボルテーブル: 変数名 -> 型
        self.env: dict[str, Type] = {}
        self.errors: list[str] = []

    def check(self, node: Node) -> Optional[Type]:
        method = f'check_{type(node).__name__}'
        return getattr(self, method)(node)

    def check_Num(self, node: Num) -> Type:
        return 'int'

    def check_StrLit(self, node: StrLit) -> Type:
        return 'str'

    def check_BoolLit(self, node: BoolLit) -> Type:
        return 'bool'

    def check_Var(self, node: Var) -> Optional[Type]:
        if node.name not in self.env:
            self.errors.append(f"未定義変数: '{node.name}'")
            return None
        return self.env[node.name]

    def check_BinOp(self, node: BinOp) -> Optional[Type]:
        lt = self.check(node.left)
        rt = self.check(node.right)
        if lt != rt:
            self.errors.append(
                f"型不一致: '{node.op}' の左辺 {lt}, 右辺 {rt}"
            )
            return None
        # 算術演算は int のみ
        if node.op in ('+', '-', '*', '/'):
            if lt != 'int':
                self.errors.append(
                    f"型エラー: 算術演算子 '{node.op}' は int に使用できません（{lt}）"
                )
                return None
            return 'int'
        # 比較演算は bool を返す
        if node.op in ('<', '>', '==', '!='):
            return 'bool'
        return lt

    def check_Assign(self, node: Assign) -> None:
        val_type = self.check(node.value)
        if node.type_hint and val_type and node.type_hint != val_type:
            self.errors.append(
                f"型不一致: '{node.name}' は {node.type_hint} 型ですが "
                f"{val_type} 型の値が代入されました"
            )
        declared = node.type_hint or val_type
        if declared:
            self.env[node.name] = declared

    def check_IfStmt(self, node: IfStmt) -> None:
        cond_type = self.check(node.cond)
        if cond_type != 'bool':
            self.errors.append(
                f"型エラー: if 条件式は bool 型が必要ですが {cond_type} 型です"
            )
        for stmt in node.then_body:
            self.check(stmt)


# 動作確認
tc = TypeChecker()
program = [
    Assign('x', 'int', Num(10)),                     # OK: x: int = 10
    Assign('msg', 'str', StrLit("hello")),            # OK: msg: str = "hello"
    Assign('y', 'int', StrLit("bad")),               # ERROR: int = str
    BinOp('+', Var('x'), StrLit("world")),           # ERROR: int + str
    IfStmt(Var('x'), [Assign('z', None, Num(1))]),   # ERROR: 条件式が int
]

for node in program:
    tc.check(node)

print("型エラー一覧:")
for err in tc.errors:
    print(f"  - {err}")
# 型エラー一覧:
#   - 型不一致: 'y' は int 型ですが str 型の値が代入されました
#   - 型不一致: '+' の左辺 int, 右辺 str
#   - 型エラー: if 条件式は bool 型が必要ですが int 型です
```

## 使用場面

- 静的型付き言語（Java・C#・Rust・TypeScript）のコンパイラにおける型エラー検出
- Python の mypy・pyright などの型チェッカーによる静的解析
- IDE のリアルタイムエラーハイライト・型推論に基づくコード補完
- 言語の型安全性保証とランタイムエラーの事前排除

## 参考文献

- Pierce, B. C. (2002). *Types and Programming Languages*. MIT Press.
- Aho, A. V. et al. (2006). *Compilers: Principles, Techniques, and Tools* (2nd ed.). Addison-Wesley.
- [mypy 公式ドキュメント](https://mypy.readthedocs.io/)

<AffiliateBanner site="language_navi" />
