import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 過学習と汎化

機械学習モデルを構築する際の最大の課題の一つが「過学習」と「汎化性能」のバランスである。訓練データに完璧に当てはまるモデルが、未知のデータに対しては全く機能しないという現象は、機械学習の実務で頻繁に遭遇する。本記事では過学習の本質とその対処法を体系的に解説する。

## 過学習と汎化とは

> **過学習（Overfitting）** とは、モデルが訓練データのノイズや偶然のパターンまで学習し、未知のデータに対して性能が著しく低下する現象である。一方、**汎化（Generalization）** とは、訓練に使っていない未知のデータに対してもモデルが正しく機能することを指す。汎化性能を最大化することが機械学習の本質的な目標である。

---

## バイアス-バリアンストレードオフ

過学習と過小適合を理解するために、バイアスとバリアンスの概念が重要である。

$$\text{期待誤差} = \text{バイアス}^2 + \text{バリアンス} + \text{既約誤差}$$

| 概念 | 意味 | 高い場合 |
|------|------|---------|
| バイアス（Bias） | モデルの予測が真の値から系統的にずれる度合い | 過小適合（Underfitting） |
| バリアンス（Variance） | 訓練データの変動に対するモデルの感度 | 過学習（Overfitting） |
| 既約誤差 | データ自体のノイズ（削減不可能） | - |

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.preprocessing import PolynomialFeatures
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split, learning_curve
from sklearn.metrics import mean_squared_error

np.random.seed(42)

# 真の関数: sin 曲線
def true_function(x):
    return np.sin(x * 2 * np.pi)

# ノイズ付きデータ
n = 80
X = np.sort(np.random.uniform(0, 1, n)).reshape(-1, 1)
y = true_function(X.ravel()) + np.random.normal(0, 0.3, n)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)

# プロット用の x 軸
X_plot = np.linspace(0, 1, 300).reshape(-1, 1)


def plot_bias_variance(X_train, y_train, X_test, y_test, X_plot, degrees=[1, 4, 15]):
    """異なるモデル複雑度での過学習・過小適合を可視化する"""
    fig, axes = plt.subplots(1, len(degrees), figsize=(5 * len(degrees), 5))

    for ax, degree in zip(axes, degrees):
        model = Pipeline([
            ('poly', PolynomialFeatures(degree=degree)),
            ('reg',  LinearRegression()),
        ])
        model.fit(X_train, y_train)

        train_mse = mean_squared_error(y_train, model.predict(X_train))
        test_mse  = mean_squared_error(y_test,  model.predict(X_test))

        ax.scatter(X_train, y_train, s=15, alpha=0.5, label='訓練データ', color='steelblue')
        ax.scatter(X_test,  y_test,  s=15, alpha=0.5, label='テストデータ', color='coral')
        ax.plot(X_plot, true_function(X_plot.ravel()), 'g--', linewidth=2, label='真の関数')
        ax.plot(X_plot, model.predict(X_plot), 'r-', linewidth=2, label='予測')
        ax.set_title(f'多項式次数={degree}\n訓練MSE={train_mse:.3f} / テストMSE={test_mse:.3f}')
        ax.set_ylim(-2, 2)
        ax.legend(fontsize=7)

    plt.tight_layout()
    plt.savefig('overfitting_demo.png', bbox_inches='tight')
    plt.show()


plot_bias_variance(X_train, y_train, X_test, y_test, X_plot)
```

---

## 過学習・過小適合の診断

```python
def plot_mse_vs_complexity(X_train, y_train, X_test, y_test, degrees=range(1, 20)):
    """モデル複雑度（多項式次数）と訓練/テスト誤差の関係"""
    train_errors, test_errors = [], []

    for deg in degrees:
        model = Pipeline([
            ('poly', PolynomialFeatures(degree=deg)),
            ('reg',  LinearRegression()),
        ])
        model.fit(X_train, y_train)
        train_errors.append(mean_squared_error(y_train, model.predict(X_train)))
        test_errors.append(mean_squared_error(y_test,  model.predict(X_test)))

    fig, ax = plt.subplots(figsize=(10, 5))
    ax.plot(degrees, train_errors, 'b-o', label='訓練誤差', markersize=5)
    ax.plot(degrees, test_errors,  'r-o', label='テスト誤差', markersize=5)
    ax.axvline(x=4, color='green', linestyle='--', label='最適な複雑度（例）')
    ax.set_xlabel('多項式次数（モデルの複雑度）')
    ax.set_ylabel('MSE')
    ax.set_title('バイアス-バリアンストレードオフ')
    ax.set_ylim(0, 0.5)
    ax.legend()

    # 注釈
    ax.annotate('過小適合\n(高バイアス)', xy=(1.5, 0.4), fontsize=10, color='gray')
    ax.annotate('適切な複雑度', xy=(3.5, 0.15), fontsize=10, color='green')
    ax.annotate('過学習\n(高バリアンス)', xy=(12, 0.35), fontsize=10, color='red')

    plt.tight_layout()
    plt.savefig('bias_variance_tradeoff.png', bbox_inches='tight')
    plt.show()


