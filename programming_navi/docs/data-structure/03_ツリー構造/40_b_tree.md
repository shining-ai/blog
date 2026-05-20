import AffiliateBanner from '@site/src/components/AffiliateBanner';

# B木 / B+木 (B-Tree / B+ Tree)

## B木（B-Tree）とは

B木（B-Tree）とは、

> 1つのノードが複数のキーと子を持つことができる平衡木

です。
<br/>

二分木の「2分岐」を一般化したもので、1ノードに多数のキーを格納できます。

![B木](https://res.cloudinary.com/dtilrevrm/image/upload/v1778002231/B%E6%9C%A8_p3fcx8.jpg)



**ディスクI/Oを最小化**するために設計されており、データベースやファイルシステムで広く使われています。

## B木の性質

次数を`t`としたとき、B木は以下の性質があります

- ノードごとにキー数の上限・下限がある(**t-1 以上 2t-1 以下**)
- 子の数は `キー数 + 1` 個を持つ
- すべての葉は同じ深さにある（完全に平衡）
- ノードのキーはソート済み

![B木の性質](https://res.cloudinary.com/dtilrevrm/image/upload/v1778002228/B%E6%9C%A8%E3%81%AE%E6%80%A7%E8%B3%AA_l6hxis.jpg)


## B木の操作

### 検索

1. ノード内でキーを探索（線形 or 二分探索）
2. 該当する子ノードへ移動
3. 繰り返し

![B木の検索](https://res.cloudinary.com/dtilrevrm/image/upload/v1778002227/B%E6%9C%A8%E3%81%AE%E6%A4%9C%E7%B4%A2_ytm9o8.jpg)


### 挿入

1. 挿入位置を探す
2. ノードに追加
3. あふれたら分割（split）

![B木の挿入1](https://res.cloudinary.com/dtilrevrm/image/upload/v1778002238/B%E6%9C%A8%E3%81%AE%E6%8C%BF%E5%85%A51_j5ps7l.jpg)
![B木の挿入2](https://res.cloudinary.com/dtilrevrm/image/upload/v1778002236/B%E6%9C%A8%E3%81%AE%E6%8C%BF%E5%85%A52_bqcket.jpg)


## 計算量

| 操作 | 計算量 | 備考 |
| --- | --- | --- |
| 検索 | O(log n) | |
| 挿入 | O(log n) | ノードの分割が発生することがある |
| 削除 | O(log n) | ノードの結合が発生することがある |


## B+木（B+ Tree）とは

B+木（B+ Tree）とは、

> データを葉ノードに集約し、葉同士が連結されたB木

です。
<br/>

![B+木](https://res.cloudinary.com/dtilrevrm/image/upload/v1778002233/B_%E6%9C%A8_vliiyl.jpg)


| | B木 | B+木 |
| --- | --- | --- |
| データの格納位置 | すべてのノード | 葉ノードのみ |
| 葉ノードのリンク | なし | 連結リストでつながっている |
| 範囲検索 | 木全体を走査 | 葉リストを順にたどるだけ |

B+木では葉ノードがリンクリストでつながっているため、
範囲検索（`WHERE age BETWEEN 10 AND 50` など）が高速です。

実際のデータベースでは、**B+tree**がよく使われます。


## 利用場面

- **RDBMSのインデックス**: MySQL（InnoDB）、PostgreSQL はB+木を使用
- **ファイルシステム**: NTFS、ext4 のディレクトリ構造
- **Key-Valueストア**: RocksDB などのLSMツリー

## Pythonでの簡易実装

本格的なB木は複雑なため、ここでは挿入のイメージを示します。

```python title="B木ノードの構造"
class BTreeNode:
    def __init__(self, t, leaf=False):
        self.t = t          # 最小次数
        self.keys = []      # キーのリスト
        self.children = []  # 子ノードのリスト
        self.leaf = leaf    # 葉ノードかどうか

    def is_full(self):
        return len(self.keys) == 2 * self.t - 1
```

実用上はPythonで直接B木を実装することはほとんどなく、
データベースエンジン（SQLite, PostgreSQLなど）を通じて利用します。

## なぜB-treeが必要なのか
二分探索木（BST）でも理論上は非常に高速です。
- 検索は速い（理論上O(log n)）
- 挿入・削除も可能

しかし、現実では問題が出てきます。

### 二分探索木（BST）の問題点

データは通常、**メモリではなくディスク**にあり、アクセス速度に大きな違いがあります。
- メモリ: ナノ秒単位でアクセス可能
- ディスク: マイクロ秒〜ミリ秒単位

つまり、

> 「何回ディスクを読むか」が性能を決める

この差は数千倍以上になることもあります。

二分探索木は、メモリ上では効率的ですが、ディスク上では問題がありました。
- ノード1つ読むごとにディスクアクセスが発生
- 木の高さが大きいとアクセス回数が増える

例：高さが20の木 → 最大20回のディスクアクセス
これは非常に遅いです。

### B-treeの発想

B-treeの核となるアイデアは、

> 1ノードにたくさんのキーを詰め込めば、木の高さを低くできる

例えば、1ノードに100キーを格納する場合、木の高さはlog_100(N)となり、BSTと比較するとlogの底が異なります。

また、ディスク上では1ノードを1ページ（4KB など）に対応させることで、1回のI/Oで大量のキーを読み込め、ディスクアクセス回数を最小化できます。




## 参考文献

<AffiliateBanner site="algorithm_introduction" />

[SQLite B-Tree Implementation](https://www.sqlite.org/fileformat.html)