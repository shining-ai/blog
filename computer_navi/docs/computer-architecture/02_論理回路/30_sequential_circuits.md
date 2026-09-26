---
sidebar_position: 3
displayed_sidebar: computerArchitectureSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 順序回路 (Sequential Circuits)

## 順序回路とは

順序回路とは、

> 現在の入力と過去の状態（記憶素子に保持された値）によって出力が決まる論理回路

です。
<br/>

フィードバックパスを持ち、過去の入力履歴を状態として保持します。
フリップフロップ・レジスタ・カウンタなどが代表例で、組み合わせ回路と組み合わせてCPUのパイプラインや制御回路を構成します。

## SR ラッチ

NOR ゲート2個のフィードバックで構成される最も基本的な記憶素子です。

| S | R | Q(next) | 説明 |
| --- | --- | --- | --- |
| 0 | 0 | Q(前の状態) | 保持 |
| 0 | 1 | 0 | リセット |
| 1 | 0 | 1 | セット |
| 1 | 1 | 不定 | 禁止状態 |

## D フリップフロップ

クロックの立ち上がりエッジ（↑）でデータ入力 D の値をラッチします。

| CLK | D | Q(next) |
| --- | --- | --- |
| ↑ | 0 | 0 |
| ↑ | 1 | 1 |
| 0 / 1 | × | Q（変化なし） |

D フリップフロップは SR ラッチの禁止状態を排除し、`R = ¬D` と接続することで実現します。

## JK フリップフロップ

SR ラッチの禁止状態（S=R=1）を「トグル」動作に置き換えた汎用フリップフロップです。

| J | K | Q(next) | 動作 |
| --- | --- | --- | --- |
| 0 | 0 | Q | 保持 |
| 0 | 1 | 0 | リセット |
| 1 | 0 | 1 | セット |
| 1 | 1 | ¬Q | トグル |

## レジスタと 4bit カウンタ

Dフリップフロップを n 個並列に並べると n ビットのレジスタになります。
4bit カウンタはクロックごとに値が `0000 → 0001 → ... → 1111 → 0000` と循環します。

```
CLK: ____|‾|_|‾|_|‾|_|‾|_|‾|_
Q0:  ________|‾‾‾‾|___|‾‾‾‾|__  (÷2)
Q1:  ________________|‾‾‾‾‾‾‾‾  (÷4)
Q2:  ____________________________  (÷8, ...続く)
```

各ビットは下位ビットの出力をクロックとして使用する「リップルカウンタ」で実現できます。

## 実装

```c title="フリップフロップのシミュレーション（C）"
#include <stdio.h>
#include <stdint.h>

/* D フリップフロップの状態 */
typedef struct { int q; } DFF;

/* クロック立ち上がりエッジで D を取り込む */
void dff_clock(DFF *ff, int d) {
    ff->q = d;
}

/* SR ラッチ（NOR ベース）*/
typedef struct { int q, qn; } SRLatch;

void sr_latch_set(SRLatch *sr, int s, int r) {
    if (s == 1 && r == 0) { sr->q = 1; sr->qn = 0; }
    else if (s == 0 && r == 1) { sr->q = 0; sr->qn = 1; }
    else if (s == 0 && r == 0) { /* 保持: 変化なし */ }
    else { /* s==1, r==1: 禁止状態 */ }
}

/* 4ビット非同期カウンタ（D フリップフロップ4段）*/
typedef struct {
    DFF bits[4];
    uint8_t count;
} Counter4bit;

void counter_tick(Counter4bit *c) {
    c->count = (c->count + 1) & 0x0F;
    for (int i = 0; i < 4; i++)
        c->bits[i].q = (c->count >> i) & 1;
}

int main(void) {
    /* D フリップフロップ */
    printf("=== D フリップフロップ ===\n");
    DFF ff = {0};
    int inputs[] = {1, 1, 0, 1, 0, 0};
    for (int i = 0; i < 6; i++) {
        dff_clock(&ff, inputs[i]);
        printf("CLK↑ D=%d -> Q=%d\n", inputs[i], ff.q);
    }

    /* SR ラッチ */
    printf("\n=== SR ラッチ ===\n");
    SRLatch sr = {0, 1};
    int s_seq[] = {1, 0, 0, 0, 1};
    int r_seq[] = {0, 0, 1, 0, 0};
    for (int i = 0; i < 5; i++) {
        sr_latch_set(&sr, s_seq[i], r_seq[i]);
        printf("S=%d R=%d -> Q=%d Q'=%d\n", s_seq[i], r_seq[i], sr.q, sr.qn);
    }

    /* 4ビットカウンタ */
    printf("\n=== 4bit カウンタ ===\n");
    Counter4bit cnt = {{}, 0};
    for (int i = 0; i < 18; i++) {
        counter_tick(&cnt);
        printf("CLK %2d: count=%2d  binary=%d%d%d%d\n",
               i + 1, cnt.count,
               cnt.bits[3].q, cnt.bits[2].q, cnt.bits[1].q, cnt.bits[0].q);
    }
    return 0;
}
```

```python title="クロックエッジシミュレーション（Python）"
from dataclasses import dataclass, field

@dataclass
class DFlipFlop:
    """D フリップフロップ: CLK 立ち上がりエッジで D をラッチ"""
    q: int = 0

    def clock_edge(self, d: int) -> int:
        self.q = d & 1
        return self.q

@dataclass
class JKFlipFlop:
    """JK フリップフロップ"""
    q: int = 0

    def clock_edge(self, j: int, k: int) -> int:
        if   j == 0 and k == 0: pass          # 保持
        elif j == 0 and k == 1: self.q = 0    # リセット
        elif j == 1 and k == 0: self.q = 1    # セット
        else:                   self.q ^= 1   # トグル
        return self.q

@dataclass
class Counter4bit:
    """4ビット同期カウンタ（D フリップフロップ4段）"""
    bits: list = field(default_factory=lambda: [DFlipFlop() for _ in range(4)])
    _count: int = 0

    def tick(self) -> int:
        self._count = (self._count + 1) & 0x0F
        for i, ff in enumerate(self.bits):
            ff.clock_edge((self._count >> i) & 1)
        return self._count

# D フリップフロップのシミュレーション
print("=== D フリップフロップ ===")
ff = DFlipFlop()
for d in [1, 1, 0, 1, 0]:
    q = ff.clock_edge(d)
    print(f"CLK↑ D={d} -> Q={q}")

# JK フリップフロップの真理値表検証
print("\n=== JK フリップフロップ 真理値表 ===")
print("J | K | Q(before) | Q(after)")
for j in range(2):
    for k in range(2):
        jk = JKFlipFlop(q=0)
        q_before = jk.q
        q_after  = jk.clock_edge(j, k)
        print(f"{j} | {k} |     {q_before}     |     {q_after}")

# 4ビットカウンタのシミュレーション
print("\n=== 4bit カウンタ ===")
counter = Counter4bit()
for clk in range(1, 20):
    val = counter.tick()
    binary = f"{val:04b}"
    print(f"CLK {clk:2d}: count={val:2d}  binary={binary}")
    if val == 0 and clk > 1:
        print("  (オーバーフロー -> ゼロに戻る)")
```

## 使用場面

- **CPU レジスタ**: プログラムカウンタ・汎用レジスタはすべてDフリップフロップベースのレジスタ
- **カウンタ**: クロック分周器・タイムスタンプカウンタ・プログラムカウンタのインクリメント
- **シフトレジスタ**: UART のシリアル/パラレル変換、CRC 演算回路
- **状態保持回路**: パイプラインステージ間のラッチ、FIFO バッファのポインタ管理

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
