import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 関係と写像

## 関係と写像とは

> 関係（Relation）は直積集合の部分集合として定義される集合間の対応であり、写像（Function / Map）は各要素にちょうど1つの像を対応させる特別な関係である。

集合 A と B に対し、直積 A × B の部分集合 R ⊆ A × B を A から B への**二項関係**と呼びます。(a, b) ∈ R のとき「a は b と関係 R にある」と言い、aRb と書くこともあります。同一集合 A 上の関係（A × A の部分集合）は重要な性質—反射律（a R a）、対称律（a R b ⇒ b R a）、推移律（a R b かつ b R c ⇒ a R c）、反対称律（a R b かつ b R a ⇒ a = b）—を持ちえます。

同値関係はこれら反射律・対称律・推移律をすべて満たす関係で、集合を**同値類**に分割（商集合）します。整数の合同関係（mod n）や文字列の同型性などが典型例です。半順序関係は反射律・反対称律・推移律を満たし、ハッセ図で可視化できます。

写像 f: A → B は、A の各要素 a にちょうど1つの B の要素 f(a) を対応させます。写像は単射（異なる元を異なる元に写す）、全射（B のすべての元が像に含まれる）、全単射（単射かつ全射、逆写像が存在）に分類されます。全単射の存在は2つの集合の**濃度が等しい**ことの定義であり、無限集合論の核心をなします。

## 関係の性質分類

| 性質 | 定義 | 例 |
|------|------|----|
| 反射律 | ∀a: aRa | "=" , "≤" |
| 対称律 | aRb ⇒ bRa | "=" , "兄弟関係" |
| 推移律 | aRb ∧ bRc ⇒ aRc | "=" , "\<" , "⊆" |
| 反対称律 | aRb ∧ bRa ⇒ a=b | "≤" , "⊆" |
| 同値関係 | 反射+対称+推移 | "mod n で合同" |
| 半順序 | 反射+反対称+推移 | "≤" , "⊆" |

```python
# 同値関係と商集合のシミュレーション
def equivalence_classes(elements, equiv):
    """同値関係 equiv に基づいて elements を同値類に分割する"""
    classes = []
    used = set()
    for x in elements:
        if x in used:
            continue
        cls = frozenset(y for y in elements if equiv(x, y))
        classes.append(cls)
        used.update(cls)
    return classes

# mod 3 による合同関係
elements = list(range(10))
classes = equivalence_classes(elements, lambda a, b: (a - b) % 3 == 0)
print("Z/3Z の同値類:", [sorted(c) for c in sorted(classes)])
# [[0, 3, 6, 9], [1, 4, 7], [2, 5, 8]]

# 写像の性質検査
def is_injective(f, domain):
    """単射かどうかを判定"""
    images = [f(x) for x in domain]
    return len(images) == len(set(images))

def is_surjective(f, domain, codomain):
    """全射かどうかを判定"""
    images = set(f(x) for x in domain)
    return images == set(codomain)

domain = [1, 2, 3, 4]
codomain = [1, 4, 9, 16]
f_square = lambda x: x * x

print("f(x)=x^2 は単射か:", is_injective(f_square, domain))          # True
print("f(x)=x^2 は全射か:", is_surjective(f_square, domain, codomain)) # True
print("=> 全単射:", is_injective(f_square, domain) and is_surjective(f_square, domain, codomain))
```

## 使用場面

- **データベース設計**: テーブル間の関係（1対多・多対多）は二項関係として模型化できる
- **型理論**: 部分型関係（サブタイピング）は半順序関係であり、型推論に利用される
- **グラフ理論**: グラフの辺集合は頂点集合上の対称二項関係として表現できる
- **ハッシュ・等価性**: プログラミング言語の == 演算子は同値関係の公理を満たす必要がある

## 参考文献

- Rosen, K. H. "Discrete Mathematics and Its Applications" (McGraw-Hill)
- 河田敬義「現代数学の基礎」(岩波書店)

<AffiliateBanner site="theory_navi" />
