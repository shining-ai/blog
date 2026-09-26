---
sidebar_position: 5
displayed_sidebar: computerArchitectureSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# HDL 入門 (Hardware Description Language)

## HDL とは

HDL とは、

> ハードウェアの動作・構造をテキストで記述するための言語。Verilog と VHDL が業界の2大標準

です。
<br/>

ソフトウェアのプログラミング言語と異なり、回路は並列に動作するため、HDL の記述も並行処理を前提とします。
記述した HDL は論理合成ツールでゲートネットリストに変換され、FPGA や ASIC として実装されます。

## Verilog vs VHDL 比較

| 項目 | Verilog / SystemVerilog | VHDL |
| --- | --- | --- |
| 文法スタイル | C 言語に近い | Ada/Pascal に近い（冗長） |
| 型システム | 弱い型付け（net, reg） | 強い型付け（std_logic など） |
| シミュレーション | `$display`, `$monitor` | `report`, `assert` |
| 業界用途 | ASIC・IC 設計（米国・日本中心） | 防衛・航空宇宙（欧州・軍事系） |
| SystemVerilog | UVM による検証に広く採用 | VHDL-2019 で改善が進む |
| 学習コスト | 低め | 高め |

## Verilog の基本構文

```
モジュール定義:
  module <名前> (<ポートリスト>);
    input / output / inout  ポート宣言
    wire     組み合わせ回路の配線
    reg      順序回路のレジスタ（always内で代入）
  endmodule

always ブロック:
  always @(posedge clk)    クロック立ち上がりエッジで実行
  always @(*)              任意の入力変化で実行（組み合わせ回路）

ノンブロッキング代入 (<=):  クロックエッジでの順序更新に使用
ブロッキング代入 (=):       組み合わせ回路の計算に使用
```

## D フリップフロップ（Verilog）

```verilog title="D フリップフロップ（Verilog）"
// D フリップフロップ: 非同期リセット付き
module dff (
    input  wire clk,    // クロック
    input  wire rst_n,  // アクティブ Low 非同期リセット
    input  wire d,      // データ入力
    output reg  q       // データ出力
);
    // posedge: 立ち上がりエッジ, negedge: 立ち下がりエッジ
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n)
            q <= 1'b0;   // ノンブロッキング代入でリセット
        else
            q <= d;      // ノンブロッキング代入でラッチ
    end
endmodule
```

## 4bit カウンタ（Verilog）

```verilog title="4bit 同期カウンタ（Verilog）"
// 4ビット同期カウンタ（非同期リセット付き）
module counter4 (
    input  wire       clk,
    input  wire       rst_n,
    output reg  [3:0] count   // 4ビット出力
);
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n)
            count <= 4'd0;       // リセット
        else
            count <= count + 4'd1; // インクリメント（15の次は0に戻る）
    end
endmodule

// テストベンチ
module counter4_tb;
    reg        clk, rst_n;
    wire [3:0] count;

    // DUT（Design Under Test）のインスタンス化
    counter4 dut (.clk(clk), .rst_n(rst_n), .count(count));

    // クロック生成: 10ns 周期
    initial clk = 0;
    always #5 clk = ~clk;

    initial begin
        $monitor("time=%0t rst_n=%b count=%0d", $time, rst_n, count);
        rst_n = 0;
        #12 rst_n = 1;      // 12ns 後にリセット解除
        #200 $finish;       // 200ns 後にシミュレーション終了
    end
endmodule
```

## 実装

```python title="Python による FSM シミュレーション（HDL概念の検証）"
"""
HDL テストベンチの概念を Python で模擬したシミュレーション。
実際の HDL 検証には Cocotb（Python ベーステストベンチフレームワーク）を使用する。
"""
from dataclasses import dataclass

@dataclass
class Signal:
    """HDL の wire/reg に相当する信号"""
    name: str
    value: int = 0
    width: int = 1

    def assign(self, val: int):
        mask = (1 << self.width) - 1
        self.value = val & mask

    def __repr__(self):
        fmt = f"{{:0{self.width}b}}"
        return f"{self.name}={fmt.format(self.value)}"

class DFF:
    """D フリップフロップの Python モデル"""
    def __init__(self, name: str = "ff", width: int = 1):
        self.q   = Signal(f"{name}_q",   0, width)
        self._d  = 0

    def set_d(self, d: int):
        self._d = d

    def posedge_clk(self, rst_n: int = 1):
        if not rst_n:
            self.q.assign(0)
        else:
            self.q.assign(self._d)

class Counter4bit:
    """4ビット同期カウンタの Python モデル"""
    def __init__(self):
        self.count = Signal("count", 0, 4)

    def posedge_clk(self, rst_n: int = 1):
        if not rst_n:
            self.count.assign(0)
        else:
            self.count.assign(self.count.value + 1)

# D フリップフロップのシミュレーション
print("=== D フリップフロップ シミュレーション ===")
ff = DFF("dff1", width=1)
sequence = [(0, 1), (1, 1), (1, 1), (0, 1), (1, 1), (0, 0), (0, 1)]
for d, rst_n in sequence:
    ff.set_d(d)
    ff.posedge_clk(rst_n)
    print(f"  D={d} rst_n={rst_n} -> {ff.q}")

# 4ビットカウンタのシミュレーション
print("\n=== 4bit カウンタ シミュレーション ===")
counter = Counter4bit()
for t in range(20):
    rst_n = 0 if t < 2 else 1    # 最初の2クロックはリセット
    counter.posedge_clk(rst_n)
    binary = format(counter.count.value, "04b")
    print(f"  time={t:2d}ns rst_n={rst_n} count={counter.count.value:2d} ({binary})")

# Cocotb の使用例（概念コード）
COCOTB_EXAMPLE = """
# 実際の Cocotb テストベンチ（cocotb インストール後に使用可能）
import cocotb
from cocotb.clock import Clock
from cocotb.triggers import RisingEdge, Timer

@cocotb.test()
async def test_counter(dut):
    # 10ns 周期のクロックを生成
    cocotb.start_soon(Clock(dut.clk, 10, units="ns").start())
    dut.rst_n.value = 0
    await Timer(25, units="ns")
    dut.rst_n.value = 1
    for expected in range(16):
        await RisingEdge(dut.clk)
        assert dut.count.value == expected, f"Expected {expected}, got {dut.count.value}"
"""
print("\n=== Cocotb テストベンチの概念（実行不可）===")
print(COCOTB_EXAMPLE)
```

## 使用場面

- **FPGA 設計**: ザイリンクス（Xilinx/AMD）・インテル（Altera）FPGA への RTL 実装
- **ASIC 設計**: チップ製造向けのネットリスト生成。Synopsys Design Compiler などで合成
- **CPU の RTL 記述**: オープンソース CPU（RISC-V の Rocket Chip など）は Chisel/Verilog で記述
- **IP コア**: UART・SPI・AXI バスコントローラなどの再利用可能な回路ブロック

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
