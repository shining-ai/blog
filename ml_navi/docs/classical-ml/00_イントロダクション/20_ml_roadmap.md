import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 機械学習の学習ロードマップ

## このサイトの構成とは

このサイトの構成とは、

> 機械学習を体系的・効率的に学ぶための、トピックの依存関係を考慮した順序立てた学習ガイド

です。

数学的基礎から始まり、古典的機械学習、深層学習、応用分野へと段階的に学べる構成になっています。

## このサイトの読み方

### カテゴリ構成

本サイトは以下のカテゴリに分かれています。

| カテゴリ | 内容 | 難易度 |
|---------|------|--------|
| **古典的機械学習** | 数学基礎・前処理・モデル評価・教師あり/なし学習 | ★★☆〜★★★ |
| **深層学習・応用** | NN基礎・CNN・Transformer・NLP・強化学習・MLOps | ★★★〜★★★★ |

### 記事の読み方

各記事は以下の構成になっています。

1. **概念の定義** — その技術が何か、なぜ重要かを説明
2. **理論** — 数式やアルゴリズムの仕組み
3. **Pythonコード** — 実際に動かせるコード例
4. **使用場面** — 実際にどんな時に使うか
5. **参考文献** — さらに深く学ぶためのリソース

コード例は `scikit-learn`、`numpy`、`matplotlib` を中心に書かれており、Google Colabなどのクラウド環境でそのまま実行できます。

## 全体マップ

```
[数学的基礎]
├── ベクトルと行列
├── 行列の演算と性質
├── 微分と勾配
├── 最適化の基礎
├── 確率と統計の基礎
└── 情報理論の基礎
        ↓
[データ準備・前処理]
├── 探索的データ分析（EDA）
├── 欠損値・外れ値処理
├── 特徴量エンジニアリング
└── 特徴量スケーリング
        ↓
[モデル評価・選択]
├── 交差検証
├── 回帰の評価指標
├── 分類の評価指標
└── ハイパーパラメータチューニング
        ↓
[教師あり学習]              [教師なし学習]
├── 線形回帰                ├── K-meansクラスタリング
├── ロジスティック回帰       ├── 階層的クラスタリング
├── 決定木・ランダムフォレスト ├── PCA
├── 勾配ブースティング       ├── t-SNE・UMAP
└── SVM                    └── 異常検知
        ↓
[深層学習・応用]
├── ニューラルネットワーク基礎
├── CNN
├── RNN・LSTM
├── Transformer・BERT・GPT
├── 強化学習
└── MLOps・実践
```

## 推奨学習パス

### パス 1: 入門者向け（機械学習を初めて学ぶ方）

目安期間: 2〜3ヶ月

```
Week 1-2: 数学的基礎
  └── ベクトルと行列 → 確率と統計の基礎

Week 3-4: データの扱い方
  └── EDA → 欠損値処理 → 特徴量エンジニアリング

Week 5-6: 基礎的なモデル
  └── 線形回帰 → ロジスティック回帰 → モデル評価

Week 7-8: 発展的なモデル
  └── 決定木 → ランダムフォレスト → 勾配ブースティング

Week 9-12: 教師なし学習と実践
  └── K-means → PCA → Kaggleに挑戦
```

```python
# 入門者向けの最初のコード例
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report

# データのロード
iris = load_iris()
X, y = iris.data, iris.target
feature_names = iris.feature_names
target_names = iris.target_names

print(f"データ形状: {X.shape}")
print(f"特徴量: {feature_names}")
print(f"クラス: {target_names}")

# データの分割
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# スケーリング
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# モデルの学習と評価
model = LogisticRegression(max_iter=200, random_state=42)
model.fit(X_train_scaled, y_train)

y_pred = model.predict(X_test_scaled)
print("\n分類レポート:")
print(classification_report(y_test, y_pred, target_names=target_names))
```

### パス 2: 深層学習パス

前提: 入門者向けパスの完了、またはそれ相当の知識

目安期間: 3〜4ヶ月

```
Step 1: 数学的基礎の強化
  └── 微分と勾配 → 最適化の基礎 → 情報理論

Step 2: ニューラルネットワーク基礎
  └── MLP → 活性化関数 → バックプロパゲーション

Step 3: 主要アーキテクチャ
  └── CNN → RNN/LSTM → Transformer

Step 4: 実践
  └── PyTorch入門 → ファインチューニング → MLOps
```

