import AffiliateBanner from '@site/src/components/AffiliateBanner';

# キュー (Queue)

## キューとは
キューとは、

> 先入れ先出し(FIFO: First In First Out)の順序で要素を格納するデータ構造

です。
<br/>
 

キューは、行列に並ぶイメージの挙動をします。

つまり、要素を追加するときは行列の一番うしろに並び、要素を取り出す(デキュー)ときは列の先頭から取り出します。

要素を追加することはエンキュー(enqueue)と呼び、要素の取り出しはデキュー(dequeue)と呼ばれます。

![キューの概要](https://res.cloudinary.com/dtilrevrm/image/upload/v1757685668/queue%E3%81%AE%E6%A6%82%E8%A6%81_h6jdfv.jpg)



## キューの実装方法(ライブラリ使用)
pythonでは、キュー(FIFO: First In, First Out)のデータ構造は標準ライブラリ**collections**で簡単に実装することができます。

### キューにエンキューする(要素を追加)
deque関数にlistを渡すことで初期化して、普通のlistと同じようにappendして要素を末尾に追加します。

```python  title="queueにデータを入れる"
from collections import deque

# キューの作成
my_queue = deque([1, 2, 3])

# 要素の追加
my_queue.append(4)
print(my_queue)
```
```text  title="実行結果"
deque([1, 2, 3, 4])
```


### キューからデキューする(要素を取り出す)
popleftを使って、スタックから要素を取り出します。

```python  title="queueからデータを取り出す"
# キューから値を取り出す
tmp = my_queue.popleft()
print(tmp)
print(my_queue)
```

```text title="実行結果"
1
deque([2, 3, 4])
```
 

### キューの中身を確認
Listと同様に配列の添え字で要素を参照できます。

ただし、Listと違いdequeでは**両端の値以外の参照コストが大きくなっている**ので、注意が必要です。

```python  title="queueのデータを参照"
# キューの末尾の値を参照
print(my_queue[-1])
# キューの先頭の値を参照
print(my_queue[0])
```

```text title="実行結果"
4
2
```
 
dequeはListと同様にlen関数を使って、サイズを取得することもできます。

```python  title="queueの要素数を取得"
# 要素数を取得
print(my_queue)
print(len(my_queue))
```
```text title="実行結果"
deque([2, 3, 4])
3
```


## キューの実装方法
キューはさまざまなデータ構造で実装できますが、ここでは配列とリンクリストによる実装方法を説明します。

### 配列による実装
配列の実装は単純ですが、先頭から要素を取り出す場合にO(n)の時間がかかるというデメリットがあります。

```python  title="配列によるqueueの実装"
queue = []

# enqueue
queue.append(1)  # queue = [1]
queue.append(2)  # queue = [1, 2]
queue.append(3)  # queue = [1, 2, 3]

# dequeue
data = queue.pop(0)  # data = 1, queue = [2, 3]Copy
```

### リングバッファを使った実装
先頭から要素を取り出す場合にO(n)の時間がかかることを改善するために、配列をリングバッファとみなしてデータ管理することがあります。

リングバッファ(Circular Buffer) とは、端点が論理的につながっている線形バッファです。

要素の先頭と末尾を覚えておき、要素を追加は終端に行い、取り出すときは先頭から行います。

![リングバッファの概要](https://res.cloudinary.com/dtilrevrm/image/upload/v1757685669/%E3%83%AA%E3%83%B3%E3%82%B0%E3%83%90%E3%83%83%E3%83%95%E3%82%A1%E3%81%AE%E6%A6%82%E8%A6%81_jpraqe.jpg)


要素を取り出す際に実際にデータを削除するのではなく、ポインタをずらすだけなので高速に動作します。

配列のサイズは固定長であるため、格納できるデータ量がサイズを超えると必要なデータが上書きされてしまうことになります。

キューが空のときと満杯の時を区別するためにtailとheadの間には常に空きを設けています。

```python  title="リングバッファによるqueueの実装"
class RingBuffer:
    def __init__(self, size):
        self.size = size
        self.data = [None] * size
        self.head = 0  # 先頭のポインタ
        self.tail = 0  # 終端のポインタ

    def enqueue(self, item):
        if self.head == (self.tail + 1) % self.size:
            raise IndexError("Ring buffer is full")
        # 終端に追加
        self.data[self.tail] = item
        self.tail = (self.tail + 1) % self.size

    def dequeue(self):
        if self.head == self.tail:
            raise IndexError("Ring buffer is empty")
        # 先頭を取得
        item = self.data[self.head]
        self.head = (self.head + 1) % self.size
        return itemCopy
 ```

### リンクドリストによる実装
リンクリストによる実装は、エンキューやデキューの時間計算量がO(1)と優れていますが、メモリ使用量が配列より大きいというデメリットがあります。

```python  title="リンクドリストによるqueueの実装"
class LinkedNode:
    def __init__(self, value=0, next=None):
        self.value = value
        self.next = next

class Queue:
    def __init__(self):
        self.head = None
        self.tail = None

    def enqueue(self, value):
        new_node = LinkedNode(value)
        if not self.head:
            self.head = new_node
            self.tail = new_node
        else:
            self.tail.next = new_node
            self.tail = new_node

    def dequeue(self):
        if not self.head:
            return None
        value = self.head.value
        self.head = self.head.next
        return value

queue = Queue()
queue.enqueue(1) # 1
queue.enqueue(2) # 1 → 2
queue.enqueue(3) # 1 → 2 → 3
print(queue.dequeue()) # 1Copy
```
 

## dequeとListの違い
dequeはListと似ていますが、得意・不得意な操作があり用途によって使い分けることが望ましいです。

dequeとListにおける各操作の計算量は以下のようになります。

|                    | list                  | deque                     |
| ------------------ | --------------------- | ------------------------- |
| 先頭に追加         | insert <br/> **O(n)** | appendleft <br/> **O(1)** |
| 末尾に追加         | append<br/>O(1)       | append<br/>O(1)           |
| 先頭要素の取り出し | pop(0)<br/>**O(n)**   | popleft<br/>**O(1)**      |
| 末尾要素の取り出し | pop()<br/>O(1)        | pop<br/>O(1)              |
| 中央の要素の参照   | list[k]<br/>**O(1)**  | deque[k]	<br/>**O(n)**    |


dequeでは、popleft（右端への追加と左端からの削除）とappendleftによる先頭への操作が高効率となっています。

しかし、先頭以外の要素へのアクセス効率が悪くなっています。

そのためインデックスを使ったアクセスには適していません。
 

また、dequeはListよりもメモリ効率が高く、特に大量の要素を追加・削除する場合に優れています。

dequeはリングバッファ（circular buffer）として実装されており、内部的にはブロック単位でメモリを割り当てることで、要素の追加・削除が効率的に行えます。


### dequeとListの使い分け
dequeとListの使い分けは以下のようになります。

#### dequeが適しているケース
* キューやスタックとして使う場合(先頭・末尾での高速な挿入・削除が要求される)
* シーケンス全体に対して頻繁な挿入・削除が行われる場合
* メモリ効率が重要な場合

#### Listが適しているとき
* シーケンス全体を直接参照する必要がある場合(先頭・末尾以外へのアクセスが多い)
 

## キューの関連ライブラリの整理
キューを実装するライブラリはcollections以外にもqueue.Queueが存在します。

collectionsモジュールのdequeとqueueモジュールのQueueクラスは、両方ともキュー（queue）を扱うためのものですが、2点違いがあります。

### スレッドセーフ性
キューの機能(単一キュー・双方向キュー)
 

スレッドセーフ性
スレッドセーフ性は、キューが複数のスレッドからの操作に対応しているかどうかの違いです。

collections.dequeはスレッドセーフではなく、複数のスレッドから同時にアクセスすると競合状態が発生する可能性があります。

一方で、queue.Queueはスレッドセーフなので、複数のスレッドから同時にアクセスしても安全です。

これはthreadingモジュールを用いたマルチスレッドプログラミングに適しています。

 

### キューの機能(単一キュー・双方向キュー)
要素の取り出し方法の違いもあります。

collections.dequeは双方向キューであり、両端への高効率な要素の追加と削除が可能です。

queueライブラリでは単一のキューであり、要素の取り出し方は1方向からとなっています。

queue.Queueを使った場合はFIFO（先入れ先出し）の原則に従い、queue.LifoQueueを使った場合はLIFO（後入れ先出し）の原則に従います。


## 参考文献
<AffiliateBanner site="rasen" />

https://docs.python.org/ja/3/library/collections.html#deque-objects

https://github.com/python/cpython/blob/main/Modules/_collectionsmodule.c#L134

https://wiki.python.org/moin/TimeComplexity