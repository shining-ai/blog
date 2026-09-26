---
sidebar_position: 5
displayed_sidebar: computerArchitectureSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ページ置換アルゴリズム (Page Replacement)

## ページ置換とは

ページ置換とは、

> 物理メモリが不足した際に、どの仮想ページをスワップアウトするかを決めるアルゴリズム

です。
<br/>

OSはすべての仮想ページを物理メモリに置けない場合、既存のページをディスク（スワップ領域）に退避させて空きフレームを確保します。どのページを退避させるかの選択がシステム全体のパフォーマンスに大きく影響します。

## ページフォルトの流れ

```
1. プロセスが仮想アドレス A にアクセス
2. TLB ミス → ページテーブルを参照
3. PTE の Present ビットが 0 → ページフォルト例外
4. OS のページフォルトハンドラが起動
5. ページがスワップにあるか確認
6. 空き物理フレームを確保（なければページ置換アルゴリズムで犠牲ページを選択）
7. スワップからページをロード
8. PTE を更新（Present=1、PFN を設定）
9. TLB に新エントリを登録
10. 命令を再実行
```

## アルゴリズム比較表

| アルゴリズム | 概要 | Belady 異常 | 実装コスト | 採用例 |
| --- | --- | --- | --- | --- |
| **OPT**（最適） | 将来最も長く使われないページを置換 | なし | 実装不可（未来が必要） | 理論的上限として比較基準に使用 |
| **FIFO** | 最初に読み込まれたページを置換（キュー） | あり（フレーム増で悪化する場合がある） | 低（単純キュー） | 教育目的 |
| **LRU** | 最も長く参照されていないページを置換 | なし | 高（タイムスタンプ or リスト管理） | DBバッファプール |
| **Clock（第二機会）** | FIFOにアクセスビットの確認を追加 | なし | 中（循環バッファ） | Linux・FreeBSD |
| **CLOCK-Pro** | ホット/コールドページを区別する改良Clock | なし | 中〜高 | Linux（2.6以降） |
| **ARC** | LRUとLFUを適応的に組み合わせ | なし | 高 | ZFS・Solaris |

## LRU 近似：Clock アルゴリズム

ページテーブルエントリの **Accessed ビット（A ビット）** を利用します。CPUがページにアクセスするたびにハードウェアがAビットをセットします。

```
Clock の動作:
  針が指すページを確認
    Aビット=1 → 0 にリセットして針を進める（第二機会を与える）
    Aビット=0 → このページを置換対象として選択
```

これにより、最近アクセスされたページ（Aビット=1）は保護され、長期間アクセスされていないページ（Aビット=0）が置換されます。

## 実装

```c title="LRU キャッシュ（ハッシュ + 双方向リスト）（C）"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define HT_SIZE 16  /* ハッシュテーブルサイズ（2のべき乗） */

typedef struct Node {
    int key, val;
    struct Node *prev, *next;
    struct Node *ht_next;  /* ハッシュチェーン */
} Node;

typedef struct {
    int capacity, size;
    Node *head, *tail;          /* ダミーノード */
    Node *ht[HT_SIZE];          /* ハッシュテーブル */
    int hits, misses;
} LRUCache;

static Node *new_node(int k, int v) {
    Node *n = calloc(1, sizeof(Node));
    n->key = k; n->val = v;
    return n;
}

LRUCache *lru_create(int cap) {
    LRUCache *c = calloc(1, sizeof(LRUCache));
    c->capacity = cap;
    c->head = new_node(-1, -1);
    c->tail = new_node(-1, -1);
    c->head->next = c->tail;
    c->tail->prev = c->head;
    return c;
}

static void list_remove(Node *n) {
    n->prev->next = n->next;
    n->next->prev = n->prev;
}

static void list_push_front(LRUCache *c, Node *n) {
    n->next = c->head->next;
    n->prev = c->head;
    c->head->next->prev = n;
    c->head->next = n;
}

static Node *ht_get(LRUCache *c, int key) {
    int h = (unsigned)key & (HT_SIZE - 1);
    for (Node *n = c->ht[h]; n; n = n->ht_next)
        if (n->key == key) return n;
    return NULL;
}

static void ht_put(LRUCache *c, Node *n) {
    int h = (unsigned)n->key & (HT_SIZE - 1);
    n->ht_next = c->ht[h];
    c->ht[h] = n;
}

static void ht_remove(LRUCache *c, int key) {
    int h = (unsigned)key & (HT_SIZE - 1);
    Node **pp = &c->ht[h];
    while (*pp && (*pp)->key != key) pp = &(*pp)->ht_next;
    if (*pp) *pp = (*pp)->ht_next;
}

int lru_get(LRUCache *c, int key) {
    Node *n = ht_get(c, key);
    if (!n) { c->misses++; return -1; }
    c->hits++;
    list_remove(n);
    list_push_front(c, n);  /* MRU 位置へ移動 */
    return n->val;
}

void lru_put(LRUCache *c, int key, int val) {
    Node *n = ht_get(c, key);
    if (n) {
        n->val = val;
        list_remove(n);
        list_push_front(c, n);
        return;
    }
    if (c->size == c->capacity) {
        /* LRU（末尾）を追い出す */
        Node *lru = c->tail->prev;
        list_remove(lru);
        ht_remove(c, lru->key);
        free(lru);
        c->size--;
    }
    n = new_node(key, val);
    list_push_front(c, n);
    ht_put(c, n);
    c->size++;
}

int main(void) {
    /* ページ参照列のシミュレーション */
    int pages[] = {1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5};
    int n = (int)(sizeof(pages) / sizeof(pages[0]));
    LRUCache *cache = lru_create(3);  /* 物理フレーム 3 枚 */

    for (int i = 0; i < n; i++) {
        int p = pages[i];
        if (lru_get(cache, p) == -1) {
            lru_put(cache, p, p);
            printf("ページフォルト: %d\n", p);
        } else {
            printf("ヒット:         %d\n", p);
        }
    }
    printf("\nヒット: %d / %d (%.1f%%)\n",
           cache->hits, n, cache->hits * 100.0 / n);
    return 0;
}
```

