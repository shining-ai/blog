import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 高速べき乗（二進法べき乗）

## 高速べき乗とは

高速べき乗（Binary Exponentiation / Exponentiation by Squaring）とは、

> 指数を 2 進数で表し、繰り返し二乗して掛け算の回数を O(log n) に削減するアルゴリズム

です。
<br/>

aⁿ を素朴に計算すると n 回の掛け算が必要ですが、二進法べき乗なら **O(log n) 回**で済みます。特に `mod m` での計算（競技プログラミング・暗号）で必須のテクニックです。

## 動作の概要

```
3¹³ を計算する（13 = 1101₂）:

13 = 8 + 4 + 1 = 2³ + 2² + 2⁰

3¹  = 3
3²  = 3¹ × 3¹ = 9
3⁴  = 3² × 3² = 81
3⁸  = 3⁴ × 3⁴ = 6561

3¹³ = 3⁸ × 3⁴ × 3¹ = 6561 × 81 × 3 = 1594323

掛け算の回数: 3回（二乗）+ 2回（掛け算）= 5回
素朴な方法: 12回
```

指数のビットを右から処理し、ビットが 1 のときだけ結果に掛けます。

## 計算量

| | 計算量 |
| --- | --- |
| 掛け算の回数 | O(log n) |
| mod 付き計算 | O(log n) |
| 行列べき乗 | O(k³ log n)（k×k 行列） |

## 実装

```python title="高速べき乗（反復版）"
def fast_pow(base: int, exp: int, mod: int | None = None) -> int:
    """base^exp を計算（mod 指定時は base^exp mod m）"""
    result = 1
    base   = base if mod is None else base % mod

    while exp > 0:
        if exp & 1:               # exp の最下位ビットが 1
            result = result * base if mod is None else result * base % mod
        base = base * base if mod is None else base * base % mod
        exp >>= 1                 # 1 ビット右シフト

    return result
```

```python title="使用例"
print(fast_pow(3, 13))           # 1594323
print(fast_pow(2, 10))           # 1024
print(fast_pow(2, 100, 10**9+7)) # 2^100 mod (10^9+7)

# Python 組み込みの pow() は 3 引数で同様の最適化を行っています
print(pow(2, 100, 10**9+7))      # 同じ結果（推奨）
```

```python title="高速べき乗（再帰版）"
def fast_pow_recursive(base: int, exp: int, mod: int | None = None) -> int:
    if exp == 0:
        return 1
    if exp % 2 == 0:
        half = fast_pow_recursive(base, exp // 2, mod)
        result = half * half
    else:
        result = base * fast_pow_recursive(base, exp - 1, mod)
    return result if mod is None else result % mod
```

### 行列べき乗（線形漸化式の高速計算）

```python title="行列べき乗"
def mat_mul(A: list[list[int]], B: list[list[int]], mod: int) -> list[list[int]]:
    n = len(A)
    C = [[0] * n for _ in range(n)]
    for i in range(n):
        for k in range(n):
            if A[i][k] == 0:
                continue
            for j in range(n):
                C[i][j] = (C[i][j] + A[i][k] * B[k][j]) % mod
    return C

def mat_pow(M: list[list[int]], exp: int, mod: int) -> list[list[int]]:
    """行列の高速べき乗"""
    n      = len(M)
    result = [[1 if i == j else 0 for j in range(n)] for i in range(n)]  # 単位行列
    while exp > 0:
        if exp & 1:
            result = mat_mul(result, M, mod)
        M   = mat_mul(M, M, mod)
        exp >>= 1
    return result

# フィボナッチ数列の第 n 項（O(log n)）
def fibonacci(n: int, mod: int = 10**9 + 7) -> int:
    if n <= 1:
        return n
    M = [[1, 1], [1, 0]]
    R = mat_pow(M, n - 1, mod)
    return R[0][0]

print(fibonacci(10))    # 55
print(fibonacci(100))   # 3736710778843...（mod 10^9+7）
```

## 使用場面

- **競技プログラミング**: `a^b mod p` の計算（組み合わせ数、逆元など）
- **RSA暗号**: `m^e mod n`（暗号化）、`c^d mod n`（復号）
- **フィボナッチ数列**: 行列べき乗で第 n 項を O(log n) で計算
- **線形漸化式の高速計算**: Kitamasa法の基礎

## 参考文献

<AffiliateBanner site="antbook" />
