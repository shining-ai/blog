---
sidebar_position: 4
displayed_sidebar: computerArchitectureSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 有限状態機械 (Finite State Machine)

## 有限状態機械とは

有限状態機械とは、

> 有限個の状態の集合と、入力によって現在の状態から次の状態へ遷移する規則を持つ計算モデル

です。
<br/>

FSM（Finite State Machine）とも呼ばれ、形式言語理論・コンパイラ・プロトコル設計などの基礎となります。
出力の決定方法によってムーア型（Moore）とミーリー型（Mealy）の2種類に分類されます。

## ムーア型 vs ミーリー型

| 項目 | ムーア型 (Moore) | ミーリー型 (Mealy) |
| --- | --- | --- |
| 出力の依存 | 状態のみ | 状態 + 入力 |
| 応答タイミング | 遷移後（1クロック遅れ） | 入力と同時 |
| 状態数 | 一般に多い | 一般に少ない |
| 設計の容易さ | 直感的で設計しやすい | 状態数を削減しやすい |
| 主な用途 | CPUの制御ユニット | プロトコルパーサ・シリアル通信 |

## 信号機の例（ムーア型）

| 状態 | 出力 | 遷移条件 | 次の状態 |
| --- | --- | --- | --- |
| RED（赤） | 停止 | タイムアウト | GREEN |
| GREEN（青） | 進行 | タイムアウト | YELLOW |
| YELLOW（黄） | 注意 | タイムアウト | RED |

## 状態遷移図（テキスト形式）

```
         timeout          timeout
  +-------+     +-------+     +-------+
  |  RED  | --> | GREEN | --> |YELLOW |
  | (停止) |     | (進行) |     | (注意) |
  +-------+     +-------+     +-------+
       ^                           |
       |         timeout           |
       +---------------------------+

初期状態: RED
各状態での出力はムーア型のため状態に紐づく
```

## 実装

```c title="enum状態+switch文でFSM実装（C）"
#include <stdio.h>

/* 状態の定義 */
typedef enum {
    STATE_RED,
    STATE_GREEN,
    STATE_YELLOW,
    STATE_COUNT
} TrafficState;

/* 出力（ムーア型: 状態のみに依存） */
static const char *state_output[] = {
    [STATE_RED]    = "STOP  (赤)",
    [STATE_GREEN]  = "GO    (青)",
    [STATE_YELLOW] = "SLOW  (黄)"
};

/* 入力の定義 */
typedef enum { INPUT_TIMEOUT } TrafficInput;

/* 遷移テーブル [現在の状態][入力] -> 次の状態 */
static const TrafficState transition[STATE_COUNT][1] = {
    [STATE_RED]    = {STATE_GREEN},
    [STATE_GREEN]  = {STATE_YELLOW},
    [STATE_YELLOW] = {STATE_RED}
};

/* FSM の1ステップを実行 */
TrafficState fsm_step(TrafficState current, TrafficInput input) {
    return transition[current][input];
}

/* FSM の実行例 */
int main(void) {
    TrafficState state = STATE_RED;
    printf("=== 信号機 FSM シミュレーション ===\n");
    for (int cycle = 0; cycle < 9; cycle++) {
        printf("サイクル %d: %s\n", cycle, state_output[state]);
        state = fsm_step(state, INPUT_TIMEOUT);
    }
    return 0;
}
```

```python title="dict+dataclassでFSM（Python）"
from dataclasses import dataclass, field
from typing import Any

@dataclass
class FSMState:
    name: str
    output: Any

@dataclass
class FSM:
    """汎用有限状態機械"""
    states: dict[str, FSMState]
    transitions: dict[tuple[str, str], str]   # (state, input) -> next_state
    initial: str
    _current: str = field(init=False)

    def __post_init__(self):
        self._current = self.initial

    @property
    def current(self) -> FSMState:
        return self.states[self._current]

    def step(self, inp: str) -> FSMState:
        key = (self._current, inp)
        if key not in self.transitions:
            raise ValueError(f"未定義の遷移: 状態={self._current}, 入力={inp}")
        self._current = self.transitions[key]
        return self.current

    def reset(self):
        self._current = self.initial

# 信号機 FSM の定義（ムーア型）
traffic_fsm = FSM(
    states={
        "RED":    FSMState("RED",    "STOP  (赤)"),
        "GREEN":  FSMState("GREEN",  "GO    (青)"),
        "YELLOW": FSMState("YELLOW", "SLOW  (黄)"),
    },
    transitions={
        ("RED",    "timeout"): "GREEN",
        ("GREEN",  "timeout"): "YELLOW",
        ("YELLOW", "timeout"): "RED",
    },
    initial="RED",
)

print("=== 信号機 FSM シミュレーション ===")
for cycle in range(9):
    print(f"サイクル {cycle}: {traffic_fsm.current.output}")
    traffic_fsm.step("timeout")

# ミーリー型 FSM の例: シリアル入力で '101' パターンを検出
print("\n=== '101' パターン検出 FSM（ミーリー型）===")

mealy_fsm = FSM(
    states={
        "S0": FSMState("S0", None),   # 初期状態
        "S1": FSMState("S1", None),   # '1' 受信済み
        "S2": FSMState("S2", None),   # '10' 受信済み
    },
    transitions={
        ("S0", "0"): "S0",
        ("S0", "1"): "S1",
        ("S1", "0"): "S2",
        ("S1", "1"): "S1",
        ("S2", "0"): "S0",
        ("S2", "1"): "S1",   # '101' 検出! -> S1 へ遷移
    },
    initial="S0",
)

# ミーリー型の出力: 遷移時に判定
mealy_outputs = {("S2", "1"): "MATCH!"}

sequence = "1011010110101"
print(f"入力シーケンス: {sequence}")
mealy_fsm.reset()
for bit in sequence:
    prev_state = mealy_fsm._current
    mealy_fsm.step(bit)
    out = mealy_outputs.get((prev_state, bit), "")
    print(f"  {prev_state} --{bit}--> {mealy_fsm._current}  {out}")
```

## 使用場面

- **プロトコルパーサ**: TCP コネクション状態管理（CLOSED → SYN_SENT → ESTABLISHED → ...）
- **正規表現エンジン**: NFA/DFA による文字列マッチングの実装基盤
- **UI の状態管理**: ログイン状態・ウィザードのステップ管理・ゲームのシーン遷移
- **ハードウェア制御**: UART/SPI/I2C の送受信コントローラ、マイコンのボタンデバウンス
- **コンパイラの字句解析**: トークン認識に DFA を使用

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
