---
sidebar_position: 0
displayed_sidebar: computerArchitectureSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ブール代数と論理ゲート (Boolean Algebra)

## ブール代数とは

ブール代数とは、

> 真（1）と偽（0）の2値を扱い、AND・OR・NOT の3演算で任意の論理を表現できる代数系

です。
<br/>

ジョージ・ブールが1854年に考案し、クロード・シャノンが1937年にデジタル回路設計へ応用しました。

## 基本論理ゲート


| ゲート | 記号 | 真理値 |
| --- | --- | --- |
| AND | A · B | 両方1のとき1 |
| OR | A + B | どちらか1のとき1 |
| NOT | Ā | 反転 |
| NAND | ¬(A · B) | AND の否定 |
| NOR | ¬(A + B) | OR の否定 |
| XOR | A ⊕ B | 異なるとき1 |

## ド・モルガンの定理

```
¬(A · B) = ¬A + ¬B
¬(A + B) = ¬A · ¬B
```

NAND/NOR ゲートだけで任意の論理回路を実現できる（汎用性）。

## 実装

```python title="論理ゲートシミュレーション（Python）"
from itertools import product

def truth_table(func, n_vars: int):
    """n変数の真理値表を生成"""
    header = [f'x{i}' for i in range(n_vars)] + ['out']
    print(' | '.join(header))
    print('-' * (4 * len(header)))
    for vals in product([0, 1], repeat=n_vars):
        out = func(*vals)
        print(' | '.join(str(v) for v in (*vals, int(out))))

# XOR の真理値表
truth_table(lambda a, b: a ^ b, 2)
```

```c title="半加算器（C）"
#include <stdio.h>
#include <stdbool.h>

/* 半加算器: 1ビット加算の基本回路 */
void half_adder(bool a, bool b, bool *sum, bool *carry) {
    *sum   = a ^ b;   /* XOR */
    *carry = a & b;   /* AND */
}

/* 全加算器: 桁上がり入力あり */
void full_adder(bool a, bool b, bool cin, bool *sum, bool *cout) {
    bool s1, c1, c2;
    half_adder(a, b, &s1, &c1);
    half_adder(s1, cin, sum, &c2);
    *cout = c1 | c2;
}

int main(void) {
    bool sum, carry;
    half_adder(1, 1, &sum, &carry);
    printf("1+1: sum=%d carry=%d\n", sum, carry);  /* sum=0 carry=1 */
    return 0;
}
```

## 使用場面

- **ALU 設計**: 加算器・比較器・シフタの論理合成
- **FPGA**: LUT（ルックアップテーブル）への論理マッピング
- **コンパイラ最適化**: 条件式の定数畳み込み
- **暗号回路**: AES の S-Box 実装

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
