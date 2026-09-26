---
sidebar_position: 4
displayed_sidebar: computerArchitectureSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 分岐予測 (Branch Prediction)

## 分岐予測とは

分岐予測とは、

> パイプラインの制御ハザードを低減するため、条件分岐命令が実際に評価される前に分岐の成立・不成立を事前に予測する仕組み

です。<br/>

現代の深いパイプライン（15〜20 段）では、分岐予測ミス時に全ステージをフラッシュする必要があり、3〜20 サイクルのペナルティが発生します。高精度な予測（99% 以上）が IPC（命令/サイクル）の維持に不可欠です。

## 分岐ペナルティ

| アーキテクチャ | パイプライン段数 | 予測ミスペナルティ |
| --- | --- | --- |
| Intel Pentium 4 | 31 段 | 最大 20 サイクル |
| Intel Core（Skylake） | 14〜19 段 | 15〜20 サイクル |
| ARM Cortex-A57 | 15 段 | 約 15 サイクル |
| RISC-V（シンプル実装） | 5 段 | 3〜5 サイクル |

## 予測方式の比較

| 方式 | 精度 | ハードウェアコスト | 特徴 |
| --- | --- | --- | --- |
| 静的予測（常に成立） | 中程度（〜60%） | ほぼなし | コンパイラが `__builtin_expect` で指示 |
| 静的予測（常に不成立） | 中程度（〜60%） | ほぼなし | 前向き分岐に有効 |
| 1 ビット予測器 | 〜85% | PHT（1bit × エントリ数） | 直近の結果をそのまま次回に使用 |
| 2 ビット飽和カウンタ | 〜90% | PHT（2bit × エントリ数） | 状態遷移で誤予測への耐性を向上 |
| 相関予測器（2段） | 〜95% | PHT + 分岐履歴レジスタ | 直近 N 回の履歴とPCを組み合わせる |
| BTB（分岐ターゲットバッファ） | - | BTB キャッシュ | 分岐先アドレスをキャッシュ |
| TAGE 予測器 | 97〜99% | 複数世代の履歴テーブル | 現代 CPU（Intel Haswell 以降）で採用 |

## 2 ビット飽和カウンタの状態遷移

```
      分岐不成立               分岐成立
         ←                       →
[00: 強く不成立] ⇄ [01: 弱く不成立] ⇄ [10: 弱く成立] ⇄ [11: 強く成立]
         →                       ←
      分岐成立                分岐不成立

予測ルール:
  状態 00, 01 → 「分岐しない」と予測
  状態 10, 11 → 「分岐する」と予測

初期状態: 01（弱く不成立）
```

## 分岐ターゲットバッファ（BTB）

```
分岐命令の PC アドレス
       ↓
  BTB インデックス（下位 N ビット）
       ↓
  BTB エントリ: [タグ | 予測先アドレス | 2bit カウンタ]
       ↓
  ヒット → 予測先へ投機実行
  ミス  → 通常フェッチ + BTB 更新
```

## 実装

```c title="2 ビット飽和カウンタ分岐予測シミュレーション（C）"
#include <stdio.h>
#include <stdint.h>
#include <string.h>

#define PHT_SIZE  256   /* 予測履歴テーブルのエントリ数（2^8） */
#define HIST_LEN    8   /* 分岐履歴レジスタのビット数 */

/* 2 ビット飽和カウンタ: 0=強く不成立 1=弱く不成立 2=弱く成立 3=強く成立 */
typedef uint8_t TwoBitCounter;

typedef struct {
    TwoBitCounter pht[PHT_SIZE];
    uint8_t       global_hist;   /* グローバル履歴レジスタ（8bit） */
    int           total;
    int           correct;
} BranchPredictor;

void bp_init(BranchPredictor *bp) {
    memset(bp, 0, sizeof(*bp));
    /* 初期値: 弱く不成立（1）*/
    for (int i = 0; i < PHT_SIZE; i++)
        bp->pht[i] = 1;
}

/* PHT インデックス: PC の下位ビット XOR グローバル履歴 */
static int pht_index(uint64_t pc, uint8_t hist) {
    return (int)((pc ^ hist) & (PHT_SIZE - 1));
}

/* 予測: カウンタが 2 以上なら成立と予測 */
int bp_predict(BranchPredictor *bp, uint64_t pc) {
    int idx = pht_index(pc, bp->global_hist);
    return bp->pht[idx] >= 2;
}

/* 更新: 実際の分岐結果で PHT とグローバル履歴を更新 */
void bp_update(BranchPredictor *bp, uint64_t pc, int taken) {
    int idx = pht_index(pc, bp->global_hist);
    TwoBitCounter *c = &bp->pht[idx];
    if (taken && *c < 3) (*c)++;
    if (!taken && *c > 0) (*c)--;

    /* グローバル履歴を左シフトして最新の結果を追加 */
    bp->global_hist = (uint8_t)((bp->global_hist << 1) | taken);
}

void bp_record(BranchPredictor *bp, uint64_t pc, int taken) {
    int pred = bp_predict(bp, pc);
    bp->total++;
    if (pred == taken) bp->correct++;
    bp_update(bp, pc, taken);
}

double bp_accuracy(const BranchPredictor *bp) {
    return bp->total ? (double)bp->correct / bp->total : 0.0;
}

int main(void) {
    BranchPredictor bp;
    bp_init(&bp);

    printf("=== ループ分岐パターン（9回成立 + 1回不成立を100ループ）===\n");
    for (int loop = 0; loop < 100; loop++) {
        for (int i = 0; i < 9; i++)
            bp_record(&bp, 0x1000, 1 /* taken */);
        bp_record(&bp, 0x1000, 0 /* not taken */);
    }
    printf("予測精度: %.2f%%  (%d/%d)\n\n",
           bp_accuracy(&bp) * 100, bp.correct, bp.total);

    /* リセット */
    bp_init(&bp);
    printf("=== 交互分岐パターン（TNTNTNTNT...）===\n");
    for (int i = 0; i < 100; i++)
        bp_record(&bp, 0x2000, i % 2);
    printf("予測精度: %.2f%%  (%d/%d)\n",
           bp_accuracy(&bp) * 100, bp.correct, bp.total);

    return 0;
}
```

