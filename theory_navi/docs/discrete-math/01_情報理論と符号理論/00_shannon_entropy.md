import AffiliateBanner from '@site/src/components/AffiliateBanner';

# シャノンのエントロピー

## シャノンのエントロピーとは

> シャノンのエントロピー H(X) = -Σ p(x) log_2 p(x) とは、確率変数 X が持つ情報量（不確実性・平均情報量）をビット単位で測る指標であり、情報理論の基礎概念である。

クロード・シャノンが1948年の論文「A Mathematical Theory of Communication」で提唱したエントロピーは、情報をどれだけ効率よく符号化できるかの下限を与えます。事象 x が起きたとき、その**自己情報量**（surprisal）は I(x) = -log_2 p(x) ビットです。確率が低い（珍しい）事象ほど情報量が大きく、確率1の確実な事象の情報量は0です。

エントロピー H(X) は自己情報量の期待値であり、確率変数 X の分布の「不確実性」「ランダム性」「平均符号長の下限」を表します。n 種類の記号がある場合、すべてが等確率のとき H(X) = log_2(n) で最大となります（最大エントロピー原理）。一方、1つの記号が確率1であれば H(X) = 0 で、情報量がない（完全に予測可能）状態です。

エントロピーは情報源符号化定理の核心であり、「無損失圧縮の理論限界は H(X) ビット/記号」を主張します（シャノンの第1定理）。ハフマン符号や算術符号はこの限界に近づく実用的な圧縮アルゴリズムです。

## エントロピーの性質

| 性質 | 内容 |
|------|------|
| 非負性 | H(X) ≥ 0 |
| 最大性 | 等確率分布のとき最大 H(X) = log_2 n |
| 連続性 | 確率のわずかな変化でエントロピーも連続に変化 |
| 加法性 | 独立な X,Y に対し H(X,Y) = H(X) + H(Y) |
| 連鎖律 | H(X,Y) = H(X) + H(Y\|X) |

```python
import math
from collections import Counter

def entropy(probs: list) -> float:
    """確率リストからシャノンエントロピー（ビット）を計算"""
    return -sum(p * math.log2(p) for p in probs if p > 0)

# 1. コインの例
print("公平なコイン:", entropy([0.5, 0.5]))        # 1.0 bit
print("偏ったコイン(0.9):", entropy([0.9, 0.1]))   # ~0.469 bit
print("確実(p=1):", entropy([1.0, 0.0]))            # 0.0 bit

# 2. サイコロ（6面）
print("公平なサイコロ:", entropy([1/6]*6))          # ~2.585 bit

# 3. テキストのエントロピー推定
text = "hello world"
freq = Counter(text)
total = len(text)
probs = [count / total for count in freq.values()]
h = entropy(probs)
print(f"'{text}' のエントロピー: {h:.3f} bit/記号")

# 4. 情報量（自己情報量）
def self_information(p: float) -> float:
    """事象の自己情報量（ビット）"""
    return -math.log2(p) if p > 0 else float('inf')

print(f"確率 1/2 の事象: {self_information(0.5):.1f} bit")   # 1.0
print(f"確率 1/4 の事象: {self_information(0.25):.1f} bit")  # 2.0
print(f"確率 1/8 の事象: {self_information(0.125):.1f} bit") # 3.0

# 5. ジョイントエントロピーと加法性の確認
def joint_entropy(joint_probs: dict) -> float:
    """同時分布からジョイントエントロピーを計算"""
    return -sum(p * math.log2(p) for p in joint_probs.values() if p > 0)

# 独立な X と Y（各々コイン投げ）
joint = {(0,0): 0.25, (0,1): 0.25, (1,0): 0.25, (1,1): 0.25}
print("H(X,Y) =", joint_entropy(joint))  # 2.0 = H(X) + H(Y) = 1 + 1
```

## 使用場面

- **データ圧縮**: gzip・bzip2・LZ77 などの圧縮アルゴリズムはエントロピーを下限として設計される
- **機械学習**: 決定木の分岐基準（情報利得）・交差エントロピー損失関数に使われる
- **暗号理論**: 鍵のエントロピーはパスワードの強度・乱数品質の測定に使われる
- **通信システム**: チャネル容量の計算・最適符号設計の基礎となる

## 参考文献

- Shannon, C. E. "A Mathematical Theory of Communication" (Bell System Technical Journal, 1948)
- Cover, T. M. & Thomas, J. A. "Elements of Information Theory" (Wiley)

<AffiliateBanner site="theory_navi" />
