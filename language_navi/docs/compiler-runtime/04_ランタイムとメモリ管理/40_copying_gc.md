import AffiliateBanner from '@site/src/components/AffiliateBanner';

# コピー GC と世代別 GC

## コピー GC とは

> コピー GC（Copying GC）とは、ヒープを「生存空間（From空間）」と「退避空間（To空間）」の2つに分割し、GC 実行時に生きているオブジェクトだけを To 空間にコピーして From 空間全体を一括解放するアルゴリズムである。

コピー GC の最大の利点はヒープ断片化が発生しないことである。オブジェクトをコピーする際に連続したメモリ領域に詰め込むため、コピー後は To 空間が完全に連続した空き領域になる。これにより、新しいオブジェクトの割り当ては単純なポインタのインクリメントで済む（バンプポインタ割り当て）。

欠点は使用できるヒープが実質半分になること（常に From/To の一方は空き）と、生存オブジェクトのコピーに伴うポインタ更新コストである。長命なオブジェクトが多い場合には非効率になる。

この欠点を克服したのが**世代別 GC（Generational GC）**である。経験則として「ほとんどのオブジェクトは短命（弱い世代仮説: Weak Generational Hypothesis）」という観察に基づき、ヒープを**新世代（Young Generation）**と**旧世代（Old Generation）**に分割する。新世代にはコピー GC（Minor GC）を頻繁に適用し、一定回数の GC を生き残ったオブジェクトを旧世代に昇格させる。旧世代には Mark-Sweep や Mark-Compact を適用（Major GC）するが、頻度は低い。JVM の G1GC・ZGC、V8 の Scavenger などが世代別 GC の代表例である。

## コピー GC と世代別 GC の比較

| 項目 | コピー GC | 世代別 GC |
|------|-----------|-----------|
| ヒープ断片化 | 発生しない | 世代ごとに管理 |
| 割り当て速度 | 非常に高速（バンプポインタ） | 新世代は高速 |
| 有効ヒープサイズ | 実質50%（From/To） | 世代比で調整可能 |
| 長命オブジェクト | 非効率（毎回コピー） | 旧世代に昇格して分離 |
| STW 停止時間 | 小（新世代のみなら短い） | Minor GC は短い |
| 採用例 | Cheney アルゴリズム | JVM G1GC・V8・Ruby |

```python
# コピー GC と世代別 GC の概念実装デモ

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Optional

@dataclass
class HeapObject:
    obj_id: int
    name: str
    value: Any = None
    references: list['HeapObject'] = field(default_factory=list)
    age: int = 0          # 世代別 GC の年齢カウンタ
    forwarding: Optional['HeapObject'] = None  # コピー後の転送先


class CopyingGC:
    """
    Cheney の2空間コピー GC の簡易実装。
    from_space: 現在のヒープ
    to_space  : GC 時のコピー先（GC 後に from_space と入れ替え）
    """

    PROMOTION_THRESHOLD = 2  # この年齢以上は旧世代に昇格

    def __init__(self, max_objects: int = 20):
        self.from_space: dict[int, HeapObject] = {}
        self.old_gen: dict[int, HeapObject] = {}   # 旧世代（簡略化のため別辞書）
        self.roots: list[HeapObject] = []
        self._next_id = 0
        self.gc_count = 0

    def allocate(self, name: str, value: Any = None) -> HeapObject:
        obj = HeapObject(self._next_id, name, value)
        self.from_space[self._next_id] = obj
        self._next_id += 1
        print(f"  [alloc] {name} (id={obj.obj_id}) in Young Gen")
        return obj

    def add_root(self, obj: HeapObject) -> None:
        if obj not in self.roots:
            self.roots.append(obj)

    def remove_root(self, obj: HeapObject) -> None:
        if obj in self.roots:
            self.roots.remove(obj)

    def minor_gc(self) -> None:
        """新世代のコピー GC（Minor GC）を実行"""
        self.gc_count += 1
        print(f"\n=== Minor GC #{self.gc_count} "
              f"(young={len(self.from_space)}, old={len(self.old_gen)}) ===")

        to_space: dict[int, HeapObject] = {}
        promoted: dict[int, HeapObject] = {}

        # ルートから到達可能なオブジェクトをコピー（BFS）
        worklist: list[HeapObject] = []
        for root in self.roots:
            if root.obj_id in self.from_space:
                worklist.append(root)

        visited: set[int] = set()
        while worklist:
            obj = worklist.pop()
            if obj.obj_id in visited:
                continue
            visited.add(obj.obj_id)
            obj.age += 1

            if obj.age >= self.PROMOTION_THRESHOLD:
                # 旧世代に昇格
                promoted[obj.obj_id] = obj
                print(f"  [昇格] {obj.name} (age={obj.age}) → Old Gen")
            else:
                # To 空間にコピー
                to_space[obj.obj_id] = obj
                print(f"  [コピー] {obj.name} (age={obj.age}) → To Space")

            for ref in obj.references:
                if ref.obj_id in self.from_space and ref.obj_id not in visited:
                    worklist.append(ref)

        dead_count = len(self.from_space) - len(visited)
        print(f"  [GC完了] 回収={dead_count}, 生存(young)={len(to_space)}, "
              f"昇格={len(promoted)}")

        # From/To 入れ替え
        self.from_space = to_space
        self.old_gen.update(promoted)


# === 動作確認 ===
gc = CopyingGC()

a = gc.allocate("A", "長命オブジェクト")
b = gc.allocate("B", "短命オブジェクト1")
c = gc.allocate("C", "短命オブジェクト2")
d = gc.allocate("D", "中命オブジェクト")

gc.add_root(a)
gc.add_root(d)
a.references.append(d)

# b, c はどこからも参照されない（ガーベジ）
gc.minor_gc()
# b, c は回収、a, d は To 空間にコピー

gc.minor_gc()
# a, d は age=2 に達して旧世代に昇格

print(f"\n最終状態: young={list(gc.from_space.keys())}, "
      f"old={list(gc.old_gen.keys())}")
```

## 使用場面

- JVM の G1GC・ZGC・Shenandoah（世代別 + 並行 GC の組み合わせ）
- V8（Node.js・Chrome）の Scavenger（新世代のコピー GC）
- Ruby の GC（世代別 + インクリメンタル GC）
- GC チューニングで新世代サイズ（-Xmn）を調整するとき

## 参考文献

- Cheney, C. J. (1970). A nonrecursive list compacting algorithm. *CACM*, 13(11).
- Jones, R. et al. (2011). *The Garbage Collection Handbook*. CRC Press.
- [JVM G1GC ドキュメント](https://docs.oracle.com/en/java/javase/21/gctuning/garbage-first-g1-garbage-collector1.html)

<AffiliateBanner site="language_navi" />
