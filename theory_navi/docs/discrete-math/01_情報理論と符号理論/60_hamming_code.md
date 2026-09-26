import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ハミング符号・誤り訂正符号

## ハミング符号とは

> ハミング符号（Hamming Code）とはリチャード・ハミングが1950年に考案した線形符号であり、1ビットの誤りを検出・訂正できる最も効率的な完全符号（Perfect Code）の一つである。

**ハミング距離** d(x, y) は2つの等長符号語が異なる位置の数です。d_min ≥ 3 の符号は1ビット訂正が可能で、ハミング符号 Ham(r) は 2^r - 1 ビットの符号語で k = 2^r - r - 1 ビットの情報を運びます（r: パリティビット数）。例えば Ham(3) は 7 ビット符号語で 4 ビット情報を運び、符号化率 R = 4/7 ≈ 0.571 です。

符号化は**パリティ検査行列** H（r×n 行列）を用い、受信語 y に誤りがないとき Hy = 0（シンドローム = 0）となります。1ビット誤りがあるとき Hy = シンドロームが誤り位置を示す列に一致し、誤りビットを特定・訂正できます。

**線形符号**の一般論では、生成行列 G（k×n）と検査行列 H（(n-k)×n）が GH^T = 0 を満たします。ハミング符号は**完全符号**（全符号空間を Hamming ball で被覆する）の例です。**SECDED**（Single Error Correction, Double Error Detection）ハミング符号はさらにパリティビットを1つ追加して2ビット誤りの検出も可能にします。

## 代表的な線形符号の比較

| 符号 | パラメータ [n,k,d] | 符号化率 | 能力 |
|------|-------------------|---------|------|
| ハミング(7,4) | [7, 4, 3] | 4/7 ≈ 0.57 | 1ビット訂正 |
| ハミング(15,11) | [15, 11, 3] | 11/15 ≈ 0.73 | 1ビット訂正 |
| 繰り返し(3) | [3, 1, 3] | 1/3 | 1ビット訂正 |
| Reed-Solomon | [n, k, d] | k/n | t = (d-1)/2 記号訂正 |
| LDPC | 設計による | ≈1 | シャノン限界に接近 |

```python
import numpy as np

class Hamming74:
    """
    ハミング符号 (7,4) の符号化・復号・1ビット誤り訂正
    """
    # 生成行列 G (4x7): データビットを符号語に変換
    G = np.array([
        [1, 0, 0, 0, 1, 1, 0],
        [0, 1, 0, 0, 1, 0, 1],
        [0, 0, 1, 0, 0, 1, 1],
        [0, 0, 0, 1, 1, 1, 1],
    ], dtype=int)

    # 検査行列 H (3x7): シンドロームを計算
    H = np.array([
        [1, 1, 0, 1, 1, 0, 0],
        [1, 0, 1, 1, 0, 1, 0],
        [0, 1, 1, 1, 0, 0, 1],
    ], dtype=int)

    def encode(self, data: list) -> list:
        """4ビットデータを7ビット符号語に符号化"""
        d = np.array(data, dtype=int)
        codeword = (d @ self.G) % 2
        return codeword.tolist()

    def syndrome(self, received: list) -> list:
        """受信語のシンドロームを計算"""
        r = np.array(received, dtype=int)
        return (self.H @ r % 2).tolist()

    def decode(self, received: list) -> list:
        """受信語を復号・1ビット誤り訂正して4ビットデータを返す"""
        r = received.copy()
        s = self.syndrome(r)
        if any(s):
            # シンドロームが H の列と一致する位置が誤り位置
            s_np = np.array(s)
            for i, col in enumerate(self.H.T):
                if np.array_equal(s_np, col):
                    r[i] ^= 1  # 誤りビットを反転
                    break
        # 最初の4ビットが情報ビット
        return r[:4]

hamming = Hamming74()

# 符号化
data = [1, 0, 1, 1]
codeword = hamming.encode(data)
print(f"データ:    {data}")
print(f"符号語:    {codeword}")

# 誤りなし
s = hamming.syndrome(codeword)
print(f"シンドローム（誤りなし）: {s}")

# 1ビット誤りを注入（3番目のビット）
received = codeword.copy()
received[2] ^= 1
print(f"\n受信語（誤り）: {received}")
s_err = hamming.syndrome(received)
print(f"シンドローム（誤り）: {s_err}")

# 訂正
corrected = hamming.decode(received)
print(f"訂正後データ: {corrected}")
print(f"正しく訂正: {corrected == data}")

# ハミング距離の計算
def hamming_distance(a: list, b: list) -> int:
    return sum(x != y for x, y in zip(a, b))

codeword2 = hamming.encode([0, 1, 0, 1])
d = hamming_distance(codeword, codeword2)
print(f"\n2つの符号語間のハミング距離: {d}")
```

## 使用場面

- **ECC メモリ**: サーバー・ワークステーションの RAM でビット反転エラーを自動訂正する
- **QR コード**: Reed-Solomon 符号で最大 30% の損傷から情報を復元できる
- **通信システム**: RAID・衛星通信・光ディスク（CD・DVD）の誤り訂正に使われる
- **LDPC・ターボ符号**: ハミング符号の考え方を拡張してシャノン限界に迫る現代符号を設計する

## 参考文献

- Hamming, R. W. "Error Detecting and Error Correcting Codes" (Bell System Technical Journal, 1950)
- Lin, S. & Costello, D. J. "Error Control Coding" (Prentice Hall)

<AffiliateBanner site="theory_navi" />
