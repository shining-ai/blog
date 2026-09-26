import AffiliateBanner from '@site/src/components/AffiliateBanner';

# カオスエンジニアリング

## カオスエンジニアリングとは

> カオスエンジニアリングとは、本番環境に意図的に障害・遅延・リソース枯渇などの混乱を注入することで、システムが予期しない条件下でも安定して動作し続けることを実験的に検証するエンジニアリング手法である。

Netflix が2010年代初頭に提唱した手法で、その名の通り「制御された混乱（Chaos）」を通じてシステムの弱点を本番障害が起きる前に発見することが目的である。Netflix は自ら **Chaos Monkey**（ランダムにサービスインスタンスを停止する）を本番環境で定常運転し、「どのサービスが停止しても Netflix が動き続けること」を証明した。

カオスエンジニアリングの実践原則（Principles of Chaos Engineering）：1. **定常状態の仮説を立てる**（正常動作のメトリクスベースライン）。2. **現実の障害シナリオを模倣する**（インスタンス停止・ネットワーク遅延・CPU 過負荷）。3. **本番環境で実験する**（非本番では気付けない問題がある）。4. **爆発半径を最小化する**（少数のインスタンスから始め、問題があれば即停止）。5. **自動化する**（定常的な実験として運用する）。

現代のツールとして、**Chaos Mesh**（Kubernetes ネイティブ）・**Litmus Chaos**・**Gremlin**（有償）・**AWS Fault Injection Simulator（FIS）** が代表的である。

## カオス実験のシナリオ例

| シナリオ | 注入する障害 | 確認する仮説 |
|---------|------------|-------------|
| インスタンス停止 | Pod/VM をランダム停止 | サーキットブレーカー・冗長化が機能するか |
| ネットワーク遅延 | 特定サービス間に200ms遅延を追加 | タイムアウト設定が適切か |
| ネットワーク断絶 | サービス間通信を遮断 | フォールバック・リトライが機能するか |
| CPU 過負荷 | 特定ノードの CPU を80%占有 | オートスケーリングが発動するか |
| ディスク枯渇 | ディスクを意図的に満杯にする | ログローテーション・エラー処理が正しいか |
| 依存サービス停止 | 外部 API をモックで503返却 | デグレード動作が正しいか |

