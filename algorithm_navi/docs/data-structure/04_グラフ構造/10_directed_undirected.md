import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 無向グラフ・有向グラフ

## 無向グラフ (Undirected Graph)とは

無向グラフとは、

> 辺に方向がないグラフ

です。
<br/>

0-1 の辺があれば、0 から 1 にも 1 から 0 にも移動できます。

![無向グラフ](https://res.cloudinary.com/dtilrevrm/image/upload/v1777684578/%E7%84%A1%E5%90%91%E3%82%B0%E3%83%A9%E3%83%95_oizywq.jpg)

```python title="無向グラフの表現"
# 辺を両方向に追加する
graph = {
    "0": ["1", "2", "3"],
    "1": ["0", "3"],
    "2": ["0", "3"],
    "3": ["0", "1", "2"],
}
```

## 有向グラフ (Directed Graph / Digraph)

有向グラフとは
> 辺に方向があるグラフ

です。
<br/>

0→1 の辺があっても、1→0 には移動できません。

![有向グラフ](https://res.cloudinary.com/dtilrevrm/image/upload/v1777684579/%E6%9C%89%E5%90%91%E3%82%B0%E3%83%A9%E3%83%95_ehljku.jpg)


```python title="有向グラフの表現"
graph = {
    "0": ["1", "2", "3"],
    "1": ["3"],
    "2": [],
    "3": ["2"],
}
```


## 無向グラフと有向グラフの違い

| | 無向グラフ | 有向グラフ |
| --- | --- | --- |
| 辺の方向 | なし（双方向） | あり（一方向） |
| 辺の表記 | (u, v) = (v, u) | (u, v) ≠ (v, u) |
| 実世界の例 | 友人関係、道路（双方向） | フォロー関係、一方通行道路 |
| 隣接行列 | 対称行列 | 非対称行列 |

## 有向グラフ特有の概念

### 入次数・出次数

- **入次数（In-degree）**: そのノードに入ってくる辺の数
- **出次数（Out-degree）**: そのノードから出ていく辺の数

![入次数・出次数](https://res.cloudinary.com/dtilrevrm/image/upload/v1777684579/%E5%85%A5%E6%AC%A1%E6%95%B0_%E5%87%BA%E6%AC%A1%E6%95%B0_p9jsx4.jpg)

```python title="入次数の計算"
def calc_indegree(graph):
    indegree = {v: 0 for v in graph}
    for v in graph:
        for neighbor in graph[v]:
            indegree[neighbor] += 1
    return indegree

graph = {"0": ["1", "2", "3"], "1": ["3"], "2": [], "3": ["2"]}
print(calc_indegree(graph))
# {'0': 0, '1': 1, '2': 2, '3': 2}
```

### DAG（有向非巡回グラフ）

DAGとは
> 有向グラフのうち、閉路(サイクル)が存在しないグラフ

です。
<br/>

![DAG](https://res.cloudinary.com/dtilrevrm/image/upload/v1777706634/DAG_mc4yly.jpg)

DAGは順序付けや依存関係の表現に適しています。
例えば、タスクの依存関係の解決（ビルドシステム、授業の履修順など）に使われます。

**トポロジカルソート（Kahnのアルゴリズム）**を使って順番を整理することが出来ます。

### 強連結成分（SCC）

強連結成分とは
> 有向グラフにおいて、どの頂点からどの頂点へも到達できる頂点の最大集合

です。
<br/>

![強連結成分](https://res.cloudinary.com/dtilrevrm/image/upload/v1777706636/%E5%BC%B7%E9%80%A3%E7%B5%90%E6%88%90%E5%88%86_zth6wk.jpg)



**Kosarajuのアルゴリズム** や **Tarjanのアルゴリズム** で O(V+E) で求められます。

## 参考文献

<AffiliateBanner site="tessoku" />

<AffiliateBanner site="antbook" />

<AffiliateBanner site="rasen" />