import AffiliateBanner from '@site/src/components/AffiliateBanner';

# バギングとランダムフォレスト

## バギングとランダムフォレストとは

> バギング（Bagging, Bootstrap Aggregating）とは、訓練データからブートストラップサンプリングで複数のサブセットを生成し、それぞれで独立に学習した複数の弱学習器の予測を集約することで分散を低減するアンサンブル手法である。ランダムフォレスト（Random Forest）はバギングを決定木に適用しつつ、各分岐時に特徴量をランダム選択することで木間の相関を下げた手法であり、最も汎用的なアンサンブル手法の1つである。

---

## アルゴリズムの概要

### ブートストラップサンプリング

$n$ 個の訓練データから**重複を許して** $n$ 個サンプリングする。平均的に約63.2%の元データが選ばれ、残り36.8%はOut-of-Bag（OOB）サンプルとなる。

$$
P(\text{サンプルiが選ばれる}) = 1 - \left(1 - \frac{1}{n}\right)^n \approx 1 - e^{-1} \approx 0.632
$$

### ランダムフォレストの手順

1. $B$ 個のブートストラップサンプルを生成
2. 各サンプルで決定木を学習（分岐時に $m = \sqrt{p}$（分類）または $m = p/3$（回帰）個の特徴量をランダム選択）
3. 予測：分類は多数決、回帰は平均

---

## 特徴量のランダム選択の効果

通常のバギング（全特徴量使用）では、強い特徴量が毎回選ばれるため木間の相関が高い。特徴量のランダム選択により、木の多様性（diversity）が増し、集約後の誤差が減る。

$$
\text{アンサンブルの誤差} \propto \rho \cdot \bar{\sigma}^2
$$

$\rho$：木間の相関、$\bar{\sigma}^2$：各木の誤差分散

---

## Out-of-Bag 誤差

各木を学習しなかったOOBサンプルを使って予測し、検証誤差を推定できる。追加のクロスバリデーションが不要というメリットがある。

---

## Python実装

### 基本的な分類

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import load_breast_cancer, make_classification
from sklearn.ensemble import RandomForestClassifier, BaggingClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report

data = load_breast_cancer()
X, y = data.data, data.target

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42
)

# 単一決定木
dt = DecisionTreeClassifier(random_state=0)
dt.fit(X_train, y_train)
dt_score = dt.score(X_test, y_test)

# バギング（決定木）
bagging = BaggingClassifier(
    estimator=DecisionTreeClassifier(),
    n_estimators=100,
    bootstrap=True,
    oob_score=True,
    random_state=0,
    n_jobs=-1,
)
bagging.fit(X_train, y_train)

# ランダムフォレスト
rf = RandomForestClassifier(
    n_estimators=200,
    max_features="sqrt",
    oob_score=True,
    random_state=0,
    n_jobs=-1,
)
rf.fit(X_train, y_train)

print("=== 比較結果 ===")
print(f"単一決定木  テスト精度: {dt_score:.4f}")
print(f"バギング    テスト精度: {bagging.score(X_test, y_test):.4f}"
      f"  OOB精度: {bagging.oob_score_:.4f}")
print(f"RF          テスト精度: {rf.score(X_test, y_test):.4f}"
      f"  OOB精度: {rf.oob_score_:.4f}")

print("\n=== ランダムフォレスト 詳細 ===")
print(classification_report(y_test, rf.predict(X_test)))
```

### 木の本数と精度の関係

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import load_breast_cancer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

data = load_breast_cancer()
X_train, X_test, y_train, y_test = train_test_split(
    data.data, data.target, test_size=0.2, random_state=42
)

n_estimators_range = [1, 5, 10, 20, 50, 100, 200, 500]
train_scores, test_scores, oob_scores = [], [], []

for n in n_estimators_range:
    rf = RandomForestClassifier(
        n_estimators=n, oob_score=True, random_state=0, n_jobs=-1
    )
    rf.fit(X_train, y_train)
    train_scores.append(rf.score(X_train, y_train))
    test_scores.append(rf.score(X_test, y_test))
    oob_scores.append(rf.oob_score_)

plt.figure(figsize=(9, 5))
plt.semilogx(n_estimators_range, train_scores, "b-o", markersize=6, label="訓練精度")
plt.semilogx(n_estimators_range, test_scores,  "r-o", markersize=6, label="テスト精度")
plt.semilogx(n_estimators_range, oob_scores,   "g--o", markersize=6, label="OOB精度")
plt.xlabel("木の本数（log scale）")
plt.ylabel("精度")
plt.title("木の本数と精度の関係")
plt.legend()
plt.tight_layout()
plt.savefig("rf_n_estimators.png", dpi=120)
plt.show()
```

### 特徴量重要度

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import load_breast_cancer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.inspection import permutation_importance

data = load_breast_cancer()
X_train, X_test, y_train, y_test = train_test_split(
    data.data, data.target, test_size=0.2, random_state=0
)

