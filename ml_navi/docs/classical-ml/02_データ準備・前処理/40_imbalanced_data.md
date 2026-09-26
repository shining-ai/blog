import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 不均衡データへの対処

詐欺検知・疾患診断・機器故障予測など、実務の分類タスクではクラスが極端に偏っていることが多い。99% が正常・1% が異常というデータに対して「すべて正常」と予測するだけで精度 99% を達成できてしまうが、これは意味のあるモデルではない。本記事では不均衡データの本質と対処法を解説する。

## 不均衡データとは

> **不均衡データ（Imbalanced Data）** とは、分類タスクにおいてクラスごとのサンプル数が著しく異なるデータセットを指す。少数クラスを「マイノリティクラス」、多数クラスを「マジョリティクラス」と呼ぶ。不均衡比率が 1:10 を超えると問題が顕在化し始め、1:100 以上では特別な対処が不可欠になる。

---

## 不均衡データの問題

```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.datasets import make_classification
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (classification_report, confusion_matrix,
                              roc_auc_score, average_precision_score)
from sklearn.model_selection import train_test_split
from imblearn.over_sampling import SMOTE, RandomOverSampler, ADASYN
from imblearn.under_sampling import RandomUnderSampler, TomekLinks, EditedNearestNeighbours
from imblearn.combine import SMOTETomek
from imblearn.pipeline import Pipeline as ImbPipeline

np.random.seed(42)

# 不均衡データの作成（比率 1:50）
X, y = make_classification(
    n_samples=5100,
    n_features=20,
    n_informative=10,
    n_redundant=5,
    weights=[0.98, 0.02],
    flip_y=0,
    random_state=42
)

print(f"クラス分布: {np.bincount(y)}")
print(f"不均衡比率: {np.bincount(y)[0] / np.bincount(y)[1]:.1f}:1")
```

```python
# 何も対策しないモデルの問題点
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

clf_naive = LogisticRegression(random_state=42, max_iter=1000)
clf_naive.fit(X_train, y_train)
y_pred_naive = clf_naive.predict(X_test)

print("\n=== 対策なしのモデル ===")
print(classification_report(y_test, y_pred_naive, target_names=['正常', '異常']))
print(f"AUC-ROC: {roc_auc_score(y_test, clf_naive.predict_proba(X_test)[:, 1]):.4f}")
# 正確度は高いが、少数クラスの再現率が極めて低い
```

---

## 方法1: オーバーサンプリング

少数クラスのサンプルを増やすことでバランスを取る。

### ランダムオーバーサンプリング

```python
ros = RandomOverSampler(random_state=42)
X_ros, y_ros = ros.fit_resample(X_train, y_train)
print(f"ROS後クラス分布: {np.bincount(y_ros)}")

clf_ros = LogisticRegression(random_state=42, max_iter=1000)
clf_ros.fit(X_ros, y_ros)
y_pred_ros = clf_ros.predict(X_test)

print(classification_report(y_test, y_pred_ros, target_names=['正常', '異常']))
```

### SMOTE（Synthetic Minority Over-sampling Technique）

少数クラスの近傍サンプルを補間して人工的に新サンプルを生成する。

```python
smote = SMOTE(
    sampling_strategy='minority',  # 少数クラスを多数クラスと同数に
    k_neighbors=5,
    random_state=42
)
X_smote, y_smote = smote.fit_resample(X_train, y_train)
print(f"SMOTE後クラス分布: {np.bincount(y_smote)}")

clf_smote = LogisticRegression(random_state=42, max_iter=1000)
clf_smote.fit(X_smote, y_smote)
y_pred_smote = clf_smote.predict(X_test)

print(classification_report(y_test, y_pred_smote, target_names=['正常', '異常']))
```

### ADASYN（Adaptive Synthetic Sampling）

学習が難しいサンプルの周辺により多くの合成サンプルを生成する。

