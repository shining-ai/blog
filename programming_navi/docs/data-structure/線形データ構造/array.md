# 配列(Array)

## 配列 (Array)とは

配列 (Array)とは、

> 同じデータ型の値の集まりを1つにまとめたデータ構造

です。<br/><br/>


配列には同じ型の複数のデータを入れ、添え字でアクセスします。

配列のデータはメモリ上の連続した領域に格納されます。

そのため、メモリのアドレスは添え字を使って計算でき、各データにランダムアクセスすることができます。<br/><br/>



まとめると、配列には以下の特徴があります。

- **同じデータ型**

    配列に格納できる値は全て同じデータ型でなければなりません
    (整数、浮動小数点数、文字列など)。
- **連続したメモリ領域**
    
    配列の要素は連続したメモリ上に格納されています。
    そのため、任意の要素にランダムアクセスが可能です。

- **インデックスによるアクセス**
    配列の各要素にはインデックス番号(通常は0から始まる)が割り当てられており、そのインデックスを指定して要素にアクセスします。


## 配列 (Array)の計算量
配列(Array)における各操作の計算量は以下のようになります。

| 操作       | 記述方法 | 計算量     |
| ---------- | -------- | ---------- |
| 要素の参照 | list[k]  | O(1)       |
| 先頭に追加 | insert   | O(n)       |
| 末尾に追加 | append   | O(1)       |
| 要素の削除 | remove   | O(n)       |
| ソート     | sort     | O(n log n) |


:::caution
配列では要素を追加する場合、追加したい場所以降の要素をずらす必要があります。
:::


## 実装方法
正確には配列とは異なりますが、pythonではListを使うことが一般的なためそちらの実装方法を記載しておきます。

listオブジェクトは配列と似たもので、要素の型が異なっていても格納できるなど、より高機能になっています。


``` python title="list"
mylist = ["apple", "orange"] 
mylist.append("banana") 
mylist.insert(0, "grape")
print(mylist[1]) # apple
print(mylist)  # ['grape', 'apple', 'orange', 'banana']
```

<br/>
同じ型のみを格納したい場合は、標準で**arrayモジュール**をimportして使うこともできます。
``` python title="array"
import array

myarray = array.array('i', [1, 2, 3]) 
myarray.append(4) 
myarray.insert(0, 0) 
print(myarray)
```

## 参考文献
1. [競技プログラミングの鉄則](https://af.moshimo.com/af/c/click?a_id=1001869&p_id=170&pc_id=185&pl_id=4062&url=https%3A%2F%2Fwww.amazon.co.jp%2Fdp%2F483997750X)
2. [5.データ構造 — Python 3.12.3 ドキュメント](https://docs.python.org/ja/3/tutorial/datastructures.html)
3. [array --- Efficient arrays of numeric values — Python 3.12.3 ドキュメント](https://docs.python.org/ja/3/library/array.html)
4. [TimeComplexity - Python Wiki](https://wiki.python.org/moin/TimeComplexity)
