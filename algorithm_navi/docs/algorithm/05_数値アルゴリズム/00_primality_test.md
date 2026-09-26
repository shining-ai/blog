import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 素数判定

## 素数判定とは

素数判定とは、

> ある整数 n が素数（1 と自分自身以外の約数を持たない正の整数）かどうかを調べるアルゴリズム

です。
<br/>

単純な試し割りから確率的判定（Miller-Rabin）まで、用途に応じた手法があります。

## 試し割り法

**2 から √n まで**の整数で割り切れなければ素数です。

```
n=17 の判定:
  √17 ≈ 4.12 → 2, 3, 4 で試す
  17 % 2 = 1 (割り切れない)
  17 % 3 = 2 (割り切れない)
  17 % 4 = 1 (割り切れない)
  → 素数！

n=15 の判定:
  15 % 3 = 0 → 素数でない
```

## 計算量

| 手法 | 計算量 | 特徴 |
| --- | --- | --- |
| 試し割り（単純） | O(n) | 実装が最もシンプル |
| 試し割り（√n まで） | O(√n) | 実用的な基本手法 |
| Miller-Rabin（確率的） | O(k log² n) | 非常に大きな数に有効 |
| AKS（決定的） | O(log⁶ n) | 理論的に多項式時間 |

## 実装

```python title="試し割り法 O(√n)"
def is_prime(n: int) -> bool:
    if n < 2:
        return False
    if n == 2:
        return True
    if n % 2 == 0:
        return False
    i = 3
    while i * i <= n:
        if n % i == 0:
            return False
        i += 2  # 奇数のみ試す
    return True
```

```python title="使用例"
primes = [n for n in range(2, 50) if is_prime(n)]
print(primes)
# [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]
```

### Miller-Rabin 素数判定（確率的）

非常に大きな数（暗号用途など）に対して使われる確率的素数判定です。
`a` を何度かランダムに選んで試し、全て通過すれば「ほぼ確実に素数」と判定します。

```python title="Miller-Rabin素数判定"
def miller_rabin(n: int, k: int = 20) -> bool:
    """Miller-Rabin 素数判定（確率的）"""
    if n < 2:   return False
    if n == 2:  return True
    if n % 2 == 0: return False

    # n-1 = 2^r * d と表す
    r, d = 0, n - 1
    while d % 2 == 0:
        r += 1
        d //= 2

    import random
    for _ in range(k):
        a = random.randrange(2, n - 1)
        x = pow(a, d, n)       # a^d mod n（高速べき乗）
        if x == 1 or x == n - 1:
            continue
        for _ in range(r - 1):
            x = x * x % n
            if x == n - 1:
                break
        else:
            return False
    return True
```

```python title="決定的 Miller-Rabin（n < 3.3×10²⁴ の範囲で正確）"
def is_prime_deterministic(n: int) -> bool:
    """特定の底を使った決定的 Miller-Rabin"""
    if n < 2: return False
    # n < 3,317,044,064,679,887,385,961,981 の範囲で正確
    witnesses = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37]
    if n in witnesses: return True
    if any(n % w == 0 for w in witnesses): return False

    r, d = 0, n - 1
    while d % 2 == 0:
        r += 1; d //= 2

    for a in witnesses:
        x = pow(a, d, n)
        if x == 1 or x == n - 1:
            continue
        for _ in range(r - 1):
            x = x * x % n
            if x == n - 1:
                break
        else:
            return False
    return True

print(is_prime_deterministic(10**18 + 9))  # True（大きな素数の確認）
```

## 使用場面

- **RSA暗号**: 大きな素数の生成と検証（Miller-Rabin）
- **ハッシュテーブル**: バケット数を素数にする際の確認
- **競技プログラミング**: 素数テーブルの生成・大きな数の素数判定

## 参考文献

<AffiliateBanner site="antbook" />
