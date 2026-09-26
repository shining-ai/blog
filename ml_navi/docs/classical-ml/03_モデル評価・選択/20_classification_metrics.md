import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 分類の評価指標

「精度（Accuracy）が 95% のモデルを作りました」という報告が必ずしも良いニュースとは限らない。不均衡データでは、すべてのサンプルを多数クラスと予測するだけで高い精度が得られてしまう。本記事では、分類モデルの性能を多角的に評価するための指標を解説する。

## 分類の評価指標とは

> 分類の評価指標とは、予測ラベルと真のラベルを比較し、モデルの性能を定量化する尺度の総称である。タスクの目的（見逃しを最小化したいか、誤報を最小化したいかなど）に応じて、適切な指標を選択することが重要である。

---

## 混同行列（Confusion Matrix）

すべての分類指標の基礎となる表。予測と実際の値の対応を4つのセルで表す。

```python
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    confusion_matrix, ConfusionMatrixDisplay,
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, average_precision_score,
    roc_curve, precision_recall_curve,
    classification_report
)

np.random.seed(42)

# サンプルデータ
data = load_breast_cancer()
X, y = data.data, data.target

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

clf = Pipeline([
    ('scaler', StandardScaler()),
    ('clf',    LogisticRegression(random_state=42, max_iter=1000)),
])
clf.fit(X_train, y_train)

y_pred  = clf.predict(X_test)
y_prob  = clf.predict_proba(X_test)[:, 1]
```

```python
def plot_confusion_matrix(y_true, y_pred, class_names=None, title='混同行列'):
    """混同行列を可視化する"""
    cm = confusion_matrix(y_true, y_pred)
    disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=class_names)

    fig, ax = plt.subplots(figsize=(6, 5))
    disp.plot(ax=ax, cmap='Blues', colorbar=True)
    ax.set_title(title)

    # 各セルの意味を注釈
    if cm.shape == (2, 2):
        labels = [['TN\n(真陰性)', 'FP\n(偽陽性)'],
                  ['FN\n(偽陰性)', 'TP\n(真陽性)']]
        for i in range(2):
            for j in range(2):
                ax.text(j, i + 0.35, labels[i][j], ha='center', va='center',
                        fontsize=8, color='gray')

    plt.tight_layout()
    plt.savefig('confusion_matrix.png', bbox_inches='tight')
    plt.show()

    tn, fp, fn, tp = cm.ravel()
    print(f"TP={tp}, FP={fp}, FN={fn}, TN={tn}")
    return tn, fp, fn, tp


tn, fp, fn, tp = plot_confusion_matrix(y_test, y_pred,
                                        class_names=data.target_names)
```

**混同行列の用語:**

| 用語 | 意味 |
|------|------|
| TP（True Positive） | 陽性と予測し、実際も陽性 |
| TN（True Negative） | 陰性と予測し、実際も陰性 |
| FP（False Positive） | 陽性と予測したが、実際は陰性（偽アラーム） |
| FN（False Negative） | 陰性と予測したが、実際は陽性（見逃し） |

---

## 基本的な分類指標

```python
def compute_all_metrics(tn, fp, fn, tp):
    """混同行列から主要な分類指標を計算する"""
    metrics = {}

    # 精度（Accuracy）
    metrics['Accuracy']    = (tp + tn) / (tp + tn + fp + fn)

    # 適合率（Precision）: 陽性と予測したうち実際に陽性の割合
    metrics['Precision']   = tp / (tp + fp) if (tp + fp) > 0 else 0

    # 再現率（Recall / Sensitivity / TPR）: 実際の陽性のうち陽性と予測できた割合
    metrics['Recall']      = tp / (tp + fn) if (tp + fn) > 0 else 0

    # 特異度（Specificity / TNR）: 実際の陰性のうち陰性と予測できた割合
    metrics['Specificity'] = tn / (tn + fp) if (tn + fp) > 0 else 0

    # F1 スコア
    p, r = metrics['Precision'], metrics['Recall']
    metrics['F1']          = 2 * p * r / (p + r) if (p + r) > 0 else 0

    # Fβ スコア（β=2: 再現率を重視）
    beta = 2
    metrics['F2']          = (1 + beta**2) * p * r / (beta**2 * p + r) if (beta**2 * p + r) > 0 else 0

    # 偽陽性率（FPR）
    metrics['FPR']         = fp / (fp + tn) if (fp + tn) > 0 else 0

    # MCC（Matthews Correlation Coefficient）: 不均衡データに強い指標
    denom = np.sqrt((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn))
    metrics['MCC']         = (tp * tn - fp * fn) / denom if denom > 0 else 0

    return metrics


metrics = compute_all_metrics(tn, fp, fn, tp)
print("分類指標:")
for name, value in metrics.items():
    print(f"  {name:12s}: {value:.4f}")
```

