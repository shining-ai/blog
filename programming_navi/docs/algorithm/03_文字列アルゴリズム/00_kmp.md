import AffiliateBanner from '@site/src/components/AffiliateBanner';

# KMP法 (Knuth-Morris-Pratt)

## KMP法とは

KMP法とは、

> 文字列パターンマッチングアルゴリズムの1つ

です。
<br/>

失敗関数（failure function）を事前に計算し、ミスマッチ時に比較位置を最大限スキップします。

素朴なパターンマッチングは O(nm) ですが、KMP法は「これまで一致した文字列」の情報を使い、テキストを後退させずに O(n+m) で検索します。

## 失敗関数（Failure Function）

失敗関数 `fail[i]` は、**パターン `P[0..i]` の最長の真の接頭辞かつ接尾辞の長さ**を表します。

```
パターン: A  B  A  B
index:    0  1  2  3

fail[0] = 0  （定義）
fail[1] = 0  "AB" → 真の接頭辞{A} ∩ 真の接尾辞{B} → 一致なし
fail[2] = 1  "ABA" → 接頭辞{A,AB} ∩ 接尾辞{A,BA} → "A" が共通 → 長さ1
fail[3] = 2  "ABAB" → 接頭辞{A,AB,ABA} ∩ 接尾辞{B,AB,BAB} → "AB" が共通 → 長さ2

fail = [0, 0, 1, 2]
```

ミスマッチが起きたとき、`fail[j-1]` を参照することでパターンを最大限スキップできます。

## パターンマッチングの動作

テキスト `ABABCABAB`、パターン `ABAB` (fail=[0,0,1,2]) で説明します。

```
ABABCABAB
ABAB          → index 0 で一致（j=4→fail[3]=2）
  AB→ミスマッチ  → C と A が不一致。j=fail[1]=0 で再開
      ABAB    → index 5 で一致
```

テキストを左に戻さず、パターン側のポインタだけを `fail[j-1]` に巻き戻します。

## 計算量

| | 計算量 | 備考 |
| --- | --- | --- |
| 失敗関数の構築 | O(m) | m = パターン長 |
| 検索 | O(n) | n = テキスト長 |
| 合計 | O(n + m) | |
| 空間 | O(m) | |

## 実装

```python title="失敗関数の構築"
def compute_failure(pattern: str) -> list[int]:
    m    = len(pattern)
    fail = [0] * m
    j    = 0
    for i in range(1, m):
        while j > 0 and pattern[i] != pattern[j]:
            j = fail[j - 1]   # スキップ
        if pattern[i] == pattern[j]:
            j += 1
        fail[i] = j
    return fail
```

```python title="KMP検索"
def kmp_search(text: str, pattern: str) -> list[int]:
    n, m = len(text), len(pattern)
    if m == 0:
        return []
    fail = compute_failure(pattern)
    positions = []
    j = 0
    for i in range(n):
        while j > 0 and text[i] != pattern[j]:
            j = fail[j - 1]   # ミスマッチ → スキップ
        if text[i] == pattern[j]:
            j += 1
        if j == m:            # 全一致
            positions.append(i - m + 1)
            j = fail[j - 1]   # 次の候補を探す
    return positions
```

```python title="使用例"
print(kmp_search("ABABCABAB", "ABAB"))    # [0, 5]
print(kmp_search("AAABAAAB",  "AAAB"))   # [0, 4]
print(kmp_search("HELLO",     "WORLD"))  # []
```

## 使用場面

- **テキストエディタの検索機能**: 長いドキュメントから文字列を検索
- **バイオインフォマティクス**: DNA/RNA配列中のモチーフ検索
- **ネットワーク侵入検知**: パケットペイロードのパターン照合
- `str.find()` は多くのケースで同様の最適化を内部で行っています

## 参考文献

<AffiliateBanner site="antbook" />
