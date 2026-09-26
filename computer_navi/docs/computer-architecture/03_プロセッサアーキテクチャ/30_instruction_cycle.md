---
sidebar_position: 3
displayed_sidebar: computerArchitectureSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 命令実行サイクル (Instruction Cycle)

## 命令実行サイクルとは

命令実行サイクルとは、

> CPU が 1 命令を処理するために行う、フェッチ → デコード → 実行 → メモリアクセス → 書き戻しの一連の手順

です。<br/>

この 5 段階のサイクルはパイプライン処理の基礎であり、各ステージが独立したハードウェアユニットで動作することで、複数の命令を同時並行に処理できます。

## 5 段階の詳細

| ステージ | 略称 | 担当ユニット | 処理内容 |
| --- | --- | --- | --- |
| 命令フェッチ | IF | 命令キャッシュ・PC | PC が指すアドレスから命令語を読み出し IR に格納。PC を命令長分インクリメント |
| 命令デコード | ID | 制御装置・レジスタファイル | オペコード・レジスタ番号・即値を解析。レジスタファイルからオペランドを読み出し |
| 実行 | EX | ALU・アドレス計算器 | 算術論理演算またはメモリアドレスの計算。フラグレジスタ更新。分岐条件判定 |
| メモリアクセス | MEM | データキャッシュ・MMU | LOAD 命令ではキャッシュ/メモリから読み出し。STORE 命令では書き込み |
| 書き戻し | WB | レジスタファイル | ALU 結果またはメモリ読み出し値を宛先レジスタに書き戻し |

## ADD 命令の実行例（`ADD r1, r2, r3`）

| ステージ | 動作 |
| --- | --- |
| IF | PC=0x1000 から命令語 `0x00628033`（ADD r0,r1,r2 に相当）をフェッチ、PC=0x1004 |
| ID | オペコード=ADD、dst=r1、src1=r2、src2=r3 を解析。r2・r3 の値をレジスタファイルから読み出し |
| EX | ALU が r2+r3 を計算、ZF/CF/SF/OF フラグを更新 |
| MEM | メモリアクセス不要（レジスタ間演算のためパススルー） |
| WB | ALU の計算結果を r1 に書き戻し |

## LOAD 命令の実行例（`LW r1, 8(r2)`）

| ステージ | 動作 |
| --- | --- |
| IF | 命令をフェッチ |
| ID | オペコード=LW、dst=r1、base=r2、オフセット=8 を解析 |
| EX | アドレス計算: r2 + 8 |
| MEM | データキャッシュのアドレス (r2+8) からワードを読み出し |
| WB | 読み出したデータを r1 に書き戻し |

## 実装

