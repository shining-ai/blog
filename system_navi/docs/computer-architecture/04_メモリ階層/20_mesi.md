---
sidebar_position: 2
displayed_sidebar: computerArchitectureSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# キャッシュ一貫性と MESI プロトコル (Cache Coherence & MESI)

## キャッシュ一貫性とは

キャッシュ一貫性とは、

> マルチコア環境においてコアごとのキャッシュが同一メモリアドレスを矛盾なく参照するための一貫性保証プロトコル

です。
<br/>

マルチコアCPUでは各コアが独立したL1/L2キャッシュを持つため、あるコアが書き込んだ値が他のコアのキャッシュに反映されないと、プログラムが誤った値を読み取ります。この問題を解決するのがキャッシュコヒーレンスプロトコルです。

## キャッシュ一貫性問題

2コアが同じアドレス（例: `0x1000`）をキャッシュしている場合に書き込みがどう伝播するかが問題になります。

```
コア0が 0x1000 に 42 を書き込む
コア1は 0x1000 のキャッシュに旧値 0 を保持したまま
→ コア1が 0x1000 を読むと古い値 0 が返ってしまう（一貫性違反）
```

スヌープバス方式では、すべてのキャッシュコントローラがバス上のトランザクションを監視（スヌープ）し、自分のキャッシュ状態を更新することでこの問題を解消します。

## MESI の 4 状態

| 状態 | 意味 | 同コアからの読取 | 同コアからの書込 | 他コアのキャッシュ |
| --- | --- | --- | --- | --- |
| **M** (Modified) | 変更済み。メモリと不一致 | ヒット | ヒット | なし（唯一の保持者） |
| **E** (Exclusive) | 排他保持。メモリと一致 | ヒット | M へ遷移（バスアクセス不要） | なし |
| **S** (Shared) | 複数コアが保持。メモリと一致 | ヒット | 他コアを無効化しM へ | 他コアも S で保持 |
| **I** (Invalid) | 無効。このエントリは使えない | ミス→フェッチ | ミス→フェッチ後 M | 関係なし |

### 状態遷移表

| イベント | M | E | S | I |
| --- | --- | --- | --- | --- |
| ローカル読取（ヒット） | M 維持 | E 維持 | S 維持 | I → E or S（フェッチ） |
| ローカル書込 | M 維持 | E → M | S → M（他を I に）| I → M（フェッチ後） |
| 他コアの読取バス観測 | M → S（ライトバック） | E → S | S 維持 | 変化なし |
| 他コアの書込バス観測 | M → I（ライトバック） | E → I | S → I | 変化なし |

## スヌープバスプロトコルの動作フロー

```
1. コア0 が アドレス A を読取
   → バスに BusRd を発行
   → 他コアのキャッシュにAが無ければ メモリからフェッチ → E 状態

2. コア1 が アドレス A を読取
   → バスに BusRd を発行
   → コア0がスヌープしてデータ供給 → コア0: E→S、コア1: S

3. コア0 が アドレス A に書込
   → バスに BusRdX（Invalidate付き読取）を発行
   → コア1のキャッシュを I に遷移
   → コア0: S→M

4. コア0 が コンテキストスイッチ or フラッシュ
   → M 状態のラインをメモリにライトバック → M→I
```

## 実装

```c title="volatile とアトミック操作（C）"
#include <stdio.h>
#include <stdint.h>
#include <pthread.h>
#include <stdatomic.h>

/* volatile: コンパイラの最適化を抑制し、毎回メモリから読み取らせる。
 * MESI の観点では「このアドレスは他コアが変更しうる」という宣言。 */
volatile int shared_flag = 0;

/* atomic: コンパイラ+CPUレベルで不可分操作を保証。
 * MESI のバスロック（BusRdX）に相当するハードウェア操作を発行させる。 */
atomic_int atomic_counter = 0;

void *writer(void *arg) {
    (void)arg;
    /* 共有データを書き込む前に atomic store でメモリバリアを確立 */
    int data = 42;
    atomic_store_explicit(&atomic_counter, data, memory_order_release);
    shared_flag = 1;  /* volatile 書込: 他コアのキャッシュを Invalidate */
    return NULL;
}

void *reader(void *arg) {
    (void)arg;
    /* shared_flag が 1 になるまでスピン（MESIのS→I→S遷移が繰り返される） */
    while (shared_flag == 0) { /* spin */ }
    int val = atomic_load_explicit(&atomic_counter, memory_order_acquire);
    printf("読取値: %d\n", val);  /* 42 が保証される */
    return NULL;
}

int main(void) {
    pthread_t t1, t2;
    pthread_create(&t2, NULL, reader, NULL);
    pthread_create(&t1, NULL, writer, NULL);
    pthread_join(t1, NULL);
    pthread_join(t2, NULL);
    return 0;
}

/*
 * MESIキャッシュミスの計測（Linux perf を使用）:
 *   perf stat -e cache-misses,cache-references ./a.out
 * valgrind の cachegrind でキャッシュ利用状況を詳細分析:
 *   valgrind --tool=cachegrind ./a.out
 */
```

