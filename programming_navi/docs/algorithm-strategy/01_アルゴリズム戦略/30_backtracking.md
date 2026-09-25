import AffiliateBanner from '@site/src/components/AffiliateBanner';

# バックトラッキング (Backtracking)

## バックトラッキングとは

バックトラッキングとは、

> 解候補を段階的に構築し、**制約を満たさない候補を早期に刈り込む（枝刈り）**ことで効率よく全解探索を行うアルゴリズム設計戦略

です。

深さ優先探索（DFS）を基盤として、「行き詰まったら戻る」という原則のもと、すべての解を漏れなく探します。

## 動作の原理

```
決定木（Decision Tree）を DFS で探索:

               Root
            /    |    \
           A     B     C        ← 選択 1
          / \         / \
         D   E       F   G      ← 選択 2
         ×   ○       ×   ○     ← 制約チェック

  × = 制約違反 → バックトラック（枝刈り）
  ○ = 有効な候補 → 次の選択へ進む
```

## 代表的な問題

### N クイーン問題

```
4×4 チェスボードに 4 つのクイーンを
互いに攻撃できないように配置する

  1 2 3 4
1 . Q . .   ← 2列目
2 . . . Q   ← 4列目
3 Q . . .   ← 1列目
4 . . Q .   ← 3列目

枝刈り: 同じ列・斜め方向に既存クイーンがあれば即座に打ち切り
```

### 数独ソルバー

```
空マス（0）に 1-9 を入れる:
  5 3 0 | 0 7 0 | 0 0 0
  6 0 0 | 1 9 5 | 0 0 0
  0 9 8 | 0 0 0 | 0 6 0

STEP 1: 最初の空マス (0,2) に 1-9 を試す
STEP 2: 行・列・3×3ブロックに重複がなければ進む
STEP 3: 行き詰まったら前のマスに戻り別の数字を試す
```

### 部分和問題

```
nums = [3, 1, 4, 2, 2]   target = 6

探索木:
  [] → [3] → [3,1] → [3,1,4] → 合計8 > 6 → 枝刈り
            → [3,1,2] → [3,1,2,2] → 合計8 > 6 → 枝刈り
            →          合計6 = target → 解: [3,1,2] ✓
       → [3,4] → 合計7 > 6 → 枝刈り
  ...
```

## 計算量

| 問題 | 最悪計算量 | 枝刈り効果 |
| --- | --- | --- |
| N クイーン | O(N!) | 実用的には大幅に削減 |
| 数独 | O(9^81) | 通常 ms オーダー |
| 部分和問題 | O(2^n) | 合計超過で早期打ち切り |
| ハミルトン路 | O(n!) | 訪問済み確認で削減 |

## 実装

```python title="N クイーン問題"
def n_queens(n: int) -> list[list[int]]:
    solutions = []

    def is_safe(board: list[int], row: int, col: int) -> bool:
        for r in range(row):
            if board[r] == col:                 return False  # 同じ列
            if abs(board[r] - col) == row - r:  return False  # 斜め
        return True

    def backtrack(board: list[int], row: int):
        if row == n:
            solutions.append(board[:])
            return
        for col in range(n):
            if is_safe(board, row, col):
                board.append(col)           # 選択
                backtrack(board, row + 1)   # 再帰
                board.pop()                 # バックトラック

    backtrack([], 0)
    return solutions
```

```python title="数独ソルバー"
def solve_sudoku(board: list[list[int]]) -> bool:
    def is_valid(row: int, col: int, num: int) -> bool:
        if num in board[row]: return False
        if num in [board[r][col] for r in range(9)]: return False
        br, bc = 3 * (row // 3), 3 * (col // 3)
        for r in range(br, br + 3):
            for c in range(bc, bc + 3):
                if board[r][c] == num: return False
        return True

    for row in range(9):
        for col in range(9):
            if board[row][col] == 0:
                for num in range(1, 10):
                    if is_valid(row, col, num):
                        board[row][col] = num      # 選択
                        if solve_sudoku(board):    # 再帰
                            return True
                        board[row][col] = 0        # バックトラック
                return False
    return True
```

```python title="部分和問題（全解列挙）"
def subset_sum(nums: list[int], target: int) -> list[list[int]]:
    solutions = []

    def backtrack(start: int, current: list[int], remaining: int):
        if remaining == 0:
            solutions.append(current[:])
            return
        if remaining < 0:       # 枝刈り
            return
        for i in range(start, len(nums)):
            current.append(nums[i])
            backtrack(i + 1, current, remaining - nums[i])
            current.pop()       # バックトラック

    backtrack(0, [], target)
    return solutions
```

## 枝刈りの戦略

| 戦略 | 説明 |
| --- | --- |
| 制約違反チェック | 現在の候補が制約を満たさなければ即座に打ち切り |
| 上界チェック | 残りの候補を全選択しても目標に届かなければ打ち切り |
| 前向き検査 | 制約伝播により次ステップの有効候補を事前に絞り込む |
| 対称性の利用 | 等価な解候補をまとめて探索空間を削減 |

## 使用場面

- **制約充足問題 (CSP)**: 数独・クロスワード・グラフ彩色
- **組合せ最適化**: N クイーン・分枝限定法
- **パズル**: 八パズル・ルービックキューブ
- **経路探索**: ハミルトン路・巡回セールスマン
- **列挙**: 順列・部分集合の全列挙

## 参考文献

<AffiliateBanner site="antbook" />
