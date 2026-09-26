import AffiliateBanner from '@site/src/components/AffiliateBanner';

# CI/CD for ML

## CI/CD for ML とは

> CI/CD for ML（機械学習の継続的インテグレーション / 継続的デプロイ）とは、コードの変更・データの更新・モデルの再学習を自動化されたパイプラインで管理し、品質検証から本番デプロイまでを安全・高速に行う実践である。通常のソフトウェア CI/CD に加え、モデルの精度テスト・推論速度テスト・データ検証が加わる。

## ML CI/CD パイプラインの構成

| ステージ | 内容 |
|---------|------|
| コードテスト | ユニットテスト・型チェック・コードスタイル |
| データ検証 | スキーマ・統計的品質チェック |
| モデル学習 | トリガー条件に基づく再学習 |
| モデルテスト | 精度・推論速度・公平性の検証 |
| モデル登録 | 合格時に Model Registry に登録 |
| ステージングデプロイ | カナリア / シャドウ展開 |
| 本番デプロイ | ロールアウト / ブルーグリーンデプロイ |

## GitOps の考え方

| 原則 | 内容 |
|------|------|
| Git を Single Source of Truth | コード・設定・インフラをすべて Git で管理 |
| 宣言的設定 | 望ましい状態を宣言し、差分を自動適用 |
| 自動化 | PR マージを起点に自動的にデプロイ |
| 監査可能性 | すべての変更が Git 履歴に残る |

## Python実装

