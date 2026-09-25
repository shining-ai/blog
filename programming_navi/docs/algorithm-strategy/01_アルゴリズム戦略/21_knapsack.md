import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ナップサック問題 (Knapsack Problem)

## ナップサック問題とは

ナップサック問題とは、

> 重量制限のある袋に、価値と重量を持つアイテムを詰め込み**価値の合計を最大化する**問題

です。

組み合わせ最適化の代表的な問題であり、動的計画法（DP）の典型題です。

## バリエーション

| 種類 | 説明 | アルゴリズム |
| --- | --- | --- |
| 0/1 ナップサック | 各アイテムを最大1個使える | DP O(nW) |
| 分数ナップサック | アイテムを分割して使える | 貪欲法 O(n log n) |
| 無制限ナップサック | 各アイテムを何個でも使える | DP O(nW) |
| 個数制限ナップサック | 各アイテムに個数上限がある | DP + 二値化 |

## 0/1 ナップサック の DP

**状態定義**: `dp[w]` = 重量 `w` 以下で達成できる最大価値

重量が大きい方から更新することで、同じアイテムを2回使うのを防ぎます。

```
容量 W=5、アイテム: [(価値2,重量1), (価値3,重量2), (価値4,重量3)]

      w=  0  1  2  3  4  5
初期:     0  0  0  0  0  0
i=0:      0  2  2  2  2  2   ← (v=2, w=1) 追加
i=1:      0  2  3  5  5  5   ← (v=3, w=2) 追加
i=2:      0  2  3  5  6  7   ← (v=4, w=3) 追加

最大価値: dp[5] = 7
```

## 計算量

| バリエーション | 時間 | 空間 |
| --- | --- | --- |
| 0/1 ナップサック | O(nW) | O(W) |
| 無制限ナップサック | O(nW) | O(W) |
| 分数ナップサック | O(n log n) | O(1) |

※ 0/1 ナップサックは NP 困難（W が多項式サイズでないと擬多項式時間）

## 実装

```python title="0/1 ナップサック"
def knapsack_01(capacity: int, weights: list[int], values: list[int]) -> int:
    """
    capacity: 重量の上限
    weights[i], values[i]: i番目アイテムの重量・価値
    """
    dp = [0] * (capacity + 1)

    for w, v in zip(weights, values):
        # 後ろから更新（同じアイテムを2回使わないため）
        for cap in range(capacity, w - 1, -1):
            dp[cap] = max(dp[cap], dp[cap - w] + v)

    return dp[capacity]
```

```python title="無制限ナップサック（アイテムを何度でも使える）"
def knapsack_unbounded(capacity: int, weights: list[int], values: list[int]) -> int:
    dp = [0] * (capacity + 1)

    for cap in range(1, capacity + 1):
        for w, v in zip(weights, values):
            if w <= cap:
                dp[cap] = max(dp[cap], dp[cap - w] + v)

    return dp[capacity]
```

```python title="使用例"
weights = [1, 2, 3]
values  = [2, 3, 4]
print(knapsack_01(5, weights, values))         # 7
print(knapsack_unbounded(5, weights, values))  # 10 (重量1のアイテムを5個)
```

```python title="選んだアイテムを復元する"
def knapsack_with_trace(capacity: int, weights: list[int], values: list[int]):
    n = len(weights)
    dp = [[0] * (capacity + 1) for _ in range(n + 1)]

    for i in range(1, n + 1):
        w, v = weights[i - 1], values[i - 1]
        for cap in range(capacity + 1):
            dp[i][cap] = dp[i - 1][cap]
            if cap >= w:
                dp[i][cap] = max(dp[i][cap], dp[i - 1][cap - w] + v)

    # 復元
    selected = []
    cap = capacity
    for i in range(n, 0, -1):
        if dp[i][cap] != dp[i - 1][cap]:
            selected.append(i - 1)
            cap -= weights[i - 1]

    return dp[n][capacity], selected[::-1]

value, items = knapsack_with_trace(5, [1,2,3], [2,3,4])
print(value, items)  # 7 [1, 2]  (重量2と3のアイテム)
```

## 使用場面

- **リソース割り当て**: 予算内での投資組み合わせ最適化
- **荷物の積み込み**: 輸送コスト最小化
- **競技プログラミング**: DP の最頻出問題の一つ

## 参考文献

<AffiliateBanner site="tessoku" />
<AffiliateBanner site="antbook" />
