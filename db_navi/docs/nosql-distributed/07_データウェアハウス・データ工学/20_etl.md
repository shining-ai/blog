import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ETL パイプラインの設計

## ETL とは

> ETL（Extract-Transform-Load）とはデータソース（OLTP DB・ログ・API）からデータを抽出し、品質チェック・変換・エンリッチメントを行い、分析基盤（DWH・データレイク）にロードするデータ統合パイプラインであり、データ品質・スケジューリング・冪等性が設計の核心である。

ETL は「データウェアハウスにデータを入れるためのパイプライン」です。OLTP システムは業務用に最適化されており、そのままでは分析に使いにくい（正規化・フォーマットの違い・データ品質の問題）ため ETL で変換します。

Extract（抽出）フェーズでは変更データのみを抽出（増分抽出）することが重要です。フルスキャンは高負荷のため、タイムスタンプ・変更フラグ・CDC（Change Data Capture）で差分を取得します。

Transform（変換）フェーズはパイプラインの核心です。データクレンジング（NULL 処理・型変換・重複排除）、エンリッチメント（外部データの結合）、集計・計算（ビジネスロジック適用）を行います。データ品質チェック（スキーマ検証・不正値チェック）を必ず組み込みます。

Load（ロード）フェーズでは SCD の管理・パーティション分割・インデックス更新を行います。「冪等性（同じパイプラインを複数回実行しても同じ結果になる）」の確保が重要です。

現代の ELT（Extract-Load-Transform）はデータをまず DWH にロードし、DWH 上で SQL・dbt を使って変換します。Snowflake・BigQuery では ELT が主流です。

## ETL パイプラインの処理フェーズ

| フェーズ | 処理 | 課題 |
|---------|------|------|
| Extract | 差分抽出・CDC | OLTP への負荷 |
| Transform | クレンジング・変換 | データ品質・スキーマ変化 |
| Load | DWH への書き込み | 冪等性・パフォーマンス |
| Validate | データ品質チェック | 異常の早期検知 |
| Orchestrate | スケジューリング・依存管理 | 障害リカバリ |

