import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ブースティング

## ブースティングとは

> ブースティング（Boosting）とは、複数の弱学習器（精度がランダム予測より少し良い程度のモデル）を**逐次的に**学習し、前の学習器が間違えたサンプルを重視しながら次の学習器を訓練することで、強力な予測モデルを構築するアンサンブル手法である。バギングが並列処理で分散を減らすのに対し、ブースティングは逐次処理でバイアスを減らすアプローチをとる。

---

## バギングとブースティングの比較

| 観点 | バギング（ランダムフォレスト） | ブースティング |
|------|---------------------------|--------------|
| 学習の順序 | 並列（独立） | 逐次（依存） |
| 削減する誤差 | 分散（Variance） | バイアス（Bias） |
| 過学習のリスク | 低い | 高め（早期停止が重要） |
| 異常値の影響 | 小 | 大（重みが付くため） |
| 代表的手法 | Random Forest | AdaBoost, GBDT |

---

## AdaBoost

各反復 $t$ で誤分類サンプルの重みを増加させることで、前の弱学習器が苦手なサンプルに集中させる。

### アルゴリズム

1. 全サンプルに均等な重み $w_i = 1/n$ を初期化
2. 弱学習器 $h_t$ を重み付き誤差 $\epsilon_t = \sum_{i: h_t(x_i) \neq y_i} w_i$ を最小化するよう学習
3. 学習器の重みを計算：$\alpha_t = \frac{1}{2} \ln\frac{1-\epsilon_t}{\epsilon_t}$
4. サンプル重みを更新：正解 → 小さく、誤分類 → 大きく
5. 最終予測：$F(\mathbf{x}) = \text{sign}\left(\sum_t \alpha_t h_t(\mathbf{x})\right)$

---

## Gradient Boosting（勾配ブースティング）

前の学習器の残差（予測誤差）を次の学習器が学習するフレームワーク。損失関数の**負の勾配**を擬似残差として利用する。

$$
F_m(\mathbf{x}) = F_{m-1}(\mathbf{x}) + \nu \cdot h_m(\mathbf{x})
$$

- $\nu$：学習率（縮小係数）
- $h_m$：$m$ 番目の弱学習器（通常は浅い決定木）
- 擬似残差：$r_{im} = -\left[\frac{\partial \mathcal{L}(y_i, F(\mathbf{x}_i))}{\partial F(\mathbf{x}_i)}\right]_{F=F_{m-1}}$

---

## Python実装

### AdaBoost の基本

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import make_classification
from sklearn.ensemble import AdaBoostClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report

X, y = make_classification(
    n_samples=1000, n_features=20, n_informative=10,
    random_state=42
)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.25, random_state=0
)

# AdaBoost（ベース学習器：深さ1の決定木 = stump）
ada = AdaBoostClassifier(
    estimator=DecisionTreeClassifier(max_depth=1),
    n_estimators=200,
    learning_rate=0.5,
    algorithm="SAMME",
    random_state=42,
)
ada.fit(X_train, y_train)

print(f"AdaBoost テスト精度: {ada.score(X_test, y_test):.4f}")
print(classification_report(y_test, ada.predict(X_test)))

# ブースティング反復ごとの精度推移
train_staged = list(ada.staged_score(X_train, y_train))
test_staged  = list(ada.staged_score(X_test,  y_test))

plt.figure(figsize=(9, 5))
plt.plot(train_staged, "b-", label="訓練精度")
plt.plot(test_staged,  "r-", label="テスト精度")
best_iter = np.argmax(test_staged)
plt.axvline(best_iter, color="gray", linestyle="--",
            label=f"最良反復={best_iter}")
plt.xlabel("ブースティング反復数")
plt.ylabel("精度")
plt.title("AdaBoost: 反復数と精度の推移")
plt.legend()
plt.tight_layout()
plt.savefig("adaboost_staged.png", dpi=120)
plt.show()
```

### Gradient Boosting の基本

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import load_breast_cancer
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

data = load_breast_cancer()
X_train, X_test, y_train, y_test = train_test_split(
    data.data, data.target, test_size=0.2, random_state=42
)

gbdt = GradientBoostingClassifier(
    n_estimators=200,
    learning_rate=0.05,
    max_depth=3,
    subsample=0.8,            # 確率的勾配ブースティング
    min_samples_leaf=10,
    random_state=42,
)
gbdt.fit(X_train, y_train)

print(f"GBDT テスト精度: {gbdt.score(X_test, y_test):.4f}")
print(classification_report(y_test, gbdt.predict(X_test)))

# 損失の推移（訓練・検証）
train_losses = gbdt.train_score_

# 早期停止のシミュレーション
gbdt_monitor = GradientBoostingClassifier(
    n_estimators=500, learning_rate=0.05, max_depth=3,
    subsample=0.8, validation_fraction=0.1, n_iter_no_change=20,
    random_state=0
)
gbdt_monitor.fit(X_train, y_train)
print(f"\n早期停止: {gbdt_monitor.n_estimators_} 反復で終了")
print(f"精度: {gbdt_monitor.score(X_test, y_test):.4f}")
```

