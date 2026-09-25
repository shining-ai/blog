import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 並列前置和 (Parallel Prefix Sum / Scan)

## 並列前置和とは

並列前置和（Parallel Prefix Sum / Scan）とは、

> 配列 [a₀, a₁, ..., aₙ₋₁] に対して、各要素の累積和 [a₀, a₀+a₁, ..., a₀+...+aₙ₋₁] を並列に計算するアルゴリズム

です。
<br/>

逐次計算は O(n) ステップですが、並列化により O(log n) ステップで計算できます。GPU・SIMD命令との相性が抜群で、多くの並列アルゴリズムの基盤として使われます。

## 逐次 vs 並列の比較

```
入力: [3, 1, 4, 1, 5, 9, 2, 6]

逐次（O(n) ステップ・直列）:
  i=0: 3
  i=1: 3+1  = 4
  i=2: 4+4  = 8
  i=3: 8+1  = 9
  ...
  結果: [3, 4, 8, 9, 14, 23, 25, 31]

並列ヒルリス-スティール（O(log n) ステップ・n コア）:
  Step 1 (stride=1): 各要素が1つ前と加算
  Step 2 (stride=2): 各要素が2つ前と加算
  Step 3 (stride=4): 各要素が4つ前と加算
  → log₂(8) = 3 ステップで完了
```

## Hillis-Steele Scan（包含スキャン）

```
入力: [3, 1, 4, 1, 5, 9, 2, 6]
       0  1  2  3  4  5  6  7

Step 1 (stride=1): a[i] += a[i-1]  (i>=1)
  [3, 4, 5, 5, 6,10,11, 8]

Step 2 (stride=2): a[i] += a[i-2]  (i>=2)
  [3, 4, 8, 9,11,15,17,18]

Step 3 (stride=4): a[i] += a[i-4]  (i>=4)
  [3, 4, 8, 9,14,19,25,27]

                          ↑ ×（最後が31でないため除外スキャンが必要）

ワーク量: O(n log n)（ワーク非効率）
ステップ数: O(log n)
```

## Blelloch Scan（work-efficient・除外スキャン）

```
入力: [3, 1, 4, 1, 5, 9, 2, 6]

フェーズ1: Up-sweep（reduce）
  └─ 部分和ツリーを構築

         [31]
        /    \
     [8]      [23]
    /   \    /   \
  [4]  [4] [14] [9]     ← 各ノード = 葉の合計
  / \ / \  / \ / \
 3  1 4  1 5  9 2  6

フェーズ2: Down-sweep
  └─ ルートを 0 に設定し下に伝播

         [0]
        /    \
     [0]      [8]
    /   \    /   \
  [0]  [4] [8]  [22]
  / \ / \  / \ / \
 0  3 4  8 9 14 23 25

結果（除外スキャン）: [0, 3, 4, 8, 9, 14, 23, 25]
包含スキャンへ変換:   [3, 4, 8, 9,14, 23, 25, 31]

ワーク量: O(n)（ワーク効率的）
ステップ数: O(log n)
```

## 計算量

| アルゴリズム | ステップ数 | ワーク量 | 特徴 |
| --- | --- | --- | --- |
| 逐次スキャン | O(n) | O(n) | 単純・直列 |
| Hillis-Steele | O(log n) | O(n log n) | ワーク非効率 |
| Blelloch | O(log n) | O(n) | ワーク効率的・推奨 |

> **ワーク量**: 全プロセッサの演算回数の合計。ワーク量が O(n) なら、シリアルと同等の総演算量で並列化できる。

## 実装

```python title="逐次前置和"
def prefix_sum(arr: list[int]) -> list[int]:
    """逐次前置和（inclusive scan）"""
    result = [0] * len(arr)
    running = 0
    for i, x in enumerate(arr):
        running += x
        result[i] = running
    return result

print(prefix_sum([3, 1, 4, 1, 5, 9, 2, 6]))
# [3, 4, 8, 9, 14, 23, 25, 31]
```

