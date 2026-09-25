import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Aho-Corasick法

## Aho-Corasick法とは

Aho-Corasick法とは、

> 複数のパターンを同時に検索するため、トライ木に失敗リンク（KMPの失敗関数の拡張）を追加したオートマトンを用いるアルゴリズム

です。
<br/>

k 個のパターンをトライ木に登録し、失敗リンクを構築することで、テキストを**1度スキャンするだけで全パターンの出現を O(n + Σm + z) で検出**できます。

## 構造の概要

```
パターン: {"ab", "bc", "abc"}

トライ木:
    root
    ├─ a ─ b*(ab) ─ c*(abc)
    └─ b ─ c*(bc)

失敗リンク（破線矢印）:
    state(a)   → root
    state(ab)  → state(b)    （"ab" の接尾辞 "b" がトライ内に存在）
    state(abc) → state(bc)   （"abc" の接尾辞 "bc" がトライ内に存在）
    state(b)   → root
    state(bc)  → root
```

失敗リンクは KMP の失敗関数を「トライ全体に拡張したもの」で、マッチ失敗時に次に試すべき状態を指します。

## アルゴリズムの手順

1. **トライ構築**: 全パターンをトライ木に挿入
2. **失敗リンク構築**: BFSで各ノードの失敗リンクを設定
3. **検索**: テキストを1文字ずつ読みながらオートマトンを遷移し、出力ノードで一致を記録

## 計算量

| 操作 | 計算量 | 備考 |
| --- | --- | --- |
| トライ構築 | O(Σmᵢ) | 全パターンの長さの合計 |
| 失敗リンク構築 | O(Σmᵢ) | BFS |
| 検索 | O(n + z) | n=テキスト長, z=一致数 |
| 空間 | O(Σmᵢ × |Σ|) | |Σ|=アルファベットサイズ |

## 実装

```python title="Aho-Corasick法"
from collections import deque

class AhoCorasick:
    def __init__(self):
        # goto[state][char] = 次の状態
        self.goto   = [{}]
        self.fail   = [0]
        self.output = [[]]  # 各状態に対応するパターンIDリスト

    def add_pattern(self, pattern: str, pattern_id: int):
        """パターンをトライ木に追加"""
        cur = 0
        for c in pattern:
            if c not in self.goto[cur]:
                self.goto[cur][c] = len(self.goto)
                self.goto.append({})
                self.fail.append(0)
                self.output.append([])
            cur = self.goto[cur][c]
        self.output[cur].append(pattern_id)

    def build(self):
        """BFS で失敗リンクを構築"""
        q = deque()
        # 深さ1のノードの失敗リンクは root(=0)
        for c, s in self.goto[0].items():
            self.fail[s] = 0
            q.append(s)

        while q:
            r = q.popleft()
            for c, s in self.goto[r].items():
                q.append(s)
                # 失敗リンクを辿って c へ遷移できる状態を探す
                state = self.fail[r]
                while state != 0 and c not in self.goto[state]:
                    state = self.fail[state]
                self.fail[s] = self.goto[state].get(c, 0)
                if self.fail[s] == s:
                    self.fail[s] = 0
                # output リンクの継承
                self.output[s] = self.output[s] + self.output[self.fail[s]]

    def search(self, text: str) -> list[tuple[int, int]]:
        """テキストから全パターンを検索
        Returns: [(終了位置, パターンID), ...]
        """
        cur     = 0
        results = []
        for i, c in enumerate(text):
            # 失敗リンクを辿って c への遷移を探す
            while cur != 0 and c not in self.goto[cur]:
                cur = self.fail[cur]
            cur = self.goto[cur].get(c, 0)
            # 現在状態で一致するパターンを記録
            for pid in self.output[cur]:
                results.append((i, pid))
        return results
```

```python title="使用例"
patterns = ["ab", "bc", "abc"]
ac = AhoCorasick()
for i, p in enumerate(patterns):
    ac.add_pattern(p, i)
ac.build()

text = "xabcyz"
matches = ac.search(text)
for end_pos, pid in matches:
    p = patterns[pid]
    print(f"'{p}' found at [{end_pos - len(p) + 1}:{end_pos + 1}]")
# 'ab'  found at [1:3]
# 'abc' found at [1:4]
# 'bc'  found at [2:4]
```

```python title="実用的な複数パターン検索"
def multi_search(text: str, patterns: list[str]) -> dict[str, list[int]]:
    """各パターンの出現開始位置一覧を返す"""
    ac = AhoCorasick()
    for i, p in enumerate(patterns):
        ac.add_pattern(p, i)
    ac.build()

    results = {p: [] for p in patterns}
    for end_pos, pid in ac.search(text):
        p = patterns[pid]
        results[p].append(end_pos - len(p) + 1)
    return results

r = multi_search("abcabcabc", ["ab", "bc", "abc"])
print(r)
# {'ab': [0, 3, 6], 'bc': [1, 4, 7], 'abc': [0, 3, 6]}
```

## KMP法との関係

| | KMP | Aho-Corasick |
| --- | --- | --- |
| パターン数 | 1 | 複数 |
| データ構造 | 失敗関数（配列） | トライ + 失敗リンク |
| 検索 | O(n + m) | O(n + Σm + z) |
| 考え方 | 同一（失敗リンクはKMPの拡張） | |

## 使用場面

- **ウイルス対策ソフト**: 複数のシグネチャパターンをテキスト/バイナリから同時検索
- **grep / ripgrep**: 複数キーワードの同時検索
- **ネットワーク侵入検知（IDS/IPS）**: パケットペイロードの多パターンマッチング
- **テキストマイニング**: 大量の辞書語を文章から同時に抽出

## 参考文献

<AffiliateBanner site="antbook" />
