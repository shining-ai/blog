import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 実験管理

## 実験管理とは

> 実験管理（Experiment Management）とは、機械学習の試行錯誤において、ハイパーパラメータ・コード・データ・評価指標・モデルアーティファクトを体系的に記録・比較・再現する仕組みである。MLflow と Weights & Biases（W&B）が代表的なツールとして広く使われる。

## MLflow vs W&B の比較

| 機能 | MLflow | Weights & Biases |
|-----|--------|-----------------|
| 実験トラッキング | ログ・メトリクス・パラメータ | ログ・メトリクス・パラメータ |
| モデルレジストリ | あり（内蔵） | あり（内蔵） |
| ホスティング | セルフホスト / Databricks | クラウドサービス（無料枠あり）|
| UIの豊富さ | 標準的 | 非常に豊富（可視化強力）|
| 再現性 | 中程度 | 高い（コード・環境記録）|
| チーム機能 | 基本的 | 充実 |
| コスト | オープンソース | フリーミアム |

## MLflowの主要概念

| 概念 | 説明 |
|------|------|
| Experiment | 一連の試行をまとめるグループ |
| Run | 個々の実験実行（パラメータ・メトリクスを記録）|
| Artifact | モデルファイル・画像などのバイナリ |
| Model Registry | モデルのバージョン管理・ライフサイクル管理 |

## Python実装

