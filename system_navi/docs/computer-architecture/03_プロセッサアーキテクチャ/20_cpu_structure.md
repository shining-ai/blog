---
sidebar_position: 2
displayed_sidebar: computerArchitectureSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# CPU の基本構造 (CPU Structure)

## CPU の基本構造とは

CPU の基本構造とは、

> ALU（算術論理演算ユニット）・制御装置・レジスタファイル・バスインタフェースから構成される演算処理装置の内部アーキテクチャ

です。<br/>

現代の CPU はこれらのコンポーネントが密接に連携し、クロックサイクルごとに命令をフェッチ・デコード・実行するデータパスを形成しています。

## CPU 構成要素

| コンポーネント | 略称 | 役割 |
| --- | --- | --- |
| 算術論理演算ユニット | ALU | 加減乗除・AND/OR/XOR・シフト等の演算を実行 |
| 制御装置 | CU | 命令をデコードし各ユニットへ制御信号を送出 |
| 汎用レジスタ | GPR | 演算対象データを高速保持（x86-64: rax〜r15の16本） |
| プログラムカウンタ | PC | 次にフェッチする命令のアドレスを保持 |
| 命令レジスタ | IR | 現在実行中の命令を保持 |
| フラグレジスタ | FLAGS | 演算結果の状態（ZF/CF/SF/OF）を保持 |
| メモリバスインタフェース | MBI | キャッシュ・メモリとのデータ転送を仲介 |

## x86-64 汎用レジスタ

| 64ビット | 32ビット | 16ビット | 8ビット | 主な用途（呼び出し規約） |
| --- | --- | --- | --- | --- |
| rax | eax | ax | al | 戻り値・アキュムレータ |
| rbx | ebx | bx | bl | 汎用（callee-saved） |
| rcx | ecx | cx | cl | 第4引数・カウンタ |
| rdx | edx | dx | dl | 第3引数・データ |
| rsi | esi | si | sil | 第2引数・ソースインデックス |
| rdi | edi | di | dil | 第1引数・デスティネーション |
| rsp | esp | sp | spl | スタックポインタ |
| rbp | ebp | bp | bpl | ベースポインタ（フレームポインタ） |
| r8〜r15 | r8d〜r15d | r8w〜r15w | r8b〜r15b | 第5〜第6引数・汎用 |

## フラグレジスタ（RFLAGS）

| フラグ | ビット位置 | 意味 |
| --- | --- | --- |
| ZF（ゼロフラグ） | bit 6 | 演算結果が 0 の場合にセット |
| CF（キャリーフラグ） | bit 0 | 符号なし演算でオーバーフローした場合にセット |
| SF（サインフラグ） | bit 7 | 演算結果が負（最上位ビットが 1）の場合にセット |
| OF（オーバーフローフラグ） | bit 11 | 符号付き演算でオーバーフローした場合にセット |
| PF（パリティフラグ） | bit 2 | 結果の下位8ビットの1の数が偶数の場合にセット |

## データパスの流れ

```
1. IF（命令フェッチ）: PC のアドレスからメモリ/キャッシュ経由で命令を IR に読み込み、PC += 4
2. ID（命令デコード）: 制御装置が IR をデコードし、オペコード・レジスタ番号・即値を抽出
3. EX（実行）       : ALU がオペランドを受け取り演算を実行、フラグを更新
4. MEM（メモリ）    : LOAD/STORE 命令の場合、データキャッシュへアクセス
5. WB（書き戻し）   : ALU 結果またはメモリ読み出し値をレジスタファイルに書き戻し
```

## 実装

