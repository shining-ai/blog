---
sidebar_position: 5
displayed_sidebar: computerArchitectureSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# スーパースカラとアウトオブオーダー実行 (Superscalar & OoO)

## スーパースカラとアウトオブオーダー実行とは

スーパースカラとアウトオブオーダー実行とは、

> スーパースカラは複数の命令を同時に発行する技術で、アウトオブオーダー（OoO）はデータ依存関係のない命令をプログラム順に関わらず先行実行する技術

です。<br/>

両者を組み合わせることで、現代の CPU（Intel Core、AMD Zen、Apple M シリーズ等）は 1 クロックあたり 4〜8 命令を実行し、高い IPC（命令/サイクル）を実現しています。

## スーパースカラ

| 項目 | 内容 |
| --- | --- |
| Issue 幅 | 2〜8 命令/サイクル（Zen 4 は 6命令、Cortex-X3 は 6 命令） |
| 実行ユニット種別 | 整数 ALU・浮動小数点 FPU・SIMD/AVX・ロードストア・分岐 |
| フェッチ幅 | Issue 幅以上（Intel Skylake: 6命令フェッチ、4命令デコード） |
| 主なボトルネック | データハザード・制御ハザード・構造ハザード |

## アウトオブオーダー（OoO）の主要構成

| コンポーネント | 略称 | 役割 |
| --- | --- | --- |
| リオーダバッファ | ROB | プログラム順の正確なコミット・例外処理を保証 |
| 発行キュー（リザベーションステーション） | RS/IQ | オペランドが揃った命令を実行ユニットに発行 |
| レジスタリネーミング | RAT | WAW・WAR 依存を除去し並列度を向上 |
| ロードストアキュー | LSQ | メモリアクセスの順序保証と投機実行 |
| コミットユニット | - | ROB 先頭の命令を順番に確定（retire） |

## Tomasulo アルゴリズムの概要

```
1. 発行（Issue）   : 命令を RS（リザベーションステーション）に格納
                     ソースレジスタを物理レジスタにリネーミング
2. 実行（Execute） : 全オペランドが揃った命令を実行ユニットへ発行
                     共通データバス（CDB）で結果をブロードキャスト
3. 書き戻し（Write）: 結果を ROB とレジスタファイルに書き込み
4. コミット（Commit）: ROB 先頭から順番に確定（不正確実行の取り消しも可能）
```

## レジスタリネーミング例

```
プログラム順:
  ADD r1, r2, r3    # r1 = r2 + r3
  SUB r1, r1, r4    # r1 = r1 - r4  (RAW 依存: 前の r1 が必要)
  MUL r5, r1, r6    # r5 = r1 * r6  (WAW ハザードを削除)

リネーミング後（p = 物理レジスタ）:
  ADD p10, p2, p3   # r1 → p10
  SUB p11, p10, p4  # r1 → p11（新しい物理レジスタ）
  MUL p12, p11, p6  # r5 → p12
```

## アーキテクチャ比較

| 方式 | IPC | 回路複雑度 | 消費電力 | 代表例 |
| --- | --- | --- | --- | --- |
| スカラー（順序実行） | 最大 1 | 低 | 低 | RISC-V シンプル実装 |
| スーパースカラ（順序） | 2〜4 | 中 | 中 | ARM Cortex-A5（旧世代） |
| スーパースカラ + OoO | 4〜8 | 高 | 高 | Intel Core、AMD Zen 4、Apple M3 |

## 依存関係の種類

| 依存種別 | 正式名称 | 例 | OoO での扱い |
| --- | --- | --- | --- |
| RAW | Read-After-Write（真依存） | `ADD r1,r2,r3; SUB r4,r1,r5` | 解消不可（待機必要） |
| WAW | Write-After-Write | `ADD r1,...; MUL r1,...` | リネーミングで解消 |
| WAR | Write-After-Read（反依存） | `ADD r1,r2,...; MOV r2,...` | リネーミングで解消 |

## 実装

