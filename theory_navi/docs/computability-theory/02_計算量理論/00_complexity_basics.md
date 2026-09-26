import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 時間計算量と空間計算量（O記法・Ω記法・Θ記法）

## 計算量理論の基礎とは

> 計算量理論とは、問題を解くために必要な計算資源（時間・空間）の量を漸近的に分析する理論であり、O記法・Ω記法・Θ記法によってアルゴリズムの効率を入力サイズの関数として表現する。

アルゴリズムの性能を測る際、具体的な実行時間はハードウェアや実装に依存します。計算量理論ではこの問題を「入力サイズ n が大きくなるにつれて実行ステップ数・使用メモリがどの程度増えるか」という漸近的な増加率として捉えます。

時間計算量（Time Complexity）はアルゴリズムが入力サイズ n の問題を解くのに必要なステップ数の上界または正確な増加率を表します。空間計算量（Space Complexity）は使用するメモリ量の漸近的評価です。両者を合わせて計算資源（Computational Resources）と呼びます。

O記法（Big-O）は最悪ケースの上界を表し、「このアルゴリズムはどんな入力でも高々 f(n) ステップで終わる」という保証を与えます。Ω記法（Big-Omega）は下界を表し、「どんな賢いアルゴリズムでも少なくとも f(n) ステップは必要」という限界を示します。Θ記法（Big-Theta）は上界と下界が一致する場合に用い、アルゴリズムの正確な増加率を表します。

これらの記法は計算量クラス（P・NP・PSPACE など）の定義の基礎となります。

## 漸近記法の定義と比較

| 記法 | 定義 | 意味 | 例 |
|------|------|------|-----|
| O(f(n)) | ∃c>0, n₀: T(n) ≤ c·f(n) (n≥n₀) | 上界（最悪ケース） | T(n)=3n²+2n → O(n²) |
| Ω(f(n)) | ∃c>0, n₀: T(n) ≥ c·f(n) (n≥n₀) | 下界（最良ケース） | 比較ソートは Ω(n log n) |
| Θ(f(n)) | O(f(n)) かつ Ω(f(n)) | 正確な増加率 | マージソートは Θ(n log n) |
| o(f(n)) | lim T(n)/f(n) = 0 | 狭義の上界 | n = o(n²) |
| ω(f(n)) | lim f(n)/T(n) = 0 | 狭義の下界 | n² = ω(n) |

## よく現れる計算量クラスの増加率

| 記法 | 名称 | 例 |
|------|------|-----|
| O(1) | 定数時間 | ハッシュテーブル参照 |
| O(log n) | 対数時間 | 二分探索 |
| O(n) | 線形時間 | 線形探索 |
| O(n log n) | 線形対数時間 | マージソート、ヒープソート |
| O(n²) | 二乗時間 | バブルソート、選択ソート |
| O(2ⁿ) | 指数時間 | 部分集合列挙 |
| O(n!) | 階乗時間 | 全順列列挙 |

```python
import time
import math

def count_steps_linear(n: int) -> int:
    """O(n): 線形探索のステップ数を数える"""
    steps = 0
    for i in range(n):
        steps += 1
    return steps

def count_steps_logn(n: int) -> int:
    """O(log n): 二分探索のステップ数を数える"""
    steps = 0
    lo, hi = 0, n - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        steps += 1
        # 常に右半分に進む（最悪ケースのシミュレーション）
        lo = mid + 1
    return steps

def count_steps_nlogn(n: int) -> int:
    """O(n log n): マージソートのステップ数の近似"""
    if n <= 1:
        return 0
    # 分割・統合のステップを再帰的に数える
    return n + 2 * count_steps_nlogn(n // 2)

def count_steps_n2(n: int) -> int:
    """O(n²): バブルソートのステップ数を数える"""
    steps = 0
    for i in range(n):
        for j in range(n - i - 1):
            steps += 1
    return steps

def demonstrate_complexity():
    print("入力サイズ n に対するステップ数の比較")
    print(f"{'n':>6} | {'O(log n)':>10} | {'O(n)':>10} | {'O(n log n)':>12} | {'O(n²)':>10}")
    print("-" * 60)
    for n in [10, 100, 1000, 10000]:
        log_steps = count_steps_logn(n)
        lin_steps = count_steps_linear(n)
        nlogn_steps = count_steps_nlogn(n)
        n2_steps = count_steps_n2(n)
        print(f"{n:>6} | {log_steps:>10,} | {lin_steps:>10,} | {nlogn_steps:>12,} | {n2_steps:>10,}")

demonstrate_complexity()

# 漸近記法の形式的検証
print("\n--- 漸近記法の形式的検証 ---")

def is_big_o(T_values: list[int], f_values: list[int], threshold: float = 10.0) -> tuple[bool, float]:
    """T(n) = O(f(n)) かどうかを確認（有限サンプルで近似）"""
    ratios = []
    for t, f in zip(T_values, f_values):
        if f > 0:
            ratios.append(t / f)
    max_ratio = max(ratios) if ratios else float('inf')
    return max_ratio <= threshold, max_ratio

# T(n) = 3n² + 2n が O(n²) であることを確認
ns = list(range(1, 1001))
T_vals = [3 * n**2 + 2 * n for n in ns]
f_n2  = [n**2 for n in ns]
f_n3  = [n**3 for n in ns]

is_on2, c_n2 = is_big_o(T_vals, f_n2)
is_on3, c_n3 = is_big_o(T_vals, f_n3)

print(f"T(n) = 3n² + 2n は O(n²) か: {is_on2}  (T(n)/n² の最大値 ≈ {c_n2:.2f})")
print(f"T(n) = 3n² + 2n は O(n³) か: {is_on3}  (T(n)/n³ の最大値 ≈ {c_n3:.4f})")

# Θ記法の確認: Ω も成立するか（下界）
min_ratio_n2 = min(T_vals[i] / f_n2[i] for i in range(len(ns)))
print(f"T(n)/n² の最小値 ≈ {min_ratio_n2:.2f}  → Ω(n²) も成立: {min_ratio_n2 > 0}")
print("∴ T(n) = Θ(n²)")
```

## 使用場面

- アルゴリズムを選択する際に、入力規模に応じた実行時間の見積もりを行う場面
- 問題の下界を証明して「これ以上効率的なアルゴリズムは存在しない」ことを示す場面
- 空間計算量と時間計算量のトレードオフ（メモ化など）を設計する場面

## 参考文献

- Sipser, M. "Introduction to the Theory of Computation" (Cengage Learning)
- Cormen, T. H. et al. "Introduction to Algorithms" (MIT Press)
- Knuth, D. E. "The Art of Computer Programming, Volume 1"

<AffiliateBanner site="theory_navi" />
