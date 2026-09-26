import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 代表的な NP 完全問題（3-SAT・ハミルトン路など）

## 代表的な NP 完全問題とは

> NP 完全問題とは、NP に属し全 NP 問題が帰着できる問題の集合であり、Karp が 1972 年に示した 21 問題を皮切りに現在では数千以上の問題が NP 完全と判明しており、グラフ・論理・最適化・ゲームなど幅広い分野に存在する。

NP 完全問題が重要なのは「同値性」のためです。もし 1 つの NP 完全問題が多項式時間で解けると分かれば、全ての NP 問題が多項式時間で解けること（P = NP）が証明されます。逆に、ある問題を NP 完全と示すことは「この問題は（おそらく）多項式時間では解けない」という根拠になります。

代表的な NP 完全問題はグラフ系（ハミルトン閉路、彩色問題、クリーク、独立集合、頂点被覆）、論理系（3-SAT、回路 SAT）、集合・数値系（集合被覆、部分和、ナップサック決定版）、スケジューリング系に分類されます。

問題の NP 完全性を示す標準的な手順は「問題が NP に属することを検証器で示す」「既知の NP 完全問題からの多項式時間帰着を構成する」の 2 ステップです。

## Karp の 21 の NP 完全問題（抜粋）

| 問題 | 分野 | 帰着元 |
|------|------|--------|
| SAT | 論理 | Cook-Levin |
| 3-SAT | 論理 | SAT |
| クリーク | グラフ | 3-SAT |
| 独立集合 | グラフ | クリーク |
| 頂点被覆 | グラフ | 独立集合 |
| ハミルトン閉路 | グラフ | 3-SAT |
| TSP（判定版） | グラフ | ハミルトン閉路 |
| 集合被覆 | 集合 | 頂点被覆 |
| 部分和 | 数値 | 集合被覆 |
| ナップサック（判定版） | 数値 | 部分和 |
| 3 彩色 | グラフ | 3-SAT |

