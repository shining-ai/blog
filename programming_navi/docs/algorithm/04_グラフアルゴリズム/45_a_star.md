import AffiliateBanner from '@site/src/components/AffiliateBanner';

# A* 探索（A* Search）

## A* 探索とは

A* 探索とは、

> **ヒューリスティック関数**を使って最短経路を効率的に求めるグラフ探索アルゴリズム

です。

ダイクストラ法は「現在までのコスト」だけを見て探索しますが、A* は「現在までのコスト + ゴールまでの推定コスト」で優先度を決めることで、無駄な探索を減らします。

## コスト関数

各ノード `n` の優先度は以下で決まります。

```
f(n) = g(n) + h(n)
```

| 関数 | 意味 |
| --- | --- |
| `g(n)` | スタートから `n` までの実際のコスト |
| `h(n)` | `n` からゴールまでの**推定コスト**（ヒューリスティック） |
| `f(n)` | 総推定コスト（優先度キューのキー） |

### ヒューリスティック関数の要件

`h(n)` が**許容的（admissible）**（実際のコストを超えない）であれば、A* は最適解を保証します。

- **格子グラフ（4方向）**: マンハッタン距離 `|dx| + |dy|`
- **格子グラフ（8方向）**: チェビシェフ距離 `max(|dx|, |dy|)`
- **ユークリッド距離**: `sqrt(dx²+dy²)`（実際の距離が直線以上のとき）

## アルゴリズムの手順

```
① スタートを open set（優先度キュー）に追加
② open set が空になるまで繰り返す:
   a. f(n) が最小のノード n を取り出す
   b. n がゴールなら終了
   c. n の隣接ノード m について:
      - 新しい g(m) = g(n) + edge_cost(n, m)
      - これが既知の g(m) より小さければ更新し open set に追加
```

## 計算量

| | 計算量 |
| --- | --- |
| 時間 | O(E log V)（最悪、ダイクストラ法と同等） |
| 空間 | O(V) |

ヒューリスティックが正確なほど探索ノード数が減り、実際は大幅に高速化されます。

## 実装

```python title="A* 探索"
import heapq

def a_star(grid: list[list[int]], start: tuple, goal: tuple) -> int | None:
    """
    grid: 0=通過可能, 1=壁
    start, goal: (row, col)
    戻り値: 最短コスト（到達不可なら None）
    """
    rows, cols = len(grid), len(grid[0])

    def heuristic(a, b):
        # マンハッタン距離（4方向移動）
        return abs(a[0] - b[0]) + abs(a[1] - b[1])

    # (f, g, position)
    open_set = [(heuristic(start, goal), 0, start)]
    g_score = {start: 0}

    while open_set:
        f, g, current = heapq.heappop(open_set)

        if current == goal:
            return g

        # より良い経路がすでに見つかっていたらスキップ
        if g > g_score.get(current, float('inf')):
            continue

        r, c = current
        for dr, dc in [(-1,0),(1,0),(0,-1),(0,1)]:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:
                neighbor = (nr, nc)
                new_g = g + 1
                if new_g < g_score.get(neighbor, float('inf')):
                    g_score[neighbor] = new_g
                    f = new_g + heuristic(neighbor, goal)
                    heapq.heappush(open_set, (f, new_g, neighbor))

    return None  # 到達不可
```

```python title="使用例"
grid = [
    [0, 0, 0, 0, 0],
    [0, 1, 1, 1, 0],
    [0, 0, 0, 1, 0],
    [0, 1, 0, 0, 0],
    [0, 0, 0, 0, 0],
]
print(a_star(grid, (0, 0), (4, 4)))  # 8
```

## ダイクストラ法との比較

| 項目 | ダイクストラ法 | A* 探索 |
| --- | --- | --- |
| ヒューリスティック | なし | あり |
| 探索ノード数 | 多い | 少ない（h が正確なほど） |
| 最適性の保証 | あり | h が許容的なら保証 |
| 用途 | 一般的な最短経路 | 目標が1点のとき |

## 使用場面

- **経路探索**: ゲームの AI、ロボットのナビゲーション
- **パズル**: 8パズル（8-puzzle）の最短手数
- **地図アプリ**: 2地点間の最短ルート

## 参考文献

<AffiliateBanner site="antbook" />
<AffiliateBanner site="algorithm_zukan" />
