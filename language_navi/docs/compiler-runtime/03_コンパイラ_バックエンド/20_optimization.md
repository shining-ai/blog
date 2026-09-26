import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 最適化（定数畳み込み・デッドコード除去・インライン展開）

## コンパイラ最適化とは

> コンパイラ最適化とは、プログラムの意味（実行結果）を変えずに、実行速度・メモリ使用量・コードサイズなどを改善するためにコンパイラが IR（中間表現）に対して行う変換処理であり、ローカル最適化・グローバル最適化・ループ最適化などに分類される。

最適化はコンパイラが生成するコードの品質を大きく左右する。GCC の `-O2`・LLVM の `-O2` フラグで有効になる最適化は数十種類以上に上る。最適化の目標は「速く・小さく・省電力に」であり、これらがトレードオフになる場合もある（インライン展開はコードを大きくすることで速度を上げる）。

主な最適化技法を3つ説明する。**定数畳み込み（Constant Folding）** は `2 + 3` のようなコンパイル時に計算できる式を定数で置き換える。**デッドコード除去（Dead Code Elimination）** は生存変数解析の結果を使い、定義されても使用されない変数への代入・到達不能コードを削除する。**インライン展開（Inlining）** は関数呼び出しを呼び出し先のコードで置き換えることで、関数呼び出しのオーバーヘッドを削減し、他の最適化の適用機会を増やす。

## 主要な最適化技法の分類

| 最適化技法 | 分類 | 効果 | トレードオフ |
|-----------|------|------|-------------|
| 定数畳み込み | ローカル | 不要な演算を削除 | なし |
| 定数伝播 | グローバル | 変数を定数で置換 | なし |
| デッドコード除去 | グローバル | 不要な命令を削除 | なし |
| 共通部分式除去 | ローカル/グローバル | 冗長な計算を削除 | わずかなメモリ増 |
| インライン展開 | 手続き間 | 呼び出しコスト削除 | コードサイズ増大 |
| ループ不変式移動 | ループ | ループ内計算を削減 | なし |
| ループアンローリング | ループ | 分岐オーバーヘッド削減 | コードサイズ増大 |
| 末尾呼び出し最適化 | 手続き | スタック使用量削減 | なし |

```python
# 主要な最適化の Python 実装デモ

from __future__ import annotations
from dataclasses import dataclass
from typing import Union, Optional

# --- AST ノード ---
@dataclass
class Num:
    value: int | float

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

Node = Union[Num, Var, BinOp, Assign]


# --- 最適化 1: 定数畳み込み ---
def constant_folding(node: Node) -> Node:
    """コンパイル時に計算できる式を定数に置き換える"""
    if isinstance(node, BinOp):
        left  = constant_folding(node.left)
        right = constant_folding(node.right)
        # 両辺が定数ならコンパイル時に計算
        if isinstance(left, Num) and isinstance(right, Num):
            ops = {
                '+': left.value + right.value,
                '-': left.value - right.value,
                '*': left.value * right.value,
                '/': left.value // right.value if right.value != 0 else None,
            }
            result = ops.get(node.op)
            if result is not None:
                return Num(result)
        return BinOp(node.op, left, right)
    elif isinstance(node, Assign):
        return Assign(node.name, constant_folding(node.value))
    return node


# --- 最適化 2: 定数伝播 ---
def constant_propagation(
    stmts: list[Node],
    const_env: dict[str, int] | None = None
) -> list[Node]:
    """既知の定数値を変数参照で置き換える"""
    if const_env is None:
        const_env = {}
    result = []
    for stmt in stmts:
        stmt = _propagate(stmt, const_env)
        result.append(stmt)
        # 定数が代入された変数を記録
        if isinstance(stmt, Assign) and isinstance(stmt.value, Num):
            const_env[stmt.name] = stmt.value.value
        elif isinstance(stmt, Assign):
            # 非定数が代入されたら定数情報を削除
            const_env.pop(stmt.name, None)
    return result

def _propagate(node: Node, env: dict[str, int]) -> Node:
    if isinstance(node, Var) and node.name in env:
        return Num(env[node.name])
    elif isinstance(node, BinOp):
        return BinOp(node.op, _propagate(node.left, env), _propagate(node.right, env))
    elif isinstance(node, Assign):
        return Assign(node.name, _propagate(node.value, env))
    return node


# --- 最適化 3: デッドコード除去 ---
def dead_code_elimination(stmts: list[Node]) -> list[Node]:
    """使用されない変数への代入を削除する"""
    # まず使用されている変数を後ろから収集
    live_vars: set[str] = set()
    result = []

    for stmt in reversed(stmts):
        if isinstance(stmt, Assign):
            if stmt.name not in live_vars:
                # この代入は使用されない → 削除
                continue
            live_vars.discard(stmt.name)
            _collect_uses(stmt.value, live_vars)
        else:
            _collect_uses(stmt, live_vars)
        result.append(stmt)

    return list(reversed(result))

def _collect_uses(node: Node, uses: set[str]) -> None:
    if isinstance(node, Var):
        uses.add(node.name)
    elif isinstance(node, BinOp):
        _collect_uses(node.left, uses)
        _collect_uses(node.right, uses)
    elif isinstance(node, Assign):
        _collect_uses(node.value, uses)


# === 動作確認 ===
stmts = [
    Assign('x', BinOp('+', Num(2), Num(3))),       # x = 2 + 3  → 定数畳み込み
    Assign('y', BinOp('*', Var('x'), Num(4))),      # y = x * 4  → 定数伝播後 5*4=20
    Assign('z', BinOp('+', Num(1), Num(1))),        # z = 1 + 1  → z は使われない
    Assign('result', BinOp('+', Var('y'), Num(0))), # result = y + 0
]

print("=== 元のコード ===")
for s in stmts:
    print(f"  {s}")

# Step 1: 定数畳み込み
folded = [constant_folding(s) for s in stmts]
print("\n=== 定数畳み込み後 ===")
for s in folded:
    print(f"  {s}")

# Step 2: 定数伝播
propagated = constant_propagation(folded)
print("\n=== 定数伝播後 ===")
for s in propagated:
    print(f"  {s}")

# Step 3: 再度定数畳み込み
folded2 = [constant_folding(s) for s in propagated]
print("\n=== 再畳み込み後 ===")
for s in folded2:
    print(f"  {s}")

# Step 4: デッドコード除去
cleaned = dead_code_elimination(folded2)
print("\n=== デッドコード除去後 ===")
for s in cleaned:
    print(f"  {s}")
# result: x = 5, y = 20, result = 20
# z = 2 は使われないので削除される
```

## 使用場面

- GCC・Clang の `-O2` / `-O3` フラグで自動的に適用されるコンパイラ最適化
- JVM の JIT コンパイラ（HotSpot）によるホットパスの実行時最適化
- Python・JavaScript の高速処理のための AOT/JIT コンパイラ（Cython・V8 TurboFan）
- 組み込みシステム向けコンパイラでのコードサイズ・速度の両立

## 参考文献

- Aho, A. V. et al. (2006). *Compilers: Principles, Techniques, and Tools* (2nd ed.). Addison-Wesley.
- Cooper, K. D. & Torczon, L. (2011). *Engineering a Compiler* (2nd ed.). Morgan Kaufmann.
- [LLVM Passes — 最適化パス一覧](https://llvm.org/docs/Passes.html)

<AffiliateBanner site="language_navi" />