```python
import numpy as np
import os
from pathlib import Path

# ==============================
# MLflow による実験管理
# ==============================
def run_with_mlflow():
    try:
        import mlflow
        import mlflow.sklearn
        from sklearn.datasets import make_classification
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.model_selection import train_test_split, cross_val_score
        from sklearn.metrics import accuracy_score, roc_auc_score
        from sklearn.pipeline import Pipeline
        from sklearn.preprocessing import StandardScaler

        # トラッキングURIの設定（ローカルの場合）
        mlflow.set_tracking_uri("file:///tmp/mlruns")
        mlflow.set_experiment("rf_classification_experiment")

        # データ準備
        X, y = make_classification(
            n_samples=1000, n_features=20, n_informative=10,
            random_state=42
        )
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )

        # ハイパーパラメータの組み合わせ
        param_sets = [
            {"n_estimators": 50,  "max_depth": 5,  "min_samples_split": 2},
            {"n_estimators": 100, "max_depth": 10, "min_samples_split": 5},
            {"n_estimators": 200, "max_depth": None, "min_samples_split": 2},
        ]

        for params in param_sets:
            with mlflow.start_run(run_name=f"rf_{params['n_estimators']}"):
                # パラメータのログ
                mlflow.log_params(params)
                mlflow.log_param("test_size", 0.2)
                mlflow.log_param("random_state", 42)

                # モデルの構築と学習
                pipeline = Pipeline([
                    ("scaler", StandardScaler()),
                    ("model", RandomForestClassifier(**params, random_state=42)),
                ])
                pipeline.fit(X_train, y_train)

                # メトリクスのログ
                y_pred  = pipeline.predict(X_test)
                y_prob  = pipeline.predict_proba(X_test)[:, 1]
                acc     = accuracy_score(y_test, y_pred)
                auc     = roc_auc_score(y_test, y_prob)
                cv_auc  = cross_val_score(
                    pipeline, X_train, y_train, cv=5, scoring="roc_auc"
                ).mean()

                mlflow.log_metric("accuracy", acc)
                mlflow.log_metric("roc_auc", auc)
                mlflow.log_metric("cv_roc_auc", cv_auc)

                # モデルのアーティファクト保存
                mlflow.sklearn.log_model(pipeline, "model")

                print(f"  n_estimators={params['n_estimators']:3d}: "
                      f"acc={acc:.4f}, auc={auc:.4f}, cv_auc={cv_auc:.4f}")

        # 最良ランの取得
        client = mlflow.tracking.MlflowClient()
        experiment = client.get_experiment_by_name("rf_classification_experiment")
        best_run = client.search_runs(
            experiment_ids=[experiment.experiment_id],
            order_by=["metrics.roc_auc DESC"],
            max_results=1
        )[0]
        print(f"\n最良ラン: {best_run.info.run_id}")
        print(f"  ROC-AUC: {best_run.data.metrics['roc_auc']:.4f}")
        print(f"  params: {best_run.data.params}")

    except ImportError:
        print("MLflow が必要: pip install mlflow")


# ==============================
# Weights & Biases による実験管理
# ==============================
def run_with_wandb():
    try:
        import wandb
        import torch
        import torch.nn as nn
        import torch.optim as optim
        from torch.utils.data import TensorDataset, DataLoader

        # W&B の初期化
        wandb.init(
            project="pytorch-classification",
            name="mlp-experiment-001",
            config={
                "learning_rate": 1e-3,
                "epochs": 30,
                "batch_size": 64,
                "hidden_dims": [128, 64],
                "dropout": 0.3,
                "optimizer": "AdamW",
            },
            tags=["mlp", "tabular", "classification"],
        )
        config = wandb.config

        # データ
        X = torch.randn(800, 20)
        y = torch.randint(0, 5, (800,))
        dataset = TensorDataset(X, y)
        loader = DataLoader(dataset, batch_size=config.batch_size, shuffle=True)

        # モデル
        model = nn.Sequential(
            nn.Linear(20, config.hidden_dims[0]), nn.ReLU(), nn.Dropout(config.dropout),
            nn.Linear(config.hidden_dims[0], config.hidden_dims[1]), nn.ReLU(),
            nn.Linear(config.hidden_dims[1], 5),
        )

        # W&B でモデル構造を監視
        wandb.watch(model, log="all", log_freq=10)

        optimizer = optim.AdamW(model.parameters(), lr=config.learning_rate)
        criterion = nn.CrossEntropyLoss()

        for epoch in range(config.epochs):
            model.train()
            train_loss, correct, total = 0.0, 0, 0
            for X_batch, y_batch in loader:
                optimizer.zero_grad()
                outputs = model(X_batch)
                loss = criterion(outputs, y_batch)
                loss.backward()
                optimizer.step()
                train_loss += loss.item() * len(X_batch)
                correct += (outputs.argmax(1) == y_batch).sum().item()
                total += len(X_batch)

            # メトリクスのログ
            wandb.log({
                "epoch": epoch,
                "train/loss": train_loss / total,
                "train/accuracy": correct / total,
                "lr": optimizer.param_groups[0]["lr"],
            })

        # モデルのアーティファクト保存
        model_path = "/tmp/wandb_model.pt"
        torch.save(model.state_dict(), model_path)
        artifact = wandb.Artifact("classifier", type="model")
        artifact.add_file(model_path)
        wandb.log_artifact(artifact)

        wandb.finish()

    except ImportError:
        print("W&B が必要: pip install wandb")


# ==============================
# 再現性の確保
# ==============================
def set_seed(seed: int = 42):
    """全乱数シードを統一して再現性を確保"""
    import random
    import torch

    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)
        # 決定的なアルゴリズムを使用（速度とトレードオフ）
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark = False
    os.environ["PYTHONHASHSEED"] = str(seed)


set_seed(42)
print("再現性のための乱数シードを設定しました")

# 実行
run_with_mlflow()
```

## 使用場面

- 複数のハイパーパラメータ・アーキテクチャの体系的な比較
- チームでの実験結果の共有と再現
- モデルのバージョン管理とリリース管理
- CI/CD パイプラインへの実験結果の統合

## 参考文献

- MLflow 公式ドキュメント: https://mlflow.org/docs/latest/
- Weights & Biases 公式ドキュメント: https://docs.wandb.ai/
- Sculley, D., et al. (2015). Hidden Technical Debt in Machine Learning Systems. *NeurIPS*.

<AffiliateBanner site="ml_intro" />