plot_mse_vs_complexity(X_train, y_train, X_test, y_test)
```

---

## 学習曲線（Learning Curve）

学習曲線は、訓練サンプル数の増加に対して訓練・検証誤差がどう変化するかを示す。過学習・過小適合の診断に使う。

```python
from sklearn.svm import SVR

def plot_learning_curves(models: dict, X, y) -> None:
    """複数モデルの学習曲線を並べて描画する"""
    fig, axes = plt.subplots(1, len(models), figsize=(6 * len(models), 5))

    train_sizes = np.linspace(0.1, 1.0, 10)

    for ax, (name, model) in zip(axes, models.items()):
        train_sz, train_sc, val_sc = learning_curve(
            model, X, y,
            train_sizes=train_sizes,
            cv=5,
            scoring='neg_mean_squared_error',
            shuffle=True,
            random_state=42
        )
        train_mean = -train_sc.mean(axis=1)
        val_mean   = -val_sc.mean(axis=1)
        train_std  = train_sc.std(axis=1)
        val_std    = val_sc.std(axis=1)

        ax.plot(train_sz, train_mean, 'b-', label='訓練誤差')
        ax.fill_between(train_sz, train_mean - train_std, train_mean + train_std, alpha=0.2, color='blue')
        ax.plot(train_sz, val_mean, 'r-', label='検証誤差')
        ax.fill_between(train_sz, val_mean - val_std, val_mean + val_std, alpha=0.2, color='red')
        ax.set_title(name)
        ax.set_xlabel('訓練サンプル数')
        ax.set_ylabel('MSE')
        ax.legend()
        ax.set_ylim(0, 0.5)

    plt.tight_layout()
    plt.savefig('learning_curves.png', bbox_inches='tight')
    plt.show()


models = {
    '過小適合 (degree=1)': Pipeline([('poly', PolynomialFeatures(1)), ('reg', LinearRegression())]),
    '適切 (degree=4)':     Pipeline([('poly', PolynomialFeatures(4)), ('reg', LinearRegression())]),
    '過学習 (degree=15)':  Pipeline([('poly', PolynomialFeatures(15)), ('reg', LinearRegression())]),
}
plot_learning_curves(models, X, y)
```

**学習曲線の読み方:**

| パターン | 訓練誤差 | 検証誤差 | 診断 | 対策 |
|---------|---------|---------|------|------|
| 両方高い | 高 | 高 | 過小適合 | モデルを複雑にする、特徴量を追加 |
| 訓練低・検証高・ギャップ大 | 低 | 高 | 過学習 | 正則化、データ増加、モデルを単純に |
| 両方低く収束 | 低 | 低 | 適切 | - |

---

## 正則化（Regularization）

正則化は、モデルの複雑度にペナルティを課すことで過学習を防ぐ手法である。

### L1 正則化（Lasso）

$$\text{Loss} = \text{MSE} + \lambda \sum_{i} |w_i|$$

スパースな解（一部の重みを 0 にする）が得られ、特徴量選択の効果がある。

### L2 正則化（Ridge）

$$\text{Loss} = \text{MSE} + \lambda \sum_{i} w_i^2$$

重みを 0 に近づけるが 0 にはしない。すべての特徴量を使いつつ過学習を防ぐ。

### Elastic Net

L1 と L2 の組み合わせ。

```python
from sklearn.linear_model import Ridge, Lasso, ElasticNet

alphas = np.logspace(-3, 3, 50)
degree = 15

