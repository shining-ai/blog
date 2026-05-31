import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ヒープソート (Heap Sort)

## ヒープソートとは

ヒープソートとは、

> 最大ヒープを構築してから、最大値を末尾へ順に移動させることでソートするアルゴリズム

です。
<br/>

ヒープ（二分ヒープ）データ構造を利用することで、最悪ケースでも O(n log n) を保証しながら追加メモリを使わずインプレースでソートできます。

## ヒープの構造

ヒープは完全二分木で、**親 ≥ 子** を常に満たします（最大ヒープの場合）。
配列で表現でき、index `i` のノードに対して:
- 左の子: `2i + 1`
- 右の子: `2i + 2`
- 親: `(i - 1) // 2`

![heapソートの概要](https://res.cloudinary.com/dtilrevrm/image/upload/v1780244493/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%891_t2p1kp.jpg)


## アルゴリズムの手順

**ステップ1: ソート**
最大値（root）を末尾と交換し、ヒープサイズを1減らしてヒープ性質を修復します。

**ステップ2: ヒープ構築（heapify）**
配列を最大ヒープに変換します。

![heapソートのステップ](https://res.cloudinary.com/dtilrevrm/image/upload/v1780244493/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%892_rjk3ll.jpg)


## 計算量

| | 計算量 | 備考 |
| --- | --- | --- |
| 最良 | O(n log n) | |
| 平均 | O(n log n) | |
| 最悪 | O(n log n) | クイックソートと異なり最悪でも保証 |
| 空間 | O(1) | インプレース |
| 安定性 | 不安定 | 遠くの要素を交換するため |

ヒープ構築は O(n)（bottom-up heapify）、各要素の取り出しに O(log n) かかるため合計 O(n log n) です。

## 実装

```python title="ヒープソート"
def heap_sort(arr: list) -> list:
    n = len(arr)

    # フェーズ1: 最大ヒープを構築
    # 最後の非葉ノードから bottom-up に heapify
    for i in range(n // 2 - 1, -1, -1):
        _heapify(arr, n, i)

    # フェーズ2: 最大値を末尾へ移動
    for i in range(n - 1, 0, -1):
        arr[0], arr[i] = arr[i], arr[0]  # root（最大値）を末尾へ
        _heapify(arr, i, 0)              # ヒープを修復

    return arr

def _heapify(arr: list, n: int, i: int):
    """index i を root とするサブツリーをヒープ化（サイズ n）"""
    largest = i
    left  = 2 * i + 1
    right = 2 * i + 2

    if left  < n and arr[left]  > arr[largest]:
        largest = left
    if right < n and arr[right] > arr[largest]:
        largest = right

    if largest != i:
        arr[i], arr[largest] = arr[largest], arr[i]
        _heapify(arr, n, largest)  # 再帰的に修復
```

```python title="使用例"
arr = [5, 3, 8, 1, 2]
print(heap_sort(arr))  # [1, 2, 3, 5, 8]
```

### Python の heapq を使う方法

```python title="heapq を使った実装"
import heapq

def heap_sort_heapq(arr: list) -> list:
    heapq.heapify(arr)          # O(n) で最小ヒープ構築
    return [heapq.heappop(arr) for _ in range(len(arr))]  # O(n log n)
```

:::info 最小ヒープと最大ヒープ
Python の `heapq` は**最小ヒープ**のみ提供します。
最大ヒープが必要な場合は値を負にして格納する（`-value`）か、
ラッパークラスを使います。
:::

### 長所

- 最良・平均・最悪すべて O(n log n) を保証する
- 追加メモリが不要（インプレース）
- ヒープ構造の理解がそのままデータ構造（優先度付きキュー）にも活きる

### 短所

- 不安定ソートのため同値要素の順序が保証されない
- クイックソートと比べてキャッシュ効率が悪く実測値がやや遅い
- 実装がバブルソート・挿入ソートより複雑

## 使用場面

- **最悪ケース O(n log n) を保証しつつ O(1) 空間が必要なとき**
- **優先度付きキュー**: ヒープソートの応用として、`heapq` モジュールがそのまま使える
- クイックソートより定数係数が大きいため、一般的な用途では実測値がやや遅い

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