```c title="依存関係チェックと命令スケジューリング（C）"
#include <stdio.h>
#include <string.h>
#include <stdbool.h>

#define MAX_INSTR  16
#define NUM_REGS    8

typedef struct {
    const char *name;
    int  dst;    /* 書き込みレジスタ（-1: なし）*/
    int  src1;   /* 読み込みレジスタ1（-1: なし）*/
    int  src2;   /* 読み込みレジスタ2（-1: なし）*/
    int  latency;/* 実行レイテンシ（サイクル数）*/
    int  issue_cycle; /* 発行サイクル（-1: 未定）*/
    bool issued;
} Instruction;

/* RAW 依存の検出: instr j が instr i の結果を必要とするか */
bool has_raw_dep(const Instruction *prog, int i, int j) {
    if (prog[i].dst < 0) return false;
    return (prog[j].src1 == prog[i].dst || prog[j].src2 == prog[i].dst);
}

/* 簡易スケジューラ: 最も早く実行できるサイクルを決定 */
void schedule(Instruction *prog, int n, int issue_width) {
    int ready_time[MAX_INSTR];
    memset(ready_time, 0, sizeof(ready_time));

    for (int i = 0; i < n; i++) {
        int earliest = 0;
        /* RAW 依存チェック */
        for (int j = 0; j < i; j++) {
            if (has_raw_dep(prog, j, i)) {
                int avail = prog[j].issue_cycle + prog[j].latency;
                if (avail > earliest) earliest = avail;
                printf("  依存: %s → %s (最早発行サイクル: %d)\n",
                       prog[j].name, prog[i].name, avail);
            }
        }
        prog[i].issue_cycle = earliest;
        prog[i].issued = true;
    }
}

void print_schedule(const Instruction *prog, int n) {
    int max_cycle = 0;
    for (int i = 0; i < n; i++) {
        int end = prog[i].issue_cycle + prog[i].latency;
        if (end > max_cycle) max_cycle = end;
    }

    printf("\nサイクル");
    for (int c = 0; c < max_cycle; c++) printf(" %2d", c);
    printf("\n");

    for (int i = 0; i < n; i++) {
        printf("%-8s ", prog[i].name);
        for (int c = 0; c < max_cycle; c++) {
            if (c == prog[i].issue_cycle)
                printf(" EX");
            else if (c > prog[i].issue_cycle && c < prog[i].issue_cycle + prog[i].latency)
                printf(" ..");
            else
                printf("   ");
        }
        printf("\n");
    }
}

int main(void) {
    /* 命令列: ADD→SUB（RAW 依存）→MUL（RAW 依存）→AND（独立）*/
    Instruction prog[] = {
        {"ADD_r1",  1, 2, 3, 1, -1, false},  /* r1 = r2+r3   (1サイクル) */
        {"SUB_r4",  4, 1, 5, 1, -1, false},  /* r4 = r1-r5   (RAW on r1) */
        {"MUL_r6",  6, 4, 7, 3, -1, false},  /* r6 = r4*r7   (RAW on r4, 3サイクル) */
        {"AND_r0",  0, 2, 3, 1, -1, false},  /* r0 = r2&r3   (独立命令) */
    };
    int n = sizeof(prog) / sizeof(prog[0]);

    printf("=== 命令スケジューリング ===\n");
    schedule(prog, n, 2);
    print_schedule(prog, n);
    return 0;
}
```

