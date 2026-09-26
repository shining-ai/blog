---
sidebar_position: 1
displayed_sidebar: computerArchitectureSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 2の補数と浮動小数点 (Two's Complement & IEEE 754)

## 2の補数とは

2の補数とは、

> 負の整数を2ⁿ − |x| で表現することで、加算回路だけで符号付き演算を実現する方式

です。
<br/>

符号ビット（最上位ビット）が 1 なら負、0 なら非負となります。
8ビット符号付き整数の範囲は −128 〜 +127 です。

## 2の補数の計算方法


```
-5 の 8ビット 2の補数表現:
1. +5 = 00000101
2. 各ビット反転 → 11111010
3. 1を加算       → 11111011  ← これが -5
```

## IEEE 754 浮動小数点

| フィールド | 単精度(32bit) | 倍精度(64bit) |
| --- | --- | --- |
| 符号ビット | 1 | 1 |
| 指数部 | 8 | 11 |
| 仮数部 | 23 | 52 |
| バイアス | 127 | 1023 |

値の計算式: `(-1)^s × 1.仮数部 × 2^(指数部 - バイアス)`

## 実装

```python title="2の補数とIEEE 754（Python）"
import struct

def twos_complement(n: int, bits: int) -> int:
    """符号付き整数のn をbitsビット2の補数表現の整数値に変換"""
    if n < 0:
        return n + (1 << bits)
    return n

def from_twos_complement(val: int, bits: int) -> int:
    """bitsビット2の補数表現valを符号付き整数に変換"""
    if val >= (1 << (bits - 1)):
        return val - (1 << bits)
    return val

def float_to_bits(f: float) -> str:
    """IEEE 754 単精度の内部ビット表現を返す"""
    packed = struct.pack('>f', f)
    bits = int.from_bytes(packed, 'big')
    return format(bits, '032b')

# 使用例
print(twos_complement(-5, 8))          # 251 (= 11111011₂)
print(from_twos_complement(251, 8))    # -5
print(float_to_bits(1.0))
# 00111111100000000000000000000000
# S=0, E=01111111(127), M=0 → 1.0 × 2^0 = 1.0
```

```c title="2の補数確認（C）"
#include <stdio.h>
#include <stdint.h>

int main(void) {
    int8_t a = -5;
    uint8_t b = (uint8_t)a;  /* 2の補数ビット列を取得 */
    printf("signed:   %d\n", a);     /* -5 */
    printf("unsigned: %u\n", b);     /* 251 */
    printf("binary:   ");
    for (int i = 7; i >= 0; i--)
        printf("%d", (b >> i) & 1);
    printf("\n");  /* 11111011 */

    /* IEEE 754 確認 */
    float f = 1.5f;
    uint32_t bits;
    __builtin_memcpy(&bits, &f, sizeof(bits));
    printf("1.5f bits: %08X\n", bits);  /* 3FC00000 */
    return 0;
}
```

## 使用場面

- **CPU 演算器**: 符号付き整数演算はすべて2の補数で実装
- **オーバーフロー検出**: キャリービットと溢れビットの確認
- **GPU シェーダー**: fp16/bf16 による高速浮動小数点演算
- **機械学習**: 量子化（INT8 推論）でのビット幅削減

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
