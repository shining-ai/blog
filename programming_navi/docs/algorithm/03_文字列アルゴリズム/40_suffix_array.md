import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 接尾辞配列 (Suffix Array)

## 接尾辞配列とは

接尾辞配列（Suffix Array）とは、

> 文字列Sの全接尾辞を辞書順にソートしたときの開始インデックスの配列

です。
<br/>

LCP配列（最長共通接頭辞配列）と組み合わせることで、パターン検索・最長繰り返し部分文字列・文字列圧縮など多様な文字列問題を効率的に解けます。

## 接尾辞配列の構造

文字列 `"banana"` の接尾辞配列を構築する例を示します。

```
インデックス:  0       1      2     3    4   5
接尾辞:      banana  anana  nana  ana  na  a

辞書順ソート:
  5: a
  3: ana
  1: anana
  0: banana
  4: na
  2: nana

SA = [5, 3, 1, 0, 4, 2]
```

`SA[i]` が示す接尾辞は辞書順で i 番目に小さい接尾辞です。

## LCP配列（Longest Common Prefix Array）

`LCP[i]` = SA[i] の接尾辞と SA[i-1] の接尾辞の最長共通接頭辞の長さ

```
SA:  [5, 3, 1, 0, 4, 2]

SA[0]=5:  a
SA[1]=3:  ana      LCP[1] = lcp(a,    ana)    = 1
SA[2]=1:  anana    LCP[2] = lcp(ana,  anana)  = 3
SA[3]=0:  banana   LCP[3] = lcp(anana,banana) = 0
SA[4]=4:  na       LCP[4] = lcp(banana, na)   = 0
SA[5]=2:  nana     LCP[5] = lcp(na,    nana)  = 2

LCP = [0, 1, 3, 0, 0, 2]
```

## パターンマッチング

SAは**ソート済み配列**なので、パターンをO(m log n)で二分探索できます。

```
"banana" に "ana" を探す:
  SA上で "ana" 以上の最初の位置 = SA[1]=3
  SA上で "anb" 未満の最後の位置 = SA[2]=1
  → 2件一致: 位置 3, 1
```

## 計算量

| 操作 | 計算量 | 備考 |
| --- | --- | --- |
| 構築（SA-IS等） | O(n) | 最適アルゴリズム |
| 構築（接頭辞倍加） | O(n log n) | 実装が比較的シンプル |
| パターン検索 | O(m log n) | 二分探索 |
| LCP配列構築 | O(n) | Kasai's algorithm |
| 最長繰り返し部分文字列 | O(n) | max(LCP)で求まる |

## 実装

```python title="接尾辞配列（接頭辞倍加法 O(n log n)）"
def build_suffix_array(s: str) -> list[int]:
    n    = len(s)
    sa   = list(range(n))
    rank = [ord(c) for c in s]

    k = 1
    while k < n:
        # (rank[i], rank[i+k]) でソート
        key_fn = lambda i: (rank[i], rank[i + k] if i + k < n else -1)
        sa.sort(key=key_fn)
        # ランクを更新
        tmp    = [0] * n
        tmp[sa[0]] = 0
        for i in range(1, n):
            tmp[sa[i]] = tmp[sa[i - 1]]
            if key_fn(sa[i]) != key_fn(sa[i - 1]):
                tmp[sa[i]] += 1
        rank = tmp
        if rank[sa[-1]] == n - 1:
            break   # 全て区別できた
        k *= 2
    return sa
```

```python title="LCP配列（Kasai's algorithm O(n)）"
def build_lcp_array(s: str, sa: list[int]) -> list[int]:
    n    = len(s)
    rank = [0] * n
    for i, v in enumerate(sa):
        rank[v] = i
    lcp = [0] * n
    h   = 0
    for i in range(n):
        if rank[i] > 0:
            j = sa[rank[i] - 1]
            while i + h < n and j + h < n and s[i + h] == s[j + h]:
                h += 1
            lcp[rank[i]] = h
            if h > 0:
                h -= 1
    return lcp
```

```python title="二分探索によるパターン検索"
import bisect

def sa_search(s: str, sa: list[int], pattern: str) -> list[int]:
    """SA 上の二分探索でパターンの出現位置を返す"""
    n, m = len(s), len(pattern)
    # 下界: pattern 以上の最初の SA 位置
    lo = bisect.bisect_left( [s[sa[i]:sa[i]+m] for i in range(len(sa))], pattern)
    hi = bisect.bisect_right([s[sa[i]:sa[i]+m] for i in range(len(sa))], pattern)
    return sorted(sa[lo:hi])
```

```python title="使用例"
s  = "banana"
sa = build_suffix_array(s)
lcp = build_lcp_array(s, sa)
print("SA: ", sa)     # [5, 3, 1, 0, 4, 2]
print("LCP:", lcp)    # [0, 1, 3, 0, 0, 2]

# 最長繰り返し部分文字列の長さ
print(max(lcp))  # 3 → "ana"

# パターン検索
print(sa_search(s, sa, "ana"))  # [1, 3]
```

## 使用場面

- **全文検索エンジン**: 大規模テキストへの高速パターンマッチング
- **最長繰り返し部分文字列**: max(LCP) で O(n) で求まる
- **文字列の辞書式順序処理**: SA は全接尾辞のソート済みリスト
- **バイオインフォマティクス**: ゲノム配列の高速検索・比較
- **データ圧縮**: BWT (Burrows-Wheeler Transform) の基礎

## 参考文献

<AffiliateBanner site="antbook" />
