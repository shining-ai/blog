import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 情報理論の基礎

## 情報理論の基礎とは

情報理論の基礎とは、

> 情報の量・不確実性・分布間の差異を定量的に測定するための数学的枠組みであり、損失関数・決定木・生成モデルなど機械学習の多くの場面で根幹をなす理論

です。

クロード・シャノンが1948年に提唱した情報理論は、通信工学から出発しましたが、現在では機械学習・統計・データ圧縮のあらゆる分野に応用されています。

## 主要な概念の比較

| 概念 | 記号 | 値域 | 直感的意味 |
|------|------|------|------------|
| シャノンエントロピー | $H(X)$ | $[0, \log_2 n]$ | 分布の不確実性・平均情報量 |
| 交差エントロピー | $H(P, Q)$ | $[H(P), \infty)$ | 予測分布 $Q$ で真の分布 $P$ を符号化するコスト |
| KLダイバージェンス | $D_{KL}(P \| Q)$ | $[0, \infty)$ | 2つの分布の非対称な乖離度 |
| 相互情報量 | $I(X; Y)$ | $[0, \min(H(X), H(Y))]$ | 2変数が共有する情報量 |

## シャノンエントロピー

### 定義

確率変数 $X$ がとる値 $x_1, \ldots, x_n$ について、確率 $P(X = x_i) = p_i$ とするとき、

$$H(X) = -\sum_{i=1}^{n} p_i \log p_i$$

エントロピーは分布が均一なほど大きく、偏っているほど小さくなります。

```python
import numpy as np
from scipy.stats import entropy

def shannon_entropy(probs: np.ndarray, base: float = 2) -> float:
    """シャノンエントロピーを計算する（単位: bits または nats）"""
    probs = np.asarray(probs, dtype=float)
    # ゼロ確率の項は 0*log(0) = 0 として扱う
    probs = probs[probs > 0]
    return -np.sum(probs * np.log(probs) / np.log(base))

# 確実な事象（エントロピー = 0）
print(f"確実な事象 [1.0, 0.0]: H = {shannon_entropy([1.0, 0.0]):.4f} bits")

# コイン投げ（最大エントロピー）
print(f"公平なコイン [0.5, 0.5]: H = {shannon_entropy([0.5, 0.5]):.4f} bits")

# 不均一な分布
print(f"不均一な分布 [0.9, 0.1]: H = {shannon_entropy([0.9, 0.1]):.4f} bits")

# 4クラス均一（最大エントロピー = log2(4) = 2 bits）
print(f"4クラス均一 [0.25]*4: H = {shannon_entropy([0.25]*4):.4f} bits")

# SciPy での計算（nats単位）
probs = np.array([0.3, 0.5, 0.2])
print(f"\nSciPy entropy (nats): {entropy(probs):.4f}")
print(f"SciPy entropy (bits): {entropy(probs, base=2):.4f}")
```

## 交差エントロピー

### 定義

真の分布 $P$ と予測分布 $Q$ に対して、

$$H(P, Q) = -\sum_{i} p_i \log q_i$$

分類問題における損失関数として広く使われます。$H(P, Q) = H(P) + D_{KL}(P \| Q)$ が成り立ちます。

