import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ソース符号化定理（シャノンの第1定理）

## ソース符号化定理とは

> シャノンの第1定理（ソース符号化定理）は「エントロピー H(X) を持つ情報源を無損失に符号化する際、記号あたりの平均符号長の下限は H(X) ビットである」ことを保証する定理である。

ソース符号化（Source Coding）は情報源から生成される記号列を、できるだけ短いビット列に変換する「データ圧縮」の数学的基礎です。シャノン（1948年）の第1定理の主張は「どんな一意復号可能な符号でも、平均符号長 L ≥ H(X)（ビット/記号）が成り立ち、かつ H(X) ≤ L < H(X) + 1 を達成する符号が存在する」というものです。

**クラフトの不等式** Σ 2^\{-l_i} ≤ 1（l_i: i 番目の符号語長）は、一意復号可能な瞬時符号（前置符号）が存在するための必要十分条件です。この不等式を満たすように符号長を割り当てれば、木構造（符号木）で表現される前置符号が構成できます。

**平均符号長**の最小化問題は「確率 p_i の記号に長さ l_i = -log_2 p_i を割り当てる」ことで理論的最小値 H(X) に到達します。しかし l_i が整数でないと実現できないため、実際には ⌈-log_2 p_i⌉ の長さを使い、H(X) ≤ L < H(X) + 1 が保証されます。ハフマン符号はこの上界を達成する最適な符号です。

## ソース符号化の基本概念

| 概念 | 内容 |
|------|------|
| エントロピー H(X) | 情報源の平均情報量（ビット/記号） |
| クラフトの不等式 | 前置符号の存在条件 Σ 2^\{-l_i} ≤ 1 |
| 平均符号長 L | Σ p_i * l_i |
| シャノン限界 | H(X) ≤ L < H(X) + 1 |
| 符号化効率 | η = H(X) / L (0 < η ≤ 1) |
| ブロック符号化 | n 記号まとめて符号化すると L → H(X) |

```python
import math
from typing import List, Tuple

def shannon_code_lengths(probs: List[float]) -> List[int]:
    """シャノン符号の符号長 l_i = ceil(-log2(p_i)) を返す"""
    return [math.ceil(-math.log2(p)) for p in probs if p > 0]

def average_code_length(probs: List[float], lengths: List[int]) -> float:
    """平均符号長 L = Σ p_i * l_i"""
    return sum(p * l for p, l in zip(probs, lengths))

def kraft_sum(lengths: List[int]) -> float:
    """クラフトの不等式の左辺 Σ 2^{-l_i}"""
    return sum(2**(-l) for l in lengths)

def entropy(probs: List[float]) -> float:
    return -sum(p * math.log2(p) for p in probs if p > 0)

# 例: 情報源 X = {a, b, c, d} with probs
probs = [0.5, 0.25, 0.125, 0.125]
labels = ['a', 'b', 'c', 'd']

H = entropy(probs)
lengths = shannon_code_lengths(probs)
L = average_code_length(probs, lengths)
kraft = kraft_sum(lengths)

print(f"エントロピー H(X) = {H:.4f} bit")
print(f"シャノン符号長: {dict(zip(labels, lengths))}")
print(f"平均符号長 L = {L:.4f} bit")
print(f"符号化効率 η = {H/L:.4f}")
print(f"クラフト和 = {kraft:.4f} (≤ 1 を確認)")
print(f"シャノン限界: {H:.4f} ≤ {L:.4f} < {H+1:.4f}")

# ブロック符号化: n 記号まとめて符号化すると H(X) に近づく
print("\n--- ブロック符号化での収束 ---")
for n in [1, 2, 4, 8]:
    # n 記号ブロックのエントロピーは n * H(X)
    block_entropy = n * H
    # シャノン符号長でブロック符号化
    block_L = block_entropy + 1  # 最悪でも H(X^n) + 1 bit
    per_symbol = block_L / n
    print(f"ブロック長 n={n}: 記号あたり平均長 ≤ {per_symbol:.4f}")
```

## 使用場面

- **データ圧縮の理論的限界**: gzip・bzip2 などの圧縮率の上限をエントロピーで評価する
- **ハフマン符号・算術符号の設計**: シャノン限界を達成する実用的な符号化アルゴリズムの根拠
- **ストリーミング**: 動画・音声の可逆圧縮でエントロピー限界に近い符号化を行う
- **符号化理論の基礎**: チャネル符号化（誤り訂正）との対比でソース符号化の役割を理解する

## 参考文献

- Shannon, C. E. "A Mathematical Theory of Communication" (Bell System Technical Journal, 1948)
- Cover, T. M. & Thomas, J. A. "Elements of Information Theory" (Wiley)

<AffiliateBanner site="theory_navi" />
