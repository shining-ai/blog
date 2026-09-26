import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ナイーブベイズ

## ナイーブベイズとは

> ナイーブベイズ（Naive Bayes）とは、ベイズの定理を基盤とし、「各特徴量がクラスに対して条件付き独立である」という単純な（ナイーブな）仮定のもとで事後確率を推定する確率的分類アルゴリズムである。仮定が非常に強いにもかかわらず実用上の性能が高く、特にテキスト分類・スパムフィルタリングで広く活用されている。

---

## ベイズの定理と条件付き独立の仮定

### ベイズの定理

$$
P(y \mid \mathbf{x}) = \frac{P(\mathbf{x} \mid y) \cdot P(y)}{P(\mathbf{x})}
$$

分類では分母 $P(\mathbf{x})$ は全クラス共通のため、以下を最大化するクラスを選ぶ。

$$
\hat{y} = \arg\max_y P(y) \cdot P(\mathbf{x} \mid y)
$$

### 条件付き独立の仮定

$$
P(\mathbf{x} \mid y) = \prod_{j=1}^p P(x_j \mid y)
$$

各特徴量 $x_j$ は他の特徴量から独立と仮定するため、乗算に分解できる。

---

## バリアント

### ガウシアン Naive Bayes（連続値特徴量）

各クラス内で特徴量が正規分布に従うと仮定する。

$$
P(x_j \mid y=k) = \frac{1}{\sqrt{2\pi\sigma_{jk}^2}} \exp\left(-\frac{(x_j - \mu_{jk})^2}{2\sigma_{jk}^2}\right)
$$

### 多項 Naive Bayes（テキスト・カウントデータ）

単語の出現頻度など、カウントデータに対して使用する。

$$
P(x_j \mid y=k) = \frac{N_{jk} + \alpha}{\sum_{j'} N_{j'k} + \alpha p}
$$

$\alpha$：スムージングパラメータ（ラプラス平滑化）

### ベルヌーイ Naive Bayes（2値特徴量）

各特徴量が0/1の2値の場合に使用する。テキストでは単語の有無を表す。

| バリアント | 特徴量の型 | 典型的な用途 |
|-----------|----------|------------|
| Gaussian NB | 連続値 | 一般的な数値データ |
| Multinomial NB | カウント整数値 | TF-IDFなどのテキスト特徴 |
| Bernoulli NB | 0/1 | 単語の出現有無 |
| Complement NB | カウント整数値 | 不均衡テキストデータ |

---

## Python実装

### ガウシアン Naive Bayes（基本）

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import load_iris
from sklearn.naive_bayes import GaussianNB
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix
import seaborn as sns

# Iris データセット
iris = load_iris()
X, y = iris.data, iris.target

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42
)

model = GaussianNB()
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
y_prob = model.predict_proba(X_test)

print("=== ガウシアン Naive Bayes ===")
print(classification_report(y_test, y_pred, target_names=iris.target_names))

# 各クラスの推定パラメータ
print("\n各クラスの特徴量平均（μ）:")
for k, name in enumerate(iris.target_names):
    print(f"  {name}: {model.theta_[k]}")

print("\n各クラスの特徴量分散（σ²）:")
for k, name in enumerate(iris.target_names):
    print(f"  {name}: {model.var_[k]}")
```

### テキスト分類（スパムフィルタ）

```python
import numpy as np
from sklearn.naive_bayes import MultinomialNB, ComplementNB
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

# サンプルデータ（実際はより大量のデータを使用）
corpus = [
    "buy cheap viagra now discount offer",
    "click here free prize winner",
    "meeting tomorrow 10am project update",
    "invoice attached quarterly report",
    "earn money fast work from home",
    "urgent limited time offer buy now",
    "team lunch friday please confirm",
    "code review pull request feedback",
    "free gift card claim prize limited",
    "budget proposal review needed soon",
    "discount sale 90 percent off today",
    "sprint planning next week agenda",
    "exclusive deal members only sale",
    "server deployment schedule maintenance",
    "win cash instantly click claim",
]
labels = [1, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1]  # 1:スパム, 0:正常

# TF-IDF特徴量
vectorizer = TfidfVectorizer()
X = vectorizer.fit_transform(corpus)

X_train, X_test, y_train, y_test = train_test_split(
    X, labels, test_size=0.3, random_state=42, stratify=labels
)

# MultinomialNBはTF-IDFの非負値に対応
# 注意：実際の多項NB はカウントデータ想定のため CountVectorizer の方が理論的に正確
for name, clf in [("MultinomialNB", MultinomialNB()),
                  ("ComplementNB",  ComplementNB())]:
    clf.fit(X_train, y_train)
    y_pred = clf.predict(X_test)
    print(f"\n=== {name} ===")
    print(classification_report(y_test, y_pred,
                                 target_names=["ham", "spam"],
                                 zero_division=0))
