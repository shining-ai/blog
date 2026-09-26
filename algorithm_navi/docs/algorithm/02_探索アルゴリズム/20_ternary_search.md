import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 三分探索 (Ternary Search)

## 三分探索とは

三分探索とは、

> 単峰関数（unimodal function）の範囲を3分割して探索点を2つ置き、極値（最大値・最小値）の位置を絞り込むアルゴリズム

です。
<br/>

二分探索が「単調な条件の境界」を探すのに対し、三分探索は「**山形（または谷形）の関数の頂点**」を探します。

## 単峰関数（Unimodal Function）とは

単峰関数とは、増加してから減少する（または減少してから増加する）関数です。

![単峰関数とは](https://res.cloudinary.com/dtilrevrm/image/upload/v1780501742/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%891_eieksd.jpg)

三分探索は単峰関数の**極値の位置**を O(log n) で求めます。

## アルゴリズムの手順

配列 `[1, 3, 6, 9, 10, 8, 5, 3, 1]`（最大値はindex 4）で説明します。

2つの探索点 `m1`、`m2` を置き、`f(m1)` と `f(m2)` を比較して範囲を絞ります。

![三分探索の手順1](https://res.cloudinary.com/dtilrevrm/image/upload/v1780501743/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%892_cwc6xa.jpg)

![三分探索の手順2](https://res.cloudinary.com/dtilrevrm/image/upload/v1780501741/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%893_vf2fyq.jpg)

:::info なぜ絞り込めるのか
単峰関数の性質より:
- `f(m1) < f(m2)` なら、最大値は必ず m1 より右にある（m1 の左は除外可）
- `f(m1) > f(m2)` なら、最大値は必ず m2 より左にある（m2 の右は除外可）
:::

## 計算量

| | 計算量 | 備考 |
| --- | --- | --- |
| 連続版 | O(log((hi-lo)/ε)) | ε は許容誤差 |
| 離散版 | O(log n) | 1ステップで範囲が 2/3 に |
| 空間 | O(1) | |
| 前提 | 単峰関数（unimodal） | 二峰以上には使えない |

## 実装

### 連続版（浮動小数点関数）

```python title="三分探索（連続版）"
def ternary_search_max(f, lo: float, hi: float, eps: float = 1e-9) -> float:
    """連続関数 f の [lo, hi] 上の最大値を持つ x を返す"""
    while hi - lo > eps:
        m1 = lo + (hi - lo) / 3
        m2 = hi - (hi - lo) / 3
        if f(m1) < f(m2):
            lo = m1
        else:
            hi = m2
    return (lo + hi) / 2

# 例: f(x) = -(x-3)² + 10  の最大値
f = lambda x: -(x - 3) ** 2 + 10
x_max = ternary_search_max(f, 0.0, 10.0)
print(f"x = {x_max:.6f}, f(x) = {f(x_max):.6f}")
# x = 3.000000, f(x) = 10.000000
```

### 離散版（配列・整数）

```python title="三分探索（離散版）"
def ternary_search_max_discrete(arr: list) -> int:
    """単峰配列の最大値インデックスを返す"""
    lo, hi = 0, len(arr) - 1
    while hi - lo > 2:
        m1 = lo + (hi - lo) // 3
        m2 = hi - (hi - lo) // 3
        if arr[m1] < arr[m2]:
            lo = m1 + 1
        else:
            hi = m2 - 1
    # 残った範囲（最大3要素）から最大値を選ぶ
    return max(range(lo, hi + 1), key=lambda i: arr[i])

arr = [1, 3, 6, 9, 10, 8, 5, 3, 1]
idx = ternary_search_max_discrete(arr)
print(f"最大値 = {arr[idx]}（index {idx}）")  # 最大値 = 10（index 4）
```

```python title="最小値を探す場合（谷形）"
def ternary_search_min(f, lo: float, hi: float, eps: float = 1e-9) -> float:
    """連続関数 f の [lo, hi] 上の最小値を持つ x を返す"""
    while hi - lo > eps:
        m1 = lo + (hi - lo) / 3
        m2 = hi - (hi - lo) / 3
        if f(m1) > f(m2):   # 不等号が逆になる
            lo = m1
        else:
            hi = m2
    return (lo + hi) / 2
```

## 二分探索との使い分け

| | 二分探索 | 三分探索 |
| --- | --- | --- |
| 対象 | 単調関数（境界探索） | 単峰関数（極値探索） |
| 探索点 | 1点（mid） | 2点（m1, m2） |
| 削除割合 | 1/2 ずつ | 1/3 ずつ |
| 実装 | シンプル | やや複雑 |

:::tip 凸関数への応用
三分探索は**下に凸な関数（convex function）の最小値**の探索に特に有効です。
凸関数は谷形の単峰関数でもあるため、三分探索が適用できます。
:::

## 使用場面

- **関数の極値を求める**: 放物線・凸関数・凹関数の頂点・底点
- **幾何問題**: 点と折れ線の最短距離、最近点対の探索
- **機械学習の最適化**: 1次元探索（黄金分割探索も同様の考え方）

## 参考文献

