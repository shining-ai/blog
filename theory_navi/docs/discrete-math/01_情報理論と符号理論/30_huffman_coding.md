import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ハフマン符号

## ハフマン符号とは

> ハフマン符号（Huffman Coding）とは出現確率の高い記号に短い符号語、低い記号に長い符号語を割り当てる前置符号であり、平均符号長を最小化する最適な無損失圧縮アルゴリズムである。

David Huffman が1952年に考案したハフマン符号は、確率 p_1 ≥ p_2 ≥ ... ≥ p_n を持つ記号集合に対して**最適な前置符号**（Prefix-free Code）を構成します。符号は二分木（ハフマン木）として表現され、左辺に0、右辺に1を割り当てることで符号語を読み取れます。

アルゴリズムは**貪欲法**で動作します。優先度付きキュー（最小ヒープ）を用い、確率最小の2つのノードを繰り返し結合して親ノードを作ります。結合した親の確率は子の確率の和です。この操作を1つのノードになるまで繰り返すとハフマン木が完成します。

ハフマン符号の平均符号長 L は H(X) ≤ L < H(X) + 1 を満たし（シャノン限界を1ビット以内で達成）、同じ平均符号長を持つ前置符号の中で最小の符号長分散を持ちます。n 記号のブロックを一括符号化すれば L → H(X) に収束します。gzip の DEFLATE・PNG 圧縮・JPEG・MP3 など多くの圧縮形式に組み込まれています。

## ハフマン木の構築手順

| ステップ | 操作 |
|----------|------|
| 1 | 各記号を確率を重みとするリーフノードにする |
| 2 | 最小重みの2ノードを取り出す |
| 3 | 2ノードを子とする新親ノード（重み=子の和）を作る |
| 4 | 親ノードをキューに戻す |
| 5 | ノードが1つになるまで 2〜4 を繰り返す |
| 6 | 木の左辺=0、右辺=1 として符号語を読み取る |

```python
import heapq
from dataclasses import dataclass, field
from typing import Optional

@dataclass(order=True)
class HuffmanNode:
    freq: float
    symbol: Optional[str] = field(default=None, compare=False)
    left: Optional['HuffmanNode'] = field(default=None, compare=False)
    right: Optional['HuffmanNode'] = field(default=None, compare=False)

def build_huffman_tree(freqs: dict) -> HuffmanNode:
    """確率辞書からハフマン木を構築"""
    heap = [HuffmanNode(freq=f, symbol=s) for s, f in freqs.items()]
    heapq.heapify(heap)

    while len(heap) > 1:
        left = heapq.heappop(heap)
        right = heapq.heappop(heap)
        parent = HuffmanNode(
            freq=left.freq + right.freq,
            left=left,
            right=right
        )
        heapq.heappush(heap, parent)

    return heap[0]

def get_codes(node: HuffmanNode, prefix: str = "", codes: dict = None) -> dict:
    """ハフマン木から符号辞書を生成"""
    if codes is None:
        codes = {}
    if node.symbol is not None:
        codes[node.symbol] = prefix if prefix else "0"
        return codes
    if node.left:
        get_codes(node.left, prefix + "0", codes)
    if node.right:
        get_codes(node.right, prefix + "1", codes)
    return codes

# 例: 記号の出現頻度
freqs = {'a': 0.45, 'b': 0.25, 'c': 0.15, 'd': 0.10, 'e': 0.05}

tree = build_huffman_tree(freqs)
codes = get_codes(tree)

import math
H = -sum(p * math.log2(p) for p in freqs.values())
L = sum(freqs[s] * len(c) for s, c in codes.items())

print("符号表:")
for s in sorted(freqs, key=lambda x: -freqs[x]):
    print(f"  '{s}' (p={freqs[s]:.2f}): {codes[s]} ({len(codes[s])} bit)")

print(f"\nエントロピー H(X) = {H:.4f} bit")
print(f"平均符号長   L   = {L:.4f} bit")
print(f"符号化効率       = {H/L:.4f}")

# 符号化と復号化
def encode(text: str, codes: dict) -> str:
    return ''.join(codes[c] for c in text)

def decode(bits: str, tree: HuffmanNode) -> str:
    result = []
    node = tree
    for bit in bits:
        node = node.left if bit == '0' else node.right
        if node.symbol:
            result.append(node.symbol)
            node = tree
    return ''.join(result)

msg = "abcde"
encoded = encode(msg, codes)
decoded = decode(encoded, tree)
print(f"\n'{msg}' -> '{encoded}' ({len(encoded)} bit)")
print(f"復号: '{decoded}'")
```

## 使用場面

- **ファイル圧縮**: DEFLATE（gzip・zlib・ZIP）・bzip2 にハフマン符号が組み込まれている
- **画像圧縮**: JPEG の量子化係数の符号化、PNG のデフレート圧縮に使われる
- **音声・動画圧縮**: MP3・AAC・H.264 などの残差符号化にハフマン符号が採用されている
- **ネットワークプロトコル**: HTTP/2 のヘッダ圧縮（HPACK）はハフマン符号を使用する

## 参考文献

- Huffman, D. A. "A Method for the Construction of Minimum-Redundancy Codes" (IEEE, 1952)
- Salomon, D. "Data Compression: The Complete Reference" (Springer)

<AffiliateBanner site="theory_navi" />
