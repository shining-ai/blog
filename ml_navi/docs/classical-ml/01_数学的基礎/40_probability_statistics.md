import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 確率と統計の基礎

## 確率と統計の基礎とは

確率と統計の基礎とは、

> 不確実なデータや現象を定量的に扱うための数学的枠組みであり、機械学習モデルの構築・評価・解釈すべての場面で必要となる知識体系

です。

機械学習は本質的に「不確実性のある推定」を行う学問であり、確率論はその土台です。

## 確率の基本

### 確率の定義

確率 $P(A)$ は事象 $A$ が起きる可能性を $[0, 1]$ の数値で表したものです。

$$0 \leq P(A) \leq 1, \quad P(\Omega) = 1$$

```python
import numpy as np
from scipy import stats

np.random.seed(42)

# コインを1000回投げたシミュレーション
n_tosses = 10000
tosses = np.random.binomial(1, 0.5, n_tosses)
empirical_prob_heads = tosses.mean()
print(f"表の経験的確率（{n_tosses}回試行）: {empirical_prob_heads:.4f}")
print(f"理論値: 0.5000")

# 大数の法則: サンプル数が増えるほど理論値に近づく
for n in [10, 100, 1000, 10000]:
    p = np.random.binomial(1, 0.5, n).mean()
    print(f"  n={n:5d}: 推定確率 = {p:.4f}")
```

## 確率分布

### ベルヌーイ分布

2値（0または1）の確率分布。コイン投げ・クリックの有無・疾患の有無などに使用。

$$P(X = x) = p^x (1-p)^{1-x}, \quad x \in \{0, 1\}$$

```python
import numpy as np
from scipy import stats

# ベルヌーイ分布
p = 0.3  # 成功確率
bernoulli = stats.bernoulli(p)

print("ベルヌーイ分布 (p=0.3):")
print(f"  P(X=0) = {bernoulli.pmf(0):.4f}")
print(f"  P(X=1) = {bernoulli.pmf(1):.4f}")
print(f"  期待値 E[X] = {bernoulli.mean():.4f}")  # = p
print(f"  分散 Var[X] = {bernoulli.var():.4f}")    # = p(1-p)

# サンプリング
samples = bernoulli.rvs(1000)
print(f"\n1000サンプルの平均（経験的期待値）: {samples.mean():.4f}")
```

### 正規分布（ガウス分布）

最も重要な連続確率分布。中心極限定理により、多くの自然現象に近似できます。

$$f(x) = \frac{1}{\sqrt{2\pi\sigma^2}} \exp\left(-\frac{(x-\mu)^2}{2\sigma^2}\right)$$

```python
import numpy as np
from scipy import stats

# 正規分布
mu = 170.0    # 平均（身長の例）
sigma = 7.0   # 標準偏差

normal = stats.norm(mu, sigma)

print("正規分布 N(170, 7^2) - 身長の例:")
print(f"  P(160 < X < 180) = {normal.cdf(180) - normal.cdf(160):.4f}")
print(f"  P(X > 185) = {1 - normal.cdf(185):.4f}")
print(f"  95%区間: [{normal.ppf(0.025):.1f}, {normal.ppf(0.975):.1f}]")

# 標準正規分布（μ=0, σ=1）
std_normal = stats.norm(0, 1)
print(f"\n標準正規分布 N(0, 1):")
print(f"  μ ± σ 内の確率: {std_normal.cdf(1) - std_normal.cdf(-1):.4f}")  # ≈ 0.68
print(f"  μ ± 2σ 内の確率: {std_normal.cdf(2) - std_normal.cdf(-2):.4f}") # ≈ 0.95
print(f"  μ ± 3σ 内の確率: {std_normal.cdf(3) - std_normal.cdf(-3):.4f}") # ≈ 0.997
```

### 多項分布

カテゴリカルな試行（サイコロ・テキストの単語出現など）を表す分布。

```python
import numpy as np
from scipy import stats

# 多項分布: K面のサイコロをn回投げる
p = [1/6] * 6  # 各目が出る確率（均等）
n = 60          # 試行回数

# 期待出現回数
expected = np.array(p) * n
print("サイコロ60回の期待値（各目）:", expected)

# シミュレーション
samples = np.random.multinomial(n, p, size=100)
print("100回のシミュレーション平均:", samples.mean(axis=0).round(2))

# テキストの単語分布（言語モデルの基礎）
vocab = ['the', 'a', 'cat', 'sat', 'on', 'mat']
word_probs = np.array([0.3, 0.2, 0.15, 0.1, 0.15, 0.1])
word_probs /= word_probs.sum()  # 正規化

sampled_indices = np.random.choice(len(vocab), size=10, p=word_probs)
sentence = ' '.join(vocab[i] for i in sampled_indices)
print(f"\n単語分布からのサンプル: {sentence}")
```

