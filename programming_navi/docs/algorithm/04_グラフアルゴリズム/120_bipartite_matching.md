import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 二部マッチング

## 二部マッチングとは

二部マッチングとは、

> 二部グラフ（頂点集合を L と R に分割でき、辺が L-R 間のみに存在するグラフ）において、互いに辺を共有しない辺の最大集合（最大マッチング）を求めるアルゴリズム

です。
<br/>

増加路（マッチングに含まれる辺と含まれない辺を交互に通るパス）を探してマッチングを拡張する **ハンガリアンアルゴリズム** で O(VE) で求められます。また最大フロー（Dinic法）として定式化すると O(E√V) になります。

## 動作の概要

```
二部グラフ（左:仕事, 右:人）:
  仕事A - 人1, 人2
  仕事B - 人1, 人3
  仕事C - 人2, 人3

マッチング拡張:
  仕事A → 人1 をマッチング  {A-1}
  仕事B → 人1 は使用中 → 増加路: B-1-A-2 → A-2, B-1 に更新
               {A-2, B-1}
  仕事C → 人3 をマッチング  {A-2, B-1, C-3}

最大マッチング = 3（全仕事に担当者を割り当て可能）
```

増加路: マッチング辺と非マッチング辺を交互に通るパスで、両端が未マッチの場合にマッチングを1増やせます。

## 計算量

| | 計算量 |
| --- | --- |
| ハンガリアンアルゴリズム | O(VE) |
| Dinic法（最大フローとして） | O(E√V) |
| 空間 | O(V + E) |

## 実装

```python title="ハンガリアンアルゴリズム"
def bipartite_matching(
    left_n: int,
    right_n: int,
    edges: list[tuple[int, int]],
) -> int:
    """
    左頂点 0..left_n-1, 右頂点 0..right_n-1
    edges = [(left_v, right_v), ...]
    Returns: 最大マッチングのサイズ
    """
    graph  = [[] for _ in range(left_n)]
    for u, v in edges:
        graph[u].append(v)

    match_l = [-1] * left_n   # 左頂点のマッチング先
    match_r = [-1] * right_n  # 右頂点のマッチング先

    def dfs(v: int, visited: list[bool]) -> bool:
        for nv in graph[v]:
            if not visited[nv]:
                visited[nv] = True
                if match_r[nv] == -1 or dfs(match_r[nv], visited):
                    match_l[v]   = nv
                    match_r[nv]  = v
                    return True
        return False

    result = 0
    for v in range(left_n):
        visited = [False] * right_n
        if dfs(v, visited):
            result += 1

    return result
```

```python title="マッチング内容も返す版"
def bipartite_matching_full(
    left_n: int,
    right_n: int,
    edges: list[tuple[int, int]],
) -> tuple[int, list[tuple[int, int]]]:
    graph  = [[] for _ in range(left_n)]
    for u, v in edges:
        graph[u].append(v)

    match_l = [-1] * left_n
    match_r = [-1] * right_n

    def dfs(v: int, visited: list[bool]) -> bool:
        for nv in graph[v]:
            if not visited[nv]:
                visited[nv] = True
                if match_r[nv] == -1 or dfs(match_r[nv], visited):
                    match_l[v] = nv
                    match_r[nv] = v
                    return True
        return False

    count = sum(1 for v in range(left_n) if dfs(v, [False]*right_n))
    matched = [(v, match_l[v]) for v in range(left_n) if match_l[v] != -1]
    return count, matched
```

```python title="使用例"
# 左:仕事0,1,2 右:人0,1,2
edges = [(0, 0), (0, 1), (1, 0), (1, 2), (2, 1), (2, 2)]
count, pairs = bipartite_matching_full(3, 3, edges)
print(count)   # 3
print(pairs)   # [(0, 1), (1, 0), (2, 2)] など
```

## 関連定理

| 定理 | 内容 |
| --- | --- |
| König の定理 | 最大マッチング = 最小頂点被覆 |
| Hallの定理 | 完全マッチングの存在条件 |
| 最大フロー最小カット | 二部マッチングは最大フローと等価 |

## 使用場面

- **タスク割り当て**: 従業員とタスクの最適なマッチング
- **安定マッチング**: 医師と病院のマッチング（Gale-Shapley の基礎）
- **スケジューリング**: 時間帯と作業者の割り当て
- **画像処理**: ステレオマッチングでの対応点検出

## 参考文献

<AffiliateBanner site="antbook" />