```python
# sklearn を使った一括出力
print("\n分類レポート:")
print(classification_report(y_test, y_pred, target_names=data.target_names))
```

---

## ROC 曲線と AUC

ROC 曲線は、閾値を変化させながら TPR（再現率）対 FPR をプロットしたもの。AUC（Area Under the Curve）は確率スコアの品質を表す。

```python
def plot_roc_curve(y_true, y_prob, model_name='モデル'):
    """ROC 曲線をプロットする"""
    fpr, tpr, thresholds = roc_curve(y_true, y_prob)
    auc = roc_auc_score(y_true, y_prob)

    # 最適閾値（Youden Index: TPR - FPR を最大化）
    youden_idx = np.argmax(tpr - fpr)
    opt_threshold = thresholds[youden_idx]

    fig, ax = plt.subplots(figsize=(7, 6))
    ax.plot(fpr, tpr, color='royalblue', linewidth=2,
            label=f'{model_name} (AUC = {auc:.4f})')
    ax.plot([0, 1], [0, 1], 'k--', linewidth=1, label='ランダム予測 (AUC=0.5)')
    ax.scatter(fpr[youden_idx], tpr[youden_idx], marker='*', s=200,
               color='red', zorder=5, label=f'最適閾値 = {opt_threshold:.3f}')

    ax.set_xlabel('偽陽性率（FPR）')
    ax.set_ylabel('真陽性率（TPR = 再現率）')
    ax.set_title('ROC 曲線')
    ax.legend()
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig('roc_curve.png', bbox_inches='tight')
    plt.show()

    print(f"AUC-ROC: {auc:.4f}")
    print(f"最適閾値: {opt_threshold:.4f} (TPR={tpr[youden_idx]:.4f}, FPR={fpr[youden_idx]:.4f})")
    return auc, opt_threshold


auc, opt_threshold = plot_roc_curve(y_test, y_prob)
```

---

## PR 曲線と AP

ROC 曲線は不均衡データで楽観的な評価になりやすい。不均衡データでは PR 曲線（Precision-Recall 曲線）の方が有益。

```python
def plot_pr_curve(y_true, y_prob, model_name='モデル'):
    """PR 曲線をプロットする"""
    precision, recall, thresholds = precision_recall_curve(y_true, y_prob)
    ap = average_precision_score(y_true, y_prob)
    baseline = y_true.mean()

    # F1 最大化閾値
    f1_scores = 2 * precision * recall / (precision + recall + 1e-10)
    best_idx = np.argmax(f1_scores[:-1])  # 最後の要素を除く
    best_threshold = thresholds[best_idx]

    fig, ax = plt.subplots(figsize=(7, 6))
    ax.plot(recall, precision, color='darkorange', linewidth=2,
            label=f'{model_name} (AP = {ap:.4f})')
    ax.axhline(y=baseline, color='gray', linestyle='--',
               label=f'ランダム予測 (AP={baseline:.3f})')
    ax.scatter(recall[best_idx], precision[best_idx], marker='*', s=200,
               color='red', zorder=5, label=f'最大F1閾値 = {best_threshold:.3f}')

    ax.set_xlabel('再現率（Recall）')
    ax.set_ylabel('適合率（Precision）')
    ax.set_title('PR 曲線')
    ax.legend()
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig('pr_curve.png', bbox_inches='tight')
    plt.show()

    print(f"Average Precision (AP): {ap:.4f}")
    print(f"最大F1 閾値: {best_threshold:.4f}")
    return ap, best_threshold


ap, best_thresh = plot_pr_curve(y_test, y_prob)
```

---

## 閾値の調整と影響

