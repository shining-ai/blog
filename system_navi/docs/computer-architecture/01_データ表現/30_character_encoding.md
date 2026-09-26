---
sidebar_position: 3
displayed_sidebar: computerArchitectureSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 文字エンコーディング (Character Encoding)

## 文字エンコーディングとは

文字エンコーディングとは、

> 文字と数値のマッピング規則であり、ASCIIを起源としてUnicodeが現在の世界標準となっている符号化方式

です。
<br/>

コンピュータは文字をビット列として扱うため、どの数値がどの文字を表すかを定めた規則が不可欠です。
Unicode は世界中の文字を単一の符号空間（コードポイント）に収め、UTF-8・UTF-16・UTF-32 はその転送・格納形式（エンコーディング）です。

## ASCII

ASCII（American Standard Code for Information Interchange）は 7ビット 128 文字を定義した最初の標準エンコーディングです。

| 範囲 | 内容 |
| --- | --- |
| 0x00–0x1F | 制御文字（改行 `\n`=0x0A、タブ `\t`=0x09 など） |
| 0x20–0x2F | 記号（スペース・`!`・`"` など） |
| 0x30–0x39 | 数字 `0`–`9` |
| 0x41–0x5A | 大文字 `A`–`Z` |
| 0x61–0x7A | 小文字 `a`–`z` |

## UTF-8 エンコード規則

UTF-8 はコードポイント範囲によって 1〜4 バイトの可変長エンコードを使用します。

| コードポイント範囲 | バイト数 | バイトパターン |
| --- | --- | --- |
| U+0000 – U+007F | 1 | `0xxxxxxx` |
| U+0080 – U+07FF | 2 | `110xxxxx 10xxxxxx` |
| U+0800 – U+FFFF | 3 | `1110xxxx 10xxxxxx 10xxxxxx` |
| U+10000 – U+10FFFF | 4 | `11110xxx 10xxxxxx 10xxxxxx 10xxxxxx` |

先頭バイトの上位ビットパターンでバイト数が判別でき、続きバイトは必ず `10xxxxxx` で始まります。

## UTF-16 とサロゲートペア

UTF-16 は基本多言語面（BMP, U+0000–U+FFFF）を 2 バイトで表現します。
BMP 外の文字（U+10000 以降）はサロゲートペアと呼ばれる 4 バイト表現を使います。

```
上位サロゲート: 0xD800 – 0xDBFF
下位サロゲート: 0xDC00 – 0xDFFF

コードポイント計算:
  cp = 0x10000 + (high - 0xD800) × 0x400 + (low - 0xDC00)
```

## エンコーディング比較

| 項目 | ASCII | UTF-8 | UTF-16 | UTF-32 |
| --- | --- | --- | --- | --- |
| バイト/文字 | 1（固定） | 1–4（可変） | 2 or 4（可変） | 4（固定） |
| ASCII 互換 | ○ | ○ | ✗ | ✗ |
| BOM | 不要 | 任意 | 必須推奨 | 必須推奨 |
| 主な用途 | レガシーシステム | Web・Unix | Windows API・Java | 内部処理 |
| 日本語 1 文字 | 表現不可 | 3 バイト | 2 バイト | 4 バイト |

## 実装

```c title="UTF-8 コードポイント取得（C）"
#include <stdio.h>
#include <stdint.h>

/* UTF-8 バイト列から最初のコードポイントを取得し、消費バイト数を返す */
int utf8_codepoint(const uint8_t *s, uint32_t *cp) {
    if ((s[0] & 0x80) == 0x00) {          /* 1バイト: 0xxxxxxx */
        *cp = s[0];
        return 1;
    } else if ((s[0] & 0xE0) == 0xC0) {   /* 2バイト: 110xxxxx */
        *cp = ((s[0] & 0x1F) << 6) | (s[1] & 0x3F);
        return 2;
    } else if ((s[0] & 0xF0) == 0xE0) {   /* 3バイト: 1110xxxx */
        *cp = ((s[0] & 0x0F) << 12) | ((s[1] & 0x3F) << 6) | (s[2] & 0x3F);
        return 3;
    } else if ((s[0] & 0xF8) == 0xF0) {   /* 4バイト: 11110xxx */
        *cp = ((s[0] & 0x07) << 18) | ((s[1] & 0x3F) << 12)
            | ((s[2] & 0x3F) <<  6) |  (s[3] & 0x3F);
        return 4;
    }
    return -1; /* 不正なバイト列 */
}

int main(void) {
    /* "A" (U+0041), "€" (U+20AC), "あ" (U+3042) */
    const uint8_t utf8[] = {0x41, 0xE2, 0x82, 0xAC, 0xE3, 0x81, 0x82, 0x00};
    const uint8_t *p = utf8;
    uint32_t cp;
    int n;
    while (*p) {
        n = utf8_codepoint(p, &cp);
        printf("U+%04X (%d bytes)\n", cp, n);
        p += n;
    }
    return 0;
}
```

```python title="エンコード・デコードとBOM検出（Python）"
# UTF-8 エンコード・デコード
text = "Hello, 世界! €"
encoded_utf8  = text.encode("utf-8")
encoded_utf16 = text.encode("utf-16")          # BOM 付き
encoded_utf32 = text.encode("utf-32")          # BOM 付き

print(f"UTF-8  : {encoded_utf8.hex(' ')}")
print(f"UTF-16 : {encoded_utf16[:10].hex(' ')} ...")
print(f"UTF-32 : {encoded_utf32[:12].hex(' ')} ...")

# BOM 検出
def detect_encoding(data: bytes) -> str:
    if data.startswith(b'\xff\xfe\x00\x00') or data.startswith(b'\x00\x00\xfe\xff'):
        return "UTF-32"
    if data.startswith(b'\xff\xfe') or data.startswith(b'\xfe\xff'):
        return "UTF-16"
    if data.startswith(b'\xef\xbb\xbf'):
        return "UTF-8 with BOM"
    return "UTF-8 (no BOM) or other"

print(f"\nBOM 検出結果:")
print(f"  UTF-16 encoded: {detect_encoding(encoded_utf16)}")
print(f"  UTF-8  encoded: {detect_encoding(encoded_utf8)}")

# コードポイントとバイト数を確認
for char in "Aあ€𠀋":
    cp = ord(char)
    utf8_bytes = char.encode("utf-8")
    print(f"'{char}' U+{cp:04X}: UTF-8={len(utf8_bytes)}byte {utf8_bytes.hex()}")
```

## 使用場面

- **Web コンテンツ**: HTML・CSS・JSON は UTF-8 が事実上の標準（`<meta charset="UTF-8">`）
- **Windows API**: Win32 API の `W` 系関数は UTF-16LE を使用。`MultiByteToWideChar` で変換
- **Unix / Linux**: ファイルシステム・シェルはバイト列として扱い、ロケールで解釈を決定
- **データベース**: MySQL の `utf8mb4`、PostgreSQL の `UTF8` で4バイト文字（絵文字）に対応
- **プログラミング言語内部**: Java・JavaScript・C# は文字列を UTF-16 で内部表現

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
