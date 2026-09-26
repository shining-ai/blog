import AffiliateBanner from '@site/src/components/AffiliateBanner';

# コード生成とターゲットコード

## コード生成とは

> コード生成（Code Generation）とは、最適化済みの IR（中間表現）をターゲットアーキテクチャ向けのアセンブリコードまたは機械語に変換するコンパイラの最終フェーズであり、命令選択・命令スケジューリング・レジスタ割り付けの結果を組み合わせてターゲットコードを出力する。

コード生成の主要なサブ処理は3つある。**命令選択（Instruction Selection）** は IR の操作をターゲット CPU の命令セットに対応させる処理で、BURS（Bottom-Up Rewriting System）やツリーパターンマッチングが使われる。**命令スケジューリング（Instruction Scheduling）** はCPUのパイプラインや実行ユニットを効率的に使うために命令の実行順序を並び替える。**プロローグ・エピローグ生成** は関数の入口でレジスタ保存・スタックフレーム確保を、出口で復元を行うコードを生成する。

アセンブリコード（テキスト形式）の出力後は、アセンブラが機械語オブジェクトファイルに変換し、リンカが複数のオブジェクトファイルと標準ライブラリを結合して実行ファイルを生成する。一方、JVM のバイトコードや Python の .pyc ファイルのように仮想マシン向けのバイトコードを出力するコンパイラもある。

## コード生成の出力形式

| 出力形式 | 説明 | 使用例 |
|---------|------|--------|
| x86-64 アセンブリ | Intel/AMD 向け機械語テキスト | GCC・Clang |
| ARM/AArch64 アセンブリ | スマートフォン・Apple Silicon 向け | LLVM, rustc |
| JVM バイトコード | Java 仮想マシン向け | javac, kotlinc |
| WebAssembly | ブラウザ・サーバー向け仮想命令 | Emscripten・Rust |
| LLVM IR | 中間ファイルとして | Clang -emit-llvm |
| Python バイトコード | CPython VM 向け | CPython コンパイラ |

```python
# スタックベース仮想マシン向けバイトコードジェネレータ
# AST → Python ライクなバイトコード

from __future__ import annotations
from dataclasses import dataclass
from typing import Union

# --- AST ---
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
class Return:
    value: 'Node'

Node = Union[Num, Var, BinOp, Assign, Return]

# --- バイトコード命令 ---
@dataclass
class Instr:
    op: str
    arg: object = None

    def __str__(self):
        return f"  {self.op:<12} {self.arg if self.arg is not None else ''}"


class BytecodeGenerator:
    """AST からスタックベースバイトコードを生成する"""

    def __init__(self):
        self.code: list[Instr] = []
        self.locals: dict[str, int] = {}
        self.local_count = 0

    def _local_index(self, name: str) -> int:
        if name not in self.locals:
            self.locals[name] = self.local_count
            self.local_count += 1
        return self.locals[name]

    def emit(self, op: str, arg=None) -> None:
        self.code.append(Instr(op, arg))

    def gen(self, node: Node) -> None:
        method = f'gen_{type(node).__name__}'
        getattr(self, method)(node)

    def gen_Num(self, node: Num) -> None:
        self.emit('LOAD_CONST', node.value)

    def gen_Var(self, node: Var) -> None:
        idx = self._local_index(node.name)
        self.emit('LOAD_FAST', f"{node.name}({idx})")

    def gen_BinOp(self, node: BinOp) -> None:
        self.gen(node.left)
        self.gen(node.right)
        op_map = {'+': 'BINARY_ADD', '-': 'BINARY_SUB',
                  '*': 'BINARY_MUL', '/': 'BINARY_DIV'}
        self.emit(op_map[node.op])

    def gen_Assign(self, node: Assign) -> None:
        self.gen(node.value)
        idx = self._local_index(node.name)
        self.emit('STORE_FAST', f"{node.name}({idx})")

    def gen_Return(self, node: Return) -> None:
        self.gen(node.value)
        self.emit('RETURN_VALUE')

    def print_bytecode(self) -> None:
        print("=== バイトコード ===")
        print(f"{'番号':>4}  {'命令':<15} {'引数'}")
        print("-" * 35)
        for i, instr in enumerate(self.code):
            print(f"{i:>4}  {instr.op:<15} {instr.arg if instr.arg is not None else ''}")


# 動作確認: result = (a + b) * 2; return result
program = [
    Assign('a', Num(3)),
    Assign('b', Num(4)),
    Assign('result', BinOp('*', BinOp('+', Var('a'), Var('b')), Num(2))),
    Return(Var('result')),
]

gen = BytecodeGenerator()
for stmt in program:
    gen.gen(stmt)
gen.print_bytecode()

# 番号  命令            引数
# -----------------------------------
#    0  LOAD_CONST      3
#    1  STORE_FAST      a(0)
#    2  LOAD_CONST      4
#    3  STORE_FAST      b(1)
#    4  LOAD_FAST       a(0)
#    5  LOAD_FAST       b(1)
#    6  BINARY_ADD
#    7  LOAD_CONST      2
#    8  BINARY_MUL
#    9  STORE_FAST      result(2)
#   10  LOAD_FAST       result(2)
#   11  RETURN_VALUE
```

```
x86-64 アセンブリの例（a + b * 2 を計算して返す関数）:

section .text
global _calc

_calc:
    push    rbp
    mov     rbp, rsp          ; スタックフレーム確立
    ; 引数: rdi = a, rsi = b (System V AMD64 ABI)
    mov     rax, rsi
    imul    rax, 2            ; b * 2
    add     rax, rdi          ; a + (b * 2)
    pop     rbp
    ret                       ; rax に結果を入れて戻る
```

## 使用場面

- GCC・Clang による C/C++ コードの x86-64・ARM 機械語生成
- Emscripten・wasm-pack による WebAssembly バイトコード出力
- javac・kotlinc による JVM バイトコード（.class ファイル）生成
- Python インタプリタの内部での .py → .pyc バイトコードコンパイル

## 参考文献

- Aho, A. V. et al. (2006). *Compilers: Principles, Techniques, and Tools* (2nd ed.). Addison-Wesley.
- [x86-64 System V ABI](https://gitlab.com/x86-psABIs/x86-64-ABI)
- [WebAssembly 仕様](https://webassembly.github.io/spec/)

<AffiliateBanner site="language_navi" />
