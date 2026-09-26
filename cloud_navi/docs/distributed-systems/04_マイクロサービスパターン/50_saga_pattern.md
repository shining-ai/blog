import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Saga パターン（分散トランザクション）

## Saga パターンとは

> Saga パターンとは、マイクロサービス間にまたがるビジネストランザクションを、各サービスが個別に実行する一連のローカルトランザクションとして分割し、失敗時には補償トランザクション（Compensating Transaction）によってロールバックを実現する分散トランザクション管理パターンである。

従来の RDBMS では2フェーズコミット（2PC）により複数テーブルへのアトミックな書き込みを保証できる。しかしマイクロサービスでは各サービスが独自のデータベースを持つため（Database per Service）、2PC によるクロスサービストランザクションは事実上困難である。2PC はコーディネーターへの依存・ロックによる可用性低下・サービス間の強結合をもたらすためである。

Saga はこの問題を**最終的一貫性（Eventual Consistency）**で解決する。各ステップが成功すれば次のステップに進み、あるステップが失敗したら既に実行されたステップを打ち消す補償トランザクションを逆順に実行する。

Saga には2つの実装方式がある。**コレオグラフィー（Choreography）**：各サービスが自律的にイベントを発行・購読してトランザクションを進める。疎結合だが全体の流れが把握しにくい。**オーケストレーション（Orchestration）**：中央のオーケストレーター（Saga コーディネーター）が各サービスへのコマンドを順番に発行し、失敗時に補償を指示する。全体の流れが明確で可視化しやすい。

## コレオグラフィー vs オーケストレーション

| 観点 | コレオグラフィー | オーケストレーション |
|------|----------------|-------------------|
| 制御 | 分散（各サービスが自律） | 中央集権（オーケストレーター） |
| 結合度 | 低い（イベント経由） | 中程度（コーディネーター依存） |
| 可視性 | 低い（全体把握が難しい） | 高い（フロー図が明確） |
| 障害分析 | 難しい | 容易 |
| 採用例 | イベント駆動マイクロサービス | 注文処理・支払いフロー |