```python
adasyn = ADASYN(sampling_strategy='minority', random_state=42)
X_ada, y_ada = adasyn.fit_resample(X_train, y_train)
print(f"ADASYN後クラス分布: {np.bincount(y_ada)}")

clf_ada = LogisticRegression(random_state=42, max_iter=1000)
clf_ada.fit(X_ada, y_ada)
y_pred_ada = clf_ada.predict(X_test)

print(classification_report(y_test, y_pred_ada, target_names=['正常', '異常']))
```

---

## 方法2: アンダーサンプリング

多数クラスのサンプルを減らすことでバランスを取る。

### ランダムアンダーサンプリング

```python
rus = RandomUnderSampler(sampling_strategy='majority', random_state=42)
X_rus, y_rus = rus.fit_resample(X_train, y_train)
print(f"RUS後クラス分布: {np.bincount(y_rus)}")

clf_rus = LogisticRegression(random_state=42, max_iter=1000)
clf_rus.fit(X_rus, y_rus)
y_pred_rus = clf_rus.predict(X_test)

print(classification_report(y_test, y_pred_rus, target_names=['正常', '異常']))
```

### Tomek Links

境界付近の多数クラスサンプルを削除し、決定境界を鮮明にする。

```python
tomek = TomekLinks(sampling_strategy='majority')
X_tomek, y_tomek = tomek.fit_resample(X_train, y_train)
print(f"TomekLinks後クラス分布: {np.bincount(y_tomek)}")
# 完全なバランスは取れないが、境界が明確になる
```

---

## 方法3: 組み合わせ手法（SMOTETomek）

SMOTE でオーバーサンプリングした後、Tomek Links でノイズを除去する。

```python
smt = SMOTETomek(
    smote=SMOTE(k_neighbors=5, random_state=42),
    tomek=TomekLinks(sampling_strategy='majority'),
    random_state=42
)
X_smt, y_smt = smt.fit_resample(X_train, y_train)
print(f"SMOTETomek後クラス分布: {np.bincount(y_smt)}")

clf_smt = LogisticRegression(random_state=42, max_iter=1000)
clf_smt.fit(X_smt, y_smt)
y_pred_smt = clf_smt.predict(X_test)

print(classification_report(y_test, y_pred_smt, target_names=['正常', '異常']))
```

---

## 方法4: クラス重み付け（Class Weight）

サンプルを増減させず、損失関数で少数クラスに大きな重みをかける。

```python
# class_weight='balanced' で自動的に逆頻度の重みを設定
clf_weighted = LogisticRegression(
    class_weight='balanced',
    random_state=42,
    max_iter=1000
)
clf_weighted.fit(X_train, y_train)
y_pred_weighted = clf_weighted.predict(X_test)

print("=== クラス重み付き ===")
print(classification_report(y_test, y_pred_weighted, target_names=['正常', '異常']))

# 手動での重み設定
from sklearn.utils.class_weight import compute_class_weight
class_weights = compute_class_weight('balanced', classes=np.unique(y_train), y=y_train)
weight_dict = dict(zip(np.unique(y_train), class_weights))
print(f"\n自動計算されたクラス重み: {weight_dict}")
```

---

## 方法5: 閾値の調整

デフォルトの閾値 0.5 を変更し、少数クラスの検出感度を上げる。

```python
from sklearn.metrics import precision_recall_curve

clf_base = LogisticRegression(random_state=42, max_iter=1000)
clf_base.fit(X_train, y_train)
y_prob = clf_base.predict_proba(X_test)[:, 1]

# Precision-Recall カーブで最適閾値を探す
precisions, recalls, thresholds = precision_recall_curve(y_test, y_prob)
f1_scores = 2 * precisions * recalls / (precisions + recalls + 1e-10)
best_idx = np.argmax(f1_scores)
best_threshold = thresholds[best_idx]

print(f"最適閾値: {best_threshold:.4f} (F1={f1_scores[best_idx]:.4f})")

# 最適閾値で予測
y_pred_opt = (y_prob >= best_threshold).astype(int)
print("\n=== 最適閾値での結果 ===")
print(classification_report(y_test, y_pred_opt, target_names=['正常', '異常']))
```

