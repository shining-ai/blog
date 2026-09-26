---
sidebar_position: 3
displayed_sidebar: computerArchitectureSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# PNG 圧縮 (PNG Compression)

## PNG とは

PNG とは、

> フィルタリングとDEFLATEによるロスレス（可逆）圧縮を採用したラスタ画像フォーマット（1996年、ISO 15948）

です。
<br/>

GIF の特許問題を解決するために策定され、アルファチャンネル（透過）をサポートします。
可逆圧縮のため写真には不向きですが、スクリーンショット・イラスト・UI素材などエッジが鮮明な画像に最適です。

## PNG ファイル構造

PNGファイルは 8 バイトのシグネチャで始まり、複数のチャンクで構成されます。

**シグネチャ（16進数）:** `89 50 4E 47 0D 0A 1A 0A`

| チャンク | 役割 |
| --- | --- |
| IHDR | 画像幅・高さ・ビット深度・カラータイプ・圧縮方式（先頭必須） |
| PLTE | インデックスカラー用パレット（カラータイプ3で必須） |
| IDAT | 実際の圧縮画像データ（複数に分割可能） |
| IEND | ファイル終端マーカー（末尾必須） |
| tEXt / iTXt | テキストメタデータ |
| gAMA | ガンマ補正値 |
| cHRM | 色空間情報 |

各チャンクの構造: `[長さ 4B][チャンク名 4B][データ 可変][CRC-32 4B]`

## PNG フィルタの5種類

各スキャンラインは圧縮前にフィルタを適用して予測残差を小さくします。`x` は現ピクセル、`a` は左、`b` は上、`c` は左上を示します。

| フィルタ番号 | 名称 | 計算式 |
| --- | --- | --- |
| 0 | None | `Filt(x) = Orig(x)` |
| 1 | Sub | `Filt(x) = Orig(x) - Orig(a)` |
| 2 | Up | `Filt(x) = Orig(x) - Orig(b)` |
| 3 | Average | `Filt(x) = Orig(x) - floor((Orig(a) + Orig(b)) / 2)` |
| 4 | Paeth | `Filt(x) = Orig(x) - PaethPredictor(a, b, c)` |

## カラータイプ

| 値 | カラータイプ | チャンネル数 | 用途 |
| --- | --- | --- | --- |
| 0 | グレースケール | 1 | モノクロ画像 |
| 2 | RGB（トゥルーカラー） | 3 | カラー画像 |
| 3 | インデックスカラー | 1（パレット参照） | 256色以下のイラスト |
| 4 | グレースケール + α | 2 | 透過モノクロ |
| 6 | RGBA | 4 | 透過カラー画像 |

## Paeth 予測子

```
PaethPredictor(a, b, c):
    p  = a + b - c
    pa = |p - a|
    pb = |p - b|
    pc = |p - c|
    if pa <= pb and pa <= pc: return a
    elif pb <= pc:            return b
    else:                     return c
```

## 実装

```c title="libpng を使った PNG 読み込み（C）"
#include <stdio.h>
#include <stdlib.h>
#include <png.h>

typedef struct {
    int      width, height, bit_depth, color_type;
    png_byte **row_pointers;
} PngImage;

PngImage *load_png(const char *filename) {
    FILE *fp = fopen(filename, "rb");
    if (!fp) return NULL;

    /* シグネチャ確認 */
    unsigned char sig[8];
    fread(sig, 1, 8, fp);
    if (!png_check_sig(sig, 8)) { fclose(fp); return NULL; }

    png_structp png_ptr  = png_create_read_struct(PNG_LIBPNG_VER_STRING,
                                                   NULL, NULL, NULL);
    png_infop   info_ptr = png_create_info_struct(png_ptr);

    if (setjmp(png_jmpbuf(png_ptr))) {
        png_destroy_read_struct(&png_ptr, &info_ptr, NULL);
        fclose(fp); return NULL;
    }

    png_init_io(png_ptr, fp);
    png_set_sig_bytes(png_ptr, 8);
    png_read_info(png_ptr, info_ptr);

    PngImage *img = (PngImage *)calloc(1, sizeof(PngImage));
    img->width      = (int)png_get_image_width(png_ptr, info_ptr);
    img->height     = (int)png_get_image_height(png_ptr, info_ptr);
    img->bit_depth  = png_get_bit_depth(png_ptr, info_ptr);
    img->color_type = png_get_color_type(png_ptr, info_ptr);

    /* 各行を格納するポインタ配列を確保 */
    img->row_pointers = (png_byte **)malloc(img->height * sizeof(png_byte *));
    size_t row_size   = png_get_rowbytes(png_ptr, info_ptr);
    for (int y = 0; y < img->height; y++)
        img->row_pointers[y] = (png_byte *)malloc(row_size);

    png_read_image(png_ptr, img->row_pointers);
    png_destroy_read_struct(&png_ptr, &info_ptr, NULL);
    fclose(fp);

    printf("PNG: %dx%d  深度:%d  カラータイプ:%d\n",
           img->width, img->height, img->bit_depth, img->color_type);
    return img;
}

/* 解放 */
void free_png(PngImage *img) {
    for (int y = 0; y < img->height; y++) free(img->row_pointers[y]);
    free(img->row_pointers);
    free(img);
}

int main(void) {
    PngImage *img = load_png("sample.png");
    if (img) free_png(img);
    return 0;
}
```

