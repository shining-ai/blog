import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Z-Algorithm

## Z-Algorithmとは

Z-Algorithmとは、

> 文字列Sの各位置iについて「SとS[i:]の最長共通接頭辞の長さ」を格納したZ配列をO(n)で構築するアルゴリズム

です。
<br/>

Z配列を使うとパターンマッチングが `P + "$" + T` という連結文字列のZ配列を計算するだけで O(n+m) で実現できます。

## Z配列の定義

`Z[i]` = 文字列 S と S[i:] の最長共通接頭辞の長さ（Z[0] は慣習上 len(S)）

```
S:    A  A  B  A  A  B  C
i:    0  1  2  3  4  5  6

Z[0] = 7  （慣習上 len(S)）
Z[1] = 1  S[1:]="AABC..." と S="AABC..." → A=A, A≠A? 待って...
           S[1:]="ABAABС" → S[1]='A'=S[0]='A', S[2]='B'≠S[1]='A' → Z[1]=1
Z[2] = 0  S[2]='B'≠S[0]='A'
Z[3] = 4  S[3:]="AABC" と S="AABC..." → 4文字一致 → Z[3]=4
Z[4] = 1  "ABCX" vs "A..." → A=A, B≠A → Z[4]=1
           Wait, S[4:]="ABC", S="AABAABC": S[4]='A'=S[0]='A', S[5]='B'≠S[1]='A' → Z[4]=1
Z[5] = 3  S[5:]="BC", S="AA..." → 'B'≠'A' → Z[5]=0
           Wait, let me recompute... S="AABAABC"
           S[5:]="BC": 'B'≠'A' → Z[5]=0
Z[6] = 0  'C'≠'A'
```

Let me recompute with a cleaner example:

```
S:    A  B  A  B  A  B
i:    0  1  2  3  4  5

Z[0] = 6  （慣習上 len(S)）
Z[1] = 0  'B'≠'A'
Z[2] = 4  S[2:]="ABAB" と S="ABABAB" → A=A,B=B,A=A,B=B → Z[2]=4
Z[3] = 0  'B'≠'A'
Z[4] = 2  S[4:]="AB" と S="AB..." → A=A,B=B → Z[4]=2
Z[5] = 0  'B'≠'A'

Z = [6, 0, 4, 0, 2, 0]
```

## Z配列の高速計算（Z-box の活用）

現在の最右 Z-box（S[l..r] が S[0..r-l] と一致している区間）を管理することで O(n) を実現します。

```python
for i in range(1, n):
    if i < r:          # i が Z-box 内
        z[i] = min(r - i, z[i - l])   # 既知の情報を流用
    # z[i] の分だけは確認済み、そこから拡張を試みる
    while i + z[i] < n and s[z[i]] == s[i + z[i]]:
        z[i] += 1
    if i + z[i] > r:   # Z-box を更新
        l, r = i, i + z[i]
```

## パターンマッチングへの応用

パターン P と テキスト T を `P + "$" + T` に連結してZ配列を計算します。

- `$` は P にも T にも登場しない文字を使います
- `Z[i] >= len(P)` となる i があれば、その位置に一致があります

```
Pattern = "AB"   Text = "ABABCAB"
S = "AB$ABABCAB"
      0123456789

Z[3]=2 → text の位置 3-3=0 に "AB" が一致
Z[5]=2 → text の位置 5-3=2 に "AB" が一致
Z[8]=2 → text の位置 8-3=5 に "AB" が一致
```

## 計算量

| | 計算量 |
| --- | --- |
| Z配列構築 | O(n) |
| パターンマッチング | O(n + m) |
| 空間 | O(n) |

## 実装

```python title="Z-Algorithm"
def z_function(s: str) -> list[int]:
    n = len(s)
    z = [0] * n
    z[0] = n
    l = r = 0
    for i in range(1, n):
        if i < r:
            z[i] = min(r - i, z[i - l])
        while i + z[i] < n and s[z[i]] == s[i + z[i]]:
            z[i] += 1
        if i + z[i] > r:
            l, r = i, i + z[i]
    return z

def z_search(text: str, pattern: str) -> list[int]:
    if not pattern:
        return []
    s = pattern + "$" + text
    z = z_function(s)
    m = len(pattern)
    return [i - m - 1 for i in range(m + 1, len(s)) if z[i] >= m]
```

```python title="使用例"
print(z_function("ABABAB"))        # [6, 0, 4, 0, 2, 0]
print(z_search("ABABCAB", "AB"))   # [0, 2, 5]
```

### Z配列の他の応用

```python title="最長の接頭辞=接尾辞の長さを求める"
def longest_prefix_suffix(s: str) -> int:
    """文字列 s の最長の真の接頭辞かつ接尾辞の長さ"""
    z = z_function(s)
    n = len(s)
    return max((z[i] for i in range(1, n) if z[i] + i == n), default=0)

print(longest_prefix_suffix("ABACABA"))  # 3 ("ABA")
```

```python title="文字列の周期を求める"
def shortest_period(s: str) -> int:
    """文字列 s の最短周期（s が周期 k で構成できる最小の k）"""
    z = z_function(s)
    n = len(s)
    for k in range(1, n):
        if n % k == 0 and z[k] == n - k:
            return k
    return n

print(shortest_period("ABABAB"))  # 2 ("AB")
print(shortest_period("ABCABC")) # 3 ("ABC")
```

## 使用場面

- **パターンマッチング**: KMPと同等の性能で実装がシンプル
- **周期文字列の検出**: 文字列の最短周期や周期的部分の検出
- **文字列比較**: 2文字列の最長共通接頭辞の高速計算
- **競技プログラミング**: KMPより実装がわかりやすいため好まれることが多い

## 参考文献

<AffiliateBanner site="antbook" />

<AffiliateBanner site="tessoku" />
