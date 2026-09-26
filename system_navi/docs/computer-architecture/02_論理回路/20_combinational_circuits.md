---
sidebar_position: 2
displayed_sidebar: computerArchitectureSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 組み合わせ回路 (Combinational Circuits)

## 組み合わせ回路とは

組み合わせ回路とは、

> 出力が現在の入力のみによって決まり、過去の状態（記憶）を持たない論理回路

です。
<br/>

フィードバックループを持たず、入力が確定すると一定の遅延（伝搬遅延）後に出力が確定します。
加算器・マルチプレクサ・デコーダなどが代表例で、順序回路（フリップフロップなど）と組み合わせてCPUを構成します。

## 半加算器 (Half Adder)

1ビット同士の加算を行います。桁上がり入力（Cin）はありません。

| A | B | Sum (A⊕B) | Carry (A·B) |
| --- | --- | --- | --- |
| 0 | 0 | 0 | 0 |
| 0 | 1 | 1 | 0 |
| 1 | 0 | 1 | 0 |
| 1 | 1 | 0 | 1 |

## 全加算器 (Full Adder)

半加算器を2段接続し、桁上がり入力（Cin）を加えた3入力加算器です。

| A | B | Cin | Sum | Cout |
| --- | --- | --- | --- | --- |
| 0 | 0 | 0 | 0 | 0 |
| 0 | 0 | 1 | 1 | 0 |
| 0 | 1 | 0 | 1 | 0 |
| 0 | 1 | 1 | 0 | 1 |
| 1 | 0 | 0 | 1 | 0 |
| 1 | 0 | 1 | 0 | 1 |
| 1 | 1 | 0 | 0 | 1 |
| 1 | 1 | 1 | 1 | 1 |

`Sum = A ⊕ B ⊕ Cin`、`Cout = (A·B) | (B·Cin) | (A·Cin)`

## マルチプレクサ (MUX)

2to1 MUX は選択信号 S によって2つの入力 A, B のどちらかを出力します。

| S | A | B | Y |
| --- | --- | --- | --- |
| 0 | 0 | 0 | 0 |
| 0 | 0 | 1 | 0 |
| 0 | 1 | 0 | 1 |
| 0 | 1 | 1 | 1 |
| 1 | 0 | 0 | 0 |
| 1 | 0 | 1 | 1 |
| 1 | 1 | 0 | 0 |
| 1 | 1 | 1 | 1 |

`Y = (¬S · A) | (S · B)`

## デコーダ (Decoder)

2to4 デコーダは 2ビット入力に対して、対応する1本の出力線だけを High にします。

| A1 | A0 | Y0 | Y1 | Y2 | Y3 |
| --- | --- | --- | --- | --- | --- |
| 0 | 0 | 1 | 0 | 0 | 0 |
| 0 | 1 | 0 | 1 | 0 | 0 |
| 1 | 0 | 0 | 0 | 1 | 0 |
| 1 | 1 | 0 | 0 | 0 | 1 |

## 実装

