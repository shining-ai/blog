---
sidebar_position: 2
displayed_sidebar: computerArchitectureSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 浮動小数点数 (IEEE 754)

## 浮動小数点数とは

浮動小数点数とは、

> IEEE 754 規格で定義された、符号・指数部・仮数部の3フィールドで実数を近似表現する形式

です。
<br/>

固定小数点数と異なり、指数部を変化させることで非常に大きな値から非常に小さな値まで広い範囲を表現できます。
ただし有効桁数は有限であるため、演算結果に丸め誤差が生じる点に注意が必要です。

## IEEE 754 の構造

| フィールド | 単精度 (32bit) | 倍精度 (64bit) |
| --- | --- | --- |
| 符号ビット (s) | 1 bit | 1 bit |
| 指数部 (E) | 8 bit | 11 bit |
| 仮数部 (M) | 23 bit | 52 bit |
| バイアス | 127 | 1023 |

値の計算式: `(-1)^s × 1.M × 2^(E - bias)`

指数部が全ビット 0 の場合は非正規化数として `(-1)^s × 0.M × 2^(1 - bias)` で計算されます。

## 特殊値

| 指数部 | 仮数部 | 表す値 |
| --- | --- | --- |
| 全ビット 1 | 0 | ±∞（符号ビットで正負が決まる） |
| 全ビット 1 | 非 0 | NaN（Not a Number） |
| 全ビット 0 | 非 0 | 非正規化数（denormal）|
| 全ビット 0 | 0 | ±0 |

NaN は `0/0`・`√(-1)` などの未定義演算から生じ、どの比較演算でも false を返します。

## 実装

```c title="IEEE 754 ビットパターン表示（C）"
#include <stdio.h>
#include <stdint.h>
#include <math.h>

/* float のビットパターンを安全に取得 */
static uint32_t float_bits(float f) {
    uint32_t bits;
    __builtin_memcpy(&bits, &f, sizeof(bits));
    return bits;
}

static void print_ieee754(const char *label, float f) {
    uint32_t bits = float_bits(f);
    uint32_t sign     = (bits >> 31) & 0x1;
    uint32_t exponent = (bits >> 23) & 0xFF;
    uint32_t mantissa =  bits        & 0x7FFFFF;
    printf("%-10s  bits=%08X  s=%u  E=%3u  M=%06X", label, bits, sign, exponent, mantissa);
    if (isnan(f))        printf("  -> NaN\n");
    else if (isinf(f))   printf("  -> %cInf\n", f > 0 ? '+' : '-');
    else                 printf("  -> %.6g\n", f);
}

int main(void) {
    print_ieee754("1.0f",    1.0f);
    print_ieee754("0.1f",    0.1f);   /* 丸め誤差が生じる値 */
    print_ieee754("-1.5f",  -1.5f);
    print_ieee754("+Inf",    1.0f / 0.0f);
    print_ieee754("NaN",     0.0f / 0.0f);
    print_ieee754("denorm",  1.4e-45f); /* 最小正の非正規化数 */
    return 0;
}
```

```python title="IEEE 754 ビット列確認（Python）"
import struct
import math

def float_to_fields(f: float) -> dict:
    """IEEE 754 単精度の各フィールドを返す"""
    (bits,) = struct.unpack('>I', struct.pack('>f', f))
    sign     = (bits >> 31) & 0x1
    exponent = (bits >> 23) & 0xFF
    mantissa =  bits        & 0x7FFFFF
    return {"sign": sign, "exponent": exponent, "mantissa": mantissa, "bits": f"{bits:032b}"}

def bits_to_float(bit_str: str) -> float:
    """32ビット文字列を IEEE 754 単精度 float に変換"""
    value = int(bit_str, 2)
    (f,) = struct.unpack('>f', struct.pack('>I', value))
    return f

# 動作確認
for val in [1.0, 0.1, -1.5, float('inf'), float('nan')]:
    fields = float_to_fields(val)
    label = "NaN" if math.isnan(val) else str(val)
    print(f"{label:>10}: s={fields['sign']} E={fields['exponent']:3d} M={fields['mantissa']:06X}")
    print(f"            bits={fields['bits']}")

# 丸め誤差の確認
print(f"\n0.1 + 0.2 = {0.1 + 0.2}")          # 0.30000000000000004
print(f"等しいか?  {0.1 + 0.2 == 0.3}")      # False

# 倍精度
(bits64,) = struct.unpack('>Q', struct.pack('>d', 1.0))
print(f"\n1.0 (double): {bits64:064b}")
```

## 使用場面

- **科学技術計算**: 天文・物理シミュレーションでの `double`（float64）による高精度演算
- **機械学習**: `float32` による学習、`float16` / `bfloat16` による推論の高速化・省メモリ化
- **グラフィックス**: GPU シェーダーでの半精度（float16）演算によるレンダリング高速化
- **金融計算**: 浮動小数点の丸め誤差を避けるため `decimal` モジュールや固定小数点を使用
- **コンパイラ最適化**: `-ffast-math` フラグによる NaN/Inf チェックの省略とスループット向上

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
