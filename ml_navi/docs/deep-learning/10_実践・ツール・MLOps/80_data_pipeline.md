import AffiliateBanner from '@site/src/components/AffiliateBanner';

# データパイプライン

## データパイプラインとは

> データパイプライン（Data Pipeline）とは、生データの収集・変換・検証・特徴量生成・モデルへの供給までの一連の処理フローである。機械学習プロジェクトにおいては DVC（Data Version Control）によるデータバージョン管理、Feature Store による特徴量の一元管理、Airflow / Prefect などのオーケストレーションツールが中心的な役割を果たす。

## 主要ツールの比較

| ツール | カテゴリ | 主な機能 |
|--------|---------|---------|
| DVC | データバージョン管理 | データ・モデルのバージョン管理、再現性確保 |
| Apache Airflow | オーケストレーション | DAG でのワークフロー定義・スケジューリング |
| Prefect | オーケストレーション | Pythonic なDAG・クラウド連携 |
| Feast | Feature Store | 特徴量の提供・キャッシュ・一元管理 |
| Great Expectations | データ検証 | スキーマ・統計的品質チェック |
| dbt | データ変換 | SQL ベースのデータ変換・ドキュメント化 |

## データリネージとは

| 概念 | 説明 |
|------|------|
| データリネージ | データの出所から変換履歴までを追跡する仕組み |
| Feature Store | 特徴量を一元管理し、学習・推論間の一貫性を保つ |
| Data Catalog | データセットのメタデータを管理・検索可能にする |

## Python実装