```c title="簡易命令セットインタプリタ（C）"
#include <stdio.h>
#include <stdint.h>
#include <string.h>
#include <stdlib.h>

#define MEM_SIZE 256
#define NUM_REGS 8

/* 命令オペコード */
typedef enum {
    OP_ADD = 0,
    OP_SUB,
    OP_LOAD,   /* LOAD dst, addr  : reg[dst] = mem[addr] */
    OP_STORE,  /* STORE src, addr : mem[addr] = reg[src] */
    OP_JMP,    /* JMP addr        : PC = addr */
    OP_HLT     /* HLT             : 停止 */
} Opcode;

/* 命令構造体 */
typedef struct {
    Opcode op;
    int    arg1;  /* dst または src */
    int    arg2;  /* src1 または addr */
    int    arg3;  /* src2 */
} Instr;

/* CPU 状態 */
typedef struct {
    int64_t  reg[NUM_REGS];
    int64_t  mem[MEM_SIZE];
    int      pc;
    int      halted;
} CPUState;

/* --- 各ステージの実装 --- */

/* IF: 命令フェッチ */
Instr fetch(const Instr *prog, CPUState *cpu) {
    Instr ir = prog[cpu->pc];
    printf("[IF ] PC=%d  op=%d arg1=%d arg2=%d arg3=%d\n",
           cpu->pc, ir.op, ir.arg1, ir.arg2, ir.arg3);
    cpu->pc++;
    return ir;
}

/* ID: 命令デコード（オペランド読み出し）*/
void decode(const Instr *ir, const CPUState *cpu, int64_t *a, int64_t *b) {
    *a = cpu->reg[ir->arg2];
    *b = cpu->reg[ir->arg3];
    printf("[ID ] src1=reg[%d]=%ld  src2=reg[%d]=%ld\n",
           ir->arg2, *a, ir->arg3, *b);
}

/* EX: 実行 */
int64_t execute(const Instr *ir, int64_t a, int64_t b) {
    int64_t result = 0;
    switch (ir->op) {
        case OP_ADD:   result = a + b; break;
        case OP_SUB:   result = a - b; break;
        case OP_LOAD:  result = ir->arg2; break; /* アドレス計算（即値）*/
        case OP_STORE: result = ir->arg2; break;
        default: break;
    }
    printf("[EX ] result=%ld\n", result);
    return result;
}

/* MEM: メモリアクセス */
int64_t mem_access(const Instr *ir, CPUState *cpu, int64_t addr, int64_t store_val) {
    int64_t data = 0;
    if (ir->op == OP_LOAD) {
        data = cpu->mem[(int)addr];
        printf("[MEM] LOAD  mem[%ld]=%ld\n", addr, data);
    } else if (ir->op == OP_STORE) {
        cpu->mem[(int)addr] = store_val;
        printf("[MEM] STORE mem[%ld]=%ld\n", addr, store_val);
    } else {
        printf("[MEM] (no access)\n");
        data = addr;  /* EX の結果をパススルー */
    }
    return data;
}

/* WB: 書き戻し */
void writeback(CPUState *cpu, const Instr *ir, int64_t data) {
    if (ir->op == OP_ADD || ir->op == OP_SUB || ir->op == OP_LOAD) {
        cpu->reg[ir->arg1] = data;
        printf("[WB ] reg[%d] = %ld\n\n", ir->arg1, data);
    } else {
        printf("[WB ] (no writeback)\n\n");
    }
}

/* --- メインループ --- */
void run(const Instr *prog, CPUState *cpu) {
    while (!cpu->halted) {
        Instr ir = fetch(prog, cpu);
        if (ir.op == OP_HLT) { cpu->halted = 1; break; }
        if (ir.op == OP_JMP) { cpu->pc = ir.arg1; continue; }

        int64_t a, b;
        decode(&ir, cpu, &a, &b);
        int64_t ex_result = execute(&ir, a, b);
        int64_t mem_result = mem_access(&ir, cpu, ex_result,
                                         cpu->reg[ir->arg1]);
        writeback(cpu, &ir, mem_result);
    }
}

int main(void) {
    CPUState cpu;
    memset(&cpu, 0, sizeof(cpu));
    cpu.mem[10] = 99;  /* メモリ[10] に初期値 */

    /* プログラム:
       ADD r2, r0, r1   (r2 = 0+0 = 0)  ← r0,r1 は 0 初期化
       LOAD r3, 10      (r3 = mem[10] = 99)
       HLT
    */
    Instr prog[] = {
        {OP_ADD,  2, 0, 1},
        {OP_LOAD, 3, 10, 0},
        {OP_HLT,  0, 0, 0},
    };
    cpu.reg[0] = 5;
    cpu.reg[1] = 7;

    run(prog, &cpu);

    printf("=== Final State ===\n");
    for (int i = 0; i < 5; i++)
        printf("  r%d = %ld\n", i, cpu.reg[i]);
    return 0;
}
```

