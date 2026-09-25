import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Boyer-Moore法

## Boyer-Moore法とは

Boyer-Moore法とは、

> パターンを右から左へ照合し、ミスマッチ時に「不良文字規則」と「既出接尾辞規則」の2つのヒューリスティクスで大きくスキップするパターンマッチングアルゴリズム

です。
<br/>

**平均・最良ケースで O(n/m) の亜線形性能**を持ち、大きなアルファベット（英文テキスト、DNA等）では実用上最も高速なアルゴリズムの一つです。

## 右から左へのスキャン

Boyer-Mooreは他のアルゴリズムと逆方向に照合します。

```
テキスト:   X B C B A B C A B C
パターン:   A B C

↓ ウィンドウをパターン長ずつスライドし、右端から照合
```

右端から照合することで、ミスマッチ発生時に得られる情報が最大化されます。

## 不良文字規則（Bad Character Rule）

ミスマッチが発生した文字（不良文字）をパターン内の**最右出現位置**に合わせてシフトします。

```
テキスト:  X B C B A B C A B C
パターン:  A B C
           ↑ ↑ ↑
           j=2 から右←左に照合

j=2: C=C ✓
j=1: B=B ✓
j=0: A≠X  ← ミスマッチ。不良文字 = X

X はパターンに存在しない → パターン全体をスキップ（3文字シフト）

テキスト:  X B C B A B C A B C
パターン:        A B C
j=2: C=C ✓
j=1: B=B ✓
j=0: A≠B  ← ミスマッチ。不良文字 = B

B のパターン内最右位置 = 1 → シフト量 = (2-1) = 1

テキスト:  X B C B A B C A B C
パターン:          A B C
j=2: C=C ✓, j=1: B=B ✓, j=0: A=A ✓  → 発見！（位置4）
```

## 既出接尾辞規則（Good Suffix Rule）

ミスマッチ前に一致した接尾辞部分（good suffix）を使い、さらに大きなシフトを行います。
不良文字規則と組み合わせて**大きい方のシフト量**を採用します。

## 計算量

| | 計算量 | 条件 |
| --- | --- | --- |
| 前処理 | O(m + |Σ|) | |Σ| = アルファベットサイズ |
| 最良 | O(n/m) | 大きなアルファベット・パターンが非繰り返し |
| 平均 | O(n/m) | ランダムなテキスト |
| 最悪 | O(nm) | 繰り返しパターン（例: aaaaa）|
| 空間 | O(m + |Σ|) | |

## 実装（不良文字規則版）

```python title="Boyer-Moore（不良文字規則）"
def bad_char_table(pattern: str) -> dict[str, int]:
    """各文字のパターン内最右出現位置"""
    return {c: i for i, c in enumerate(pattern)}

def boyer_moore(text: str, pattern: str) -> list[int]:
    n, m = len(text), len(pattern)
    if m == 0:
        return []
    bad_char = bad_char_table(pattern)
    positions = []
    s = 0  # テキスト上のウィンドウ開始位置
    while s <= n - m:
        j = m - 1  # パターンの右端から照合
        while j >= 0 and pattern[j] == text[s + j]:
            j -= 1
        if j < 0:   # 全一致
            positions.append(s)
            s += m - bad_char.get(text[s + m], -1) if s + m < n else 1
        else:
            # 不良文字のパターン内最右位置
            bc_shift = j - bad_char.get(text[s + j], -1)
            s += max(1, bc_shift)
    return positions
```

```python title="使用例"
print(boyer_moore("XBCBABCABC", "ABC"))  # [4, 7]
print(boyer_moore("AAAA",       "AA"))   # [0, 1, 2]
```

### Boyer-Moore-Horspool（簡略版）

既出接尾辞規則を省いた簡略版で、実用上十分な性能を持ちます。

```python title="Boyer-Moore-Horspool"
def bmh_search(text: str, pattern: str) -> list[int]:
    """不良文字規則のみを使う簡略版"""
    n, m = len(text), len(pattern)
    if m == 0:
        return []
    # シフトテーブル: 各文字のパターン末尾からの距離
    shift = {c: m - 1 - i for i, c in enumerate(pattern[:-1])}
    positions = []
    i = m - 1
    while i < n:
        j, k = m - 1, i
        while j >= 0 and pattern[j] == text[k]:
            j -= 1; k -= 1
        if j < 0:
            positions.append(k + 1)
        i += shift.get(text[i], m)
    return positions
```

## 使用場面

- **テキスト検索エンジン**: 英文テキストなど大きなアルファベットでの全文検索
- **grep コマンド**: GNU grep は Boyer-Moore-Horspool を採用
- **バイナリファイル検索**: バイト値（256種類）の探索
- **大きなアルファベット**: 日本語（ Unicode）も効率的に処理可能

## 参考文献

<AffiliateBanner site="antbook" />
