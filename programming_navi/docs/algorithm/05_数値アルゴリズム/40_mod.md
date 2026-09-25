import AffiliateBanner from '@site/src/components/AffiliateBanner';

# mod演算

## mod演算とは

mod演算（モジュラ演算）とは、

> 整数の演算を「ある法（modulus）で割った余り」の世界で行う演算。大きな数値を一定の範囲に収めながら計算の正確さを保つ

です。
<br/>

競技プログラミングでは答えを `10⁹+7` などで割った余りで求める問題が頻出です。また暗号（RSA, Diffie-Hellman）の基礎でもあります。

## mod演算の基本性質

```
(a + b) mod m = ((a mod m) + (b mod m)) mod m
(a - b) mod m = ((a mod m) - (b mod m) + m) mod m
(a × b) mod m = ((a mod m) × (b mod m)) mod m
```

**割り算は逆元が必要**（単純に mod を取ってはいけない）

```
(a / b) mod m ≠ (a mod m) / (b mod m)   ← 誤り
(a / b) mod m = (a × b⁻¹) mod m          ← 正しい
```

## モジュラ逆元

`b⁻¹ mod m` は `b × b⁻¹ ≡ 1 (mod m)` を満たす整数です。

**フェルマーの小定理**: m が素数のとき `b^(m-1) ≡ 1 (mod m)` より
`b⁻¹ ≡ b^(m-2) (mod m)`

```
3⁻¹ mod 7 = 3^(7-2) mod 7 = 3^5 mod 7 = 243 mod 7 = 5
検証: 3 × 5 = 15 ≡ 1 (mod 7) ✓
```

## 計算量

| 操作 | 計算量 |
| --- | --- |
| mod加減算 | O(1) |
| mod乗算 | O(1) |
| mod逆元（フェルマー） | O(log m) |
| mod逆元（拡張GCD） | O(log m) |
| 逆元テーブル構築 | O(n) |

## 実装

```python title="基本的なmod演算"
MOD = 10**9 + 7

def add(a: int, b: int) -> int:
    return (a + b) % MOD

def sub(a: int, b: int) -> int:
    return (a - b + MOD) % MOD

def mul(a: int, b: int) -> int:
    return a * b % MOD

def div(a: int, b: int) -> int:
    """a / b mod MOD（MOD は素数であること）"""
    return mul(a, pow(b, MOD - 2, MOD))  # フェルマーの小定理
```

```python title="組み合わせ数 C(n, r) mod p"
class Combination:
    """二項係数 C(n, r) mod p を前計算で O(1) クエリ"""
    def __init__(self, max_n: int, mod: int = 10**9 + 7):
        self.mod  = mod
        self.fact = [1] * (max_n + 1)
        self.inv_fact = [1] * (max_n + 1)
        for i in range(1, max_n + 1):
            self.fact[i] = self.fact[i - 1] * i % mod
        self.inv_fact[max_n] = pow(self.fact[max_n], mod - 2, mod)
        for i in range(max_n - 1, -1, -1):
            self.inv_fact[i] = self.inv_fact[i + 1] * (i + 1) % mod

    def comb(self, n: int, r: int) -> int:
        if r < 0 or r > n:
            return 0
        return self.fact[n] * self.inv_fact[r] % self.mod * self.inv_fact[n - r] % self.mod

    def perm(self, n: int, r: int) -> int:
        """順列 P(n, r)"""
        if r < 0 or r > n:
            return 0
        return self.fact[n] * self.inv_fact[n - r] % self.mod
```

```python title="使用例"
cmb = Combination(10**6)
print(cmb.comb(10, 3))    # 120
print(cmb.comb(100, 50))  # 100891344545564193334812497256 % (10^9+7)
print(cmb.perm(5, 3))     # 60
```

```python title="O(n) の逆元テーブル"
def inv_table(n: int, mod: int) -> list[int]:
    """1 から n までの mod 逆元テーブルを O(n) で構築"""
    inv = [0, 1] + [0] * (n - 1)
    for i in range(2, n + 1):
        inv[i] = -(mod // i) * inv[mod % i] % mod
    return inv

inv = inv_table(10, 10**9 + 7)
print(inv[3])   # 333333336  (3 × 333333336 ≡ 1 mod 10^9+7)
```

### 中国剰余定理（CRT）

```python title="中国剰余定理"
def crt(r1: int, m1: int, r2: int, m2: int) -> tuple[int, int]:
    """
    x ≡ r1 (mod m1)
    x ≡ r2 (mod m2)
    を満たす x ≡ r (mod lcm(m1,m2)) を返す
    """
    from math import gcd
    g = gcd(m1, m2)
    if (r2 - r1) % g != 0:
        return -1, -1  # 解なし
    lcm = m1 // g * m2
    _, x, _ = (lambda a, b: (lambda g, x, y: (g, x, y))(*_ext_gcd(a, b)))(m1, m2)

    def _ext_gcd(a, b):
        if b == 0: return a, 1, 0
        g, x1, y1 = _ext_gcd(b, a % b)
        return g, y1, x1 - (a // b) * y1

    g2, x2, _ = _ext_gcd(m1 // g, m2 // g)
    r = (r1 + m1 * ((r2 - r1) // g % (m2 // g) * x2 % (m2 // g))) % lcm
    return r, lcm
```

## 使用場面

- **競技プログラミング**: 答えを `10⁹+7` で割った余りを求める問題全般
- **組み合わせ数の計算**: C(n,r) mod p（二項係数の大量クエリ）
- **RSA暗号**: `e×d ≡ 1 (mod φ(n))` での鍵生成
- **ハッシュ**: ローリングハッシュのmod計算

## 参考文献

<AffiliateBanner site="antbook" />
