import AffiliateBanner from '@site/src/components/AffiliateBanner';

# トライ木 (Trie)

## トライ木とは

トライ木（Prefix Tree / Radix Tree）とは、

> 木構造を使い、効率的な文字列検索をするためのデータ構造

です。
<br/>

### トライ木の構造
Trieでは各ノードが1文字を保持する形の木になっています。

単語の最後の1文字のノードには印をつけておくことで、その単語が存在しているかを管理しています。

下の例では、「dog」は存在しているが、「do」は存在していません。

![トライ木の構造](https://res.cloudinary.com/dtilrevrm/image/upload/v1757686469/Trie%E3%81%AE%E4%BE%8B_rwftpo.jpg)


## 基本的な操作
### 挿入
単語をTrieに挿入する際には、文字ごとにノードを追加していきます。

例えば「card」を挿入する際には、「c」「a」「r」「d」がの並びが存在するか順番に確認していき、足りないノードを追加します。

そのため共通の接頭辞を共有することができます。

![トライ木の挿入](https://res.cloudinary.com/dtilrevrm/image/upload/v1757686471/Trie%E3%81%AE%E6%8C%BF%E5%85%A5_nkq3z4.jpg)

### 検索
単語がTrieに存在するかを調べるには、文字ごとにノードを辿っていきます。

もし最後まで辿る事ができて、最後のノードに末尾のフラグがあれば、その単語が存在すると判断できます。


## 計算量

文字列の長さを m、格納する文字列数を n とした場合:

| 操作 | 計算量 | 備考 |
| --- | --- | --- |
| 挿入 | O(m) | 文字列長に依存 |
| 検索 | O(m) | |
| 前方一致検索 | O(m + 結果数) | |
| 削除 | O(m) | |

ハッシュテーブルの検索はO(m)（ハッシュ計算）と同等ですが、
トライ木は**前方一致・ソート順走査**が自然にできる点が強みです。

## 実装方法

```python title="トライ木の実装"
class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end_of_word = False # 単語の終端かどうか 


class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        """単語の挿入"""
        node = self.root
        for c in word:
            if c not in node.children:
                node.children[c] = TrieNode()
            node = node.children[c]
        node.is_end_of_word = True

    def search(self, word):
        """単語が完全一致で存在するか"""
        node = self.root
        for c in word:
            if c not in node.children:
                return False
            node = node.children[c]
        return node.is_end_of_word
```

```python title="使用例"
trie = Trie()
trie.insert("dog")
print(trie.search("dog"))  # True
print(trie.search("do"))  # False
```

## Trieの応用例
Trieは以下のような場面でよく使われるアルゴリズムです。
| 用途                  |  説明                          |
| -----------------    |  ------------------------------|
| オートコンプリート機能 | 入力途中の単語の候補を効率的に検索 |
| 辞書検索              | 単語リストから高速に検索を行う    |
| スペルチェック        | 存在しない単語を検出|
| IPルーティング        |  ネットワークプレフィックスの管理|


## HashMapとTrieの比較
TrieとHashMap（ハッシュテーブル）はどちらも文字列検索に使われますが、それぞれにメリット・デメリットがあります。

### HashMapで十分なケース
完全一致だけを検索したい場合は、 平均O(1)で動作するHashMapの方が効率的な場合が多いです。

```python title="HashMapで十分な例"
hash_map = {"apple": 1, "banana": 2, "cherry": 3}
print("apple" in hash_map)  # TrueCopy
```
TrieのO(N)よりも高速な場合が多いです。

### HashMapでは不十分なケース
例えば「ap」で始まる単語を全て検索したい場合、HashMapでは全探索する必要があります。

一方でTrieなら「ap」までたどれば、底から全ての単語を効率的に取得できます。



## 参考文献

[トライ – Wikipedia](https://en.wikipedia.org/wiki/Trie#Applications)