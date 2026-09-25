import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 貪欲法 (Greedy Algorithm)

## 貪欲法とは

貪欲法とは、

> 各ステップで**局所的に最適な選択**を行い続けることで、最終的に大域的最適解（または良い近似解）を得るアルゴリズム設計戦略

です。

「今この瞬間に最善の選択をし続ける」という方針で、後戻りをしません。動的計画法より単純で高速ですが、すべての問題で最適解を保証するわけではありません。

## 貪欲法が最適解を保証する2条件

### 1. 貪欲選択性 (Greedy Choice Property)

> 局所最適な選択が全体最適解の一部になっている

「今の最善選択」が後悔なく将来の解に組み込める。

### 2. 最適部分構造 (Optimal Substructure)

> 問題の最適解が、部分問題の最適解から構成できる

## 代表的なアルゴリズム

```
貪欲法で最適解が得られる問題:
  ・Kruskal法      → 辺コストの小さい順に選択
  ・Prim法         → 最小コスト辺を順に拡張
  ・Dijkstra法     → 暫定距離が最小のノードを確定
  ・Huffman符号化  → 頻度が最小の2ノードを結合
  ・区間スケジューリング → 終了時刻が早い順に選択
```

## 具体例

### 区間スケジューリング

```
問題: 重なり合う区間から最大個数の区間を選ぶ

区間:
  A: [1, 4)
  B: [3, 5)
  C: [0, 6)
  D: [5, 7)
  E: [3, 9)
  F: [6, 10)

貪欲戦略: 終了時刻が早い順に選ぶ

  STEP 1: A [1,4) → 終了時刻 4 が最小 → 選択 ✓
  STEP 2: B [3,5) → A と重なる         → スキップ
  STEP 3: C [0,6) → A と重なる         → スキップ
  STEP 4: D [5,7) → A と重ならない     → 選択 ✓
  STEP 5: F [6,10) → D と重なる        → スキップ

選択: A, D → 最大 2 区間（最適解）
```

### Huffman符号化

```
文字の出現頻度:
  A:5  B:2  C:1  D:3  E:4

STEP 1: 最小 C(1) + B(2) → CB(3)
STEP 2: 最小 CB(3) + D(3) → CBD(6)
STEP 3: 最小 E(4) + A(5)  → EA(9)
STEP 4: CBD(6) + EA(9)    → root(15)

符号:  A=11 (2bit)  E=10 (2bit)
       D=010 (3bit) B=011 (3bit) C=000 (3bit)
```

## 計算量

| アルゴリズム | 計算量 | 貪欲戦略 |
| --- | --- | --- |
| 区間スケジューリング | O(n log n) | 終了時刻の早い順 |
| Kruskal法 | O(E log E) | 辺コストの小さい順 |
| Dijkstra法 | O((V+E) log V) | 最小暫定距離のノード |
| Huffman符号化 | O(n log n) | 頻度の小さい順 |

## 実装

```python title="区間スケジューリング"
def activity_selection(intervals: list[tuple]) -> list[tuple]:
    """重なり合わない区間の最大部分集合を返す"""
    sorted_ivs = sorted(intervals, key=lambda x: x[1])   # 終了時刻でソート

    selected = [sorted_ivs[0]]
    last_end = sorted_ivs[0][1]

    for start, end in sorted_ivs[1:]:
        if start >= last_end:          # 重なっていない
            selected.append((start, end))
            last_end = end

    return selected
```

```python title="Huffman符号化"
import heapq
from collections import defaultdict

def huffman_encoding(text: str) -> dict[str, str]:
    freq = defaultdict(int)
    for ch in text:
        freq[ch] += 1

    heap = [[w, [c, ""]] for c, w in freq.items()]
    heapq.heapify(heap)

    while len(heap) > 1:
        lo = heapq.heappop(heap)
        hi = heapq.heappop(heap)
        for pair in lo[1:]: pair[1] = '0' + pair[1]
        for pair in hi[1:]: pair[1] = '1' + pair[1]
        heapq.heappush(heap, [lo[0] + hi[0]] + lo[1:] + hi[1:])

    return {char: code for char, code in heapq.heappop(heap)[1:]}
```

```python title="コイン問題（正準体系のみ最適）"
def coin_change_greedy(amount: int, coins: list[int]) -> list[int]:
    coins.sort(reverse=True)
    result = []
    for coin in coins:
        while amount >= coin:
            result.append(coin)
            amount -= coin
    return result
```

## 貪欲法が失敗する例

```
コイン問題（非正準コイン体系）:
  coins = [1, 3, 4]
  amount = 6

  貪欲法:  4 → 1 → 1 → 3枚  [4, 1, 1]
  最適解:  3 → 3     → 2枚  [3, 3]

→ 動的計画法が必要

0/1 ナップサック:
  価値/重量比で選んでも最適解を得られるとは限らない
  → 動的計画法が必要
```

## 使用場面

- **最小全域木**: Kruskal・Prim アルゴリズム
- **最短経路**: Dijkstra（非負辺）
- **データ圧縮**: Huffman符号化
- **スケジューリング**: 区間スケジューリング・締切付きタスク
- **分数ナップサック**: 価値/重量比の降順選択

## 参考文献

<AffiliateBanner site="antbook" />
