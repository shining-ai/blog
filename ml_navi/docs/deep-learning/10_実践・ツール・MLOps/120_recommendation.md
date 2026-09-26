import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 推薦システム

## 推薦システムとは

> 推薦システム（Recommendation System）とは、ユーザーの過去の行動・嗜好・属性情報をもとに、そのユーザーが興味を持つと思われるアイテムを自動的に提示するシステム。EC・動画配信・音楽・ニュース等のサービスで中心的な役割を担う。

| アプローチ | 原理 | 強み | 弱み |
|-----------|------|------|------|
| 協調フィルタリング | 似たユーザー／アイテムの評価を利用 | シンプル・汎用性高い | コールドスタート問題 |
| コンテンツベース | アイテムの特徴を利用 | 新規アイテムに対応 | 多様性が低い |
| 行列分解（MF） | 評価行列を低ランク分解 | スパース評価に強い | 計算コスト |
| 深層学習ベース | ニューラルネットワークで特徴抽出 | 非線形パターンの学習 | 解釈性が低い |
| ハイブリッド | 複数手法の組み合わせ | 総合的な精度 | 複雑性が高い |

---

## 協調フィルタリング

### ユーザーベース協調フィルタリング

```python
import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity

# 評価行列（行: ユーザー、列: アイテム、0 = 未評価）
ratings = np.array([
    [5, 4, 0, 1, 0],
    [4, 0, 0, 1, 2],
    [0, 0, 5, 4, 0],
    [0, 1, 4, 5, 3],
    [2, 1, 0, 0, 4],
])
users  = [f"U{i+1}" for i in range(5)]
items  = [f"I{j+1}" for j in range(5)]
df_ratings = pd.DataFrame(ratings, index=users, columns=items)

def user_based_cf(ratings_df: pd.DataFrame, target_user: str,
                  top_k_users: int = 2, top_k_items: int = 3) -> pd.Series:
    """ユーザーベース協調フィルタリング"""
    mat = ratings_df.values.astype(float)
    # コサイン類似度（未評価は 0 として計算）
    sim_matrix = cosine_similarity(mat)
    sim_df = pd.DataFrame(sim_matrix, index=ratings_df.index, columns=ratings_df.index)

    target_idx = ratings_df.index.get_loc(target_user)
    target_row  = ratings_df.loc[target_user]

    # 類似度の高い上位 K ユーザーを選択（自分を除く）
    sim_scores = sim_df[target_user].drop(target_user).sort_values(ascending=False)
    top_users  = sim_scores.head(top_k_users).index

    # 未評価アイテムへのスコアを計算
    unrated_items = target_row[target_row == 0].index
    scores = {}
    for item in unrated_items:
        weighted_sum = 0.0
        sim_sum      = 0.0
        for user in top_users:
            if ratings_df.loc[user, item] > 0:
                weighted_sum += sim_scores[user] * ratings_df.loc[user, item]
                sim_sum      += sim_scores[user]
        if sim_sum > 0:
            scores[item] = weighted_sum / sim_sum

    return pd.Series(scores).sort_values(ascending=False).head(top_k_items)

recommendations = user_based_cf(df_ratings, target_user="U1")
print("U1 への推薦:")
print(recommendations)
```

### アイテムベース協調フィルタリング

```python
def item_based_cf(ratings_df: pd.DataFrame, target_user: str,
                  top_k_items: int = 3) -> pd.Series:
    """アイテムベース協調フィルタリング"""
    # アイテム間のコサイン類似度
    item_sim = cosine_similarity(ratings_df.T.values.astype(float))
    item_sim_df = pd.DataFrame(item_sim, index=ratings_df.columns,
                               columns=ratings_df.columns)

    target_row    = ratings_df.loc[target_user]
    rated_items   = target_row[target_row > 0].index
    unrated_items = target_row[target_row == 0].index

    scores = {}
    for unrated in unrated_items:
        sim_scores   = item_sim_df[unrated][rated_items]
        rated_values = target_row[rated_items]
        if sim_scores.sum() > 0:
            scores[unrated] = (sim_scores * rated_values).sum() / sim_scores.sum()

    return pd.Series(scores).sort_values(ascending=False).head(top_k_items)

print("アイテムベース推薦（U3）:")
print(item_based_cf(df_ratings, target_user="U3"))
```

---

## コンテンツベースフィルタリング

```python
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity as cos_sim

# 映画メタデータの例
movies = pd.DataFrame({
    "title":       ["Action Hero", "Love Story", "Sci-Fi Adventure",
                    "Romantic Comedy", "Space War"],
    "description": [
        "action fight hero battle explosion martial arts",
        "love romance couple drama emotional",
        "space science adventure explore alien technology",
        "romance comedy funny relationship cute",
        "space battle war hero fight starship",
    ]
})

# TF-IDF で特徴ベクトルを作成
tfidf = TfidfVectorizer(stop_words="english")
tfidf_matrix = tfidf.fit_transform(movies["description"])

# アイテム間の類似度
content_sim = cos_sim(tfidf_matrix)

def content_based_recommend(title: str, top_k: int = 3) -> pd.DataFrame:
    idx = movies[movies["title"] == title].index[0]
    sim_scores = list(enumerate(content_sim[idx]))
    sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
    # 自分自身を除く
    top_indices = [i for i, _ in sim_scores[1:top_k+1]]
    return movies.iloc[top_indices][["title"]].assign(
        similarity=[s for _, s in sim_scores[1:top_k+1]]
    )

print(content_based_recommend("Action Hero"))
```

