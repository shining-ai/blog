import AffiliateBanner from '@site/src/components/AffiliateBanner';

# λ計算入門

## λ計算とは

> λ計算（Lambda Calculus）とは、アロンゾ・チャーチが1930年代に提案した関数定義・適用・変数束縛に基づく形式システムであり、チューリング機械と等価な計算能力を持つ最もシンプルな普遍的計算モデルである。

λ計算の構文は極めてシンプルで、3種類の項（Term）のみで構成されます。変数 x（変数参照）、λx.M（ラムダ抽象: 引数 x を受け取り M を返す関数の定義）、M N（関数適用: 関数 M に引数 N を適用）です。

計算規則（簡約規則）は主にβ簡約です。(λx.M) N → M[N/x]（M の中の自由変数 x を N で置換する）。たとえば (λx.x+1) 3 → 3+1 = 4 です。また α変換（束縛変数のリネーム: λx.M ≡ λy.M[x/y]）と η簡約（λx.f x → f（ただし x が f に自由出現しない場合））も重要な規則です。

λ計算はチューリング機械と計算能力が等価（チャーチ-チューリングのテーゼ）で、論理・データ構造・自然数（チャーチ数）・再帰（Y コンビネータ）をすべて純粋なλ式で表現できます。現代の関数型プログラミング言語（Haskell, ML, Lisp など）の理論的基盤であり、型理論・証明論とも深く結びついています。

## λ計算の主要な概念

| 概念 | 記法 | 説明 |
|------|------|------|
| ラムダ抽象 | λx.M | 引数 x を受け取る関数 M の定義 |
| 関数適用 | M N | 関数 M に引数 N を渡す |
| β簡約 | (λx.M) N → M[N/x] | 関数適用の基本計算規則 |
| α変換 | λx.M ≡ λy.M[x/y] | 束縛変数のリネーム |
| チャーチ数 | 0=λf.λx.x, 1=λf.λx.f x | 自然数のλ式での表現 |
| Y コンビネータ | Y=λf.(λx.f(x x))(λx.f(x x)) | 再帰を表現するコンビネータ |

```python
# λ計算の概念的実装（Python の関数でλ計算を模倣）

# チャーチ数の実装（Python 関数として）
# チャーチ数 n は「f を n 回適用する」関数として表現される
# n = lambda f: lambda x: f(f(...f(x)...))  (f が n 回)

def church(n):
    """自然数 n をチャーチ数（Python 関数）に変換"""
    def cn(f):
        def apply_n(x):
            result = x
            for _ in range(n):
                result = f(result)
            return result
        return apply_n
    return cn

def church_to_int(cn):
    """チャーチ数を整数に変換"""
    return cn(lambda x: x + 1)(0)

# チャーチ数の演算
zero  = church(0)  # λf.λx.x
one   = church(1)  # λf.λx.f x
two   = church(2)  # λf.λx.f(f x)
three = church(3)

# 加算: λm.λn.λf.λx. m f (n f x)
def church_add(m, n):
    return lambda f: lambda x: m(f)(n(f)(x))

# 乗算: λm.λn.λf. m(n f)
def church_mul(m, n):
    return lambda f: m(n(f))

print("チャーチ数の演算:")
print(f"  2 + 3 = {church_to_int(church_add(two, three))}")   # 5
print(f"  2 * 3 = {church_to_int(church_mul(two, three))}")   # 6
print(f"  3 + 0 = {church_to_int(church_add(three, zero))}")  # 3

# チャーチ真偽値
TRUE  = lambda t: lambda f: t   # λt.λf.t
FALSE = lambda t: lambda f: f   # λt.λf.f
IF    = lambda c: lambda t: lambda f: c(t)(f)  # λc.λt.λf. c t f

print("\nチャーチ真偽値:")
result_true  = IF(TRUE)(lambda: "yes")(lambda: "no")()
result_false = IF(FALSE)(lambda: "yes")(lambda: "no")()
print(f"  IF TRUE yes no = {result_true}")   # yes
print(f"  IF FALSE yes no = {result_false}") # no

# Y コンビネータ（再帰）の概念的実装
# Y = λf.(λx.f(x x))(λx.f(x x))
# Python ではそのまま書くと無限ループするため遅延評価で実装
def Y(f):
    """Y コンビネータ（Python での近似実装）"""
    return f(lambda x: Y(f)(x))

# 階乗関数をY コンビネータで定義
factorial_step = lambda rec: lambda n: 1 if n <= 0 else n * rec(n - 1)
factorial = Y(factorial_step)
print("\nY コンビネータによる再帰:")
for i in range(6):
    print(f"  factorial({i}) = {factorial(i)}")

# β簡約の例示
print("\nβ簡約の例:")
print("  (λx.λy.x) a b")
print("  = (λy.a) b    ← x を a に置換")
print("  = a           ← y を b に置換（y は本体に出現しない）")
print("  これはチャーチ真偽値 TRUE = λt.λf.t と同型")
```

## 使用場面

- **関数型プログラミング言語**: Haskell・OCaml・F# などの型システムと評価戦略はλ計算を直接基盤にしている
- **型理論と証明支援系**: Coq・Agda・Lean などの定理証明支援システムは依存型λ計算を計算モデルとして使用する
- **コンパイラの中間表現**: GHC（Haskell コンパイラ）はラムダ式をコア言語として内部最適化に使用する
- **計算可能性理論**: チューリング機械と等価な計算モデルとして、計算の本質を関数の観点から研究する

## 参考文献

- Church, A. "An unsolvable problem of elementary number theory" (1936)
- Barendregt, H. P. "The Lambda Calculus: Its Syntax and Semantics"
- Pierce, B. C. "Types and Programming Languages" (MIT Press)
- 萩野達也「プログラム意味論」(共立出版)

<AffiliateBanner site="theory_navi" />
