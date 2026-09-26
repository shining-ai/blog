import AffiliateBanner from '@site/src/components/AffiliateBanner';

# PSPACE・EXP クラス

## PSPACE・EXP クラスとは

> PSPACE は多項式量のメモリ（空間）で解ける判定問題の集合、EXP は指数時間 2^(n^c) で解ける問題の集合であり、P ⊆ NP ⊆ PSPACE ⊆ EXP という包含関係が成立し、P ≠ EXP は証明済みである。

計算量クラスは時間だけでなく空間でも定義されます。PSPACE（Polynomial Space）は決定性チューリング機械が O(n^k) のメモリで計算できる問題のクラスです。時間と空間の関係では、多項式空間の計算は（状態数が指数的に多くても）指数時間で終わるため PSPACE ⊆ EXP が成立します。また、時間の下界として P ⊆ PSPACE も成立します。

PSPACE 完全問題の代表例は TQBF（True Quantified Boolean Formula：全称・存在量化子を含むブール式の充足性判定）です。PSPACE の特徴は「時間は指数かかっても良いが空間が多項式」という点で、ゲーム・プランニング問題が多く属します。完全情報二人ゲームの勝利判定（チェス・将棋・囲碁の有限版）は PSPACE 完全や EXPTIME 完全になります。

EXP（EXPTIME）は 2^(n^c) の決定性時間で解ける問題です。P ≠ EXP は時間階層定理（Time Hierarchy Theorem）によって証明された数少ない「確実な」分離定理の一つです。一般化されたチェス・将棋・囲碁の勝利判定は EXPTIME 完全です。

## 計算量クラスの階層

| クラス | 資源 | 定義 | 代表的な完全問題 |
|--------|------|------|----------------|
| P | 多項式時間 | DTIME(n^k) | 線形計画法 |
| NP | 多項式時間（非決定性） | NTIME(n^k) | SAT, ハミルトン閉路 |
| co-NP | 多項式時間（co） | co-NTIME(n^k) | TAUT（恒真式判定） |
| PSPACE | 多項式空間 | DSPACE(n^k) | TQBF, STRIP PACKING |
| EXPTIME | 指数時間 | DTIME(2^(n^k)) | 一般化チェス勝利判定 |
| NEXPTIME | 指数時間（非決定性） | NTIME(2^(n^k)) | — |

## PSPACE の主要な性質

| 性質 | 内容 |
|------|------|
| PSPACE = co-PSPACE | 空間は補に対して対称 |
| NP ∪ co-NP ⊆ PSPACE | NP も co-NP も PSPACE に含まれる |
| Savitch の定理 | NSPACE(s(n)) ⊆ DSPACE(s(n)²) |
| PSPACE 完全 = TQBF | TQBF は PSPACE の「最も困難な問題」 |

