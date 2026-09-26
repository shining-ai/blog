import AffiliateBanner from '@site/src/components/AffiliateBanner';

# クラス NP と証明器（多項式時間検証可能な問題）

## クラス NP とは

> クラス NP（Nondeterministic Polynomial time）とは、「解の候補（証拠・証明器）が与えられた場合に多項式時間で正しさを検証できる」判定問題の集合であり、「はい」となる入力に対して多項式長の証拠が存在する問題クラスである。

NP の名称は「非決定性チューリング機械で多項式時間で解ける」問題クラスに由来しますが、現代的な定義は「多項式時間検証器（verifier）」によって与えられます。この二つの定義は等価であることが証明されています。

NP の定義：言語 L が NP に属する ⟺ 多項式時間の決定性アルゴリズム V（検証器）と多項式 p(n) が存在し、次を満たす。任意の文字列 x について、x ∈ L ⟺ ある証拠 c（|c| ≤ p(|x|)）が存在し V(x, c) = 1。

P ⊆ NP は自明です（証拠不要で多項式時間で解けるものは証明も不要）。逆の NP ⊆ P は未解決（P=NP 問題）です。NP の補クラス co-NP は「いいえ」答えを多項式時間で検証できる問題の集合です。

NP の直感的な例：ハミルトン閉路問題（与えられたパスが有効なハミルトン閉路かどうかは O(n) で確認できる）、充足可能性問題（与えられた変数割り当てが節を全て満たすか O(n) で確認）。

## P・NP・co-NP の関係

| クラス | 定義 | 解くのは | 検証するのは |
|--------|------|---------|------------|
| P | 多項式時間決定 | 多項式時間 | 不要 |
| NP | 多項式時間検証（yes） | 未知（指数時間以下） | 多項式時間 |
| co-NP | 多項式時間検証（no） | 未知 | 多項式時間 |
| NP ∩ co-NP | yes/no 両方検証可能 | 一部は P に属する | 多項式時間 |

## 証拠（Certificate）の例

| 問題 | 証拠の形 | 検証の計算量 |
|------|---------|------------|
| SAT | 変数への真偽割り当て | O(n·m)（n変数，m節） |
| ハミルトン閉路 | 頂点の順列 | O(n) |
| 整数の合成数判定 | 非自明な因数 | O(log n) |
| グラフ彩色（k色） | 各頂点の色番号 | O(n + m) |
| 部分和問題 | 部分集合のリスト | O(n) |

```python
from itertools import product

# ===========================
# NP の例: SAT（充足可能性問題）の検証器
# ===========================

def sat_verifier(clauses: list[list[int]], assignment: dict[int, bool]) -> bool:
    """
    SAT の検証器（多項式時間）
    clauses: 節のリスト。各節は整数のリスト（正 = 正リテラル、負 = 負リテラル）
    assignment: 変数 → 真偽値のマッピング
    """
    for clause in clauses:
        satisfied = False
        for literal in clause:
            var = abs(literal)
            value = assignment.get(var, False)
            lit_value = value if literal > 0 else not value
            if lit_value:
                satisfied = True
                break
        if not satisfied:
            return False
    return True


# ===========================
# NP の例: ハミルトン閉路の検証器
# ===========================

def hamiltonian_circuit_verifier(n: int, edges: set[tuple[int,int]], path: list[int]) -> bool:
    """
    ハミルトン閉路の検証器（多項式時間）
    全頂点を一度ずつ訪問し、最後に出発点に戻る閉路かどうかを確認
    """
    if len(path) != n:
        return False
    if len(set(path)) != n:
        return False  # 重複あり

    for i in range(n):
        u = path[i]
        v = path[(i + 1) % n]
        if (min(u, v), max(u, v)) not in edges:
            return False
    return True


# ===========================
# 小規模の NP 問題をブルートフォースで「解く」（指数時間の解法と多項式検証の対比）
# ===========================

def sat_brute_force(n_vars: int, clauses: list[list[int]]) -> dict | None:
    """SAT をブルートフォースで解く（O(2^n)）"""
    for values in product([False, True], repeat=n_vars):
        assignment = {i + 1: v for i, v in enumerate(values)}
        if sat_verifier(clauses, assignment):
            return assignment
    return None


print("=== NP クラスのデモ ===\n")

# 3-SAT の例: (x1 OR x2 OR NOT x3) AND (NOT x1 OR x3) AND (NOT x2 OR NOT x3)
clauses = [
    [1, 2, -3],
    [-1, 3],
    [-2, -3],
]

print("[SAT の検証器: O(n·m) の多項式時間検証]")
solution = sat_brute_force(3, clauses)
if solution:
    print(f"  ブルートフォース解: {solution}")
    verified = sat_verifier(clauses, solution)
    print(f"  検証器による確認: {verified}")
    # 誤った解を検証
    wrong = {1: True, 2: True, 3: True}
    print(f"  誤った割り当て {wrong} の検証: {sat_verifier(clauses, wrong)}")

print("\n[ハミルトン閉路の検証器]")
# 4頂点の完全グラフ（0-1-2-3）
edges = {(0,1), (0,2), (0,3), (1,2), (1,3), (2,3)}
valid_path = [0, 1, 2, 3]    # 0→1→2→3→0 は閉路
invalid_path = [0, 1, 1, 3]  # 重複あり

print(f"  閉路 {valid_path}: {hamiltonian_circuit_verifier(4, edges, valid_path)}")
print(f"  無効路 {invalid_path}: {hamiltonian_circuit_verifier(4, edges, invalid_path)}")

print("\n[P と NP の計算量の対比]")
rows = [
    ("SAT （n=20）", "O(2²⁰) ≈ 10⁶ ステップ", "O(n·m) ≈ 数百ステップ"),
    ("SAT （n=100）", "O(2¹⁰⁰) ≈ 10³⁰ ステップ（不可能）", "O(n·m) ≈ 数千ステップ"),
    ("ハミルトン閉路（n=20）", "O(20!) ≈ 10¹⁸ ステップ", "O(n) = 20 ステップ"),
]
print(f"  {'問題':<25} {'解くコスト':^35} {'検証コスト':^20}")
print("  " + "-" * 80)
for prob, solve, verify in rows:
    print(f"  {prob:<25} {solve:^35} {verify:^20}")
```

## 使用場面

- 解こうとしている問題が NP クラスに属することを確認し、指数時間解法やヒューリスティックを検討する場面
- 証明システム（対話型証明や検証器）を設計する際に NP の証拠モデルを基礎として使う場面
- 暗号理論において「検証は容易だが逆算は困難」という NP の性質を安全性の根拠とする場面

## 参考文献

- Sipser, M. "Introduction to the Theory of Computation" (Cengage Learning)
- Cook, S. A. "The complexity of theorem proving procedures" (STOC 1971)
- Arora, S. and Barak, B. "Computational Complexity: A Modern Approach" (Cambridge)

<AffiliateBanner site="theory_navi" />
