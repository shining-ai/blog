import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Warshall-Floyd法

## Warshall-Floyd法とは

Warshall-Floyd法（Floyd-Warshall法）とは、

> 重み付きグラフにおいて、全ての頂点間の最短経路を求めるアルゴリズム

です。
<br/>

最小経路とはスタートからゴールまでに通るパスの和が最小になるもののことです。

以下の例では、AからBまでの最短経路はA→D→Bとなります。

![最小経路とは](https://res.cloudinary.com/dtilrevrm/image/upload/v1780845412/40-warshall-floyd_g8mumg.jpg)

ワーシャルフロイド法では負の重みを持つ辺が含まれていても適用可能です。

ただし、負閉路（負の重みの総和が負になる閉路）が存在する場合は、正しく最短経路を求めることができません。

最短経路を求める方法は他にも、ダイクストラ法やベルマンフォード法などがあります。


## 動作の概要

### 1. 隣接行列を初期化

グラフを隣接行列の形で表し、既知の距離を設定します。

例えば、dist[A][B] は「A から B への最短距離」を示し、A -> B の距離は 3、A -> C の距離は 2 です。

直接つながっていない経路は無限大を設定します。

![隣接行列の初期化](https://res.cloudinary.com/dtilrevrm/image/upload/v1780845330/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%892_mrbp89.jpg)

### 2. 経由地点を設定して更新

各頂点を順番に経由地点として、そこを通る経路が近道であるかを確認して距離を更新します。

#### Aを経由地点とする

**Aからスタートするパターン**

変化がないため割愛します。

<br/>
**Bからスタートするパターン**

B→A→CとB→A→Dについて見ていきます。

（B→AとB→A→Bについては割愛します。）

 <br/>

B→A→Cの距離はB→A（20）とA→C（5）の和になります。

B→C（∞）と比べて小さくなるので、隣接行列を更新します。

![Aを経由地点として更新](https://res.cloudinary.com/dtilrevrm/image/upload/v1780845333/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%893_dxq6sj.jpg)

続いてB→A→Dです。

B→A→Dの距離はB→A（20）とA→D（10）の和になります。

B→D（3）と比べて大きいので、隣接行列に変更はありません。

![Aを経由地点として更新2](https://res.cloudinary.com/dtilrevrm/image/upload/v1780845336/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%894_taahip.jpg)


これを全ての頂点の組み合わせで行います。

今回の場合は、C→A→B、C→A→D、D→A→B、D→A→Cを確認します。

![Aを経由地点の組み合わせ](https://res.cloudinary.com/dtilrevrm/image/upload/v1780845338/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%895_iwnbph.jpg)

![Aを経由地点として更新3](https://res.cloudinary.com/dtilrevrm/image/upload/v1780845340/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%896_u5vwvf.jpg)


#### Bを経由地点とする

続いてBを経由地点として、全ての経路の距離を確認していきます。

A→B→C、A→B→D、C→B→A、C→B→D、D→B→A、D→B→Cの経路を見ていきます。

![Bを経由地点として更新](https://res.cloudinary.com/dtilrevrm/image/upload/v1780845343/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%897_mhoxnz.jpg)

![Bを経由地点として更新2](https://res.cloudinary.com/dtilrevrm/image/upload/v1780845345/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%898_lkvqos.jpg)

#### Cを経由地点とする

上記と同様にCを経由地点として、全ての経路の距離を確認していきます。

A→C→B、A→C→D、B→C→A、B→C→D、D→C→A、D→C→Bの経路を見ていきます。

![Cを経由地点として更新](https://res.cloudinary.com/dtilrevrm/image/upload/v1780845347/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%899_ppfjwp.jpg)


#### Dを経由地点とする

最後にDを経由地点として、全ての経路の距離を確認していきます。

A→D→B、A→D→C、B→D→A、B→D→C、C→D→A、C→D→Bの経路を見ていきます。

![Dを経由地点として更新](https://res.cloudinary.com/dtilrevrm/image/upload/v1780845350/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%8910_pdpwlw.jpg)


### 3. 最短経路の決定
すべての経由点の考慮が終わった時点で、各頂点間の最短経路が確定します。

![最短経路の決定](https://res.cloudinary.com/dtilrevrm/image/upload/v1780845352/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%8911_bns1fi.jpg)

負の閉路を検出するには、アルゴリズムの最後に対角成分（dist[i][i]）が負であるかを確認することで判別できます。

## 計算量

| | 計算量 |
| --- | --- |
| 時間 | O(V³) |
| 空間 | O(V²) |

## 実装

```python title="Warshall-Floyd法"
def warshall_floyd(
    n: int,
    edges: list[tuple[int, int, int]],
) -> list[list[float]]:
    """
    n 頂点（0-indexed）のグラフで全頂点対最短距離を返す
    edges = [(u, v, weight), ...]
    """
    INF  = float('inf')
    dist = [[INF] * n for _ in range(n)]
    for i in range(n):
        dist[i][i] = 0
    for u, v, w in edges:
        dist[u][v] = min(dist[u][v], w)

    for k in range(n):
        for i in range(n):
            for j in range(n):
                if dist[i][k] + dist[k][j] < dist[i][j]:
                    dist[i][j] = dist[i][k] + dist[k][j]

    return dist
```

```python title="使用例（0-indexed）"
edges = [
    (0, 1, 3), (0, 3, 7),
    (1, 0, 8), (1, 2, 2),
    (2, 0, 5), (2, 3, 1),
    (3, 0, 2),
]
dist = warshall_floyd(4, edges)
for row in dist:
    print([x if x < float('inf') else '∞' for x in row])
# [0, 3, 5, 6]
# [7, 0, 2, 3]
# [3, 6, 0, 1]
# [2, 5, 7, 0]
```

```python title="負閉路の検出"
def has_negative_cycle(dist: list[list[float]]) -> bool:
    """dist[i][i] < 0 なら負閉路が存在"""
    return any(dist[i][i] < 0 for i in range(len(dist)))
```

```python title="経路復元付き"
def warshall_floyd_with_path(n: int, edges: list[tuple[int, int, int]]):
    INF  = float('inf')
    dist = [[INF] * n for _ in range(n)]
    next_v = [[None] * n for _ in range(n)]

    for i in range(n):
        dist[i][i] = 0
    for u, v, w in edges:
        if w < dist[u][v]:
            dist[u][v]   = w
            next_v[u][v] = v

    for k in range(n):
        for i in range(n):
            for j in range(n):
                if dist[i][k] + dist[k][j] < dist[i][j]:
                    dist[i][j]   = dist[i][k] + dist[k][j]
                    next_v[i][j] = next_v[i][k]

    def get_path(u: int, v: int) -> list[int]:
        if next_v[u][v] is None:
            return []
        path = [u]
        while u != v:
            u = next_v[u][v]
            path.append(u)
        return path

    return dist, get_path
```

## ダイクストラ法との比較

| | ダイクストラ法（全始点） | Warshall-Floyd法 |
| --- | --- | --- |
| 計算量 | O(V(V+E) log V) | O(V³) |
| 負の辺 | ✗ | ✓ |
| 密グラフ | やや不利 | 有利 |
| 実装の簡潔さ | 中 | 非常にシンプル |

密グラフ（E ≈ V²）では Warshall-Floyd の方が優位になることがあります。

## 使用場面

- **全頂点対最短経路**: 小〜中規模グラフの全ペア距離行列
- **推移閉包**: 有向グラフの到達可能性（重みを0/1として計算）
- **負閉路の検出**: 経済モデルや制約充足問題
- **競技プログラミング**: V ≤ 500 程度なら3重ループで十分

## 参考文献

<AffiliateBanner site="rasen" />
<AffiliateBanner site="antbook" />
<AffiliateBanner site="tessoku" />
