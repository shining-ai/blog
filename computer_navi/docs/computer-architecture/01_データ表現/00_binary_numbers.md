---
sidebar_position: 0
displayed_sidebar: computerArchitectureSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 2進数と基数変換 (Binary Numbers)

## 2進数とは

2進数とは、

> 0と1の2つの記号だけを使い、桁が上がるたびに重みが2倍になる位取り記数法

です。
<br/>

コンピュータ内部ではあらゆるデータを2進数で表現します。
n ビットで表現できる値の範囲は 0 〜 2ⁿ−1（符号なし）です。

## 基数変換


### 10進数 → 2進数

10進数を2で繰り返し割り、余りを逆順に並べる。

```
13 ÷ 2 = 6 余り 1
 6 ÷ 2 = 3 余り 0
 3 ÷ 2 = 1 余り 1
 1 ÷ 2 = 0 余り 1
→ 13₁₀ = 1101₂
```

### 2進数 → 16進数

4ビットごとにまとめると16進数1桁に対応する。

| 2進数 | 16進数 |
| --- | --- |
| 0000 | 0 |
| 1010 | A |
| 1111 | F |

## 実装

```python title="基数変換（Python）"
def to_binary(n: int, bits: int = 8) -> str:
    """10進数を指定ビット数の2進数文字列に変換"""
    return format(n, f'0{bits}b')

def to_decimal(b: str) -> int:
    """2進数文字列を10進数に変換"""
    return int(b, 2)

def to_hex(n: int) -> str:
    """10進数を16進数文字列に変換"""
    return format(n, 'X')

# 使用例
print(to_binary(13))        # 00001101
print(to_decimal('1101'))   # 13
print(to_hex(255))          # FF
print(bin(255))             # 0b11111111
print(hex(255))             # 0xff
```

```c title="基数変換（C）"
#include <stdio.h>

void print_binary(unsigned int n, int bits) {
    for (int i = bits - 1; i >= 0; i--) {
        printf("%d", (n >> i) & 1);
    }
    printf("\n");
}

int main(void) {
    unsigned int x = 13;
    printf("decimal: %u\n", x);
    printf("binary:  ");
    print_binary(x, 8);          // 00001101
    printf("hex:     %X\n", x);  // D
    return 0;
}
```

## 使用場面

- **メモリアドレス**: 64ビットアーキテクチャのアドレス空間表現
- **ビットマスク**: フラグ管理・パーミッション
- **ネットワーク**: IP アドレス・サブネットマスク
- **文字コード**: ASCII・UTF-8 のバイト列表現

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
