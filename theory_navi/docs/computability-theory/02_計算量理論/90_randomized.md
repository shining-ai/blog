import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ランダム化計算（BPP・RP）

## ランダム化計算とは

> ランダム化計算とは、アルゴリズムの実行中に乱数を使用することで決定性アルゴリズムよりも効率的または単純な解法を実現するアプローチであり、BPP（両方向有界誤り多項式時間）と RP（片方向誤り多項式時間）が主要な計算量クラスである。

多くの実用的なアルゴリズムは乱数を使います。クイックソートのランダムピボット選択、ハッシュ関数の設計、モンテカルロ法、Miller-Rabin 素数判定などがその例です。これらは「確率的に正しく動作する」という意味でランダム化アルゴリズムと呼ばれます。

RP（Randomized Polynomial time）は片方向誤りが許容されるクラスです。x ∈ L なら確率 1/2 以上で受理、x ∉ L なら確率 1 で拒否（偽陽性なし）。co-RP は逆に x ∈ L なら確率 1 で受理、x ∉ L なら確率 1/2 以下で受理です。

BPP（Bounded-error Probabilistic Polynomial time）は両方向誤りが許容されるクラスです。x ∈ L なら確率 2/3 以上で受理、x ∉ L なら確率 1/3 以下で受理。繰り返し実行（増幅）によって誤り確率を指数的に下げることができます。

ZPP（Zero-error Probabilistic Polynomial time）は誤りなしで多項式期待時間で解くクラスで、ZPP = RP ∩ co-RP が成立します。現代の計算量理論では P = BPP と予想されており（Nisan-Wigderson の疑似乱数理論等による証拠）、乱数の本質的な力は多項式時間計算を超えないと考えられています。

## ランダム化計算量クラスの関係

| クラス | 誤り方向 | 誤り確率 | 含意 |
|--------|---------|---------|------|
| RP | 片方向（偽陰性） | ≤ 1/2 | P ⊆ RP ⊆ NP |
| co-RP | 片方向（偽陽性） | ≤ 1/2 | P ⊆ co-RP ⊆ co-NP |
| ZPP | なし（期待時間） | 0 | ZPP = RP ∩ co-RP |
| BPP | 両方向 | ≤ 1/3 | P ⊆ BPP ⊆ PSPACE |

```python
import random
import math
from typing import Callable

# ===========================
# 1. Miller-Rabin 素数判定（RP クラスの例）
# ===========================

def miller_rabin(n: int, rounds: int = 20) -> bool:
    """
    Miller-Rabin 素数判定（RP クラス）
    n が素数なら必ず True、合成数なら確率 4^(-rounds) で誤って True
    """
    if n < 2:
        return False
    if n in (2, 3):
        return True
    if n % 2 == 0:
        return False

    # n-1 = 2^r * d と分解
    r, d = 0, n - 1
    while d % 2 == 0:
        r += 1
        d //= 2

    for _ in range(rounds):
        a = random.randrange(2, n - 1)
        x = pow(a, d, n)  # x = a^d mod n

        if x == 1 or x == n - 1:
            continue

        for _ in range(r - 1):
            x = pow(x, 2, n)
            if x == n - 1:
                break
        else:
            return False  # 確実に合成数

    return True  # おそらく素数


# ===========================
# 2. モンテカルロ法で π を推定（BPP の精神）
# ===========================

def estimate_pi(n_samples: int, seed: int = 42) -> float:
    """
    モンテカルロ法で π を推定
    単位円内に落ちる点の割合 ≈ π/4
    """
    random.seed(seed)
    inside = sum(
        1 for _ in range(n_samples)
        if random.random()**2 + random.random()**2 <= 1.0
    )
    return 4 * inside / n_samples


# ===========================
# 3. ランダム化クイックソート（期待 O(n log n)）
# ===========================

def randomized_quicksort(arr: list) -> list:
    """ランダムピボット選択による期待 O(n log n) ソート"""
    if len(arr) <= 1:
        return arr
    pivot = random.choice(arr)
    less    = [x for x in arr if x < pivot]
    equal   = [x for x in arr if x == pivot]
    greater = [x for x in arr if x > pivot]
    return randomized_quicksort(less) + equal + randomized_quicksort(greater)


# ===========================
# 4. 誤り確率の増幅（amplification）
# ===========================

def amplified_miller_rabin(n: int, target_error: float = 1e-30) -> bool:
    """
    誤り確率を指数的に下げる（1/4 per round → k rounds で 4^(-k)）
    必要ラウンド数: k ≥ log_{1/4}(target_error) = log(target_error)/log(0.25)
    """
    k = math.ceil(math.log(target_error) / math.log(0.25))
    return miller_rabin(n, rounds=k)


print("=== ランダム化計算デモ ===\n")

print("[Miller-Rabin 素数判定（RP クラス）]")
test_numbers = [2, 17, 97, 100, 561, 1009, 1024, 999983]
print(f"  {'n':<10} {'Miller-Rabin':>15} {'実際（isPrime）':>15}")
print("  " + "-" * 40)
for n in test_numbers:
    mr_result = miller_rabin(n, rounds=20)
    # 決定的な素数判定（小さい数のみ）
    def is_prime_exact(n):
        if n < 2: return False
        return all(n % i != 0 for i in range(2, int(n**0.5) + 1))
    actual = is_prime_exact(n)
    match = "一致" if mr_result == actual else "不一致(!)"
    print(f"  {n:<10} {str(mr_result):>15} {str(actual):>15}  {match}")

print(f"\n[モンテカルロ法による π の推定（BPP の精神）]")
for n_samples in [100, 1000, 10000, 100000]:
    pi_est = estimate_pi(n_samples)
    error = abs(pi_est - math.pi)
    print(f"  n={n_samples:>7}: π ≈ {pi_est:.5f}  (誤差: {error:.5f})")

print(f"\n[ランダム化クイックソート]")
arr = [64, 25, 12, 22, 11, 90, 3, 45]
sorted_arr = randomized_quicksort(arr.copy())
print(f"  入力: {arr}")
print(f"  出力: {sorted_arr}")

print(f"\n[誤り確率の増幅: 20 ラウンドの場合]")
print(f"  各ラウンドの誤り確率: ≤ 1/4")
print(f"  20 ラウンド後の誤り確率: ≤ (1/4)^20 = {0.25**20:.2e}")
print(f"\n[P = BPP 予想の根拠]")
evidence = [
    "素数判定: Miller-Rabin (RP) → AKS (P, 2002年) と決定的アルゴリズムに置き換わった",
    "Nisan-Wigderson (1994): 一方向関数が存在しない世界では BPP = P",
    "Impagliazzo-Wigderson (1997): EXP ≠ BPP なら BPP = P",
    "多くの RP・BPP アルゴリズムが後に P に置き換えられている",
]
for item in evidence:
    print(f"  • {item}")
```

## 使用場面

- 大きな素数が必要な暗号鍵生成において Miller-Rabin などのランダム化素数判定を使う場面
- ランダムサンプリングやモンテカルロシミュレーションで複雑な積分や確率的評価を行う場面
- アルゴリズムのランダム化によって最悪ケースを回避（クイックソート・ハッシュテーブル）する設計をする場面

## 参考文献

- Motwani, R. and Raghavan, P. "Randomized Algorithms" (Cambridge University Press)
- Sipser, M. "Introduction to the Theory of Computation" (Cengage Learning)
- Arora, S. and Barak, B. "Computational Complexity: A Modern Approach" (Cambridge)

<AffiliateBanner site="theory_navi" />
