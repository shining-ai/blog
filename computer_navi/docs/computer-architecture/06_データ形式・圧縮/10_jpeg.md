---
sidebar_position: 1
displayed_sidebar: computerArchitectureSidebar
---

# JPEG — DCT・量子化・ハフマン符号化

## 概要

JPEG（Joint Photographic Experts Group）とは、

> 人間の視覚特性（高周波成分への感度が低い）を利用し、離散コサイン変換（DCT）・量子化・エントロピー符号化を組み合わせた不可逆画像圧縮規格

です。

写真のような自然画像に適しており、圧縮率と画質のバランスを品質パラメータ（0〜100）で調整できます。

## JPEG 圧縮の処理フロー

```
1. 色空間変換:  RGB → YCbCr（輝度Y + 色差Cb, Cr）
2. ダウンサンプリング: 色差成分を 4:2:0（2×2 → 1画素）に間引き
3. ブロック分割: 8×8 ピクセルブロックに分割
4. DCT:        空間領域 → 周波数領域に変換
5. 量子化:     低周波を保持、高周波を大きく丸め込む（不可逆ステップ）
6. ジグザグスキャン: 低周波→高周波の順に1次元配列化
7. RLE + ハフマン符号化: 末尾のゼロをランレングス、他をハフマン圧縮
```

## DCT（離散コサイン変換）

```
8×8ブロックの各画素値 f(x,y) を周波数成分 F(u,v) に変換:

F(u,v) = (1/4) × C(u)×C(v) × Σ Σ f(x,y) × cos[(2x+1)uπ/16] × cos[(2y+1)vπ/16]
         x=0 y=0

C(0) = 1/√2, C(n>0) = 1

F(0,0) = DC 成分（平均輝度）
F(u,v) = AC 成分（空間周波数）
```

## 量子化テーブル（例）

```
低品質（Q=50）の輝度量子化テーブル:
16  11  10  16  24  40  51  61
12  12  14  19  26  58  60  55
14  13  16  24  40  57  69  56
...
（右下ほど大きな値 → 高周波成分を大きく丸める）
```

## 性能比較

| 品質 | 圧縮率 | ファイルサイズ（1920×1080の例） |
|---|---|---|
| Q=95（高品質） | 〜5:1 | 〜600KB |
| Q=75（標準） | 〜15:1 | 〜200KB |
| Q=50（低品質） | 〜25:1 | 〜120KB |
| 無圧縮 PNG | — | 〜3MB |

## 実装

```python title="JPEG のブロック DCT（簡略版）"
import numpy as np

def dct2d(block: np.ndarray) -> np.ndarray:
    """8×8 ブロックの 2D DCT（scipy 版）"""
    from scipy.fft import dctn
    return dctn(block.astype(float) - 128, norm='ortho')

def quantize(dct_block: np.ndarray, q_table: np.ndarray) -> np.ndarray:
    return np.round(dct_block / q_table).astype(int)

# 輝度量子化テーブル（JPEG 標準、Q=50）
Q_LUMA = np.array([
    [16,11,10,16,24,40,51,61],
    [12,12,14,19,26,58,60,55],
    [14,13,16,24,40,57,69,56],
    [14,17,22,29,51,87,80,62],
    [18,22,37,56,68,109,103,77],
    [24,35,55,64,81,104,113,92],
    [49,64,78,87,103,121,120,101],
    [72,92,95,98,112,100,103,99],
])

block = np.random.randint(0, 256, (8, 8))
dct_block  = dct2d(block)
quant_block = quantize(dct_block, Q_LUMA)
print(quant_block)
```

## 使用場面

- **Web 画像**: 写真のファイルサイズ削減
- **デジタルカメラ**: 撮影データの保存形式
- **動画コーデック**: MPEG・H.264 の I フレームに JPEG と同様の技術
- **医療画像**: X 線・CT 画像の転送（DICOM 形式）
