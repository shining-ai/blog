import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 連結リスト（Linked List）

## 連結リスト（Linked List）とは

連結リスト（Linked List）とは、

> ノードが互いにリンクされて構成されるデータ構造

です。<br/><br/>


ノードは、データとともに次のノードへのリンク（ポインタ）を持っています。

連結リストはノードのリンクで繋がっていて、リンクを辿っていくことで各データにアクセスすることができます。
<br/><br/>

![](https://res.cloudinary.com/dtilrevrm/image/upload/v1753883966/%E5%8D%98%E6%96%B9%E5%90%91%E9%80%A3%E7%B5%90%E3%83%AA%E3%82%B9%E3%83%88_wurzjz.jpg)

配列のデータはメモリ上の連続した領域に格納されます。

そのため、メモリのアドレスは添え字を使って計算でき、各データにランダムアクセスすることができます。<br/><br/>



連結リストには、主に2つの種類があります。


- **単方向連結リスト（Singly Linked List）**

    各ノードが次のノードへのリンクのみを持つ

- **双方向連結リスト（Doubly Linked List）**
    
    各ノードが前後両方のノードへのリンクを持つ

![](https://res.cloudinary.com/dtilrevrm/image/upload/v1753883974/%E5%8F%8C%E6%96%B9%E5%90%91%E9%80%A3%E7%B5%90%E3%83%AA%E3%82%B9%E3%83%88_fxfd9c.jpg)


## 連結リスト（Linked List）の計算量
連結リスト（Linked List）における各操作の計算量は以下のようになります。

| 操作       | 計算量 |
| ---------- | ------ |
| 要素の参照 | O(n)   |
| 要素の追加 | O(1)   |
| 要素の削除 | O(1)   |

<br/>
![](https://res.cloudinary.com/dtilrevrm/image/upload/v1753884009/%E9%80%A3%E7%B5%90%E3%83%AA%E3%82%B9%E3%83%88_Linked_List_%E3%81%AE%E8%BF%BD%E5%8A%A0%E3%81%A8%E5%89%8A%E9%99%A4_yfdcai.jpg)

要素の参照をする際には頭からデータをたどる必要があるため、O(n)の計算量となってしまいます。


![](https://res.cloudinary.com/dtilrevrm/image/upload/%E9%85%8D%E5%88%97%E3%81%B8%E3%81%AE%E8%A6%81%E7%B4%A0%E3%81%AE%E8%BF%BD%E5%8A%A0_on0nkx.jpg)

## 連結リスト（Linked List）の実装方法
連結リスト（Linked List）はclassで簡単に実装することができます。


``` python title="単方向連結リストの実装"
class LinkedList:
    def __init__(self, value=None, next=None):
        self.value = value
        self.next = next
```

``` python title="単方向連結リストの使用例"
root = LinkedList(10)
root.next = LinkedList(20)
root.next.next = LinkedList(50)
# 中身の確認
current = root
while current:
    print(current.value)
    current = current.next
```

```text title="実行結果"
10
20
50
```

要素の追加をしてみます。

追加するノードのポインタと追加するノードの1つ前のノードのポインタの書き換えが必要になります。

``` python title="単方向連結リストの要素の追加"
new_node = LinkedList(30)
new_node.next = root.next
root.next = new_node

current = root
while current:
print(current.value)
current = current.next
```

```text title="実行結果"
10
30
20
50
```

続いて要素の削除を行います。

削除するノードの1つ前のノードのポインタを書き換えれば完了です。

``` python title="単方向連結リストの要素の削除"
root.next = root.next.next

current = root
while current:
    print(current.value)
    current = current.next
```

```text title="実行結果"
10
20
50
```

## 参考文献
<AffiliateBanner site="tessoku" />

<AffiliateBanner site="algorithm-zukan" />