```python title="Hillis-Steele scan（逐次シミュレーション）"
def hillis_steele_scan(arr: list[int]) -> list[int]:
    """
    Hillis-Steele parallel prefix sum simulation
    ワーク量 O(n log n)・ステップ数 O(log n)
    """
    n = len(arr)
    a = arr[:]
    stride = 1
    while stride < n:
        b = a[:]
        for i in range(stride, n):
            b[i] = a[i] + a[i - stride]
        a = b
        stride *= 2
    return a

print(hillis_steele_scan([3, 1, 4, 1, 5, 9, 2, 6]))
# [3, 4, 8, 9, 14, 23, 25, 31]
```

```python title="Blelloch scan（work-efficient・除外スキャン）"
def blelloch_scan(arr: list[int]) -> list[int]:
    """
    Blelloch parallel prefix sum (exclusive scan)
    ワーク量 O(n)・ステップ数 O(log n)
    n は 2 の冪乗を想定
    """
    n = len(arr)
    a = arr[:]

    # Up-sweep（reduce フェーズ）
    stride = 1
    while stride < n:
        for i in range(n - 1, -1, -(stride * 2)):
            if i >= stride:
                a[i] += a[i - stride]
        stride *= 2

    # ルートに 0 をセット
    a[n - 1] = 0

    # Down-sweep フェーズ
    stride = n // 2
    while stride >= 1:
        for i in range(n - 1, -1, -(stride * 2)):
            if i >= stride:
                left = a[i - stride]
                a[i - stride] = a[i]
                a[i] = left + a[i]
        stride //= 2

    return a  # exclusive scan

def inclusive_scan(arr: list[int]) -> list[int]:
    """Blelloch の exclusive → inclusive 変換"""
    exc = blelloch_scan(arr)
    return [exc[i] + arr[i] for i in range(len(arr))]

print(blelloch_scan([3, 1, 4, 1, 5, 9, 2, 6]))
# [0, 3, 4, 8, 9, 14, 23, 25]  ← exclusive
print(inclusive_scan([3, 1, 4, 1, 5, 9, 2, 6]))
# [3, 4, 8, 9, 14, 23, 25, 31] ← inclusive
```

```python title="NumPy での高速前置和"
import numpy as np

arr = np.array([3, 1, 4, 1, 5, 9, 2, 6])

# inclusive scan
print(np.cumsum(arr))
# [3  4  8  9 14 23 25 31]

# exclusive scan
print(np.concatenate([[0], np.cumsum(arr)[:-1]]))
# [0  3  4  8  9 14 23 25]

# 大規模データ（NumPy は内部でベクトル化）
big = np.random.randint(0, 100, size=10_000_000)
result = np.cumsum(big)
```

```python title="前置和の応用：区間和クエリ"
def range_sum_query(arr: list[int]):
    """
    前置和で区間和を O(1) で回答
    prefix[r] - prefix[l-1] = sum(arr[l..r])
    """
    n = len(arr)
    prefix = [0] * (n + 1)
    for i in range(n):
        prefix[i + 1] = prefix[i] + arr[i]

    def query(l: int, r: int) -> int:
        """arr[l..r] の合計（0-indexed, inclusive）"""
        return prefix[r + 1] - prefix[l]

    return query

arr = [3, 1, 4, 1, 5, 9, 2, 6]
query = range_sum_query(arr)
print(query(1, 4))  # 11 = 1+4+1+5
print(query(0, 7))  # 31 = 全要素
```

## 応用例

```
前置和を利用するアルゴリズム:

  ┌─────────────────────────────────────────┐
  │ 区間和クエリ  → prefix[r] - prefix[l-1] │
  │ 並列ソート    → ランクの累積和           │
  │ ストリーム圧縮→ 条件を満たす要素の抽出  │
  │ BFS 並列化   → 各頂点の子の開始位置      │
  │ ヒストグラム  → 累積分布関数（CDF）      │
  └─────────────────────────────────────────┘
```

## 使用場面

- **GPU プログラミング**: CUDA/OpenCL での parallel reduction の基盤
- **区間クエリ**: セグメント木の代替（静的配列なら前置和で十分）
- **Stream Compaction**: 条件を満たす要素だけを並列で抽出
- **並列ソート**: 基数ソートの桁ごとの位置計算

## 参考文献

<AffiliateBanner site="antbook" />
