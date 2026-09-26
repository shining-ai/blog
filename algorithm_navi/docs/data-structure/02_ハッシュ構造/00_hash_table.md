import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ハッシュテーブル (Hash Table)

## ハッシュテーブルとは

ハッシュテーブルとは、

> キーと値のペアを格納し、効率的に検索するためのデータ構造

です。
<br/>

キーに**ハッシュ関数**を適用してインデックスを算出し、そのインデックスに値を格納します。
電話帳のように「名前（キー）から電話番号（値）を素早く引く」用途に使われます。

## ハッシュテーブルの仕組み

### キーのハッシュ化

キーをハッシュ関数に入力し、配列のインデックスとなる整数（ハッシュ値）を返します。

![キーのハッシュ化](https://res.cloudinary.com/dtilrevrm/image/upload/v1757686173/%E3%83%8F%E3%83%83%E3%82%B7%E3%83%A5%E9%96%A2%E6%95%B0%E3%81%A7%E5%A4%89%E6%8F%9B_ncoczz.jpg)

理想的なハッシュ関数は、異なるキーに対して均等にハッシュ値を分散させ、衝突（同じハッシュ値を持つ異なるキー）が最小になるように設計されています。

### 値の格納

ハッシュ化されたキーを配列のインデックスとして、ペアが格納されます。
![ハッシュ値の格納](https://res.cloudinary.com/dtilrevrm/image/upload/v1757686176/%E3%83%8F%E3%83%83%E3%82%B7%E3%83%A5%E3%83%86%E3%83%BC%E3%83%96%E3%83%AB%E3%81%B8%E3%81%AE%E6%A0%BC%E7%B4%8D_hxcevz.jpg)

### 検索

検索時も同じハッシュ関数を使用してインデックスを計算します。

計算されたインデックスの位置に直接アクセスし、データを取得します。

![値の検索](https://res.cloudinary.com/dtilrevrm/image/upload/v1757686175/%E3%83%8F%E3%83%83%E3%82%B7%E3%83%A5%E3%83%86%E3%83%BC%E3%83%96%E3%83%AB%E3%81%AE%E6%A4%9C%E7%B4%A2_atw5jf.jpg)


## 衝突（Collision）とその解決

異なるキーが同じハッシュ値になることを**衝突（Collision）**といいます。
衝突を解消する代表的な方法は2つあります。

* チェイン法（Separate Chaining）
* オープンアドレス法（Open Addressing）

### チェイン法（Separate Chaining）

同じインデックスの要素をリストでつなぐ方法です。

値の格納時にlinked listのデータ構造を使用します。

衝突が発生した場合、同じバケット内にリストとして要素を追加します。

```
[0] -> ("key1", value1) -> ("key2", value2)
[1] -> ("key3", value3)
[2] -> ("key4", value4) -> ("key5", value5)
```

### オープンアドレス法（Open Addressing）

衝突が起きたら別の空きスロットを探す方法です。

空きスロットの探し方は、線形探索、二次探索、ダブルハッシングなどの方法があります。

```
hash("key1") = 2 → [2] に格納
hash("key2") = 2 → [2] は埋まっているので [3] に格納
hash("key3") = 2 → [2], [3] は埋まっているので [4] に格納
```
## ハッシュテーブルの計算量

| 操作 | 平均 | 最悪 | 備考 |
| --- | --- | --- | --- |
| 検索 | O(1) | O(n) | 衝突が多いと悪化 |
| 挿入 | O(1) | O(n) | |
| 削除 | O(1) | O(n) | |

最悪ケースは全要素が同じバケットに衝突した場合です。
適切なハッシュ関数と**負荷率（Load Factor）**の管理により、平均O(1)を維持します。

## 実装方法



Pythonでは `dict` がハッシュテーブルとして実装されています。

```python title="ハッシュテーブルの実装"
class HashTable:
    def __init__(self, size=10):
        self.size = size
        self.table = [[] for _ in range(size)]

    def hash_function(self, key):
        # キーの文字コードの合計をサイズで割った余りをハッシュ関数として使用
        return sum(ord(char) for char in key) % self.size

    def insert(self, key, value):
        # ハッシュ値を計算し、対応するバケットにキーと値のペアを追加
        hash_index = self.hash_function(key)
        bucket = self.table[hash_index]
        # 同じキーが既に存在する場合は値を更新
        for i, kv in enumerate(bucket):
            k, v = kv
            if k == key:
                bucket[i] = (key, value)
                return
        bucket.append((key, value))

    def get(self, key):
        # ハッシュ値を計算し、対応するバケットから値を検索
        hash_index = self.hash_function(key)
        bucket = self.table[hash_index]
        for k, v in bucket:
            if k == key:
                return v
        return None


# ハッシュテーブルの使用例
ht = HashTable()

# 値の挿入
ht.insert("apple", "赤")
ht.insert("banana", "黄")
ht.insert("orange", "橙")

# 値の取得
print(ht.get("apple"))  # 出力: "赤"
print(ht.get("banana"))  # 出力: "黄"
print(ht.get("orange"))  # 出力: "橙"

# ハッシュテーブルの内容を表示
print(ht.table)  # 出力: ハッシュテーブルの内部構造を表示
```

```text title="実行結果"
赤
黄
橙
[[('apple', '赤')], [], [], [], [], [], [('orange', '橙')], [], [], [('banana', '黄')]]赤
黄
橙
[[('apple', '赤')], [], [], [], [], [], [('orange', '橙')], [], [], [('banana', '黄')]]
```

## 各言語での対応

| 言語 | ハッシュテーブルの型 |
| --- | --- |
| Python | `dict` |
| C++ | `std::unordered_map` |
| Java | `HashMap` |
| JavaScript | `Map` / オブジェクト |
| Go | `map` |


```python title="python(dict)を使った実装"
table = dict()

# 値の挿入
table["apple"] = "赤"
table["banana"] = "黄"
table["orange"] = "橙"

# 値の取得
print(table["apple"])  # 出力: "赤"
print(table["banana"])  # 出力: "黄"
print(table["orange"])  # 出力: "橙"

# dictの内容を表示
print(table)
```

```text title="実行結果"
赤
黄
橙
{'apple': '赤', 'banana': '黄', 'orange': '橙'}
```

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
<AffiliateBanner site="rasen" />

