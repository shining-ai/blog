import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 動的配列 (Dynamic Array)

## 動的配列とは

動的配列とは、

> サイズを自動的に変更できる可変長の配列データ構造

です。
<br/>

![通常の配列の問題点と動的配列のメリット](https://res.cloudinary.com/dtilrevrm/image/upload/v1777104388/%E5%8B%95%E7%9A%84%E9%85%8D%E5%88%97%E3%81%A8%E3%81%AF_jfpqn8.jpg)

通常の配列はサイズが固定されているのに対し、動的配列は要素の追加・削除に応じてメモリ領域を自動的に拡張・縮小します。

プログラム実行前にサイズが決まらない場合や、要素数が変動する場合に使われます。



## 動的配列の仕組み

動的配列は内部的には通常の配列で実装されており、容量が不足したときに**新しい大きな配列を確保してコピーする**という動作をします。

### 内部構造（length と capacity）

動的配列オブジェクトは **length**（実際の要素数）と **capacity**（確保済みの容量）の2つの値を管理します。

`length < capacity` の間は既存の配列に書き込むだけで O(1) です。

![動的配列の内部構造](https://res.cloudinary.com/dtilrevrm/image/upload/v1777111590/%E5%8B%95%E7%9A%84%E9%85%8D%E5%88%97%E3%81%AE%E5%86%85%E9%83%A8%E6%A7%8B%E9%80%A0_xad3cm.jpg)

### 拡張の流れ

`length == capacity` になると、以下のステップで配列を拡張します。

1. 内部配列の容量が上限に達する
2. 現在の容量の **2倍** の配列を新たに確保する（実装によって倍率は異なる）
3. 既存の要素を新しい配列にコピーする
4. 古い配列を解放する

![拡張処理のステップ](https://res.cloudinary.com/dtilrevrm/image/upload/v1777111590/%E5%8B%95%E7%9A%84%E9%85%8D%E5%88%97%E3%81%AE%E6%8B%A1%E5%BC%B5%E6%93%8D%E4%BD%9C_go4yus.jpg)

この「2倍ずつ拡張する」戦略により、n回の追加操作全体のコストをならすと、**1回あたり償却O(1)** になります。

## 動的配列の計算量

| 操作 | 計算量 | 備考 |
| --- | --- | --- |
| 要素の参照 | O(1) | インデックスで直接アクセス |
| 末尾に追加 | O(1) 償却 | まれに拡張コストO(n)が発生 |
| 先頭・途中に追加 | O(n) | 後続要素のシフトが必要 |
| 末尾の削除 | O(1) | |
| 先頭・途中の削除 | O(n) | 後続要素のシフトが必要 |
| 検索 | O(n) | 線形探索 |

末尾への追加が**償却O(1)**になる理由は、拡張コストが過去の追加操作に分散されるためです。

## 固定長配列との比較

| | 固定長配列 | 動的配列 |
| --- | --- | --- |
| サイズ | 宣言時に固定 | 自動で拡張・縮小 |
| メモリ効率 | 高い（無駄なし） | やや低い（余分な容量を持つ場合あり） |
| 末尾への追加 | できない（固定） | O(1) 償却 |
| ランダムアクセス | O(1) | O(1) |
| 用途 | サイズが決まっている場合 | サイズが動的に変わる場合 |

### 容量と長さの違い

Pythonの `list` は内部的に余分な容量を確保しています。
`sys.getsizeof` で実際のメモリ使用量を確認できます。

```python title="容量の確認"
import sys

lst = []
prev_size = sys.getsizeof(lst)

print(f"len={len(lst)}, size={prev_size}")

for i in range(10):
    lst.append(i)
    size = sys.getsizeof(lst)
    print(f"len={len(lst)}, size={size}")
```

```text title="実行結果"
len=0, size=56
len=1, size=88
len=2, size=88
len=3, size=88
len=4, size=88
len=5, size=120
len=6, size=120
len=7, size=120
len=8, size=120
len=9, size=184
len=10, size=184
```

サイズが変化するタイミング（1→5→9要素）が capacity の拡張タイミングに対応しています。

## 各言語での対応

| 言語 | 動的配列の型 |
| --- | --- |
| Python | `list` |
| C++ | `std::vector` |
| Java | `ArrayList` |
| JavaScript | `Array` |
| Go | `slice` |

## 参考文献
