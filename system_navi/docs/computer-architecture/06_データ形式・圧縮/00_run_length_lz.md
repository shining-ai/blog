---
sidebar_position: 0
displayed_sidebar: computerArchitectureSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ランレングス符号化と LZ 圧縮 (Run-Length & LZ77)

## ランレングス符号化とは

ランレングス符号化（RLE）とは、

> 連続する同じ値の列を「値×繰り返し数」のペアで表現し、データを圧縮する手法

です。
<br/>

繰り返しが多いデータ（ファックス画像・PCX フォーマット等）に効果的ですが、ランダムデータでは逆に膨張します。

## LZ77 とは

LZ77（Lempel-Ziv 1977）とは、

> スライディングウィンドウを用いてデータの繰り返しを「距離・長さ」のペアで参照表現する汎用圧縮アルゴリズム

です。
<br/>

deflate（ZIP・gzip・PNG）や zstd の基礎となっています。

## アルゴリズム比較


| アルゴリズム | 圧縮対象 | 代表的な用途 |
| --- | --- | --- |
| RLE | 連続値列 | BMP・FAX・PCX |
| LZ77 | 長距離繰り返し | gzip・zlib・PNG |
| LZ78/LZW | 辞書ベース | GIF・TIFF |
| Huffman | 出現頻度差 | JPEG・MP3 |
| ANS | 高精度確率符号 | zstd・brotli |

## 実装

```python title="ランレングス符号化（Python）"
def rle_encode(data: bytes) -> list[tuple[int, int]]:
    """バイト列をランレングス符号化"""
    if not data:
        return []
    result = []
    count = 1
    for i in range(1, len(data)):
        if data[i] == data[i - 1] and count < 255:
            count += 1
        else:
            result.append((data[i - 1], count))
            count = 1
    result.append((data[-1], count))
    return result

def rle_decode(encoded: list[tuple[int, int]]) -> bytes:
    """ランレングス復号"""
    return bytes(b for val, cnt in encoded for b in [val] * cnt)

data = bytes([0, 0, 0, 0, 1, 1, 2, 2, 2, 2, 2])
enc = rle_encode(data)
print("符号化:", enc)           # [(0,4),(1,2),(2,5)]
print("復号:", rle_decode(enc))  # 元に戻る
print(f"圧縮率: {len(data)/len(enc)/2:.1f}x")
```

```python title="LZ77 圧縮（Python）"
def lz77_encode(data: str, window: int = 15, lookahead: int = 8) -> list:
    """LZ77 エンコーダ（教育用簡易実装）"""
    pos = 0
    tokens = []
    while pos < len(data):
        best_off, best_len = 0, 0
        # スライディングウィンドウ内で最長一致を探す
        start = max(0, pos - window)
        for i in range(start, pos):
            l = 0
            while (l < lookahead and
                   pos + l < len(data) and
                   data[i + l] == data[pos + l]):
                l += 1
            if l > best_len:
                best_off, best_len = pos - i, l
        if best_len >= 2:
            tokens.append((best_off, best_len, ''))
            pos += best_len
        else:
            tokens.append((0, 0, data[pos]))
            pos += 1
    return tokens

text = "abracadabra_abracadabra"
tokens = lz77_encode(text)
literal_bytes = sum(1 for t in tokens if t[2])
ref_count     = sum(1 for t in tokens if not t[2])
print(f"元のサイズ: {len(text)}")
print(f"リテラル数: {literal_bytes}, 参照数: {ref_count}")
```

## 使用場面

- **PNG**: deflate（LZ77 + Huffman）でロスレス圧縮
- **HTTP/2**: HPACK ヘッダー圧縮で帯域削減
- **仮想マシン**: メモリページの重複排除（KSM）
- **ゲーム**: テクスチャアセットのパッケージング

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
