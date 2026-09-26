import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 確率論の基礎

## 確率論とは

> 確率論（Probability Theory）とは不確実な事象を数学的に定式化する理論であり、コルモゴロフの公理系に基づいて確率空間・確率変数・期待値・条件付き確率を厳密に扱う。

コルモゴロフ（1933年）は確率を標本空間 Ω・事象の族 F・確率測度 P の三つ組 (Ω, F, P) で定義しました。確率測度は非負性（P(A) ≥ 0）、規格化（P(Ω) = 1）、加算加法性（互いに排反な事象の和の確率は各確率の和）を満たします。離散確率では有限・可算個の標本点を扱い、連続確率では確率密度関数（PDF）を用います。

**条件付き確率** P(A|B) = P(A ∩ B) / P(B)（P(B) > 0）は既知の情報を条件として確率を更新します。**ベイズの定理** P(A|B) = P(B|A)P(A) / P(B) は事前確率を観測データで更新する事後確率の計算に使われ、機械学習・スパムフィルタ・医療診断の基盤です。

**確率変数** X は標本空間から実数への写像で、その分布を記述します。**期待値** E[X] = Σ x P(X=x)（離散）は確率変数の平均的な値です。**分散** Var(X) = E[(X - E[X])^2] = E[X^2] - (E[X])^2 はばらつきを示します。**大数の法則**は独立試行を繰り返すと標本平均が期待値に収束することを保証し、**中心極限定理**は標本平均が正規分布に近づくことを示します。

## 主要な離散確率分布

| 分布 | PMF P(X=k) | 期待値 | 分散 |
|------|-----------|--------|------|
| ベルヌーイ B(p) | p^k (1-p)^{1-k} | p | p(1-p) |
| 二項 B(n,p) | C(n,k) p^k (1-p)^{n-k} | np | np(1-p) |
| 幾何 Geo(p) | (1-p)^{k-1} p | 1/p | (1-p)/p^2 |
| ポアソン Poi(λ) | e^{-λ} λ^k / k! | λ | λ |
| 一様 U{1,...,n} | 1/n | (n+1)/2 | (n^2-1)/12 |

```python
import random
from collections import Counter

# 1. モンテカルロ法による円周率の推定
def estimate_pi(n: int) -> float:
    inside = sum(1 for _ in range(n)
                 if random.random()**2 + random.random()**2 <= 1)
    return 4 * inside / n

random.seed(42)
print(f"π の推定値 (n=100000): {estimate_pi(100_000):.4f}")

# 2. ベイズの定理: 検査の陽性予測値
def bayes_ppv(sensitivity: float, specificity: float, prevalence: float) -> float:
    """
    疾患の有無に関する事後確率（陽性的中率）を計算
    P(疾患|陽性) = P(陽性|疾患) * P(疾患) / P(陽性)
    """
    p_pos_given_disease = sensitivity
    p_pos_given_no_disease = 1 - specificity
    p_positive = p_pos_given_disease * prevalence + p_pos_given_no_disease * (1 - prevalence)
    return p_pos_given_disease * prevalence / p_positive

ppv = bayes_ppv(sensitivity=0.99, specificity=0.95, prevalence=0.01)
print(f"陽性的中率: {ppv:.3f}")  # 感度99%, 特異度95%, 有病率1% → 約16.7%

# 3. 期待値・分散の計算（二項分布）
import math

def binomial_stats(n: int, p: float):
    """二項分布 B(n,p) の期待値と分散"""
    mean = n * p
    variance = n * p * (1 - p)
    return mean, variance

mean, var = binomial_stats(100, 0.3)
print(f"B(100, 0.3): 期待値={mean}, 分散={var}, 標準偏差={var**0.5:.3f}")

# 4. 大数の法則のシミュレーション
results = []
for n in [10, 100, 1000, 10000]:
    rolls = [random.randint(1, 6) for _ in range(n)]
    sample_mean = sum(rolls) / n
    results.append((n, sample_mean))
    print(f"n={n:6d}: 標本平均={sample_mean:.4f} (理論値=3.5)")
```

## 使用場面

- **機械学習**: 確率的勾配降下法・ベイズ最適化・確率的グラフィカルモデルの基礎
- **ランダム化アルゴリズム**: クイックソートの期待計算量・ハッシュ関数の衝突確率の解析
- **誤り訂正**: 通信路の誤り率モデル化と符号化理論（シャノンの定理）の土台
- **金融・リスク管理**: ポートフォリオ最適化・デリバティブ価格付けにおける確率過程

## 参考文献

- Feller, W. "An Introduction to Probability Theory and Its Applications" (Wiley)
- 西尾真喜子「確率論」(実教出版)

<AffiliateBanner site="theory_navi" />