```python title="分岐履歴テーブルと予測精度計算（Python）"
class TwoBitPredictor:
    """2 ビット飽和カウンタによる分岐予測器"""
    STATES = ["強く不成立(00)", "弱く不成立(01)", "弱く成立(10)", "強く成立(11)"]

    def __init__(self, pht_size: int = 256, hist_bits: int = 8):
        self.pht_size  = pht_size
        self.hist_mask = (1 << hist_bits) - 1
        self.pht       = [1] * pht_size   # 初期: 弱く不成立
        self.global_hist = 0
        self.total   = 0
        self.correct = 0

    def _index(self, pc: int) -> int:
        return (pc ^ self.global_hist) & (self.pht_size - 1)

    def predict(self, pc: int) -> bool:
        return self.pht[self._index(pc)] >= 2

    def update(self, pc: int, taken: bool):
        idx = self._index(pc)
        if taken and self.pht[idx] < 3:
            self.pht[idx] += 1
        elif not taken and self.pht[idx] > 0:
            self.pht[idx] -= 1
        self.global_hist = ((self.global_hist << 1) | int(taken)) & self.hist_mask

    def record(self, pc: int, taken: bool):
        pred = self.predict(pc)
        self.total += 1
        if pred == taken:
            self.correct += 1
        self.update(pc, taken)

    @property
    def accuracy(self) -> float:
        return self.correct / self.total if self.total else 0.0


def simulate(name: str, pattern: list[bool], pc: int = 0x1000):
    bp = TwoBitPredictor()
    for taken in pattern:
        bp.record(pc, taken)
    print(f"[{name}]")
    print(f"  試行回数: {bp.total}  正解: {bp.correct}  精度: {bp.accuracy:.2%}")
    print(f"  最終 PHT 状態[idx]: {TwoBitPredictor.STATES[bp.pht[0 & 255]]}")


# --- シミュレーション ---
loop_pattern   = ([True] * 9 + [False]) * 100       # ループ（高精度）
toggle_pattern = [i % 2 == 0 for i in range(100)]   # TNTNT...（低精度）
random_pattern = [i % 3 != 0 for i in range(300)]   # やや不規則

simulate("ループ（9T+1N を 100 回）",  loop_pattern)
simulate("交互（TNTN... を 100 回）",   toggle_pattern)
simulate("不規則（2T+1N を 100 回）",   random_pattern)
```

## 使用場面

- **高性能 CPU のマイクロアーキテクチャ**: Intel Core/AMD Zen シリーズは TAGE 等の高度な予測器を搭載
- **コンパイラ最適化**: GCC/Clang の `__builtin_expect(expr, 1)` で静的予測ヒントを提供
- **Linux カーネル**: `likely()` / `unlikely()` マクロによる分岐レイアウト最適化
- **セキュリティ（Spectre 攻撃）**: 投機的実行を悪用したサイドチャネル攻撃の研究
- **プロファイリング**: `perf stat -e branch-misses` で予測ミス率を計測し最適化

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