```python title="OrderedDict を使った LRU とページ置換シミュレーション（Python）"
from collections import OrderedDict
from enum import Enum

class LRUPageCache:
    """LRU ページ置換シミュレーター"""

    def __init__(self, num_frames: int):
        self.num_frames = num_frames
        self.frames: OrderedDict[int, bool] = OrderedDict()  # key=ページ番号
        self.faults = 0
        self.hits   = 0

    def access(self, page: int) -> bool:
        """ページアクセス。True=ヒット、False=ページフォルト"""
        if page in self.frames:
            self.frames.move_to_end(page)  # MRU 位置へ
            self.hits += 1
            return True
        # ページフォルト
        self.faults += 1
        if len(self.frames) >= self.num_frames:
            evicted, _ = self.frames.popitem(last=False)  # LRU を追い出す
            print(f"  退避: ページ {evicted}")
        self.frames[page] = True
        print(f"  フォルト: ページ {page} → フレーム {list(self.frames.keys())}")
        return False

    def stats(self):
        total = self.hits + self.faults
        print(f"ヒット率: {self.hits}/{total} = {self.hits/total:.1%}")
        print(f"フォルト率: {self.faults}/{total} = {self.faults/total:.1%}")


class FIFOPageCache:
    """FIFO ページ置換（Belady異常の確認用）"""

    def __init__(self, num_frames: int):
        self.num_frames = num_frames
        self.frames: list[int] = []
        self.faults = 0

    def access(self, page: int) -> bool:
        if page in self.frames:
            return True
        self.faults += 1
        if len(self.frames) >= self.num_frames:
            self.frames.pop(0)  # 最も古いページを追い出す
        self.frames.append(page)
        return False


def belady_anomaly_demo():
    """
    Belady 異常のデモ:
    FIFO でフレーム数を 3 → 4 に増やすとページフォルトが増加する参照列
    参照列: 1,2,3,4,1,2,5,1,2,3,4,5
    """
    ref = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]
    print("=== Belady 異常デモ（FIFO）===")
    for frames in [3, 4]:
        cache = FIFOPageCache(frames)
        for p in ref:
            cache.access(p)
        print(f"フレーム数 {frames}: フォルト数 = {cache.faults}")
    print("フレーム数が増えてもフォルト数が増える場合がある（Belady異常）\n")


def opt_simulation(ref: list[int], num_frames: int) -> int:
    """OPT アルゴリズム（最適置換）のシミュレーション"""
    frames: list[int] = []
    faults = 0
    for i, page in enumerate(ref):
        if page in frames:
            continue
        faults += 1
        if len(frames) < num_frames:
            frames.append(page)
            continue
        # 将来最も遠い時点で使用されるページを置換
        future_use = []
        for f in frames:
            try:
                next_use = ref.index(f, i + 1)
            except ValueError:
                next_use = float("inf")  # 今後使われない → 最優先で置換
            future_use.append((next_use, f))
        _, evict = max(future_use)
        frames.remove(evict)
        frames.append(page)
    return faults


if __name__ == "__main__":
    ref = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]
    frames = 3

    belady_anomaly_demo()

    print("=== LRU シミュレーション ===")
    lru = LRUPageCache(frames)
    for p in ref:
        lru.access(p)
    lru.stats()

    print(f"\n=== OPT（理論最適）フレーム数 {frames} ===")
    opt_faults = opt_simulation(ref, frames)
    total = len(ref)
    print(f"フォルト数: {opt_faults}/{total} = {opt_faults/total:.1%}")
    print("OPT は将来の参照列が既知の場合のみ実装可能な理論的下限です。")
```

## 使用場面

- **OS カーネルのメモリ管理**: LinuxはCLOCK-Pro（アクティブ/インアクティブリスト）を採用。`/proc/vmstat` でページフォルト統計を確認できる
- **DB バッファプール（MySQL InnoDB・PostgreSQL）**: InnoDBはLRU変形版（ニューサブリスト方式）を採用し、フルテーブルスキャンによるバッファフラッシュを防止
- **CPU キャッシュ置換**: ハードウェアはLRU近似（擬似LRU）を採用。ソフトウェアからは直接制御できないが、アクセスパターンの工夫で間接的に制御できる

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