```

### 20 Newsgroups データセットでのテキスト分類

```python
import numpy as np
from sklearn.datasets import fetch_20newsgroups
from sklearn.naive_bayes import MultinomialNB
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.model_selection import cross_val_score
from sklearn.metrics import classification_report

# カテゴリを絞る
categories = [
    "sci.med", "sci.space", "rec.sport.hockey",
    "talk.politics.guns", "comp.graphics"
]

train = fetch_20newsgroups(subset="train", categories=categories, remove=("headers", "footers", "quotes"))
test  = fetch_20newsgroups(subset="test",  categories=categories, remove=("headers", "footers", "quotes"))

# Pipeline: TF-IDF + MultinomialNB
pipeline = Pipeline([
    ("tfidf", TfidfVectorizer(max_features=20000, ngram_range=(1, 2))),
    ("clf",   MultinomialNB(alpha=0.01)),
])

pipeline.fit(train.data, train.target)
y_pred = pipeline.predict(test.data)

print("=== 20 Newsgroups 分類結果 ===")
print(classification_report(test.target, y_pred,
                              target_names=categories))

# 各カテゴリの最もスパムらしい単語（対数確率）
feature_names = pipeline.named_steps["tfidf"].get_feature_names_out()
log_probs = pipeline.named_steps["clf"].feature_log_prob_

print("\n各カテゴリの特徴的な単語（上位5）:")
for i, cat in enumerate(categories):
    top_indices = np.argsort(log_probs[i])[-5:][::-1]
    top_words = [feature_names[j] for j in top_indices]
    print(f"  {cat}: {top_words}")
```

### スムージングパラメータ α の効果

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import fetch_20newsgroups
from sklearn.naive_bayes import MultinomialNB
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline

categories = ["sci.med", "sci.space", "rec.sport.hockey"]
train = fetch_20newsgroups(subset="train", categories=categories)
test  = fetch_20newsgroups(subset="test",  categories=categories)

alphas = np.logspace(-3, 1, 30)
test_scores = []

for a in alphas:
    pipe = Pipeline([
        ("tfidf", TfidfVectorizer(max_features=10000)),
        ("clf",   MultinomialNB(alpha=a)),
    ])
    pipe.fit(train.data, train.target)
    test_scores.append(pipe.score(test.data, test.target))

best_alpha = alphas[np.argmax(test_scores)]
print(f"最適 alpha: {best_alpha:.4f}, テスト精度: {max(test_scores):.4f}")

plt.figure(figsize=(8, 4))
plt.semilogx(alphas, test_scores, "b-o", markersize=5)
plt.axvline(best_alpha, color="red", linestyle="--",
            label=f"最適α={best_alpha:.3f}")
plt.xlabel("スムージングパラメータ α")
plt.ylabel("テスト精度")
plt.title("ナイーブベイズ: スムージングパラメータの影響")
plt.legend()
plt.tight_layout()
plt.savefig("naive_bayes_alpha.png", dpi=120)
plt.show()
```

---

## ラプラス平滑化（加算平滑化）

訓練データに出現しない単語（ゼロ頻度問題）への対処として、全カウントに $\alpha$（通常1）を加算する。

$$
P(w_j \mid y=k) = \frac{n(w_j, k) + \alpha}{n(k) + \alpha |V|}
$$

$|V|$：語彙サイズ

$\alpha = 0$（平滑化なし）とすると、未知語が含まれる文書の確率が0になる問題が生じる。

---

## 条件付き独立の仮定の実際

「ナイーブ」と呼ばれるほど強い仮定だが、以下の理由で実用上うまく機能する。

1. 確率の大小関係（クラスの順位）が正確に推定できれば分類は正しくなる
2. テキストデータでは語の共起があっても、クラスに関するシグナルは共有される
3. 高次元・スパースデータでは過学習しにくい

---

## 使用場面

| シーン | 推奨バリアント | 理由 |
|--------|--------------|------|
| スパムフィルタリング | Multinomial NB | 単語頻度ベース |
| 感情分析 | Complement NB | 不均衡データに強い |
| 文書分類（初期モデル） | Multinomial NB | 高速、スケーラブル |
| 医療データ（連続値） | Gaussian NB | 数値特徴量に対応 |
| リアルタイム分類 | 任意 | 予測速度が非常に速い |

---

## 参考文献

- Mitchell, T. M. (1997). *Machine Learning*. McGraw-Hill. (Chapter 6)
- Rennie, J. D., Shih, L., Teevan, J., & Karger, D. R. (2003). Tackling the poor assumptions of naive Bayes text classifiers. *ICML*.
- scikit-learn 公式ドキュメント: [Naive Bayes](https://scikit-learn.org/stable/modules/naive_bayes.html)

<AffiliateBanner site="ml_intro" />