```python
# Saga パターン（オーケストレーション方式）の実装デモ

from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Callable
import uuid

class SagaStatus(Enum):
    RUNNING = "Running"
    COMPLETED = "Completed"
    COMPENSATING = "Compensating"
    FAILED = "Failed"

@dataclass
class SagaStep:
    name: str
    action: Callable[[], bool]        # 正処理（True=成功, False=失敗）
    compensate: Callable[[], None]    # 補償処理（ロールバック）
    executed: bool = False

@dataclass
class SagaContext:
    """Saga の実行コンテキスト（サービス間で共有する状態）"""
    order_id: str
    customer_id: str
    amount: float
    inventory_reserved: bool = False
    payment_charged: bool = False
    shipping_created: bool = False


class SagaOrchestrator:
    """
    オーケストレーション方式の Saga コーディネーター。
    ステップを順番に実行し、失敗時は逆順に補償処理を実行する。
    """

    def __init__(self, saga_id: str, context: SagaContext):
        self.saga_id = saga_id
        self.context = context
        self.steps: list[SagaStep] = []
        self.status = SagaStatus.RUNNING
        self.executed_steps: list[SagaStep] = []

    def add_step(self, step: SagaStep) -> 'SagaOrchestrator':
        self.steps.append(step)
        return self

    def execute(self) -> bool:
        """Saga を実行する。失敗時は自動的に補償処理を行う"""
        print(f"\n=== Saga [{self.saga_id}] 開始 ===")

        for step in self.steps:
            print(f"  [STEP] {step.name} を実行中...")
            try:
                success = step.action()
                if success:
                    step.executed = True
                    self.executed_steps.append(step)
                    print(f"    ✓ {step.name} 成功")
                else:
                    print(f"    ✗ {step.name} 失敗 → 補償処理を開始")
                    self._compensate()
                    return False
            except Exception as e:
                print(f"    ✗ {step.name} 例外: {e} → 補償処理を開始")
                self._compensate()
                return False

        self.status = SagaStatus.COMPLETED
        print(f"=== Saga [{self.saga_id}] 完了 ===")
        return True

    def _compensate(self) -> None:
        """実行済みのステップを逆順に補償する"""
        self.status = SagaStatus.COMPENSATING
        print(f"\n  --- 補償処理 (逆順) ---")
        for step in reversed(self.executed_steps):
            print(f"  [COMPENSATE] {step.name} の補償処理...")
            try:
                step.compensate()
                print(f"    ✓ {step.name} の補償完了")
            except Exception as e:
                print(f"    ✗ {step.name} 補償失敗（要手動対応）: {e}")
        self.status = SagaStatus.FAILED


# ===== EC サイトの注文 Saga =====
def create_order_saga(ctx: SagaContext) -> SagaOrchestrator:
    saga = SagaOrchestrator(str(uuid.uuid4())[:8], ctx)

    # ステップ1: 在庫引き当て
    def reserve_inventory() -> bool:
        print(f"      在庫サービス: {ctx.order_id} の在庫を引き当て中...")
        ctx.inventory_reserved = True
        return True

    def cancel_inventory_reservation() -> None:
        print(f"      在庫サービス: {ctx.order_id} の在庫引き当てをキャンセル")
        ctx.inventory_reserved = False

    # ステップ2: 決済処理
    def charge_payment() -> bool:
        print(f"      決済サービス: {ctx.customer_id} に ¥{ctx.amount} を請求中...")
        # 金額が大きすぎる場合は失敗とする（デモ）
        if ctx.amount > 50000:
            return False  # 与信限度額超過
        ctx.payment_charged = True
        return True

    def refund_payment() -> None:
        print(f"      決済サービス: {ctx.customer_id} に ¥{ctx.amount} を返金")
        ctx.payment_charged = False

    # ステップ3: 配送手配
    def create_shipping() -> bool:
        print(f"      配送サービス: {ctx.order_id} の配送を手配中...")
        ctx.shipping_created = True
        return True

    def cancel_shipping() -> None:
        print(f"      配送サービス: {ctx.order_id} の配送をキャンセル")
        ctx.shipping_created = False

    saga.add_step(SagaStep("在庫引き当て", reserve_inventory, cancel_inventory_reservation))
    saga.add_step(SagaStep("決済処理", charge_payment, refund_payment))
    saga.add_step(SagaStep("配送手配", create_shipping, cancel_shipping))

    return saga


# === 正常系: 注文成功 ===
ctx_ok = SagaContext(order_id="ORDER-001", customer_id="CUST-100", amount=9800.0)
saga_ok = create_order_saga(ctx_ok)
success = saga_ok.execute()
print(f"結果: {'成功' if success else '失敗'}, Status: {saga_ok.status.value}")

# === 異常系: 決済失敗 → 在庫引き当てが補償される ===
ctx_fail = SagaContext(order_id="ORDER-002", customer_id="CUST-101", amount=99999.0)
saga_fail = create_order_saga(ctx_fail)
success = saga_fail.execute()
print(f"結果: {'成功' if success else '失敗'}, Status: {saga_fail.status.value}")
print(f"在庫の引き当ては解除された: {not ctx_fail.inventory_reserved}")
```

## 使用場面

- EC サイトの注文フロー（在庫引き当て・決済・配送手配の連携）
- 銀行振込（口座引き落とし・送金・入金の3サービス間のトランザクション）
- 旅行予約（フライト・ホテル・レンタカーの一括予約と全体キャンセル）
- オーケストレーションエンジンとして AWS Step Functions・Temporal・Conductor を活用

## 参考文献

- Richardson, C. (2018). *Microservices Patterns*. Manning. Chapter 4.
- Garcia-Molina, H. & Salem, K. (1987). Sagas. *SIGMOD '87*.
- [Temporal ワークフローエンジン](https://temporal.io/)

<AffiliateBanner site="cloud_navi" />
