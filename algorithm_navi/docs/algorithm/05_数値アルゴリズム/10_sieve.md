import AffiliateBanner from '@site/src/components/AffiliateBanner';

# エラトステネスの篩

## エラトステネスの篩とは

エラトステネスの篩（Sieve of Eratosthenes）とは、

> 2 以上 n 以下の素数を、小さい素数の倍数を順に消去していくことで O(n log log n) で列挙するアルゴリズム

です。
<br/>

古代ギリシャの数学者エラトステネスが考案した古典的アルゴリズムですが、現在でも競技プログラミングや暗号の前処理として広く使われています。

## 動作の概要

```
n=30 の場合:

初期:  2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30

2の倍数を消去:
      2 3 _ 5 _ 7 _ 9 __ 11 __ 13 __ 15 __ 17 __ 19 __ 21 __ 23 __ 25 __ 27 __ 29 __

3の倍数を消去:
      2 3 _ 5 _ 7 _ _ __ 11 __ 13 __ __ __ 17 __ 19 __ __ __ 23 __ 25 __ __ __ 29 __

5の倍数を消去:
      2 3 _ 5 _ 7 _ _ __ 11 __ 13 __ __ __ 17 __ 19 __ __ __ 23 __ __ __ __ __ 29 __

√30 ≈ 5.5 まで処理 → 残ったのが素数
素数: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29
```

## 計算量

| | 計算量 |
| --- | --- |
| 時間 | O(n log log n) |
| 空間 | O(n) |

## 実装

```python title="基本的なエラトステネスの篩"
def sieve(n: int) -> list[int]:
    """2 以上 n 以下の素数を列挙"""
    is_prime = [True] * (n + 1)
    is_prime[0] = is_prime[1] = False

    i = 2
    while i * i <= n:
        if is_prime[i]:
            for j in range(i * i, n + 1, i):  # i² から始めて i 刻み
                is_prime[j] = False
        i += 1

    return [i for i in range(2, n + 1) if is_prime[i]]
```

```python title="使用例"
primes = sieve(50)
print(primes)
# [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]
print(len(sieve(10**6)))  # 78498（100万以下の素数の個数）
```

### 線形篩（各合成数を最小素因数で1回だけ消す）

```python title="線形篩 O(n)"
def linear_sieve(n: int) -> tuple[list[int], list[int]]:
    """
    O(n) の線形篩
    Returns: (素数リスト, 最小素因数テーブル spf)
    """
    spf    = list(range(n + 1))  # smallest prime factor
    primes = []

    for i in range(2, n + 1):
        if spf[i] == i:          # i が素数
            primes.append(i)
        for p in primes:
            if p > spf[i] or i * p > n:
                break
            spf[i * p] = p

    return primes, spf
```

### 最小素因数テーブルを使った高速素因数分解

```python title="高速素因数分解"
def factorize(n: int, spf: list[int]) -> dict[int, int]:
    """最小素因数テーブルを使って O(log n) で素因数分解"""
    factors = {}
    while n > 1:
        p = spf[n]
        while n % p == 0:
            factors[p] = factors.get(p, 0) + 1
            n //= p
    return factors

_, spf = linear_sieve(100)
print(factorize(60, spf))   # {2: 2, 3: 1, 5: 1}
print(factorize(96, spf))   # {2: 5, 3: 1}
```

### 区間篩（大きな区間の素数列挙）

```python title="区間篩（[lo, hi) の素数）"
def segmented_sieve(lo: int, hi: int) -> list[int]:
    """[lo, hi) の範囲の素数を列挙。√hi 程度の通常の篩を使う"""
    import math
    limit  = math.isqrt(hi) + 1
    base   = sieve(limit)
    flags  = [True] * (hi - lo)
    if lo < 2:
        for i in range(max(0, 2 - lo)):
            flags[i] = False
    for p in base:
        start = max(p * p, ((lo + p - 1) // p) * p)
        for j in range(start, hi, p):
            if j != p:
                flags[j - lo] = False
    return [lo + i for i, f in enumerate(flags) if f]

print(segmented_sieve(10**12, 10**12 + 100))
```

## 使用場面

- **素数テーブルの事前生成**: 競技プログラミングで頻出
- **最小素因数テーブル**: 高速素因数分解（O(log n)）
- **暗号の前処理**: RSA鍵生成のための素数候補の絞り込み
- **数論関数の計算**: オイラーの φ 関数、メビウス関数の一括計算

## 参考文献

<AffiliateBanner site="antbook" />
