import AffiliateBanner from '@site/src/components/AffiliateBanner';

# データフロー解析

## データフロー解析とは

> データフロー解析（Dataflow Analysis）とは、プログラムの各点における変数の値・定義・使用に関する情報を、制御フローグラフ（CFG）上を伝播させることで収集する静的解析手法であり、最適化・バグ検出・セキュリティ解析の基盤となる。

コンパイラは実行することなく「変数 x はここで必ずある値を持っている」「この変数はここ以降使われない」といった事実を証明するためにデータフロー解析を使う。解析結果を使うことで、不要な計算の除去（デッドコード除去）や定数の伝播（定数畳み込み）・冗長な計算の共通部分式除去などの最適化が可能になる。

解析は制御フローグラフ（CFG）の各基本ブロックに対して「IN 集合（ブロック入口での情報）」と「OUT 集合（ブロック出口での情報）」を計算する。データフローの方向は前向き（forwards）と後向き（backwards）の2種類がある。代表的な解析として、到達定義解析（reaching definitions）・生存変数解析（live variable analysis）・利用可能式解析（available expressions）などがある。

解析は方程式系の最小不動点（または最大不動点）を繰り返し計算することで求まる。多くの場合、少数の反復でワークリストアルゴリズムが収束する。

## 主要なデータフロー解析の種類

| 解析名 | 方向 | 格子 | 目的 |
|--------|------|------|------|
| 到達定義解析 | 前向き | 定義集合 | どの代入がこの点に届くか |
| 生存変数解析 | 後向き | 変数集合 | どの変数がこの点以降で使われるか |
| 利用可能式解析 | 前向き | 式集合 | 冗長な計算（CSE）の検出 |
| 定数伝播 | 前向き | 変数→値 | 変数が定数かどうかの判定 |
| ポインタ解析 | 前向き | ポインタ先集合 | ポインタが指す可能性のあるオブジェクト |

```python
# 生存変数解析（Live Variable Analysis）の実装
# 後向きデータフロー解析の代表例
# 各ブロック出口での生存変数集合を計算する

from dataclasses import dataclass, field
from typing import Set

@dataclass
class BasicBlock:
    """基本ブロック: 直線的な命令列"""
    name: str
    # 命令のリスト: (result, op, arg1, arg2) or (None, 'use', var, '')
    instrs: list[tuple]
    successors: list[str] = field(default_factory=list)

    @property
    def use(self) -> Set[str]:
        """ブロック内で DEF より先に USE される変数集合"""
        used = set()
        defined = set()
        for result, op, arg1, arg2 in self.instrs:
            if arg1 and arg1 not in defined:
                used.add(arg1)
            if arg2 and arg2 not in defined:
                used.add(arg2)
            if result:
                defined.add(result)
        return used - {''}

    @property
    def defn(self) -> Set[str]:
        """ブロック内で定義される変数集合"""
        return {result for result, *_ in self.instrs if result}


def live_variable_analysis(
    blocks: dict[str, BasicBlock]
) -> dict[str, tuple[Set[str], Set[str]]]:
    """
    生存変数解析を行い、各ブロックの (IN, OUT) 集合を返す。
    方程式:
      OUT[B] = ∪ IN[S]  for S in succs(B)
      IN[B]  = USE[B] ∪ (OUT[B] - DEF[B])
    """
    # 初期化
    live_in  = {name: set() for name in blocks}
    live_out = {name: set() for name in blocks}

    changed = True
    iteration = 0

    while changed:
        changed = False
        iteration += 1

        # 後向き解析: ブロックを逆順で処理
        for name, block in reversed(list(blocks.items())):
            # OUT[B] = ∪ IN[S] for all successors S
            new_out = set()
            for succ_name in block.successors:
                new_out |= live_in[succ_name]

            # IN[B] = USE[B] ∪ (OUT[B] - DEF[B])
            new_in = block.use | (new_out - block.defn)

            if new_in != live_in[name] or new_out != live_out[name]:
                changed = True
            live_in[name]  = new_in
            live_out[name] = new_out

    return {name: (live_in[name], live_out[name]) for name in blocks}


# 動作確認
# プログラム:
#   B1: a = 1; b = 2;  → B2
#   B2: c = a + b; if c > 0 → B3, else B4
#   B3: d = c * 2;  → B5
#   B4: d = c + 1;  → B5
#   B5: return d

blocks = {
    'B1': BasicBlock('B1', [
        ('a', 'copy', '1', ''),
        ('b', 'copy', '2', ''),
    ], successors=['B2']),
    'B2': BasicBlock('B2', [
        ('c', '+', 'a', 'b'),
        (None, 'cmp', 'c', '0'),
    ], successors=['B3', 'B4']),
    'B3': BasicBlock('B3', [
        ('d', '*', 'c', '2'),
    ], successors=['B5']),
    'B4': BasicBlock('B4', [
        ('d', '+', 'c', '1'),
    ], successors=['B5']),
    'B5': BasicBlock('B5', [
        (None, 'return', 'd', ''),
    ], successors=[]),
}

results = live_variable_analysis(blocks)
print(f"{'ブロック':>6} {'IN':^25} {'OUT':^25}")
print("-" * 60)
for name, (lin, lout) in results.items():
    print(f"{name:>6} {str(sorted(lin)):^25} {str(sorted(lout)):^25}")

# B1    []                        ['a', 'b']
# B2    ['a', 'b']                ['c']
# B3    ['c']                     ['d']
# B4    ['c']                     ['d']
# B5    ['d']                     []
```

## 使用場面

- デッドコード除去: 定義されても使用されない変数・計算を削除する最適化
- レジスタ割り付け: 生存変数解析の結果を使い干渉グラフを構築する
- 未初期化変数の検出: 到達定義解析で初期化前に使用される変数を静的に警告
- 定数伝播・定数畳み込み: コンパイル時に計算できる値を事前に計算する最適化

## 参考文献

- Aho, A. V. et al. (2006). *Compilers: Principles, Techniques, and Tools* (2nd ed.). Addison-Wesley.
- Cooper, K. D. & Torczon, L. (2011). *Engineering a Compiler* (2nd ed.). Morgan Kaufmann.
- [LLVM — データフロー解析フレームワーク](https://llvm.org/docs/WritingAnLLVMPass.html)

<AffiliateBanner site="language_navi" />
