import AffiliateBanner from '@site/src/components/AffiliateBanner';

# サーキットブレーカーパターン

## サーキットブレーカーとは

> サーキットブレーカーパターンとは、マイクロサービス間の呼び出しで障害が連鎖することを防ぐための設計パターンであり、依存サービスの障害を検知して呼び出しを一時的に遮断（トリップ）し、依存先の回復を待ちながらフォールバック処理を提供することでシステム全体の耐障害性を高める。

マイクロサービスアーキテクチャでは、サービス A がサービス B を呼び出し、B が C を呼び出すという依存チェーンがある。B がタイムアウトや障害状態になると A のスレッドがブロックされ続け、やがて A も応答不能になる。この**カスケード障害（Cascade Failure）**を防ぐのがサーキットブレーカーの役割である。

サーキットブレーカーは3つの状態を持つ。**Closed（通常状態）**：呼び出しを通過させ、失敗率を監視する。**Open（遮断状態）**：失敗率が閾値を超えると回路を開き、以降の呼び出しをすぐに失敗させる（フォールバックを返す）。**Half-Open（試験状態）**：一定時間後に少数のリクエストを通過させ、回復を確認する。成功すれば Closed に、失敗すれば Open に戻る。

Netflix の **Hystrix**（現在はメンテナンスモード）・Resilience4j（Java）・**Polly**（.NET）・Go の **gobreaker** が代表的な実装ライブラリである。

## サーキットブレーカーの状態遷移

| 状態 | 動作 | 遷移条件 |
|------|------|---------|
| Closed | 通常通り呼び出す・失敗率を計測 | 失敗率 > 閾値 → Open |
| Open | 即座に失敗・フォールバックを返す | タイムアウト経過 → Half-Open |
| Half-Open | 試験呼び出しを許可 | 成功 → Closed / 失敗 → Open |

```python
# サーキットブレーカーの実装デモ

import time
import random
from enum import Enum
from dataclasses import dataclass, field
from collections import deque
from typing import Callable, TypeVar, Any

T = TypeVar("T")

class CircuitState(Enum):
    CLOSED = "Closed"
    OPEN = "Open"
    HALF_OPEN = "HalfOpen"

@dataclass
class CircuitBreakerConfig:
    failure_threshold: int = 5       # 失敗が何回続いたら Open にするか
    success_threshold: int = 2       # Half-Open から Closed に戻るのに必要な成功数
    timeout_seconds: float = 30.0    # Open → Half-Open への移行時間（秒）
    window_size: int = 10            # スライディングウィンドウのサイズ

class CircuitBreakerOpenError(Exception):
    pass

class CircuitBreaker:
    """
    シンプルなサーキットブレーカーの実装。
    Closed → Open → Half-Open → Closed の状態遷移を管理する。
    """

    def __init__(self, name: str, config: CircuitBreakerConfig | None = None):
        self.name = name
        self.config = config or CircuitBreakerConfig()
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._last_failure_time: float = 0.0
        self._call_results: deque[bool] = deque(maxlen=self.config.window_size)

    @property
    def state(self) -> CircuitState:
        if self._state == CircuitState.OPEN:
            # タイムアウト経過後に Half-Open に移行
            if time.time() - self._last_failure_time >= self.config.timeout_seconds:
                self._state = CircuitState.HALF_OPEN
                self._success_count = 0
                print(f"  [{self.name}] Open → HalfOpen（試験状態）")
        return self._state

    def call(self, func: Callable[[], T], fallback: Callable[[], T] | None = None) -> T:
        """
        保護された呼び出しを実行する。
        Open 状態では即座にフォールバックを返す。
        """
        current_state = self.state

        if current_state == CircuitState.OPEN:
            print(f"  [{self.name}] OPEN: 呼び出しを遮断")
            if fallback:
                return fallback()
            raise CircuitBreakerOpenError(f"Circuit {self.name} is OPEN")

        try:
            result = func()
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            if fallback:
                print(f"  [{self.name}] 失敗 → フォールバックを返す")
                return fallback()
            raise

    def _on_success(self) -> None:
        self._call_results.append(True)
        if self._state == CircuitState.HALF_OPEN:
            self._success_count += 1
            if self._success_count >= self.config.success_threshold:
                self._state = CircuitState.CLOSED
                self._failure_count = 0
                print(f"  [{self.name}] HalfOpen → Closed（回復）")

    def _on_failure(self) -> None:
        self._call_results.append(False)
        self._failure_count += 1
        self._last_failure_time = time.time()

        if self._state == CircuitState.HALF_OPEN:
            self._state = CircuitState.OPEN
            print(f"  [{self.name}] HalfOpen → Open（回復失敗）")
        elif self._failure_count >= self.config.failure_threshold:
            self._state = CircuitState.OPEN
            print(f"  [{self.name}] Closed → Open（失敗{self._failure_count}回）")


# ===== デモ: 不安定な外部サービスへの呼び出し =====
config = CircuitBreakerConfig(
    failure_threshold=3,
    timeout_seconds=2.0,  # デモ用に短く設定
    success_threshold=2,
)
cb = CircuitBreaker("PaymentService", config)

call_count = 0
failure_mode = True  # 最初は失敗モード

def call_payment_api() -> dict:
    global call_count
    call_count += 1
    if failure_mode:
        raise ConnectionError("Payment service unavailable")
    return {"status": "ok", "transaction_id": f"TXN-{call_count}"}

def fallback_payment() -> dict:
    return {"status": "queued", "message": "処理をキューに入れました（フォールバック）"}

print("=== フェーズ1: 障害発生（サーキットが Open になるまで）===")
for i in range(5):
    result = cb.call(call_payment_api, fallback=fallback_payment)
    print(f"  呼び出し{i+1}: {result['status']} (state={cb._state.value})")

print("\n=== フェーズ2: Open 状態での呼び出し（即座にフォールバック）===")
for i in range(3):
    result = cb.call(call_payment_api, fallback=fallback_payment)
    print(f"  呼び出し{i+1}: {result['status']} (state={cb._state.value})")

print("\n=== フェーズ3: タイムアウト後の回復 ===")
time.sleep(2.1)  # タイムアウト待機
failure_mode = False  # 外部サービスが回復

for i in range(4):
    result = cb.call(call_payment_api, fallback=fallback_payment)
    print(f"  呼び出し{i+1}: {result['status']} (state={cb._state.value})")
```

## 使用場面

- マイクロサービス間の同期 HTTP 呼び出しでのカスケード障害防止
- 外部決済サービス・メール送信サービスなど第三者 API への呼び出し保護
- データベースや Redis などの依存インフラの障害からアプリを保護するとき
- Kubernetes の Health Check と組み合わせた自動回復設計

## 参考文献

- Nygard, M. (2018). *Release It!* (2nd ed.). Pragmatic Bookshelf.
- Fowler, M. (2014). CircuitBreaker. martinfowler.com.
- [Resilience4j 公式ドキュメント](https://resilience4j.readme.io/docs/circuitbreaker)

<AffiliateBanner site="cloud_navi" />