## 期待値・分散・共分散

### 期待値（Expected Value）

$$E[X] = \int x \, f(x) \, dx \quad \text{（連続）}, \quad E[X] = \sum_x x \, P(X=x) \quad \text{（離散）}$$

### 分散（Variance）

$$\text{Var}[X] = E[(X - E[X])^2] = E[X^2] - (E[X])^2$$

### 共分散（Covariance）

$$\text{Cov}[X, Y] = E[(X - E[X])(Y - E[Y])]$$

```python
import numpy as np

np.random.seed(42)
n = 10000

# 期待値と分散の計算
mu_true = 5.0
sigma_true = 2.0
X = np.random.normal(mu_true, sigma_true, n)

print("期待値と分散の推定:")
print(f"  サンプル平均 E[X]: {X.mean():.4f} (真値: {mu_true})")
print(f"  サンプル分散 Var[X]: {X.var():.4f} (真値: {sigma_true**2})")
print(f"  サンプル標準偏差: {X.std():.4f} (真値: {sigma_true})")

# 共分散と相関
mu_x, mu_y = 2.0, 3.0
X2 = np.random.normal(mu_x, 1.0, n)
Y_positive = 0.8 * X2 + np.random.normal(0, 0.5, n)   # 正の相関
Y_negative = -0.8 * X2 + np.random.normal(0, 0.5, n)  # 負の相関
Y_none = np.random.normal(mu_y, 1.0, n)               # 相関なし

print("\n共分散と相関係数:")
print(f"  正の相関: Cov={np.cov(X2, Y_positive)[0,1]:.4f}, r={np.corrcoef(X2, Y_positive)[0,1]:.4f}")
print(f"  負の相関: Cov={np.cov(X2, Y_negative)[0,1]:.4f}, r={np.corrcoef(X2, Y_negative)[0,1]:.4f}")
print(f"  相関なし: Cov={np.cov(X2, Y_none)[0,1]:.4f}, r={np.corrcoef(X2, Y_none)[0,1]:.4f}")

# 共分散行列（機械学習での特徴量間の相関分析）
features = np.column_stack([X2, Y_positive, Y_negative, Y_none])
cov_matrix = np.cov(features.T)
print(f"\n共分散行列の形状: {cov_matrix.shape}")
print("共分散行列:\n", cov_matrix.round(3))
```

## 条件付き確率とベイズの定理

### 条件付き確率

$$P(A \mid B) = \frac{P(A \cap B)}{P(B)}$$

事象 $B$ が起きたという条件のもとで、事象 $A$ が起きる確率。

### ベイズの定理

$$P(A \mid B) = \frac{P(B \mid A) \cdot P(A)}{P(B)}$$

| 用語 | 記号 | 意味 |
|------|------|------|
| 事前確率 | $P(A)$ | データを見る前の信念 |
| 尤度 | $P(B \mid A)$ | $A$ が真のときにデータ $B$ が得られる確率 |
| 事後確率 | $P(A \mid B)$ | データを見た後の信念（更新された確率） |
| 周辺尤度 | $P(B)$ | データが得られる全体的な確率（正規化定数） |