```python
import os
import subprocess
import json
import hashlib
import pickle
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional
import numpy as np
import pandas as pd

# ==============================
# 1. DVC ワークフロー例（コマンド解説）
# ==============================
DVC_COMMANDS = """
# DVC のセットアップ
git init
dvc init
git add .dvcignore .dvc/
git commit -m "Initialize DVC"

# リモートストレージの設定（S3の例）
dvc remote add -d myremote s3://my-bucket/dvc-store
git add .dvc/config
git commit -m "Configure DVC remote"

# データファイルのトラッキング
dvc add data/raw/dataset.csv
git add data/raw/dataset.csv.dvc .gitignore
git commit -m "Track raw dataset with DVC"

# パイプラインの定義（dvc.yaml）
# stages:
#   preprocess:
#     cmd: python src/preprocess.py
#     deps: [data/raw/dataset.csv, src/preprocess.py]
#     outs: [data/processed/features.csv]
#   train:
#     cmd: python src/train.py
#     deps: [data/processed/features.csv, src/train.py]
#     outs: [models/model.pkl]
#     metrics: [metrics/eval.json]

dvc repro        # パイプライン実行（変更差分のみ再実行）
dvc push         # リモートに同期
dvc pull         # リモートから取得
dvc dag          # DAG を可視化
"""
print("DVC コマンド例:")
print(DVC_COMMANDS)

# ==============================
# 2. シンプルなデータバージョン管理の実装
# ==============================
class SimpleDataVersionControl:
    """DVC の概念を簡単に実装したデータバージョン管理"""

    def __init__(self, registry_path: str = "/tmp/dvc_registry.json"):
        self.registry_path = Path(registry_path)
        self.registry: Dict[str, Any] = {}
        if self.registry_path.exists():
            with open(self.registry_path) as f:
                self.registry = json.load(f)

    def _compute_hash(self, data: pd.DataFrame) -> str:
        """DataFrame の MD5 ハッシュを計算"""
        return hashlib.md5(
            pd.util.hash_pandas_object(data).values.tobytes()
        ).hexdigest()[:8]

    def track(self, name: str, data: pd.DataFrame, tags: dict = None) -> str:
        """データセットをバージョン管理下に置く"""
        data_hash = self._compute_hash(data)
        version = f"v{len([k for k in self.registry if k.startswith(name)]) + 1}"

        self.registry[f"{name}@{version}"] = {
            "name": name,
            "version": version,
            "hash": data_hash,
            "shape": list(data.shape),
            "columns": list(data.columns),
            "created_at": datetime.now().isoformat(),
            "tags": tags or {},
        }
        self._save()
        print(f"  トラッキング: {name} @ {version} (hash: {data_hash})")
        return version

    def list_versions(self, name: str) -> List[dict]:
        return [v for k, v in self.registry.items() if v["name"] == name]

    def _save(self):
        with open(self.registry_path, "w") as f:
            json.dump(self.registry, f, indent=2, ensure_ascii=False)


# ==============================
# 3. Feature Store の簡易実装
# ==============================
class SimpleFeatureStore:
    """Feature Store の基本概念を実装"""

    def __init__(self, store_dir: str = "/tmp/feature_store"):
        self.store_dir = Path(store_dir)
        self.store_dir.mkdir(exist_ok=True)
        self.registry_path = self.store_dir / "registry.json"
        self.registry: Dict[str, Any] = {}
        if self.registry_path.exists():
            with open(self.registry_path) as f:
                self.registry = json.load(f)

    def register_feature_group(
        self,
        group_name: str,
        features: pd.DataFrame,
        entity_col: str,
        timestamp_col: Optional[str] = None,
        description: str = "",
    ):
        """特徴量グループを登録"""
        path = self.store_dir / f"{group_name}.parquet"
        features.to_parquet(path, index=False)

        self.registry[group_name] = {
            "entity_col": entity_col,
            "timestamp_col": timestamp_col,
            "feature_cols": [c for c in features.columns if c not in [entity_col, timestamp_col]],
            "n_rows": len(features),
            "description": description,
            "path": str(path),
            "created_at": datetime.now().isoformat(),
        }
        self._save_registry()
        print(f"  特徴量グループ登録: '{group_name}' ({len(features)} rows)")

    def get_features(
        self, group_name: str, entity_ids: Optional[List] = None
    ) -> pd.DataFrame:
        """特徴量を取得"""
        if group_name not in self.registry:
            raise KeyError(f"Feature group '{group_name}' not found")

        path = self.registry[group_name]["path"]
        df = pd.read_parquet(path)

        if entity_ids is not None:
            entity_col = self.registry[group_name]["entity_col"]
            df = df[df[entity_col].isin(entity_ids)]

        return df

    def point_in_time_join(
        self, entity_df: pd.DataFrame, feature_groups: List[str]
    ) -> pd.DataFrame:
        """ポイントインタイム結合（学習・推論間の一貫性確保）"""
        result = entity_df.copy()
        for group_name in feature_groups:
            info = self.registry[group_name]
            features = self.get_features(group_name)
            entity_col = info["entity_col"]
            feature_cols = [entity_col] + info["feature_cols"]
            result = result.merge(
                features[feature_cols], on=entity_col, how="left"
            )
        return result

    def _save_registry(self):
        with open(self.registry_path, "w") as f:
            json.dump(self.registry, f, indent=2, ensure_ascii=False)


# ==============================
# 4. データ検証パイプライン
# ==============================
class DataValidator:
    """統計的データ検証"""

    def __init__(self, reference_stats: dict = None):
        self.reference_stats = reference_stats or {}

    def fit(self, df: pd.DataFrame):
        """参照統計量を計算"""
        self.reference_stats = {
            col: {
                "mean": df[col].mean(),
                "std": df[col].std(),
                "min": df[col].min(),
                "max": df[col].max(),
                "null_rate": df[col].isnull().mean(),
            }
            for col in df.select_dtypes(include=np.number).columns
        }

    def validate(self, df: pd.DataFrame, threshold: float = 0.1) -> dict:
        """新データと参照統計量を比較"""
        results = {"passed": True, "warnings": [], "errors": []}

        for col in df.select_dtypes(include=np.number).columns:
            if col not in self.reference_stats:
                continue
            ref = self.reference_stats[col]
            cur_mean = df[col].mean()
            cur_null = df[col].isnull().mean()

            # 平均値のドリフト検出（簡易）
            if ref["std"] > 0:
                z_score = abs(cur_mean - ref["mean"]) / ref["std"]
                if z_score > 3:
                    results["errors"].append(
                        f"{col}: 平均値が大きく変化 (z={z_score:.2f})"
                    )
                    results["passed"] = False
                elif z_score > 2:
                    results["warnings"].append(
                        f"{col}: 平均値がやや変化 (z={z_score:.2f})"
                    )

            # 欠損率の増加検出
            if cur_null > ref["null_rate"] + threshold:
                results["errors"].append(
                    f"{col}: 欠損率が増加 ({ref['null_rate']:.2%} → {cur_null:.2%})"
                )

        return results


# 実行例
np.random.seed(42)
n = 1000
raw_data = pd.DataFrame({
    "user_id": range(n),
    "age": np.random.randint(18, 65, n).astype(float),
    "income": np.random.exponential(50000, n),
    "tenure": np.random.randint(0, 10, n).astype(float),
    "label": np.random.randint(0, 2, n),
})

# DVC でトラッキング
dvc = SimpleDataVersionControl()
v = dvc.track("user_dataset", raw_data, tags={"source": "production", "env": "train"})

# Feature Store に登録
fs = SimpleFeatureStore()
feature_df = raw_data.drop("label", axis=1)
fs.register_feature_group(
    "user_features", feature_df, entity_col="user_id",
    description="ユーザー基本特徴量"
)

# データ検証
validator = DataValidator()
validator.fit(raw_data)

# 新データ（ドリフトを意図的に発生）
new_data = raw_data.copy()
new_data["age"] = new_data["age"] + np.random.randn(n) * 20  # ドリフト
validation_result = validator.validate(new_data)
print("\nデータ検証結果:")
print(f"  合格: {validation_result['passed']}")
print(f"  警告: {validation_result['warnings']}")
print(f"  エラー: {validation_result['errors']}")
```

## 使用場面

- モデルの再学習時にデータの変更履歴を追跡したい場合
- 学習・推論間で同じ特徴量変換を保証したい場合（Feature Store）
- 複数のデータソースを定期的に結合・変換するバッチ処理
- データ品質の継続的な監視と異常検知

## 参考文献

- DVC 公式ドキュメント: https://dvc.org/doc
- Feast 公式ドキュメント: https://docs.feast.dev/
- Great Expectations: https://greatexpectations.io/
- Apache Airflow: https://airflow.apache.org/docs/

<AffiliateBanner site="ml_intro" />
