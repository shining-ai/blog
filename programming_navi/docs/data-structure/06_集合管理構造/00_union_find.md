import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Union-Find (Disjoint Set Union)

## Union-Findとは

Union-Find（素集合データ構造 / DSU: Disjoint Set Union）とは、

> グループ分けを効率的に管理できるデータ構造

です。
<br/>

「AとBは同じグループか？」「AのグループとBのグループを合併する」という操作を高速に処理できます。

## 基本的な構造主な操作
ユニオンファインドは、木（ツリー構造） を使ってグループを管理します。

### 初期状態
最初はすべての要素が自分自身が親になっています。
![ユニオンファインドの初期状態](https://res.cloudinary.com/dtilrevrm/image/upload/v1757686553/UnionFind%E3%81%AE%E5%88%9D%E6%9C%9F%E7%8A%B6%E6%85%8B_ihfxs6.jpg)



### UNION操作（統合）
2つの要素を同じグループにする操作です。

要素1と2を同じグループに統合するには、片方の親をもう一方の親にします。
![ユニオンファインドの統合操作](https://res.cloudinary.com/dtilrevrm/image/upload/v1757686555/UnionFind%E3%81%AE%E3%83%A9%E3%83%B3%E3%82%AF%E3%81%AB%E3%82%88%E3%82%8B%E4%BD%B5%E5%90%88_g0vuao.jpg)

### FIND操作
ある要素の親を取得する操作です。

要素2の親は木を辿っていくと親である要素1を見つけることができます。


## 効率を向上させるテクニック
UnionFindを高速化させるため、以下の2つの手法がよく使われます。

### 経路圧縮
経路途中の要素の親を直接ルートにつなげることで木が浅くなり、検索を高速化することができます。
![ユニオンファインド経路圧縮](https://res.cloudinary.com/dtilrevrm/image/upload/v1757686557/UnionFind%E3%81%AE%E7%B5%8C%E8%B7%AF%E5%9C%A7%E7%B8%AE_nhnusr.jpg)

### ランクによる併合
木の高さが低い方を高いほうに繋ぐことで、木の高さを抑えることができます。
![ユニオンファインドのランク](https://res.cloudinary.com/dtilrevrm/image/upload/v1757686559/UnionFind%E3%81%AE%E7%B5%90%E5%90%88_ll2dlt.jpg)





## 実装
```python title="Union-Find の実装"
class UnionFind:
    def __init__(self, n):
        self.parent = [-1] * n  # 各要素の親
        self.rank = [0] * n     # 木の高さ（ランク）

    def is_root(self, node):
        return self.parent[node] == -1

    def find(self, node):
        if self.is_root(node):
            return node
        self.parent[node] = self.find(self.parent[node])  # 経路圧縮
        return self.parent[node]

    def union(self, node1, node2):
        root1 = self.find(node1)
        root2 = self.find(node2)
        if root1 == root2:
            return
        if self.rank[root1] < self.rank[root2]:
            smaller, bigger = root1, root2
        else:
            smaller, bigger = root2, root1
        self.parent[smaller] = bigger
        self.rank[bigger] = max(self.rank[bigger], self.rank[smaller] + 1)
```

## 典型的な使用例

### グラフの連結成分数のカウント

```python title="連結成分数のカウント"
def count_components(n, edges):
    uf = UnionFind(n)
    for u, v in edges:
        uf.union(u, v)
    return len(set(uf.find(i) for i in range(n)))

edges = [(0, 1), (1, 2), (3, 4)]
print(count_components(5, edges))  # 2（{0,1,2} と {3,4}）
```

### クラスカル法（最小全域木）

辺を重み順に追加する際、閉路の検出に Union-Find を使います。

```python title="クラスカル法での閉路検出"
def kruskal(n, edges):
    edges.sort(key=lambda x: x[2])
    uf = UnionFind(n)
    mst_cost = 0
    for u, v, w in edges:
        if uf.is_root(u) != uf.is_root(v):
            uf.union(u, v)
            mst_cost += w
    return mst_cost
```

## 参考文献

<AffiliateBanner site="tessoku" />

<AffiliateBanner site="antbook" />
