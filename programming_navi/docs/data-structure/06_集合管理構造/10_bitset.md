import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ビット集合 (Bitset)

## ビット集合とは

ビット集合（Bitset）とは、

> 整数の各ビットを使って集合の所属を管理するデータ構造

です。
<br/>

n 個の要素の集合を n ビットの整数1つで表現します。

各ビットの位置が「要素番号」に対応し、そのビットが `1` なら「集合に属している」、`0` なら「属していない」を意味します。

![ビットと集合の対応](https://res.cloudinary.com/dtilrevrm/image/upload/v1779032964/%E3%83%93%E3%83%83%E3%83%88%E3%82%BB%E3%83%83%E3%83%88_b6n6ig.jpg)

集合演算（和・積・差）が**ビット演算**で一括処理できるため非常に高速です。



## ビット演算と集合演算の対応

| 集合演算 | ビット演算 | Python の記号 |
| --- | --- | --- |
| 和集合（A ∪ B） | OR | `a \| b` |
| 積集合（A ∩ B） | AND | `a & b` |
| 対称差（A △ B） | XOR | `a ^ b` |
| 補集合 | NOT | `~a & mask` ※ |
| 差集合（A − B） | AND NOT | `a & (~b & mask)` ※ |
| 要素 i の追加 | OR | `a \| (1 << i)` |
| 要素 i の削除 | AND NOT | `a & ~(1 << i)` |
| 要素 i の確認 | AND | `(a >> i) & 1` |

![ビット演算の処理](https://res.cloudinary.com/dtilrevrm/image/upload/v1779032964/%E3%83%93%E3%83%83%E3%83%88%E6%BC%94%E7%AE%97%E3%81%AE%E5%87%A6%E7%90%86_ik7qdv.jpg)

:::caution Python の `~` に注意
Python の整数は任意精度の**符号付き**整数です。`~b` は `-b - 1` となり、上位ビットがすべて 1 になります。
差集合や補集合を扱う場合は `mask = (1 << n) - 1` を用意して `a & ~b & mask` のようにマスクしてください。
:::

![pythonにおける補集合](https://res.cloudinary.com/dtilrevrm/image/upload/v1779032964/python%E3%81%AB%E3%81%8A%E3%81%91%E3%82%8B%E8%A3%9C%E9%9B%86%E5%90%88_vb7ghk.jpg)


## 計算量

nビットの演算はCPUが1命令で処理できます。

そのため、通常の `set` の集合演算は O(n) ですが、Bitset は O(n / w) と最大 **64 倍高速**です。

**n** 個の要素を管理するとき、整数のビット幅を **w**（通常 64 bit）とすると

| 操作 | 計算量 |
| --- | --- |
| 集合演算（和・積・差） | O(n / w) |
| 要素の追加・削除・確認 | O(1) |
| メモリ | O(n / w) |


## 実装

### 基本操作

```python title="Python の整数によるビット集合"
# 集合 {0, 2, 3} を表現（bit 0, 2, 3 が 1）
a = 0b1101   # = 13

# 集合 {1, 2, 4} を表現（bit 1, 2, 4 が 1）
b = 0b10110  # = 22

# 和集合 {0, 1, 2, 3, 4}
print(bin(a | b))   # 0b11111

# 積集合 {2}
print(bin(a & b))   # 0b100

# 差集合 a − b = {0, 3}（要素数 n=5 でマスク）
n = 5
mask = (1 << n) - 1
print(bin(a & ~b & mask))  # 0b1001
```

### ユーティリティ関数

```python title="ビット集合のユーティリティ関数"
def add(s, i):
    """集合 s に要素 i を追加"""
    return s | (1 << i)

def remove(s, i):
    """集合 s から要素 i を削除"""
    return s & ~(1 << i)

def contains(s, i):
    """集合 s に要素 i が含まれるか"""
    return bool((s >> i) & 1)

def to_list(s):
    """ビット集合を要素のリストに変換"""
    result = []
    i = 0
    while s:
        if s & 1:
            result.append(i)
        s >>= 1
        i += 1
    return result

s = 0
s = add(s, 0)
s = add(s, 2)
s = add(s, 3)
print(to_list(s))      # [0, 2, 3]
print(contains(s, 2))  # True
s = remove(s, 2)
print(to_list(s))      # [0, 3]
```

### C++ の `bitset`

C++ では標準ライブラリに `std::bitset` が用意されており、固定長のビット集合を効率よく扱えます。

```cpp title="C++ の std::bitset"
#include <bitset>
#include <iostream>
using namespace std;

int main() {
    bitset<8> a("00001101");  // {0, 2, 3}
    bitset<8> b("00010110");  // {1, 2, 4}

    cout << (a | b) << endl;  // 00011111  和集合
    cout << (a & b) << endl;  // 00000100  積集合
    cout << (a ^ b) << endl;  // 00011011  対称差
    cout << a.count() << endl; // 3  要素数
}
```

 `bitset<N>` を使うことで、定数倍の高速化が可能です。

## ビット DP での活用

訪問済み状態の集合を高速化したい場合、ビット集合で表す**ビット DP** がよく使われます。

```python title="巡回セールスマン問題（TSP）のビット DP"
n = 4 # 都市の数
INF = float('inf')
dist = [[INF] * n for _ in range(n)]  # 距離行列（事前に設定しておく）

# dp[S][v] = 訪問済み集合 S(bit)、今いる都市 v の時における最小コスト
dp = [[INF] * n for _ in range(1 << n)]
dp[1][0] = 0  # 頂点 0 から出発（ビット 0 が立っている）

for S in range(1 << n):
    for v in range(n):
        if dp[S][v] == INF:
            continue
        for u in range(n):
            if (S >> u) & 1:  # 既に訪問済み
                continue
            ns = S | (1 << u)
            dp[ns][u] = min(dp[ns][u], dp[S][v] + dist[v][u])

# 全頂点を訪問して頂点 0 に戻るコスト
full = (1 << n) - 1
ans = min(dp[full][v] + dist[v][0] for v in range(1, n))
```

ビット DP のポイントは「部分集合」を整数 1 つで表現できることです。

全部分集合の数は 2^n 個で、n ≤ 20 程度なら十分高速に処理できます。

## まとめ

| 特性 | 内容 |
| --- | --- |
| 適用条件 | 要素が 0 〜 n−1 の整数インデックスで管理できる場合 |
| 得意な操作 | 集合演算の高速化（約 64 倍）、部分集合の列挙 |
| 苦手な操作 | 要素の型が整数以外の場合（ハッシュが必要） |
| 主な用途 | ビット DP、フラグ管理、フィルタリング |

## 参考文献
