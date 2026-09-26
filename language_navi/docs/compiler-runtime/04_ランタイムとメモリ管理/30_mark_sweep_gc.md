import AffiliateBanner from '@site/src/components/AffiliateBanner';

# マーク＆スイープ GC

## マーク＆スイープとは

> マーク＆スイープ（Mark-and-Sweep）GC とは、「到達可能性（Reachability）」に基づいてゴミを識別するガーベジコレクションアルゴリズムであり、ルート集合（グローバル変数・スタック上の変数）から到達できるオブジェクトをマークし、マークされなかったオブジェクトをスイープ（回収）する2フェーズの処理を行う。

マーク＆スイープの核心は「到達可能なオブジェクト = 生きているオブジェクト」という判定基準である。どこからも参照されていないオブジェクトは到達不能であり、プログラムの実行に影響を与えずに解放できる。この方式は循環参照を自然に処理できる点が参照カウントに対する大きな利点である。

**マークフェーズ** では、ルート集合（スタック上の変数・グローバル変数・レジスタ）から始まり、参照グラフを深さ優先探索（DFS）または幅優先探索（BFS）でたどり、到達したすべてのオブジェクトにマークを付ける。**スイープフェーズ** では、ヒープ全体を走査しマークされていないオブジェクトを解放する。

欠点は GC の実行中にプログラムを停止させる必要がある点（Stop-The-World: STW）である。また、スイープ後にヒープが断片化する。現代のGC（Java の G1GC・Go の GC・V8 の GC）はこれを改良した「増分 GC」「並行 GC」「世代別 GC」などを組み合わせて STW の時間を最小化している。

## マーク＆スイープ GC の特性

| 特性 | 内容 |
|------|------|
| 循環参照の処理 | 自然に処理できる |
| STW 停止 | マーク・スイープ両フェーズで発生 |
| ヒープ断片化 | スイープ後に断片化が発生 |
| メモリオーバーヘッド | マークビット（各オブジェクトに1ビット） |
| 解放タイミング | GC 実行時（即座でない） |
| 採用例 | JVM・Go・V8・CPython（補完 GC） |

```python
# マーク＆スイープ GC の実装デモ

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional, Any

@dataclass
class GCObject:
    """GC 管理下のオブジェクト"""
    object_id: int
    name: str
    value: Any = None
    references: list['GCObject'] = field(default_factory=list)
    marked: bool = False   # マークビット


class MarkSweepGC:
    """シンプルなマーク＆スイープ GC の実装"""

    def __init__(self):
        self.heap: dict[int, GCObject] = {}  # ヒープ上の全オブジェクト
        self.roots: list[GCObject] = []       # ルート集合（スタック上の変数など）
        self._next_id = 0
        self.gc_count = 0

    def allocate(self, name: str, value: Any = None) -> GCObject:
        """新しいオブジェクトをヒープに割り当てる"""
        obj = GCObject(self._next_id, name, value)
        self.heap[self._next_id] = obj
        self._next_id += 1
        print(f"  [alloc] {name} (id={obj.object_id}), heap size={len(self.heap)}")
        return obj

    def add_root(self, obj: GCObject) -> None:
        """オブジェクトをルート集合に追加（スタック変数への代入など）"""
        if obj not in self.roots:
            self.roots.append(obj)

    def remove_root(self, obj: GCObject) -> None:
        """オブジェクトをルート集合から削除（スタック変数のスコープ終了など）"""
        if obj in self.roots:
            self.roots.remove(obj)

    def collect(self) -> int:
        """GC を実行。解放したオブジェクト数を返す"""
        self.gc_count += 1
        print(f"\n  === GC #{self.gc_count} 開始 (heap size={len(self.heap)}) ===")

        # --- フェーズ1: マーク ---
        print("  [マークフェーズ] ルートから到達可能なオブジェクトをマーク")
        for obj in self.heap.values():
            obj.marked = False  # 全マークをリセット

        worklist = list(self.roots)  # BFS/DFS のキュー
        while worklist:
            obj = worklist.pop()
            if obj.marked:
                continue
            obj.marked = True
            print(f"    マーク: {obj.name} (id={obj.object_id})")
            worklist.extend(obj.references)

        # --- フェーズ2: スイープ ---
        print("  [スイープフェーズ] マークなしオブジェクトを解放")
        dead_ids = [
            obj_id for obj_id, obj in self.heap.items()
            if not obj.marked
        ]
        for obj_id in dead_ids:
            print(f"    解放: {self.heap[obj_id].name} (id={obj_id})")
            del self.heap[obj_id]

        print(f"  === GC #{self.gc_count} 終了 "
              f"(解放={len(dead_ids)}, 残存={len(self.heap)}) ===\n")
        return len(dead_ids)


# === 動作確認 ===
gc = MarkSweepGC()

# オブジェクトを作成しルートに登録
a = gc.allocate("A", 100)
b = gc.allocate("B", 200)
c = gc.allocate("C", 300)
d = gc.allocate("D", 400)

gc.add_root(a)  # a はルート（スタック変数）
a.references.append(b)  # A → B
b.references.append(c)  # B → C

# d は誰からも参照されない（ガーベジ）

print(f"\nルート: {[obj.name for obj in gc.roots]}")
print(f"A の参照: {[obj.name for obj in a.references]}")

gc.collect()
# A, B, C はマークされる（A がルート → B → C）
# D はマークされない → 解放される

# 循環参照のテスト
print("=== 循環参照のテスト ===")
x = gc.allocate("X")
y = gc.allocate("Y")
x.references.append(y)
y.references.append(x)   # X ↔ Y 循環参照

gc.add_root(x)   # 最初はルートから参照される
gc.collect()     # X, Y は生存

print("--- ルートから X を削除 ---")
gc.remove_root(x)
gc.collect()
# X, Y はルートから到達不能 → 両方解放される（循環参照でも正しく回収！）
```

## 使用場面

- JVM の GC（G1GC・ZGC・Shenandoah）の基礎アルゴリズム
- Go の並行 GC（三色マーキング + 書き込みバリア）
- Python の補完 GC（参照カウントで扱えない循環参照を回収）
- V8（Node.js・Chrome）の Major GC（Old Generation の回収）

## 参考文献

- McCarthy, J. (1960). Recursive functions of symbolic expressions. *CACM*, 3(4). (GC の起源)
- Jones, R. et al. (2011). *The Garbage Collection Handbook*. CRC Press.
- [Go — GC の仕組み](https://go.dev/doc/gc-guide)

<AffiliateBanner site="language_navi" />
