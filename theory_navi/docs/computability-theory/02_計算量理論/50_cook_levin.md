import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Cook-Levin 定理（SAT の NP 完全性）

## Cook-Levin 定理とは

> Cook-Levin 定理とは「充足可能性問題（SAT）は NP 完全である」という定理であり、任意の NP 問題が SAT に多項式時間帰着できることを示す基礎定理として、NP 完全性理論全体の出発点となっている。

Cook-Levin 定理は Stephen Cook（1971年）とレオニード・レビン（独立に 1973年）によって証明されました。この定理以前は、特定の問題が NP 困難であることを示す一般的な手法がありませんでした。

証明の中心的なアイデアは「計算の歴史をブール式で符号化する」ことです。多項式時間検証器 V が入力 x と証拠 c を受け取って動作するとき、V の計算過程全体を「配置表（tableau）」として表現し、この配置表が有効な受理計算を表すための条件をブール節（CNF 節）の集合として符号化します。

具体的には次の 4 種類の節が生成されます。初期配置条件（入力 x・証拠 c を正しく含む）、遷移条件（各ステップで遷移関数に従う）、受理条件（受理状態に到達する）、一意性条件（各セルには 1 文字だけ存在する）。これら全ての節を同時に満たす割り当てが存在する ⟺ V が入力 (x, c) を受理する証拠 c が存在する ⟺ x ∈ L です。

## SAT の定義と形式

| 概念 | 定義 | 例 |
|------|------|-----|
| 変数 | ブール変数 x₁, ..., xₙ | x₁, x₂, x₃ |
| リテラル | 変数または否定 | x₁, ¬x₂ |
| 節（clause） | リテラルの論理和（OR） | (x₁ ∨ ¬x₂ ∨ x₃) |
| CNF 式 | 節の論理積（AND） | (x₁ ∨ x₂) ∧ (¬x₁ ∨ x₃) |
| 充足割り当て | 全節を真にする変数の真偽値 | x₁=T, x₂=F, x₃=T |

## Cook-Levin 定理の証明構造

| ステップ | 内容 |
|---------|------|
| 1. SAT ∈ NP | 割り当てを証拠として多項式時間で検証できる |
| 2. NP ≤_p SAT | 任意の NP 問題 L に対して多項式時間帰着を構成 |
| 2a. 計算配置表の定義 | 検証器の t(n)×t(n) の配置表（t(n) は多項式） |
| 2b. ブール式の符号化 | 4 種類の節（初期・遷移・受理・一意性） |
| 2c. 同値性の証明 | 式が充足可能 ⟺ 受理計算が存在 |

