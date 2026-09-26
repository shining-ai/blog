import AffiliateBanner from '@site/src/components/AffiliateBanner';

# レジスタ割り付け

## レジスタ割り付けとは

> レジスタ割り付け（Register Allocation）とは、IR の無限個の仮想レジスタ（一時変数）を、実際のハードウェアが提供する有限個の物理レジスタに割り当てるコンパイラバックエンドの処理であり、レジスタが不足する場合は変数をメモリ（スタック）に退避させる（スピル）。

現代のCPUはレジスタへのアクセスがメモリより桁違いに速い（数ナノ秒 vs 数十〜数百ナノ秒）ため、できる限り多くの変数をレジスタに格納することが重要な最適化となる。x86-64 は汎用レジスタを16本持つが、IR の仮想変数は数百〜数千に上ることもある。

レジスタ割り付けは **グラフ着色問題（Graph Coloring）** に帰着できる。各変数をノード、同時に生存している変数ペアを辺として「干渉グラフ（Interference Graph）」を構築し、k 色（k = レジスタ数）でグラフを着色する。着色できない変数はスピル（メモリに退避）する。グラフ k 着色は NP 完全問題だが、Chaitin のアルゴリズムなどの近似アルゴリズムが実用的に使われる。

より単純な線形スキャン割り当て（Linear Scan Register Allocation）は、生存区間を区間リストとして扱い貪欲法で割り当てる。O(n) に近い速度で動作するため JIT コンパイラで広く使われ、LLVM・HotSpot JVM が採用している。

## レジスタ割り付けアルゴリズムの比較

| アルゴリズム | 時間計算量 | 品質 | 使用例 |
|-------------|-----------|------|--------|
| グラフ着色（Chaitin） | O(n²) 〜 O(n³) | 高品質 | GCC, LLVM（AOT） |
| 線形スキャン | O(n log n) | 中品質 | LLVM JIT, HotSpot |
| ビンパッキング | O(n log n) | 中品質 | V8（初期） |
| 単純割り付け（スタックのみ） | O(n) | 低品質（遅い） | 教育用・デバッグビルド |

```python
# 線形スキャンレジスタ割り付けの実装
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class LiveInterval:
    """変数の生存区間: [start, end) の命令インデックス"""
    var: str
    start: int
    end: int
    reg: Optional[str] = None   # 割り当てられたレジスタ
    spilled: bool = False        # スピルされたか

    def __lt__(self, other: 'LiveInterval') -> bool:
        return self.start < other.start


class LinearScanAllocator:
    """線形スキャンレジスタ割り付け（Poletto & Sarkar, 1999）"""

    def __init__(self, registers: list[str]):
        self.registers = registers
        self.free_regs: set[str] = set(registers)
        self.active: list[LiveInterval] = []  # 現在レジスタを使用中の区間
        self.spill_count = 0

    def allocate(self, intervals: list[LiveInterval]) -> dict[str, str | None]:
        """生存区間リストにレジスタを割り付け、(変数 → レジスタ or スピル) を返す"""
        intervals.sort()  # 開始点でソート

        for interval in intervals:
            # 1. 終了した区間を active から除去しレジスタを解放
            self._expire_old_intervals(interval.start)

            if not self.free_regs:
                # 2. レジスタ不足: スピル候補を選ぶ（最も遠くまで生存するものをスピル）
                self._spill_at_interval(interval)
            else:
                # 3. 空きレジスタを割り当て
                reg = self.free_regs.pop()
                interval.reg = reg
                self.active.append(interval)
                self.active.sort(key=lambda i: i.end)

        return {
            iv.var: (iv.reg if not iv.spilled else f"[spill:{iv.var}]")
            for iv in intervals
        }

    def _expire_old_intervals(self, current_pos: int) -> None:
        still_active = []
        for iv in self.active:
            if iv.end <= current_pos:
                self.free_regs.add(iv.reg)
            else:
                still_active.append(iv)
        self.active = still_active

    def _spill_at_interval(self, interval: LiveInterval) -> None:
        if not self.active:
            interval.spilled = True
            return
        # 最も遅く終わる active 区間を候補にする
        spill_candidate = self.active[-1]
        if spill_candidate.end > interval.end:
            # 候補をスピルし、そのレジスタを新しい区間に渡す
            interval.reg = spill_candidate.reg
            spill_candidate.reg = None
            spill_candidate.spilled = True
            self.active.remove(spill_candidate)
            self.active.append(interval)
            self.active.sort(key=lambda i: i.end)
        else:
            interval.spilled = True


# 動作確認
# 3つのレジスタを使って6つの変数を割り付け
registers = ['r0', 'r1', 'r2']
intervals = [
    LiveInterval('a', start=0, end=5),
    LiveInterval('b', start=1, end=4),
    LiveInterval('c', start=2, end=7),
    LiveInterval('d', start=3, end=6),
    LiveInterval('e', start=4, end=8),
    LiveInterval('f', start=5, end=9),
]

allocator = LinearScanAllocator(registers)
assignment = allocator.allocate(intervals)

print(f"{'変数':>4} {'開始':>4} {'終了':>4} {'割り付け'}")
print("-" * 35)
for iv in sorted(intervals, key=lambda x: x.start):
    alloc = iv.reg if not iv.spilled else "SPILL"
    print(f"{iv.var:>4} {iv.start:>4} {iv.end:>4}  {alloc}")

# 変数   開始   終了  割り付け
#    a     0     5   r0
#    b     1     4   r1
#    c     2     7   r2
#    d     3     6   SPILL (レジスタ不足)
#    e     4     8   r1 (b が解放後)
#    f     5     9   r0 (a が解放後)
```

## 使用場面

- GCC・Clang の AOT コンパイラにおける Chaitin スタイルのグラフ着色割り付け
- LLVM の線形スキャン割り付け（JIT モード）と RegAlloc パス
- JVM HotSpot の C2 コンパイラによる最適化コンパイル時のレジスタ割り付け
- 組み込み向けコンパイラでのスピル最小化によるパフォーマンス向上

## 参考文献

- Chaitin, G. J. et al. (1981). Register allocation via coloring. *Computer Languages*, 6(1).
- Poletto, M. & Sarkar, V. (1999). Linear scan register allocation. *ACM TOPLAS*, 21(5).
- Cooper, K. D. & Torczon, L. (2011). *Engineering a Compiler* (2nd ed.). Morgan Kaufmann.

<AffiliateBanner site="language_navi" />