```python
from functools import lru_cache

# ===========================
# PSPACE の例: TQBF（量化ブール式の充足性判定）
# ===========================

def eval_qbf(formula: str, assignment: dict[str, bool]) -> bool:
    """
    量化子なしのブール式を評価する補助関数
    形式: AND/OR/NOT の組み合わせ（簡略実装）
    """
    def eval_expr(tokens: list, pos: int) -> tuple[bool, int]:
        token = tokens[pos]
        if token == "AND":
            left, pos = eval_expr(tokens, pos + 1)
            right, pos = eval_expr(tokens, pos)
            return left and right, pos
        elif token == "OR":
            left, pos = eval_expr(tokens, pos + 1)
            right, pos = eval_expr(tokens, pos)
            return left or right, pos
        elif token == "NOT":
            val, pos = eval_expr(tokens, pos + 1)
            return not val, pos
        else:
            # 変数名
            return assignment.get(token, False), pos + 1

    tokens = formula.split()
    result, _ = eval_expr(tokens, 0)
    return result


def eval_tqbf(quantifiers: list[tuple[str, str]], matrix: str) -> bool:
    """
    TQBF の評価（再帰的に量化子を処理）
    quantifiers: [("∀", "x"), ("∃", "y"), ...] の量化子リスト
    matrix: 量化子なしのブール式
    """
    def evaluate(qidx: int, assignment: dict[str, bool]) -> bool:
        if qidx == len(quantifiers):
            return eval_qbf(matrix, assignment)

        quant, var = quantifiers[qidx]
        if quant == "∃":
            # 存在量化: True または False の少なくとも一方で真になればよい
            for val in [False, True]:
                new_assign = {**assignment, var: val}
                if evaluate(qidx + 1, new_assign):
                    return True
            return False
        else:  # ∀
            # 全称量化: True と False の両方で真でなければならない
            for val in [False, True]:
                new_assign = {**assignment, var: val}
                if not evaluate(qidx + 1, new_assign):
                    return False
            return True

    return evaluate(0, {})


# ===========================
# EXP の例: ゲームの勝利判定（ミニマックス）
# ===========================

def minimax(state: tuple, depth: int, is_max: bool, game_over_fn, eval_fn, moves_fn) -> int:
    """
    ミニマックスアルゴリズム（EXP クラスの計算を概念的に示す）
    ゲームツリー全体を探索: O(b^d)（b=分岐数, d=深さ）
    """
    if game_over_fn(state) or depth == 0:
        return eval_fn(state)

    if is_max:
        best = -float('inf')
        for move in moves_fn(state):
            best = max(best, minimax(move, depth - 1, False, game_over_fn, eval_fn, moves_fn))
        return best
    else:
        best = float('inf')
        for move in moves_fn(state):
            best = min(best, minimax(move, depth - 1, True, game_over_fn, eval_fn, moves_fn))
        return best


# ===========================
# デモ
# ===========================

print("=== PSPACE・EXP クラスデモ ===\n")

# TQBF の評価
print("[TQBF: ∃x ∀y (x OR y) の評価]")
# ∃x ∀y (x OR y): x=True を選べば ∀y (True OR y) = True → True
quantifiers = [("∃", "x"), ("∀", "y")]
matrix = "OR x y"
result = eval_tqbf(quantifiers, matrix)
print(f"  ∃x ∀y (x OR y) = {result}  (期待: True)")

print("\n[TQBF: ∀x ∃y (x AND NOT y) の評価]")
# ∀x ∃y (x AND NOT y): x=True のとき y=False にすれば True。x=False のとき False → False
quantifiers2 = [("∀", "x"), ("∃", "y")]
matrix2 = "AND x NOT y"
result2 = eval_tqbf(quantifiers2, matrix2)
print(f"  ∀x ∃y (x AND NOT y) = {result2}  (期待: False)")

# ミニマックス（簡単なゲームで EXP の感覚を示す）
print("\n[ミニマックス: Nim（1-3 除去ゲーム）の勝利判定]")

def nim_over(state):
    return state == 0

def nim_eval(state):
    return 1 if state != 0 else -1  # 取れるコマが残っている方が有利

def nim_moves(state):
    return [state - i for i in range(1, min(4, state + 1))]

for stones in [1, 2, 3, 4, 5, 6, 7, 8]:
    score = minimax(stones, depth=20, is_max=True,
                    game_over_fn=nim_over, eval_fn=nim_eval, moves_fn=nim_moves)
    winner = "先手勝ち" if score > 0 else "後手勝ち"
    print(f"  Nim(n={stones}): {winner}")

print("\n[計算量クラスの包含関係]")
print("  P ⊆ NP ⊆ co-NP ⊆ PSPACE ⊆ EXP ⊆ NEXP")
print("  確実に分離されているもの:")
print("  • P ≠ EXP（時間階層定理より）")
print("  • NP ≠ NEXP（時間階層定理より）")
print("  未解決:")
print("  • P vs NP, NP vs co-NP, NP vs PSPACE, PSPACE vs EXP")
```

## 使用場面

- 完全情報二人ゲームの計算量クラスを分析して（有限版チェス・将棋は PSPACE または EXPTIME 完全）、ゲーム AI の限界を理解する場面
- プランニング問題・モデル検査・LTL（線形時相論理）の充足性判定が PSPACE 完全であることを活用して設計する場面
- アルゴリズムの時間・空間トレードオフを分析して、Savitch の定理を用いて非決定性空間を決定性空間に変換する場面

## 参考文献

- Sipser, M. "Introduction to the Theory of Computation" (Cengage Learning)
- Arora, S. and Barak, B. "Computational Complexity: A Modern Approach" (Cambridge)
- Papadimitriou, C. H. "Computational Complexity" (Addison-Wesley)

<AffiliateBanner site="theory_navi" />