```c title="簡易 CPU シミュレーション（C）"
#include <stdio.h>
#include <stdint.h>
#include <string.h>

#define NUM_REGS 8

/* レジスタファイル */
typedef struct {
    int64_t reg[NUM_REGS];  /* r0〜r7 */
    int64_t pc;
    int zf, cf, sf;         /* フラグ */
} CPU;

/* ALU 操作 */
typedef enum { ALU_ADD, ALU_SUB, ALU_AND, ALU_OR, ALU_XOR, ALU_SHL, ALU_SHR } AluOp;

int64_t alu_exec(CPU *cpu, AluOp op, int64_t a, int64_t b) {
    int64_t result = 0;
    switch (op) {
        case ALU_ADD: result = a + b; break;
        case ALU_SUB: result = a - b; break;
        case ALU_AND: result = a & b; break;
        case ALU_OR:  result = a | b; break;
        case ALU_XOR: result = a ^ b; break;
        case ALU_SHL: result = a << b; break;
        case ALU_SHR: result = (uint64_t)a >> b; break;
    }
    /* フラグ更新 */
    cpu->zf = (result == 0);
    cpu->sf = (result < 0);
    return result;
}

/* レジスタ間演算命令 */
void cpu_reg_op(CPU *cpu, AluOp op, int dst, int src1, int src2) {
    cpu->reg[dst] = alu_exec(cpu, op, cpu->reg[src1], cpu->reg[src2]);
    printf("r%d = r%d op r%d => %ld  (ZF=%d, SF=%d)\n",
           dst, src1, src2, cpu->reg[dst], cpu->zf, cpu->sf);
}

/* 即値ロード命令 */
void cpu_load_imm(CPU *cpu, int dst, int64_t imm) {
    cpu->reg[dst] = imm;
    printf("r%d = %ld\n", dst, imm);
}

/* レジスタダンプ */
void cpu_dump(const CPU *cpu) {
    printf("=== Register File ===\n");
    for (int i = 0; i < NUM_REGS; i++)
        printf("  r%d = %ld\n", i, cpu->reg[i]);
    printf("  PC = %ld  ZF=%d CF=%d SF=%d\n", cpu->pc, cpu->zf, cpu->cf, cpu->sf);
}

int main(void) {
    CPU cpu;
    memset(&cpu, 0, sizeof(cpu));

    /* プログラム: r2 = r0 + r1, r3 = r2 XOR r2（ゼロクリア）*/
    cpu_load_imm(&cpu, 0, 10);
    cpu_load_imm(&cpu, 1, 32);
    cpu_reg_op(&cpu, ALU_ADD, 2, 0, 1);   /* r2 = r0 + r1 = 42 */
    cpu_reg_op(&cpu, ALU_XOR, 3, 2, 2);   /* r3 = r2 ^ r2 = 0 (ZF=1) */
    cpu_reg_op(&cpu, ALU_SHL, 4, 2, 1);   /* r4 = r2 << r1 (= 42 << 32) */

    cpu_dump(&cpu);
    return 0;
}
```

```python title="簡易 CPU シミュレーション（Python）"
from dataclasses import dataclass, field
from enum import Enum

class AluOp(Enum):
    ADD = "add"
    SUB = "sub"
    AND = "and"
    OR  = "or"
    XOR = "xor"
    SHL = "shl"
    SHR = "shr"

@dataclass
class CPU:
    """8本の汎用レジスタを持つ簡易 CPU"""
    regs: dict = field(default_factory=lambda: {f"r{i}": 0 for i in range(8)})
    pc: int = 0
    zf: bool = False
    sf: bool = False
    cf: bool = False

    def load_imm(self, dst: str, imm: int):
        """即値をレジスタにロード"""
        self.regs[dst] = imm
        print(f"  {dst} = {imm}")

    def alu_exec(self, op: AluOp, a: int, b: int) -> int:
        ops = {
            AluOp.ADD: lambda x, y: x + y,
            AluOp.SUB: lambda x, y: x - y,
            AluOp.AND: lambda x, y: x & y,
            AluOp.OR:  lambda x, y: x | y,
            AluOp.XOR: lambda x, y: x ^ y,
            AluOp.SHL: lambda x, y: x << y,
            AluOp.SHR: lambda x, y: x >> y,
        }
        result = ops[op](a, b) & 0xFFFF_FFFF_FFFF_FFFF  # 64ビットマスク
        # フラグ更新
        self.zf = (result == 0)
        self.sf = bool(result >> 63)
        return result

    def reg_op(self, op: AluOp, dst: str, src1: str, src2: str):
        """レジスタ間演算"""
        result = self.alu_exec(op, self.regs[src1], self.regs[src2])
        self.regs[dst] = result
        print(f"  {dst} = {src1} {op.value} {src2} => {result}  (ZF={self.zf}, SF={self.sf})")
        self.pc += 4

    def dump(self):
        print("\n=== Register File ===")
        for name, val in self.regs.items():
            print(f"  {name} = {val}")
        print(f"  PC={self.pc}  ZF={self.zf}  SF={self.sf}  CF={self.cf}")


# 実行例
cpu = CPU()
print("--- 命令列実行 ---")
cpu.load_imm("r0", 10)
cpu.load_imm("r1", 32)
cpu.reg_op(AluOp.ADD, "r2", "r0", "r1")   # r2 = 42
cpu.reg_op(AluOp.XOR, "r3", "r2", "r2")   # r3 = 0  (ZF=True)
cpu.reg_op(AluOp.AND, "r4", "r2", "r0")   # r4 = 42 & 10 = 10
cpu.dump()
```

## 使用場面

- **CPU 設計**: RTL（Verilog/VHDL）でのプロセッサ設計における構成要素の理解
- **FPGA 実装**: ソフトコアプロセッサ（NIOS II、MicroBlaze 等）の設計参考
- **エミュレータ開発**: QEMU や gem5 等のシミュレータにおける CPU モデリング
- **OS 開発**: コンテキストスイッチ時のレジスタ保存・復元処理の実装
- **コンパイラ開発**: バックエンドのレジスタ割り付けアルゴリズムの設計

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
