import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 時系列DB（InfluxDB・TimescaleDB）

## 時系列データベースとは

> 時系列データベース（TSDB: Time Series Database）とは時刻をインデックスの主軸としてメトリクス・センサーデータ・ログなどの時系列データを高効率で格納・集計するよう最適化されたデータベースであり、InfluxDB と TimescaleDB が代表的な実装である。

時系列データは「タイムスタンプと観測値のペアが大量に継続的に挿入され、主に時間範囲で集計される」という特徴を持ちます。通常の RDB はこのパターンに最適化されておらず、インサート性能・範囲クエリ性能・ストレージ圧縮が劣ります。

TSDB は次の最適化を持ちます。時系列データ専用の圧縮（差分エンコーディング・XOR 圧縮でサイズを 10 分の 1 以下に削減）、タイムベースのインデックス（B+木ではなく時間順アクセスに最適化）、ダウンサンプリング（古いデータを自動的に低解像度に集約して容量を削減）、TTL（古いデータの自動削除）。

InfluxDB は Go で書かれた OSS の TSDB で、InfluxQL（SQL ライク）と Flux クエリ言語を持ちます。タグ（インデックス付き文字列）とフィールド（数値・文字列）でデータを構成し、バケット・保存期間（Retention Policy）を設定します。

TimescaleDB は PostgreSQL の拡張として動作するため、標準 SQL が使えます。「ハイパーテーブル」が内部でチャンク（時間範囲ごとの小テーブル）に自動分割されるため、通常の PostgreSQL より高速です。既存の PostgreSQL エコシステム（pgAdmin・psycopg2 等）がそのまま使えます。

## InfluxDB と TimescaleDB の比較

| 項目 | InfluxDB | TimescaleDB |
|------|---------|-------------|
| ベース | 独自エンジン | PostgreSQL 拡張 |
| クエリ言語 | Flux / InfluxQL | SQL（PostgreSQL 準拠） |
| スケーリング | InfluxDB Clustered | PostgreSQL の機能 + Citus |
| 圧縮 | 自動（Delta/XOR） | ColumnStore 圧縮 |
| ACID | 限定的 | 完全 ACID |
| 最適な用途 | メトリクス・IoT | 金融・複合クエリ |