```python
import numpy as np

def cross_entropy(p_true: np.ndarray, q_pred: np.ndarray, eps: float = 1e-9) -> float:
    """交差エントロピーを計算する"""
    p = np.asarray(p_true, dtype=float)
    q = np.asarray(q_pred, dtype=float) + eps  # ゼロ除算防止
    return -np.sum(p * np.log(q))

# 2クラス分類の例
# 正解ラベル（one-hot）
y_true = np.array([1, 0])
# モデルの予測確率（ソフトマックス後）
y_pred_good = np.array([0.95, 0.05])   # 良い予測
y_pred_bad  = np.array([0.05, 0.95])   # 悪い予測

print("2クラス分類:")
print(f"  良い予測 H(P, Q_good) = {cross_entropy(y_true, y_pred_good):.4f}")
print(f"  悪い予測 H(P, Q_bad)  = {cross_entropy(y_true, y_pred_bad):.4f}")

# バッチ全体の平均交差エントロピー損失
y_true_batch = np.array([[1,0,0], [0,1,0], [0,0,1]])
y_pred_batch = np.array([[0.8,0.1,0.1], [0.1,0.7,0.2], [0.2,0.1,0.7]])

losses = [-np.sum(y * np.log(p + 1e-9)) for y, p in zip(y_true_batch, y_pred_batch)]
print(f"\nバッチ平均交差エントロピー: {np.mean(losses):.4f}")

# PyTorchでの交差エントロピー損失
try:
    import torch
    import torch.nn as nn
    criterion = nn.CrossEntropyLoss()
    # CrossEntropyLoss はロジットを受け取り内部でソフトマックスを適用する
    logits = torch.tensor([[2.0, 0.5, 0.1], [0.3, 2.1, 0.5]])
    labels = torch.tensor([0, 1])
    loss = criterion(logits, labels)
    print(f"\nPyTorch CrossEntropyLoss: {loss.item():.4f}")
except ImportError:
    print("\nPyTorchが未インストールのためスキップ")
```

## KLダイバージェンス

### 定義

$$D_{KL}(P \| Q) = \sum_{i} p_i \log \frac{p_i}{q_i} = H(P, Q) - H(P)$$

非対称であり、$D_{KL}(P \| Q) \neq D_{KL}(Q \| P)$ が一般的に成り立ちます。$P$ から $Q$ への乖離を表します。

```python
import numpy as np
from scipy.special import kl_div
from scipy.stats import entropy

def kl_divergence(p: np.ndarray, q: np.ndarray, eps: float = 1e-9) -> float:
    """KLダイバージェンス D_KL(P || Q) を計算する"""
    p = np.asarray(p, dtype=float)
    q = np.asarray(q, dtype=float) + eps
    mask = p > 0
    return np.sum(p[mask] * np.log(p[mask] / q[mask]))

# 2つの正規分布のKLダイバージェンス（解析解）
# D_KL(N(mu1,s1) || N(mu2,s2)) = log(s2/s1) + (s1^2 + (mu1-mu2)^2)/(2*s2^2) - 1/2
mu1, sigma1 = 0.0, 1.0
mu2, sigma2 = 1.0, 1.0

kl_analytic = (np.log(sigma2/sigma1)
               + (sigma1**2 + (mu1 - mu2)**2) / (2 * sigma2**2)
               - 0.5)
print(f"正規分布間KL（解析解）: D_KL(N(0,1) || N(1,1)) = {kl_analytic:.4f}")

# 離散分布でのKL
P = np.array([0.4, 0.3, 0.2, 0.1])
Q = np.array([0.25, 0.25, 0.25, 0.25])

print(f"\nD_KL(P || Q) = {kl_divergence(P, Q):.4f}")
print(f"D_KL(Q || P) = {kl_divergence(Q, P):.4f}  (非対称)")

# SciPy の entropy 関数でも計算可能
print(f"SciPy D_KL(P || Q) = {entropy(P, Q):.4f}")

# KLダイバージェンスと交差エントロピーの関係
h_p = -np.sum(P * np.log(P))
h_pq = -np.sum(P * np.log(Q + 1e-9))
print(f"\n検証: H(P,Q) = H(P) + D_KL(P||Q)")
print(f"  H(P,Q) = {h_pq:.4f}")
print(f"  H(P) + D_KL = {h_p + kl_divergence(P, Q):.4f}")
```

## 相互情報量

### 定義

$$I(X; Y) = \sum_{x,y} p(x,y) \log \frac{p(x,y)}{p(x)p(y)} = H(X) - H(X|Y) = H(Y) - H(Y|X)$$

2つの確率変数が共有する情報量を測ります。統計的独立のとき $I(X;Y) = 0$ です。