```python
# 深層学習パスの到達目標イメージ
import torch
import torch.nn as nn

class SimpleMLP(nn.Module):
    """シンプルな多層パーセプトロン"""
    def __init__(self, input_dim, hidden_dim, output_dim):
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, output_dim)
        )
    
    def forward(self, x):
        return self.network(x)

# モデルの概要確認
model = SimpleMLP(input_dim=10, hidden_dim=64, output_dim=3)
print(model)
print(f"\nパラメータ数: {sum(p.numel() for p in model.parameters()):,}")
```

### パス 3: NLP（自然言語処理）パス

前提: 深層学習パスの Step 2 まで完了

目安期間: 2〜3ヶ月

```
Step 1: テキストの前処理
  └── トークン化 → Embedding → Word2Vec

Step 2: 系列モデル
  └── RNN → LSTM → Attention機構

Step 3: Transformerベースモデル
  └── Transformer → BERT → GPT

Step 4: 実践応用
  └── テキスト分類 → 固有表現認識 → RAG → LLMのファインチューニング
```

### パス 4: 強化学習パス

前提: 深層学習パスの完了

目安期間: 2〜3ヶ月

```
Step 1: 強化学習の基礎
  └── MDP → Q学習 → 方策反復

Step 2: 深層強化学習
  └── DQN → A3C → PPO

Step 3: 応用
  └── ゲームAI → ロボット制御 → LLMのRLHF
```

### パス 5: 実務向けパス

前提: 入門者向けパスの完了

目安期間: 2〜3ヶ月

```
Step 1: データエンジニアリング
  └── pandas/SQL → 特徴量ストア → データパイプライン

Step 2: MLOps
  └── 実験管理（MLflow）→ モデルのデプロイ → 監視・運用

Step 3: 実践スキル
  └── Kaggle → 業務データでの実装 → A/Bテスト設計
```

```python
# 実務で頻繁に使うパターン例
import pandas as pd
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import cross_val_score

# サンプルデータ
np.random.seed(42)
n_samples = 1000

data = pd.DataFrame({
    'age': np.random.randint(18, 70, n_samples),
    'income': np.random.exponential(50000, n_samples),
    'job_type': np.random.choice(['正社員', '契約社員', 'アルバイト'], n_samples),
    'region': np.random.choice(['東京', '大阪', 'その他'], n_samples),
    'churn': np.random.binomial(1, 0.3, n_samples),  # 目的変数
})

X = data.drop('churn', axis=1)
y = data['churn']

# 数値特徴量とカテゴリ特徴量の分割
numeric_features = ['age', 'income']
categorical_features = ['job_type', 'region']

# 前処理パイプライン
preprocessor = ColumnTransformer([
    ('num', StandardScaler(), numeric_features),
    ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features),
])

# モデルパイプライン
pipeline = Pipeline([
    ('preprocessor', preprocessor),
    ('classifier', GradientBoostingClassifier(random_state=42)),
])

# 交差検証
scores = cross_val_score(pipeline, X, y, cv=5, scoring='roc_auc')
print(f"CV ROC-AUC: {scores.mean():.3f} (+/- {scores.std()*2:.3f})")
```

## 前提知識と到達目標

### 最低限必要な前提知識

| 知識 | 詳細 |
|------|------|
| Python の基礎 | 変数・関数・クラス・リスト内包表記 |
| NumPy の基礎 | 配列操作・ブロードキャスト |
| pandas の基礎 | DataFrame の操作・フィルタリング |
| 高校数学 | 微積分・線形代数・確率・統計の基礎概念 |

### 各パスの到達目標

| パス | 到達目標 |
|------|---------|
| 入門者向け | Kaggleの入門コンペで銅メダル相当の結果を出せる |
| 深層学習 | PyTorchでCNNを実装し画像分類できる |
| NLP | BERTをファインチューニングしてテキスト分類できる |
| 強化学習 | CartPoleをPPOで解けるエージェントを実装できる |
| 実務向け | 業務データで機械学習パイプラインを本番運用できる |

## 使用場面

- このロードマップは機械学習を体系的に学びたい方の学習計画立案に活用してください
- 自分の目標（データサイエンティスト、MLエンジニア、研究者）に合わせてパスを選択してください
- 各記事の「参考文献」セクションには書籍・論文・公式ドキュメントを掲載しており、より深い理解に役立ちます

## 参考文献

<AffiliateBanner site="ml_intro" />

- [scikit-learn documentation](https://scikit-learn.org/stable/)
- [PyTorch tutorials](https://pytorch.org/tutorials/)
- [fast.ai](https://www.fast.ai/)
- 斎藤康毅 (2016). *ゼロから作るDeep Learning*. オライリー・ジャパン.
