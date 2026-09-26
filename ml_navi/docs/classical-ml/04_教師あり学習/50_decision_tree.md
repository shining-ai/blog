import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 決定木

## 決定木とは

> 決定木（Decision Tree）とは、データを一連の条件分岐（「特徴量 $x_j \leq t$」の形）によって再帰的に分割し、木構造を構築することで分類または回帰を行うアルゴリズムである。人間が理解しやすいルールを生成でき、解釈性の高さが最大の特徴である。一方で、深い木は過学習しやすく、アンサンブル手法のベースとしても広く活用される。

---

## 木の構成要素

| 用語 | 説明 |
|------|------|
| 根ノード（Root Node） | 最初の分岐点 |
| 内部ノード（Internal Node） | 条件分岐を行うノード |
| 葉ノード（Leaf Node） | 最終的な予測値（クラスまたは実数値） |
| 深さ（Depth） | 根から最も遠い葉までのエッジ数 |
| 剪定（Pruning） | 過学習を防ぐためにノードを削除する操作 |

---

## 分岐基準（不純度指標）

### ジニ不純度（Gini Impurity）

$$
G = 1 - \sum_{k=1}^K p_k^2
$$

- $p_k$：クラス $k$ の割合
- 完全に純粋（全て同じクラス）なら $G = 0$
- 均等分布なら最大（2クラスで $G = 0.5$）

### 情報利得（Information Gain）/ エントロピー

$$
H = -\sum_{k=1}^K p_k \log_2 p_k
$$

分割前後のエントロピー差が情報利得：

$$
\text{IG} = H(\text{親}) - \frac{|L|}{|L|+|R|} H(L) - \frac{|R|}{|L|+|R|} H(R)
$$

### 回帰木：分散（MSE）による分割

$$
\text{MSE} = \frac{1}{|S|} \sum_{i \in S} (y_i - \bar{y}_S)^2
$$

### 比較

| 指標 | 特徴 | 採用アルゴリズム |
|------|------|----------------|
| ジニ不純度 | 計算が速い | CART |
| エントロピー | 情報理論的根拠 | ID3, C4.5 |
| 分散（MSE） | 回帰問題用 | CART |

---

## Python実装

### 基本的な分類木

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import load_iris, make_classification
from sklearn.tree import (
    DecisionTreeClassifier, export_text, plot_tree
)
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

# Iris データセット
iris = load_iris()
X, y = iris.data, iris.target

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42
)

# 決定木学習
model = DecisionTreeClassifier(
    criterion="gini",       # 分岐基準
    max_depth=4,            # 最大深さ
    min_samples_leaf=5,     # 葉の最小サンプル数
    random_state=42
)
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
print(classification_report(y_test, y_pred, target_names=iris.target_names))
print(f"\nAccuracy: {model.score(X_test, y_test):.4f}")

# ルールのテキスト出力
rules = export_text(model, feature_names=list(iris.feature_names))
print("\n=== 決定ルール ===")
print(rules[:1500])
```

### 木の可視化

```python
import matplotlib.pyplot as plt
from sklearn.datasets import load_iris
from sklearn.tree import DecisionTreeClassifier, plot_tree

iris = load_iris()
X, y = iris.data, iris.target

model = DecisionTreeClassifier(max_depth=3, random_state=0)
model.fit(X, y)

plt.figure(figsize=(16, 8))
plot_tree(
    model,
    feature_names=iris.feature_names,
    class_names=iris.target_names,
    filled=True,
    rounded=True,
    fontsize=10,
    impurity=True,
)
plt.title("決定木の可視化（Iris データセット）")
plt.tight_layout()
plt.savefig("decision_tree_viz.png", dpi=120)
plt.show()
```

### 深さによる過学習の確認

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import make_classification
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import train_test_split, cross_val_score

X, y = make_classification(
    n_samples=500, n_features=10, random_state=1
)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.25, random_state=42
)

depths = range(1, 21)
train_scores, test_scores, cv_scores = [], [], []

for d in depths:
    dt = DecisionTreeClassifier(max_depth=d, random_state=0)
    dt.fit(X_train, y_train)
    train_scores.append(dt.score(X_train, y_train))
    test_scores.append(dt.score(X_test, y_test))
    cv_scores.append(
        cross_val_score(dt, X_train, y_train, cv=5).mean()
    )

plt.figure(figsize=(9, 5))
plt.plot(depths, train_scores, "b-o", markersize=5, label="訓練精度")
plt.plot(depths, test_scores,  "r-o", markersize=5, label="テスト精度")
plt.plot(depths, cv_scores,    "g--o", markersize=5, label="CV精度")
best_d = depths[np.argmax(cv_scores)]
plt.axvline(best_d, color="gray", linestyle="--", label=f"最適深さ={best_d}")
plt.xlabel("木の最大深さ")
plt.ylabel("精度")
plt.title("決定木の深さと過学習")
plt.legend()
plt.tight_layout()
plt.savefig("dt_depth_vs_accuracy.png", dpi=120)
plt.show()
```

