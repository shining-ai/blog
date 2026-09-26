import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 機械学習の種類

## 機械学習の種類とは

機械学習の学習方式とは、

> 学習に使用するデータの性質と、何を目的として学習するかによって分類される、機械学習アルゴリズムのカテゴリ

です。

大きく「教師あり学習」「教師なし学習」「強化学習」「自己教師あり学習」の4種類に分類されます。

## 教師あり学習（Supervised Learning）

教師あり学習とは、入力データとその正解ラベル（教師信号）をペアで与えることで、入力から出力へのマッピングを学習する手法です。

```
入力 X ──→ モデル ──→ 予測 ŷ
正解 y ──→ 損失計算 ──→ モデルの更新
```

### 回帰と分類

教師あり学習はさらに「回帰」と「分類」に分かれます。

| 種類 | 目的変数 | 例 |
|------|---------|-----|
| 回帰（Regression） | 連続値 | 住宅価格予測、気温予測 |
| 分類（Classification） | 離散値（クラス） | スパム判定、画像分類 |

```python
import numpy as np
from sklearn.datasets import load_iris, load_diabetes
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import mean_squared_error, accuracy_score

# --- 回帰の例 ---
diabetes = load_diabetes()
X_reg, y_reg = diabetes.data, diabetes.target

X_train_r, X_test_r, y_train_r, y_test_r = train_test_split(
    X_reg, y_reg, test_size=0.2, random_state=42
)

reg_model = LinearRegression()
reg_model.fit(X_train_r, y_train_r)
y_pred_r = reg_model.predict(X_test_r)
rmse = np.sqrt(mean_squared_error(y_test_r, y_pred_r))
print(f"回帰 RMSE: {rmse:.2f}")

# --- 分類の例 ---
iris = load_iris()
X_cls, y_cls = iris.data, iris.target

X_train_c, X_test_c, y_train_c, y_test_c = train_test_split(
    X_cls, y_cls, test_size=0.2, random_state=42
)

cls_model = LogisticRegression(max_iter=200)
cls_model.fit(X_train_c, y_train_c)
y_pred_c = cls_model.predict(X_test_c)
accuracy = accuracy_score(y_test_c, y_pred_c)
print(f"分類 精度: {accuracy:.3f}")
```

## 教師なし学習（Unsupervised Learning）

教師なし学習とは、正解ラベルなしで入力データのみを使い、データの構造やパターンを発見する手法です。

```
入力 X ──→ モデル ──→ 構造（クラスタ・次元削減・分布）
```

### クラスタリングと次元削減

| 種類 | 目的 | 例 |
|------|------|-----|
| クラスタリング | 似たデータをグループ化 | K-means、DBSCAN、階層的クラスタリング |
| 次元削減 | 高次元データを低次元に圧縮 | PCA、t-SNE、UMAP |
| 密度推定 | データの確率分布を推定 | GMM、KDE |
| 異常検知 | 外れ値・異常パターンの検出 | Isolation Forest、One-Class SVM |

```python
from sklearn.datasets import make_blobs
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
import numpy as np

# クラスタリングの例
X_blob, _ = make_blobs(n_samples=300, centers=4, random_state=42)

kmeans = KMeans(n_clusters=4, random_state=42, n_init=10)
labels = kmeans.fit_predict(X_blob)

# クラスタごとのサンプル数を確認
for cluster_id in range(4):
    count = np.sum(labels == cluster_id)
    print(f"クラスタ {cluster_id}: {count} サンプル")

# 次元削減の例
from sklearn.datasets import load_digits

digits = load_digits()
X_digits = digits.data  # 64次元

pca = PCA(n_components=2)
X_reduced = pca.fit_transform(X_digits)

print(f"元の次元数: {X_digits.shape[1]}")
print(f"削減後の次元数: {X_reduced.shape[1]}")
print(f"説明分散比: {pca.explained_variance_ratio_.sum():.3f}")
```

## 強化学習（Reinforcement Learning）

強化学習とは、エージェントが環境との相互作用を通じて、累積報酬を最大化する方策を学習する手法です。

```
エージェント ──行動→ 環境
     ↑                |
     └──報酬・状態──┘
```

| 構成要素 | 説明 |
|---------|------|
| エージェント（Agent） | 意思決定を行う主体 |
| 環境（Environment） | エージェントが相互作用する世界 |
| 状態（State） | 現在の環境の様子 |
| 行動（Action） | エージェントが選択できる操作 |
| 報酬（Reward） | 行動の良し悪しを示すフィードバック |
| 方策（Policy） | 状態から行動を決定するルール |

```python
import numpy as np

# Q学習の簡単な例（グリッドワールド）
class SimpleGridWorld:
    """4x4のグリッドワールド"""
    def __init__(self):
        self.n_states = 16
        self.n_actions = 4  # 上下左右
        self.goal = 15
        self.reset()
    
    def reset(self):
        self.state = 0
        return self.state
    
    def step(self, action):
        row, col = self.state // 4, self.state % 4
        if action == 0 and row > 0:    # 上
            row -= 1
        elif action == 1 and row < 3:  # 下
            row += 1
        elif action == 2 and col > 0:  # 左
            col -= 1
        elif action == 3 and col < 3:  # 右
            col += 1
        
        self.state = row * 4 + col
        reward = 1.0 if self.state == self.goal else -0.01
        done = self.state == self.goal
        return self.state, reward, done

# Q学習の実行
env = SimpleGridWorld()
Q = np.zeros((env.n_states, env.n_actions))

alpha = 0.1   # 学習率
gamma = 0.9   # 割引率
epsilon = 0.1 # 探索率

for episode in range(1000):
    state = env.reset()
    for _ in range(100):
        # ε-greedy行動選択
        if np.random.random() < epsilon:
            action = np.random.randint(env.n_actions)
        else:
            action = np.argmax(Q[state])
        
        next_state, reward, done = env.step(action)
        
        # Q値の更新
        Q[state, action] += alpha * (
            reward + gamma * np.max(Q[next_state]) - Q[state, action]
        )
        state = next_state
        if done:
            break

print("学習済みQ値（各状態の最大Q値）:")
print(Q.max(axis=1).reshape(4, 4).round(3))
```

