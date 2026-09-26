import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 分散トランザクション（2フェーズコミット）

## 分散トランザクションとは

> 分散トランザクションとは複数のデータベースノード・サービスにまたがる操作を ACID トランザクションとして扱う仕組みであり、2フェーズコミット（2PC）はコーディネータが全参加者の合意を 2 段階で確認する古典的なプロトコルである。

マイクロサービスや分散データベースでは「注文DB の在庫を減らしつつ、支払い DB から料金を引く」という複数のストレージにまたがる操作を原子的に完了させる必要があります。どちらか一方だけ成功する中途半端な状態（Partial Failure）を防がなければなりません。

2 フェーズコミット（2PC）はこの問題への古典的解法です。フェーズ 1（準備フェーズ）：コーディネータが全参加者に「コミットできるか」を確認し、全員が Yes を返したらフェーズ 2 に進みます。フェーズ 2（コミットフェーズ）：コーディネータが全参加者に Commit（または Abort）を送信します。

2PC の問題点は「コーディネータ障害時のブロッキング」です。フェーズ 2 の途中でコーディネータがダウンすると、参加者は Commit/Abort が来るまで無期限にロックを保持します（ブロッキング問題）。

3 フェーズコミット（3PC）はこの問題を緩和しますが遅延が増加します。現代のシステムでは Saga パターン（補償トランザクション）や TCC（Try-Confirm-Cancel）が実用的な代替として広く使われています。Google Spanner は Paxos コンセンサスを使った高可用性の分散トランザクションを実装しています。

## 2PC・Saga・TCC の比較

| 手法 | ACID 保証 | 可用性 | 実装複雑さ | 用途 |
|------|---------|--------|----------|------|
| 2PC | 強い | 低い（ブロッキング） | 中程度 | 緊密結合 DB |
| 3PC | 強い | 中程度 | 高い | 古典的分散 DB |
| Saga | 結果整合性 | 高い | 高い（補償設計） | マイクロサービス |
| TCC | 強い（ロック） | 中程度 | 高い | 金融マイクロサービス |

