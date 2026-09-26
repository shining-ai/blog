---
sidebar_position: 0
displayed_sidebar: computerArchitectureSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 命令セットアーキテクチャ (ISA Overview)

## ISA とは

ISA（Instruction Set Architecture）とは、

> ソフトウェアとハードウェアの境界を定義する仕様で、プロセッサが実行できる命令・レジスタ・アドレッシングモードを規定する

です。
<br/>

ISA はハードウェア実装に依存しないインタフェースです。
同じ ISA を異なるマイクロアーキテクチャで実装することで、ソフトウェアの互換性を保ちます。

## RISC vs CISC


| 特徴 | RISC | CISC |
| --- | --- | --- |
| 命令数 | 少ない（数十〜百程度） | 多い（数百〜千以上） |
| 命令長 | 固定長（例: 32bit） | 可変長 |
| 代表例 | ARM, RISC-V, MIPS | x86, x86-64 |
| 演算対象 | レジスタのみ | メモリ直接も可 |
| パイプライン効率 | 高い | 低い（デコード複雑） |

## x86-64 主要レジスタ

| レジスタ | 用途 |
| --- | --- |
| rax | 戻り値・汎用 |
| rdi, rsi, rdx, rcx, r8, r9 | 関数引数（順番） |
| rsp | スタックポインタ |
| rbp | フレームポインタ |
| rip | 命令ポインタ |

## 実装

```c title="x86-64 インラインアセンブリ（C）"
#include <stdio.h>
#include <stdint.h>

/* CPUID で CPU ベンダー文字列を取得 */
void get_cpu_vendor(char *vendor) {
    uint32_t eax, ebx, ecx, edx;
    __asm__ volatile (
        "cpuid"
        : "=a"(eax), "=b"(ebx), "=c"(ecx), "=d"(edx)
        : "a"(0)
    );
    /* ベンダー文字列は EBX, EDX, ECX の順に格納 */
    *(uint32_t *)(vendor + 0) = ebx;
    *(uint32_t *)(vendor + 4) = edx;
    *(uint32_t *)(vendor + 8) = ecx;
    vendor[12] = '\0';
}

/* RISC-V スタイルの単純加算（デモ用） */
int add(int a, int b) {
    int result;
    __asm__ volatile (
        "addl %2, %1\n\t"
        "movl %1, %0"
        : "=r"(result)
        : "r"(a), "r"(b)
    );
    return result;
}

int main(void) {
    char vendor[13];
    get_cpu_vendor(vendor);
    printf("CPU Vendor: %s\n", vendor);   /* GenuineIntel or AuthenticAMD */
    printf("3 + 4 = %d\n", add(3, 4));   /* 7 */
    return 0;
}
```

```python title="RISC-V アセンブリシミュレーション（Python）"
class RISCVSim:
    """RISC-V RV32I 命令セットの簡易シミュレータ"""

    def __init__(self):
        self.regs = [0] * 32  # x0〜x31
        self.pc = 0

    def add(self, rd: int, rs1: int, rs2: int):
        """ADD rd, rs1, rs2"""
        self.regs[rd] = (self.regs[rs1] + self.regs[rs2]) & 0xFFFFFFFF
        self.pc += 4

    def addi(self, rd: int, rs1: int, imm: int):
        """ADDI rd, rs1, imm"""
        self.regs[rd] = (self.regs[rs1] + imm) & 0xFFFFFFFF
        self.pc += 4

    def lw(self, rd: int, rs1: int, imm: int, mem: dict):
        """LW rd, imm(rs1) — ロード命令"""
        addr = (self.regs[rs1] + imm) & 0xFFFFFFFF
        self.regs[rd] = mem.get(addr, 0)
        self.pc += 4

sim = RISCVSim()
sim.addi(1, 0, 10)   # x1 = 10
sim.addi(2, 0, 20)   # x2 = 20
sim.add(3, 1, 2)     # x3 = x1 + x2
print(f"x3 = {sim.regs[3]}")  # 30
```

## 使用場面

- **コンパイラ**: コード生成バックエンドで ISA に依存した最適化
- **OS カーネル**: システムコールの ABI 定義
- **エミュレータ**: QEMU による異種 ISA のバイナリ実行
- **組み込み**: RISC-V によるカスタム ISA 拡張

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
