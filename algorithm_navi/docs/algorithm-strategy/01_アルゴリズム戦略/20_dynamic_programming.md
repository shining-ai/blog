import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 動的計画法 (Dynamic Programming)

## 動的計画法とは

動的計画法（DP）とは、

> **重複する部分問題**を持ち、**最適部分構造**を満たす問題に対して、計算結果をメモ化（記憶）しながら効率的に解くアルゴリズム設計戦略

です。

「同じ計算を繰り返さない」ことで指数時間を多項式時間に削減できます。

## 2つのアプローチ

```
トップダウン（メモ化再帰）:
  再帰でサブ問題を解き、結果をキャッシュする
  計算済みならキャッシュを返す → 再計算を防ぐ

ボトムアップ（テーブル法）:
  小さい問題から順に解いてテーブルを埋める
  ループで全サブ問題を反復的に処理する
```

## DP が適用できる 2 条件

| 条件 | 説明 |
| --- | --- |
| 最適部分構造 | 問題の最適解が部分問題の最適解から構成できる |
| 重複する部分問題 | 同じ部分問題が繰り返し現れる |

分割統治法は部分問題が独立しているのに対し、DP は重複する部分問題を持つ。

## 代表的な問題

### フィボナッチ数列

```
素朴な再帰（指数時間）:      DP（線形時間）:
  fib(5)                     dp[0] = 0
  ├─ fib(4)                  dp[1] = 1
  │  ├─ fib(3)               dp[2] = 1
  │  │  ├─ fib(2) ← 重複    dp[3] = 2
  │  │  └─ fib(1)            dp[4] = 3
  │  └─ fib(2) ← 重複        dp[5] = 5
  └─ fib(3) ← 重複
```

### 0/1 ナップサック問題

```
容量 W=5、アイテム: [(価値2,重量1), (価値3,重量2), (価値4,重量3)]

dp[i][w] = i 番目まで考慮し容量 w 以下での最大価値

      w=  0  1  2  3  4  5
  i=0:    0  0  0  0  0  0
  i=1:    0  2  2  2  2  2    ← (価値2,重量1)
  i=2:    0  2  3  5  5  5    ← (価値3,重量2)
  i=3:    0  2  3  5  6  7    ← (価値4,重量3)

最大価値: dp[3][5] = 7
```

### 最長共通部分列 (LCS)

```
X = "ABCBDAB"
Y = "BDCAB"

dp[i][j] = X[0..i-1] と Y[0..j-1] の LCS 長

      ""  B  D  C  A  B
  "": 0   0  0  0  0  0
  A:  0   0  0  0  1  1
  B:  0   1  1  1  1  2
  C:  0   1  1  2  2  2
  B:  0   1  1  2  2  3
  D:  0   1  2  2  2  3
  A:  0   1  2  2  3  3
  B:  0   1  2  2  3  4

LCS 長: 4 ("BCAB")
```

## 計算量

| 問題 | 時間 | 空間 |
| --- | --- | --- |
| フィボナッチ | O(n) | O(1)（最適化後） |
| 0/1ナップサック | O(nW) | O(W)（ローリング配列） |
| 最長共通部分列 | O(nm) | O(nm) |
| 最長増加部分列 | O(n log n) | O(n) |
| 編集距離 | O(nm) | O(nm) |
| 行列積順序 | O(n³) | O(n²) |
| Bellman-Ford | O(VE) | O(V) |

## 実装

```python title="フィボナッチ（メモ化再帰）"
from functools import lru_cache

@lru_cache(maxsize=None)
def fib(n: int) -> int:
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)
```

```python title="0/1ナップサック問題"
def knapsack(capacity: int, weights: list[int], values: list[int]) -> int:
    dp = [0] * (capacity + 1)

    for i in range(len(weights)):
        # 後ろから更新（同じアイテムを2回使わないため）
        for w in range(capacity, weights[i] - 1, -1):
            dp[w] = max(dp[w], dp[w - weights[i]] + values[i])

    return dp[capacity]
```

```python title="最長共通部分列 (LCS)"
def lcs(X: str, Y: str) -> int:
    m, n = len(X), len(Y)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if X[i - 1] == Y[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])

    return dp[m][n]
```

```python title="編集距離 (Edit Distance)"
def edit_distance(s: str, t: str) -> int:
    m, n = len(s), len(t)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    for i in range(m + 1): dp[i][0] = i
    for j in range(n + 1): dp[0][j] = j

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if s[i - 1] == t[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(
                    dp[i - 1][j],      # 削除
                    dp[i][j - 1],      # 挿入
                    dp[i - 1][j - 1]   # 置換
                )

    return dp[m][n]
```

## 3手法の比較

| 手法 | 部分問題 | 再計算 | 適用条件 |
| --- | --- | --- | --- |
| 分割統治法 | 独立 | あり | 部分問題が独立 |
| 動的計画法 | 重複 | なし（メモ化） | 重複部分問題 + 最適部分構造 |
| 貪欲法 | — | — | 貪欲選択性 + 最適部分構造 |

## 使用場面

- **最適化**: ナップサック・割り当て問題
- **文字列処理**: LCS・編集距離・正規表現マッチング
- **グラフ**: 最短経路（Bellman-Ford・Floyd-Warshall）
- **区間問題**: 行列積の順序・区間スケジューリング
- **競技プログラミング**: 頻出テーマ

## 参考文献

<AffiliateBanner site="antbook" />
