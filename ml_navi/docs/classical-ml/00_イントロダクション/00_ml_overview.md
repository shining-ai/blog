import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 機械学習とは

## 機械学習とは

機械学習とは、

> データから自動的にパターンやルールを学習し、新しいデータに対して予測や判断を行う技術

です。

従来のプログラミングでは「ルール → データ → 答え」という流れでしたが、機械学習では「データ + 答え → ルール」という逆の流れでアルゴリズムを構築します。

## AI・機械学習・深層学習の関係

AI（人工知能）・機械学習・深層学習は以下のような包含関係にあります。

```
AI（人工知能）
└── 機械学習（Machine Learning）
    └── 深層学習（Deep Learning）
```

| 用語 | 定義 | 例 |
|------|------|-----|
| AI（人工知能） | 人間の知的活動をコンピュータで再現する技術全般 | チェスAI、音声認識、ルールベースシステム |
| 機械学習 | データから自動的に学習するAIの手法 | 決定木、SVM、ランダムフォレスト |
| 深層学習 | 多層ニューラルネットワークを使った機械学習 | CNN、Transformer、GPT |

AIという概念は1950年代から存在しますが、機械学習はその中の一手法であり、深層学習はさらにその中の一手法です。近年「AI」と言う場合、多くの場合は機械学習や深層学習を指しています。

## 歴史的経緯

### 第1次AIブーム（1950〜1960年代）

アラン・チューリングが「機械は考えられるか？」という問いを立て、チューリングテストを提案しました。この時代のAIは主に論理と記号を使ったルールベースシステムでした。

### 第1次冬の時代（1970年代）

ルールベースアプローチの限界が明らかになり、研究が停滞しました。

### 第2次AIブーム（1980〜1990年代）

エキスパートシステムが実用化されました。バックプロパゲーションの発見により、ニューラルネットワークの研究も進みました。

### 第2次冬の時代（1990年代後半〜2000年代初頭）

エキスパートシステムの保守コストや汎化性能の問題から再び停滞しました。

### 第3次AIブーム（2006年〜現在）

Geoffrey Hintonらによる深層学習の復活、2012年のImageNetコンペティションでのCNNの圧勝、GPUによる大規模計算の実現、インターネットによる大量データの入手可能性が組み合わさり、爆発的な進歩を遂げています。

```python
# 機械学習の歴史的マイルストーン
milestones = {
    1950: "チューリングテストの提案",
    1957: "パーセプトロンの発明（Rosenblatt）",
    1986: "バックプロパゲーションの実用化（Rumelhart et al.）",
    1997: "Deep Blueがチェス世界王者に勝利",
    2006: "深層学習の復活（Hinton et al.）",
    2012: "AlexNetがImageNetで圧勝",
    2017: "Transformerの登場（Vaswani et al.）",
    2022: "ChatGPTの公開",
    2024: "マルチモーダルLLMの普及",
}

for year, event in milestones.items():
    print(f"{year}: {event}")
```

## ルールベースシステムとの違い

### ルールベースシステム

```python
# ルールベース: 人間がルールをすべて記述する
def classify_email_rule_based(email_text):
    """スパムメール判定（ルールベース）"""
    spam_keywords = ["無料", "当選", "お金", "緊急", "クリック"]
    
    for keyword in spam_keywords:
        if keyword in email_text:
            return "スパム"
    return "正常"

# 使用例
email1 = "無料でプレゼントが当選しました！"
email2 = "明日の会議の件でご連絡します。"

print(classify_email_rule_based(email1))  # スパム
print(classify_email_rule_based(email2))  # 正常
```

このアプローチの問題点：
- ルールが増えるにつれてメンテナンスが困難になる
- 想定外のパターンに対応できない
- ドメイン専門家が常に介入する必要がある

### 機械学習アプローチ

```python
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

# 機械学習: データからルールを自動学習する
train_emails = [
    "無料でプレゼントが当選しました",
    "お金が必要な方はクリック",
    "緊急のお知らせ、今すぐ確認",
    "明日の会議の件でご連絡します",
    "資料を添付しました、ご確認ください",
    "先日のプロジェクトについて相談があります",
]
train_labels = [1, 1, 1, 0, 0, 0]  # 1: スパム, 0: 正常

# パイプラインの構築と学習
model = Pipeline([
    ('vectorizer', CountVectorizer()),
    ('classifier', MultinomialNB()),
])
model.fit(train_emails, train_labels)

# 予測
test_emails = [
    "無料のお試しキャンペーン実施中",
    "来週の打ち合わせ日程について",
]
predictions = model.predict(test_emails)
for email, pred in zip(test_emails, predictions):
    label = "スパム" if pred == 1 else "正常"
    print(f"[{label}] {email}")
```

| 比較項目 | ルールベース | 機械学習 |
|---------|------------|---------|
| ルール作成 | 人間が手動で記述 | データから自動学習 |
| 専門知識 | ドメイン専門家が必要 | データがあれば対応可能 |
| 保守性 | ルール増加で困難 | データ追加で更新可能 |
| 未知パターン | 対応困難 | 汎化して対応可能 |
| 透明性 | 高い（ルールが明示的） | 低い場合がある |
| 適用範囲 | 明確なルールがある問題 | パターンが複雑な問題 |

## 機械学習が得意なこと・苦手なこと

### 得意なこと

- 大量データからのパターン認識（画像認識、音声認識）
- 複雑な非線形関係のモデリング
- 時系列データの予測（株価、気象）
- テキストの分類・生成

### 苦手なこと

- 少量データからの学習
- 因果関係の推定（相関は学習できても因果は難しい）
- 完全な説明可能性の保証
- 学習データ外の完全に新しいパターンへの対応

```python
# 機械学習の基本的なワークフロー
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score

# 1. データの準備
np.random.seed(42)
X = np.random.randn(200, 2)
y = (X[:, 0] + X[:, 1] > 0).astype(int)

# 2. 訓練データとテストデータに分割
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# 3. モデルの学習
model = LogisticRegression()
model.fit(X_train, y_train)

# 4. 評価
y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)
print(f"精度: {accuracy:.3f}")

# 5. 新しいデータへの適用
new_data = np.array([[1.5, 0.5], [-1.0, -1.0]])
predictions = model.predict(new_data)
print(f"予測結果: {predictions}")
```

## 使用場面

- **自然言語処理**: テキスト分類、感情分析、機械翻訳、チャットボット
- **コンピュータビジョン**: 画像認識、物体検出、医療画像診断
- **推薦システム**: Eコマース、動画配信サービス、音楽配信
- **金融**: 信用スコアリング、不正検知、株価予測
- **ヘルスケア**: 疾患予測、創薬、個別化医療
- **製造業**: 品質管理、予知保全、需要予測

## 参考文献

<AffiliateBanner site="ml_intro" />

- [scikit-learn documentation](https://scikit-learn.org/stable/)
- Bishop, C.M. (2006). *Pattern Recognition and Machine Learning*. Springer.
- Mitchell, T. (1997). *Machine Learning*. McGraw-Hill.
