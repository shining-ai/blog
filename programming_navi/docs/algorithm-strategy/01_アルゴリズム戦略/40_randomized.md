import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 乱択アルゴリズム (Randomized Algorithm)

## 乱択アルゴリズムとは

乱択アルゴリズムとは、

> アルゴリズムの実行中に**乱数を利用**し、期待計算量や成功確率の観点で優れた性能を達成するアルゴリズム設計戦略

です。

決定的アルゴリズムでは最悪ケースが問題になる場合でも、ランダム性を導入することで平均的に高速・シンプルな実装を実現できます。

## 2つの分類

```
Las Vegas アルゴリズム:
  ・常に正しい解を返す
  ・実行時間がランダムに変動する
  ・例: ランダム化クイックソート

Monte Carlo アルゴリズム:
  ・固定時間で終了する
  ・確率的に正しい解を返す（誤答の確率がある）
  ・例: Miller-Rabin 素数判定
```

| | Las Vegas | Monte Carlo |
| --- | --- | --- |
| 正確性 | 常に正確 | 確率的に正確 |
| 実行時間 | 期待値で高速 | 固定時間 |
| 代表例 | ランダム化クイックソート | Miller-Rabin |

## 代表的なアルゴリズム

### ランダム化クイックソート

```
決定的クイックソートの問題:
  常に最小値をピボットに選ぶ → O(n²)

ランダムピボット選択:
  入力のどの配置でも期待 O(n log n)

  ピボットをランダムに選ぶ
    → 確率 1/2 で「良い分割」（サイズが n/4 〜 3n/4）
    → 期待 O(log n) 回の分割で済む
```

### Miller-Rabin 素数判定

```
確率的素数判定（Monte Carlo）:

  入力: n（判定したい整数）

  STEP 1: n-1 = 2^r × d に分解
  STEP 2: a をランダムに選ぶ（1 < a < n-1）
  STEP 3: x = a^d mod n を計算
  STEP 4: x == 1 または x == n-1 なら「おそらく素数」
  STEP 5: r-1 回繰り返し、条件を満たさなければ「合成数」

  k 回繰り返すと誤答確率 ≤ (1/4)^k
  k=20 で誤答確率 ≈ 10^-12
```

### ランダムサンプリング（Reservoir Sampling）

```
問題: n個の要素から k 個をランダムに選ぶ（n が不明でも可）

アルゴリズム:
  最初の k 個を reservoir にセット
  i 番目（i > k）の要素を確率 k/i で reservoir に追加
  → 各要素が等確率で選ばれることを保証
```

## 計算量

| アルゴリズム | 期待/確率 | 計算量 |
| --- | --- | --- |
| ランダム化クイックソート | 期待 | O(n log n) |
| ランダム化選択 | 期待 | O(n) |
| Miller-Rabin (k回) | 確率 1-(1/4)^k | O(k log² n) |
| ハッシュテーブル（ユニバーサルハッシュ） | 期待 | O(1) per op |
| Reservoir Sampling | — | O(n) |

## 実装

```python title="ランダム化クイックソート（Las Vegas）"
import random

def randomized_quicksort(arr: list) -> list:
    if len(arr) <= 1:
        return arr

    pivot = random.choice(arr)   # ランダムピボット選択
    left  = [x for x in arr if x < pivot]
    mid   = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]

    return randomized_quicksort(left) + mid + randomized_quicksort(right)
```

```python title="Miller-Rabin 素数判定（Monte Carlo）"
import random

def miller_rabin(n: int, k: int = 20) -> bool:
    """k 回の試行で n が素数かどうかを判定"""
    if n < 2: return False
    if n == 2 or n == 3: return True
    if n % 2 == 0: return False

    # n-1 = 2^r * d に分解
    r, d = 0, n - 1
    while d % 2 == 0:
        r += 1; d //= 2

    for _ in range(k):
        a = random.randrange(2, n - 1)
        x = pow(a, d, n)

        if x == 1 or x == n - 1:
            continue

        for _ in range(r - 1):
            x = pow(x, 2, n)
            if x == n - 1:
                break
        else:
            return False   # 確実に合成数

    return True            # おそらく素数
```

```python title="Reservoir Sampling"
import random
from typing import Iterator

def reservoir_sampling(stream: Iterator, k: int) -> list:
    """ストリームから k 個をランダムに選ぶ"""
    reservoir = []

    for i, item in enumerate(stream):
        if i < k:
            reservoir.append(item)
        else:
            j = random.randint(0, i)
            if j < k:
                reservoir[j] = item

    return reservoir
```

## ランダム性の利点

```
最悪ケースの回避:
  決定的クイックソート: O(n²)（最悪）
  ランダム化クイックソート: O(n log n)（期待値、任意の入力に対して）

敵対的入力への耐性:
  決定的アルゴリズムは最悪ケースを引き起こす入力が存在する
  ランダム化では入力に依存せず期待性能を保証

実装のシンプルさ:
  多くの場合、決定的な最適アルゴリズムより実装が簡単
```

## 使用場面

- **ソート**: ランダム化クイックソート
- **素数判定**: Miller-Rabin（暗号応用）
- **ハッシュ**: ユニバーサルハッシュ・ブルームフィルタ
- **サンプリング**: Reservoir Sampling・モンテカルロ法
- **幾何学**: ランダム化凸包・最小外接球

## 参考文献

<AffiliateBanner site="antbook" />
