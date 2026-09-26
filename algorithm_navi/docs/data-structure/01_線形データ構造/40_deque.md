import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 両側キュー(deque)

## 両側キュー(deque)とは
両側キュー(deque)とは、

> 先頭と末尾の両方から要素の追加と削除ができるデータ構造

です。
<bt/>
 

これにより、先頭からの要素の追加・削除（スタックの操作）と、末尾からの要素の追加・削除（キューの操作）の両方が可能になります。

## 両側キュー(deque)の実装方法
pythonでは、キュー(FIFO: First In, First Out)・スタック(LIFO: Last In, First Out)のいずれのデータ構造も標準ライブラリ**collections**で実装することができます。

そのため、collectionsライブラリを利用した両側キュー(deque)の実装を解説していきます。

まずは、deque関数にlistを渡すことで初期化します。

```python  title="dequeの初期化"
from collections import deque

my_deque = deque([1, 2, 3])
print(my_deque)
```

```text title="実行結果"
deque([1, 2, 3])
```
 
### 末尾に要素を追加する
listと同様に、appendを使って末尾に要素を追加していきます。

```python  title="dequeの末尾に追加"
my_deque.append(4)
my_deque.append(5)
print(my_deque)
```

```text title="実行結果"
deque([1, 2, 3, 4, 5])
```

### 末尾の要素を取り出す
popを使って末尾から要素を取り出すと、スタック(LIFO: Last In, First Out)として利用できます。

```python  title="dequeの末尾から取り出す"
tmp = my_deque.pop()
print(my_deque)
print(tmp)
```

```text title="実行結果"
deque([1, 2, 3, 4])
5
```

### 先頭に要素を追加する
appendleftを使って先頭に要素を追加していきます。

```python  title=""
my_deque.appendleft(0)
print(my_deque)
```

```text title="実行結果"
deque([0, 1, 2, 3, 4])
```

### 先頭の要素を取り出す
popleftを使うと先頭から要素を取り出すことができ、キュー(FIFO: First In, First Out)として利用できます。

```python  title="dequeの先頭を取得"
tmp = my_deque.popleft()
print(my_deque)
print(tmp)
```

```text title="実行結果"
deque([1, 2, 3, 4])
0
```

### 要素の参照
Listと同様に配列の添え字で要素を参照できます。

ただし、Listと違いdequeでは両端の値以外の参照コストが大きくなっているので、注意が必要です。

```python  title="dequeを参照"
# スタックの先頭の値を参照
print(my_deque[-1])
# キューの先頭の値を参照
print(my_deque[0])
```

```text title="実行結果"
4
1
```
 

dequeはListと同様にlen関数を使って、サイズを取得することもできます。

```python  title="dequeの要素数を取得"
print(my_deque)
print(len(my_deque))
```

```text title="実行結果"
deque([2, 3, 4])
3
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
 

## スタック・キューの関連ライブラリの整理
スタック・キューを実装するライブラリはcollections以外にも**queue**ライブラリが存在します。

スタック・キューの関連ライブラリ
| 分野     | queue           | collections       |
| -------- | --------------- | ----------------- |
| スタック | queue.LifoQueue | collections.deque |
| キュー   | queue.Queue     | collections.deque |
 

collectionsモジュールのdequeとqueueモジュールのQueueクラスは、両方ともキュー（queue）を扱うためのものですが、2点違いがあります。

* スレッドセーフ性
* キューの機能(単一キュー・双方向キュー)
 

### スレッドセーフ性
スレッドセーフ性は、キューが複数のスレッドからの操作に対応しているかどうかの違いです。

collections.dequeはスレッドセーフではなく、複数のスレッドから同時にアクセスすると競合状態が発生する可能性があります。

一方で、**queue.Queueはスレッドセーフ**なので、複数のスレッドから同時にアクセスしても安全です。

これはthreadingモジュールを用いたマルチスレッドプログラミングに適しています。

 
### キューの機能(単一キュー・双方向キュー)
要素の取り出し方法の違いもあります。

collections.dequeは**双方向キュー**であり、両端への高効率な要素の追加と削除が可能です。

queueライブラリでは**単一のキュー**であり、要素の取り出し方は1方向からとなっています。

queue.Queueを使った場合はFIFO（先入れ先出し）の原則に従い、queue.LifoQueueを使った場合はLIFO（後入れ先出し）の原則に従います。

 

## 参考文献

https://docs.python.org/ja/3/library/collections.html#deque-objects

https://wiki.python.org/moin/TimeComplexity