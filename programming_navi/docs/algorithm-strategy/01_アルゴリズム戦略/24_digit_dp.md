import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 桁 DP（Digit DP）

## 桁 DP とは

桁 DP とは、

> 「0 以上 N 以下の整数のうち、ある条件を満たすものの個数（または総和）を求める」問題を、**数字を上の桁から順に決める DP** で解く手法

です。

「N 以下」という上限制約を `tight` フラグで管理するのが特徴です。

## 基本的な考え方

数を上の桁から順に決めていき、各桁の選び方を DP で管理します。

```
N = 25 として、0〜25 の整数を数える場合

上限 25:  2  5
          ↓  ↓

桁を決める過程:
  1桁目が 0〜1 → 2桁目は 0〜9 まで自由（tight=False）
  1桁目が 2    → 2桁目は 0〜5 まで（tight=True）
```

## 状態

典型的な桁 DP の状態:

| 状態変数 | 意味 |
| --- | --- |
| `pos` | 現在何桁目を決めているか |
| `tight` | 上位桁がすべて上限と一致しているか |
| `started` | 先頭の 0 が終わったか（leading zero 対策） |
| その他 | 問題固有の条件（桁の合計、特定の数字の有無など） |

## 計算量

| | 計算量 |
| --- | --- |
| 時間 | O(桁数 × 状態数) |
| 空間 | O(桁数 × 状態数) |

桁数は `log₁₀(N)` 程度（N ≦ 10¹⁸ なら 18 桁）。

## 実装

```python title="0以上N以下で各桁の和がSになる整数の個数"
from functools import lru_cache

def count_digit_sum(N: int, S: int) -> int:
    digits = list(map(int, str(N)))
    n = len(digits)

    @lru_cache(maxsize=None)
    def dp(pos: int, remaining: int, tight: bool, started: bool) -> int:
        """
        pos:       現在の桁インデックス
        remaining: まだ使える桁の合計
        tight:     上限制約が有効か
        started:   先頭ゼロが終わったか
        """
        if remaining < 0:
            return 0
        if pos == n:
            return 1 if (started and remaining == 0) else 0

        limit = digits[pos] if tight else 9
        result = 0

        for d in range(0, limit + 1):
            new_started = started or (d > 0)
            new_remaining = remaining - d if new_started else 0
            result += dp(pos + 1, new_remaining, tight and d == limit, new_started)

        return result

    return dp(0, S, True, False)

print(count_digit_sum(100, 5))   # 15  (5, 14, 23, 32, 41, 50, ...)
print(count_digit_sum(1000, 3))  # 10
```

```python title="0以上N以下で4または7のみからなる整数（ラッキーナンバー）の個数"
from functools import lru_cache

def count_lucky(N: int) -> int:
    digits = list(map(int, str(N)))
    n = len(digits)

    @lru_cache(maxsize=None)
    def dp(pos: int, tight: bool, started: bool) -> int:
        if pos == n:
            return 1 if started else 0

        limit = digits[pos] if tight else 9
        result = 0

        for d in range(0, limit + 1):
            if d == 0 and not started:
                result += dp(pos + 1, tight and d == limit, False)
            elif d == 4 or d == 7:
                result += dp(pos + 1, tight and d == limit, True)
            # 4でも7でもない場合はカウントしない

        return result

    return dp(0, True, False)

print(count_lucky(100))   # 4  (4, 7, 44, 47, 74, 77 のうち 100 以下: 4, 7, 44, 47, 74, 77 → 6)
```

## ポイント

```python title="テンプレート"
from functools import lru_cache

def solve(N: int) -> int:
    digits = list(map(int, str(N)))
    n = len(digits)

    @lru_cache(maxsize=None)
    def dp(pos, tight, *問題固有の状態):
        if pos == n:
            return 1 if 終了条件 else 0

        limit = digits[pos] if tight else 9
        result = 0
        for d in range(0, limit + 1):
            result += dp(pos + 1, tight and d == limit, *遷移後の状態)
        return result

    return dp(0, True, *初期状態)
```

## 使用場面

- **桁の合計が S になる整数の個数**
- **特定の数字を含む/含まない整数の個数**
- **各桁が非減少（0≦d[0]≦d[1]≦...）な整数の個数**
- **A 以上 B 以下の条件**: `f(B) - f(A-1)` の形で対応

## 参考文献

<AffiliateBanner site="tessoku" />
<AffiliateBanner site="antbook" />