rf = RandomForestClassifier(n_estimators=200, random_state=42, n_jobs=-1)
rf.fit(X_train, y_train)

# MDI（Mean Decrease Impurity）重要度
mdi_importances = rf.feature_importances_
mdi_indices = np.argsort(mdi_importances)[::-1][:15]

# パーミュテーション重要度（より信頼性が高い）
perm_result = permutation_importance(
    rf, X_test, y_test, n_repeats=30, random_state=0, n_jobs=-1
)
perm_importances = perm_result.importances_mean
perm_indices = np.argsort(perm_importances)[::-1][:15]

fig, axes = plt.subplots(1, 2, figsize=(16, 6))

axes[0].barh(range(15), mdi_importances[mdi_indices[::-1]],
             color="steelblue")
axes[0].set_yticks(range(15))
axes[0].set_yticklabels([data.feature_names[i] for i in mdi_indices[::-1]])
axes[0].set_title("MDI（不純度の平均減少）")
axes[0].set_xlabel("重要度")

axes[1].barh(range(15), perm_importances[perm_indices[::-1]],
             color="coral",
             xerr=perm_result.importances_std[perm_indices[::-1]])
axes[1].set_yticks(range(15))
axes[1].set_yticklabels([data.feature_names[i] for i in perm_indices[::-1]])
axes[1].set_title("パーミュテーション重要度")
axes[1].set_xlabel("精度の低下量")

plt.suptitle("ランダムフォレスト 特徴量重要度の比較")
plt.tight_layout()
plt.savefig("rf_feature_importance.png", dpi=120)
plt.show()
```

### ハイパーパラメータのチューニング

```python
import numpy as np
from sklearn.datasets import load_breast_cancer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import RandomizedSearchCV, train_test_split
from sklearn.metrics import classification_report

data = load_breast_cancer()
X_train, X_test, y_train, y_test = train_test_split(
    data.data, data.target, test_size=0.2, random_state=0
)

param_dist = {
    "n_estimators":    [50, 100, 200, 500],
    "max_depth":       [None, 5, 10, 20],
    "min_samples_split": [2, 5, 10],
    "min_samples_leaf":  [1, 2, 4],
    "max_features":    ["sqrt", "log2", 0.3, 0.5],
    "bootstrap":       [True, False],
}

rf = RandomForestClassifier(random_state=42, n_jobs=-1)
search = RandomizedSearchCV(
    rf, param_dist, n_iter=50, cv=5, scoring="accuracy",
    random_state=0, n_jobs=-1
)
search.fit(X_train, y_train)

print(f"最適パラメータ: {search.best_params_}")
print(f"CV精度: {search.best_score_:.4f}")
print(f"テスト精度: {search.score(X_test, y_test):.4f}")

best_model = search.best_estimator_
print("\n=== 最良モデルの分類レポート ===")
print(classification_report(y_test, best_model.predict(X_test)))
```

---

## ExtraTreesとの比較

| 手法 | 分岐点の選び方 | 速度 | 分散 |
|------|-------------|------|------|
| Random Forest | 最適な閾値を探索 | 遅め | 低め |
| Extra Trees | 閾値をランダムに決定 | 速い | 更に低め |

```python
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import cross_val_score

data = load_breast_cancer()
X, y = data.data, data.target

for name, clf in [
    ("Random Forest", RandomForestClassifier(n_estimators=200, random_state=0, n_jobs=-1)),
    ("Extra Trees",   ExtraTreesClassifier(n_estimators=200, random_state=0, n_jobs=-1)),
]:
    scores = cross_val_score(clf, X, y, cv=10, scoring="accuracy", n_jobs=-1)
    print(f"{name:15s}: {scores.mean():.4f} ± {scores.std():.4f}")
```

---

## 主要ハイパーパラメータ

| パラメータ | 役割 | 推奨値 |
|-----------|------|--------|
| `n_estimators` | 木の本数 | 100〜500（多いほど安定） |
| `max_features` | 分岐時の特徴量数 | `"sqrt"`（分類）, `"log2"` |
| `max_depth` | 最大深さ | None（完全成長）〜20 |
| `min_samples_leaf` | 葉の最小サンプル数 | 1〜5 |
| `oob_score` | OOB評価を有効化 | True（推奨） |

---

## 使用場面

| シーン | 理由 |
|--------|------|
| 表形式データの汎用モデル | 前処理が少なくても高精度 |
| 特徴量重要度の確認 | MDI・パーミュテーション重要度が使える |
| 外れ値・欠損値が多い | 頑健性が高い |
| ベースラインモデルの構築 | スケール変換不要で簡単に使える |
| 大規模データの並列処理 | `n_jobs=-1` で並列化可能 |

---

## 参考文献

- Breiman, L. (2001). Random forests. *Machine Learning*, 45(1), 5–32.
- Breiman, L. (1996). Bagging predictors. *Machine Learning*, 24(2), 123–140.
- scikit-learn 公式ドキュメント: [RandomForestClassifier](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.RandomForestClassifier.html)

<AffiliateBanner site="ml_intro" />
