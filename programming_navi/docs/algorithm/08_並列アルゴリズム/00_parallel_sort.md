import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 並列ソート (Parallel Sort)

## 並列ソートとは

並列ソートとは、

> 複数のプロセッサ・スレッドが同時に比較・交換を行うことで、逐次ソートより高速にデータを整列するアルゴリズム群

です。
<br/>

逐次ソートの下限 O(n log n) を並列化によって O(log² n) 〜 O(log n) ステップに短縮できます。

## 並列計算モデル

```
PRAM モデル（並列 RAM）の概念:

   P0   P1   P2   P3   ← プロセッサ（同時動作）
    |    |    |    |
  ──────────────────── ← 共有メモリ
    0    1    2    3   ← 配列インデックス

1 ステップ = 全プロセッサが同時に1命令実行
```

## バイトニックソート

バイトニック列（一度だけ増加→減少する列）を再帰的にマージするソートです。

```
n=8 の例（比較器ネットワーク）:

Step 1: 隣接ペアをソート
  [3,7] [1,5] [4,8] [2,6]  → 各ペア内でソート

Step 2: バイトニックマージ（長さ4）
  ↑ 昇順   ↓ 降順    ↑ 昇順   ↓ 降順
  [1,3,5,7] ↓  [2,4,6,8] → ↑マージ

Step 3: バイトニックマージ（長さ8）
  全体を昇順にマージ

総ステップ数: log₂(n) × (log₂(n)+1) / 2 = O(log² n)
```

## 奇偶転置ソート (Odd-Even Transposition Sort)

隣接要素の比較交換を奇数フェーズ・偶数フェーズ交互に繰り返すソートです。

```
n=6 の場合:

初期: [5, 3, 6, 1, 4, 2]
       0  1  2  3  4  5

奇数フェーズ（インデックス 1-2, 3-4 を比較）:
  [5, 3, 6, 1, 4, 2]
      ↕      ↕
  [5, 3, 1, 6, 2, 4]  ← (3,6)→(3,6) 変化なし, (1,4)→(1,4)

偶数フェーズ（インデックス 0-1, 2-3, 4-5 を比較）:
  [3, 5, 1, 6, 2, 4]  ← 各ペア比較交換

n 回繰り返すと完全にソート完了 → O(n) ステップ・各ステップ O(n/2) 並列処理
```

## 計算量

| アルゴリズム | ステップ数 | 並列処理数/ステップ | プロセッサ数 |
| --- | --- | --- | --- |
| バイトニックソート | O(log² n) | O(n/2) | O(n) |
| 奇偶転置ソート | O(n) | O(n/2) | O(n) |
| 並列マージソート | O(log² n) | O(n) | O(n) |
| 逐次クイックソート（参考） | O(n log n) | 1 | 1 |

## 実装

```python title="バイトニックソート（逐次シミュレーション）"
def bitonic_sort(arr: list, ascending: bool = True) -> list:
    """バイトニックソート（n は 2 の冪乗）"""
    n = len(arr)
    if n <= 1:
        return arr

    def bitonic_merge(arr, lo, cnt, asc):
        if cnt > 1:
            k = cnt // 2
            for i in range(lo, lo + k):
                if (arr[i] > arr[i + k]) == asc:
                    arr[i], arr[i + k] = arr[i + k], arr[i]
            bitonic_merge(arr, lo, k, asc)
            bitonic_merge(arr, lo + k, k, asc)

    def bitonic_sort_rec(arr, lo, cnt, asc):
        if cnt > 1:
            k = cnt // 2
            bitonic_sort_rec(arr, lo, k, True)       # 昇順
            bitonic_sort_rec(arr, lo + k, k, False)  # 降順
            bitonic_merge(arr, lo, cnt, asc)

    a = arr[:]
    bitonic_sort_rec(a, 0, n, ascending)
    return a

# 使用例（n は 2 の冪乗）
import random
data = [random.randint(0, 100) for _ in range(16)]
print("before:", data)
print("after: ", bitonic_sort(data))
```

```python title="奇偶転置ソート（逐次シミュレーション）"
def odd_even_sort(arr: list) -> list:
    """奇偶転置ソート（任意の長さに対応）"""
    a = arr[:]
    n = len(a)
    sorted_ = False
    while not sorted_:
        sorted_ = True
        # 奇数インデックスフェーズ: (1,2), (3,4), ...
        for i in range(1, n - 1, 2):
            if a[i] > a[i + 1]:
                a[i], a[i + 1] = a[i + 1], a[i]
                sorted_ = False
        # 偶数インデックスフェーズ: (0,1), (2,3), ...
        for i in range(0, n - 1, 2):
            if a[i] > a[i + 1]:
                a[i], a[i + 1] = a[i + 1], a[i]
                sorted_ = False
    return a

data = [5, 3, 6, 1, 4, 2]
print(odd_even_sort(data))  # [1, 2, 3, 4, 5, 6]
```

```python title="Python の並列ソート（multiprocessing）"
from multiprocessing import Pool
import math

def parallel_merge_sort(arr: list, n_workers: int = 4) -> list:
    """
    配列を n_workers 個に分割して各プロセスでソート後マージ
    """
    n = len(arr)
    chunk_size = math.ceil(n / n_workers)
    chunks = [arr[i:i + chunk_size] for i in range(0, n, chunk_size)]

    with Pool(n_workers) as pool:
        sorted_chunks = pool.map(sorted, chunks)

    # マージ（k-way merge）
    import heapq
    result = []
    heap = []
    iters = [iter(c) for c in sorted_chunks]
    for i, it in enumerate(iters):
        val = next(it, None)
        if val is not None:
            heapq.heappush(heap, (val, i))

    while heap:
        val, i = heapq.heappop(heap)
        result.append(val)
        nxt = next(iters[i], None)
        if nxt is not None:
            heapq.heappush(heap, (nxt, i))

    return result

if __name__ == "__main__":
    import random
    data = [random.randint(0, 1000) for _ in range(10000)]
    result = parallel_merge_sort(data, n_workers=4)
    print(result[:10])  # 先頭10件確認
```

```python title="NumPy / cupy での並列ソート"
import numpy as np

# CPU（NumPy はマルチスレッド BLAS を活用）
arr = np.random.randint(0, 1000, size=10_000_000)
sorted_arr = np.sort(arr)  # 内部でイントロソート

# GPU（cupy が利用可能な場合）
try:
    import cupy as cp
    arr_gpu = cp.array(arr)
    sorted_gpu = cp.sort(arr_gpu)  # GPU 上でスラブソート
    print("GPU sort OK")
except ImportError:
    print("cupy not available")
```

## 使用場面

- **外部ソート**: ディスク上の大規模データを分散してソートしマージ
- **データベース**: 並列クエリ処理での ORDER BY
- **GPU 処理**: 大規模配列のバッチソート（Thrust / cupy）
- **ネットワーク**: ソーティングネットワーク（バイトニック）でハードウェア実装

## 参考文献

<AffiliateBanner site="antbook" />