```python
from datetime import datetime, timezone, timedelta
import statistics
import math
from dataclasses import dataclass, field
from collections import defaultdict

# ===========================
# 時系列データの格納と集計
# ===========================

@dataclass
class TimeSeriesPoint:
    """時系列データポイント（InfluxDB の行モデル）"""
    measurement: str          # 測定値の種類（例: cpu_usage）
    tags: dict[str, str]     # インデックス付きメタデータ（例: host, region）
    fields: dict[str, float] # 実際の数値
    timestamp: datetime

    def __repr__(self):
        return (f"{self.measurement},{','.join(f'{k}={v}' for k,v in self.tags.items())} "
                f"{','.join(f'{k}={v}' for k,v in self.fields.items())} "
                f"{int(self.timestamp.timestamp() * 1e9)}")  # InfluxDB line protocol


class TimeSeriesDB:
    """時系列データベースのシミュレーション"""

    def __init__(self):
        # measurement → {タグセット文字列 → [(timestamp, fields)]}
        self._data: dict[str, list[TimeSeriesPoint]] = defaultdict(list)

    def write(self, point: TimeSeriesPoint) -> None:
        """データポイントの書き込み"""
        self._data[point.measurement].append(point)
        # タイムスタンプでソート（実際の TSDB は LSM-Tree で効率化）
        self._data[point.measurement].sort(key=lambda p: p.timestamp)

    def query_range(
        self,
        measurement: str,
        start: datetime,
        end: datetime,
        tag_filter: dict[str, str] = {},
        field: str = "",
    ) -> list[TimeSeriesPoint]:
        """時間範囲クエリ"""
        points = self._data.get(measurement, [])
        result = []
        for p in points:
            if not (start <= p.timestamp <= end):
                continue
            if tag_filter and not all(p.tags.get(k) == v for k, v in tag_filter.items()):
                continue
            result.append(p)
        return result

    def aggregate(
        self,
        measurement: str,
        field: str,
        start: datetime,
        end: datetime,
        window_minutes: int = 5,
        func: str = "mean",
        tag_filter: dict[str, str] = {},
    ) -> list[dict]:
        """
        時間ウィンドウごとの集計
        func: mean / max / min / sum / count
        """
        points = self.query_range(measurement, start, end, tag_filter)
        if not points:
            return []

        # ウィンドウごとにグループ化
        window_delta = timedelta(minutes=window_minutes)
        buckets: dict[datetime, list[float]] = defaultdict(list)
        for p in points:
            elapsed = p.timestamp - start
            window_idx = int(elapsed.total_seconds() / window_delta.total_seconds())
            bucket_time = start + window_delta * window_idx
            if field in p.fields:
                buckets[bucket_time].append(p.fields[field])

        # 集計関数を適用
        agg_funcs = {
            "mean":  statistics.mean,
            "max":   max,
            "min":   min,
            "sum":   sum,
            "count": len,
        }
        agg_fn = agg_funcs.get(func, statistics.mean)

        return [
            {"time": t, "value": round(agg_fn(vals), 3), "count": len(vals)}
            for t, vals in sorted(buckets.items())
        ]

    def retention_policy(self, measurement: str, retention_hours: int, now: datetime) -> int:
        """保存期間（Retention Policy）: 古いデータを削除"""
        cutoff = now - timedelta(hours=retention_hours)
        before = len(self._data[measurement])
        self._data[measurement] = [
            p for p in self._data[measurement] if p.timestamp >= cutoff
        ]
        return before - len(self._data[measurement])

    def downsample(
        self,
        measurement: str,
        new_measurement: str,
        field: str,
        start: datetime,
        end: datetime,
        window_minutes: int = 60,
    ) -> int:
        """ダウンサンプリング: 高解像度データを低解像度に集約"""
        aggregated = self.aggregate(measurement, field, start, end, window_minutes, "mean")
        for item in aggregated:
            p = TimeSeriesPoint(
                measurement=new_measurement,
                tags={"downsampled": "true"},
                fields={field: item["value"]},
                timestamp=item["time"],
            )
            self.write(p)
        return len(aggregated)


import random

print("=== 時系列 DB デモ ===\n")

tsdb = TimeSeriesDB()
now = datetime(2026, 6, 11, 10, 0, 0, tzinfo=timezone.utc)

# CPU 使用率データの挿入（1分間隔で1時間分）
print("[データ挿入: CPU 使用率（1分間隔 × 60分）]")
for i in range(60):
    ts = now + timedelta(minutes=i)
    for host in ["web-01", "web-02"]:
        # 10分おきにスパイクを発生させる
        base = 30 if host == "web-01" else 45
        spike = 40 if i % 10 == 0 else 0
        cpu = base + spike + random.uniform(-5, 5)
        tsdb.write(TimeSeriesPoint(
            measurement="cpu_usage",
            tags={"host": host, "region": "ap-northeast-1"},
            fields={"usage_percent": round(cpu, 2)},
            timestamp=ts,
        ))
print(f"  書き込み完了: {60 * 2} ポイント")

# 時間範囲クエリ
print("\n[クエリ: web-01 の最初の 5 分間]")
results = tsdb.query_range(
    "cpu_usage",
    start=now,
    end=now + timedelta(minutes=5),
    tag_filter={"host": "web-01"},
)
for p in results[:3]:
    print(f"  {p.timestamp.strftime('%H:%M')} | {p.fields['usage_percent']:.1f}%")

# 5分ウィンドウで平均値集計
print("\n[集計: 5分ウィンドウの平均 CPU 使用率（web-01）]")
aggregated = tsdb.aggregate(
    "cpu_usage", "usage_percent",
    start=now, end=now + timedelta(hours=1),
    window_minutes=10, func="mean",
    tag_filter={"host": "web-01"},
)
for item in aggregated[:4]:
    bar = "█" * int(item["value"] / 5)
    print(f"  {item['time'].strftime('%H:%M')} | {item['value']:5.1f}% | {bar}")

# ダウンサンプリング
print("\n[ダウンサンプリング: 1分→60分ロールアップ]")
n = tsdb.downsample("cpu_usage", "cpu_usage_1h", "usage_percent", now, now+timedelta(hours=1), 60)
print(f"  {60} ポイント → {n} ポイントに削減")

# InfluxDB Line Protocol の例
print("\n[InfluxDB Line Protocol]")
sample_point = TimeSeriesPoint(
    measurement="cpu_usage",
    tags={"host": "web-01", "region": "ap-northeast-1"},
    fields={"usage_percent": 72.5, "load_avg": 1.23},
    timestamp=now,
)
print(f"  {sample_point}")

print("\n[TimescaleDB (PostgreSQL) の例]")
print("""  -- ハイパーテーブル作成
  SELECT create_hypertable('cpu_usage', 'timestamp');

  -- 集計クエリ（time_bucket関数）
  SELECT time_bucket('5 minutes', timestamp) AS bucket,
         host,
         AVG(usage_percent) AS avg_cpu
  FROM cpu_usage
  WHERE timestamp >= NOW() - INTERVAL '1 hour'
  GROUP BY bucket, host
  ORDER BY bucket DESC;""")
```

## 使用場面

- インフラ監視（サーバ CPU・メモリ・ネットワーク）を Prometheus + InfluxDB + Grafana で可視化する場面
- IoT センサーから毎秒送られるデータを TimescaleDB で高圧縮・高速集計して異常検知に活用する場面
- 株価・仮想通貨の OHLCV データを時系列 DB に格納してキャンドルチャートや移動平均を計算する場面

## 参考文献

- [InfluxDB Documentation](https://docs.influxdata.com/)
- [TimescaleDB Documentation](https://docs.timescale.com/)
- Fowler, M. "NoSQL Distilled" (Addison-Wesley)

<AffiliateBanner site="db_navi" />
