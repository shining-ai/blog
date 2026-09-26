import AffiliateBanner from '@site/src/components/AffiliateBanner';

# MapReduce

## MapReduce とは

MapReduce とは、

> 大規模データを「Map（変換）」と「Reduce（集約）」の2段階で並列処理するプログラミングモデル（Google, 2004）

です。
<br/>

各ワーカーが独立したデータ断片を処理するため、数千台のクラスターに線形スケールします。Hadoop・Spark などの基盤となる概念です。

## 処理フロー

```
入力データ（分割済み）:

  Split 0: "the cat sat"
  Split 1: "on the mat"
  Split 2: "the cat"

        ↓ Map フェーズ（各 Split を並列処理）

  Worker0: (the,1),(cat,1),(sat,1)
  Worker1: (on,1),(the,1),(mat,1)
  Worker2: (the,1),(cat,1)

        ↓ Shuffle & Sort（キーでグループ化）

  cat  → [1, 1]
  mat  → [1]
  on   → [1]
  sat  → [1]
  the  → [1, 1, 1]

        ↓ Reduce フェーズ（キーごとに集約）

  cat→2, mat→1, on→1, sat→1, the→3
```

## 計算量

| フェーズ | 計算量 | 備考 |
| --- | --- | --- |
| Map | O(n / p) | n=データ量, p=ワーカー数 |
| Shuffle | O((n/p) log(n/p)) | ネットワーク転送がボトルネック |
| Reduce | O(n / p) | 各キーグループを独立処理 |
| 全体 | O(n/p + comm) | comm = 通信コスト |

## 実装

```python title="Python でワードカウント（MapReduce パターン）"
from collections import defaultdict
from multiprocessing import Pool

# ── Map 関数 ──────────────────────────────────────
def map_fn(text: str) -> list[tuple[str, int]]:
    """テキストを (単語, 1) のペアリストに変換"""
    return [(word.lower(), 1) for word in text.split()]

# ── Shuffle（グループ化）──────────────────────────
def shuffle(pairs: list[tuple]) -> dict[str, list[int]]:
    """同一キーの値をまとめる"""
    groups: dict[str, list[int]] = defaultdict(list)
    for key, val in pairs:
        groups[key].append(val)
    return dict(groups)

# ── Reduce 関数 ───────────────────────────────────
def reduce_fn(item: tuple[str, list[int]]) -> tuple[str, int]:
    """キーごとに値を合計"""
    key, values = item
    return key, sum(values)

# ── MapReduce 実行 ────────────────────────────────
def mapreduce_wordcount(documents: list[str], n_workers: int = 4) -> dict[str, int]:
    # Map（並列）
    with Pool(n_workers) as pool:
        map_results = pool.map(map_fn, documents)

    # Shuffle（全ペアを集める）
    all_pairs = [pair for result in map_results for pair in result]
    grouped = shuffle(all_pairs)

    # Reduce（並列）
    with Pool(n_workers) as pool:
        reduce_results = pool.map(reduce_fn, grouped.items())

    return dict(reduce_results)

if __name__ == "__main__":
    docs = [
        "the cat sat on the mat",
        "the cat in the hat",
        "one fish two fish red fish blue fish",
    ]
    counts = mapreduce_wordcount(docs)
    for word, cnt in sorted(counts.items(), key=lambda x: -x[1])[:5]:
        print(f"{word}: {cnt}")
```

```python title="集計系の MapReduce（売上集計）"
from multiprocessing import Pool
from collections import defaultdict

# データ: (商品カテゴリ, 売上)
sales_data = [
    ("electronics", 150), ("clothing", 80),  ("electronics", 200),
    ("food", 30),          ("clothing", 120), ("electronics", 90),
    ("food", 60),          ("food", 45),      ("clothing", 200),
]

def map_sales(record: tuple) -> tuple[str, float]:
    category, amount = record
    return category, amount

def reduce_sum(item: tuple[str, list]) -> tuple[str, float]:
    key, values = item
    return key, sum(values)

def mapreduce(data, map_fn, reduce_fn, n_workers=4):
    with Pool(n_workers) as pool:
        pairs = pool.map(map_fn, data)

    # Shuffle
    groups = defaultdict(list)
    for k, v in pairs:
        groups[k].append(v)

    with Pool(n_workers) as pool:
        results = pool.map(reduce_fn, groups.items())

    return dict(results)

if __name__ == "__main__":
    result = mapreduce(sales_data, map_sales, reduce_sum)
    for cat, total in sorted(result.items()):
        print(f"{cat}: {total}")
    # clothing: 400, electronics: 440, food: 135
```

```python title="Combiner（ローカル集約で通信削減）"
from collections import defaultdict

def map_with_combiner(text: str) -> list[tuple[str, int]]:
    """
    Combiner: Map 直後にローカルで集約することで
    Shuffle の通信量を削減する
    """
    local_count: dict[str, int] = defaultdict(int)
    for word in text.split():
        local_count[word.lower()] += 1
    return list(local_count.items())  # ローカル集約済みペア

# 通信データ量の比較
text = "the cat sat on the mat the cat"
# Combiner なし: [('the',1),('cat',1),('sat',1),('on',1),('the',1),('mat',1),('the',1),('cat',1)] → 8ペア
# Combiner あり: [('the',3),('cat',2),('sat',1),('on',1),('mat',1)] → 5ペア
print(map_with_combiner(text))
```

```python title="mrjob による Hadoop MapReduce（本番向け）"
# pip install mrjob
from mrjob.job import MRJob
import re

WORD_RE = re.compile(r"[\w']+")

class MRWordCount(MRJob):

    def mapper(self, _, line):
        for word in WORD_RE.findall(line.lower()):
            yield word, 1

    def combiner(self, word, counts):
        yield word, sum(counts)

    def reducer(self, word, counts):
        yield word, sum(counts)

if __name__ == "__main__":
    MRWordCount.run()
    # 実行: python wordcount.py input.txt
    # Hadoop: python wordcount.py -r hadoop hdfs:///input/
```

## Hadoop / Spark との関係

| | Hadoop MapReduce | Apache Spark |
| --- | --- | --- |
| 処理モデル | ディスクベース | インメモリ |
| 速度 | 遅い（I/O多） | 最大100倍高速 |
| API | Java/Python | Python/Scala/SQL |
| 適用 | バッチ・大規模 | バッチ+ストリーム |
| MapReduce との関係 | 直接実装 | 内部でDAGに変換 |

## 使用場面

- **ログ解析**: アクセスログの集計・エラー集約
- **検索エンジン**: 転置インデックスの構築
- **機械学習**: 分散特徴量計算・パラメータ更新
- **ETL処理**: 大規模データの変換・集約

## 参考文献

<AffiliateBanner site="antbook" />
