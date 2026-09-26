import AffiliateBanner from '@site/src/components/AffiliateBanner';

# データレイクとデータレイクハウス

## データレイクとデータレイクハウスとは

> データレイクとは構造化・半構造化・非構造化データをスキーマ定義なしで大量に格納するストレージ基盤であり、データレイクハウスはデータレイクの柔軟性にデータウェアハウスの ACID トランザクションと SQL 分析機能を組み合わせた次世代アーキテクチャである。

データウェアハウス（DWH）は構造化データに特化しており、スキーマが事前に必要（Schema-on-Write）です。柔軟性に欠け、JSON ログ・画像・テキストを扱いにくいです。データレイクは「とにかく生データを全部貯める」アプローチです（Schema-on-Read）。安価なオブジェクトストレージ（S3・GCS）に CSV・JSON・Parquet・画像をそのまま格納します。問題は「データの沼（Data Swamp）」化です。メタデータ管理・品質保証が不十分だと使えないデータが溜まるだけになります。

データレイクハウス（Lakehouse）は Databricks Delta Lake・Apache Iceberg・Apache Hudi によって提唱された新しいパラダイムです。S3 などのオブジェクトストレージ上でデータレイクの低コスト・柔軟性を維持しながら、ACID トランザクション・タイムトラベル（過去データへのクエリ）・スキーマ演化・データバージョニングを提供します。Spark・Presto・Trino などのエンジンと連携します。

Delta Lake はトランザクションログ（`_delta_log/`）を使い、全ての変更操作を記録します。これによりファイル形式（Parquet）のまま ACID を実現します。

## データレイク・DWH・レイクハウスの比較

| 特性 | データウェアハウス | データレイク | データレイクハウス |
|------|---------------|-----------|----------------|
| データ形式 | 構造化のみ | 全形式 | 全形式 |
| スキーマ | Schema-on-Write | Schema-on-Read | Schema-on-Read + 検証 |
| ACID トランザクション | あり | なし | あり |
| コスト | 高い | 低い | 低〜中程度 |
| SQL 分析 | 高性能 | 限定的 | 高性能 |
| タイムトラベル | 限定的 | なし | あり |
| 代表例 | Snowflake, Redshift | S3, GCS | Delta Lake, Iceberg |

