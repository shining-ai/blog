import AffiliateBanner from '@site/src/components/AffiliateBanner';

# P = NP 問題（計算機科学の未解決問題）

## P = NP 問題とは

> P = NP 問題とは「多項式時間で解を検証できる問題は多項式時間で解くことも常に可能か」という計算機科学最大の未解決問題であり、ミレニアム懸賞問題の一つとして Clay 数学研究所が 100 万ドルの懸賞を付けている。

P = NP か P ≠ NP かは 1971 年に Cook がこの問題を明確に定式化して以来、50年以上未解決のままです。ほとんどの計算機科学者は P ≠ NP を信じていますが、証明は存在しません。

P = NP が成立する場合の影響は革命的です。暗号理論の大部分（RSA, 楕円曲線暗号など「解くのは難しいが検証は容易」という NP ベースの安全性仮定）が崩壊します。また、創薬・タンパク質折り畳み・最適化・AI などあらゆる分野で「最良解を効率よく求めるアルゴリズム」が存在することになります。

P ≠ NP が成立する場合は現状維持ですが、それを証明することも依然として困難です。証明の主な障壁として「相対化（oracle）の壁」「自然な証明の壁」「代数化の壁」の 3 つが知られており、通常の証明技法ではこれらの壁を超えられないことが示されています。

現実的には、NP 完全問題に対して近似アルゴリズム・パラメータ付き計算量・ヒューリスティックなどで対処するのが工学的アプローチです。

## P=NP 問題の現状と証明の壁

| 立場 | 主張 | 主な根拠 |
|------|------|--------|
| P ≠ NP（多数派） | 指数時間の壁は超えられない | 50年間証明されていない・直観的困難さ |
| P = NP（少数派） | 巧妙なアルゴリズムが存在する | 存在しない証明もない |
| 独立命題説 | ZFC では証明も反証もできない | Gödel の不完全性定理との類比 |

## 証明の障壁

| 障壁 | 内容 | 提唱者・年 |
|------|------|---------|
| 相対化の壁 | Oracle を使った証明はどちらの結論も導ける | Baker-Gill-Solovay (1975) |
| 自然な証明の壁 | 「自然な」組合せ論的証明は機能しない | Razborov-Rudich (1994) |
| 代数化の壁 | 代数的手法も相対化の問題を回避できない | Aaronson-Wigderson (2009) |

```python
# P=NP 問題の影響を具体的に示すデモ
# 「P=NP なら何ができるか」を概念的に示す

from itertools import permutations

# ===========================
# シナリオ 1: P=NP の世界での RSA の崩壊（概念的）
# ===========================

def rsa_concept_demo():
    """RSA の安全性仮定 vs P=NP の影響を示す"""
    print("[RSA の安全性仮定]")
    print("  RSA の安全性 = 大きな整数の素因数分解が困難であること")
    print("  素因数分解の判定は NP に属する")
    print("  P=NP なら → 多項式時間で素因数分解できる → RSA 崩壊")
    print()

    # 小さい例で因数分解を検証（NP の証拠検証は O(log n)）
    def factorization_verifier(n: int, p: int, q: int) -> bool:
        """素因数分解の証拠を検証（多項式時間）"""
        return p > 1 and q > 1 and p * q == n

    n = 15
    p, q = 3, 5  # 証拠（証明器が提示）
    print(f"  n={n} の因数分解証拠 (p={p}, q={q}) の検証: {factorization_verifier(n, p, q)}")
    print("  ↑ 検証は O(1) だが、p と q を見つけることは（大きなnでは）困難")


# ===========================
# シナリオ 2: 旅行者問題（TSP）の最適解探索（P≠NP の現実）
# ===========================

def tsp_exact(n: int, dist: list[list[int]]) -> tuple[int, list[int]]:
    """TSP を全順列探索で解く（O(n!)）"""
    nodes = list(range(1, n))  # 0 を出発点として固定
    best_cost = float('inf')
    best_path = []
    for perm in permutations(nodes):
        path = [0] + list(perm) + [0]
        cost = sum(dist[path[i]][path[i+1]] for i in range(n))
        if cost < best_cost:
            best_cost = cost
            best_path = path
    return best_cost, best_path


def tsp_greedy(n: int, dist: list[list[int]]) -> tuple[int, list[int]]:
    """TSP を貪欲法で近似解を求める（O(n²)）"""
    visited = [False] * n
    path = [0]
    visited[0] = True
    for _ in range(n - 1):
        last = path[-1]
        next_city = min(
            (c for c in range(n) if not visited[c]),
            key=lambda c: dist[last][c]
        )
        path.append(next_city)
        visited[next_city] = True
    path.append(0)
    cost = sum(dist[path[i]][path[i+1]] for i in range(n))
    return cost, path


rsa_concept_demo()

print("[TSP での P≠NP の現実（P が分かっていても困難）]")
dist = [
    [0, 10, 15, 20],
    [10,  0, 35, 25],
    [15, 35,  0, 30],
    [20, 25, 30,  0],
]
n = 4
exact_cost, exact_path = tsp_exact(n, dist)
greedy_cost, greedy_path = tsp_greedy(n, dist)

print(f"  最適解（全探索 O(n!)）: コスト={exact_cost}, パス={exact_path}")
print(f"  貪欲近似（O(n²)）:     コスト={greedy_cost}, パス={greedy_path}")
print(f"  近似比: {greedy_cost / exact_cost:.2f}（1.0 が最適）")

print()
print("[P=NP 問題の現状まとめ]")
summary = [
    "1971年: Cook が SAT の NP 完全性を証明し問題を定式化",
    "1972年: Karp が 21 の NP 完全問題を示す",
    "1975年: Baker-Gill-Solovay が相対化の壁を証明",
    "1994年: Razborov-Rudich が自然な証明の壁を証明",
    "2000年: Clay 研究所がミレニアム懸賞問題に採用（賞金 100 万ドル）",
    "2026年現在: 依然として未解決",
]
for item in summary:
    print(f"  • {item}")
```

## 使用場面

- NP 困難な問題に取り組む際に、多項式時間の厳密解法は（おそらく）存在しないことを認識して近似・ヒューリスティックを選択する場面
- 暗号システムの安全性を評価する際に P ≠ NP 仮定に基づく困難性の根拠を理解する場面
- 計算機科学の基礎的な問いに触れて、問題の「本質的な困難さ」と「アルゴリズムの限界」を議論する場面

## 参考文献

- Cook, S. A. "The complexity of theorem proving procedures" (STOC 1971)
- Sipser, M. "Introduction to the Theory of Computation" (Cengage Learning)
- Aaronson, S. "Why Philosophers Should Care About Computational Complexity" (2011)
- Clay Mathematics Institute – Millennium Problems: P vs NP

<AffiliateBanner site="theory_navi" />
