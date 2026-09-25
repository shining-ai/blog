---
sidebar_position: 0
displayed_sidebar: computerArchitectureSidebar
---

# 命令セットアーキテクチャ（ISA）の概要

## 概要

命令セットアーキテクチャ（ISA: Instruction Set Architecture）とは、

> ソフトウェアとハードウェアの境界を定義するインタフェース仕様で、プロセッサが実行できる命令の集合・レジスタ・メモリモデル・アドレス指定方式を規定する

です。

同じ ISA を実装したプロセッサであれば、コンパイル済みバイナリをそのまま実行できます（バイナリ互換性）。

## ISA の主要要素

| 要素 | 説明 | 例 |
|---|---|---|
| 命令セット | 演算・転送・制御命令の一覧 | ADD, MOV, JMP |
| レジスタ | CPU 内部の高速記憶領域 | x86-64: RAX, RBX... |
| データ型 | 整数・浮動小数点・SIMD | int8, float32, __m256 |
| アドレス指定 | オペランドの指定方法 | 即値・レジスタ・メモリ間接 |
| 特権レベル | カーネル/ユーザモードの区別 | リング 0〜3（x86） |

## CISC vs RISC

| 特性 | CISC | RISC |
|---|---|---|
| 命令数 | 多い（数百〜千） | 少ない（数十〜百） |
| 命令長 | 可変（x86: 1〜15バイト） | 固定（RISC-V: 4バイト） |
| 実行サイクル | 複数サイクル | 原則1サイクル |
| レジスタ数 | 少なめ | 多め（32本など） |
| 代表例 | x86, x86-64 | ARM, RISC-V, MIPS |

## x86-64 の主要レジスタ

```
汎用レジスタ（64ビット）:
  RAX, RBX, RCX, RDX  - 計算・引数
  RSI, RDI            - ソース/デスティネーション
  RSP                 - スタックポインタ
  RBP                 - ベースポインタ
  R8〜R15             - 追加汎用

特殊レジスタ:
  RIP  - プログラムカウンタ（命令ポインタ）
  RFLAGS - ゼロ・キャリー・オーバーフロー等のフラグ
```

## 実装：命令デコードのシミュレーション

```python title="単純な命令デコーダ"
# RISC-V R型命令のデコード例
def decode_rtype(instruction: int) -> dict:
    opcode = instruction & 0x7F
    rd     = (instruction >> 7)  & 0x1F
    funct3 = (instruction >> 12) & 0x07
    rs1    = (instruction >> 15) & 0x1F
    rs2    = (instruction >> 20) & 0x1F
    funct7 = (instruction >> 25) & 0x7F
    return {'opcode': opcode, 'rd': rd, 'funct3': funct3,
            'rs1': rs1, 'rs2': rs2, 'funct7': funct7}

# ADD x1, x2, x3 のエンコード
instr = 0x003100B3  # funct7=0, rs2=3, rs1=2, funct3=0, rd=1, opcode=0x33
print(decode_rtype(instr))
```

## 使用場面

- **コンパイラ**: ターゲット ISA のコード生成
- **エミュレータ・仮想化**: ISA のソフトウェア実装
- **セキュリティ解析**: 逆アセンブルと脆弱性発見
