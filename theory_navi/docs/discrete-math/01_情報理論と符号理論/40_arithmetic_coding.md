import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 算術符号化

## 算術符号化とは

> 算術符号化（Arithmetic Coding）とは記号列全体を [0, 1) の区間上の1つの実数に対応させることで、シャノンのエントロピー限界 H(X) に任意に近い平均符号長を達成できる無損失圧縮手法である。

ハフマン符号は各記号に整数ビット長の符号を割り当てるため、確率が2の負の整数乗でないときに非効率が生じます（例: p = 0.9 の記号に最低1ビット必要）。算術符号化はこの制約を除去し、記号単位ではなくメッセージ全体を1つの実数区間に対応させます。

アルゴリズムの核心は「現在の区間 [low, high) を次の記号の確率に従って縮小し続ける」ことです。初期区間 [0, 1) を確率分布に従って記号ごとに分割し、各記号を選んだらその対応する部分区間に絞り込みます。メッセージ全体を処理した後の区間内の任意の2進小数が符号語となります。

算術符号化の平均符号長はほぼ H(X) ビット/記号（正確には H(X) ≤ L < H(X) + 2/n）を達成できます。ただし浮動小数点の精度問題を解決するため、実装では整数演算（スケーリング・キャリービット操作）が必要です。JPEG 2000・JBIG2・H.264/HEVC の CABAC（Context-Adaptive Binary Arithmetic Coding）に実用されています。

## 算術符号化の手順

| ステップ | 操作 |
|----------|------|
| 初期化 | low = 0.0, high = 1.0 |
| 記号読み取り | 記号 s の累積確率 [cum_lo, cum_hi) を求める |
| 区間更新 | range = high - low; high = low + range * cum_hi; low = low + range * cum_lo |
| 繰り返し | メッセージ終端まで繰り返す |
| 出力 | 最終区間内の任意の2進小数を出力 |

```python
from fractions import Fraction
from typing import Dict, List, Tuple

def build_cumulative(probs: Dict[str, float]) -> Dict[str, Tuple[float, float]]:
    """累積確率の区間辞書を構築: symbol -> (low, high)"""
    cum = {}
    total = 0.0
    for symbol, p in sorted(probs.items()):
        cum[symbol] = (total, total + p)
        total += p
    return cum

def arithmetic_encode(message: str, probs: Dict[str, float]) -> Tuple[float, int]:
    """
    算術符号化: (区間中の実数, 必要ビット数) を返す
    """
    cum = build_cumulative(probs)
    low, high = 0.0, 1.0

    for symbol in message:
        lo, hi = cum[symbol]
        range_ = high - low
        high = low + range_ * hi
        low = low + range_ * lo

    # 区間の中点を符号語として選択
    mid = (low + high) / 2
    import math
    bits_needed = math.ceil(-math.log2(high - low)) + 1
    return mid, bits_needed

def arithmetic_decode(code: float, length: int, probs: Dict[str, float]) -> str:
    """算術符号の復号"""
    cum = build_cumulative(probs)
    result = []

    for _ in range(length):
        for symbol, (lo, hi) in cum.items():
            if lo <= code < hi:
                result.append(symbol)
                range_ = hi - lo
                code = (code - lo) / range_
                break
    return ''.join(result)

# 例
probs = {'a': 0.5, 'b': 0.25, 'c': 0.25}
message = "abc"

code, bits = arithmetic_encode(message, probs)
decoded = arithmetic_decode(code, len(message), probs)

import math
H = -sum(p * math.log2(p) for p in probs.values())
print(f"メッセージ: '{message}'")
print(f"符号語（実数）: {code:.6f}")
print(f"必要ビット数: {bits}")
print(f"エントロピー × 長さ: {H * len(message):.4f} bit")
print(f"復号結果: '{decoded}'")
print(f"圧縮効率: {H * len(message) / bits:.4f}")

# 整数スケーリング版（精度問題を回避）
def integer_arithmetic_encode(message: str, probs: Dict[str, float],
                               scale: int = 10000) -> List[int]:
    """
    整数演算による算術符号化（簡易版）
    """
    cum_int = {}
    total = 0
    for symbol, p in sorted(probs.items()):
        lo = round(total * scale)
        hi = round((total + p) * scale)
        cum_int[symbol] = (lo, hi)
        total += p

    low, high = 0, scale
    output = []
    for symbol in message:
        lo, hi = cum_int[symbol]
        range_ = high - low
        high = low + range_ * hi // scale
        low = low + range_ * lo // scale
    output.append((low + high) // 2)
    return output

enc = integer_arithmetic_encode("abc", probs)
print(f"\n整数版符号語: {enc}")
```

## 使用場面

- **JPEG 2000**: 静止画圧縮の算術符号化で高効率な可逆・非可逆圧縮を実現する
- **H.264/H.265 動画圧縮**: CABAC（文脈適応型二値算術符号化）で残差係数を圧縮する
- **JBIG2**: 二値画像のファクス圧縮に算術符号化が採用されている
- **一般データ圧縮**: LZMA（7-Zip）はハフマンの代わりに算術符号化を採用して高圧縮を実現する

## 参考文献

- Witten, I. H., Neal, R. M. & Cleary, J. G. "Arithmetic Coding for Data Compression" (CACM, 1987)
- Salomon, D. "Data Compression: The Complete Reference" (Springer)

<AffiliateBanner site="theory_navi" />
