import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Bellman-Ford法

## Bellman-Ford法とは

Bellman-Ford法とは、

> 重み付きグラフにおいて最短経路を求めるアルゴリズムの一つ

です。
<br/>

最小経路とはスタートからゴールまでに通るパスの和が最小になるもののことです。

以下の例では、AからFまでの最短経路はA→D→E→B→C→Fとなります。

![最短経路とは](https://res.cloudinary.com/dtilrevrm/image/upload/v1780819682/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%891_reo2iu.jpg)

ベルマンフォード法では負の重みを持つ辺が含まれていても適用可能です。

さらに負閉路（負の重みの総和が負になる閉路）の検出もできます。

最短経路を求める方法は他にも、ダイクストラ法やワーシャルフロイドのアルゴリズムなどがあります。


## 動作の概要

### 1. 初期化

スタート地点を設定し、スタートから各頂点への距離を無限大（∞）に設定します。

ただし、スタート自身の距離は0とします。

![ベルマンフォード法の初期化](https://res.cloudinary.com/dtilrevrm/image/upload/v1780819685/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%892_jcmhcj.jpg)

### 2. 辺の隣接ノードの距離を更新

全ての辺の中から、1つを選択します。(辺はどの順番で選んでも問題ありません。)

その辺を確定済みにして、隣接する頂点の距離を更新します。

更新する距離の計算は、

> 隣接する頂点までの距離 + 辺の重み

で計算し、これが既存の距離よりも小さい場合に更新します。

![ベルマンフォード法の距離更新](https://res.cloudinary.com/dtilrevrm/image/upload/v1780819687/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%893_l5hlho.jpg)

これを全ての辺に対して行います。

![ベルマンフォード法で全ての辺に対して距離更新](https://res.cloudinary.com/dtilrevrm/image/upload/v1780819689/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%894_weytac.jpg)

![ベルマンフォード法で全ての辺に対して距離更新2](https://res.cloudinary.com/dtilrevrm/image/upload/v1780819691/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%895_kjlyxw.jpg)
### 3. 繰り返し

「2. 辺の隣接ノードの距離を更新」を(頂点の数 – 1)回繰り返します。

全ての頂点の値が変化しなくなり、最短距離が求められます。

**2回目の更新**

![ベルマンフォード法の2回目の更新](https://res.cloudinary.com/dtilrevrm/image/upload/v1780819693/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%896_ub1krp.jpg)

![ベルマンフォード法の2回目の更新2](https://res.cloudinary.com/dtilrevrm/image/upload/v1780819696/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%897_wxw5et.jpg)

**3回目の更新**

![ベルマンフォード法の3回目の更新](https://res.cloudinary.com/dtilrevrm/image/upload/v1780819679/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%898_y3pnwv.jpg)

![ベルマンフォード法の3回目の更新2](https://res.cloudinary.com/dtilrevrm/image/upload/v1780819680/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%899_rmyu8e.jpg)

もし、頂点の値の変化が止まらない場合は負の閉路が存在していると判断できます。


## 計算量

| | 計算量 |
| --- | --- |
| 時間 | O(VE) |
| 空間 | O(V) |

## 実装

```python title="Bellman-Ford法"
def bellman_ford(
    n: int,
    edges: list[tuple[int, int, int]],
    start: int,
) -> tuple[list[float], bool]:
    """
    edges = [(u, v, weight), ...]
    Returns: (dist[], has_negative_cycle)
    """
    INF  = float('inf')
    dist = [INF] * (n + 1)
    dist[start] = 0

    for i in range(n):
        updated = False
        for u, v, w in edges:
            if dist[u] < INF and dist[u] + w < dist[v]:
                dist[v]  = dist[u] + w
                updated  = True
        if not updated:
            break

    # V 回目も更新があれば負閉路
    has_neg_cycle = False
    for u, v, w in edges:
        if dist[u] < INF and dist[u] + w < dist[v]:
            has_neg_cycle = True
            break

    return dist, has_neg_cycle
```

```python title="使用例"
edges = [(1, 2, 4), (1, 3, 5), (2, 3, -3), (3, 4, 2)]
dist, neg = bellman_ford(4, edges, 1)
print(dist[1:])  # [0, 4, 1, 3]
print(neg)       # False

# 負閉路のあるグラフ
edges_neg = [(1, 2, 1), (2, 3, -2), (3, 1, 0)]
dist2, neg2 = bellman_ford(3, edges_neg, 1)
print(neg2)  # True
```

## ダイクストラ法との比較

| | ダイクストラ法 | Bellman-Ford法 |
| --- | --- | --- |
| 負の辺 | ✕ | ◯ |
| 計算量 | O((V+E) log V) | O(VE) |
| 実用速度 | 速い | 遅い |

ダイクストラ法より遅い O(VE) ですが、**負の辺・負閉路の検出**が可能なため、差分制約システムや為替裁定検出などに使われます。


## 使用場面

- **負の辺がある最短経路**: 差分制約システム（スケジューリングなど）
- **負閉路の検出**: 為替レートの裁定機会検出
- **分散システムの経路制御**: RIPプロトコル（距離ベクトル法）

## 参考文献

<AffiliateBanner site="tessoku" />
<AffiliateBanner site="antbook" />
<AffiliateBanner site="algorithm_zukan" />



