import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 整数論入門（mod・素数・フェルマーの小定理）

## 整数論とは

> 整数論（Number Theory）とは整数の性質を研究する数学の分野であり、特に整除関係・素数・合同（mod）の概念を中心に、暗号理論やアルゴリズムに直結する基礎理論を提供する。

整数 a を正の整数 m で割った余りを r としたとき、a ≡ r (mod m) と書き「a と r は m を法として合同」と言います。合同関係は同値関係であり、加法・乗法について閉じているため、整数の合同類（剰余類）が環（Z/mZ）を形成します。

素数（Prime Number）は1と自身以外の正の因数を持たない2以上の整数です。算術の基本定理（一意分解定理）は「2以上の整数は素因数分解が（順序を無視して）一意に定まる」ことを保証します。エラトステネスの篩は O(n log log n) で n 以下の素数をすべて列挙する古典的アルゴリズムです。

**フェルマーの小定理**：p が素数で gcd(a, p) = 1 ならば a^(p-1) ≡ 1 (mod p) が成立します。これにより a^(-1) ≡ a^(p-2) (mod p) として mod p の逆元を高速に計算でき、RSA 暗号の数学的基盤となっています。拡張ユークリッドの互除法は gcd(a, b) とベズーの等式 ax + by = gcd(a, b) の解を同時に求め、任意の modulus での逆元計算に使えます。

## 主要な定理と公式

| 定理 | 内容 |
|------|------|
| フェルマーの小定理 | a^(p-1) ≡ 1 (mod p)（p 素数, gcd(a,p)=1） |
| オイラーの定理 | a^φ(n) ≡ 1 (mod n)（gcd(a,n)=1） |
| 中国剰余定理 | 互いに素な m1,...,mk に対する連立合同方程式が一意解を持つ |
| Wilson の定理 | (p-1)! ≡ -1 (mod p) ⟺ p は素数 |
| ベズーの等式 | gcd(a,b)=d ならば ax+by=d を満たす整数 x,y が存在 |

```python
import math

# 1. 拡張ユークリッドの互除法
def extended_gcd(a: int, b: int):
    """gcd(a,b) と ax+by=gcd の解 (x,y) を返す"""
    if b == 0:
        return a, 1, 0
    g, x1, y1 = extended_gcd(b, a % b)
    return g, y1, x1 - (a // b) * y1

g, x, y = extended_gcd(35, 15)
print(f"gcd(35,15)={g}, x={x}, y={y}, 検証: 35*{x}+15*{y}={35*x+15*y}")

# 2. mod 逆元（フェルマーの小定理）
def mod_inverse_fermat(a: int, p: int) -> int:
    """p が素数のとき a の mod p 逆元を返す"""
    return pow(a, p - 2, p)  # Python の pow は高速べき乗 O(log p)

p = 17
a = 5
inv = mod_inverse_fermat(a, p)
print(f"{a} の mod {p} 逆元: {inv}, 検証: {a}*{inv} mod {p} = {(a * inv) % p}")

# 3. エラトステネスの篩
def sieve_of_eratosthenes(n: int) -> list:
    """n 以下の素数をすべて返す"""
    is_prime = [True] * (n + 1)
    is_prime[0] = is_prime[1] = False
    for i in range(2, int(n**0.5) + 1):
        if is_prime[i]:
            for j in range(i*i, n+1, i):
                is_prime[j] = False
    return [i for i in range(n+1) if is_prime[i]]

primes = sieve_of_eratosthenes(50)
print("50 以下の素数:", primes)
```

## 使用場面

- **RSA 暗号**: フェルマーの小定理・オイラーの定理・中国剰余定理が暗号の安全性の基盤
- **ハッシュ関数**: 大きな素数を法とするハッシュはローリングハッシュや多項式ハッシュで使われる
- **競技プログラミング**: 組み合わせの数を大きな素数 p で割った余りを求める問題に必須
- **乱数生成**: 線形合同法や Mersenne Twister は整数論の性質を利用する

## 参考文献

- Hardy, G. H. & Wright, E. M. "An Introduction to the Theory of Numbers" (Oxford)
- 小野寛晰「情報科学における論理」(日本評論社)

<AffiliateBanner site="theory_navi" />
