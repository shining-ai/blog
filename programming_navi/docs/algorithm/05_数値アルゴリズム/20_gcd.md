import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ユークリッドの互除法

## ユークリッドの互除法とは

ユークリッドの互除法とは、

> gcd(a, b) = gcd(b, a mod b) という性質を繰り返し適用して最大公約数（GCD）を O(log min(a,b)) で求めるアルゴリズム

です。
<br/>

紀元前300年頃に発見された最古のアルゴリズムの一つで、現代でも暗号・数論・競技プログラミングの基礎として使われます。

## 動作の概要

```
gcd(48, 18) を求める:

gcd(48, 18)
  = gcd(18, 48 mod 18) = gcd(18, 12)
  = gcd(12, 18 mod 12) = gcd(12,  6)
  = gcd( 6, 12 mod  6) = gcd( 6,  0)
  = 6

「48 と 18 の最大公約数は 6」
```

## 計算量

| | 計算量 |
| --- | --- |
| GCD（ユークリッド） | O(log min(a, b)) |
| 拡張ユークリッド | O(log min(a, b)) |

## 実装

```python title="ユークリッドの互除法"
def gcd(a: int, b: int) -> int:
    while b:
        a, b = b, a % b
    return a

def lcm(a: int, b: int) -> int:
    """最小公倍数"""
    return a // gcd(a, b) * b   # オーバーフロー防止のため先に割る
```

```python title="使用例"
print(gcd(48, 18))     # 6
print(gcd(100, 75))    # 25
print(lcm(4, 6))       # 12
print(lcm(12, 18))     # 36

# Python 3.9+ では標準ライブラリにあります
from math import gcd as math_gcd, lcm as math_lcm
```

### 拡張ユークリッドの互除法

`ax + by = gcd(a, b)` を満たす整数解 `(x, y)` を求めます。モジュラ逆元の計算に使われます。

```python title="拡張ユークリッドの互除法"
def extended_gcd(a: int, b: int) -> tuple[int, int, int]:
    """
    ax + by = gcd(a, b) の整数解 (g, x, y) を返す
    g = gcd(a, b)
    """
    if b == 0:
        return a, 1, 0
    g, x1, y1 = extended_gcd(b, a % b)
    return g, y1, x1 - (a // b) * y1
```

```python title="使用例"
g, x, y = extended_gcd(48, 18)
print(g, x, y)           # 6 -1 3
print(48 * x + 18 * y)   # 6（検証）

# モジュラ逆元: a の mod m での逆元（a・x ≡ 1 (mod m)）
def mod_inverse(a: int, m: int) -> int:
    """gcd(a, m) = 1 のとき a の mod m での逆元を返す"""
    g, x, _ = extended_gcd(a % m, m)
    if g != 1:
        raise ValueError(f"gcd({a}, {m}) = {g} ≠ 1: 逆元が存在しない")
    return x % m

print(mod_inverse(3, 7))   # 5  （3×5 = 15 ≡ 1 (mod 7)）
print(mod_inverse(7, 11))  # 8  （7×8 = 56 ≡ 1 (mod 11)）
```

### 複数の数の GCD / LCM

```python title="複数の数の GCD と LCM"
from functools import reduce

def gcd_list(nums: list[int]) -> int:
    return reduce(gcd, nums)

def lcm_list(nums: list[int]) -> int:
    return reduce(lcm, nums)

print(gcd_list([12, 18, 24]))    # 6
print(lcm_list([4, 6, 10]))      # 60
```

## 使用場面

- **分数の約分**: 分子・分母の GCD で割る
- **モジュラ逆元**: RSA暗号・競技プログラミングの mod 計算
- **LCM（最小公倍数）**: スケジューリング・周期の計算
- **中国剰余定理（CRT）**: 拡張ユークリッドを使った連立合同式の解法

## 参考文献

<AffiliateBanner site="antbook" />
