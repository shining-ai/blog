import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 二分探索木 (Binary Search Tree)

## 二分探索木とは

二分探索木（BST: Binary Search Tree）とは、

> 全てのノードについて`左部分木の値 < 自身の値 < 右部分木の値`が成り立つ二分木

です。
<br/>


![二分探索木](https://res.cloudinary.com/dtilrevrm/image/upload/v1777825361/%E4%BA%8C%E5%88%86%E6%8E%A2%E7%B4%A2%E6%9C%A8_mu7rwd.jpg)

この順序制約により、ソート済みデータの管理や効率的な検索・挿入・削除が可能になります。

## 二分探索木の性質

### 検索のしくみ
![二分探索木の検索のしくみ](https://res.cloudinary.com/dtilrevrm/image/upload/v1777825359/%E4%BA%8C%E5%88%86%E6%8E%A2%E7%B4%A2%E6%9C%A8%E3%81%AE%E6%A4%9C%E7%B4%A2%E3%81%AE%E3%81%97%E3%81%8F%E3%81%BF_sb5pbm.jpg)

### 挿入のしくみ
![二分探索木の挿入のしくみ](https://res.cloudinary.com/dtilrevrm/image/upload/v1777825359/%E4%BA%8C%E5%88%86%E6%8E%A2%E7%B4%A2%E6%9C%A8%E3%81%AE%E6%8C%BF%E5%85%A5%E3%81%AE%E3%81%97%E3%81%8F%E3%81%BF_pbkv9r.jpg)

### 中順走査でソート済みリストが得られる
![二分探索木の中順走査](https://res.cloudinary.com/dtilrevrm/image/upload/v1777825365/%E4%BA%8C%E5%88%86%E6%8E%A2%E7%B4%A2%E6%9C%A8%E3%81%AE%E4%B8%AD%E9%A0%86%E8%B5%B0%E6%9F%BB_fj4wnc.jpg)



## 計算量

| 操作 | 平均 | 最悪 | 備考 |
| --- | --- | --- | --- |
| 検索 | O(log n) | O(n) | 木が偏ると悪化 |
| 挿入 | O(log n) | O(n) | |
| 削除 | O(log n) | O(n) | |

![BSTの弱点](https://res.cloudinary.com/dtilrevrm/image/upload/v1777825363/BST%E3%81%AE%E5%BC%B1%E7%82%B9_gp2sjq.jpg)

最悪ケースは、昇順（または降順）に挿入して木が一直線になった場合です。
この問題を解決したのが**平衡二分探索木**（AVL木・赤黒木）です。

## 実装方法

```python title="二分探索木の実装"
class Node:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None

class BST:
    def __init__(self):
        self.root = None

    def insert(self, val):
        self.root = self._insert(self.root, val)

    def _insert(self, node, val):
        if node is None:
            return Node(val)
        if val < node.val:
            node.left = self._insert(node.left, val)
        elif val > node.val:
            node.right = self._insert(node.right, val)
        return node

    def search(self, val):
        return self._search(self.root, val)

    def _search(self, node, val):
        if node is None:
            return False
        if val == node.val:
            return True
        elif val < node.val:
            return self._search(node.left, val)
        else:
            return self._search(node.right, val)

    def inorder(self):
        result = []
        self._inorder(self.root, result)
        return result

    def _inorder(self, node, result):
        if node is None:
            return
        self._inorder(node.left, result)
        result.append(node.val)
        self._inorder(node.right, result)
```

```python title="使用例"
bst = BST()
for v in [5, 3, 8, 2, 4, 7, 9]:
    bst.insert(v)

print(bst.search(4))    # True
print(bst.search(6))    # False
print(bst.inorder())    # [2, 3, 4, 5, 7, 8, 9]（ソート済み）
```

## 参考文献

<AffiliateBanner site="tessoku" />

<AffiliateBanner site="antbook" />
