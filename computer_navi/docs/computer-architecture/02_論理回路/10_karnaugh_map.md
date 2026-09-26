---
sidebar_position: 1
displayed_sidebar: computerArchitectureSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# カルノー図 (Karnaugh Map)

## カルノー図とは

カルノー図とは、

> 真理値表をグリッド状に配置し、隣接する1のセルをグループ化することで論理式を視覚的に最小化する手法

です。
<br/>

モーリス・カルノーが1953年に考案しました。
2〜4変数の論理式を手作業で最小化するのに適しており、2のべき乗個のセルをまとめることで項数を削減します。

## カルノー図の構造


```
      B=0  B=1
A=0 |  m0 | m1 |
A=1 |  m2 | m3 |
```

4変数（A,B,C,D）のカルノー図：グレイコード順で配置（隣り合う列/行は1ビットだけ異なる）

```
        CD=00  CD=01  CD=11  CD=10
AB=00 |   0  |   1  |   3  |   2  |
AB=01 |   4  |   5  |   7  |   6  |
AB=11 |  12  |  13  |  15  |  14  |
AB=10 |   8  |   9  |  11  |  10  |
```

## グループ化のルール

| グループサイズ | 削減効果 |
| --- | --- |
| 1セル | 項を変更なし（最小化なし） |
| 2セル | 1変数削減 |
| 4セル | 2変数削減 |
| 8セル | 3変数削減 |
| 16セル（4変数全て） | 定数1 |

- グループは **2のべき乗個** のセルで構成
- できる限り**大きなグループ**を作る
- グループは**重複して良い**
- グループは**端で折り返せる**（トーラス状）

## 実装

```python title="カルノー図の最小化（Python）"
from itertools import combinations

def karnaugh_minimize_sop(minterms: list[int], dont_cares: list[int], vars_count: int) -> list[str]:
    """
    最小積和形（SOP: Sum of Products）を求める簡易実装
    minterms: 1となる項のインデックスリスト
    dont_cares: ドントケアのインデックスリスト
    vars_count: 変数の数（2〜4）
    """
    var_names = ['A', 'B', 'C', 'D'][:vars_count]
    all_ones = set(minterms) | set(dont_cares)

    def covers(implicant: tuple, minterm: int) -> bool:
        """インプリカントがミンタームを包含するか"""
        mask, value = implicant
        return (minterm & mask) == value

    def combine(a: tuple, b: tuple):
        """2つのインプリカントを結合できれば結合後を返す"""
        mask_a, val_a = a
        mask_b, val_b = b
        if mask_a != mask_b:
            return None
        diff = val_a ^ val_b
        if diff == 0 or (diff & (diff - 1)) != 0:
            return None  # 1ビットだけ異なる場合のみ
        return (mask_a & ~diff, val_a & ~diff)

    # 初期インプリカント
    implicants = {((1 << vars_count) - 1, m) for m in all_ones}
    prime_implicants = set()

    while implicants:
        combined = set()
        new_implicants = set()
        for a, b in combinations(implicants, 2):
            c = combine(a, b)
            if c:
                new_implicants.add(c)
                combined.add(a)
                combined.add(b)
        prime_implicants |= implicants - combined
        implicants = new_implicants

    # 必須主項選択（Essential Prime Implicants）
    essential = []
    covered = set()
    for minterm in minterms:
        covering = [pi for pi in prime_implicants if covers(pi, minterm)]
        if len(covering) == 1:
            pi = covering[0]
            if pi not in essential:
                essential.append(pi)
                covered |= {m for m in minterms if covers(pi, m)}

    # 残りのミンタームをカバー（貪欲）
    remaining = set(minterms) - covered
    while remaining:
        best = max(prime_implicants - set(essential),
                   key=lambda pi: len([m for m in remaining if covers(pi, m)]))
        essential.append(best)
        remaining -= {m for m in remaining if covers(best, m)}

    # 論理式の文字列化
    terms = []
    for mask, value in essential:
        literals = []
        for i, name in enumerate(reversed(var_names)):
            bit = 1 << i
            if mask & bit:
                literals.append(name if value & bit else f"¬{name}")
        terms.append(''.join(literals) if literals else '1')
    return terms


# 例: F(A,B,C,D) = Σm(0,1,3,7,8,9,11,15)
minterms = [0, 1, 3, 7, 8, 9, 11, 15]
result = karnaugh_minimize_sop(minterms, [], 4)
print("最小積和形:", " + ".join(result))
```

## 使用場面

- **デジタル回路設計**: 組み合わせ回路のゲート数削減
- **PLC プログラミング**: ラダー図の最適化
- **FPGA 設計**: LUT（ルックアップテーブル）の最適化
- **コンパイラ最適化**: 条件式の簡略化

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
