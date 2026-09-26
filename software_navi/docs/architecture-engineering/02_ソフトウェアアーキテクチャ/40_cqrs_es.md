import AffiliateBanner from '@site/src/components/AffiliateBanner';

# CQRS と Event Sourcing

## CQRS とは

> コマンド（書き込み）とクエリ（読み取り）の責務を分離し、それぞれに最適化されたモデルを持たせるアーキテクチャパターン。

CQRS（Command Query Responsibility Segregation）は Greg Young が提唱したパターンです。従来の CRUD では同一モデルで読み書きを行いますが、書き込みと読み取りの最適化要件は大きく異なります。CQRS ではコマンドモデル（書き込み用）とクエリモデル（読み取り用）を分離することで、それぞれを独立して最適化・スケールできます。

Event Sourcing（ES）は、データの現在状態ではなく「状態変化のイベント履歴」を保存するパターンです。残高を直接保存するのではなく「入金¥1,000」「出金¥300」というイベントを積み重ね、残高を都度再計算します。監査ログ・タイムトラベルデバッグ・イベントリプレイが自然に実現できます。

CQRS と ES は独立して使用できますが、組み合わせることで強力なアーキテクチャになります。

## CQRS・ESの比較

| 観点 | 従来のCRUD | CQRS + ES |
|------|-----------|-----------|
| データ保存 | 最新状態のみ | イベント履歴全件 |
| 読み取りモデル | 書き込みと同一 | 用途ごとに最適化 |
| 監査ログ | 別途実装が必要 | イベントが自然にログになる |
| 複雑度 | 低い | 高い |
| 向いているシステム | CRUD中心 | 高トラフィック・監査必須 |

```python title="CQRS + Event Sourcing — 銀行口座（Python）"
from dataclasses import dataclass, field
from datetime import datetime
from abc import ABC, abstractmethod

# ===== Events =====
@dataclass
class DomainEvent:
    occurred_at: datetime = field(default_factory=datetime.utcnow)

@dataclass
class MoneyDeposited(DomainEvent):
    amount: float = 0.0

@dataclass
class MoneyWithdrawn(DomainEvent):
    amount: float = 0.0


# ===== Aggregate（Write Side）=====
class BankAccount:
    def __init__(self):
        self._events: list[DomainEvent] = []
        self._balance: float = 0.0

    def deposit(self, amount: float) -> None:
        if amount <= 0:
            raise ValueError("Amount must be positive")
        event = MoneyDeposited(amount=amount)
        self._apply(event)
        self._events.append(event)

    def withdraw(self, amount: float) -> None:
        if amount > self._balance:
            raise RuntimeError("Insufficient funds")
        event = MoneyWithdrawn(amount=amount)
        self._apply(event)
        self._events.append(event)

    def _apply(self, event: DomainEvent) -> None:
        if isinstance(event, MoneyDeposited):
            self._balance += event.amount
        elif isinstance(event, MoneyWithdrawn):
            self._balance -= event.amount

    @property
    def balance(self) -> float:
        return self._balance

    @property
    def events(self) -> list[DomainEvent]:
        return list(self._events)


# ===== Read Model（Query Side）=====
@dataclass
class AccountSummary:
    balance: float
    transaction_count: int
    last_transaction: datetime | None


class AccountProjection:
    """イベント履歴からRead Modelを構築するプロジェクション"""
    def project(self, events: list[DomainEvent]) -> AccountSummary:
        balance = 0.0
        count = 0
        last_ts = None
        for e in events:
            if isinstance(e, MoneyDeposited):
                balance += e.amount
            elif isinstance(e, MoneyWithdrawn):
                balance -= e.amount
            count += 1
            last_ts = e.occurred_at
        return AccountSummary(balance=balance, transaction_count=count, last_transaction=last_ts)


# 使用例
account = BankAccount()
account.deposit(10000)
account.deposit(5000)
account.withdraw(3000)

projection = AccountProjection()
summary = projection.project(account.events)
print(f"残高: {summary.balance}")           # 残高: 12000.0
print(f"取引回数: {summary.transaction_count}")  # 取引回数: 3
```

## 使用場面

- 高読み取り・高書き込みで読み書きを独立してスケールしたいシステム
- 金融・医療など完全な監査証跡（イベント履歴）が必要なシステム
- 過去の時点の状態を再現する「タイムトラベルデバッグ」が必要なとき

## 参考文献

- Greg Young, *CQRS Documents*, 2010
- Martin Fowler, *Event Sourcing*, https://martinfowler.com/eaaDev/EventSourcing.html

<AffiliateBanner site="software_navi" />