```python
from dataclasses import dataclass, field
from datetime import datetime, timezone
from collections import defaultdict
from typing import Any, Callable
import re

# ===========================
# ETL パイプラインの実装
# ===========================

@dataclass
class DataRecord:
    """データレコード"""
    data: dict[str, Any]
    source: str = ""
    extracted_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    errors: list[str] = field(default_factory=list)

    def has_errors(self) -> bool:
        return len(self.errors) > 0


class ExtractStage:
    """Extract フェーズ: データソースからの抽出"""

    def __init__(self, source_name: str):
        self.source_name = source_name
        self._last_extracted: datetime | None = None

    def extract_incremental(
        self,
        source_data: list[dict],
        timestamp_field: str = "updated_at",
    ) -> list[DataRecord]:
        """増分抽出: 前回抽出以降に変更されたレコードのみ取得"""
        cutoff = self._last_extracted

        records = []
        new_max_ts = None

        for row in source_data:
            ts = row.get(timestamp_field)
            if isinstance(ts, str):
                ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))

            if cutoff is None or (ts and ts > cutoff):
                records.append(DataRecord(data=dict(row), source=self.source_name))
                if ts and (new_max_ts is None or ts > new_max_ts):
                    new_max_ts = ts

        if new_max_ts:
            self._last_extracted = new_max_ts

        return records


class TransformStage:
    """Transform フェーズ: データ変換・クレンジング"""

    def __init__(self):
        self._transforms: list[Callable] = []
        self._validators: list[Callable] = []

    def add_transform(self, fn: Callable) -> "TransformStage":
        self._transforms.append(fn)
        return self

    def add_validator(self, fn: Callable) -> "TransformStage":
        self._validators.append(fn)
        return self

    def process(self, records: list[DataRecord]) -> tuple[list[DataRecord], list[DataRecord]]:
        """変換を適用し、成功・失敗に分類"""
        valid_records = []
        invalid_records = []

        for record in records:
            # 変換を適用
            for transform_fn in self._transforms:
                try:
                    transform_fn(record)
                except Exception as e:
                    record.errors.append(f"変換エラー ({transform_fn.__name__}): {e}")

            # バリデーション
            for validator_fn in self._validators:
                validator_fn(record)

            if record.has_errors():
                invalid_records.append(record)
            else:
                valid_records.append(record)

        return valid_records, invalid_records


class LoadStage:
    """Load フェーズ: データウェアハウスへのロード"""

    def __init__(self, target_name: str):
        self.target_name = target_name
        self.target_table: list[dict] = []
        self.load_count = 0
        self._key_field = "id"  # 冪等性のためのキー

    def load_with_idempotency(self, records: list[DataRecord]) -> dict:
        """
        冪等ロード（UPSERT）: 同じキーのレコードは更新
        同じパイプラインを複数回実行しても重複しない
        """
        existing_keys = {r[self._key_field]: i for i, r in enumerate(self.target_table)}

        inserted = 0
        updated = 0

        for record in records:
            key = record.data.get(self._key_field)
            if key and key in existing_keys:
                # UPDATE
                self.target_table[existing_keys[key]] = record.data
                updated += 1
            else:
                # INSERT
                self.target_table.append(record.data)
                if key:
                    existing_keys[key] = len(self.target_table) - 1
                inserted += 1
                self.load_count += 1

        return {
            "target": self.target_name,
            "inserted": inserted,
            "updated": updated,
            "total": len(self.target_table),
        }


class DataQualityChecker:
    """データ品質チェック"""

    def __init__(self):
        self.results: list[dict] = []

    def check_not_null(self, field: str) -> Callable:
        def validator(record: DataRecord) -> None:
            if record.data.get(field) is None or record.data.get(field) == "":
                record.errors.append(f"NOT NULL 違反: {field} が空")
        validator.__name__ = f"not_null_{field}"
        return validator

    def check_email_format(self, field: str) -> Callable:
        pattern = re.compile(r"^[^@]+@[^@]+\.[^@]+$")
        def validator(record: DataRecord) -> None:
            val = record.data.get(field, "")
            if val and not pattern.match(str(val)):
                record.errors.append(f"フォーマット違反: {field} = {val!r}")
        validator.__name__ = f"email_format_{field}"
        return validator

    def check_range(self, field: str, min_val: float, max_val: float) -> Callable:
        def validator(record: DataRecord) -> None:
            val = record.data.get(field)
            if val is not None:
                try:
                    v = float(val)
                    if not (min_val <= v <= max_val):
                        record.errors.append(f"範囲外: {field} = {v} (期待: {min_val}〜{max_val})")
                except (ValueError, TypeError):
                    record.errors.append(f"型エラー: {field} が数値でない")
        validator.__name__ = f"range_{field}"
        return validator


# ===========================
# ETL トランスフォーム関数
# ===========================

def normalize_phone(record: DataRecord) -> None:
    """電話番号の正規化"""
    phone = record.data.get("phone", "")
    if phone:
        normalized = re.sub(r"[^\d+]", "", str(phone))
        record.data["phone"] = normalized

def calculate_full_name(record: DataRecord) -> None:
    """姓名を結合して full_name を生成"""
    first = record.data.get("first_name", "")
    last  = record.data.get("last_name", "")
    record.data["full_name"] = f"{last} {first}".strip()

def add_etl_metadata(record: DataRecord) -> None:
    """ETL メタデータを追加"""
    record.data["etl_loaded_at"] = datetime.now(timezone.utc).isoformat()
    record.data["etl_source"] = record.source


print("=== ETL パイプラインデモ ===\n")

# ソースデータ（OLTP からの生データ）
source_records = [
    {"id": 1, "first_name": "太郎", "last_name": "田中", "email": "taro@example.com", "phone": "090-1234-5678", "age": 32, "updated_at": "2026-06-11T10:00:00Z"},
    {"id": 2, "first_name": "花子", "last_name": "鈴木", "email": "hanako@example.com", "phone": "(03) 1234-5678", "age": 28, "updated_at": "2026-06-11T11:00:00Z"},
    {"id": 3, "first_name": "次郎", "last_name": "佐藤", "email": "invalid-email",      "phone": "080-9876-5432", "age": -1, "updated_at": "2026-06-11T12:00:00Z"},  # 不正データ
    {"id": 4, "first_name": None,  "last_name": "山田", "email": "yamada@example.com", "phone": "070-1111-2222", "age": 45, "updated_at": "2026-06-11T13:00:00Z"},  # NULL
]

# Extract
extractor = ExtractStage("crm_db")
records = extractor.extract_incremental(source_records)
print(f"[Extract] {len(records)} 件を抽出")

# Transform
checker = DataQualityChecker()
transformer = (TransformStage()
    .add_transform(normalize_phone)
    .add_transform(calculate_full_name)
    .add_transform(add_etl_metadata)
    .add_validator(checker.check_not_null("first_name"))
    .add_validator(checker.check_email_format("email"))
    .add_validator(checker.check_range("age", 0, 150))
)

valid_records, invalid_records = transformer.process(records)
print(f"\n[Transform] 有効: {len(valid_records)} 件, 無効: {len(invalid_records)} 件")

if invalid_records:
    print("\n[データ品質エラー]")
    for r in invalid_records:
        print(f"  id={r.data.get('id')}: {r.errors}")

print("\n[変換後データ（有効レコードのサンプル）]")
for r in valid_records[:2]:
    d = r.data
    print(f"  id={d['id']}, full_name={d['full_name']}, phone={d['phone']}, loaded_at={d['etl_loaded_at'][:19]}")

# Load
loader = LoadStage("customer_dim")
result = loader.load_with_idempotency(valid_records)
print(f"\n[Load] {result}")

# 冪等性の確認（同じデータを再ロード）
result2 = loader.load_with_idempotency(valid_records)
print(f"[再ロード（冪等性確認）] {result2}  ← 重複なし（inserted=0）")
```

## 使用場面

- OLTP データベース（MySQL・PostgreSQL）から毎夜バッチで変更データを抽出して Snowflake・BigQuery に積み上げる ETL パイプラインを構築する場面
- Apache Airflow・Prefect・dbt でパイプラインの依存関係・スケジューリング・再実行ロジックを管理する場面
- データ品質チェック（Great Expectations など）を ETL パイプラインに組み込んで本番データの異常を早期検知する場面

## 参考文献

- Kleppmann, M. "Designing Data-Intensive Applications" (O'Reilly)
- Kimball, R. and Ross, M. "The Data Warehouse Toolkit" (Wiley)
- [dbt Documentation – What is dbt?](https://docs.getdbt.com/docs/introduction)

<AffiliateBanner site="db_navi" />
