import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 集合論の基礎

## 集合論とは

> 集合論とは、「ものの集まり（集合）」を数学的に扱う理論であり、現代数学・計算機科学のほぼすべての分野の基礎をなす体系である。

集合（Set）は重複なく順序を持たない要素の集まりです。Georg Cantor が19世紀に確立した集合論は、数・関数・関係をすべて集合として定義する統一的な枠組みを提供します。要素 x が集合 A に属することを x ∈ A と書き、A の部分集合を A ⊆ B（すべての A の要素が B にも属する）と表します。

主要な集合演算には、和集合（A ∪ B）、積集合（A ∩ B）、差集合（A \ B）、補集合（A^c）、直積集合（A × B）があります。ド・モルガンの法則は集合においても成立し（(A ∪ B)^c = A^c ∩ B^c）、論理演算との深い対応関係を示します。

べき集合 P(A) は A のすべての部分集合を要素とする集合で、|A| = n のとき |P(A)| = 2^n となります。集合の濃度（cardinality）の概念はカントールの対角線論法へと繋がり、可算無限（自然数と全単射が存在する集合）と非可算無限（実数の集合など）の区別を生み出します。

## 集合演算の一覧

| 演算 | 記法 | 定義 |
|------|------|------|
| 和集合 | A ∪ B | x ∈ A または x ∈ B |
| 積集合 | A ∩ B | x ∈ A かつ x ∈ B |
| 差集合 | A \ B | x ∈ A かつ x ∉ B |
| 補集合 | A^c | x ∉ A（全体集合 U を前提） |
| 対称差 | A △ B | (A \ B) ∪ (B \ A) |
| 直積 | A × B | {(a, b) \| a ∈ A, b ∈ B} |
| べき集合 | P(A) | A のすべての部分集合の集合 |

```python
# Python の set を使った集合演算
A = {1, 2, 3, 4, 5}
B = {3, 4, 5, 6, 7}

print("和集合 A ∪ B:", A | B)        # {1, 2, 3, 4, 5, 6, 7}
print("積集合 A ∩ B:", A & B)        # {3, 4, 5}
print("差集合 A \\ B:", A - B)        # {1, 2}
print("対称差 A △ B:", A ^ B)        # {1, 2, 6, 7}
print("A ⊆ A ∪ B:", A <= A | B)     # True

# べき集合の生成
from itertools import chain, combinations

def power_set(s):
    """集合 s のべき集合を返す"""
    s = list(s)
    return list(chain.from_iterable(combinations(s, r) for r in range(len(s)+1)))

ps = power_set({1, 2, 3})
print(f"P({{1,2,3}}) の要素数: {len(ps)}")  # 8 = 2^3
for subset in ps:
    print(set(subset))

# ド・モルガンの法則の検証
U = set(range(10))  # 全体集合
A2 = {1, 2, 3, 4}
B2 = {3, 4, 5, 6}
lhs = U - (A2 | B2)                  # (A ∪ B)^c
rhs = (U - A2) & (U - B2)            # A^c ∩ B^c
print("ド・モルガン検証:", lhs == rhs)  # True
```

## 使用場面

- **データベース**: SQL の JOIN・UNION・INTERSECT は集合演算に直接対応する
- **型システム**: 型推論における型の交差型・合併型は積集合・和集合の概念を用いる
- **形式的仕様記述**: Z 記法や Alloy は集合論を基盤とした仕様言語である
- **情報検索**: ブール検索（AND・OR・NOT）は集合演算で実装される

## 参考文献

- Halmos, P. R. "Naive Set Theory" (Springer)
- 松坂和夫「集合・位相入門」(岩波書店)

<AffiliateBanner site="theory_navi" />
