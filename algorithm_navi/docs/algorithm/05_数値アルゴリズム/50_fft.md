import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 高速フーリエ変換 (FFT)

## FFTとは

FFT（Fast Fourier Transform）とは、

> 離散フーリエ変換（DFT）を分割統治法で O(n²) から O(n log n) に高速化するアルゴリズム

です。
<br/>

信号処理・多項式乗算・データ圧縮など幅広く使われます。競技プログラミングでは**多項式の積**を O(n log n) で求めるために使われます。

## DFT から FFT へ

離散フーリエ変換（DFT）は次の変換です：

```
Xₖ = Σⱼ₌₀ⁿ⁻¹ xⱼ × ωⁿʲᵏ    （ωₙ = e^(2πi/n)：原始 n 乗根）
```

DFT を素直に計算すると O(n²) ですが、FFT は**偶数インデックスと奇数インデックス**に分割することで O(n log n) を実現します。

```
FFT(x) = [FFT(x_even), FFT(x_odd)] を組み合わせる（Cooley-Tukey）

n=8 の場合:
  DFT: 64 回の乗算
  FFT: 8 × 3 = 24 回の乗算
```

## 多項式の乗算への応用

```
A(x) = a₀ + a₁x + a₂x²  （係数 [2, 3, 1]）
B(x) = b₀ + b₁x + b₂x²  （係数 [1, 2, 3]）

素朴な計算: O(n²) = O(9) 回の掛け算

FFT を使った計算:
  1. A, B を FFT で変換
  2. 各点で掛け算（点値表現の積）
  3. 逆 FFT で係数表現に戻す
  → O(n log n)
```

## 計算量

| | 計算量 |
| --- | --- |
| DFT（素朴） | O(n²) |
| FFT | O(n log n) |
| 多項式乗算（FFT使用） | O(n log n) |
| NTT（整数mod） | O(n log n) |

## 実装

```python title="Cooley-Tukey FFT"
import cmath
import math

def fft(a: list[complex], invert: bool = False) -> list[complex]:
    """
    Cooley-Tukey FFT（in-place）
    a: 入力（長さは2の冪乗に合わせてゼロ埋めすること）
    invert: True で逆FFT
    """
    n = len(a)
    if n == 1:
        return a

    # ビット逆順に並び替え
    j = 0
    for i in range(1, n):
        bit = n >> 1
        while j & bit:
            j ^= bit
            bit >>= 1
        j ^= bit
        if i < j:
            a[i], a[j] = a[j], a[i]

    # バタフライ演算
    length = 2
    while length <= n:
        angle  = 2 * math.pi / length * (-1 if invert else 1)
        wlen   = complex(math.cos(angle), math.sin(angle))
        for i in range(0, n, length):
            w = 1 + 0j
            for k in range(length // 2):
                u = a[i + k]
                v = a[i + k + length // 2] * w
                a[i + k]                = u + v
                a[i + k + length // 2] = u - v
                w *= wlen
        length <<= 1

    if invert:
        for i in range(n):
            a[i] /= n

    return a
```

```python title="多項式の乗算"
def poly_mul(a: list[int], b: list[int]) -> list[int]:
    """
    多項式 A, B の積の係数列を返す
    a = [a₀, a₁, ...], b = [b₀, b₁, ...]
    """
    result_len = len(a) + len(b) - 1
    # 2の冪乗に切り上げ
    n = 1
    while n < result_len:
        n <<= 1

    fa = [complex(x, 0) for x in a] + [0+0j] * (n - len(a))
    fb = [complex(x, 0) for x in b] + [0+0j] * (n - len(b))

    fft(fa)
    fft(fb)

    fc = [x * y for x, y in zip(fa, fb)]
    fft(fc, invert=True)

    return [round(x.real) for x in fc[:result_len]]
```

```python title="使用例"
# A(x) = 2 + 3x + x²
# B(x) = 1 + 2x + 3x²
a = [2, 3, 1]
b = [1, 2, 3]
c = poly_mul(a, b)
print(c)  # [2, 7, 13, 11, 3]
# A(x)×B(x) = 2 + 7x + 13x² + 11x³ + 3x⁴

# 大きな整数の乗算（桁ごとの多項式として扱う）
# 123 × 456 = poly_mul([3,2,1], [6,5,4]) を繰り上がり処理
```

### NTT（Number Theoretic Transform）

整数のまま mod p で計算したい場合は NTT を使います。

```python title="NTT（998244353 = 119×2²³+1）"
MOD = 998244353
G   = 3  # 原始根

def ntt(a: list[int], invert: bool = False) -> None:
    n = len(a)
    j = 0
    for i in range(1, n):
        bit = n >> 1
        while j & bit:
            j ^= bit; bit >>= 1
        j ^= bit
        if i < j:
            a[i], a[j] = a[j], a[i]

    length = 2
    while length <= n:
        w = pow(G, (MOD - 1) // length, MOD)
        if invert:
            w = pow(w, MOD - 2, MOD)
        for i in range(0, n, length):
            wn = 1
            for k in range(length // 2):
                u = a[i + k]
                v = a[i + k + length // 2] * wn % MOD
                a[i + k]                = (u + v) % MOD
                a[i + k + length // 2] = (u - v + MOD) % MOD
                wn = wn * w % MOD
        length <<= 1

    if invert:
        inv_n = pow(n, MOD - 2, MOD)
        for i in range(n):
            a[i] = a[i] * inv_n % MOD

def ntt_poly_mul(a: list[int], b: list[int]) -> list[int]:
    """NTT による多項式乗算（整数・mod 998244353）"""
    result_len = len(a) + len(b) - 1
    n = 1
    while n < result_len:
        n <<= 1
    fa = a + [0] * (n - len(a))
    fb = b + [0] * (n - len(b))
    ntt(fa); ntt(fb)
    fc = [x * y % MOD for x, y in zip(fa, fb)]
    ntt(fc, invert=True)
    return fc[:result_len]

print(ntt_poly_mul([2, 3, 1], [1, 2, 3]))  # [2, 7, 13, 11, 3]
```

## 使用場面

- **多項式の乗算**: 競技プログラミングでの畳み込み演算
- **大整数の乗算**: GPU対応の高速乗算アルゴリズム
- **信号処理**: 音声・画像の周波数解析
- **データ圧縮**: JPEG, MP3 などの変換基礎
- **畳み込みニューラルネット**: FFT による畳み込み高速化

## 参考文献

<AffiliateBanner site="antbook" />