```python
import json
import os
import hashlib
from datetime import datetime, timezone
from dataclasses import dataclass, field
from collections import defaultdict
from typing import Any

# ===========================
# Delta Lake ライクなデータレイクハウスの実装
# ===========================

@dataclass
class DeltaLogEntry:
    """Delta Lake トランザクションログエントリ"""
    version: int
    timestamp: str
    operation: str     # "WRITE" / "DELETE" / "MERGE" / "SCHEMA_CHANGE"
    file_path: str
    num_rows: int
    schema: dict = field(default_factory=dict)
    predicate: str = ""  # DELETE/MERGE の条件


class ParquetFile:
    """Parquet ファイルの簡易実装（実際は列指向バイナリ）"""

    def __init__(self, file_path: str, rows: list[dict], schema: dict):
        self.file_path = file_path
        self.rows = rows
        self.schema = schema
        self.size_bytes = len(json.dumps(rows).encode())

    def read(self, columns: list[str] = [], where: dict = {}) -> list[dict]:
        """列プルーニングとフィルタプッシュダウン"""
        result = []
        for row in self.rows:
            # WHERE フィルタ
            if where and not all(row.get(k) == v for k, v in where.items()):
                continue
            # 列プルーニング
            if columns:
                row = {k: v for k, v in row.items() if k in columns}
            result.append(row)
        return result


class DeltaTable:
    """Delta Lake テーブルのシミュレーション"""

    def __init__(self, table_name: str, schema: dict):
        self.table_name = table_name
        self.schema = schema
        self._transaction_log: list[DeltaLogEntry] = []
        self._files: dict[str, ParquetFile] = {}
        self._current_version = -1
        self._active_files: set[str] = set()  # 現在有効なファイル

    def _next_version(self) -> int:
        self._current_version += 1
        return self._current_version

    def _make_file_path(self, version: int) -> str:
        return f"part-{version:05d}.parquet"

    def write(self, rows: list[dict], mode: str = "append") -> int:
        """データの書き込み（append / overwrite）"""
        version = self._next_version()
        file_path = self._make_file_path(version)

        pf = ParquetFile(file_path, rows, self.schema)
        self._files[file_path] = pf

        if mode == "overwrite":
            self._active_files.clear()

        self._active_files.add(file_path)

        log_entry = DeltaLogEntry(
            version=version,
            timestamp=datetime.now(timezone.utc).isoformat(),
            operation=f"WRITE({mode})",
            file_path=file_path,
            num_rows=len(rows),
            schema=self.schema,
        )
        self._transaction_log.append(log_entry)
        return version

    def delete(self, predicate: dict) -> int:
        """DELETE（Copy-on-Write: 新しいファイルを作成して古いものを無効化）"""
        version = self._next_version()
        all_rows = self._read_all_current()

        # 削除条件に合わない行だけを新ファイルに書く
        remaining = [r for r in all_rows if not all(r.get(k) == v for k, v in predicate.items())]
        deleted_count = len(all_rows) - len(remaining)

        # 古いファイルを無効化して新ファイルを作成
        self._active_files.clear()
        file_path = self._make_file_path(version)
        self._files[file_path] = ParquetFile(file_path, remaining, self.schema)
        self._active_files.add(file_path)

        log_entry = DeltaLogEntry(
            version=version,
            timestamp=datetime.now(timezone.utc).isoformat(),
            operation="DELETE",
            file_path=file_path,
            num_rows=len(remaining),
            predicate=str(predicate),
        )
        self._transaction_log.append(log_entry)
        return deleted_count

    def _read_all_current(self) -> list[dict]:
        """現在のアクティブファイルから全データを読む"""
        rows = []
        for fp in self._active_files:
            if fp in self._files:
                rows.extend(self._files[fp].read())
        return rows

    def read(self, columns: list[str] = [], where: dict = {}) -> list[dict]:
        """現在バージョンの読み取り"""
        all_rows = self._read_all_current()
        if where:
            all_rows = [r for r in all_rows if all(r.get(k) == v for k, v in where.items())]
        if columns:
            all_rows = [{k: v for k, v in r.items() if k in columns} for r in all_rows]
        return all_rows

    def read_at_version(self, target_version: int) -> list[dict]:
        """
        タイムトラベル: 特定バージョン時点のデータを読む
        Delta Lake の重要機能
        """
        # 指定バージョン以前のログでファイルセットを再構築
        active = set()
        for entry in self._transaction_log:
            if entry.version > target_version:
                break
            if "overwrite" in entry.operation.lower():
                active.clear()
            active.add(entry.file_path)

        rows = []
        for fp in active:
            if fp in self._files:
                rows.extend(self._files[fp].read())
        return rows

    def history(self) -> list[dict]:
        """トランザクション履歴の表示"""
        return [
            {
                "version": e.version,
                "timestamp": e.timestamp[:19],
                "operation": e.operation,
                "num_rows": e.num_rows,
            }
            for e in self._transaction_log
        ]


print("=== データレイクハウス（Delta Lake）デモ ===\n")

schema = {
    "user_id": "STRING",
    "name":    "STRING",
    "region":  "STRING",
    "score":   "INTEGER",
}

delta_table = DeltaTable("users", schema)

# バッチ書き込み v0
v0 = delta_table.write([
    {"user_id": "U001", "name": "Alice", "region": "Tokyo",  "score": 85},
    {"user_id": "U002", "name": "Bob",   "region": "Osaka",  "score": 72},
    {"user_id": "U003", "name": "Carol", "region": "Nagoya", "score": 90},
], mode="append")
print(f"[Write v{v0}] 3 件を追加")

# 追記 v1
v1 = delta_table.write([
    {"user_id": "U004", "name": "Dave",  "region": "Tokyo", "score": 65},
    {"user_id": "U005", "name": "Eve",   "region": "Osaka", "score": 88},
], mode="append")
print(f"[Write v{v1}] 2 件を追記")

# 削除 v2
deleted = delta_table.delete(predicate={"region": "Osaka"})
print(f"[Delete v2] Osaka のユーザを {deleted} 件削除")

# 現在のデータ
print(f"\n[現在のデータ ({len(delta_table.read())} 件)]")
for r in delta_table.read():
    print(f"  {r}")

# タイムトラベル
print(f"\n[タイムトラベル: v{v1} 時点のデータ]")
for r in delta_table.read_at_version(v1):
    print(f"  {r}")

# トランザクション履歴
print(f"\n[トランザクション履歴]")
for h in delta_table.history():
    print(f"  v{h['version']} | {h['timestamp']} | {h['operation']} | {h['num_rows']} 行")

print("\n[データレイクハウスのアーキテクチャ]")
arch = [
    "オブジェクトストレージ（S3/GCS）",
    "  ├── _delta_log/           # ACID トランザクションログ",
    "  ├── part-00000.parquet    # データファイル（列指向）",
    "  └── part-00001.parquet    #",
    "",
    "分析エンジン層",
    "  ├── Apache Spark          # バッチ処理・機械学習",
    "  ├── Trino / Presto        # インタラクティブ SQL",
    "  └── dbt                   # データ変換（ELT）",
]
for line in arch:
    print(f"  {line}")
```

## 使用場面

- 生ログ・JSON イベント・画像などを低コストで S3 に蓄積しながら Spark で機械学習特徴量を生成するデータ基盤を構築する場面
- Delta Lake・Iceberg を使って S3 上のデータに ACID トランザクションとタイムトラベルを追加してデータ品質を管理する場面
- ETL エラー時に特定バージョンにタイムトラベルして問題のある書き込みをロールバックするデータリカバリを行う場面

## 参考文献

- Armbrust, M. et al. "Delta Lake: High-Performance ACID Table Storage over Cloud Object Stores" (VLDB 2020)
- [Apache Iceberg Documentation](https://iceberg.apache.org/docs/latest/)
- Kleppmann, M. "Designing Data-Intensive Applications" (O'Reilly)

<AffiliateBanner site="db_navi" />
