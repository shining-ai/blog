import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 主成分分析（PCA）

## 主成分分析（PCA）とは

主成分分析（PCA）とは、

> データの分散が最大になる方向（主成分）を順番に求めることで、情報をなるべく保持しながら次元を削減する線形変換の手法

です。

Karl Pearson (1901) が提案した最も基本的な次元削減手法で、機械学習の前処理・可視化・特徴量エンジニアリングに広く使われます。

## PCA の数学的背景

| 概念 | 内容 |
|------|------|
| 主成分 | 分散を最大化する方向ベクトル（固有ベクトル） |
| 固有値 | 各主成分方向での分散の大きさ |
| 寄与率 | 各主成分が全分散に占める割合（固有値 / 全固有値の和） |
| 累積寄与率 | 上位 k 成分までの寄与率の合計 |
| 因子負荷量 | 元の特徴量と主成分の相関 |

## 基本実装

```python
import numpy as np
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from sklearn.datasets import load_iris

# Iris データセット（4次元 → 2次元）
iris = load_iris()
X = iris.data
y = iris.target

# 標準化（PCA 前は必ず実施）
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# PCA
pca = PCA(n_components=4)  # まず全成分で解析
pca.fit(X_scaled)

print("=== PCA 結果 ===")
print(f"{'主成分':>6} {'固有値':>10} {'寄与率%':>10} {'累積寄与率%':>14}")
print('-' * 44)
cumulative = 0
for i, (ev, er) in enumerate(zip(pca.explained_variance_, pca.explained_variance_ratio_)):
    cumulative += er * 100
    print(f"PC{i+1:>3} {ev:>10.4f} {er*100:>10.2f} {cumulative:>13.2f}%")

# 2次元に圧縮
pca2 = PCA(n_components=2)
X_pca = pca2.fit_transform(X_scaled)
print(f"\n2次元への圧縮後の情報保持率: {pca2.explained_variance_ratio_.sum()*100:.2f}%")
print(f"圧縮前の形状: {X_scaled.shape} → 圧縮後: {X_pca.shape}")
```

## 共分散行列の固有値分解

```python
import numpy as np
from sklearn.preprocessing import StandardScaler

np.random.seed(42)

# PCA の手動実装で仕組みを理解する
X = np.random.randn(100, 4)
X[:, 1] += 2 * X[:, 0]  # 意図的に相関を作る

# 1. 標準化
X_std = StandardScaler().fit_transform(X)

# 2. 共分散行列の計算
cov_matrix = np.cov(X_std.T)
print("共分散行列（標準化後）:")
print(cov_matrix.round(4))

# 3. 固有値分解
eigenvalues, eigenvectors = np.linalg.eig(cov_matrix)

# 固有値の降順に並べ替え
idx = np.argsort(eigenvalues)[::-1]
eigenvalues  = eigenvalues[idx]
eigenvectors = eigenvectors[:, idx]

print(f"\n固有値（降順）: {eigenvalues.round(4)}")
print(f"第1主成分（固有ベクトル）: {eigenvectors[:, 0].round(4)}")

# 4. 射影
X_pca_manual = X_std @ eigenvectors[:, :2]

# scikit-learn との一致確認
from sklearn.decomposition import PCA
pca = PCA(n_components=2)
X_pca_sklearn = pca.fit_transform(X_std)

# 符号が反転する場合があるため絶対値で比較
print(f"\n手動実装と sklearn の誤差（絶対値）: {np.abs(np.abs(X_pca_manual) - np.abs(X_pca_sklearn)).max():.6f}")
```

## スクリープロットによる次元数の選択

