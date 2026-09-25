import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 行列演算と線形漸化式

## 行列の高速べき乗

行列演算とは、

> 繰り返し二乗法を行列に適用して **n ステップ後の状態を O(k³ log n) で求める**手法

です。

フィボナッチ数列など、線形漸化式で定義された数列の第 n 項を高速に求めるのに使います。

## 線形漸化式と行列

フィボナッチ数列 `F(n) = F(n-1) + F(n-2)` は行列で表せます。

```
┌ F(n+1) ┐   ┌ 1  1 ┐ⁿ   ┌ F(1) ┐
│ F(n)   │ = │ 1  0 │  × │ F(0) │
└        ┘   └      ┘    └      ┘
```

行列のべき乗を繰り返し二乗法で計算すれば O(log n) に短縮できます（通常の再帰は O(n)）。

## 計算量

| 操作 | 計算量 | 備考 |
| --- | --- | --- |
| 行列積（k×k） | O(k³) | |
| 行列べき乗（n乗） | O(k³ log n) | 繰り返し二乗法 |
| フィボナッチ第n項 | O(log n) | k=2 の場合 |

## 実装

```python title="行列積"
def mat_mul(A: list[list[int]], B: list[list[int]], mod: int = 10**9 + 7) -> list[list[int]]:
    n = len(A)
    C = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            for k in range(n):
                C[i][j] = (C[i][j] + A[i][k] * B[k][j]) % mod
    return C
```

```python title="行列べき乗（繰り返し二乗法）"
def mat_pow(M: list[list[int]], n: int, mod: int = 10**9 + 7) -> list[list[int]]:
    """M の n 乗を返す"""
    size = len(M)
    # 単位行列
    result = [[1 if i == j else 0 for j in range(size)] for i in range(size)]
    while n > 0:
        if n & 1:
            result = mat_mul(result, M, mod)
        M = mat_mul(M, M, mod)
        n >>= 1
    return result
```

```python title="フィボナッチ第n項"
def fib(n: int, mod: int = 10**9 + 7) -> int:
    """フィボナッチ数列の第 n 項（0-indexed: fib(0)=0, fib(1)=1）"""
    if n == 0:
        return 0
    M = [[1, 1], [1, 0]]
    result = mat_pow(M, n - 1, mod)
    return result[0][0]

for i in range(8):
    print(fib(i), end=" ")  # 0 1 1 2 3 5 8 13
```

## 一般的な線形漸化式への適用

`a(n) = c1*a(n-1) + c2*a(n-2) + c3*a(n-3)` の場合:

```python title="3項漸化式の行列表現"
def solve_recurrence(c: list[int], initial: list[int], n: int, mod: int = 10**9 + 7) -> int:
    """
    a(n) = c[0]*a(n-1) + c[1]*a(n-2) + ... の第 n 項
    initial: [a(0), a(1), ..., a(k-1)]
    """
    k = len(c)
    if n < k:
        return initial[n] % mod

    # 遷移行列
    M = [[0] * k for _ in range(k)]
    for j in range(k):
        M[0][j] = c[j] % mod
    for i in range(1, k):
        M[i][i - 1] = 1

    Mn = mat_pow(M, n - k + 1, mod)

    # 初期ベクトル [a(k-1), a(k-2), ..., a(0)]
    vec = [initial[k - 1 - i] % mod for i in range(k)]
    result = 0
    for j in range(k):
        result = (result + Mn[0][j] * vec[j]) % mod
    return result
```

## 使用場面

- **フィボナッチ数列の第 n 項** (mod付き、n が巨大なとき)
- **タイル敷き詰めの数え方**: 漸化式で表せる場合
- **グラフの経路数**: 隣接行列の n 乗が「n ステップの経路数行列」
- **線形漸化式を持つ競プロ問題全般**

## 参考文献

<AffiliateBanner site="tessoku" />
<AffiliateBanner site="antbook" />
