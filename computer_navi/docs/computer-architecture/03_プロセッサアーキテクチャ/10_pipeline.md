---
sidebar_position: 1
displayed_sidebar: computerArchitectureSidebar
---

# パイプライン処理

## 概要

パイプライン処理とは、

> 命令の実行を複数のステージに分割し、各ステージを並列に動作させることでスループットを向上させる技術

です。

洗濯機の洗濯・乾燥・折りたたみを順に行うより、並列に行う方が効率的なのと同じ原理です。

## 5段パイプラインの構成

```
IF  → ID  → EX  → MEM → WB
(フェッチ)(デコード)(実行)(メモリ)(書き込み)

クロック:  1    2    3    4    5    6    7    8
命令1:    IF   ID   EX  MEM   WB
命令2:         IF   ID   EX  MEM   WB
命令3:              IF   ID   EX  MEM   WB
命令4:                   IF   ID   EX  MEM   WB
```

5段パイプラインでは、定常状態で毎クロック1命令完了します（CPI ≈ 1）。

## パイプラインハザード

### データハザード

```
ADD R1, R2, R3   # R1 に書き込み
SUB R4, R1, R5   # R1 をすぐ読む → RAW ハザード

解決策:
  フォワーディング: EX ステージの結果を次の EX に直接転送
  ストール: NOP 命令を挿入して待機
```

### 制御ハザード（分岐ハザード）

```
BEQ R1, R2, label  # 分岐命令
ADD R3, R4, R5     # 分岐先が決まるまで無効化が必要

解決策:
  遅延分岐: 分岐後の命令を常に実行
  分岐予測: 静的（常に taken/not taken）、動的（履歴ベース）
  投機実行: 予測した分岐先を先行実行し、誤りなら rollback
```

### 計算量・性能指標

| 指標 | 説明 | 理想値 |
|---|---|---|
| CPI（Cycles Per Instruction） | 命令あたりのクロック数 | 1.0 |
| IPC（Instructions Per Cycle） | クロックあたりの命令数 | ≥1（スーパースカラ） |
| 分岐予測精度 | 現代の CPU で 97〜99% | 100% |
| スループット | 定常状態で 1 命令/サイクル | ステージ数に依存しない |

## 実装（パイプライン状態機械のシミュレーション）

```python title="5段パイプラインシミュレータ"
from collections import deque

class PipelineSim:
    STAGES = ['IF', 'ID', 'EX', 'MEM', 'WB']

    def __init__(self):
        self.pipeline = deque([None] * 5, maxlen=5)
        self.cycle = 0

    def tick(self, instr: str | None):
        self.pipeline.appendleft(instr)
        self.cycle += 1
        print(f"Cycle {self.cycle:2d}: {list(self.pipeline)}")

sim = PipelineSim()
instructions = ['ADD', 'SUB', 'MUL', 'LW', 'SW', None, None, None, None]
for instr in instructions:
    sim.tick(instr)
```

## 使用場面

- **現代 CPU 設計**: x86（Intel Raptor Lake：30段超）、ARM（Cortex-A78：13段）
- **GPU**: 数百〜数千の SIMD パイプライン
- **FPGA**: カスタムパイプラインで高スループット処理