### 学習率と木の本数のトレードオフ

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import load_breast_cancer
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split

data = load_breast_cancer()
X_train, X_test, y_train, y_test = train_test_split(
    data.data, data.target, test_size=0.2, random_state=0
)

configs = [
    (0.5,  50,  "高lr=0.5, 少木=50"),
    (0.1,  200, "中lr=0.1, 中木=200"),
    (0.01, 1000, "低lr=0.01, 多木=1000"),
]

fig, axes = plt.subplots(1, 3, figsize=(15, 4), sharey=True)

for ax, (lr, n_est, label) in zip(axes, configs):
    gbdt = GradientBoostingClassifier(
        n_estimators=n_est, learning_rate=lr, max_depth=3,
        random_state=0
    )
    gbdt.fit(X_train, y_train)

    train_staged = list(gbdt.staged_score(X_train, y_train))
    test_staged  = list(gbdt.staged_score(X_test,  y_test))

    ax.plot(train_staged, "b-", label="訓練", alpha=0.7)
    ax.plot(test_staged,  "r-", label="テスト")
    ax.set_xlabel("反復数")
    ax.set_title(f"{label}\n最終テスト精度={test_staged[-1]:.3f}")
    ax.legend(fontsize=8)
    if ax == axes[0]:
        ax.set_ylabel("精度")

plt.suptitle("GBDTの学習率と木の本数のトレードオフ")
plt.tight_layout()
plt.savefig("gbdt_lr_vs_n.png", dpi=120)
plt.show()
```

### 特徴量重要度の比較（AdaBoost vs GBDT）

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import load_breast_cancer
from sklearn.ensemble import AdaBoostClassifier, GradientBoostingClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import train_test_split

data = load_breast_cancer()
X_train, X_test, y_train, y_test = train_test_split(
    data.data, data.target, test_size=0.2, random_state=42
)

models = {
    "AdaBoost": AdaBoostClassifier(
        estimator=DecisionTreeClassifier(max_depth=2),
        n_estimators=100, random_state=0
    ),
    "GBDT": GradientBoostingClassifier(
        n_estimators=100, max_depth=3, random_state=0
    ),
}

fig, axes = plt.subplots(1, 2, figsize=(14, 5))
for ax, (name, model) in zip(axes, models.items()):
    model.fit(X_train, y_train)
    importances = model.feature_importances_
    indices = np.argsort(importances)[::-1][:15]
    ax.bar(range(15), importances[indices], color="steelblue")
    ax.set_xticks(range(15))
    ax.set_xticklabels([data.feature_names[i] for i in indices],
                       rotation=45, ha="right", fontsize=8)
    ax.set_title(f"{name} 特徴量重要度")
    ax.set_ylabel("重要度")

plt.tight_layout()
plt.savefig("boosting_feature_importance.png", dpi=120)
plt.show()
```

---

## 損失関数の選択（GBDT）

| 問題 | 損失関数 | 特徴 |
|------|---------|------|
| 二値分類 | `log_loss`（deviance） | 確率を出力 |
| 多クラス分類 | `log_loss` | Softmax回帰を利用 |
| 回帰（通常） | `squared_error` | MSEを最小化 |
| 回帰（外れ値に強く） | `absolute_error` | MAEを最小化 |
| 回帰（分位点） | `quantile` | 分位点回帰 |

---

## 主要ハイパーパラメータ

| パラメータ | 役割 | 推奨 |
|-----------|------|------|
| `n_estimators` | 木の本数 | 100〜1000（早期停止と組み合わせ） |
| `learning_rate` | 縮小係数（0より大きく1以下） | 0.01〜0.1（小さいほど安定） |
| `max_depth` | 各木の深さ | 2〜6 |
| `subsample` | 各木で使うデータの割合 | 0.5〜0.8（確率的GB） |
| `min_samples_leaf` | 葉の最小サンプル数 | 5〜50 |

---

## 使用場面

| シーン | 理由 |
|--------|------|
| Kaggleコンペ | XGBoost/LightGBMの前身として広く活用 |
| 不均衡データの分類 | 誤分類サンプルに注目する仕組みが有効 |
| 高精度が求められる回帰 | Random Forestより精度が高いことが多い |
| 少量データでの精度向上 | バイアスを段階的に削減できる |

---

## 参考文献

- Freund, Y., & Schapire, R. E. (1997). A decision-theoretic generalization of on-line learning. *Journal of Computer and System Sciences*, 55(1), 119–139.
- Friedman, J. H. (2001). Greedy function approximation: A gradient boosting machine. *Annals of Statistics*, 29(5), 1189–1232.
- scikit-learn 公式ドキュメント: [GradientBoostingClassifier](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.GradientBoostingClassifier.html)

<AffiliateBanner site="ml_intro" />