```python title="簡易命令セットインタプリタ（Python）"
from dataclasses import dataclass
from enum import Enum, auto
from typing import Optional

class Op(Enum):
    ADD   = auto()
    SUB   = auto()
    LOAD  = auto()   # LOAD  dst, addr
    STORE = auto()   # STORE src, addr
    JMP   = auto()   # JMP   addr
    HLT   = auto()

@dataclass
class Instr:
    op:   Op
    arg1: int = 0
    arg2: int = 0
    arg3: int = 0

class CPU:
    """5 ステージパイプラインを模した命令インタプリタ"""

    def __init__(self, mem_size: int = 256):
        self.regs = [0] * 8
        self.mem  = [0] * mem_size
        self.pc   = 0
        self.halted = False

    # --- IF ---
    def fetch(self, prog: list[Instr]) -> Instr:
        ir = prog[self.pc]
        print(f"[IF ] PC={self.pc}  {ir.op.name} arg1={ir.arg1} arg2={ir.arg2} arg3={ir.arg3}")
        self.pc += 1
        return ir

    # --- ID ---
    def decode(self, ir: Instr) -> tuple[int, int]:
        a = self.regs[ir.arg2] if ir.op not in (Op.LOAD, Op.STORE, Op.JMP) else ir.arg2
        b = self.regs[ir.arg3]
        print(f"[ID ] a={a}  b={b}")
        return a, b

    # --- EX ---
    def execute(self, ir: Instr, a: int, b: int) -> int:
        result = {
            Op.ADD:   lambda: a + b,
            Op.SUB:   lambda: a - b,
            Op.LOAD:  lambda: ir.arg2,    # アドレスをそのまま渡す
            Op.STORE: lambda: ir.arg2,
        }.get(ir.op, lambda: 0)()
        print(f"[EX ] result={result}")
        return result

    # --- MEM ---
    def mem_access(self, ir: Instr, addr: int, store_val: int) -> int:
        if ir.op == Op.LOAD:
            data = self.mem[addr]
            print(f"[MEM] LOAD  mem[{addr}]={data}")
            return data
        elif ir.op == Op.STORE:
            self.mem[addr] = store_val
            print(f"[MEM] STORE mem[{addr}]={store_val}")
            return store_val
        else:
            print(f"[MEM] (no access)")
            return addr  # パススルー

    # --- WB ---
    def writeback(self, ir: Instr, data: int):
        if ir.op in (Op.ADD, Op.SUB, Op.LOAD):
            self.regs[ir.arg1] = data
            print(f"[WB ] r{ir.arg1} = {data}\n")
        else:
            print(f"[WB ] (no writeback)\n")

    def run(self, prog: list[Instr]):
        while not self.halted:
            ir = self.fetch(prog)
            if ir.op == Op.HLT:
                self.halted = True
                break
            if ir.op == Op.JMP:
                self.pc = ir.arg1
                continue
            a, b = self.decode(ir)
            ex   = self.execute(ir, a, b)
            mem  = self.mem_access(ir, ex, self.regs[ir.arg1])
            self.writeback(ir, mem)


# 実行例
cpu = CPU()
cpu.regs[0] = 5
cpu.regs[1] = 7
cpu.mem[10]  = 99

prog = [
    Instr(Op.ADD,  2, 0, 1),   # r2 = r0 + r1 = 12
    Instr(Op.SUB,  4, 0, 1),   # r4 = r0 - r1 = -2
    Instr(Op.LOAD, 3, 10, 0),  # r3 = mem[10] = 99
    Instr(Op.HLT),
]

cpu.run(prog)
print("=== Final Registers ===")
for i in range(5):
    print(f"  r{i} = {cpu.regs[i]}")
```

## 使用場面

- **CPU エミュレータ**: QEMU・gem5 等でのフルシステムシミュレーションの中核ロジック
- **JIT コンパイラ**: LLVM・V8 等が命令サイクルを解析してホットパスを最適化
- **デバッガ**: gdb のステップ実行（`si`/`ni`）はサイクル単位の命令追跡を利用
- **ISA 設計**: 新しい命令セットのプロトタイプ検証にインタプリタ実装を活用
- **セキュリティ研究**: 動的解析ツール（Valgrind 等）による命令レベルのトレース

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
