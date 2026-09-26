import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 最長共通部分列（LCS）

## LCS とは

最長共通部分列（LCS: Longest Common Subsequence）とは、

> 2つの文字列に共通して現れる**最も長い部分列**（連続でなくてよい）

です。

部分文字列（連続）とは異なり、順序を保ちながら文字を選ぶことができます。

```
X = "ABCBDAB"
Y = "BDCAB"

LCS = "BCAB"（長さ 4）

X: A B C B D A B
       ↕   ↕ ↕ ↕
Y:   B D C A B
```

## DP テーブル

`dp[i][j]` = `X[0..i-1]` と `Y[0..j-1]` の LCS の長さ

```
      ""  B  D  C  A  B
  "": 0   0  0  0  0  0
  A:  0   0  0  0  1  1
  B:  0   1  1  1  1  2
  C:  0   1  1  2  2  2
  B:  0   1  1  2  2  3
  D:  0   1  2  2  2  3
  A:  0   1  2  2  3  3
  B:  0   1  2  2  3  4
```

遷移:
- `X[i-1] == Y[j-1]` なら `dp[i][j] = dp[i-1][j-1] + 1`
- それ以外は `dp[i][j] = max(dp[i-1][j], dp[i][j-1])`

## 計算量

| | 計算量 |
| --- | --- |
| 時間 | O(mn) |
| 空間 | O(mn)（O(min(m,n)) に削減可能） |

## 実装

```python title="LCS の長さ"
def lcs_length(X: str, Y: str) -> int:
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

```python title="LCS の文字列を復元"
def lcs_string(X: str, Y: str) -> str:
    m, n = len(X), len(Y)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if X[i - 1] == Y[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])

    # バックトラックで復元
    result = []
    i, j = m, n
    while i > 0 and j > 0:
        if X[i - 1] == Y[j - 1]:
            result.append(X[i - 1])
            i -= 1
            j -= 1
        elif dp[i - 1][j] > dp[i][j - 1]:
            i -= 1
        else:
            j -= 1

    return ''.join(reversed(result))
```

```python title="使用例"
X = "ABCBDAB"
Y = "BDCAB"
print(lcs_length(X, Y))  # 4
print(lcs_string(X, Y))  # BCAB
```

```python title="空間最適化（O(n) 空間）"
def lcs_optimized(X: str, Y: str) -> int:
    """前の行だけ保持する O(n) 空間版"""
    m, n = len(X), len(Y)
    prev = [0] * (n + 1)

    for i in range(1, m + 1):
        curr = [0] * (n + 1)
        for j in range(1, n + 1):
            if X[i - 1] == Y[j - 1]:
                curr[j] = prev[j - 1] + 1
            else:
                curr[j] = max(prev[j], curr[j - 1])
        prev = curr

    return prev[n]
```

## 関連問題

| 問題 | LCS との関係 |
| --- | --- |
| 編集距離（Edit Distance） | 挿入・削除コストを最小化（LCS の双対） |
| 最長増加部分列（LIS） | 1次元版、O(n log n) で解ける |
| 差分（diff コマンド） | 2ファイルの LCS をベースに差分を表示 |
| 文字列の類似度 | LCS 長 / max(m,n) で類似度を定義 |

## 使用場面

- **diff コマンド**: ファイルの差分表示（git diff の内部）
- **生物情報学**: DNA・アミノ酸配列のアライメント
- **スペルチェック**: 入力と辞書の類似度計算
- **競技プログラミング**: 文字列 DP の定番

## 参考文献

<AffiliateBanner site="tessoku" />
<AffiliateBanner site="antbook" />
