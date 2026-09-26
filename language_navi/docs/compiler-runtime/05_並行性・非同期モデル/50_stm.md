import AffiliateBanner from '@site/src/components/AffiliateBanner';

# STM（ソフトウェアトランザクショナルメモリ）

## STM とは

> STM（Software Transactional Memory）とは、データベースのトランザクションの概念をメモリ操作に適用した並行制御メカニズムであり、複数の共有変数への読み書きをアトミックなトランザクションとして記述することで、ロックを使わずにスレッドセーフなコードを実現する。

従来のロックベース並行制御の問題点は、ロックの取得順序のミスによるデッドロック・ロック粒度の選択困難さ（粗すぎると低並行・細かすぎると複雑化）・優先度逆転などにある。STM はこれらを解決する楽観的並行制御の一種である。

STM のトランザクションは3段階で動作する。**1. 記録フェーズ**：トランザクション内のすべての読み書きをログ（トランザクションログ）に記録し、実際のメモリには書き込まない。**2. 検証フェーズ**：トランザクション開始後に他スレッドが読んだ変数を変更していないか確認する。**3. コミットフェーズ**：検証成功なら書き込みを確定（アトミック）。失敗なら**ロールバックしてリトライ**する。

Haskell の `STM` ライブラリは最も洗練された STM 実装の一つで、`TVar`（トランザクショナル変数）・`atomically` ブロック・`retry`（条件が満たされるまで待機）・`orElse`（代替トランザクション）を提供する。Clojure の `ref` と `dosync` も同様の概念を持つ。

## STM とロックの比較

| 観点 | ロックベース | STM |
|------|-------------|-----|
| デッドロック | ロック取得順序に注意が必要 | 発生しない |
| 記述のしやすさ | ロック管理が複雑 | トランザクションブロックで直感的 |
| 競合が少ない場合 | 良好 | 良好（ほぼオーバーヘッドなし） |
| 競合が多い場合 | 良好（ロック待ちのみ） | 悪化（リトライコストが大きい） |
| 採用言語 | ほぼ全言語 | Haskell・Clojure・Scala STM |
| 副作用との相性 | 可能 | 悪い（リトライで副作用が再実行） |

```python
# Python で STM を模倣した実装（概念デモ）

import threading
import time
from typing import Any, Callable, TypeVar
from dataclasses import dataclass, field

T = TypeVar("T")


@dataclass
class TVar:
    """トランザクショナル変数"""
    _value: Any
    _version: int = 0
    _lock: threading.Lock = field(default_factory=threading.Lock)

    def __post_init__(self):
        self._lock = threading.Lock()

    def read_committed(self) -> tuple[Any, int]:
        with self._lock:
            return self._value, self._version

    def commit(self, new_value: Any, expected_version: int) -> bool:
        """楽観的コミット：バージョンが一致すれば書き込み成功"""
        with self._lock:
            if self._version != expected_version:
                return False  # 競合検出 → リトライ必要
            self._value = new_value
            self._version += 1
            return True

    @property
    def value(self) -> Any:
        return self.read_committed()[0]


class TransactionLog:
    """トランザクションログ（読み書きを記録）"""
    def __init__(self):
        self.reads: dict[int, tuple[TVar, int]] = {}    # id → (tvar, version)
        self.writes: dict[int, tuple[TVar, Any]] = {}   # id → (tvar, new_value)

    def read(self, tvar: TVar) -> Any:
        tvar_id = id(tvar)
        if tvar_id in self.writes:
            return self.writes[tvar_id][1]  # 自分が書いた値を返す
        value, version = tvar.read_committed()
        self.reads[tvar_id] = (tvar, version)
        return value

    def write(self, tvar: TVar, value: Any) -> None:
        self.writes[id(tvar)] = (tvar, value)

    def validate_and_commit(self) -> bool:
        """読んだ変数のバージョンが変わっていないか確認してコミット"""
        # 検証：読んだ変数が他スレッドに変更されていないか
        for tvar_id, (tvar, read_version) in self.reads.items():
            _, current_version = tvar.read_committed()
            if current_version != read_version:
                return False  # 競合 → リトライ

        # コミット：書き込みを確定
        for tvar_id, (tvar, new_value) in self.writes.items():
            # ここでは簡略化のため強制書き込み（本来は CAS でアトミックに行う）
            tvar._value = new_value
            tvar._version += 1
        return True


def atomically(transaction: Callable[[TransactionLog], None],
               max_retries: int = 100) -> bool:
    """STM トランザクションを実行（競合時はリトライ）"""
    for attempt in range(max_retries):
        log = TransactionLog()
        try:
            transaction(log)
        except Exception as e:
            print(f"  トランザクション例外: {e}")
            return False

        if log.validate_and_commit():
            if attempt > 0:
                print(f"  コミット成功（{attempt+1} 回目で成功）")
            return True
        else:
            time.sleep(0.001 * (attempt + 1))  # 指数バックオフ

    print("  最大リトライ超過")
    return False


# ===== デモ: スレッドセーフな銀行振込 =====
account_a = TVar(1000)
account_b = TVar(500)

def transfer(amount: int) -> bool:
    def txn(log: TransactionLog) -> None:
        balance_a = log.read(account_a)
        balance_b = log.read(account_b)
        if balance_a < amount:
            raise ValueError("残高不足")
        log.write(account_a, balance_a - amount)
        log.write(account_b, balance_b + amount)
    return atomically(txn)

# 並行振込
threads = [threading.Thread(target=lambda: transfer(100)) for _ in range(5)]
for t in threads:
    t.start()
for t in threads:
    t.join()

print(f"A: {account_a.value}, B: {account_b.value}")
print(f"合計（不変であるべき）: {account_a.value + account_b.value}")
```

## 使用場面

- Haskell で複数の共有状態をデッドロックなしに更新するとき
- Clojure の `ref` と `dosync` による関数型スタイルの並行データ管理
- データベース的なアトミック性が必要なメモリ操作（複合データ更新）
- 高並行・低競合な環境での楽観的ロック戦略

## 参考文献

- Harris, T. et al. (2005). Composable memory transactions. *PPoPP '05*.
- [Haskell STM ドキュメント](https://hackage.haskell.org/package/stm)
- Shavit, N. & Touitou, D. (1997). Software transactional memory. *Distributed Computing*, 10(2).

<AffiliateBanner site="language_navi" />