```python title="Tomasulo アルゴリズム簡略シミュレーション（Python）"
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class Instruction:
    name:    str
    dst:     int           # 宛先レジスタ
    src1:    int           # ソースレジスタ1
    src2:    int           # ソースレジスタ2
    latency: int = 1       # 実行レイテンシ

@dataclass
class RSEntry:
    """リザベーションステーション（RS）エントリ"""
    instr:   Instruction
    v1:      Optional[int] = None   # src1 の値（None = 未確定）
    v2:      Optional[int] = None   # src2 の値（未確定）
    q1:      Optional[str] = None   # src1 を生成する RS タグ
    q2:      Optional[str] = None   # src2 を生成する RS タグ
    exec_remaining: int = 0         # 残り実行サイクル

class Tomasulo:
    """Tomasulo アルゴリズムの簡略シミュレーション"""

    def __init__(self, rs_size: int = 8):
        self.regs: dict[int, int]         = {i: i * 10 for i in range(8)}
        self.rat:  dict[int, Optional[str]] = {i: None for i in range(8)}
        self.rs:   dict[str, RSEntry]     = {}
        self.rob:  list[str]              = []   # コミット順序
        self.cdb:  dict[str, int]         = {}   # 共通データバス（タグ→値）
        self.cycle = 0
        self.rs_counter = 0

    def _new_tag(self) -> str:
        self.rs_counter += 1
        return f"RS{self.rs_counter}"

    def issue(self, instr: Instruction):
        """命令を RS に発行（レジスタリネーミング含む）"""
        tag = self._new_tag()
        entry = RSEntry(instr=instr, exec_remaining=instr.latency)

        # src1 のリネーミング
        if self.rat[instr.src1] is None:
            entry.v1 = self.regs[instr.src1]
        else:
            entry.q1 = self.rat[instr.src1]

        # src2 のリネーミング
        if self.rat[instr.src2] is None:
            entry.v2 = self.regs[instr.src2]
        else:
            entry.q2 = self.rat[instr.src2]

        # 宛先レジスタのリネーミング
        self.rat[instr.dst] = tag
        self.rs[tag] = entry
        self.rob.append(tag)
        print(f"[Cycle {self.cycle}] Issue {instr.name} → {tag}  "
              f"(v1={entry.v1} q1={entry.q1}, v2={entry.v2} q2={entry.q2})")

    def _exec_step(self):
        """実行中の RS エントリを 1 サイクル進める"""
        completed = []
        for tag, entry in self.rs.items():
            if entry.v1 is not None and entry.v2 is not None:
                entry.exec_remaining -= 1
                if entry.exec_remaining == 0:
                    result = entry.v1 + entry.v2  # 簡略化: 全命令を加算として扱う
                    self.cdb[tag] = result
                    completed.append((tag, result))
                    print(f"[Cycle {self.cycle}] Complete {entry.instr.name} ({tag}) "
                          f"= {result}")
        return completed

    def _broadcast(self, completed: list):
        """CDB ブロードキャスト: 待機中の RS エントリに結果を通知"""
        for tag, val in completed:
            for entry in self.rs.values():
                if entry.q1 == tag:
                    entry.v1 = val
                    entry.q1 = None
                if entry.q2 == tag:
                    entry.v2 = val
                    entry.q2 = None

    def _commit(self, completed: list):
        """ROB 先頭から順番にコミット"""
        completed_tags = {t for t, _ in completed}
        while self.rob and self.rob[0] in completed_tags:
            tag = self.rob.pop(0)
            val = self.cdb[tag]
            entry = self.rs.pop(tag)
            self.regs[entry.instr.dst] = val
            self.rat[entry.instr.dst] = None
            print(f"[Cycle {self.cycle}] Commit {entry.instr.name} ({tag}): "
                  f"r{entry.instr.dst} = {val}")

    def run(self, instructions: list[Instruction], max_cycles: int = 20):
        for instr in instructions:
            self.issue(instr)

        for _ in range(max_cycles):
            self.cycle += 1
            completed = self._exec_step()
            if completed:
                self._broadcast(completed)
                self._commit(completed)
            if not self.rs and not self.rob:
                break

        print("\n=== Final Registers ===")
        for i in range(8):
            print(f"  r{i} = {self.regs[i]}")


# 実行例
prog = [
    Instruction("ADD r1,r2,r3", dst=1, src1=2, src2=3, latency=1),
    Instruction("MUL r4,r1,r5", dst=4, src1=1, src2=5, latency=3),  # RAW on r1
    Instruction("AND r6,r2,r3", dst=6, src1=2, src2=3, latency=1),  # 独立
]

sim = Tomasulo()
sim.run(prog)
```

## 使用場面

- **現代 CPU 設計**: Intel Core Ultra（Redwood Cove）・AMD Zen 5・Apple M4 は全てOoOスーパースカラ
- **コンパイラの命令スケジューリング**: ソフトウェアパイプライニング・ループアンロール
- **CPU シミュレータ**: gem5・Sniper での性能解析・マイクロアーキテクチャ研究
- **高性能コンピューティング**: BLAS ルーチンの SIMD + OoO 実行によるピーク性能達成

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
