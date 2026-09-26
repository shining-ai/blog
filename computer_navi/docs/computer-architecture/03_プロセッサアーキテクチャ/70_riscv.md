---
sidebar_position: 7
displayed_sidebar: computerArchitectureSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# RISC-V 入門 (RISC-V)

## RISC-V とは

RISC-V とは、

> カリフォルニア大学バークレー校が 2010 年に設計したオープンスタンダードの RISC 命令セットアーキテクチャで、ロイヤリティフリーで誰でも利用・実装できる ISA

です。<br/>

RISC-V は基本整数命令セット（RV32I/RV64I）に対して乗除算（M）・アトミック（A）・浮動小数点（F/D）・圧縮命令（C）等の標準拡張をモジュラーに追加できます。教育・組み込み・サーバから AI アクセラレータまで幅広く採用が広がっています。

## 特徴と設計思想

| 特徴 | 内容 |
| --- | --- |
| オープン標準 | 特許・ライセンス料不要。RISC-V International で仕様を管理 |
| モジュラー設計 | 基本 ISA（I）+ 必要な拡張のみ実装可能 |
| シンプルな命令セット | 47 命令（RV32I 基本）。CISC の複雑さを排除 |
| 固定長命令（基本）| 32 ビット固定（C 拡張で 16 ビット可変長混在も可能） |
| レジスタ数 | 32 本（x0〜x31）。x0 は常に 0（ハードウェアゼロ） |

## 標準拡張一覧

| 拡張 | 名称 | 追加命令 |
| --- | --- | --- |
| I | 基本整数命令セット | 算術・論理・ブランチ・メモリアクセス（47命令） |
| M | 乗除算 | mul, mulh, div, rem 等（8命令） |
| A | アトミック操作 | lr/sc, amo-add/swap/and/or 等（11命令） |
| F | 単精度浮動小数点 | fadd.s, fmul.s, fcvt.w.s 等（26命令） |
| D | 倍精度浮動小数点 | fadd.d, fmul.d 等（26命令） |
| C | 圧縮命令（16ビット） | c.add, c.lw, c.beqz 等（コードサイズ削減） |
| V | ベクトル拡張 | ベクトルロード・算術・マスク操作 |
| G | 汎用（I+M+A+F+D） | RV32G/RV64G として慣例的に使用 |

## レジスタ一覧（ABI 名）

| レジスタ | ABI 名 | 用途 | Saver |
| --- | --- | --- | --- |
| x0 | zero | 常に 0（書き込み無視） | - |
| x1 | ra | リターンアドレス（return address） | caller |
| x2 | sp | スタックポインタ | callee |
| x3 | gp | グローバルポインタ | - |
| x4 | tp | スレッドポインタ | - |
| x5〜x7 | t0〜t2 | 一時レジスタ | caller |
| x8 | s0/fp | 保存レジスタ / フレームポインタ | callee |
| x9 | s1 | 保存レジスタ | callee |
| x10〜x11 | a0〜a1 | 関数引数 / 戻り値 | caller |
| x12〜x17 | a2〜a7 | 関数引数 | caller |
| x18〜x27 | s2〜s11 | 保存レジスタ | callee |
| x28〜x31 | t3〜t6 | 一時レジスタ | caller |

## 命令形式

| 形式 | ビット割り当て | 用途 |
| --- | --- | --- |
| R 型 | funct7[31:25] rs2[24:20] rs1[19:15] funct3[14:12] rd[11:7] opcode[6:0] | レジスタ間演算（add, sub, and…） |
| I 型 | imm[31:20] rs1[19:15] funct3[14:12] rd[11:7] opcode[6:0] | 即値演算・ロード（addi, lw, jalr…） |
| S 型 | imm[31:25] rs2[24:20] rs1[19:15] funct3[14:12] imm[11:7] opcode[6:0] | ストア（sw, sh, sb） |
| B 型 | imm[31:25] rs2[24:20] rs1[19:15] funct3[14:12] imm[11:7] opcode[6:0] | 条件分岐（beq, bne, blt…） |
| U 型 | imm[31:12] rd[11:7] opcode[6:0] | 上位即値（lui, auipc） |
| J 型 | imm[31:12] rd[11:7] opcode[6:0] | ジャンプ（jal） |

## 基本命令

