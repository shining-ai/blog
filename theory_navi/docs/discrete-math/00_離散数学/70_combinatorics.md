import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 組み合わせ論（順列・組み合わせ・包除原理）

## 組み合わせ論とは

> 組み合わせ論（Combinatorics）とは有限集合の配置・数え方・構造を研究する数学の分野であり、確率論・アルゴリズム解析・暗号理論の基盤として計算機科学に広く応用される。

**順列**（Permutation）は n 個のものから r 個を取り出して一列に並べる方法の数で P(n,r) = n!/(n-r)! と表されます。すべてを並べる全順列は n! 通りです。**組み合わせ**（Combination）は n 個から r 個を選ぶ方法の数 C(n,r) = n!/(r!(n-r)!) で、二項係数とも呼ばれます。パスカルの三角形 C(n,r) = C(n-1,r-1) + C(n-1,r) は動的計画法での計算に使われます。

**二項定理** (x+y)^n = Σ C(n,k) x^k y^(n-k) は組み合わせの母関数的側面を示します。重複順列（n 種類から重複を許して r 個選ぶ: n^r 通り）、重複組み合わせ（H(n,r) = C(n+r-1, r) 通り）も重要な計数対象です。

**包除原理**（Inclusion-Exclusion Principle）は、和集合の要素数を各集合・交差の要素数から加減することで求める強力な技法です。|A ∪ B| = |A| + |B| - |A ∩ B| の一般化で、「条件を満たさない」要素数を数える補集合法と組み合わせて「欠陥順列（撹乱順列）」の数などを導きます。

## 主要な計数公式

| 種類 | 公式 | 例 |
|------|------|----|
| 順列 P(n,r) | n!/(n-r)! | 5人から3人を並べる: 60通り |
| 組み合わせ C(n,r) | n!/(r!(n-r)!) | 5人から3人を選ぶ: 10通り |
| 重複順列 | n^r | 2択問題 10問: 2^10 = 1024通り |
| 重複組み合わせ H(n,r) | C(n+r-1,r) | 3種から4個選ぶ: C(6,4)=15通り |
| 円順列 | (n-1)! | 5人が円形に並ぶ: 24通り |
| 包除原理 | |A∪B| = |A|+|B|-|A∩B| | — |

```python
from math import factorial, comb
from itertools import permutations, combinations

# 1. 基本的な計数
n, r = 5, 3
perm = factorial(n) // factorial(n - r)
comb_ = comb(n, r)
print(f"P({n},{r}) = {perm}")   # 60
print(f"C({n},{r}) = {comb_}")  # 10

# 2. パスカルの三角形（動的計画法）
def pascal_triangle(rows: int) -> list:
    dp = [[1] * (i + 1) for i in range(rows)]
    for i in range(2, rows):
        for j in range(1, i):
            dp[i][j] = dp[i-1][j-1] + dp[i-1][j]
    return dp

tri = pascal_triangle(6)
for row in tri:
    print(row)

# 3. 包除原理: 1〜100 で 2 または 3 または 5 の倍数の個数
def count_multiples(n: int, *factors) -> int:
    """包除原理で n 以下の因数倍数の数を数える"""
    from itertools import combinations as cb
    result = 0
    factors = list(factors)
    for size in range(1, len(factors) + 1):
        for combo in cb(factors, size):
            lcm = combo[0]
            for x in combo[1:]:
                from math import gcd
                lcm = lcm * x // gcd(lcm, x)
            sign = (-1) ** (size + 1)
            result += sign * (n // lcm)
    return result

print("2,3,5 の倍数:", count_multiples(100, 2, 3, 5))  # 74

# 4. 撹乱順列（誰も正しい席に座らない並び方）の数
def derangement(n: int) -> int:
    """D(n) = n! * Σ_{k=0}^{n} (-1)^k / k!"""
    if n == 0: return 1
    if n == 1: return 0
    d = [0] * (n + 1)
    d[0], d[1] = 1, 0
    for i in range(2, n + 1):
        d[i] = (i - 1) * (d[i-1] + d[i-2])
    return d[n]

print("D(4) =", derangement(4))  # 9
```

## 使用場面

- **確率計算**: 標本空間の計数に順列・組み合わせを使い、確率を求める
- **アルゴリズム解析**: 二分探索木・ハッシュテーブルの期待計算量の導出に使う
- **暗号理論**: 鍵空間の大きさを組み合わせ論で評価し、総当たり攻撃への耐性を示す
- **最適化**: 包除原理は動的計画法（巡回セールスマン問題の Held-Karp など）に組み込まれる

## 参考文献

- Stanley, R. P. "Enumerative Combinatorics" (Cambridge)
- 西村進「はじめての離散数学」(共立出版)

<AffiliateBanner site="theory_navi" />