```python
from enum import Enum
from dataclasses import dataclass, field
import uuid
import random

class TxState(Enum):
    INIT      = "INIT"
    PREPARED  = "PREPARED"
    COMMITTED = "COMMITTED"
    ABORTED   = "ABORTED"
    BLOCKING  = "BLOCKING"  # コーディネータ障害時


@dataclass
class Participant:
    """2PC の参加者（データベースノード）"""
    name: str
    data: dict = field(default_factory=dict)
    prepared_data: dict = field(default_factory=dict)  # 準備済みデータ（ロック中）
    state: TxState = TxState.INIT
    fail_on_prepare: bool = False  # テスト用: prepare 時に失敗する

    def prepare(self, tx_id: str, writes: dict) -> bool:
        """フェーズ 1: コミット準備（ロックを取得して一時領域に書き込む）"""
        if self.fail_on_prepare:
            print(f"    [{self.name}] PREPARE 失敗（障害シミュレーション）")
            return False
        self.prepared_data[tx_id] = writes
        self.state = TxState.PREPARED
        print(f"    [{self.name}] PREPARE OK (ロック取得, 仮書き込み: {writes})")
        return True

    def commit(self, tx_id: str) -> bool:
        """フェーズ 2: コミット（仮書き込みを本番に適用してロック解放）"""
        if tx_id in self.prepared_data:
            self.data.update(self.prepared_data.pop(tx_id))
            self.state = TxState.COMMITTED
            print(f"    [{self.name}] COMMIT 完了 (データ確定: {self.data})")
            return True
        return False

    def abort(self, tx_id: str) -> bool:
        """フェーズ 2: アボート（仮書き込みを破棄してロック解放）"""
        self.prepared_data.pop(tx_id, None)
        self.state = TxState.ABORTED
        print(f"    [{self.name}] ABORT (仮書き込みを破棄, ロック解放)")
        return True


class TwoPhaseCommit:
    """2フェーズコミットのコーディネータ"""

    def __init__(self, participants: list[Participant]):
        self.participants = participants

    def execute(self, tx_id: str, writes: list[dict]) -> bool:
        """
        2PC トランザクションの実行
        writes: [{"participant_idx": 0, "data": {...}}, ...]
        """
        print(f"\n[2PC トランザクション: {tx_id}]")

        # フェーズ 1: PREPARE
        print("  フェーズ 1: PREPARE")
        prepared = []
        for i, write in enumerate(writes):
            participant = self.participants[write["participant_idx"]]
            if participant.prepare(tx_id, write["data"]):
                prepared.append(participant)
            else:
                # 1 つでも失敗 → 全員 ABORT
                print(f"  → PREPARE 失敗: 全参加者に ABORT を送信")
                for p in prepared:
                    p.abort(tx_id)
                participant.abort(tx_id)
                return False

        # フェーズ 2: COMMIT（全員が Yes）
        print("  フェーズ 2: COMMIT")
        for participant in prepared:
            participant.commit(tx_id)
        return True


# ===========================
# Saga パターン（補償トランザクション）
# ===========================

@dataclass
class SagaStep:
    name: str
    action: callable
    compensation: callable

class OrderSaga:
    """
    注文処理の Saga: 補償トランザクションによる分散処理
    ステップ: 在庫確保 → 支払い → 配送手配
    失敗時: 補償アクションで各ステップを逆順にロールバック
    """

    def __init__(self):
        self.inventory = {"item-A": 10, "item-B": 5}
        self.payments = {}
        self.shipments = {}

    def reserve_inventory(self, order_id: str, item: str, qty: int) -> bool:
        if self.inventory.get(item, 0) >= qty:
            self.inventory[item] -= qty
            print(f"  [Saga] 在庫確保 OK: {item} x{qty} → 残り {self.inventory[item]}")
            return True
        print(f"  [Saga] 在庫不足: {item}")
        return False

    def compensate_inventory(self, order_id: str, item: str, qty: int) -> None:
        self.inventory[item] = self.inventory.get(item, 0) + qty
        print(f"  [Saga 補償] 在庫返却: {item} x{qty}")

    def process_payment(self, order_id: str, amount: int) -> bool:
        if random.random() > 0.3:  # 70% 成功率
            self.payments[order_id] = amount
            print(f"  [Saga] 支払い処理 OK: {amount} 円")
            return True
        print(f"  [Saga] 支払い失敗（残高不足）")
        return False

    def compensate_payment(self, order_id: str, amount: int) -> None:
        self.payments.pop(order_id, None)
        print(f"  [Saga 補償] 支払い返金: {amount} 円")

    def arrange_shipping(self, order_id: str) -> bool:
        self.shipments[order_id] = "PENDING"
        print(f"  [Saga] 配送手配 OK: {order_id}")
        return True

    def compensate_shipping(self, order_id: str) -> None:
        self.shipments.pop(order_id, None)
        print(f"  [Saga 補償] 配送キャンセル: {order_id}")

    def execute(self, order_id: str, item: str, qty: int, amount: int) -> bool:
        print(f"\n[Saga: 注文 {order_id}]")
        completed = []

        # Step 1: 在庫確保
        if self.reserve_inventory(order_id, item, qty):
            completed.append(lambda: self.compensate_inventory(order_id, item, qty))
        else:
            return False

        # Step 2: 支払い
        if self.process_payment(order_id, amount):
            completed.append(lambda: self.compensate_payment(order_id, amount))
        else:
            # 補償: 在庫を返す
            print("  → Saga ロールバック開始")
            for comp in reversed(completed):
                comp()
            return False

        # Step 3: 配送手配
        if self.arrange_shipping(order_id):
            print(f"  → Saga 全ステップ完了: 注文 {order_id} 成功")
            return True
        else:
            print("  → Saga ロールバック開始")
            for comp in reversed(completed):
                comp()
            return False


print("=== 分散トランザクションデモ ===\n")

# 2PC の正常系
inventory_db = Participant("inventory-db")
payment_db   = Participant("payment-db")

coordinator = TwoPhaseCommit([inventory_db, payment_db])
tx_id = str(uuid.uuid4())[:8]
result = coordinator.execute(tx_id, [
    {"participant_idx": 0, "data": {"order-1": {"item": "A", "qty": 2}}},
    {"participant_idx": 1, "data": {"order-1": {"amount": 5000}}},
])
print(f"  2PC 結果: {'成功' if result else '失敗'}")

# 2PC の失敗系（payment-db が PREPARE で失敗）
print()
inventory_db2 = Participant("inventory-db-2")
payment_db2   = Participant("payment-db-2", fail_on_prepare=True)
coordinator2  = TwoPhaseCommit([inventory_db2, payment_db2])
tx_id2 = str(uuid.uuid4())[:8]
result2 = coordinator2.execute(tx_id2, [
    {"participant_idx": 0, "data": {"order-2": {"item": "B", "qty": 1}}},
    {"participant_idx": 1, "data": {"order-2": {"amount": 3000}}},
])
print(f"  2PC 結果: {'成功' if result2 else '失敗'}")

# Saga
print()
random.seed(1)  # 再現性のためシードを固定
saga = OrderSaga()
for i in range(3):
    saga.execute(f"order-{i+1:03}", "item-A", 2, 3000)
```

## 使用場面

- 同一組織内の 2 つの RDB にまたがる強一貫性トランザクション（在庫 DB と注文 DB）に 2PC を使う場面
- マイクロサービス間で注文・支払い・配送を調整する際に Saga パターン（補償トランザクション）を実装する場面
- XA トランザクション（JDBC・JTA）が使えないシステムで TCC パターンを使って分散処理の原子性を保証する場面

## 参考文献

- Gray, J. and Lamport, L. "Consensus on Transaction Commit" (2004)
- Kleppmann, M. "Designing Data-Intensive Applications" (O'Reilly)
- Richardson, C. "Microservices Patterns" (Manning)

<AffiliateBanner site="db_navi" />