| 命令 | 形式 | 動作 |
| --- | --- | --- |
| add rd, rs1, rs2 | R | rd = rs1 + rs2 |
| sub rd, rs1, rs2 | R | rd = rs1 - rs2 |
| addi rd, rs1, imm | I | rd = rs1 + imm |
| and / or / xor | R | ビット演算 |
| sll / srl / sra | R | 左シフト / 論理右シフト / 算術右シフト |
| lw rd, offset(rs1) | I | rd = MEM[rs1 + offset]（32ビットロード） |
| sw rs2, offset(rs1) | S | MEM[rs1 + offset] = rs2 |
| beq rs1, rs2, label | B | rs1 == rs2 なら PC += offset |
| bne rs1, rs2, label | B | rs1 != rs2 なら PC += offset |
| blt rs1, rs2, label | B | rs1 < rs2 なら PC += offset（符号付き） |
| jal rd, label | J | rd = PC+4; PC += offset |
| jalr rd, rs1, imm | I | rd = PC+4; PC = rs1 + imm |
| lui rd, imm | U | rd = imm << 12 |
| auipc rd, imm | U | rd = PC + (imm << 12) |

## 実装

```c title="RISC-V アセンブリで Fibonacci（C と対比）"
/* ====== C 版 ======================================== */
long fibonacci_c(long n) {
    if (n <= 1) return n;
    long a = 0, b = 1, tmp;
    for (long i = 2; i <= n; i++) {
        tmp = a + b;
        a   = b;
        b   = tmp;
    }
    return b;
}

/* ====== RISC-V アセンブリ版（RV64I）==================
   呼び出し規約: a0 = 引数 n, a0 = 戻り値

fibonacci:
    # プロローグ（フレーム設定）
    addi sp, sp, -16     # スタックを 16 バイト確保
    sd   ra, 8(sp)       # リターンアドレスを保存
    sd   s0, 0(sp)       # s0 を保存

    # if (n <= 1) return n
    li   t0, 1
    ble  a0, t0, .Lreturn_n   # a0 <= 1 なら戻る

    # ループ初期化: a = t1 = 0, b = t2 = 1, i = t3 = 2
    li   t1, 0           # a = 0
    li   t2, 1           # b = 1
    li   t3, 2           # i = 2
    mv   s0, a0          # n を s0 に保存

.Lloop:
    bgt  t3, s0, .Ldone  # i > n ならループ脱出
    add  t4, t1, t2      # tmp = a + b
    mv   t1, t2          # a = b
    mv   t2, t4          # b = tmp
    addi t3, t3, 1       # i++
    j    .Lloop

.Ldone:
    mv   a0, t2          # 戻り値 = b

.Lepilogue:
    ld   ra, 8(sp)       # リターンアドレスを復元
    ld   s0, 0(sp)       # s0 を復元
    addi sp, sp, 16      # スタックを解放
    ret                  # jalr x0, ra, 0

.Lreturn_n:
    j    .Lepilogue      # a0 はそのまま（n を返す）
*/

/* ====== 動作確認用 main ============================= */
#include <stdio.h>
int main(void) {
    for (long i = 0; i <= 10; i++)
        printf("fib(%ld) = %ld\n", i, fibonacci_c(i));
    return 0;
}
```