fig, axes = plt.subplots(1, 3, figsize=(15, 5))
regularizers = {
    'Ridge (L2)': Ridge,
    'Lasso (L1)': Lasso,
    'ElasticNet': ElasticNet,
}

for ax, (name, Reg) in zip(axes, regularizers.items()):
    train_errors, test_errors = [], []

    for alpha in alphas:
        model = Pipeline([
            ('poly', PolynomialFeatures(degree=degree)),
            ('reg',  Reg(alpha=alpha, max_iter=10000)),
        ])
        model.fit(X_train, y_train)
        train_errors.append(mean_squared_error(y_train, model.predict(X_train)))
        test_errors.append(mean_squared_error(y_test,  model.predict(X_test)))

    best_alpha = alphas[np.argmin(test_errors)]
    ax.semilogx(alphas, train_errors, 'b-', label='訓練誤差')
    ax.semilogx(alphas, test_errors,  'r-', label='テスト誤差')
    ax.axvline(x=best_alpha, color='green', linestyle='--', label=f'最適 α={best_alpha:.4f}')
    ax.set_xlabel('正則化強度 α (log scale)')
    ax.set_ylabel('MSE')
    ax.set_title(name)
    ax.legend()
    ax.set_ylim(0, 0.5)

plt.tight_layout()
plt.savefig('regularization_comparison.png', bbox_inches='tight')
plt.show()
```

---

## その他の過学習対策

| 手法 | 概要 | 適用場面 |
|------|------|---------|
| データ増強 | 訓練データを人工的に増やす | 画像・テキスト |
| ドロップアウト | ニューラルネットで一部ニューロンを無効化 | ディープラーニング |
| 早期停止 | 検証誤差が悪化したら訓練を停止 | 勾配ブースティング、DL |
| バギング | 複数モデルの予測を平均化 | ランダムフォレスト |
| 交差検証 | より信頼性の高い性能評価 | 全般 |

```python
# 早期停止の例（XGBoost）
# xgb.XGBClassifier の場合
# model.fit(X_train, y_train,
#           eval_set=[(X_val, y_val)],
#           early_stopping_rounds=10,
#           verbose=False)

# ランダムフォレストでのバギング効果
from sklearn.ensemble import RandomForestClassifier
from sklearn.tree import DecisionTreeClassifier

X_clf = np.random.randn(500, 5)
y_clf = (X_clf[:, 0] + X_clf[:, 1] > 0).astype(int)
X_tr, X_te, y_tr, y_te = train_test_split(X_clf, y_clf, test_size=0.3, random_state=42)

single_tree = DecisionTreeClassifier(random_state=42)
single_tree.fit(X_tr, y_tr)

rf = RandomForestClassifier(n_estimators=100, random_state=42)
rf.fit(X_tr, y_tr)

print(f"単一決定木 テスト精度: {single_tree.score(X_te, y_te):.4f}")
print(f"ランダムフォレスト テスト精度: {rf.score(X_te, y_te):.4f}")
```

---

## 診断フローチャート

```
モデルの訓練・テスト誤差を確認
│
├─ 訓練誤差が高い → 過小適合
│   ├─ より複雑なモデルを使う
│   ├─ 特徴量を追加する
│   └─ 正則化を弱める
│
└─ 訓練誤差が低いのにテスト誤差が高い → 過学習
    ├─ 訓練データを増やす
    ├─ 正則化（L1/L2/ドロップアウト）を加える
    ├─ モデルを単純にする
    ├─ 特徴量選択で不要な変数を除去
    └─ アンサンブル手法を使う
```

---

## 使用場面

- **モデル構築の全過程**: 学習曲線は全モデルに対して確認すべき診断ツール
- **ハイパーパラメータ調整**: 正則化強度の選択に活用
- **データ収集の判断**: 学習曲線で「データを増やすべきか」「モデルを変えるべきか」を判断
- **本番デプロイ前の品質確認**: 汎化性能の確認なしに本番投入しない

---

## 参考文献

- Goodfellow, I., Bengio, Y., & Courville, A. (2016). *Deep Learning*. MIT Press.
- Hastie, T., Tibshirani, R., & Friedman, J. (2009). *The Elements of Statistical Learning* (2nd ed.). Springer.
- Ng, A. (2018). *Machine Learning Yearning*. https://www.deeplearning.ai/machine-learning-yearning/

<AffiliateBanner site="ml_intro" />