## 自己教師あり学習（Self-Supervised Learning）

自己教師あり学習とは、ラベルなしデータから自動的に教師信号を生成し、有用な特徴表現を学習する手法です。

大量のラベルなしデータから事前学習（pre-training）を行い、少量のラベルありデータでファインチューニングするアプローチで活用されます。

| 手法 | 教師信号の生成方法 | 代表例 |
|------|-------------------|--------|
| マスク言語モデル | 単語を隠して予測 | BERT |
| 次文予測 | 次の文を予測 | GPT |
| 対照学習 | 類似ペアと非類似ペアを区別 | SimCLR、MoCo |
| 画像の回転予測 | 回転角度を予測 | RotNet |

```python
import numpy as np

# 対照学習の概念実装（シンプルな例）
def cosine_similarity(a, b):
    """コサイン類似度"""
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

# 擬似的な特徴ベクトル（実際はニューラルネットワークが生成）
anchor = np.array([1.0, 0.5, -0.3, 0.8])
positive = np.array([0.9, 0.6, -0.2, 0.7])   # 同じカテゴリ
negative = np.array([-0.5, 0.2, 0.9, -0.4])  # 異なるカテゴリ

sim_pos = cosine_similarity(anchor, positive)
sim_neg = cosine_similarity(anchor, negative)

print(f"正例との類似度: {sim_pos:.3f}")
print(f"負例との類似度: {sim_neg:.3f}")

# 対照損失（InfoNCE）の概念
temperature = 0.07
loss = -np.log(
    np.exp(sim_pos / temperature) /
    (np.exp(sim_pos / temperature) + np.exp(sim_neg / temperature))
)
print(f"対照損失: {loss:.3f}")
```

## 4種類の学習方式まとめ

| 学習方式 | ラベル | 目的 | 代表アルゴリズム |
|---------|--------|------|----------------|
| 教師あり学習 | 必要 | 予測・分類 | 線形回帰、決定木、SVM、NN |
| 教師なし学習 | 不要 | 構造発見 | K-means、PCA、オートエンコーダ |
| 強化学習 | 報酬のみ | 方策最適化 | Q学習、DQN、PPO、A3C |
| 自己教師あり学習 | 自動生成 | 特徴表現学習 | BERT、GPT、SimCLR |

## 代表的アルゴリズム一覧

### 教師あり学習（回帰）

| アルゴリズム | 特徴 | 適した場面 |
|------------|------|-----------|
| 線形回帰 | シンプル・解釈容易 | 線形関係のあるデータ |
| Ridge/Lasso回帰 | 正則化あり | 多重共線性・特徴選択 |
| 決定木回帰 | 非線形・解釈容易 | 複雑な関係性 |
| ランダムフォレスト | アンサンブル・頑健 | 汎用的な回帰 |
| 勾配ブースティング | 高精度 | Kaggle等のコンペ |
| SVR | マージン最大化 | 外れ値に頑健 |

### 教師あり学習（分類）

| アルゴリズム | 特徴 | 適した場面 |
|------------|------|-----------|
| ロジスティック回帰 | シンプル・確率出力 | 二値分類の基準 |
| K近傍法（KNN） | 非パラメトリック | 小〜中規模データ |
| 決定木 | 解釈容易 | ルール抽出が必要な場合 |
| ランダムフォレスト | 高精度・汎用 | 多くの分類問題 |
| XGBoost/LightGBM | 最高精度クラス | テーブルデータのコンペ |
| SVM | マージン最大化 | 中規模・高次元データ |
| ナイーブベイズ | 高速・テキスト向け | テキスト分類 |

### 教師なし学習

| アルゴリズム | カテゴリ | 適した場面 |
|------------|---------|-----------|
| K-means | クラスタリング | 球状クラスタ |
| DBSCAN | クラスタリング | 任意形状クラスタ・外れ値検出 |
| 階層的クラスタリング | クラスタリング | クラスタ数未知 |
| PCA | 次元削減 | 線形次元削減・可視化 |
| t-SNE | 次元削減 | 高次元データの可視化 |
| UMAP | 次元削減 | 高速・大規模データの可視化 |
| Isolation Forest | 異常検知 | 外れ値・異常検知 |

## 使用場面

- **教師あり学習**: 正解データが入手できる予測・分類タスク（顧客離脱予測、医療診断、価格予測）
- **教師なし学習**: ラベルなしデータの探索、顧客セグメンテーション、データ圧縮
- **強化学習**: ゲームAI、ロボット制御、自動売買、推薦システムの最適化
- **自己教師あり学習**: 大量のラベルなしデータを活用した事前学習（NLP、画像認識）

## 参考文献

<AffiliateBanner site="ml_intro" />

- [scikit-learn: Supervised learning](https://scikit-learn.org/stable/supervised_learning.html)
- [scikit-learn: Unsupervised learning](https://scikit-learn.org/stable/unsupervised_learning.html)
- Sutton, R.S. & Barto, A.G. (2018). *Reinforcement Learning: An Introduction*. MIT Press.
