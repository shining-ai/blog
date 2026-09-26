import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 近似アルゴリズム (Approximation Algorithm)

## 近似アルゴリズムとは

近似アルゴリズムとは、

> **NP 困難問題**に対して、最適解の保証付き近似解を**多項式時間**で求めるアルゴリズム設計戦略

です。

NP 困難問題は現実的な時間で最適解を求めることが困難なため、「最適解に近い解で十分」という実用的な妥協点として近似アルゴリズムを使います。

## 近似率（Approximation Ratio）

```
近似率 ρ（ρ ≥ 1）:

  ρ = max(ALG / OPT, OPT / ALG)

  ALG : 近似アルゴリズムが返す解のコスト
  OPT : 最適解のコスト

  ρ = 1   → 最適解（達成できれば P = NP）
  ρ = 2   → 最適解の 2 倍以内
  ρ = 1.5 → 最適解の 1.5 倍以内
```

## 代表的なアルゴリズム

### 頂点被覆（2-近似）

```
問題: すべての辺を被覆する最小の頂点集合を求める

アルゴリズム（2-近似）:
  STEP 1: 任意の辺 (u, v) を選ぶ
  STEP 2: u と v を被覆集合に追加
  STEP 3: u と v に接続するすべての辺を削除
  STEP 4: 辺がなくなるまで繰り返す

なぜ 2-近似か:
  選んだ辺の集合はマッチングを形成する
  最適解はそのマッチングの各辺を少なくとも 1 頂点で被覆する
  → OPT ≥ |マッチング|
  → ALG = 2|マッチング| ≤ 2 × OPT
```

### 集合被覆（O(log n)-近似）

```
問題: 全要素を被覆する集合の最小個数を求める

貪欲アルゴリズム:
  STEP 1: 最も多くの未被覆要素を含む集合を選ぶ
  STEP 2: 選んだ集合の要素を被覆済みにする
  STEP 3: 全要素が被覆されるまで繰り返す

近似率: O(log n)
```

### 巡回セールスマン問題（1.5-近似, Christofides）

```
問題: すべての都市を1回ずつ訪問する最短ルートを求める

Christofides アルゴリズム（三角不等式を満たす場合）:
  STEP 1: 最小全域木 T を構築       O(E log V)
  STEP 2: T の奇数次数頂点に最小重みマッチング M  O(V³)
  STEP 3: T + M でオイラー路を求める
  STEP 4: 重複訪問を省略（近道）→ ハミルトン路

  近似率: 1.5（三角不等式が成立する場合）
```

## 近似スキーム

| 種類 | 説明 | 近似率 |
| --- | --- | --- |
| PTAS | 任意の ε > 0 で (1+ε)-近似 | (1+ε)（ε に依存） |
| FPTAS | PTAS かつ ε の多項式時間 | (1+ε)（完全多項式） |
| 定数近似 | 固定の定数 ρ で近似 | 定数 |
| 対数近似 | O(log n) で近似 | O(log n) |

## 計算量と近似率のトレードオフ

| 問題 | 近似率 | 計算量 |
| --- | --- | --- |
| 頂点被覆 | 2 | O(V + E) |
| 集合被覆 | O(log n) | O(n × \|S\|) |
| TSP（三角不等式） | 1.5 | O(V³) |
| ナップサック | (1+ε) | O(n/ε) [FPTAS] |
| MAX-SAT | 7/8 | O(n) |

## 実装

```python title="頂点被覆（2-近似）"
def vertex_cover_approx(graph: dict[int, list[int]]) -> set[int]:
    """2-近似アルゴリズムによる頂点被覆"""
    cover = set()
    visited_edges = set()

    for u in graph:
        for v in graph[u]:
            edge = (min(u, v), max(u, v))
            if edge not in visited_edges:
                cover.add(u)
                cover.add(v)
                visited_edges.add(edge)

    return cover
```

```python title="集合被覆（貪欲・O(log n)-近似）"
def set_cover_greedy(universe: set, subsets: list[set]) -> list[int]:
    """貪欲法による集合被覆（選んだ集合のインデックスを返す）"""
    covered = set()
    selected = []

    while covered != universe:
        # 最も多くの未被覆要素を含む集合を選ぶ
        best_idx = max(
            range(len(subsets)),
            key=lambda i: len(subsets[i] - covered)
        )
        if not subsets[best_idx] - covered:
            break   # これ以上被覆できない
        covered |= subsets[best_idx]
        selected.append(best_idx)

    return selected
```

```python title="ナップサック FPTAS"
def knapsack_fptas(capacity: int, weights: list[int],
                   values: list[int], epsilon: float) -> int:
    """(1+ε)-近似アルゴリズム"""
    n = len(values)
    max_val = max(values)
    K = epsilon * max_val / n          # スケーリング係数

    # 価値をスケールダウン
    scaled = [int(v / K) for v in values]

    # スケール後のDPで解く
    max_scaled = sum(scaled)
    dp = [float('inf')] * (max_scaled + 1)
    dp[0] = 0

    for i in range(n):
        for v in range(max_scaled, scaled[i] - 1, -1):
            if dp[v - scaled[i]] + weights[i] <= capacity:
                dp[v] = min(dp[v], dp[v - scaled[i]] + weights[i])

    for v in range(max_scaled, -1, -1):
        if dp[v] <= capacity:
            return v * K   # スケールを戻す
    return 0
```

## 使用場面

- **NP 困難問題の実用的解法**: TSP・ナップサック・スケジューリング
- **ネットワーク設計**: 集合被覆・頂点被覆
- **クラスタリング**: k-means・k-center（2-近似）
- **MAX-SAT**: SATソルバーの近似版
- **ルーティング最適化**: 配送計画・資源配分

## 参考文献

<AffiliateBanner site="antbook" />
