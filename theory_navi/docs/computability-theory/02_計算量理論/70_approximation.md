import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 近似アルゴリズムとパラメータ付き計算量

## 近似アルゴリズムとは

> 近似アルゴリズムとは NP 困難な最適化問題に対して多項式時間で「最適解の α 倍以内（近似比 α）」の解を保証するアルゴリズムであり、パラメータ付き計算量（FPT）は問題の「困難さの核」をパラメータで隔離して実用的な解法を与えるアプローチである。

NP 困難な問題に対して「正確な最適解を効率よく求めることは（おそらく）不可能」であることから、工学的対処法として 2 つの主要なアプローチが発展しました。

近似アルゴリズムは最適解 OPT に対して「高々 α·OPT 以下（最小化）または OPT/α 以上（最大化）の解」を多項式時間で求めます。近似比 α が 1 に近いほど良い近似です。頂点被覆の 2-近似、集合被覆の (ln n + 1)-近似、TSP の 1.5-近似（Christofides アルゴリズム）が代表例です。近似不可能性（inapproximability）の研究では、ある問題は P ≠ NP の仮定のもとで特定の近似比以下には近似できないことが証明されています。

パラメータ付き計算量（Parameterized Complexity）は問題の計算量を入力サイズ n だけでなくパラメータ k でも分析します。FPT（Fixed-Parameter Tractable）は f(k)·n^c の計算量で解ける問題クラスです（k が小さい場合は実用的）。頂点被覆の FPT アルゴリズムは O(1.2738^k + k·n) です。

## 近似比の主な結果

| 問題 | 近似比 | アルゴリズム | 下界（P≠NP 仮定） |
|------|--------|------------|----------------|
| 頂点被覆 | 2 | 最大マッチング補 | 1.36 以下は不可 |
| 集合被覆 | ln n + 1 | 貪欲法 | (1-ε)ln n 以下は不可 |
| TSP（一般） | 近似不可能 | — | P≠NP なら不可 |
| TSP（距離≤三角不等式） | 1.5 | Christofides | 1.0009 以下は不可 |
| 最大クリーク | n^(1-ε) 近似不可能 | — | — |
| ナップサック | 1+ε（任意） | FPTAS | — |

