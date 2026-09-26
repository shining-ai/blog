import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 重み付きグラフ

## 重み付きグラフとは

重み付きグラフとは、

> 各辺にコスト（距離・時間・料金など）が付いたグラフ

です。
<br/>

![重み付きグラフ](https://res.cloudinary.com/dtilrevrm/image/upload/v1777729664/%E9%87%8D%E3%81%BF%E4%BB%98%E3%81%8D%E3%82%B0%E3%83%A9%E3%83%95_vyc5m4.jpg)

地図上の経路（距離）、ネットワークの帯域幅、交通手段のコストなど、
辺に「量」が必要な問題で使われます。

## 表現方法

### 隣接リスト（重み付き）

* 各頂点から「行ける頂点とコスト」を管理
* 無向グラフでは 

![隣接リスト（重み付き）](https://res.cloudinary.com/dtilrevrm/image/upload/v1777729663/%E9%87%8D%E3%81%BF%E4%BB%98%E3%81%8D%E3%82%B0%E3%83%A9%E3%83%95%E3%81%AE%E9%9A%A3%E6%8E%A5%E3%83%AA%E3%82%B9%E3%83%88_rdd9f2.jpg)

```python title="重み付き隣接リストの表現"
# (隣接頂点, 重み) のタプルで表現
graph = {
    'A': [('B', 4), ('C', 1)],             # A-B:4, A-C:1
    'B': [('A', 4), ('C', 2), ('D', 1)],   # B-A:4, B-C:2, B-D:1
    'C': [('A', 1), ('B', 2), ('D', 5)],   # C-A:1, C-B:2, C-D:5
    'D': [('B', 1), ('C', 5)],             # D-B:1, D-C:5
}
```

隣接リストはBFS/DFSやダイクストラ法で使われます。

### 辺リスト（Edge List）

* 辺そのものを列挙するシンプルな形式
* 無向グラフでは 同じ辺を1回だけ書く

![辺リスト（重み付き）](https://res.cloudinary.com/dtilrevrm/image/upload/v1777729662/%E9%87%8D%E3%81%BF%E4%BB%98%E3%81%8D%E3%82%B0%E3%83%A9%E3%83%95%E3%81%AE%E8%BE%BA%E3%83%AA%E3%82%B9%E3%83%88_ycorb4.jpg)

```python title="辺リストの表現"
# (頂点1, 頂点2, 重み)
edges = [
    ('A', 'B', 4),  # A-B:4
    ('A', 'C', 1),  # A-C:1
    ('B', 'C', 2),  # B-C:2
    ('B', 'D', 1),  # B-D:1
    ('C', 'D', 5),  # C-D:5
]
```

辺リストはベルマン-フォード法やクラスカル法（最小全域木）で使われます。

## 重み付きグラフで扱う代表的な問題

### 最短経路問題

「ある頂点から他の頂点までの最小コスト」を求める問題です。

![最短経路問題](https://res.cloudinary.com/dtilrevrm/image/upload/v1777729661/%E6%9C%80%E7%9F%AD%E7%B5%8C%E8%B7%AF%E5%95%8F%E9%A1%8C_t6hkdc.jpg)

図の例でA→Dに移動する場合、最短経路はA→C→B→Dです。


| アルゴリズム | 計算量 | 適用条件 |
| --- | --- | --- |
| **ダイクストラ法** | O((V+E) log V) | 非負の重み |
| **ベルマン-フォード法** | O(VE) | 負の重みあり（負閉路なし） |
| **ワーシャル-フロイド法** | O(V³) | 全頂点間最短路 |

### 最小全域木（MST）

「すべての頂点を、最小コストで連結する木」を求める問題です。

![最小全域木（MST）](https://res.cloudinary.com/dtilrevrm/image/upload/v1777729661/%E6%9C%80%E5%B0%8F%E5%85%A8%E5%9F%9F%E6%9C%A8_bkv7bu.jpg)

ネットワーク設計や配線の最適化などで使われます。

| アルゴリズム | 計算量 | 方法 |
| --- | --- | --- |
| **クラスカル法** | O(E log E) | 辺を重み順に追加（Union-Find使用） |
| **プリム法** | O((V+E) log V) | 頂点を貪欲に追加 |



## 参考文献

<AffiliateBanner site="tessoku" />

<AffiliateBanner site="antbook" />

<AffiliateBanner site="rasen" />
