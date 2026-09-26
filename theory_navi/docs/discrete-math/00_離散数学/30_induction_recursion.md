import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 帰納法と再帰

## 帰納法と再帰とは

> 数学的帰納法は自然数に関する命題を「基底ケース」と「帰納ステップ」の2段階で証明する手法であり、再帰はある問題をより小さい同種の問題に還元して解く計算手法である。

数学的帰納法（Mathematical Induction）は、命題 P(n) がすべての自然数 n に対して成り立つことを証明する強力な技法です。証明は2段階からなります。まず P(0)（または P(1)）が成り立つことを示す**基底ステップ**、次に「P(k) が成り立つならば P(k+1) も成り立つ」を示す**帰納ステップ**です。これはドミノ倒しに例えられます。

強帰納法（Strong Induction）では帰納ステップで「P(0), P(1), ..., P(k) がすべて成り立つ」という仮定（帰納仮説）を使えます。これにより証明が容易になる場合があります。構造帰納法はリストや木といった帰納的に定義された構造に対して使われ、プログラムの型安全性証明などに不可欠です。

再帰（Recursion）は帰納法の計算版です。再帰関数は自分自身を呼び出すことで問題を分割しますが、必ず基底ケース（終了条件）が必要です。再帰と帰納法は相互に補完する関係にあり、再帰的プログラムの正当性証明には構造帰納法が使われます。末尾再帰（Tail Recursion）はスタックを消費しない最適化形式です。

## 数学的帰納法の証明例

| ステップ | 内容 |
|----------|------|
| 命題 | 1 + 2 + ... + n = n(n+1)/2 |
| 基底 | n=1: 左辺=1, 右辺=1(2)/2=1 ✓ |
| 帰納仮説 | P(k): 1+2+...+k = k(k+1)/2 が成立と仮定 |
| 帰納ステップ | 左辺 = k(k+1)/2 + (k+1) = (k+1)(k+2)/2 = P(k+1) ✓ |

```python
# 再帰の実装例

# 1. ガウスの公式の再帰的実装
def sum_n(n: int) -> int:
    """1 + 2 + ... + n を再帰で計算"""
    if n <= 0:   # 基底ケース
        return 0
    return n + sum_n(n - 1)  # 帰納ステップ

print(sum_n(10))   # 55
print(10 * 11 // 2)  # 55（公式で確認）

# 2. フィボナッチ数列（メモ化付き）
from functools import lru_cache

@lru_cache(maxsize=None)
def fib(n: int) -> int:
    """フィボナッチ数（メモ化再帰）"""
    if n <= 1:    # 基底ケース: F(0)=0, F(1)=1
        return n
    return fib(n - 1) + fib(n - 2)

print([fib(i) for i in range(10)])  # [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]

# 3. 強帰納法が必要な例: コイン問題（3セントと5セントで作れる金額）
def can_make(n: int, memo=None) -> bool:
    """n セントを3または5セントで作れるか（強帰納）"""
    if memo is None:
        memo = {}
    if n in memo:
        return memo[n]
    if n == 0:
        return True
    if n < 0:
        return False
    result = can_make(n - 3, memo) or can_make(n - 5, memo)
    memo[n] = result
    return result

achievable = [n for n in range(20) if can_make(n)]
print("作れる金額:", achievable)  # [0, 3, 5, 6, 8, 9, 10, 11, ...]
```

## 使用場面

- **アルゴリズムの正当性証明**: 分割統治法（マージソートなど）の正当性は帰納法で証明する
- **再帰的データ構造**: 木・リスト・グラフの処理に構造帰納法と再帰アルゴリズムを使う
- **コンパイラ**: 構文解析は文脈自由文法の帰納的定義に基づく再帰下降パーサーで実装される
- **型システム**: 型推論ルールの健全性・完全性は構造帰納法で証明される

## 参考文献

- Sipser, M. "Introduction to the Theory of Computation" (Cengage)
- 青木利晃ほか「離散数学入門」(サイエンス社)

<AffiliateBanner site="theory_navi" />
