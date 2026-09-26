---
sidebar_position: 4
displayed_sidebar: computerArchitectureSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# エンディアン (Endianness)

## エンディアンとは

エンディアンとは、

> 多バイトデータをメモリに格納する際の、バイトの並び順を定める規則

です。
<br/>

ジョナサン・スウィフトの小説「ガリバー旅行記」の卵の割り方論争に由来する名称です。
32ビット値 `0x12345678` をアドレス `0x100` から格納する場合、バイト順によって次のように異なります。

## バイト順の違い

```
値: 0x12345678  (アドレス 0x100 から格納)

ビッグエンディアン (Big Endian):
  アドレス: 0x100  0x101  0x102  0x103
  データ:    0x12   0x34   0x56   0x78   ← 上位バイトが先頭

リトルエンディアン (Little Endian):
  アドレス: 0x100  0x101  0x102  0x103
  データ:    0x78   0x56   0x34   0x12   ← 下位バイトが先頭
```

## エンディアン比較

| 項目 | ビッグエンディアン | リトルエンディアン | ミドルエンディアン |
| --- | --- | --- | --- |
| 別名 | ネットワークバイトオーダー | ホストバイトオーダー（x86） | PDP エンディアン |
| 上位バイト | 低アドレス | 高アドレス | 混在 |
| 代表アーキテクチャ | SPARC・PowerPC・MIPS（big mode） | x86/x64・ARM（デフォルト） | PDP-11（歴史的） |
| バイナリ目視 | 直感的に読みやすい | レジスタとメモリが一致 | ほぼ廃止 |
| ネットワークプロトコル | 標準（TCP/IP） | 変換が必要 | — |

## ネットワークバイトオーダーと変換関数

TCP/IP ではビッグエンディアンがネットワークバイトオーダーとして定められています。
C 標準ライブラリは以下の変換関数を提供します。

| 関数 | 変換方向 | 対象サイズ |
| --- | --- | --- |
| `htons()` | ホスト → ネットワーク | 16bit |
| `htonl()` | ホスト → ネットワーク | 32bit |
| `ntohs()` | ネットワーク → ホスト | 16bit |
| `ntohl()` | ネットワーク → ホスト | 32bit |

## 実装

```c title="エンディアン判定とバイトスワップ（C）"
#include <stdio.h>
#include <stdint.h>
#include <arpa/inet.h>  /* htonl, ntohl */

/* 実行環境のエンディアンを判定 */
static int is_little_endian(void) {
    uint16_t v = 1;
    return *(uint8_t *)&v == 1;
}

/* 32ビット値のバイトスワップ */
static uint32_t bswap32(uint32_t x) {
    return ((x & 0xFF000000u) >> 24)
         | ((x & 0x00FF0000u) >>  8)
         | ((x & 0x0000FF00u) <<  8)
         | ((x & 0x000000FFu) << 24);
}

/* バイト列をメモリダンプ表示 */
static void dump_bytes(const char *label, const uint8_t *p, int n) {
    printf("%-20s:", label);
    for (int i = 0; i < n; i++) printf(" %02X", p[i]);
    printf("\n");
}

int main(void) {
    printf("Environment: %s endian\n\n",
           is_little_endian() ? "little" : "big");

    uint32_t val = 0x12345678;
    dump_bytes("original", (uint8_t *)&val, 4);

    uint32_t swapped = bswap32(val);
    dump_bytes("bswap32", (uint8_t *)&swapped, 4);

    /* ネットワークバイトオーダー変換 */
    uint32_t net = htonl(val);
    dump_bytes("htonl (network)", (uint8_t *)&net, 4);
    printf("ntohl(net) = 0x%08X\n", ntohl(net));

    return 0;
}
```

```python title="struct によるエンディアン指定（Python）"
import struct
import sys

print(f"システムのエンディアン: {sys.byteorder}")

val = 0x12345678

# struct フォーマット文字: '<' = リトルエンディアン, '>' = ビッグエンディアン
le_bytes = struct.pack('<I', val)   # Little Endian
be_bytes = struct.pack('>I', val)   # Big Endian

print(f"\n0x{val:08X} のバイト列:")
print(f"  Little Endian: {le_bytes.hex(' ')}")   # 78 56 34 12
print(f"  Big Endian   : {be_bytes.hex(' ')}")   # 12 34 56 78

# アンパック
le_val = struct.unpack('<I', le_bytes)[0]
be_val = struct.unpack('>I', be_bytes)[0]
print(f"\n復元結果:")
print(f"  LE unpack: 0x{le_val:08X}")
print(f"  BE unpack: 0x{be_val:08X}")

# ネイティブバイトオーダー (=) と ネットワーク (!) の比較
native  = struct.pack('=I', val)
network = struct.pack('!I', val)   # ビッグエンディアン
print(f"\n  Native  : {native.hex(' ')}")
print(f"  Network : {network.hex(' ')}")

# バイナリファイルから 16bit ビッグエンディアン値を読む例
data = bytes([0x00, 0x50, 0x01, 0xBB])  # ポート 80, ポート 443
port1, port2 = struct.unpack('>HH', data)
print(f"\nポート番号: {port1}, {port2}")   # 80, 443
```

## 使用場面

- **ネットワークプロトコル**: TCP/IP ヘッダのポート番号・IPアドレスはビッグエンディアンで格納
- **バイナリファイル解析**: PNG・JPEG などはビッグエンディアン、ELF・WAV はリトルエンディアン
- **クロスプラットフォーム**: ARM は BI エンディアン対応（実行時に切り替え可能）
- **シリアル通信**: Modbus RTU などの産業プロトコルはビッグエンディアン規定
- **共有メモリ**: 異なるアーキテクチャ間でデータを共有する際にバイト順変換が必要

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
