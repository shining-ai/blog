---
sidebar_position: 1
displayed_sidebar: computerArchitectureSidebar
---

# 符号付き整数（2の補数表現）

## 概要

2の補数表現とは、

> 符号付き整数を「2ⁿ から正の値を引いた値」として表現し、加算回路を符号・無符号で共用できる方式

です。

1 の補数（ビット反転のみ）と異なり、`+0` と `-0` が存在せず、ゼロが一意に定まります。

## 変換方法

### 正の数 → 負の数（2の補数）

1. ビットを全て反転（1の補数）
2. 1 を加算

```
  0000 0101  (+5)
→ 1111 1010  (反転)
→ 1111 1011  (+1加算) = -5 の 2の補数表現
```

### 表現できる範囲（8ビットの場合）

| 表現 | 10進数 |
|---|---|
| `0111 1111` | +127 |
| `0000 0001` | +1 |
| `0000 0000` | 0 |
| `1111 1111` | −1 |
| `1000 0001` | −127 |
| `1000 0000` | −128（最小値） |

n ビットの範囲: **−2ⁿ⁻¹ ～ 2ⁿ⁻¹−1**

## 加算が統一できる理由

```
  0000 0101  (+5)
+ 1111 1011  (−5 の 2の補数)
= 0000 0000  (繰り上がりを無視 → 0)  ✓
```

符号ビットを特別扱いせず、通常の加算回路をそのまま流用できます。

## 実装

```c title="2の補数の確認"
#include <stdio.h>
#include <stdint.h>

int main(void) {
    int8_t a = 5;
    int8_t b = -5;

    printf("a = %d, bit pattern: %02X\n", a, (uint8_t)a);  // 05
    printf("b = %d, bit pattern: %02X\n", b, (uint8_t)b);  // FB
    printf("a + b = %d\n", a + b);   // 0

    // オーバーフロー検出
    int8_t max = 127;
    printf("max + 1 = %d (overflow!)\n", (int8_t)(max + 1));  // -128
    return 0;
}
```

```python title="2の補数の計算"
def to_twos_complement(n: int, bits: int = 8) -> int:
    """正の数を n ビットの2の補数表現に変換"""
    return n & ((1 << bits) - 1)

def from_twos_complement(bits_val: int, bits: int = 8) -> int:
    """2の補数ビット列を符号付き整数に変換"""
    if bits_val >= (1 << (bits - 1)):
        return bits_val - (1 << bits)
    return bits_val

print(to_twos_complement(-5, 8))    # 251 (0xFB)
print(from_twos_complement(0xFB))   # -5
```

## 注意点

:::caution オーバーフロー
符号付き整数の最大値に 1 を加算するとオーバーフローし、負の最小値になります（C言語では未定義動作）。
:::