```python title="RISC-V 命令デコーダ（Python）"
from dataclasses import dataclass
from typing import Optional

@dataclass
class DecodedInstr:
    fmt:    str          # 命令形式（R/I/S/B/U/J）
    opcode: int
    rd:     Optional[int]
    rs1:    Optional[int]
    rs2:    Optional[int]
    funct3: Optional[int]
    funct7: Optional[int]
    imm:    Optional[int]
    mnemonic: str = "unknown"

def sign_extend(value: int, bits: int) -> int:
    """符号拡張"""
    sign_bit = 1 << (bits - 1)
    return (value & (sign_bit - 1)) - (value & sign_bit)

def decode_rtype(word: int) -> DecodedInstr:
    opcode = word & 0x7F
    rd     = (word >> 7)  & 0x1F
    funct3 = (word >> 12) & 0x7
    rs1    = (word >> 15) & 0x1F
    rs2    = (word >> 20) & 0x1F
    funct7 = (word >> 25) & 0x7F
    return DecodedInstr("R", opcode, rd, rs1, rs2, funct3, funct7, None)

def decode_itype(word: int) -> DecodedInstr:
    opcode = word & 0x7F
    rd     = (word >> 7)  & 0x1F
    funct3 = (word >> 12) & 0x7
    rs1    = (word >> 15) & 0x1F
    imm    = sign_extend((word >> 20) & 0xFFF, 12)
    return DecodedInstr("I", opcode, rd, rs1, None, funct3, None, imm)

def decode_stype(word: int) -> DecodedInstr:
    opcode = word & 0x7F
    funct3 = (word >> 12) & 0x7
    rs1    = (word >> 15) & 0x1F
    rs2    = (word >> 20) & 0x1F
    imm_lo = (word >> 7)  & 0x1F
    imm_hi = (word >> 25) & 0x7F
    imm    = sign_extend((imm_hi << 5) | imm_lo, 12)
    return DecodedInstr("S", opcode, None, rs1, rs2, funct3, None, imm)

def decode_btype(word: int) -> DecodedInstr:
    opcode  = word & 0x7F
    funct3  = (word >> 12) & 0x7
    rs1     = (word >> 15) & 0x1F
    rs2     = (word >> 20) & 0x1F
    imm_11  = (word >> 7)  & 0x1
    imm_4_1 = (word >> 8)  & 0xF
    imm_10_5= (word >> 25) & 0x3F
    imm_12  = (word >> 31) & 0x1
    imm = sign_extend(
        (imm_12 << 12) | (imm_11 << 11) | (imm_10_5 << 5) | (imm_4_1 << 1),
        13)
    return DecodedInstr("B", opcode, None, rs1, rs2, funct3, None, imm)

def decode_utype(word: int) -> DecodedInstr:
    opcode = word & 0x7F
    rd     = (word >> 7) & 0x1F
    imm    = word & 0xFFFFF000
    return DecodedInstr("U", opcode, rd, None, None, None, None, imm)

# opcode → 命令形式マッピング
OPCODE_TABLE = {
    0b0110011: ("R",  decode_rtype),  # ADD, SUB, AND, OR, XOR...
    0b0010011: ("I",  decode_itype),  # ADDI, XORI, ORI...
    0b0000011: ("I",  decode_itype),  # LW, LH, LB...
    0b0100011: ("S",  decode_stype),  # SW, SH, SB
    0b1100011: ("B",  decode_btype),  # BEQ, BNE, BLT...
    0b0110111: ("U",  decode_utype),  # LUI
    0b0010111: ("U",  decode_utype),  # AUIPC
}

FUNCT3_RTYPE = {(0x00, 0x00): "add", (0x00, 0x20): "sub",
                (0x07, 0x00): "and", (0x06, 0x00): "or",
                (0x04, 0x00): "xor", (0x01, 0x00): "sll"}
FUNCT3_ITYPE = {0x00: "addi", 0x04: "xori", 0x06: "ori", 0x07: "andi"}
REG_NAMES    = ["zero","ra","sp","gp","tp","t0","t1","t2",
                "s0","s1","a0","a1","a2","a3","a4","a5",
                "a6","a7","s2","s3","s4","s5","s6","s7",
                "s8","s9","s10","s11","t3","t4","t5","t6"]

def decode(word: int) -> DecodedInstr:
    opcode = word & 0x7F
    if opcode not in OPCODE_TABLE:
        return DecodedInstr("?", opcode, None, None, None, None, None, None, "unknown")
    _, decoder = OPCODE_TABLE[opcode]
    d = decoder(word)
    # ニーモニック解決
    if d.fmt == "R":
        d.mnemonic = FUNCT3_RTYPE.get((d.funct3, d.funct7), f"R:f3={d.funct3:#x}")
    elif d.fmt == "I":
        d.mnemonic = FUNCT3_ITYPE.get(d.funct3, f"I:f3={d.funct3:#x}")
    elif d.fmt == "S":
        d.mnemonic = ["sb","sh","sw"].get(d.funct3, "sw") if d.funct3 is not None else "sw"
    elif d.fmt == "B":
        d.mnemonic = {0:"beq",1:"bne",4:"blt",5:"bge",6:"bltu",7:"bgeu"}.get(
            d.funct3, "branch")
    elif d.fmt == "U":
        d.mnemonic = "lui" if opcode == 0b0110111 else "auipc"
    return d

def print_instr(word: int):
    d = decode(word)
    r = lambda n: REG_NAMES[n] if n is not None else "-"
    print(f"  0x{word:08X}  [{d.fmt}] {d.mnemonic:<8s} "
          f"rd={r(d.rd):<5} rs1={r(d.rs1):<5} rs2={r(d.rs2):<5} imm={d.imm}")

# --- テスト命令のデコード ---
print("=== RISC-V 命令デコード ===")
test_words = [
    0x003100B3,  # add x1, x2, x3  (R型)
    0x00A10113,  # addi x2, x2, 10 (I型)
    0x00312223,  # sw x3, 4(x2)    (S型)
    0x00310463,  # beq x2, x3, +8  (B型)
    0x000012B7,  # lui x5, 1       (U型)
]
for w in test_words:
    print_instr(w)
```

## 使用場面

- **教育・研究**: MIT・東大等の計算機アーキテクチャ講義で標準 ISA として採用
- **組み込み**: SiFive HiFive シリーズ・ESP32-C3（RISC-V コア）・GD32VF103
- **FPGA**: Xilinx/Intel FPGA 上のソフトコアプロセッサ（VexRiscv・PicoRV32）
- **AI/ML アクセラレータ**: NVIDIA GPU の制御プロセッサ・Tenstorrent Tensix コア
- **Linux/OS**: RISC-V 向け Linux カーネル・Debian/Fedora の公式サポート

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
