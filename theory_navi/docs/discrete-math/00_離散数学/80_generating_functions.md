import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 生成関数入門

## 生成関数とは

> 生成関数（Generating Function）とは数列 a_0, a_1, a_2, ... を形式的べき級数 A(x) = Σ a_n x^n として表現することで、数列の加減乗除・漸化式の解法・計数問題を代数的に扱う手法である。

生成関数は「数列を関数に変換する」ことで、難しい計数問題を代数演算に帰着させます。最も基本的な**通常型生成関数**（Ordinary Generating Function, OGF）は A(x) = Σ a_n x^n です。係数 [x^n] A(x) が求める数 a_n に対応し、形式的な操作（掛け算・逆数）が組み合わせ的な意味を持ちます。

たとえば 1/(1-x) = 1 + x + x^2 + ... は数列 (1,1,1,...) の OGF であり、1/(1-x)^2 は自然数列 (1,2,3,...) の OGF です。2つの数列の OGF の積 A(x)B(x) の係数は**畳み込み**（convolution）に対応します。

**指数型生成関数**（Exponential Generating Function, EGF）は A(x) = Σ a_n x^n/n! で、順列の計数（順序付き構造）に向いています。e^x は EGF で (1,1,1,...) に対応し、e^\{2x} = e^x * e^x は「2色からなる文字列の数え方」を表します。漸化式 F_n = F_\{n-1} + F_\{n-2}（フィボナッチ）も OGF で解くと閉じた形の解が得られます。

## 主要な生成関数の対応表

| 数列 a_n | OGF A(x) |
|----------|----------|
| 1, 1, 1, ... | 1/(1-x) |
| 1, 2, 3, ... | 1/(1-x)^2 |
| C(n,k) (固定 k) | x^k / (1-x)^\{k+1} |
| フィボナッチ F_n | x/(1-x-x^2) |
| カタラン数 C_n | (1 - sqrt(1-4x)) / (2x) |
| n! | 1/(1-x)（EGF では e^x / (1-x)） |

```python
# 生成関数を用いた計数のデモ（sympy を使用）
try:
    from sympy import symbols, series, factorial, sqrt, Rational, expand

    x = symbols('x')

    # 1. 1/(1-x) の展開（最初の8項）
    ogf = 1 / (1 - x)
    s = series(ogf, x, 0, 8)
    print("1/(1-x):", s)

    # 2. フィボナッチ数列の OGF
    fib_ogf = x / (1 - x - x**2)
    fib_series = series(fib_ogf, x, 0, 10)
    print("フィボナッチ OGF:", fib_series)

    # 3. カタラン数（括弧の組み合わせ数など）
    catalan_ogf = (1 - sqrt(1 - 4*x)) / (2*x)
    catalan_series = series(catalan_ogf, x, 0, 7)
    print("カタラン数 OGF:", catalan_series)

except ImportError:
    print("sympy が未インストール。手動で係数を計算します。")

# sympy なしでも使える多項式乗算による畳み込み
def poly_mul(a: list, b: list, terms: int) -> list:
    """多項式 a と b の積の最初の terms 項を計算"""
    result = [0] * terms
    for i, ai in enumerate(a):
        if i >= terms: break
        for j, bj in enumerate(b):
            if i + j >= terms: break
            result[i + j] += ai * bj
    return result

# 1/(1-x)^2 の係数（= 自然数列）を乗算で確認
ones = [1] * 10
nat = poly_mul(ones, ones, 10)
print("1/(1-x)^2 の係数:", nat)  # [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

# フィボナッチ漸化式を OGF で手動に解く（閉形式の確認）
import math
phi = (1 + math.sqrt(5)) / 2
psi = (1 - math.sqrt(5)) / 2
fib_closed = lambda n: round((phi**n - psi**n) / math.sqrt(5))
print("フィボナッチ（閉形式）:", [fib_closed(n) for n in range(10)])
```

## 使用場面

- **漸化式の解法**: フィボナッチ・カタラン数など複雑な漸化式に閉形式の解を与える
- **アルゴリズム解析**: 分割統治の再帰式（マスター定理）を OGF で解析する
- **組み合わせ計数**: 分割数（integer partition）・ナイル数など高度な計数に使われる
- **確率母関数**: 確率分布の母関数（特性関数）はモーメント計算・分布の合成に使われる

## 参考文献

- Wilf, H. S. "generatingfunctionology" (Academic Press, 無料PDF公開)
- Graham, Knuth, Patashnik "Concrete Mathematics" (Addison-Wesley)

<AffiliateBanner site="theory_navi" />
