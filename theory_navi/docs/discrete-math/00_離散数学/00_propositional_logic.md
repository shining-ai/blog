import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 命題論理と述語論理

## 命題論理と述語論理とは

> 命題論理は「真または偽の値をとる文（命題）」を論理演算子で結合して推論を形式化する体系であり、述語論理はさらに変数・量化子を導入して「すべての x について」「ある x が存在する」といった表現を扱う体系である。

数学・コンピュータ科学において、命題論理（Propositional Logic）と述語論理（Predicate Logic / First-Order Logic）は形式的推論の土台をなします。命題論理では P ∧ Q（かつ）、P ∨ Q（または）、¬P（でない）、P → Q（ならば）、P ↔ Q（同値）の5つの論理演算子を用いて複合命題を構築します。真理値表を使えば任意の複合命題の真偽を機械的に求められ、充足可能性（SAT）や恒真式（トートロジー）の判定が可能です。

述語論理は命題論理を拡張し、述語（P(x)：「x は素数である」など）・全称量化子（∀x）・存在量化子（∃x）を加えます。これによって数学の定理「すべての偶数 n > 2 は2つの素数の和で表せる（ゴールドバッハ予想）」のような文を形式化できます。述語論理は決定不能（ゲーデルの不完全性定理）ですが、一階述語論理には健全で完全な証明体系（ゲーデルの完全性定理）が存在します。論理プログラミング言語 Prolog や自動定理証明、モデル検査など、計算機科学の多くの分野の基盤となっています。

## 論理演算子の真理値表

| P | Q | P ∧ Q | P ∨ Q | ¬P | P → Q | P ↔ Q |
|---|---|-------|-------|----|-------|-------|
| T | T | T | T | F | T | T |
| T | F | F | T | F | F | F |
| F | T | F | T | T | T | F |
| F | F | F | F | T | T | T |

## 重要な論理等価式

| 法則 | 式 |
|------|----|
| 二重否定 | ¬¬P ≡ P |
| ド・モルガン | ¬(P ∧ Q) ≡ ¬P ∨ ¬Q |
| 含意の変換 | P → Q ≡ ¬P ∨ Q |
| 対偶 | P → Q ≡ ¬Q → ¬P |
| 分配則 | P ∧ (Q ∨ R) ≡ (P ∧ Q) ∨ (P ∧ R) |

```python
# 真理値表の生成と命題の検証
from itertools import product

def evaluate(p, q):
    """主要な論理演算の真理値を返す"""
    return {
        "P": p,
        "Q": q,
        "P AND Q": p and q,
        "P OR Q": p or q,
        "NOT P": not p,
        "P -> Q": (not p) or q,
        "P <-> Q": p == q,
    }

print("P\tQ\tP->Q\tP<->Q")
for p, q in product([True, False], repeat=2):
    r = evaluate(p, q)
    print(f"{int(r['P'])}\t{int(r['Q'])}\t{int(r['P -> Q'])}\t{int(r['P <-> Q'])}")

# 述語論理のシミュレーション
domain = range(1, 11)  # 定義域: 1〜10

def is_even(n): return n % 2 == 0
def is_positive(n): return n > 0

# ∀x P(x): すべての x で P が成り立つか
forall_even = all(is_positive(x) for x in domain)
print(f"∀x∈[1..10]: x > 0  =>  {forall_even}")  # True

# ∃x P(x): ある x で P が成り立つか
exists_even = any(is_even(x) for x in domain)
print(f"∃x∈[1..10]: x は偶数  =>  {exists_even}")  # True
```

## 使用場面

- **デジタル回路設計**: 論理ゲート（AND・OR・NOT）の最適化に命題論理を活用する
- **SAT ソルバー**: 充足可能性判定は AI 計画・ハードウェア検証・暗号解読に応用される
- **プログラム検証**: 事前条件・事後条件の形式化に述語論理を使用し、プログラムの正当性を証明する
- **データベースクエリ**: SQL の WHERE 句は本質的に述語論理の式である

## 参考文献

- Rosen, K. H. "Discrete Mathematics and Its Applications" (McGraw-Hill)
- 萩野達也「情報数学入門」(共立出版)

<AffiliateBanner site="theory_navi" />
