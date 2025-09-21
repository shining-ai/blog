import AffiliateBanner from '@site/src/components/AffiliateBanner';

# スタック (Stack)

## スタックとは
スタックとは、

> 後入れ先出し(LIFO: Last In First Out)の順序で要素を追加・削除するデータ構造

です。
<br/>
 
スタックは、縦に荷物を積んでいくようなイメージの挙動をします。

つまり要素を追加(push)するときは一番上に重ねていき、要素を取り出す(pop)ときは一番上から取得します。

![stackの挙動](https://res.cloudinary.com/dtilrevrm/image/upload/v1757685323/stack%E3%81%AE%E6%8C%99%E5%8B%95_a03mi6.jpg)

## スタックの実装方法

pythonでは、スタック(LIFO: Last In, First Out)のデータ構造はListを使って実装することができます。

### スタックにpushする(要素を追加)

スタックへのpushの操作は、Listの末尾に要素を追加するだけなのでappendを行います。


````python  title="stackにデータを入れる"
stack = []
stack.append(1)
stack.append(2)
stack.append(3)
print(stack)
````

```text title="実行結果"
[1, 2, 3]
5
```

### スタックからpopする(要素を取り出す)

スタックへのpopの操作は、Listの末尾から要素をするのでpopを行います。

``` python title="stackからデータを取り出す"
# キューの先頭を取得
stack.pop()
tmp = stack.pop()
print(tmp)
print(stack)
```

```text title="実行結果"
2
deque([1])
```


## スタックの関連ライブラリの整理

スタック実装するライブラリは**collections.deque**や**queue.LifoQueue**が存在します。

collectionsモジュールのdequeとqueueモジュールのQueueクラスは、両方ともキュー（queue）を扱うためのものですが、2点違いがあります。

  * スレッドセーフ性
  * キューの機能(単一キュー・双方向キュー)



### スレッドセーフ性

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

<AffiliateBanner site="algorithm-zukan" />

https://docs.python.org/ja/3/library/collections.html#deque-objects

https://wiki.python.org/moin/TimeComplexity