### 特徴量重要度

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import load_breast_cancer
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

data = load_breast_cancer()
X, y = data.data, data.target
feature_names = data.feature_names

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=0
)

model = DecisionTreeClassifier(max_depth=5, random_state=42)
model.fit(X_train, y_train)

importances = model.feature_importances_
indices = np.argsort(importances)[::-1]
top_n = 15

plt.figure(figsize=(10, 5))
plt.bar(range(top_n), importances[indices[:top_n]], color="steelblue")
plt.xticks(range(top_n), [feature_names[i] for i in indices[:top_n]], rotation=45, ha="right")
plt.xlabel("特徴量")
plt.ylabel("重要度（ジニ不純度の減少量）")
plt.title("決定木 特徴量重要度（上位15）")
plt.tight_layout()
plt.savefig("dt_feature_importance.png", dpi=120)
plt.show()
```

### コスト複雑度剪定（CCP）

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import load_breast_cancer
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import train_test_split

data = load_breast_cancer()
X_train, X_test, y_train, y_test = train_test_split(
    data.data, data.target, test_size=0.2, random_state=0
)

# ccpアルファの候補を取得
model_full = DecisionTreeClassifier(random_state=0)
path = model_full.cost_complexity_pruning_path(X_train, y_train)
ccp_alphas = path.ccp_alphas[:-1]  # 最後は切り捨て

train_accs, test_accs = [], []
for alpha in ccp_alphas:
    dt = DecisionTreeClassifier(ccp_alpha=alpha, random_state=0)
    dt.fit(X_train, y_train)
    train_accs.append(dt.score(X_train, y_train))
    test_accs.append(dt.score(X_test, y_test))

plt.figure(figsize=(9, 5))
plt.semilogx(ccp_alphas, train_accs, "b-o", markersize=4, label="訓練精度")
plt.semilogx(ccp_alphas, test_accs,  "r-o", markersize=4, label="テスト精度")
best_alpha = ccp_alphas[np.argmax(test_accs)]
plt.axvline(best_alpha, color="gray", linestyle="--",
            label=f"最適α={best_alpha:.5f}")
plt.xlabel("CCP Alpha（正則化強度）")
plt.ylabel("精度")
plt.title("コスト複雑度剪定（CCP）による過学習制御")
plt.legend()
plt.tight_layout()
plt.savefig("dt_ccp_pruning.png", dpi=120)
plt.show()
```

---

## 剪定（Pruning）の方法

| 手法 | タイミング | 内容 |
|------|-----------|------|
| 事前剪定（Pre-pruning） | 成長中 | `max_depth`, `min_samples_leaf` などで早期停止 |
| 事後剪定（Post-pruning） | 成長後 | コスト複雑度剪定（CCP）で木をトリム |

---

## 主要ハイパーパラメータ

| パラメータ | 役割 | 推奨 |
|-----------|------|------|
| `max_depth` | 最大深さ | 3〜10程度から試す |
| `min_samples_split` | 分割に必要な最小サンプル数 | 2〜20 |
| `min_samples_leaf` | 葉の最小サンプル数 | 1〜10 |
| `max_features` | 分割時に考慮する特徴量数 | `"sqrt"`, `"log2"` |
| `ccp_alpha` | コスト複雑度剪定の強さ | CVで選択 |

---

## 使用場面

| シーン | 理由 |
|--------|------|
| ルールベースの意思決定システム | 人間が理解できるルールを出力できる |
| 医療診断支援 | 決定プロセスの説明が求められる |
| 特徴量重要度の確認 | ランダムフォレスト前の前検討として |
| カテゴリ変数が多いデータ | スケール変換不要 |
| 非線形・交互作用のある関係 | 自動的に捉える |

---

## 参考文献

- Breiman, L., Friedman, J., Olshen, R., & Stone, C. (1984). *Classification and Regression Trees*. Wadsworth.
- Quinlan, J. R. (1993). *C4.5: Programs for Machine Learning*. Morgan Kaufmann.
- scikit-learn 公式ドキュメント: [DecisionTreeClassifier](https://scikit-learn.org/stable/modules/generated/sklearn.tree.DecisionTreeClassifier.html)

<AffiliateBanner site="ml_intro" />