```python
import numpy as np
from sklearn.metrics import mutual_info_score
from sklearn.feature_selection import mutual_info_classif

# 離散変数での相互情報量
def mutual_information_discrete(joint_prob: np.ndarray) -> float:
    """結合分布から相互情報量を計算する"""
    p_x = joint_prob.sum(axis=1)  # X の周辺分布
    p_y = joint_prob.sum(axis=0)  # Y の周辺分布
    mi = 0.0
    for i in range(joint_prob.shape[0]):
        for j in range(joint_prob.shape[1]):
            if joint_prob[i, j] > 0:
                mi += joint_prob[i, j] * np.log(
                    joint_prob[i, j] / (p_x[i] * p_y[j])
                )
    return mi

# 完全相関の場合
joint_corr = np.array([[0.5, 0.0],
                        [0.0, 0.5]])
print(f"完全相関: I(X;Y) = {mutual_information_discrete(joint_corr):.4f} nats")

# 独立の場合
joint_indep = np.array([[0.25, 0.25],
                         [0.25, 0.25]])
print(f"独立: I(X;Y) = {mutual_information_discrete(joint_indep):.4f} nats")

# sklearn での相互情報量（特徴量選択への応用）
np.random.seed(42)
X = np.random.randn(500, 5)
# 目的変数は最初の2特徴量と相関
y = (X[:, 0] + X[:, 1] > 0).astype(int)

mi_scores = mutual_info_classif(X, y, random_state=42)
print("\n特徴量ごとの相互情報量（分類）:")
for i, score in enumerate(mi_scores):
    print(f"  特徴量 {i}: MI = {score:.4f}")
```

## 決定木との関連

決定木の分割基準として情報利得（Information Gain）が使われます。

$$\text{IG}(X, A) = H(X) - \sum_{v} \frac{|X_v|}{|X|} H(X_v)$$

```python
import numpy as np
from sklearn.tree import DecisionTreeClassifier
from sklearn.datasets import load_iris

def information_gain(y_parent: np.ndarray, y_left: np.ndarray, y_right: np.ndarray) -> float:
    """情報利得を計算する"""
    def entropy(labels):
        n = len(labels)
        if n == 0:
            return 0.0
        counts = np.bincount(labels)
        probs = counts[counts > 0] / n
        return -np.sum(probs * np.log2(probs))

    n = len(y_parent)
    n_l, n_r = len(y_left), len(y_right)
    ig = (entropy(y_parent)
          - (n_l / n) * entropy(y_left)
          - (n_r / n) * entropy(y_right))
    return ig

# 簡単な例: 病気の診断（陽性=1, 陰性=0）
y_all   = np.array([1,1,1,0,0,0,0,0])  # 親ノード
y_left  = np.array([1,1,1])            # 分割後左
y_right = np.array([0,0,0,0,0])        # 分割後右

ig = information_gain(y_all, y_left, y_right)
print(f"情報利得: {ig:.4f} bits")

# sklearn の決定木（criterion='entropy' でエントロピー基準）
iris = load_iris()
clf = DecisionTreeClassifier(criterion='entropy', max_depth=3, random_state=42)
clf.fit(iris.data, iris.target)
print(f"\nIris 決定木（エントロピー基準）精度: {clf.score(iris.data, iris.target):.4f}")
print(f"特徴量重要度: {clf.feature_importances_.round(4)}")
```

## 使用場面

- **分類問題の損失関数**: 交差エントロピー損失はニューラルネットワーク・ロジスティック回帰の標準的な目的関数
- **決定木・ランダムフォレスト**: 情報利得・ジニ不純度による最適分割の選択
- **VAE（変分オートエンコーダ）**: KLダイバージェンスが正則化項として損失関数に登場
- **特徴量選択**: 相互情報量による目的変数との関連度ランキング
- **モデル蒸留**: 教師モデルの出力分布と生徒モデルの出力分布のKLダイバージェンスを最小化
- **強化学習**: 方策の探索と活用のバランス（最大エントロピー強化学習）

## 参考文献

<AffiliateBanner site="ml_intro" />

- Shannon, C.E. (1948). A mathematical theory of communication. *Bell System Technical Journal*, 27, 379–423.
- Cover, T.M. & Thomas, J.A. (2006). *Elements of Information Theory* (2nd ed.). Wiley.
- [scikit-learn: Mutual Information](https://scikit-learn.org/stable/modules/feature_selection.html#mutual-info)
