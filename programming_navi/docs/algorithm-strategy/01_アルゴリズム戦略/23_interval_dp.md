import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 区間 DP（Interval DP）

## 区間 DP とは

区間 DP とは、

> **区間 [l, r] に関する最適値**を、より小さい区間の最適値から求める動的計画法

です。

「区間を分割する点 k を全探索する」というパターンが典型的です。

## 基本パターン

```
dp[l][r] = min/max over k in [l, r-1] of:
             dp[l][k] + dp[k+1][r] + cost(l, k, r)
```

- **ループ順**: 区間の長さが短い順に計算する（長さ 1 → 2 → ... → n）

## 典型問題: 石の分割（区間を分割するコスト最小化）

```
石: [3, 2, 4, 1]  石の重さ
操作: 隣り合う石を合体させる。コスト = 合体後の重さ
全部合体させる最小コストは？

dp[i][j] = 石 i〜j を1つにまとめる最小コスト
sum[i][j] = 石 i〜j の重さの合計

dp[0][3] = min over k:
  k=0: dp[0][0] + dp[1][3] + sum[0][3] = 0 + dp[1][3] + 10
  k=1: dp[0][1] + dp[2][3] + sum[0][3] = 5 + 5  + 10 = 20
  k=2: dp[0][2] + dp[3][3] + sum[0][3] = dp[0][2] + 0 + 10
```

## 計算量

| | 計算量 |
| --- | --- |
| 時間 | O(n³)（区間 O(n²) × 分割点 O(n)） |
| 空間 | O(n²) |

## 実装

```python title="石の分割問題（区間の合体コスト最小化）"
def min_merge_cost(stones: list[int]) -> int:
    n = len(stones)
    # 累積和
    prefix = [0] * (n + 1)
    for i, s in enumerate(stones):
        prefix[i + 1] = prefix[i] + s

    def range_sum(l, r):
        return prefix[r + 1] - prefix[l]

    INF = float('inf')
    dp = [[0] * n for _ in range(n)]

    # 区間長 2 以上について計算
    for length in range(2, n + 1):          # 区間の長さ
        for l in range(n - length + 1):     # 左端
            r = l + length - 1              # 右端
            dp[l][r] = INF
            for k in range(l, r):           # 分割点
                cost = dp[l][k] + dp[k + 1][r] + range_sum(l, r)
                dp[l][r] = min(dp[l][r], cost)

    return dp[0][n - 1]
```

```python title="使用例"
print(min_merge_cost([3, 2, 4, 1]))  # 26
```

```python title="行列積の順序問題（括弧の付け方）"
def matrix_chain_order(dims: list[int]) -> int:
    """
    dims: 行列のサイズリスト
    dims[i] × dims[i+1] の行列が n 個あるとき、全積のスカラー乗算回数を最小化
    """
    n = len(dims) - 1  # 行列の数
    INF = float('inf')
    dp = [[0] * n for _ in range(n)]

    for length in range(2, n + 1):
        for l in range(n - length + 1):
            r = l + length - 1
            dp[l][r] = INF
            for k in range(l, r):
                cost = dp[l][k] + dp[k + 1][r] + dims[l] * dims[k + 1] * dims[r + 1]
                dp[l][r] = min(dp[l][r], cost)

    return dp[0][n - 1]

# 行列: (30×35), (35×15), (15×5), (5×10)
print(matrix_chain_order([30, 35, 15, 5, 10]))  # 15125
```

## ループ順のポイント

区間 DP は**区間の長さが短い順**に計算することが重要です。

```python title="ループ順の例"
# 正しい：長さ 1 → n の順に計算
for length in range(2, n + 1):
    for l in range(n - length + 1):
        r = l + length - 1
        # dp[l][r] を計算（dp[l][k] と dp[k+1][r] はすでに計算済み）
```

## 使用場面

- **行列積の順序問題**: 最小スカラー乗算回数
- **石・木の分割/合体**: 区間の合体コスト最小化
- **括弧の付け方**: 式の計算順序最適化
- **回文分割**: 文字列を回文に分割する最小分割数

## 参考文献

<AffiliateBanner site="tessoku" />
<AffiliateBanner site="antbook" />