```python
from itertools import combinations, permutations

# ===========================
# 1. 3-SAT（各節がちょうど 3 リテラル）
# ===========================

def three_sat_verify(clauses: list[list[int]], assignment: dict[int, bool]) -> bool:
    """3-SAT 証拠の検証: 各節の 3 リテラルのいずれかが真か"""
    for clause in clauses:
        assert len(clause) == 3, "3-SAT: 各節はちょうど 3 リテラル"
        satisfied = any(
            assignment.get(abs(lit), False) if lit > 0
            else not assignment.get(abs(lit), False)
            for lit in clause
        )
        if not satisfied:
            return False
    return True


# ===========================
# 2. ハミルトン閉路
# ===========================

def hamiltonian_circuit_brute(n: int, edges: set[tuple[int,int]]) -> list[int] | None:
    """ハミルトン閉路をブルートフォースで探索 O(n!)"""
    for perm in permutations(range(1, n)):
        path = [0] + list(perm) + [0]
        if all(
            (min(path[i], path[i+1]), max(path[i], path[i+1])) in edges
            for i in range(n)
        ):
            return path
    return None


# ===========================
# 3. グラフ 3 彩色
# ===========================

def three_coloring_verify(n: int, edges: list[tuple[int,int]], coloring: dict[int,int]) -> bool:
    """3 彩色証拠の検証: 隣接頂点が異なる色か"""
    return all(coloring.get(u) != coloring.get(v) for u, v in edges)


def three_coloring_brute(n: int, edges: list[tuple[int,int]]) -> dict[int,int] | None:
    """3 彩色をブルートフォースで探索 O(3^n)"""
    for colors in combinations(range(3), 0).__class__(
        __iter__=lambda s: (
            dict(enumerate(c)) for c in
            __import__('itertools').product(range(3), repeat=n)
        ),
        __init__=lambda s: None
    ):
        pass  # ダミー

    # 簡素な実装
    import itertools
    for color_assign in itertools.product(range(3), repeat=n):
        coloring = dict(enumerate(color_assign))
        if three_coloring_verify(n, edges, coloring):
            return coloring
    return None


# ===========================
# 4. 部分和問題
# ===========================

def subset_sum_verify(numbers: list[int], subset: list[int], target: int) -> bool:
    """部分和証拠の検証 O(k)"""
    return sum(subset) == target and all(x in numbers for x in subset)


def subset_sum_dp(numbers: list[int], target: int) -> list[int] | None:
    """部分和を動的計画法で解く（擬似多項式 O(n·target)）"""
    n = len(numbers)
    dp = [[False] * (target + 1) for _ in range(n + 1)]
    dp[0][0] = True

    for i in range(1, n + 1):
        for t in range(target + 1):
            dp[i][t] = dp[i-1][t]
            if t >= numbers[i-1] and dp[i-1][t - numbers[i-1]]:
                dp[i][t] = True

    if not dp[n][target]:
        return None

    # 解を復元
    result = []
    t = target
    for i in range(n, 0, -1):
        if not dp[i-1][t]:
            result.append(numbers[i-1])
            t -= numbers[i-1]
    return result


print("=== 代表的な NP 完全問題デモ ===\n")

# 3-SAT
print("[3-SAT]")
clauses_3sat = [[1, 2, -3], [-1, 2, 3], [1, -2, 3]]
assignment = {1: True, 2: False, 3: True}
print(f"  節: {clauses_3sat}")
print(f"  割り当て {assignment}: 検証 = {three_sat_verify(clauses_3sat, assignment)}")

# ハミルトン閉路
print("\n[ハミルトン閉路]")
edges_h = {(0,1),(1,2),(2,3),(3,4),(4,0),(0,2)}
result_h = hamiltonian_circuit_brute(5, edges_h)
print(f"  5 頂点グラフのハミルトン閉路: {result_h}")

# グラフ 3 彩色
print("\n[3 彩色]")
n_col = 4
edges_col = [(0,1),(1,2),(2,3),(3,0)]  # 4-サイクル（偶数サイクル → 2色で可能）
coloring = three_coloring_brute(n_col, edges_col)
color_names = {0: "赤", 1: "青", 2: "緑"}
if coloring:
    print(f"  4-サイクルの彩色: { {v: color_names[c] for v, c in coloring.items()} }")

# 部分和
print("\n[部分和]")
numbers = [3, 34, 4, 12, 5, 2]
target = 9
subset = subset_sum_dp(numbers, target)
print(f"  数列: {numbers}, 目標: {target}")
print(f"  部分集合: {subset}, 検証: {subset_sum_verify(numbers, subset, target)}")

print("\n[NP 完全問題の計算量の壁]")
headers = ["問題", "ブルートフォース", "最良既知アルゴリズム"]
rows = [
    ("3-SAT", "O(2^n)", "O(1.307^n) (DPLL 改良)"),
    ("ハミルトン閉路", "O(n!)", "O(2^n · n²) (Held-Karp)"),
    ("3 彩色", "O(3^n)", "O(1.329^n) (Beigel-Eppstein)"),
    ("部分和", "O(2^n)", "O(2^(n/2)) (meet-in-middle)"),
]
print(f"  {'問題':<15} {'ブルートフォース':>20} {'最良既知':>25}")
for prob, bf, best in rows:
    print(f"  {prob:<15} {bf:>20} {best:>25}")
```

## 使用場面

- スケジューリング・配置最適化・回路設計などの現場問題が NP 完全かどうかを特定して設計指針を決める場面
- SAT ソルバーや ILP ソルバーに問題を帰着して工学的に解く場面
- ゲームやパズル（数独・テトリス配置など）の計算量を理論的に分析する場面

## 参考文献

- Karp, R. M. "Reducibility among combinatorial problems" (1972)
- Garey, M. R. and Johnson, D. S. "Computers and Intractability" (W. H. Freeman)
- Sipser, M. "Introduction to the Theory of Computation" (Cengage Learning)

<AffiliateBanner site="theory_navi" />