---

## 行列分解（SVD）

```python
from scipy.sparse.linalg import svds
from scipy.sparse import csr_matrix
import numpy as np

def matrix_factorization_svd(ratings_matrix: np.ndarray,
                               n_factors: int = 3) -> np.ndarray:
    """SVD による行列分解で評価行列を復元"""
    # ユーザーごとの平均評価を引いて中心化
    mask = ratings_matrix > 0
    user_means = np.where(mask.any(axis=1, keepdims=True),
                          ratings_matrix.sum(axis=1, keepdims=True) / mask.sum(axis=1, keepdims=True),
                          0)
    R_demeaned = np.where(mask, ratings_matrix - user_means, 0)

    # SVD 分解（k: 潜在因子数）
    U, sigma, Vt = svds(csr_matrix(R_demeaned), k=n_factors)
    sigma_diag    = np.diag(sigma)

    # 全評価の予測値
    R_pred = np.dot(np.dot(U, sigma_diag), Vt) + user_means
    return np.clip(R_pred, 1, 5)  # 評価範囲 [1, 5] にクリップ

R_pred = matrix_factorization_svd(ratings, n_factors=3)
pred_df = pd.DataFrame(R_pred, index=users, columns=items)

# 未評価アイテムのみ推薦スコアとして使う
def recommend_svd(pred_df: pd.DataFrame, ratings_df: pd.DataFrame,
                  user: str, top_k: int = 3) -> pd.Series:
    preds = pred_df.loc[user]
    already_rated = ratings_df.loc[user][ratings_df.loc[user] > 0].index
    return preds.drop(already_rated).sort_values(ascending=False).head(top_k)

print("SVD 推薦（U1）:")
print(recommend_svd(pred_df, df_ratings, "U1"))
```

---

## 深層学習ベース推薦（NCF）

Neural Collaborative Filtering（NCF）はユーザー・アイテムの埋め込みと MLP を組み合わせた手法。

```python
import torch
import torch.nn as nn

class NeuralCollaborativeFiltering(nn.Module):
    def __init__(self, num_users: int, num_items: int,
                 embed_dim: int = 32, hidden_dims: list = None):
        super().__init__()
        if hidden_dims is None:
            hidden_dims = [64, 32, 16]

        # GMF（Generalized Matrix Factorization）部分
        self.gmf_user_emb = nn.Embedding(num_users, embed_dim)
        self.gmf_item_emb = nn.Embedding(num_items, embed_dim)

        # MLP 部分
        self.mlp_user_emb = nn.Embedding(num_users, embed_dim)
        self.mlp_item_emb = nn.Embedding(num_items, embed_dim)

        mlp_layers = []
        in_dim = embed_dim * 2
        for out_dim in hidden_dims:
            mlp_layers += [nn.Linear(in_dim, out_dim), nn.ReLU()]
            in_dim = out_dim
        self.mlp = nn.Sequential(*mlp_layers)

        # 最終予測層（GMF + MLP を結合）
        self.output = nn.Linear(embed_dim + hidden_dims[-1], 1)
        self.sigmoid = nn.Sigmoid()
        self._init_weights()

    def _init_weights(self):
        for emb in [self.gmf_user_emb, self.gmf_item_emb,
                    self.mlp_user_emb, self.mlp_item_emb]:
            nn.init.normal_(emb.weight, std=0.01)

    def forward(self, user_ids: torch.Tensor,
                item_ids: torch.Tensor) -> torch.Tensor:
        # GMF パス
        gmf_u = self.gmf_user_emb(user_ids)
        gmf_i = self.gmf_item_emb(item_ids)
        gmf_out = gmf_u * gmf_i                        # element-wise 積

        # MLP パス
        mlp_u = self.mlp_user_emb(user_ids)
        mlp_i = self.mlp_item_emb(item_ids)
        mlp_out = self.mlp(torch.cat([mlp_u, mlp_i], dim=-1))

        # 結合して予測
        concat = torch.cat([gmf_out, mlp_out], dim=-1)
        return self.sigmoid(self.output(concat)).squeeze(-1)

# インスタンス化と動作確認
ncf = NeuralCollaborativeFiltering(num_users=100, num_items=500)
u_ids = torch.randint(0, 100, (16,))
i_ids = torch.randint(0, 500, (16,))
scores = ncf(u_ids, i_ids)
print(scores.shape)   # torch.Size([16])
print(scores[:5])
```

---

## 使用場面

- EC サイトの「この商品を買った人はこんな商品も買っています」
- 動画・音楽ストリーミングサービスのコンテンツ推薦
- ニュースアプリの記事パーソナライズ
- 求人マッチングプラットフォーム
- 広告ターゲティングシステム

---

## 参考文献

- [Surprise ライブラリ（協調フィルタリング）](https://surpriselib.com/)
- [RecBole 推薦システムフレームワーク](https://recbole.io/)
- [Neural Collaborative Filtering 論文（He et al., 2017）](https://arxiv.org/abs/1708.05031)

<AffiliateBanner site="ml_intro" />
