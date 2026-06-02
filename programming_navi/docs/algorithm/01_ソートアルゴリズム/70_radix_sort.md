import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 基数ソート (Radix Sort)

## 基数ソートとは

基数ソートとは、

> 最下位桁から最上位桁へ、桁ごとに安定ソートを繰り返すソートアルゴリズム

です。
<br/>

各桁の値域は 0〜9（または 0〜1 の2進数）と小さいため、計数ソートを内部に使うことで非常に高速に動作します。

## アルゴリズムの手順（LSD: 最下位桁から）

配列 `[170, 45, 75, 90, 802, 24, 2, 66]` をソートする例を示します。

![基数ソートの手順](https://res.cloudinary.com/dtilrevrm/image/upload/v1780411999/%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%891_zifkgs.jpg)

各パスで安定ソートを使うため、前のパスの順序が崩れません。

## 計算量

| | 計算量 | 備考 |
| --- | --- | --- |
| 時間 | O(d × (n + k)) | d: 桁数、n: 要素数、k: 基数 |
| 空間 | O(n + k) | 出力配列とカウント配列 |
| 安定性 | 安定 | 各桁のソートに安定ソートを使う場合 |

10進数で最大値が M のとき d = ⌊log₁₀ M⌋ + 1 です。
n = 1000、M = 100万（d = 7）なら O(7 × 1010) ≈ O(n) となります。

## 実装

```python title="基数ソート（LSD、10進数）"
def radix_sort(arr: list) -> list:
    if not arr:
        return arr

    max_val = max(arr)
    exp = 1
    while max_val // exp > 0:
        arr = _counting_sort_by_digit(arr, exp)
        exp *= 10
    return arr

def _counting_sort_by_digit(arr: list, exp: int) -> list:
    """exp 桁目（1, 10, 100, ...）で安定計数ソート"""
    n      = len(arr)
    output = [0] * n
    count  = [0] * 10

    # 各桁の出現回数をカウント
    for x in arr:
        count[(x // exp) % 10] += 1

    # 累積和
    for i in range(1, 10):
        count[i] += count[i - 1]

    # 後ろから取り出して安定性を保つ
    for x in reversed(arr):
        digit = (x // exp) % 10
        count[digit] -= 1
        output[count[digit]] = x

    return output
```

```python title="使用例"
arr = [170, 45, 75, 90, 802, 24, 2, 66]
print(radix_sort(arr))  # [2, 24, 45, 66, 75, 90, 170, 802]
```

### 2進数（ビット）ベースの基数ソート

2進数で扱うと基数 k=2 で桁数が増えますが、2の累乗ビット幅（例: 8bit ずつ）でまとめて処理するのが実用的です。

```python title="8bit ずつ処理する基数ソート"
def radix_sort_bin(arr: list, bits: int = 8) -> list:
    """bits ビットずつ処理（32bit 整数なら 4パス）"""
    mask = (1 << bits) - 1
    max_shift = 32
    for shift in range(0, max_shift, bits):
        k = 1 << bits
        count = [0] * k
        for x in arr:
            count[(x >> shift) & mask] += 1
        for i in range(1, k):
            count[i] += count[i - 1]
        output = [0] * len(arr)
        for x in reversed(arr):
            idx = (x >> shift) & mask
            count[idx] -= 1
            output[count[idx]] = x
        arr = output
    return arr
```

## 計数ソートとの使い分け

| | 計数ソート | 基数ソート |
| --- | --- | --- |
| 適用条件 | 値域が小さい（k が小さい） | 桁数が少ない整数 |
| 計算量 | O(n + k) | O(d(n + k)) |
| 典型用途 | 0〜255 のバイト、評価値 | 電話番号、IPアドレス、大きな整数 |

### 長所

- O(d(n + k)) で大きな値域の整数にも線形時間に近い性能を出せる
- 安定ソートである
- 計数ソートでは扱いにくい大きな値域に対応できる

### 短所

- 整数または固定長データにしか使えない
- 桁数 d が大きいと遅くなる（クイックソートに負ける場合がある）
- 実装が計数ソートや比較ソートより複雑

## 使用場面

- **桁数が少ない大きな整数**: 電話番号・郵便番号・IPアドレスのソート
- **固定長文字列のソート**: 文字コードを桁として扱うことができる
- **比較ソートより高速が必要で値が整数**: O(n) に近い性能が必要な場合

:::info MSD（最上位桁から）基数ソート
LSD（最下位桁から）の他に **MSD（最上位桁から）** の変種もあります。
MSD は再帰的にバケット分割していき、辞書順ソートに使いやすいという特徴があります。
:::

## 参考文献
