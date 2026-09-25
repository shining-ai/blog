import AffiliateBanner from '@site/src/components/AffiliateBanner';

# オンラインアルゴリズム (Online Algorithm)

## オンラインアルゴリズムとは

オンラインアルゴリズムとは、

> 入力を**順次受け取りながら**、将来の入力を知らない状態で即座に意思決定を行うアルゴリズム設計戦略

です。

対義語は**オフラインアルゴリズム**（入力全体を見てから最適解を計算）です。
ストリーミング処理・リアルタイムシステム・ページ置換など、将来が見えない環境で広く使われます。

## オンライン vs オフライン

```
オフラインアルゴリズム:
  入力: [1, 5, 3, 2, 8, 4, 7]  ← すべて既知
  処理: 全体を見て最適解を計算
  最適解が保証される

オンラインアルゴリズム:
  入力: 1 → ? → ? → ? → ...   ← 逐次到着
  処理: 各時点で即座に決定
  最適解は保証されない
```

## 競合比（Competitive Ratio）

```
オンラインアルゴリズムの性能を評価する指標:

  CR = sup_I ( ALG(I) / OPT(I) )

  ALG(I) : オンラインアルゴリズムのコスト
  OPT(I) : 最適オフラインアルゴリズムのコスト

  CR = 1    → 最適（将来を知らなくても最適）
  CR = k    → 最悪でも最適解の k 倍以内
```

## 代表的な問題

### スキーレンタル問題

```
問題: スキーを借りる（1日1円）か買う（k円）かを毎日決める
      何日スキーをするかは事前不明

分析:
  最適戦略（後から見て）:
    ・d日以下: 借り続ける
    ・d日以上: 初日から買う

  オンライン戦略（ブレークイーブン）:
    k日間は借り続け、k+1日目に買う

  競合比:
    借り続ける場合 (d ≤ k): CR = k/d ≤ k  → 最悪 CR = 2
    買う場合 (d > k):        CR ≈ 2k/d → 最悪 CR = 2
    → 競合比 = 2（最適のオンライン戦略）
```

### ページ置換アルゴリズム

```
問題: キャッシュに k ページを保持し、ページフォルト時に
      どのページを追い出すかを決める

                [要求列: A B C D A B E A B C D E]
                キャッシュサイズ: 3

  OPT（最適オフライン）:
    最も遠い将来に使われるページを追い出す
    フォルト数: 4

  LRU（最近最も使われていない）:
    最も長く使われていないページを追い出す
    競合比: k （k はキャッシュサイズ）

  LFU（最も使用頻度が低い）:
    使用回数が最少のページを追い出す
    競合比: 無限大（最悪ケース）
```

### オンラインスケジューリング

```
問題: ジョブを m 台のマシンに割り当て、完了時間を最小化

グリーディ（List Scheduling）:
  各ジョブを最も負荷の小さいマシンに割り当てる

  競合比: 2 - 1/m
  例 (m=2): 最悪でも最適解の 1.5 倍
```

## 競合比の一覧

| 問題 | アルゴリズム | 競合比 |
| --- | --- | --- |
| スキーレンタル | Break-Even | 2 |
| ページ置換 | LRU | k（キャッシュサイズ） |
| オンラインスケジューリング | List Scheduling | 2 - 1/m |
| 秘書問題 | 1/e 戦略 | e ≈ 2.718 |
| k-server 問題 | WFA | 2k - 1 |

## 実装

```python title="LRU キャッシュ（ページ置換）"
from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache = OrderedDict()   # 挿入順を保持

    def get(self, key: int) -> int:
        if key not in self.cache:
            return -1               # キャッシュミス
        self.cache.move_to_end(key)  # 最近使用済みに更新
        return self.cache[key]

    def put(self, key: int, value: int) -> None:
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)   # LRU ページを追い出す
```

```python title="オンラインスケジューリング（List Scheduling）"
import heapq

def list_scheduling(jobs: list[int], m: int) -> int:
    """m 台のマシンにジョブを割り当て、最大完了時間を返す"""
    # (現在の負荷, マシン番号) の最小ヒープ
    machines = [(0, i) for i in range(m)]
    heapq.heapify(machines)

    for job in jobs:
        load, machine = heapq.heappop(machines)
        heapq.heappush(machines, (load + job, machine))

    return max(load for load, _ in machines)
```

```python title="秘書問題（1/e 戦略）"
import math

def secretary_problem(candidates: list[int]) -> int:
    """
    n 人の候補を順に面接し、最高の人を採用する確率を最大化する
    最初の n/e 人を観察のみ（基準設定）、その後最高を採用
    """
    n = len(candidates)
    threshold = int(n / math.e)   # 最初の n/e 人は不採用

    # 最初の threshold 人で基準を設定
    best_so_far = max(candidates[:threshold]) if threshold > 0 else float('-inf')

    # 残りで基準を超えた最初の人を採用
    for candidate in candidates[threshold:]:
        if candidate > best_so_far:
            return candidate

    return candidates[-1]   # 最後の候補を採用
```

## ランダム化オンラインアルゴリズム

```
ランダム性で競合比を改善できる場合がある:

スキーレンタル問題:
  決定的: 競合比 2
  ランダム化: 期待競合比 e/(e-1) ≈ 1.58

ページ置換（MARK アルゴリズム）:
  キャッシュサイズ k に対して
  期待競合比 O(log k)
  （決定的 LRU は競合比 k）
```

## 使用場面

- **ページ置換**: OS のキャッシュ管理（LRU・LFU・FIFO）
- **ネットワーク**: パケット処理・バッファ管理
- **リアルタイムスケジューリング**: タスク割り当て
- **金融取引**: 株式売買・オークション入札
- **ストリーミング**: データストリームのサンプリング・集約

## 参考文献

<AffiliateBanner site="antbook" />