```c title="加算器・MUX のビット演算実装（C）"
#include <stdio.h>
#include <stdint.h>

/* 半加算器: 1ビット加算 */
void half_adder(int a, int b, int *sum, int *carry) {
    *sum   = a ^ b;       /* XOR */
    *carry = a & b;       /* AND */
}

/* 全加算器: 桁上がり入力あり */
void full_adder(int a, int b, int cin, int *sum, int *cout) {
    int s1, c1, c2;
    half_adder(a, b, &s1, &c1);
    half_adder(s1, cin, sum, &c2);
    *cout = c1 | c2;
}

/* 4ビット加算器（全加算器を4段接続）*/
uint8_t adder4(uint8_t a, uint8_t b, int *carry_out) {
    int sum, cout, cin = 0;
    uint8_t result = 0;
    for (int i = 0; i < 4; i++) {
        full_adder((a >> i) & 1, (b >> i) & 1, cin, &sum, &cout);
        result |= (sum << i);
        cin = cout;
    }
    *carry_out = cout;
    return result;
}

/* 2to1 マルチプレクサ */
int mux2to1(int a, int b, int sel) {
    return (~sel & a) | (sel & b);   /* セレクタで選択 */
}

/* 2to4 デコーダ */
void decoder2to4(int a1, int a0, int out[4]) {
    out[0] = (~a1 & ~a0) & 1;
    out[1] = (~a1 &  a0) & 1;
    out[2] = ( a1 & ~a0) & 1;
    out[3] = ( a1 &  a0) & 1;
}

int main(void) {
    int carry;
    printf("=== 4ビット加算器 ===\n");
    printf("5 + 3 = %d\n", adder4(5, 3, &carry));    /* 8 */
    printf("9 + 9 = %d (carry=%d)\n", adder4(9, 9, &carry), carry); /* 2, carry=1 */

    printf("\n=== 2to1 MUX ===\n");
    printf("MUX(A=0, B=1, S=0) = %d\n", mux2to1(0, 1, 0)); /* 0 (A選択) */
    printf("MUX(A=0, B=1, S=1) = %d\n", mux2to1(0, 1, 1)); /* 1 (B選択) */

    printf("\n=== 2to4 デコーダ ===\n");
    int out[4];
    for (int a1 = 0; a1 <= 1; a1++)
        for (int a0 = 0; a0 <= 1; a0++) {
            decoder2to4(a1, a0, out);
            printf("A=%d%d -> Y=%d%d%d%d\n", a1, a0, out[3], out[2], out[1], out[0]);
        }
    return 0;
}
```

```python title="真理値表生成と組み合わせ回路検証（Python）"
from itertools import product

def half_adder(a: int, b: int) -> tuple[int, int]:
    return a ^ b, a & b          # sum, carry

def full_adder(a: int, b: int, cin: int) -> tuple[int, int]:
    s1, c1 = half_adder(a, b)
    s2, c2 = half_adder(s1, cin)
    return s2, c1 | c2           # sum, cout

def mux2to1(a: int, b: int, sel: int) -> int:
    return b if sel else a

def decoder2to4(a1: int, a0: int) -> list[int]:
    idx = (a1 << 1) | a0
    return [1 if i == idx else 0 for i in range(4)]

def print_truth_table(name: str, func, inputs: list[str]):
    header = " | ".join(inputs) + " | " + "出力"
    print(f"\n=== {name} ===")
    print(header)
    print("-" * len(header))
    n = len(inputs)
    for vals in product([0, 1], repeat=n):
        result = func(*vals)
        out_str = str(result) if not isinstance(result, (list, tuple)) else str(result)
        print(" | ".join(str(v) for v in vals) + " | " + out_str)

print_truth_table("半加算器 (Sum, Carry)", half_adder, ["A", "B"])
print_truth_table("全加算器 (Sum, Cout)", full_adder, ["A", "B", "Cin"])
print_truth_table("2to1 MUX", mux2to1, ["A", "B", "S"])
print_truth_table("2to4 デコーダ", decoder2to4, ["A1", "A0"])

# 4ビット加算器の検証
print("\n=== 4ビット加算器の全組み合わせを検証 ===")
errors = 0
for a in range(16):
    for b in range(16):
        cin = 0
        result = 0
        c = 0
        for i in range(4):
            s, c = full_adder((a >> i) & 1, (b >> i) & 1, c if i > 0 else cin)
            result |= s << i
        expected = (a + b) % 16
        if result != expected:
            print(f"ERROR: {a} + {b} = {result} (expected {expected})")
            errors += 1
print(f"検証完了: {errors} エラー")  # 0 エラー
```

## 使用場面

- **ALU（演算論理ユニット）**: 全加算器を並列接続した多ビット加算器・比較器・シフタ
- **メモリアドレスデコード**: デコーダによるアドレス空間のチップセレクト制御
- **データセレクタ**: CPUのレジスタファイルやバスのマルチプレクサ
- **パリティ生成**: XORゲートチェーンによる誤り検出ビット生成

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