```python
import json
import time
import subprocess
import numpy as np
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass

# ==============================
# 1. モデルテストフレームワーク
# ==============================
@dataclass
class ModelTestResult:
    test_name: str
    passed: bool
    value: float
    threshold: float
    message: str = ""


class MLModelTester:
    """ML モデルの品質テスト"""

    def __init__(self, model, test_data, test_labels, device="cpu"):
        self.model = model
        self.test_data = test_data
        self.test_labels = test_labels
        self.device = device
        self.results: List[ModelTestResult] = []

    def test_accuracy(self, min_accuracy: float = 0.80) -> ModelTestResult:
        """精度の最低基準テスト"""
        import torch
        self.model.eval()
        with torch.no_grad():
            outputs = self.model(torch.FloatTensor(self.test_data).to(self.device))
            preds = outputs.argmax(dim=1).cpu().numpy()

        accuracy = (preds == self.test_labels).mean()
        result = ModelTestResult(
            "accuracy_test",
            passed=accuracy >= min_accuracy,
            value=accuracy,
            threshold=min_accuracy,
            message=f"accuracy={accuracy:.4f} (required >= {min_accuracy})",
        )
        self.results.append(result)
        return result

    def test_inference_speed(
        self, max_latency_ms: float = 100.0, batch_size: int = 1, n_trials: int = 100
    ) -> ModelTestResult:
        """推論レイテンシテスト"""
        import torch
        self.model.eval()
        dummy = torch.randn(batch_size, self.test_data.shape[1]).to(self.device)

        # ウォームアップ
        for _ in range(10):
            with torch.no_grad():
                _ = self.model(dummy)

        # 計測
        latencies = []
        for _ in range(n_trials):
            start = time.perf_counter()
            with torch.no_grad():
                _ = self.model(dummy)
            latencies.append((time.perf_counter() - start) * 1000)

        p95_ms = np.percentile(latencies, 95)
        result = ModelTestResult(
            "inference_speed_test",
            passed=p95_ms <= max_latency_ms,
            value=p95_ms,
            threshold=max_latency_ms,
            message=f"P95 latency={p95_ms:.2f}ms (required <= {max_latency_ms}ms)",
        )
        self.results.append(result)
        return result

    def test_model_size(self, max_size_mb: float = 100.0) -> ModelTestResult:
        """モデルサイズテスト"""
        import torch
        total_params = sum(p.numel() for p in self.model.parameters())
        size_mb = total_params * 4 / 1e6  # FP32 のバイト数

        result = ModelTestResult(
            "model_size_test",
            passed=size_mb <= max_size_mb,
            value=size_mb,
            threshold=max_size_mb,
            message=f"model_size={size_mb:.2f}MB (required <= {max_size_mb}MB)",
        )
        self.results.append(result)
        return result

    def test_fairness(
        self,
        sensitive_feature: np.ndarray,
        max_accuracy_gap: float = 0.1,
    ) -> ModelTestResult:
        """公平性テスト（グループ間の精度差）"""
        import torch
        self.model.eval()
        with torch.no_grad():
            outputs = self.model(torch.FloatTensor(self.test_data).to(self.device))
            preds = outputs.argmax(dim=1).cpu().numpy()

        groups = np.unique(sensitive_feature)
        group_accuracies = {}
        for g in groups:
            mask = sensitive_feature == g
            group_accuracies[g] = (preds[mask] == self.test_labels[mask]).mean()

        accuracy_gap = max(group_accuracies.values()) - min(group_accuracies.values())
        result = ModelTestResult(
            "fairness_test",
            passed=accuracy_gap <= max_accuracy_gap,
            value=accuracy_gap,
            threshold=max_accuracy_gap,
            message=f"accuracy_gap={accuracy_gap:.4f} between groups "
                    f"{dict((k, round(v, 4)) for k,v in group_accuracies.items())}",
        )
        self.results.append(result)
        return result

    def run_all(self) -> Tuple[bool, List[ModelTestResult]]:
        self.results = []
        self.test_accuracy()
        self.test_inference_speed()
        self.test_model_size()
        all_passed = all(r.passed for r in self.results)
        return all_passed, self.results

    def print_report(self):
        print("=" * 60)
        print("ML モデルテストレポート")
        print("=" * 60)
        for r in self.results:
            status = "PASS" if r.passed else "FAIL"
            print(f"[{status}] {r.test_name}: {r.message}")
        print("-" * 60)
        n_passed = sum(1 for r in self.results if r.passed)
        print(f"結果: {n_passed}/{len(self.results)} テスト合格")


# ==============================
# 2. GitHub Actions ワークフロー（YAML）
# ==============================
GITHUB_ACTIONS_WORKFLOW = """
# .github/workflows/ml_pipeline.yml
name: ML Pipeline CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * 1'  # 毎週月曜日 AM2:00 に定期実行

env:
  PYTHON_VERSION: "3.11"
  MODEL_ACCURACY_THRESHOLD: "0.80"

jobs:
  code-quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}
      - run: pip install ruff mypy pytest
      - run: ruff check src/
      - run: mypy src/
      - run: pytest tests/unit/ -v

  data-validation:
    runs-on: ubuntu-latest
    needs: code-quality
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}
      - run: pip install -r requirements.txt
      - run: python scripts/validate_data.py
        env:
          DATA_PATH: data/processed/features.parquet

  model-training:
    runs-on: ubuntu-latest
    needs: data-validation
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}
      - run: pip install -r requirements.txt
      - run: dvc pull
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      - run: python src/train.py
      - uses: actions/upload-artifact@v4
        with:
          name: trained-model
          path: models/

  model-testing:
    runs-on: ubuntu-latest
    needs: model-training
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: trained-model
          path: models/
      - run: pip install -r requirements.txt
      - run: python scripts/test_model.py
        env:
          MIN_ACCURACY: ${{ env.MODEL_ACCURACY_THRESHOLD }}
          MAX_LATENCY_MS: "50"

  deploy-staging:
    runs-on: ubuntu-latest
    needs: model-testing
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: trained-model
          path: models/
      - name: Docker build and push
        run: |
          docker build -t ml-service:${{ github.sha }} .
          docker push myregistry/ml-service:${{ github.sha }}
      - name: Deploy to staging
        run: |
          kubectl set image deployment/ml-service \\
            ml-service=myregistry/ml-service:${{ github.sha }} \\
            --namespace=staging

  integration-test:
    runs-on: ubuntu-latest
    needs: deploy-staging
    steps:
      - uses: actions/checkout@v4
      - run: pip install pytest requests
      - run: pytest tests/integration/ -v
        env:
          API_URL: https://staging.example.com

  deploy-production:
    runs-on: ubuntu-latest
    needs: integration-test
    environment: production  # 手動承認が必要
    steps:
      - name: Deploy to production (Blue-Green)
        run: |
          kubectl set image deployment/ml-service-prod \\
            ml-service=myregistry/ml-service:${{ github.sha }} \\
            --namespace=production
"""

print("GitHub Actions ワークフロー（.github/workflows/ml_pipeline.yml）")

# ==============================
# 3. モデルテストの実行
# ==============================
import torch
import torch.nn as nn

model = nn.Sequential(
    nn.Linear(10, 64), nn.ReLU(),
    nn.Linear(64, 32), nn.ReLU(),
    nn.Linear(32, 3),
)

np.random.seed(42)
X_test = np.random.randn(200, 10).astype(np.float32)
y_test = np.random.randint(0, 3, 200)
sensitive = np.random.choice(["A", "B"], 200)

tester = MLModelTester(model, X_test, y_test)
all_passed, results = tester.run_all()
tester.print_report()

print(f"\nCI/CD パイプライン: {'合格 -> デプロイ実行' if all_passed else '不合格 -> デプロイ停止'}")
```

## 使用場面

- モデルのコード変更に対する自動品質ゲート
- 定期的なデータ更新に基づく自動再学習と評価
- 複数環境（開発・ステージング・本番）への段階的なロールアウト
- モデルの公平性・安全性の継続的な検証

## 参考文献

- Sculley, D., et al. (2015). Hidden Technical Debt in Machine Learning Systems. *NeurIPS*.
- Breck, E., et al. (2017). The ML Test Score: A Rubric for ML Production Readiness. *ICDM*.
- GitHub Actions 公式ドキュメント: https://docs.github.com/en/actions
- MLOps.community: https://mlops.community/

<AffiliateBanner site="ml_intro" />
