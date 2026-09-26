---
sidebar_position: 1
displayed_sidebar: computerArchitectureSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# パイプライン処理 (Pipeline)

## パイプラインとは

パイプラインとは、

> 命令の実行を複数のステージに分割し、異なる命令を同時並行に処理することでスループットを向上させる手法

です。
<br/>

典型的な5段パイプライン（IF → ID → EX → MEM → WB）では、理想状態でクロックあたり1命令を完了できます。

## パイプラインハザード


| ハザード種別 | 原因 | 解決策 |
| --- | --- | --- |
| データハザード | 前の命令の結果が未確定 | フォワーディング・ストール挿入 |
| 制御ハザード | 分岐先が未決定 | 分岐予測・遅延スロット |
| 構造ハザード | ハードウェアリソース競合 | リソース複製・ストール |

## 分岐予測

```
静的予測: 常に「分岐しない」と仮定（コンパイラヒント利用）
動的予測: 2ビット飽和カウンタで履歴を保持
  00 → 強く分岐しない
  01 → 弱く分岐しない
  10 → 弱く分岐する
  11 → 強く分岐する
```

## 実装

```c title="パイプラインシミュレーション（C）"
#include <stdio.h>
#include <string.h>

#define STAGES 5
#define MAX_INST 8

const char *stage_names[] = {"IF", "ID", "EX", "MEM", "WB"};

typedef struct {
    const char *name;
    int stage;      /* 現在のステージ（-1: 未開始, 5: 完了） */
} Instruction;

void simulate_pipeline(Instruction *insts, int n) {
    int cycles = n + STAGES - 1;
    printf("Cycle");
    for (int i = 0; i < n; i++) printf(" | %-4s", insts[i].name);
    printf("\n");

    for (int c = 1; c <= cycles; c++) {
        printf("  %3d", c);
        for (int i = 0; i < n; i++) {
            int s = c - 1 - i;  /* このサイクルでの命令iのステージ */
            if (s >= 0 && s < STAGES)
                printf(" | %-4s", stage_names[s]);
            else
                printf(" |     ");
        }
        printf("\n");
    }
}

int main(void) {
    Instruction insts[] = {{"I1"}, {"I2"}, {"I3"}, {"I4"}};
    simulate_pipeline(insts, 4);
    return 0;
}
```

```python title="2ビット分岐予測シミュレーション（Python）"
class TwoBitPredictor:
    """2ビット飽和カウンタによる分岐予測器"""
    STATES = ['強く不成立', '弱く不成立', '弱く成立', '強く成立']

    def __init__(self):
        self.state = 1  # 初期: 弱く不成立

    def predict(self) -> bool:
        return self.state >= 2  # 2以上なら分岐成立と予測

    def update(self, taken: bool):
        if taken:
            self.state = min(3, self.state + 1)
        else:
            self.state = max(0, self.state - 1)

    def simulate(self, history: list[bool]) -> dict:
        correct = 0
        for taken in history:
            pred = self.predict()
            if pred == taken:
                correct += 1
            self.update(taken)
        return {'accuracy': correct / len(history), 'final_state': self.STATES[self.state]}

predictor = TwoBitPredictor()
# ループの分岐パターン: 成立×9回 + 不成立×1回
pattern = [True] * 9 + [False]
result = predictor.simulate(pattern * 3)
print(f"予測精度: {result['accuracy']:.1%}")  # 高精度
```

## 使用場面

- **高性能 CPU**: Intel / AMD の 20 段超パイプライン
- **スーパースカラ**: 複数パイプラインの並列実行
- **コンパイラ**: ループアンロールによるパイプライン効率向上
- **GPU**: 数千スレッドでレイテンシを隠蔽

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