```python
import numpy as np
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from sklearn.datasets import load_wine

wine = load_wine()
X_scaled = StandardScaler().fit_transform(wine.data)
n_features = X_scaled.shape[1]

pca_full = PCA(n_components=n_features)
pca_full.fit(X_scaled)

ev_ratio = pca_full.explained_variance_ratio_
cumulative = np.cumsum(ev_ratio)

print("スクリープロット（寄与率）:")
print(f"{'PC':>4} {'固有値':>8} {'寄与率%':>9} {'累積%':>9}")
print('-' * 36)
for i, (ev, er, cum) in enumerate(zip(
        pca_full.explained_variance_, ev_ratio, cumulative)):
    bar = '█' * int(er * 100 / 2)
    print(f"PC{i+1:>2} {ev:>8.3f} {er*100:>8.2f}% {cum*100:>8.2f}%  {bar}")

# 90%・95%・99% の情報を保持するのに必要な次元数
for threshold in [0.90, 0.95, 0.99]:
    n_comp = np.argmax(cumulative >= threshold) + 1
    print(f"\n{threshold*100:.0f}%の情報を保持: {n_comp} 次元 / {n_features} 次元")
```

## 次元圧縮効果と再構成

```python
import numpy as np
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from sklearn.datasets import load_digits

# 手書き数字データ（8×8=64次元）
digits = load_digits()
X = digits.data
X_scaled = StandardScaler().fit_transform(X)

print("次元圧縮の効果（手書き数字 64次元）:")
print(f"{'n_components':>14} {'寄与率%':>10} {'再構成誤差':>12}")
print('-' * 40)
for n_comp in [2, 5, 10, 20, 30, 40, 64]:
    pca = PCA(n_components=n_comp)
    X_compressed = pca.fit_transform(X_scaled)
    X_reconstructed = pca.inverse_transform(X_compressed)
    reconstruction_error = np.mean((X_scaled - X_reconstructed) ** 2)
    ev_ratio = pca.explained_variance_ratio_.sum() * 100
    print(f"{n_comp:>14} {ev_ratio:>10.2f}% {reconstruction_error:>12.6f}")

# 圧縮率と情報保持のトレードオフ
pca_opt = PCA(n_components=0.95)  # 95%の分散を保持する次元数を自動選択
pca_opt.fit(X_scaled)
print(f"\n95%の分散を保持する次元数: {pca_opt.n_components_} / 64")
```

## 機械学習パイプラインへの組み込み

```python
import numpy as np
from sklearn.datasets import load_breast_cancer
from sklearn.decomposition import PCA
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

data = load_breast_cancer()
X, y = data.data, data.target

print(f"元の次元数: {X.shape[1]}")

results = {}
for n_comp in [2, 5, 10, 15, 20, 30, X.shape[1]]:
    if n_comp == X.shape[1]:
        # PCA なし（元の次元）
        pipeline = Pipeline([
            ('scaler', StandardScaler()),
            ('clf',    LogisticRegression(max_iter=1000, random_state=42))
        ])
        label = 'PCA なし'
    else:
        pipeline = Pipeline([
            ('scaler', StandardScaler()),
            ('pca',    PCA(n_components=n_comp)),
            ('clf',    LogisticRegression(max_iter=1000, random_state=42))
        ])
        label = f'PCA({n_comp}次元)'

    scores = cross_val_score(pipeline, X, y, cv=5, scoring='accuracy')
    results[label] = scores.mean()
    print(f"{label:<15}: CV精度 = {scores.mean():.4f} ± {scores.std():.4f}")

best = max(results, key=results.get)
print(f"\n最高精度の設定: {best} = {results[best]:.4f}")
```

## 使用場面

- **高次元データの可視化**: 数百〜数千次元のデータを2〜3次元に圧縮してプロット
- **計算コストの削減**: 学習時間を短縮するための前処理として使用
- **多重共線性の除去**: 相関の高い特徴量を独立な主成分に変換
- **ノイズ除去**: 寄与率の低い成分をカットしてノイズを減らす
- **顔認識（Eigenfaces）**: 顔画像の主成分表現による次元圧縮と認識

## 参考文献

<AffiliateBanner site="ml_intro" />

- Pearson, K. (1901). On lines and planes of closest fit to systems of points in space. *Philosophical Magazine*, 2(11), 559–572.
- Jolliffe, I.T. (2002). *Principal Component Analysis* (2nd ed.). Springer.
- [scikit-learn: PCA](https://scikit-learn.org/stable/modules/decomposition.html#pca)
