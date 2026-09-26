---
sidebar_position: 2
displayed_sidebar: computerArchitectureSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# zlib と DEFLATE (zlib & DEFLATE)

## zlib と DEFLATE とは

zlib と DEFLATE とは、

> DEFLATEはLZ77とハフマン符号化を組み合わせた可逆圧縮アルゴリズム。zlibはそのフォーマット仕様および標準実装ライブラリ

です。
<br/>

DEFLATE は RFC 1951 で規定され、LZ77 によるバック参照（距離・長さ対）生成とハフマン符号化を 2 段階で適用します。
zlib（RFC 1950）はその上に CMF/FLG ヘッダと Adler-32 チェックサムを追加したラッパーフォーマットで、`zlib.h` として広く実装されています。

## DEFLATE の圧縮フロー

```
入力データ
  → LZ77 スキャン（スライディングウィンドウ 32KB）
    → リテラル または バック参照（距離・長さ対）に変換
      → ハフマン符号化（固定 or 動的ハフマン木）
        → ビットストリーム出力
```

## zlibフォーマット構造

| フィールド | サイズ | 内容 |
| --- | --- | --- |
| CMF | 1 バイト | 圧縮方式（下位4bit）とウィンドウサイズ（上位4bit） |
| FLG | 1 バイト | チェックフラグ・FDICT フラグ・圧縮レベルヒント |
| 圧縮データ | 可変 | DEFLATE ビットストリーム |
| Adler-32 | 4 バイト | チェックサム（ビッグエンディアン） |

## gzip / zlib / deflate (raw) の違い

| フォーマット | ヘッダ | フッタ | チェックサム | RFC |
| --- | --- | --- | --- | --- |
| deflate (raw) | なし | なし | なし | RFC 1951 |
| zlib | CMF + FLG | Adler-32 | Adler-32 | RFC 1950 |
| gzip | 10 バイト（マジック・OS 等） | CRC-32 + サイズ | CRC-32 | RFC 1952 |

## 圧縮レベルと速度/圧縮率のトレードオフ

| レベル | 名称 | 特徴 |
| --- | --- | --- |
| 0 | 無圧縮 | データをそのまま格納（最速） |
| 1 | 最速圧縮 | 圧縮率は低いがスループット重視 |
| 6 | デフォルト | 速度と圧縮率のバランス |
| 9 | 最高圧縮 | 圧縮率最大・CPU コスト大 |

## 実装

```c title="deflate/inflate の基本（C + zlib.h）"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <zlib.h>

/* deflate 圧縮 */
int compress_data(const unsigned char *src, uLong src_len,
                  unsigned char **dst, uLong *dst_len) {
    *dst_len = compressBound(src_len);
    *dst = (unsigned char *)malloc(*dst_len);
    if (!*dst) return Z_MEM_ERROR;

    /* レベル指定は compress2() を使用 */
    int ret = compress2(*dst, dst_len, src, src_len, Z_DEFAULT_COMPRESSION);
    if (ret != Z_OK) {
        free(*dst);
        *dst = NULL;
    }
    return ret;
}

/* inflate 展開 */
int decompress_data(const unsigned char *src, uLong src_len,
                    unsigned char *dst, uLong *dst_len) {
    return uncompress(dst, dst_len, src, src_len);
}

/* ストリーミング deflate（大容量対応） */
int deflate_stream(FILE *in, FILE *out, int level) {
    unsigned char in_buf[16384], out_buf[16384];
    z_stream strm = {0};

    if (deflateInit(&strm, level) != Z_OK) return -1;

    int flush;
    do {
        strm.avail_in = (uInt)fread(in_buf, 1, sizeof(in_buf), in);
        flush = feof(in) ? Z_FINISH : Z_NO_FLUSH;
        strm.next_in = in_buf;

        do {
            strm.avail_out = sizeof(out_buf);
            strm.next_out  = out_buf;
            deflate(&strm, flush);
            fwrite(out_buf, 1, sizeof(out_buf) - strm.avail_out, out);
        } while (strm.avail_out == 0);

    } while (flush != Z_FINISH);

    deflateEnd(&strm);
    return 0;
}

int main(void) {
    const char *text = "Hello, DEFLATE! Hello, DEFLATE! Hello, DEFLATE!";
    uLong src_len = strlen(text);

    unsigned char *comp = NULL;
    uLong comp_len = 0;
    compress_data((unsigned char *)text, src_len, &comp, &comp_len);
    printf("元サイズ: %lu バイト -> 圧縮後: %lu バイト\n", src_len, comp_len);

    unsigned char decomp[256];
    uLong decomp_len = sizeof(decomp);
    decompress_data(comp, comp_len, decomp, &decomp_len);
    decomp[decomp_len] = '\0';
    printf("展開後: %s\n", decomp);

    free(comp);
    return 0;
}
```

```python title="zlib / gzip による圧縮と展開（Python）"
import zlib
import gzip
import io

text = b"Hello, DEFLATE! Hello, DEFLATE! Hello, DEFLATE!"

# --- zlib フォーマット ---
compressed_zlib = zlib.compress(text, level=6)
decompressed    = zlib.decompress(compressed_zlib)
print(f"[zlib] 元: {len(text)} B -> 圧縮後: {len(compressed_zlib)} B")
assert decompressed == text

# --- gzip フォーマット（インメモリ） ---
buf = io.BytesIO()
with gzip.GzipFile(fileobj=buf, mode='wb', compresslevel=6) as f:
    f.write(text)
compressed_gz = buf.getvalue()
print(f"[gzip] 元: {len(text)} B -> 圧縮後: {len(compressed_gz)} B")

buf.seek(0)
with gzip.GzipFile(fileobj=buf, mode='rb') as f:
    assert f.read() == text

# --- raw DEFLATE（ヘッダ/チェックサムなし） ---
compress_obj   = zlib.compressobj(wbits=-15)   # wbits 負値 = raw deflate
raw_deflate    = compress_obj.compress(text) + compress_obj.flush()
decompress_obj = zlib.decompressobj(wbits=-15)
restored       = decompress_obj.decompress(raw_deflate)
print(f"[raw] 元: {len(text)} B -> 圧縮後: {len(raw_deflate)} B")
assert restored == text

# --- 各レベルの圧縮率比較 ---
data = text * 100
print("\n圧縮レベル別サイズ:")
for level in range(10):
    c = zlib.compress(data, level=level)
    print(f"  Level {level}: {len(c)} B  (ratio {len(data)/len(c):.1f}x)")
```

## 使用場面

- **HTTP Content-Encoding**: `gzip` / `deflate` ヘッダによる転送圧縮（Webサーバ・ブラウザ間）
- **PNG 内部圧縮**: IDAT チャンクのペイロードに DEFLATE を使用
- **JAR / ZIP**: Java アーカイブおよび ZIP フォーマットのエントリ圧縮方式
- **PDF**: ストリームオブジェクトの `/FlateDecode` フィルタ
- **TLS/SSL**: 過去のプロトコル圧縮（現在は CRIME 攻撃対策で無効化推奨）

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
