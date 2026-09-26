import AffiliateBanner from '@site/src/components/AffiliateBanner';

# NP 困難と NP 完全（帰着による定義）

## NP 困難・NP 完全とは

> NP 完全（NP-complete）とは NP に属し、かつ NP 内の全問題が多項式時間多対一帰着できる問題であり、NP 困難（NP-hard）とは NP 内の全問題が帰着できる問題（NP に属するとは限らない）である。

「帰着（Reduction）」は問題 A を問題 B の解法を使って解く変換です。多項式時間多対一帰着（polynomial-time many-one reduction）A ≤_p B は、「A を多項式時間で B に変換できる」ことを意味し、「B が P に属するなら A も P に属する」あるいは逆に「A が P に属さないなら B も P に属さない」という推論を可能にします。

NP 完全の定義（形式的）：言語 L が NP 完全 ⟺  (1) L ∈ NP、かつ (2) NP 内の全言語 L' について L' ≤_p L。

NP 困難の定義：条件 (2) のみ満たすもの（NP に属さなくても良い）。例えば停止問題は NP 困難ですが NP 完全ではありません（NP に属さない）。

NP 完全問題の最初の例は Cook（1971年）が示した SAT です。その後 Karp（1972年）は SAT からの帰着によって 21 の問題が NP 完全であることを示しました。現在では数千の問題が NP 完全であることが知られています。

## NP・NP 困難・NP 完全の関係

| クラス | NP に属する | NP の全問題が帰着できる | 例 |
|--------|-----------|---------------------|-----|
| P | はい | いいえ（一般には） | ソート、最短経路 |
| NP（P≠NP仮定） | はい | いいえ | グラフ同型問題（おそらく） |
| NP 完全 | はい | はい | SAT、3-SAT、TSP |
| NP 困難 | 限らない | はい | TSP 最適化版、停止問題 |

## 帰着の連鎖

| 帰着元 | → | 帰着先 | 意味 |
|--------|---|--------|------|
| SAT | ≤_p | 3-SAT | SAT は 3-SAT の特殊ケースに帰着できる |
| 3-SAT | ≤_p | 独立集合 | 3-SAT が解けるなら独立集合も解ける |
| 独立集合 | ≤_p | 頂点被覆 | 補グラフで直接対応 |
| 頂点被覆 | ≤_p | 集合被覆 | 一般化 |
| 3-SAT | ≤_p | ハミルトン閉路 | ガジェット構成 |

```python
# ===========================
# 帰着のデモ: 独立集合 ≤_p 頂点被覆
# ===========================
# 定理: S が大きさ k の独立集合 ⟺ V \ S が大きさ (n-k) の頂点被覆
# これが多項式時間帰着の最もシンプルな例

def independent_set_to_vertex_cover(
    n: int,
    edges: list[tuple[int, int]],
    k: int,
) -> tuple[int, list[tuple[int, int]], int]:
    """
    独立集合問題を頂点被覆問題に帰着（O(1) の変換）
    「グラフ G に大きさ k の独立集合が存在するか?」
    →「グラフ G に大きさ (n-k) の頂点被覆が存在するか?」
    """
    return n, edges, n - k  # グラフは同じ、k が n-k に変わるだけ


def verify_independent_set(
    n: int,
    edges: list[tuple[int, int]],
    subset: list[int],
) -> bool:
    """独立集合の証拠を検証: 部分集合の頂点間に辺がないか"""
    s = set(subset)
    for u, v in edges:
        if u in s and v in s:
            return False  # 辺が存在 → 独立集合でない
    return True


def verify_vertex_cover(
    n: int,
    edges: list[tuple[int, int]],
    subset: list[int],
) -> bool:
    """頂点被覆の証拠を検証: 全ての辺が subset の頂点を少なくとも 1 つ含むか"""
    s = set(subset)
    for u, v in edges:
        if u not in s and v not in s:
            return False  # この辺は被覆されていない
    return True


def find_independent_set_brute(
    n: int,
    edges: list[tuple[int, int]],
    k: int,
) -> list[int] | None:
    """独立集合をブルートフォースで探索"""
    from itertools import combinations
    for subset in combinations(range(n), k):
        if verify_independent_set(n, edges, list(subset)):
            return list(subset)
    return None


print("=== NP 完全: 帰着のデモ ===\n")

# サンプルグラフ: 0-1-2-3-4 のサイクルグラフ C5
n = 5
edges = [(0,1), (1,2), (2,3), (3,4), (4,0)]
k = 2  # 独立集合の大きさ

print(f"[グラフ C5 ({n}頂点, 辺={edges})]")
print(f"  大きさ {k} の独立集合を探索...")

indep = find_independent_set_brute(n, edges, k)
if indep:
    print(f"  発見: {indep}")
    print(f"  独立集合の検証: {verify_independent_set(n, edges, indep)}")

    # 帰着: 独立集合 → 頂点被覆
    _, _, cover_size = independent_set_to_vertex_cover(n, edges, k)
    cover = [v for v in range(n) if v not in indep]
    print(f"\n[帰着: 大きさ {k} の独立集合 → 大きさ {cover_size} の頂点被覆]")
    print(f"  頂点被覆 (V \\ S): {cover}")
    print(f"  頂点被覆の検証: {verify_vertex_cover(n, edges, cover)}")
else:
    print("  大きさ {k} の独立集合は存在しない")

print()
print("[NP 完全問題の帰着連鎖]")
chain = [
    "SAT（Cook 1971）",
    "  ↓ ≤_p（3節のみに限定）",
    "3-SAT（Karp 1972）",
    "  ↓ ≤_p（節 → 三角形ガジェット）",
    "独立集合",
    "  ↓ ≤_p（補集合の対応）",
    "頂点被覆",
    "  ↓ ≤_p（集合への一般化）",
    "集合被覆",
    "  ↓ ≤_p（容量付きでコスト最小化）",
    "ナップサック問題",
]
for line in chain:
    print(f"  {line}")

print()
print("[NP 困難だが NP 完全でない問題の例]")
examples = [
    ("TSP 最適化版", "最短ルートを求める（判定でなく最適化）"),
    ("停止問題", "チューリング機械の停止判定（NP ではない）"),
    ("TQBF (True QBF)", "量化ブール式の充足性（PSPACE 完全）"),
    ("チェス・将棋の勝利判定", "EXPTIME 完全"),
]
for name, desc in examples:
    print(f"  • {name}: {desc}")
```

## 使用場面

- 新しい問題が NP 完全かどうかを調べる際に、既知の NP 完全問題からの帰着を構成する場面
- 問題を NP 困難と同定して、厳密解法を断念し近似アルゴリズムや ILP ソルバーを使う判断をする場面
- ゲーム・パズル・スケジューリング問題の計算量を分析する際に帰着の手法を使う場面

## 参考文献

- Cook, S. A. "The complexity of theorem proving procedures" (STOC 1971)
- Karp, R. M. "Reducibility among combinatorial problems" (1972)
- Sipser, M. "Introduction to the Theory of Computation" (Cengage Learning)

<AffiliateBanner site="theory_navi" />
