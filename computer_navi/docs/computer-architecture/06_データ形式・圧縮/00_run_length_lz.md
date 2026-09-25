---
sidebar_position: 0
displayed_sidebar: computerArchitectureSidebar
---

# ランレングス符号化・LZ77・LZ78

## 概要

データ圧縮とは、

> データの冗長性を取り除き、より少ないビット数で同じ情報を表現する技術

です。

無損失圧縮アルゴリズムの代表として、ランレングス符号化と LZ 系（Lempel-Ziv）があります。

## ランレングス符号化（RLE）

連続した同じ値を「（値, 回数）」のペアで置き換えます。

```
元データ:    AAABBBBBCCDDDDDDDD
エンコード:  A3 B5 C2 D8
圧縮率:     18文字 → 8ペア（50%弱）

効果的な例: FAX の白黒画像、BMP 形式のベタ塗り領域
不得意な例: ランダムデータ（むしろ膨らむ）
```

## LZ77 アルゴリズム

スライディングウィンドウ内の過去データを参照し、一致するパターンを `(オフセット, 長さ)` で圧縮します。

```
検索バッファ（過去）| 先読みバッファ（未来）
   ...ABCABC        | ABCABC...

一致発見: オフセット=6, 長さ=6
出力: (6, 6, 次の文字)
```

| パラメータ | 説明 |
|---|---|
| 検索バッファ | 過去のデータ（数KB〜数十KB） |
| 先読みバッファ | 圧縮対象（数十バイト） |
| 出力トークン | (オフセット, 長さ, 次文字) または (0, 0, 文字) |

## LZ78 アルゴリズム

辞書に新しいパターンを逐次追加していき、辞書インデックスで参照します。

```
辞書: {1: "A", 2: "B", 3: "AB", ...}
エンコード: (0,A)(0,B)(1,B)(2,A)...
```

LZW（Lempel-Ziv-Welch）は LZ78 の改良版で、GIF・TIFF に使われています。

## 計算量

| アルゴリズム | 圧縮時間 | 展開時間 | 備考 |
|---|---|---|---|
| RLE | O(n) | O(n) | 最も単純 |
| LZ77 | O(n × W) | O(n) | W=ウィンドウサイズ |
| LZ78/LZW | O(n) | O(n) | 辞書のハッシュ検索 |

## 実装

```python title="ランレングス符号化"
def rle_encode(data: str) -> list[tuple[str, int]]:
    if not data:
        return []
    result = []
    ch, cnt = data[0], 1
    for c in data[1:]:
        if c == ch:
            cnt += 1
        else:
            result.append((ch, cnt))
            ch, cnt = c, 1
    result.append((ch, cnt))
    return result

def rle_decode(encoded: list[tuple[str, int]]) -> str:
    return ''.join(c * n for c, n in encoded)

s = "AAABBBBBCCDDDDDDDD"
enc = rle_encode(s)
print(enc)           # [('A',3),('B',5),('C',2),('D',8)]
print(rle_decode(enc) == s)  # True
```

## 使用場面

- **RLE**: BMP・PCX・TIFF、FAX 通信（T.4 規格）
- **LZ77**: DEFLATE（ZIP・gzip・zlib の中核）
- **LZW**: GIF・PDF・初期の TIFF
- **LZMA**: 7-Zip の圧縮アルゴリズム（高圧縮率）
