---
sidebar_position: 0
displayed_sidebar: computerArchitectureSidebar
---

# ブール代数と論理ゲート

## 概要

ブール代数とは、

> 変数が 0（偽）または 1（真）の2値のみをとる代数系であり、論理演算の数学的基礎

です。

AND・OR・NOT の3つの基本演算でデジタル回路のすべての論理を表現できます。

## 基本演算と真理値表

### AND（論理積）

| A | B | A AND B |
|---|---|---|
| 0 | 0 | 0 |
| 0 | 1 | 0 |
| 1 | 0 | 0 |
| 1 | 1 | 1 |

### OR（論理和）

| A | B | A OR B |
|---|---|---|
| 0 | 0 | 0 |
| 0 | 1 | 1 |
| 1 | 0 | 1 |
| 1 | 1 | 1 |

### XOR（排他的論理和）

| A | B | A XOR B |
|---|---|---|
| 0 | 0 | 0 |
| 0 | 1 | 1 |
| 1 | 0 | 1 |
| 1 | 1 | 0 |

## 重要な定理

```
ド・モルガンの法則:
  NOT(A AND B) = (NOT A) OR  (NOT B)
  NOT(A OR  B) = (NOT A) AND (NOT B)

吸収則:
  A AND (A OR B) = A
  A OR  (A AND B) = A

分配則:
  A AND (B OR C) = (A AND B) OR (A AND C)
```

## 論理ゲートの記号

| ゲート | 記号 | 動作 |
|---|---|---|
| AND | ・（ドット） | 全入力が 1 のとき出力 1 |
| OR | ＋ | どれか 1 つが 1 のとき出力 1 |
| NOT | バー（上線） | 入力を反転 |
| NAND | AND＋反転 | AND の否定（普遍ゲート） |
| NOR | OR＋反転 | OR の否定（普遍ゲート） |
| XOR | ⊕ | 入力が異なるとき出力 1 |

## 実装

```c title="ビット演算による論理ゲート"
#include <stdio.h>
#include <stdint.h>

int main(void) {
    uint8_t a = 0b10110101;
    uint8_t b = 0b11001100;

    printf("AND:  %02X\n", a & b);   // 10000100
    printf("OR:   %02X\n", a | b);   // 11111101
    printf("XOR:  %02X\n", a ^ b);   // 01111001
    printf("NOT:  %02X\n", (uint8_t)~a);  // 01001010
    printf("NAND: %02X\n", (uint8_t)~(a & b));
    return 0;
}
```

## 使用場面

- **マスク処理**: フラグのセット・クリア・トグルにビット演算を使用
- **パリティチェック**: XOR でビット数の偶奇を検証
- **暗号**: XOR 暗号・ストリーム暗号の基本演算
- **ハードウェア設計**: 加算器・MUX・デコーダの実装