```python
def plot_threshold_analysis(y_true, y_prob):
    """閾値の変化が各指標に与える影響を可視化する"""
    thresholds = np.linspace(0.01, 0.99, 100)
    results = {'threshold': thresholds, 'precision': [], 'recall': [], 'f1': [], 'accuracy': []}

    for t in thresholds:
        y_pred_t = (y_prob >= t).astype(int)
        results['precision'].append(precision_score(y_true, y_pred_t, zero_division=0))
        results['recall'].append(recall_score(y_true, y_pred_t, zero_division=0))
        results['f1'].append(f1_score(y_true, y_pred_t, zero_division=0))
        results['accuracy'].append(accuracy_score(y_true, y_pred_t))

    fig, ax = plt.subplots(figsize=(10, 5))
    for metric in ['precision', 'recall', 'f1', 'accuracy']:
        ax.plot(thresholds, results[metric], label=metric.capitalize())
    ax.axvline(x=0.5, color='black', linestyle='--', alpha=0.5, label='デフォルト閾値(0.5)')
    ax.set_xlabel('閾値')
    ax.set_ylabel('スコア')
    ax.set_title('閾値と評価指標の関係')
    ax.legend()
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig('threshold_analysis.png', bbox_inches='tight')
    plt.show()


plot_threshold_analysis(y_test, y_prob)
```

---

## 多クラス分類への拡張

```python
from sklearn.datasets import load_iris
from sklearn.metrics import confusion_matrix, classification_report
from sklearn.multiclass import OneVsRestClassifier

iris = load_iris()
X_mc, y_mc = iris.data, iris.target
X_tr_mc, X_te_mc, y_tr_mc, y_te_mc = train_test_split(
    X_mc, y_mc, test_size=0.2, random_state=42, stratify=y_mc
)

clf_mc = Pipeline([
    ('scaler', StandardScaler()),
    ('clf',    LogisticRegression(random_state=42, max_iter=1000, multi_class='multinomial')),
])
clf_mc.fit(X_tr_mc, y_tr_mc)
y_pred_mc = clf_mc.predict(X_te_mc)

print("多クラス分類レポート:")
print(classification_report(y_te_mc, y_pred_mc, target_names=iris.target_names))

# 平均化方法
for avg in ['micro', 'macro', 'weighted']:
    f1 = f1_score(y_te_mc, y_pred_mc, average=avg)
    print(f"F1 ({avg:8s}): {f1:.4f}")
```

**平均化方法の違い:**

| 方法 | 説明 | 用途 |
|------|------|------|
| micro | 全クラスのTP/FP/FNを合計して計算 | サンプル数重視 |
| macro | 各クラスのスコアを単純平均 | クラスを均等に扱いたい場合 |
| weighted | サンプル数で重み付け平均 | クラス不均衡がある場合 |

---

## 指標の選択ガイド

```python
def recommend_metric(scenario: str) -> str:
    """シナリオに応じた評価指標の推奨"""
    recommendations = {
        '均衡データの一般分類':   'Accuracy, F1 (macro)',
        '不均衡データの分類':     'AUC-ROC, Average Precision, F1 (少数クラス)',
        '疾患診断（見逃し重視）': 'Recall（感度）, AUC-ROC',
        '詐欺検知（精度重視）':   'Precision, Average Precision',
        '閾値なしのスコア評価':   'AUC-ROC, AP',
        '多クラス分類':           'F1 (macro/weighted)',
    }
    return recommendations.get(scenario, '状況に応じて判断')


scenarios = ['均衡データの一般分類', '不均衡データの分類', '疾患診断（見逃し重視）',
             '詐欺検知（精度重視）', '閾値なしのスコア評価', '多クラス分類']
print("シナリオ別の推奨指標:")
for s in scenarios:
    print(f"  {s}: {recommend_metric(s)}")
```

---

## 使用場面

- **医療診断**: 見逃し（FN）のコストが高いため、再現率（感度）と AUC-ROC を重視
- **スパム検知**: 誤検知（FP）のコストを下げるため、適合率を重視
- **詐欺検知**: 不均衡データのため、AP（Average Precision）や AUC-ROC を使う
- **レコメンデーション**: Precision@K や Recall@K（ランキング指標）が使われることも多い

---

## 参考文献

- Powers, D. M. W. (2011). Evaluation: From Precision, Recall and F-Measure to ROC, Informedness, Markedness & Correlation. *JMLR*, 2, 37-63.
- Davis, J., & Goadrich, M. (2006). The relationship between Precision-Recall and ROC curves. *ICML 2006*.
- scikit-learn. *Metrics and scoring*. https://scikit-learn.org/stable/modules/model_evaluation.html

<AffiliateBanner site="ml_intro" />
