import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 二分木 (Binary Tree)

## 二分木とは

二分木とは、

> 各ノードが最大2つの子ノード（左の子・右の子）を持つ木構造

です。
<br/>

![二分木](https://res.cloudinary.com/dtilrevrm/image/upload/v1777788855/%E4%BA%8C%E5%88%86%E6%9C%A8_knjyt7.jpg)

木構造の中で最も基本的な形であり、二分探索木・ヒープ・セグメント木など多くのデータ構造の基礎となります。

## 木構造の基本用語

| 用語 | 説明 |
| --- | --- |
| 根（Root） | 木の最上位のノード |
| 葉（Leaf） | 子を持たないノード |
| 深さ（Depth） | ルートからの距離（辺の数） |
| 高さ（Height） | そのノードから最も遠い葉までの距離 |

![木構造の基本用語](https://res.cloudinary.com/dtilrevrm/image/upload/v1777800663/%E4%BA%8C%E5%88%86%E6%9C%A8_%E5%9F%BA%E6%9C%AC%E7%94%A8%E8%AA%9E_taw7fq.jpg)

## 二分木の種類

| 種類 | 定義 |
| --- | --- |
| **完全二分木（Complete Binary Tree）** | 最下層以外が全て埋まっており、最下層は左から詰められている |
| **満二分木（Full Binary Tree）** | 子のノードの数が「0か2」のみ |
| **完全充填二分木（Perfect Binary Tree）** | 葉以外のすべてのノードが2つの子を持ち、葉はすべて同じ深さにある |


![二分木の種類](https://res.cloudinary.com/dtilrevrm/image/upload/v1777788856/%E4%BA%8C%E5%88%86%E6%9C%A8%E3%81%AE%E7%A8%AE%E9%A1%9E_lbcups.jpg)


## 二分木の実装方法

### ポインタ（参照）による実装

各ノードの構造体をポインタで繋げて実装します。

![ポインタ（参照）による実装](https://res.cloudinary.com/dtilrevrm/image/upload/v1777800665/%E4%BA%8C%E5%88%86%E6%9C%A8_%E3%83%9D%E3%82%A4%E3%83%B3%E3%82%BF_t5q1pm.jpg)

```python title="二分木の実装(ポインタ)"
class Node:
    def __init__(self, value):
        self.value = value
        self.left = None
        self.right = None

# ノードを個別に作る
A = Node("A")
B = Node("B")
C = Node("C")
D = Node("D")
E = Node("E")
F = Node("F")
# ポインタ（参照）でつなぐ
A.left = B
A.right = C
B.left = D
B.right = E
C.left = F
# ルート
root = A
```

### 配列による実装

各ノードの位置をインデックスに変換して実装します。


親子関係のルールは、インデックス `i` に対して以下のようになります。
* 左の子：`2 × i + 1`
* 右の子：`2 × i + 2`
* 親：`(i - 1) // 2`

![配列による実装](https://res.cloudinary.com/dtilrevrm/image/upload/v1777800664/%E4%BA%8C%E5%88%86%E6%9C%A8_%E9%85%8D%E5%88%97_kzheef.jpg)

```python title="二分木の実装(配列)"
tree = ["A", "B", "C", "D", "E", "F"]

def left(i):
    return 2 * i + 1

def right(i):
    return 2 * i + 2

def parent(i):
    return (i - 1) // 2

# 例：ノードB（index=1）の子
print(tree[left(1)])   # D
print(tree[right(1)])  # E
```


## 二分木の走査（Traversal）

木のすべてのノードを訪問する順序には4種類あります。

| 走査順 | 順序 | 用途例 |
| --- | --- | --- |
| **前順（Preorder / DFS）** | 根 → 左 → 右 | ツリー構造の保存・コピー |
| **中順（Inorder / DFS）** | 左 → 根 → 右 | BST のソート済み出力 |
| **後順（Postorder / DFS）** | 左 → 右 → 根 | ツリーの削除・式木の評価 |
| **幅優先（Level Order / BFS）** | 上から順に左→右 | レベルごとの処理・最短距離探索 |

![走査(前順・中順)](https://res.cloudinary.com/dtilrevrm/image/upload/v1777795832/preorder_inorder_eom26q.jpg)
![走査(後順・幅優先)](https://res.cloudinary.com/dtilrevrm/image/upload/v1777795833/postorder_BFS_t41a3x.jpg)

## 参考文献

<AffiliateBanner site="tessoku" />

[Python でのツリー構造](https://docs.python.org/ja/3/library/collections.html)
