import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ヒープ (Heap)

## ヒープとは

ヒープとは、

> 親ノードが常に子ノード以下（または以上）の値を持つ完全二分木

です。
<br/>

![ヒープ](https://res.cloudinary.com/dtilrevrm/image/upload/v1777945891/%E3%83%92%E3%83%BC%E3%83%97_kiz7pm.jpg)

根（ルート）に常に最小値または最大値が存在するため、最小・最大要素の取得がO(1)で行えます。

**優先度付きキュー**の実装に広く使われます。

## 最小ヒープと最大ヒープ

| 種類 | 根の値 | 親子関係 |
| --- | --- | --- |
| **最小ヒープ（Min Heap）** | 最小値 | 親 ≤ 子 |
| **最大ヒープ（Max Heap）** | 最大値 | 親 ≥ 子 |

![最小ヒープと最大ヒープ](https://res.cloudinary.com/dtilrevrm/image/upload/v1777945901/%E3%83%92%E3%83%BC%E3%83%97_%E6%9C%80%E5%B0%8F_%E6%9C%80%E5%A4%A7_vp9qr0.jpg)

## ヒープの操作
### 挿入(push)
新たな要素を追加する場合は、末尾に追加して上に浮かせていきます。

![ヒープの挿入処理1](https://res.cloudinary.com/dtilrevrm/image/upload/v1777945898/%E3%83%92%E3%83%BC%E3%83%97_%E8%BF%BD%E5%8A%A01_tahbol.jpg)
![ヒープの挿入処理2](https://res.cloudinary.com/dtilrevrm/image/upload/v1777945896/%E3%83%92%E3%83%BC%E3%83%97_%E8%BF%BD%E5%8A%A02_auccs1.jpg)

### 削除(pop)
根の取り出しをする場合は、根を取り出して末尾を配置します。

![ヒープの削除処理1](https://res.cloudinary.com/dtilrevrm/image/upload/v1777946445/%E3%83%92%E3%83%BC%E3%83%97_%E5%89%8A%E9%99%A41_qkqerp.jpg)
![ヒープの削除処理2](https://res.cloudinary.com/dtilrevrm/image/upload/v1777946446/%E3%83%92%E3%83%BC%E3%83%97_%E5%89%8A%E9%99%A42_z2x1a6.jpg)


## 計算量

| 操作 | 計算量 | 備考 |
| --- | --- | --- |
| 最小（最大）値の取得 | O(1) | 根を参照するだけ |
| 挿入（push） | O(log n) | 末尾追加後に上方バブル |
| 最小（最大）値の削除（pop） | O(log n) | 根削除後に下方バブル |
| ヒープ構築（heapify） | O(n) | |

## 配列による管理

ヒープは配列で効率的に表現できます。

親子関係のルールは、インデックス`i`に対して以下のようになります。

- 左の子: `2 × i + 1`
- 右の子: `2 × i + 2`
- 親: `(i - 1) // 2`

![配列による実装](https://res.cloudinary.com/dtilrevrm/image/upload/v1777800664/%E4%BA%8C%E5%88%86%E6%9C%A8_%E9%85%8D%E5%88%97_kzheef.jpg)

## 実装方法
### 最小ヒープの実装

Pythonでは `heapq` モジュールで最小ヒープを実装できます。

```python title="基本操作"
import heapq

# ヒープの作成（最小ヒープ）
heap = []

# 挿入 O(log n)
heapq.heappush(heap, 5)
heapq.heappush(heap, 1)
heapq.heappush(heap, 3)
heapq.heappush(heap, 2)
print(heap)  # [1, 2, 3, 5]（ヒープ順）

# 最小値の取得 O(1)
print(heap[0])  # 1

# 最小値の取り出し O(log n)
print(heapq.heappop(heap))  # 1
print(heapq.heappop(heap))  # 2
```

```python title="リストからヒープを作成"
nums = [5, 3, 8, 1, 4]
heapq.heapify(nums)  # O(n)
print(nums)  # [1, 3, 8, 5, 4]（ヒープ順）
```

### 最大ヒープの実装

Pythonの `heapq` は最小ヒープのみですが、値を負にすることで最大ヒープとして使えます。

```python title="最大ヒープ（値を負にする）"
max_heap = []
for v in [5, 1, 3, 2, 4]:
    heapq.heappush(max_heap, -v)

print(-heapq.heappop(max_heap))  # 5（最大値）
print(-heapq.heappop(max_heap))  # 4
```

## 参考文献

<AffiliateBanner site="tessoku" />

[heapq --- ヒープキューアルゴリズム — Python 3.12.3 ドキュメント](https://docs.python.org/ja/3/library/heapq.html)