```python title="Pillow でPNG読み書き・zlibでIDATデコード（Python）"
import zlib
import struct
from PIL import Image
import io

# --- Pillow による PNG 読み書き ---
def inspect_png_with_pillow(path: str) -> None:
    img = Image.open(path)
    print(f"サイズ: {img.width}x{img.height}")
    print(f"モード: {img.mode}")          # RGB, RGBA, L, P など
    print(f"フォーマット: {img.format}")

    # フィルタ情報はメタデータに含まれないため raw デコード確認
    raw = img.tobytes("raw", img.mode)
    print(f"展開後サイズ: {len(raw)} B")

# --- 手動 PNG チャンク解析と IDAT デコード ---
def parse_png_chunks(data: bytes) -> list[tuple[str, bytes]]:
    chunks = []
    pos = 8  # シグネチャ 8 バイトをスキップ
    while pos < len(data):
        length = struct.unpack(">I", data[pos:pos+4])[0]
        name   = data[pos+4:pos+8].decode("ascii")
        chunk_data = data[pos+8:pos+8+length]
        chunks.append((name, chunk_data))
        pos += 12 + length
    return chunks

def decode_idat(png_bytes: bytes) -> bytes:
    chunks = parse_png_chunks(png_bytes)
    # 複数の IDAT チャンクを結合してから展開
    idat_raw = b"".join(d for name, d in chunks if name == "IDAT")
    return zlib.decompress(idat_raw)

# 使用例
try:
    img = Image.open("sample.png")
    buf = io.BytesIO()
    img.save(buf, format="PNG", compress_level=6)
    png_bytes = buf.getvalue()

    raw_data = decode_idat(png_bytes)
    print(f"IDAT 圧縮前: {len(raw_data)} B  圧縮後: {len(png_bytes)} B")

    # 各スキャンラインの先頭バイトがフィルタタイプ
    filter_names = {0: "None", 1: "Sub", 2: "Up", 3: "Average", 4: "Paeth"}
    stride = img.width * len(img.getbands()) + 1  # フィルタバイト込み
    for y in range(min(5, img.height)):
        ft = raw_data[y * stride]
        print(f"  行 {y:3d}: フィルタ {ft} ({filter_names.get(ft, '?')})")

except FileNotFoundError:
    print("sample.png が見つかりません")

# --- RGBA PNG を生成して保存 ---
img_rgba = Image.new("RGBA", (64, 64), (100, 150, 200, 128))
img_rgba.save("output.png")
print("output.png を保存しました")
```

## 使用場面

- **Web の透過画像**: ロゴ・アイコンの背景透過（RGBA カラータイプ）
- **スクリーンショット**: テキストやUIエッジをロスレスで保存
- **テクスチャアトラス**: ゲームエンジンでロスレス必須のスプライトシート
- **デザインツール**: Figma / Photoshop のエクスポート形式
- **医療・科学画像**: ピクセル値を正確に保持する必要がある分野

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