```python
import numpy as np

# 医療診断の例でベイズの定理を実装
# - 病気の有病率: P(病) = 0.01 (1%)
# - 検査の感度: P(陽性|病) = 0.95 (感度 95%)
# - 検査の特異度: P(陰性|健康) = 0.90 → P(陽性|健康) = 0.10

p_disease = 0.01        # 事前確率（有病率）
p_positive_given_disease = 0.95   # 感度
p_positive_given_healthy = 0.10   # 1 - 特異度

# P(陽性) = P(陽性|病)P(病) + P(陽性|健康)P(健康)
p_healthy = 1 - p_disease
p_positive = (p_positive_given_disease * p_disease +
              p_positive_given_healthy * p_healthy)

# ベイズの定理: P(病|陽性)
p_disease_given_positive = (p_positive_given_disease * p_disease) / p_positive

print("医療診断のベイズ定理:")
print(f"  有病率 P(病) = {p_disease:.2f}")
print(f"  検査感度 P(陽性|病) = {p_positive_given_disease:.2f}")
print(f"  偽陽性率 P(陽性|健康) = {p_positive_given_healthy:.2f}")
print(f"  P(陽性) = {p_positive:.4f}")
print(f"  P(病|陽性) = {p_disease_given_positive:.4f}")
print(f"  → 陽性でも実際に病気の確率は {p_disease_given_positive*100:.1f}%")
print(f"  （有病率が低いと陽性的中率も低くなる）")

# スパムフィルタ（ナイーブベイズの原理）
print("\nナイーブベイズ・スパムフィルタの例:")
# P(スパム) = 0.3
# P("無料"|スパム) = 0.7, P("無料"|正常) = 0.05
# P("今すぐ"|スパム) = 0.6, P("今すぐ"|正常) = 0.02

p_spam = 0.3
p_ham = 0.7

# 特徴語の尤度
likelihoods = {
    '無料': {'spam': 0.7, 'ham': 0.05},
    '今すぐ': {'spam': 0.6, 'ham': 0.02},
}

# メールに「無料」「今すぐ」が含まれる場合
words_in_email = ['無料', '今すぐ']

log_p_spam = np.log(p_spam)
log_p_ham = np.log(p_ham)

for word in words_in_email:
    log_p_spam += np.log(likelihoods[word]['spam'])
    log_p_ham += np.log(likelihoods[word]['ham'])

# 正規化
max_log = max(log_p_spam, log_p_ham)
p_spam_posterior = np.exp(log_p_spam - max_log)
p_ham_posterior = np.exp(log_p_ham - max_log)
total = p_spam_posterior + p_ham_posterior

p_spam_posterior /= total
p_ham_posterior /= total

print(f"  P(スパム|'無料','今すぐ') = {p_spam_posterior:.4f}")
print(f"  P(正常|'無料','今すぐ') = {p_ham_posterior:.4f}")
print(f"  判定: {'スパム' if p_spam_posterior > 0.5 else '正常'}")
```

## 最尤推定（MLE）

最尤推定は「観測データが最も得られやすいパラメータ」を選ぶ推定法です。

$$\hat{\theta}_{MLE} = \arg\max_\theta \prod_{i=1}^N p(x_i \mid \theta) = \arg\max_\theta \sum_{i=1}^N \log p(x_i \mid \theta)$$

```python
import numpy as np
from scipy import stats

# 正規分布のパラメータをMLEで推定
np.random.seed(42)
true_mu = 5.0
true_sigma = 2.0
data = np.random.normal(true_mu, true_sigma, 200)

# 正規分布のMLEの解析解: μ̂ = sample mean, σ̂ = sample std
mu_hat = data.mean()
sigma_hat = data.std()  # MLE（N で割る）

print("正規分布パラメータのMLE:")
print(f"  真値: μ={true_mu}, σ={true_sigma}")
print(f"  MLE推定: μ̂={mu_hat:.4f}, σ̂={sigma_hat:.4f}")

# 対数尤度の計算
log_likelihood = stats.norm.logpdf(data, mu_hat, sigma_hat).sum()
print(f"  対数尤度: {log_likelihood:.4f}")

# 真のパラメータでの対数尤度と比較
log_likelihood_true = stats.norm.logpdf(data, true_mu, true_sigma).sum()
print(f"  真値での対数尤度: {log_likelihood_true:.4f}")
print(f"  （MLEの方が真値より高いか等しい）")
```

## 使用場面

- **ナイーブベイズ分類器**: テキスト分類・スパムフィルタ
- **確率的モデリング**: ガウス混合モデル（GMM）・隠れマルコフモデル（HMM）
- **交差エントロピー損失**: 分類問題での損失関数（最尤推定と等価）
- **ベイズ最適化**: ハイパーパラメータ探索での不確実性の活用
- **A/Bテスト**: 統計的仮説検定による施策効果の検証
- **特徴量エンジニアリング**: 相関分析・共分散行列による特徴量選択

## 参考文献

<AffiliateBanner site="ml_intro" />

- [SciPy Stats](https://docs.scipy.org/doc/scipy/reference/stats.html)
- Bishop, C.M. (2006). *Pattern Recognition and Machine Learning*, Chapter 1. Springer.
- 须山敦志 (2017). *ベイズ深層学習*. 講談社.
