---
sidebar_position: 1
displayed_sidebar: computerArchitectureSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# キャッシュ (Cache)

## キャッシュとは

キャッシュとは、

> CPU がメインメモリにアクセスする際のレイテンシを隠蔽するために、直近アクセスしたデータをプロセッサ近傍の高速メモリに保持する仕組み

です。
<br/>

キャッシュラインサイズは一般的に64バイトです。
キャッシュヒット率が数%下がるだけでプログラム全体のパフォーマンスが大幅に低下します。

## キャッシュのマッピング方式


| 方式 | 特徴 | ヒット率 |
| --- | --- | --- |
| ダイレクトマップ | 1つのセットに1エントリ | 低い（競合ミス多） |
| フルアソシアティブ | 任意のセットに配置 | 高い（コスト大） |
| セットアソシアティブ (n-way) | nエントリのセットに配置 | バランス良 |

## 置換アルゴリズム

```
LRU  (Least Recently Used)  : 最も長く使われていないを追い出す
LFU  (Least Frequently Used): 使用頻度が最低のものを追い出す
CLOCK                        : LRU の近似。循環バッファ+参照ビット
```

## 実装

```python title="LRU キャッシュ（Python）"
from collections import OrderedDict

class LRUCache:
    """LRU置換アルゴリズムを使ったキャッシュ"""

    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache: OrderedDict[int, int] = OrderedDict()
        self.hits = 0
        self.misses = 0

    def get(self, key: int) -> int:
        if key in self.cache:
            self.cache.move_to_end(key)  # 最近使用済みにマーク
            self.hits += 1
            return self.cache[key]
        self.misses += 1
        return -1

    def put(self, key: int, value: int):
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)  # 最も古いエントリを削除

    def hit_rate(self) -> float:
        total = self.hits + self.misses
        return self.hits / total if total else 0.0

# アクセスパターンのシミュレーション
cache = LRUCache(4)
accesses = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3]
for addr in accesses:
    if cache.get(addr) == -1:
        cache.put(addr, addr * 10)
print(f"ヒット率: {cache.hit_rate():.1%}")  # 50%
```

```c title="直接マップキャッシュシミュレーション（C）"
#include <stdio.h>
#include <stdint.h>
#include <stdbool.h>

#define CACHE_LINES 8   /* 2のべき乗 */
#define LINE_SIZE   64  /* バイト */

typedef struct {
    bool valid;
    uint32_t tag;
} CacheLine;

CacheLine cache[CACHE_LINES];
int hits = 0, misses = 0;

/* アドレス分解: タグ + インデックス + オフセット */
bool access(uint32_t addr) {
    uint32_t offset = addr % LINE_SIZE;
    uint32_t index  = (addr / LINE_SIZE) % CACHE_LINES;
    uint32_t tag    = addr / (LINE_SIZE * CACHE_LINES);
    (void)offset;

    if (cache[index].valid && cache[index].tag == tag) {
        hits++;
        return true;  /* ヒット */
    }
    misses++;
    cache[index].valid = true;
    cache[index].tag   = tag;
    return false;  /* ミス */
}

int main(void) {
    /* 配列アクセスパターン */
    for (int i = 0; i < 64; i++) access(i * 4);       /* ストライド4 */
    printf("hits: %d, misses: %d\n", hits, misses);
    return 0;
}
```

## 使用場面

- **CPU 設計**: マルチレベルキャッシュ（L1/L2/L3）の容量・アソシアティビティ設定
- **OS ページキャッシュ**: ファイル読み書きのバッファリング
- **データベース**: バッファプールのページ置換
- **CDN**: エッジサーバーでのコンテンツキャッシュ

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