---

## 各手法の比較

```python
def evaluate_method(name: str, y_true: np.ndarray, y_pred: np.ndarray, y_prob: np.ndarray) -> dict:
    """各手法の評価指標をまとめる"""
    from sklearn.metrics import f1_score, recall_score, precision_score
    return {
        '手法': name,
        'AUC-ROC':    round(roc_auc_score(y_true, y_prob), 4),
        'AP':         round(average_precision_score(y_true, y_prob), 4),
        'F1(少数)':   round(f1_score(y_true, y_pred, pos_label=1), 4),
        'Recall(少数)': round(recall_score(y_true, y_pred, pos_label=1), 4),
        'Prec(少数)': round(precision_score(y_true, y_pred, pos_label=1), 4),
    }


# 各モデルの確率スコアを取得
results = [
    evaluate_method('なし',           y_test, y_pred_naive,   clf_naive.predict_proba(X_test)[:, 1]),
    evaluate_method('ROS',            y_test, y_pred_ros,     clf_ros.predict_proba(X_test)[:, 1]),
    evaluate_method('SMOTE',          y_test, y_pred_smote,   clf_smote.predict_proba(X_test)[:, 1]),
    evaluate_method('RUS',            y_test, y_pred_rus,     clf_rus.predict_proba(X_test)[:, 1]),
    evaluate_method('クラス重み',     y_test, y_pred_weighted, clf_weighted.predict_proba(X_test)[:, 1]),
    evaluate_method('SMOTETomek',     y_test, y_pred_smt,     clf_smt.predict_proba(X_test)[:, 1]),
]

results_df = pd.DataFrame(results)
print(results_df.to_string(index=False))
```

---

## imblearn Pipeline の活用

Cross-validation 内でリサンプリングを行い、データリークを防ぐ。

```python
from imblearn.pipeline import Pipeline as ImbPipeline
from sklearn.model_selection import StratifiedKFold, cross_validate

pipeline = ImbPipeline([
    ('smote',      SMOTE(random_state=42)),
    ('classifier', LogisticRegression(random_state=42, max_iter=1000)),
])

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
cv_results = cross_validate(
    pipeline, X, y, cv=cv,
    scoring=['roc_auc', 'average_precision', 'f1'],
    return_train_score=False
)

for metric, scores in cv_results.items():
    if metric.startswith('test_'):
        print(f"{metric}: {scores.mean():.4f} ± {scores.std():.4f}")
```

---

## 手法の選択指針

| 状況 | 推奨手法 |
|------|---------|
| 不均衡比率 < 10:1 | クラス重み付け |
| 不均衡比率 10〜100:1 | SMOTE + クラス重み |
| 不均衡比率 > 100:1 | SMOTETomek + 閾値調整 |
| データ量が少ない | オーバーサンプリング（削除したくない） |
| データ量が多い | アンダーサンプリング（計算効率が上がる） |
| 誤検知コストが高い | Precision 重視 → 閾値を上げる |
| 見逃しコストが高い | Recall 重視 → 閾値を下げる |

---

## 使用場面

- **医療診断**: 疾患の陽性率は低い（1% 未満）ことが多く、見逃しのコストが高い
- **詐欺検知**: 不正取引は全体の 0.1% 以下であることが多い
- **故障予測**: 設備の故障率は低い一方、見逃すと多大なコストが生じる
- **異常検知**: 正常なデータが圧倒的に多い状況での二値分類

---

## 参考文献

- Chawla, N. V., et al. (2002). SMOTE: Synthetic Minority Over-sampling Technique. *JAIR*, 16, 321-357.
- Lemaître, G., Nogueira, F., & Aridas, C. K. (2017). Imbalanced-learn: A Python Toolbox. *JMLR*, 18(17), 1-5.
- imbalanced-learn documentation. https://imbalanced-learn.org/stable/

<AffiliateBanner site="ml_intro" />
