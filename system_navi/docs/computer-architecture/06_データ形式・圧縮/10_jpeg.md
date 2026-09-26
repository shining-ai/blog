---
sidebar_position: 1
displayed_sidebar: computerArchitectureSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# JPEG 圧縮 (JPEG Compression)

## JPEG とは

JPEG とは、

> 離散コサイン変換（DCT）で画像を周波数成分に変換し、視覚的に重要でない高周波成分を間引くことでロッシー（非可逆）圧縮を実現するフォーマット

です。
<br/>

1992年に ISO/IEC が標準化しました。
典型的な品質設定で元サイズの 1/10〜1/20 に圧縮でき、写真に最適です。

## JPEG 圧縮パイプライン


```
入力RGB画像
  → YCbCr 色空間変換（輝度・色差分離）
    → クロマサブサンプリング（4:2:0 等）
      → 8×8ブロック分割
        → DCT（離散コサイン変換）
          → 量子化（高周波成分を丸め込み）
            → ジグザグスキャン
              → ランレングス + ハフマン符号化
                → JFIF/Exif ファイル出力
```

## 量子化テーブル（輝度成分・品質50%相当）

| 16 | 11 | 10 | 16 | 24 | 40 | 51 | 61 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 12 | 12 | 14 | 19 | 26 | 58 | 60 | 55 |
| 14 | 13 | 16 | 24 | 40 | 57 | 69 | 56 |
| 14 | 17 | 22 | 29 | 51 | 87 | 80 | 62 |

数値が大きいほど多くの情報が失われる。

## 実装

```python title="DCT と JPEG 圧縮（Python）"
import numpy as np
from scipy.fft import dctn, idctn
from PIL import Image
import io

def dct2d(block: np.ndarray) -> np.ndarray:
    """2次元DCT（8×8ブロック用）"""
    return dctn(block, norm='ortho')

def idct2d(block: np.ndarray) -> np.ndarray:
    """2次元逆DCT"""
    return idctn(block, norm='ortho')

# 標準量子化テーブル（輝度）
Q_LUMA = np.array([
    [16, 11, 10, 16, 24, 40, 51, 61],
    [12, 12, 14, 19, 26, 58, 60, 55],
    [14, 13, 16, 24, 40, 57, 69, 56],
    [14, 17, 22, 29, 51, 87, 80, 62],
    [18, 22, 37, 56, 68,109,103, 77],
    [24, 35, 55, 64, 81,104,113, 92],
    [49, 64, 78, 87,103,121,120,101],
    [72, 92, 95, 98,112,100,103, 99],
], dtype=float)

def jpeg_block(block: np.ndarray, quality: float = 50.0) -> np.ndarray:
    """8×8ブロックをJPEGライク圧縮・復号"""
    scale = 50.0 / quality
    Q = np.clip(np.round(Q_LUMA * scale), 1, 255)
    # 圧縮
    d = dct2d(block.astype(float) - 128)
    quantized = np.round(d / Q)
    # 復号
    dequantized = quantized * Q
    reconstructed = idct2d(dequantized) + 128
    return np.clip(reconstructed, 0, 255).astype(np.uint8)

# PSNR（ピーク信号対雑音比）計算
def psnr(original: np.ndarray, compressed: np.ndarray) -> float:
    mse = np.mean((original.astype(float) - compressed.astype(float)) ** 2)
    return 10 * np.log10(255**2 / mse) if mse > 0 else float('inf')

# テスト：ランダムな8×8ブロック
block = np.random.randint(0, 256, (8, 8), dtype=np.uint8)
for q in [10, 50, 90]:
    rec = jpeg_block(block, q)
    print(f"品質{q:3d}%: PSNR = {psnr(block, rec):.1f} dB")
```

```python title="Pillow による JPEG 品質比較（Python）"
from PIL import Image
import io

def jpeg_compress(img: Image.Image, quality: int) -> tuple[bytes, float]:
    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=quality)
    data = buf.getvalue()
    ratio = img.width * img.height * 3 / len(data)
    return data, ratio

# 使用例（適宜画像パスを変更）
try:
    img = Image.open("sample.jpg").convert("RGB")
    for q in [10, 30, 50, 75, 95]:
        data, ratio = jpeg_compress(img, q)
        print(f"品質{q:3d}%: {len(data)/1024:.1f} KB, 圧縮率 {ratio:.1f}x")
except FileNotFoundError:
    print("sample.jpg が見つかりません")
```

## 使用場面

- **Web**: 写真画像の高効率配信（`.jpg`）
- **デジタルカメラ**: 撮影データのリアルタイム圧縮保存
- **医療画像**: DICOM の JPEG 2000 ロッシー圧縮
- **ストリーミング**: 動画フレームの I フレーム圧縮（H.264/HEVC）

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
