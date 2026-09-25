import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Rabin-Karp法

## Rabin-Karp法とは

Rabin-Karp法とは、

> ハッシュ関数を使ってパターンと同じ長さのウィンドウのハッシュ値を比較し、一致候補のみ文字列比較を行うパターンマッチングアルゴリズム

です。
<br/>

文字ごとの比較ではなく**ハッシュ値の比較**に置き換えることで、ウィンドウのスライドを O(1) で行えます。特に**複数パターンの同時検索**に優れています。

## ローリングハッシュ

ウィンドウを1文字右にスライドするとき、先頭文字を引いて末尾文字を追加するだけでハッシュを O(1) で更新できます。

```
テキスト: A B C D E
ハッシュ: h("ABC") = A*base² + B*base + C

スライド後:
h("BCD") = h("ABC") - A*base²   ← 先頭を除去
         = (result) * base + D  ← 末尾を追加
```

多項式ハッシュ（mod p）を使うことで大きな数値を扱います。

## ハッシュ衝突への対処

ハッシュ値が一致しても文字列が一致しない（**偽陽性**）ことがあります。
ハッシュ一致時は必ず文字列比較で検証します。

**ダブルハッシュ**（2つの異なる素数でハッシュ）を使うと衝突確率を極めて低くできます。

## 計算量

| | 計算量 | 条件 |
| --- | --- | --- |
| 前処理 | O(m) | ハッシュ計算 |
| 検索（平均） | O(n + m) | 衝突が少ない場合 |
| 検索（最悪） | O(nm) | 衝突が多い場合 |
| k パターン同時 | O(n + Σmᵢ) | ハッシュセット使用 |

## 実装

```python title="Rabin-Karp法"
def rabin_karp(text: str, pattern: str,
               base: int = 131, mod: int = 10**9 + 7) -> list[int]:
    n, m = len(text), len(pattern)
    if m > n:
        return []

    power = pow(base, m - 1, mod)  # base^(m-1) mod p

    # パターンと最初のウィンドウのハッシュを計算
    ph = th = 0
    for i in range(m):
        ph = (ph * base + ord(pattern[i])) % mod
        th = (th * base + ord(text[i]))    % mod

    positions = []
    for i in range(n - m + 1):
        if ph == th:
            # ハッシュ一致 → 文字列比較で検証（偽陽性の除去）
            if text[i:i + m] == pattern:
                positions.append(i)

        # ウィンドウをスライド（ローリングハッシュ）
        if i < n - m:
            th = (th - ord(text[i]) * power) % mod
            th = (th * base + ord(text[i + m])) % mod

    return positions
```

```python title="使用例"
print(rabin_karp("ABCABCABC", "ABC"))  # [0, 3, 6]
print(rabin_karp("AAAA", "AA"))        # [0, 1, 2]
```

### ダブルハッシュ（衝突耐性強化版）

```python title="ダブルハッシュによる高信頼マッチング"
def double_hash_search(text: str, pattern: str) -> list[int]:
    B1, M1 = 131,  10**9 + 7
    B2, M2 = 137,  10**9 + 9

    n, m = len(text), len(pattern)
    pw1, pw2 = pow(B1, m-1, M1), pow(B2, m-1, M2)
    ph1 = ph2 = th1 = th2 = 0

    for i in range(m):
        ph1 = (ph1 * B1 + ord(pattern[i])) % M1
        ph2 = (ph2 * B2 + ord(pattern[i])) % M2
        th1 = (th1 * B1 + ord(text[i])) % M1
        th2 = (th2 * B2 + ord(text[i])) % M2

    positions = []
    for i in range(n - m + 1):
        if ph1 == th1 and ph2 == th2:     # 2つのハッシュが一致
            positions.append(i)
        if i < n - m:
            th1 = (th1 - ord(text[i]) * pw1) % M1
            th1 = (th1 * B1 + ord(text[i+m])) % M1
            th2 = (th2 - ord(text[i]) * pw2) % M2
            th2 = (th2 * B2 + ord(text[i+m])) % M2
    return positions
```

### 複数パターンの同時検索

```python title="複数パターン同時検索"
def multi_pattern_search(text: str, patterns: list[str]) -> dict:
    """パターンごとに一致位置を返す"""
    results = {p: [] for p in patterns}
    # 同じ長さのパターンをまとめてハッシュセットで処理
    from collections import defaultdict
    by_len = defaultdict(list)
    for p in patterns:
        by_len[len(p)].append(p)

    for m, pats in by_len.items():
        hash_map = {}
        B, M = 131, 10**9 + 7
        for p in pats:
            h = 0
            for c in p:
                h = (h * B + ord(c)) % M
            hash_map[h] = p   # ハッシュ → パターン

        pw = pow(B, m - 1, M)
        th = 0
        for i in range(m):
            th = (th * B + ord(text[i])) % M
        for i in range(len(text) - m + 1):
            if th in hash_map:
                p = hash_map[th]
                if text[i:i+m] == p:
                    results[p].append(i)
            if i < len(text) - m:
                th = (th - ord(text[i]) * pw) % M
                th = (th * B + ord(text[i+m])) % M
    return results
```

## 使用場面

- **コピー検出（剽窃チェック）**: 長いテキスト中に既知のフレーズが含まれるか
- **複数パターン同時マッチング**: ハッシュセットにより O(n) で全パターンを同時処理
- **ゲノム配列検索**: 複数のモチーフを同時に検索

## 参考文献

<AffiliateBanner site="antbook" />
