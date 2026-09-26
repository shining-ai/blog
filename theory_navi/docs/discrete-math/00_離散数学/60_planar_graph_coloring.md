import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 平面グラフと彩色問題

## 平面グラフと彩色問題とは

> 平面グラフとは辺が交差しないよう平面上に描けるグラフであり、彩色問題とは隣接する頂点（または辺・面）が同じ色にならないよう色を割り当てる問題である。

平面グラフ（Planar Graph）は、辺を交差させずに平面に埋め込めるグラフです。**オイラーの公式** V - E + F = 2（V: 頂点数, E: 辺数, F: 面数）は連結平面グラフに成立します。この公式から E ≤ 3V - 6 が導かれ、完全グラフ K_5 や完全二部グラフ K_\{3,3} が非平面的であることの証明に使われます（クラトフスキーの定理）。

グラフの**彩色数** χ(G) は、隣接する頂点が同じ色にならない最小の色数です。**4色定理**（1976年、Appel と Haken が計算機補助証明）は「任意の平面グラフは4色で彩色できる」という歴史的な定理です。一般のグラフに対する彩色数の決定は NP 困難ですが、貪欲法や分枝限定法による近似が実用的に使われます。

辺彩色（エッジカラリング）では隣接する辺に異なる色を使います。ビジングの定理は「単純グラフの辺彩色数は最大次数 Δ か Δ+1 のいずれか」を保証します。面彩色は双対グラフの頂点彩色に帰着されます。

## 主要な定理

| 定理 | 内容 |
|------|------|
| オイラーの公式 | V - E + F = 2（連結平面グラフ） |
| クラトフスキーの定理 | K_5, K_\{3,3} を部分グラフとして含まない ⟺ 平面グラフ |
| 4色定理 | 任意の平面グラフの彩色数 ≤ 4 |
| 5色定理 | 任意の平面グラフの彩色数 ≤ 5（手計算で証明可能） |
| ビジングの定理 | 辺彩色数 = Δ または Δ+1 |
| ブルックスの定理 | 連結グラフ（完全グラフ・奇閉路を除く）の彩色数 ≤ Δ |

```python
from collections import defaultdict

def greedy_coloring(n: int, edges: list) -> list:
    """
    貪欲法によるグラフ彩色
    戻り値: colors[v] = v に割り当てられた色番号
    """
    adj = defaultdict(set)
    for u, v in edges:
        adj[u].add(v)
        adj[v].add(u)

    colors = [-1] * n
    for v in range(n):
        # 隣接頂点が使っている色を収集
        used = {colors[u] for u in adj[v] if colors[u] != -1}
        # 使われていない最小の色を割り当て
        color = 0
        while color in used:
            color += 1
        colors[v] = color
    return colors

# 例: サイクル C_5（奇閉路 → 彩色数=3）
n = 5
edges_c5 = [(0,1),(1,2),(2,3),(3,4),(4,0)]
colors = greedy_coloring(n, edges_c5)
print("C_5 の彩色:", colors)
print("使用色数:", max(colors) + 1)  # 3

# 例: 完全二部グラフ K_{2,2}（彩色数=2）
edges_k22 = [(0,2),(0,3),(1,2),(1,3)]
colors2 = greedy_coloring(4, edges_k22)
print("K_{2,2} の彩色:", colors2)
print("使用色数:", max(colors2) + 1)  # 2

# オイラーの公式の検証（連結平面グラフ）
def euler_formula_check(V: int, E: int, F: int) -> bool:
    """V - E + F == 2 か確認"""
    return V - E + F == 2

# 立方体グラフ: V=8, E=12, F=6
print("立方体でオイラー公式成立:", euler_formula_check(8, 12, 6))  # True
# 四面体グラフ: V=4, E=6, F=4
print("四面体でオイラー公式成立:", euler_formula_check(4, 6, 4))   # True
```

## 使用場面

- **地図の塗り分け**: 国・地域を色分けするとき、隣接する領域を異なる色にする問題が4色定理に帰着
- **時間割・スケジューリング**: 競合するリソース（授業・試験）のグラフ彩色で衝突を防ぐ
- **レジスタ割り当て**: コンパイラの最適化で変数をCPUレジスタに割り当てる問題がグラフ彩色に帰着
- **周波数割り当て**: 基地局間の干渉を防ぐ無線周波数の割り当てに使われる

## 参考文献

- Diestel, R. "Graph Theory" (Springer, 無料PDF公開)
- 西関隆夫・田中圭介「グラフアルゴリズムとその応用」(岩波書店)

<AffiliateBanner site="theory_navi" />