```python
# カオスエンジニアリングのフレームワーク実装デモ

import time
import random
import threading
from dataclasses import dataclass, field
from typing import Callable, Any
from contextlib import contextmanager
from enum import Enum

class ChaosType(Enum):
    LATENCY = "latency"           # 遅延注入
    ERROR = "error"               # エラー注入
    EXCEPTION = "exception"       # 例外発生
    RESOURCE_EXHAUSTION = "resource"  # リソース枯渇シミュレーション


@dataclass
class ChaosExperiment:
    name: str
    chaos_type: ChaosType
    probability: float = 1.0       # 障害を注入する確率
    latency_ms: float = 500.0      # 遅延時間（LATENCY タイプ）
    error_message: str = "Chaos injected error"
    enabled: bool = True


class ChaosInjector:
    """
    サービス呼び出しに障害を注入するカオスエンジニアリングフレームワーク。
    本番環境では確率・対象・有効期間を外部設定で制御する。
    """

    def __init__(self, enabled: bool = True):
        self._enabled = enabled
        self._experiments: dict[str, ChaosExperiment] = {}
        self._injection_count: dict[str, int] = {}

    def register(self, experiment: ChaosExperiment) -> None:
        self._experiments[experiment.name] = experiment
        self._injection_count[experiment.name] = 0

    @contextmanager
    def inject(self, experiment_name: str):
        """コンテキストマネージャーとして使用する障害注入"""
        exp = self._experiments.get(experiment_name)
        if not exp or not exp.enabled or not self._enabled:
            yield
            return

        if random.random() > exp.probability:
            yield  # 確率によりスキップ
            return

        self._injection_count[experiment_name] += 1

        if exp.chaos_type == ChaosType.LATENCY:
            print(f"  [CHAOS] {experiment_name}: {exp.latency_ms}ms の遅延を注入")
            time.sleep(exp.latency_ms / 1000)
            yield

        elif exp.chaos_type == ChaosType.ERROR:
            print(f"  [CHAOS] {experiment_name}: エラーレスポンスを注入")
            yield  # 処理自体は実行するが...
            # 実際はここでレスポンスを改ざんする

        elif exp.chaos_type == ChaosType.EXCEPTION:
            print(f"  [CHAOS] {experiment_name}: 例外を注入")
            raise ConnectionError(exp.error_message)

        else:
            yield

    def report(self) -> dict:
        return {name: count for name, count in self._injection_count.items()}


# ===== カオス実験のシナリオ定義 =====
chaos = ChaosInjector(enabled=True)

chaos.register(ChaosExperiment(
    name="payment-service-latency",
    chaos_type=ChaosType.LATENCY,
    probability=0.3,    # 30% の確率で遅延
    latency_ms=300.0,
))

chaos.register(ChaosExperiment(
    name="inventory-service-failure",
    chaos_type=ChaosType.EXCEPTION,
    probability=0.2,    # 20% の確率で例外
    error_message="Inventory service unavailable (chaos)",
))


# ===== 定常状態の仮説検証 =====
@dataclass
class ExperimentResult:
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    total_latency_ms: float = 0.0
    latencies: list[float] = field(default_factory=list)

    @property
    def success_rate(self) -> float:
        if self.total_requests == 0:
            return 0.0
        return self.successful_requests / self.total_requests * 100

    @property
    def p95_latency_ms(self) -> float:
        if not self.latencies:
            return 0.0
        sorted_lat = sorted(self.latencies)
        idx = int(len(sorted_lat) * 0.95)
        return sorted_lat[min(idx, len(sorted_lat) - 1)]


def run_chaos_experiment(num_requests: int = 20) -> ExperimentResult:
    """
    カオス実験の実行：
    1. 定常状態の仮説: 成功率 > 90%、p95 レイテンシ < 500ms
    2. 障害を注入して観察
    3. 仮説が満たされているか検証
    """
    result = ExperimentResult()

    for i in range(num_requests):
        result.total_requests += 1
        start = time.perf_counter()

        try:
            # 在庫サービス呼び出し
            with chaos.inject("inventory-service-failure"):
                time.sleep(0.01)  # 正常な処理時間

            # 決済サービス呼び出し
            with chaos.inject("payment-service-latency"):
                time.sleep(0.02)  # 正常な処理時間

            elapsed_ms = (time.perf_counter() - start) * 1000
            result.successful_requests += 1
            result.latencies.append(elapsed_ms)

        except Exception as e:
            result.failed_requests += 1
            print(f"  [FAIL] リクエスト{i+1}: {e}")

    return result


# ===== 実験の実行と検証 =====
print("=== カオス実験: 定常状態の仮説検証 ===")
print("仮説: 成功率 > 80%、p95 レイテンシ < 500ms\n")

result = run_chaos_experiment(num_requests=30)

print(f"\n=== 実験結果 ===")
print(f"  総リクエスト数: {result.total_requests}")
print(f"  成功: {result.successful_requests} ({result.success_rate:.1f}%)")
print(f"  失敗: {result.failed_requests}")
print(f"  p95 レイテンシ: {result.p95_latency_ms:.1f}ms")
print(f"\n  仮説「成功率 > 80%」: {'PASS' if result.success_rate > 80 else 'FAIL'}")
print(f"  仮説「p95 < 500ms」: {'PASS' if result.p95_latency_ms < 500 else 'FAIL'}")

print(f"\n=== 注入された障害の統計 ===")
for name, count in chaos.report().items():
    print(f"  {name}: {count} 回注入")
```

## 使用場面

- 本番デプロイ前にサーキットブレーカー・リトライ・タイムアウトが正しく機能するか検証
- Kubernetes の Pod Disruption Budget やオートスケーリングの動作確認
- 新しいリリースのカナリアデプロイ時に既知の障害シナリオへの耐性を確認
- SRE チームの Game Day（計画的な障害演習）でチームの対応能力を鍛える

## 参考文献

- Rosenthal, C. et al. (2020). *Chaos Engineering*. O'Reilly.
- [Principles of Chaos Engineering](https://principlesofchaos.org/)
- [Chaos Mesh 公式ドキュメント](https://chaos-mesh.org/docs/)

<AffiliateBanner site="cloud_navi" />