```python
from itertools import product

# ===========================
# SAT の検証器（NP の証拠検証）
# ===========================

Clause = list[int]   # 正: x_i、負: NOT x_i（1-indexed）
CNF = list[Clause]

def sat_verify(cnf: CNF, assignment: dict[int, bool]) -> bool:
    """SAT の証拠検証 O(n·m)"""
    for clause in cnf:
        if not any(
            (assignment.get(abs(lit), False) if lit > 0
             else not assignment.get(abs(lit), False))
            for lit in clause
        ):
            return False
    return True


def sat_solve(n_vars: int, cnf: CNF) -> dict[int, bool] | None:
    """SAT を全列挙で解く O(2^n)（デモ用）"""
    for vals in product([False, True], repeat=n_vars):
        assignment = {i + 1: v for i, v in enumerate(vals)}
        if sat_verify(cnf, assignment):
            return assignment
    return None


# ===========================
# Cook-Levin 定理の核心:
# 非決定性チューリング機械の計算を SAT に帰着
# （簡略化した概念的実装）
# ===========================

def encode_computation_as_sat(
    n_cells: int,
    n_steps: int,
    initial_tape: list[str],
    transitions: dict[tuple[str, str], tuple[str, str, str]],
    accept_states: set[str],
) -> tuple[int, CNF, dict]:
    """
    チューリング機械の計算を SAT に帰着（概念的実装）

    変数 cell[t][i][s] = 「時刻 t, セル i の内容が記号 s」を意味するブール変数
    Returns: (変数数, CNF 節リスト, 変数マッピング)
    """
    symbols = sorted({s for s in initial_tape} | {"_"} |
                     {v for _, (_, v, _) in transitions.items()})
    states  = sorted({k[0] for k in transitions} | accept_states | {"q0"})

    # 変数 ID 割り当て
    var_id: dict = {}
    counter = [1]

    def get_var(t: int, i: int, sym: str) -> int:
        key = ("cell", t, i, sym)
        if key not in var_id:
            var_id[key] = counter[0]
            counter[0] += 1
        return var_id[key]

    clauses: CNF = []

    # 一意性制約: 各時刻・各セルには 1 つの記号だけ
    for t in range(n_steps):
        for i in range(n_cells):
            # 少なくとも 1 つの記号が存在
            clauses.append([get_var(t, i, s) for s in symbols])
            # 高々 1 つの記号が存在（at-most-one）
            for idx1, s1 in enumerate(symbols):
                for s2 in symbols[idx1 + 1:]:
                    clauses.append([-get_var(t, i, s1), -get_var(t, i, s2)])

    # 初期条件: 時刻 0 のテープ内容
    for i, sym in enumerate(initial_tape[:n_cells]):
        clauses.append([get_var(0, i, sym)])

    print(f"  生成された節の数: {len(clauses)}")
    print(f"  生成された変数の数: {counter[0] - 1}")
    return counter[0] - 1, clauses, var_id


# ===========================
# デモ
# ===========================

print("=== Cook-Levin 定理デモ ===\n")

print("[SAT の直接解法]")
# (x1 OR NOT x2) AND (NOT x1 OR x2 OR x3) AND (NOT x3)
cnf: CNF = [[1, -2], [-1, 2, 3], [-3]]
result = sat_solve(3, cnf)
print(f"  式: (x1 ∨ ¬x2) ∧ (¬x1 ∨ x2 ∨ x3) ∧ (¬x3)")
if result:
    print(f"  充足割り当て: {result}")
    print(f"  検証: {sat_verify(cnf, result)}")

print("\n[Cook-Levin: TM の計算を SAT に符号化]")
initial_tape = ["1", "0", "1", "_"]
n_cells, n_steps = len(initial_tape), 4
transitions = {
    ("q0", "1"): ("q1", "0", "R"),
    ("q0", "0"): ("q0", "1", "R"),
    ("q1", "1"): ("q1", "1", "R"),
    ("q1", "_"): ("qacc", "_", "R"),
}
n_vars, clauses, var_map = encode_computation_as_sat(
    n_cells, n_steps, initial_tape, transitions, {"qacc"}
)

print("\n[NP 完全問題の帰着連鎖（Cook-Levin を出発点として）]")
chain = [
    "任意の NP 問題 L",
    "  ↓ ≤_p（Cook-Levin 定理：計算配置表の符号化）",
    "SAT（充足可能性問題）",
    "  ↓ ≤_p（全節を3リテラルに分割）",
    "3-SAT",
    "  ↓ ≤_p（各節をガジェットに対応）",
    "独立集合 / 頂点被覆 / クリーク / ...",
]
for line in chain:
    print(f"  {line}")
```

## 使用場面

- 新しい問題の NP 困難性を証明する際に、SAT または 3-SAT からの帰着を出発点として使う場面
- SAT ソルバー（DPLL・CDCL など）を使って NP 完全問題を工学的に解く際の理論的根拠とする場面
- 自動定理証明・形式検証において計算の符号化技法（SAT エンコーディング）を応用する場面

## 参考文献

- Cook, S. A. "The complexity of theorem proving procedures" (STOC 1971)
- Levin, L. A. "Universal sequential search problems" (1973)
- Sipser, M. "Introduction to the Theory of Computation" (Cengage Learning)
- Biere, A. et al. "Handbook of Satisfiability" (IOS Press)

<AffiliateBanner site="theory_navi" />