```python title="MESI プロトコルシミュレーション（Python）"
from enum import Enum, auto
from dataclasses import dataclass, field
from typing import Optional

class State(Enum):
    MODIFIED  = "M"
    EXCLUSIVE = "E"
    SHARED    = "S"
    INVALID   = "I"

@dataclass
class CacheLine:
    state: State = State.INVALID
    data: Optional[int] = None

class Cache:
    def __init__(self, core_id: int, bus: "Bus"):
        self.core_id = core_id
        self.bus = bus
        self.lines: dict[int, CacheLine] = {}

    def _get_line(self, addr: int) -> CacheLine:
        if addr not in self.lines:
            self.lines[addr] = CacheLine()
        return self.lines[addr]

    def read(self, addr: int) -> Optional[int]:
        line = self._get_line(addr)
        if line.state in (State.MODIFIED, State.EXCLUSIVE, State.SHARED):
            print(f"  コア{self.core_id}: 読取ヒット addr={addr} state={line.state.value}")
            return line.data
        # INVALID → バスリード発行
        print(f"  コア{self.core_id}: 読取ミス addr={addr} → BusRd 発行")
        data, shared_by_others = self.bus.bus_read(addr, self.core_id)
        line.data  = data
        line.state = State.SHARED if shared_by_others else State.EXCLUSIVE
        print(f"  コア{self.core_id}: → {line.state.value} 状態でフェッチ完了")
        return line.data

    def write(self, addr: int, value: int):
        line = self._get_line(addr)
        if line.state == State.MODIFIED:
            line.data = value
            print(f"  コア{self.core_id}: 書込ヒット(M) addr={addr} value={value}")
            return
        if line.state == State.EXCLUSIVE:
            line.state = State.MODIFIED
            line.data  = value
            print(f"  コア{self.core_id}: E→M addr={addr} value={value}")
            return
        # SHARED or INVALID → BusRdX でInvalidate要求
        print(f"  コア{self.core_id}: 書込ミス addr={addr} → BusRdX 発行")
        data = self.bus.bus_read_exclusive(addr, self.core_id)
        line.data  = value
        line.state = State.MODIFIED
        print(f"  コア{self.core_id}: → M 状態で書込完了 value={value}")

    def snoop_read(self, addr: int) -> tuple[bool, Optional[int]]:
        """他コアの BusRd を検知したときの処理"""
        line = self._get_line(addr)
        if line.state == State.MODIFIED:
            print(f"  コア{self.core_id}: スヌープ M→S (ライトバック) addr={addr}")
            line.state = State.SHARED
            return True, line.data
        if line.state == State.EXCLUSIVE:
            line.state = State.SHARED
            return True, line.data
        if line.state == State.SHARED:
            return True, line.data
        return False, None

    def snoop_invalidate(self, addr: int):
        """他コアの BusRdX を検知したときの処理"""
        line = self._get_line(addr)
        if line.state != State.INVALID:
            print(f"  コア{self.core_id}: スヌープ {line.state.value}→I addr={addr}")
            line.state = State.INVALID

class Bus:
    def __init__(self):
        self.memory: dict[int, int] = {}
        self.caches: list[Cache] = []

    def register(self, cache: Cache):
        self.caches.append(cache)

    def bus_read(self, addr: int, requester_id: int) -> tuple[int, bool]:
        shared = False
        data   = self.memory.get(addr, 0)
        for c in self.caches:
            if c.core_id == requester_id:
                continue
            hit, snoop_data = c.snoop_read(addr)
            if hit:
                shared = True
                if snoop_data is not None:
                    data = snoop_data
        return data, shared

    def bus_read_exclusive(self, addr: int, requester_id: int) -> int:
        data = self.memory.get(addr, 0)
        for c in self.caches:
            if c.core_id == requester_id:
                continue
            c.snoop_invalidate(addr)
        return data


# --- デモ ---
if __name__ == "__main__":
    bus    = Bus()
    core0  = Cache(0, bus)
    core1  = Cache(1, bus)
    bus.register(core0)
    bus.register(core1)
    bus.memory[0x100] = 10  # 初期値

    print("=== コア0 が 0x100 を読取 ===")
    core0.read(0x100)

    print("\n=== コア1 が 0x100 を読取 ===")
    core1.read(0x100)

    print("\n=== コア0 が 0x100 に 99 を書込 ===")
    core0.write(0x100, 99)

    print("\n=== コア1 が 0x100 を読取（Invalidate後）===")
    core1.read(0x100)
```

## 使用場面

- **マルチコア CPU**: Intel/AMDの全コアがMESI（またはMOESI/MESIF拡張）を実装しており、L1/L2間のキャッシュ一貫性を保証している
- **NUMA（Non-Uniform Memory Access）**: ソケット間はQPI/Infinity Fabricでノード間スヌープを行い、リモートキャッシュのInvalidateを発行する
- **GPU の L1 キャッシュ一貫性**: NVIDIA AmpereアーキテクチャではL2キャッシュをSMで共有し、コヒーレンスドメインを管理する
- **マルチスレッドプログラミング**: volatileやatomicを正しく使わないとMESIのInvalidateが発生せず、スレッド間でデータが一致しない（データ競合）

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