```python
# ===========================
# 1. 頂点被覆の 2-近似アルゴリズム
# ===========================

def vertex_cover_2approx(n: int, edges: list[tuple[int,int]]) -> set[int]:
    """
    頂点被覆の 2-近似: 最大マッチングを使う
    マッチング辺の両端点を全て被覆に追加 → 最適解の高々 2 倍
    """
    covered = set()
    remaining_edges = list(edges)
    cover = set()

    while remaining_edges:
        # 任意の辺を選ぶ
        u, v = remaining_edges[0]
        cover.add(u)
        cover.add(v)
        # u または v に接する辺を除去
        remaining_edges = [
            (a, b) for a, b in remaining_edges
            if a not in cover and b not in cover
        ]

    return cover


def verify_vertex_cover(n: int, edges: list[tuple[int,int]], cover: set[int]) -> bool:
    """頂点被覆の検証"""
    return all(u in cover or v in cover for u, v in edges)


# ===========================
# 2. 集合被覆の貪欲近似（ln n 近似）
# ===========================

def set_cover_greedy(universe: set, sets: list[set]) -> list[int]:
    """
    集合被覆の貪欲近似: 毎回最も多くの未被覆要素を含む集合を選ぶ
    近似比: ln|universe| + 1
    """
    covered = set()
    chosen = []

    while covered != universe:
        # 最も多くの未被覆要素を含む集合を選択
        best_idx = max(
            range(len(sets)),
            key=lambda i: len(sets[i] - covered)
        )
        newly_covered = sets[best_idx] - covered
        if not newly_covered:
            break  # 残りは被覆不可能
        covered |= newly_covered
        chosen.append(best_idx)

    return chosen


# ===========================
# 3. パラメータ付き計算量（FPT）: 頂点被覆の有限探索木
# ===========================

def vertex_cover_fpt(
    edges: list[tuple[int,int]],
    k: int,
    current_cover: frozenset = frozenset(),
) -> frozenset | None:
    """
    頂点被覆の FPT アルゴリズム（有限探索木）
    計算量: O(2^k · (n+m))
    辺 (u,v) に対して u を追加するか v を追加するかを分岐
    """
    if not edges:
        return current_cover
    if k == 0:
        return None  # 辺が残っているのに k=0 → 失敗

    u, v = edges[0]
    remaining = [(a, b) for a, b in edges if a != u and b != u]
    result = vertex_cover_fpt(remaining, k - 1, current_cover | {u})
    if result is not None:
        return result

    remaining = [(a, b) for a, b in edges if a != v and b != v]
    return vertex_cover_fpt(remaining, k - 1, current_cover | {v})


# ===========================
# 4. ナップサックの FPTAS（近似スキーム）
# ===========================

def knapsack_fptas(weights: list[int], values: list[int], capacity: int, epsilon: float) -> int:
    """
    ナップサックの FPTAS: (1+ε)-近似
    値を K = ε·max(values)/n でスケーリングして DP を O(n²/ε) で実行
    """
    n = len(weights)
    if n == 0:
        return 0
    max_val = max(values)
    K = epsilon * max_val / n if max_val > 0 else 1

    # スケーリングした値
    scaled = [int(v / K) for v in values]
    max_scaled = sum(scaled)

    # DP: dp[v] = スケーリング後の価値の合計が v 以下の最小重量
    INF = float('inf')
    dp = [INF] * (max_scaled + 1)
    dp[0] = 0

    for i in range(n):
        for v in range(max_scaled, scaled[i] - 1, -1):
            if dp[v - scaled[i]] + weights[i] <= capacity:
                dp[v] = min(dp[v], dp[v - scaled[i]] + weights[i])

    best_scaled = max(v for v in range(max_scaled + 1) if dp[v] <= capacity)
    return int(best_scaled * K)


print("=== 近似アルゴリズムとパラメータ付き計算量デモ ===\n")

# 頂点被覆の 2-近似
edges = [(0,1),(1,2),(2,3),(3,4),(0,4),(1,3)]
n = 5
cover = vertex_cover_2approx(n, edges)
print(f"[頂点被覆 2-近似]")
print(f"  グラフ: {n}頂点, 辺={edges}")
print(f"  2-近似被覆: {cover} (大きさ={len(cover)})")
print(f"  検証: {verify_vertex_cover(n, edges, cover)}")

# 集合被覆の貪欲近似
universe = {1, 2, 3, 4, 5, 6, 7, 8}
sets = [{1,2,3,4},{3,4,5,6},{5,6,7,8},{1,2,7,8}]
chosen = set_cover_greedy(universe, sets)
print(f"\n[集合被覆 貪欲近似]")
print(f"  全体集合: {universe}")
print(f"  選ばれた集合のインデックス: {chosen}, 数={len(chosen)}")
covered_result = set().union(*[sets[i] for i in chosen])
print(f"  被覆確認: {covered_result == universe}")

# 頂点被覆 FPT
print(f"\n[頂点被覆 FPT (k=3)]")
result_fpt = vertex_cover_fpt(edges, k=3)
print(f"  k=3 での被覆: {result_fpt}")
if result_fpt:
    print(f"  検証: {verify_vertex_cover(n, edges, set(result_fpt))}")

# ナップサック FPTAS
print(f"\n[ナップサック FPTAS (ε=0.5)]")
weights = [2, 3, 4, 5]
values  = [3, 4, 5, 6]
capacity = 8
approx_val = knapsack_fptas(weights, values, capacity, epsilon=0.5)
print(f"  weights={weights}, values={values}, capacity={capacity}")
print(f"  FPTAS 近似値: {approx_val}")
```

## 使用場面

- TSP・集合被覆・ナップサックなど NP 困難な最適化問題に近似保証付きの多項式時間解法を適用する場面
- 社会ネットワーク分析やバイオインフォマティクスで「木幅」「頂点被覆数」などが小さい実践的問題に FPT アルゴリズムを使う場面
- FPTAS を用いてスケジューリングや資源配分の近似解を精度パラメータ ε で制御する場面

## 参考文献

- Vazirani, V. V. "Approximation Algorithms" (Springer)
- Cygan, M. et al. "Parameterized Algorithms" (Springer)
- Arora, S. and Barak, B. "Computational Complexity: A Modern Approach" (Cambridge)

<AffiliateBanner site="theory_navi" />
