---
sidebar_position: 3
displayed_sidebar: operatingSystemSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 動的メモリ管理 (Dynamic Memory Management)

## 動的メモリ管理とは

動的メモリ管理とは、

> プログラム実行時にヒープ領域を確保・解放する malloc/free 系 API とその内部実装の総称

です。
<br/>

C 標準ライブラリの `malloc` はOSから `sbrk` / `mmap` システムコールでメモリを取得し、内部のフリーリストで管理します。
Linux の glibc では ptmalloc2 が使われ、マルチスレッド対応のためアリーナ（arena）を複数持ちます。

## malloc の内部実装の仕組み

```
malloc(n) の流れ:
  1. フリーリスト（bins）に適切なサイズのチャンクがあれば返す
  2. なければ sbrk() でヒープを拡張、または mmap() で大きな領域を確保
  3. チャンクの前にメタデータヘッダを付けてポインタを返す

free(p) の流れ:
  1. p の直前のメタデータヘッダからチャンクサイズを取得
  2. 隣接フリーチャンクと合体（コアレスシング）
  3. 対応する bin に挿入
```

## dlmalloc / ptmalloc のチャンク構造

```
┌────────────────┐  ← prev チャンク（使用中の場合は prev_size は未使用）
│ prev_size (8B) │  フリー時のみ有効：前のチャンクのサイズ
├────────────────┤
│ size      (8B) │  このチャンクのサイズ（下位3bit はフラグ）
├────────────────┤  ← malloc() が返すポインタ
│ fd        (8B) │  フリー時のみ：次のフリーチャンクへのポインタ
├────────────────┤
│ bk        (8B) │  フリー時のみ：前のフリーチャンクへのポインタ
├────────────────┤
│ ユーザデータ   │
│ ...            │
└────────────────┘
```

| bins 種別 | チャンクサイズ | 特徴 |
| --- | --- | --- |
| fastbins | 16〜176 B | 単方向リスト・LIFO・コアレスなし（高速） |
| smallbins | 32〜1008 B | 双方向リスト・FIFO |
| largebins | 1024 B 以上 | サイズ範囲ごとにグループ化 |
| unsorted bin | 任意 | free 直後の一時保管場所 |

## 典型的なメモリバグ

| バグ種別 | 原因 | 症状 |
| --- | --- | --- |
| メモリリーク | `free` を呼ばずに参照を失う | メモリ使用量が増加し続ける |
| 二重解放（double free） | 同じポインタを 2 回 `free` する | ヒープ構造の破壊・クラッシュ |
| use-after-free | `free` 後のポインタを参照 | 不定値の読み書き・セキュリティ脆弱性 |
| バッファオーバーフロー | 確保サイズを超えて書き込む | ヒープメタデータ破壊・スタック書き換え |
| 野良ポインタ（dangling pointer） | `free` 後に `NULL` 代入を忘れる | use-after-free の前提条件 |

**valgrind による検出:**

```bash
# メモリリーク・不正アクセスの検出
valgrind --leak-check=full --show-leak-kinds=all ./a.out

# use-after-free / double free の検出
valgrind --tool=memcheck --error-exitcode=1 ./a.out
```

## 実装

```c title="バンプアロケータ（カスタムアロケータの簡易実装）（C）"
#include <stdio.h>
#include <stddef.h>
#include <stdint.h>
#include <string.h>

/* ── バンプアロケータ ── */
/* アリーナを静的配列で持ち、ポインタを進めるだけで割り当てる最小実装 */
#define ARENA_SIZE (1024 * 1024)   /* 1 MB */

typedef struct {
    char   buf[ARENA_SIZE];
    size_t offset;
} BumpAllocator;

static BumpAllocator g_arena = { .offset = 0 };

/* アライメント付き割り当て */
void *bump_alloc(size_t size, size_t align) {
    size_t cur = (size_t)g_arena.buf + g_arena.offset;
    size_t aligned = (cur + align - 1) & ~(align - 1);
    size_t new_offset = aligned - (size_t)g_arena.buf + size;

    if (new_offset > ARENA_SIZE) {
        fprintf(stderr, "BumpAllocator: 空き領域不足\n");
        return NULL;
    }
    g_arena.offset = new_offset;
    return (void *)aligned;
}

/* リセット（一括解放） */
void bump_reset(void) { g_arena.offset = 0; }

/* ── フリーリストアロケータ（固定サイズブロック） ── */
#define BLOCK_SIZE 64
#define POOL_COUNT 32

typedef struct FreeNode { struct FreeNode *next; } FreeNode;

static char        pool_buf[BLOCK_SIZE * POOL_COUNT];
static FreeNode   *free_list = NULL;
static int         pool_initialized = 0;

void pool_init(void) {
    for (int i = 0; i < POOL_COUNT; i++) {
        FreeNode *node = (FreeNode *)(pool_buf + i * BLOCK_SIZE);
        node->next = free_list;
        free_list  = node;
    }
    pool_initialized = 1;
}

void *pool_alloc(void) {
    if (!pool_initialized) pool_init();
    if (!free_list) return NULL;
    FreeNode *node = free_list;
    free_list = node->next;
    return (void *)node;
}

void pool_free(void *p) {
    FreeNode *node = (FreeNode *)p;
    node->next = free_list;
    free_list  = node;
}

/* ── テスト ── */
int main(void) {
    /* バンプアロケータ */
    int    *a = (int *)    bump_alloc(sizeof(int)    * 4, _Alignof(int));
    double *b = (double *) bump_alloc(sizeof(double) * 2, _Alignof(double));
    if (a && b) {
        for (int i = 0; i < 4; i++) a[i] = i;
        b[0] = 3.14; b[1] = 2.71;
        printf("[Bump] int: %d %d %d %d  double: %.2f %.2f\n",
               a[0], a[1], a[2], a[3], b[0], b[1]);
        printf("[Bump] 使用オフセット: %zu B\n", g_arena.offset);
    }
    bump_reset();
    printf("[Bump] リセット後オフセット: %zu B\n", g_arena.offset);

    /* フリーリストアロケータ */
    void *p1 = pool_alloc();
    void *p2 = pool_alloc();
    printf("[Pool] p1=%p  p2=%p\n", p1, p2);
    pool_free(p1);
    void *p3 = pool_alloc();   /* p1 が再利用される */
    printf("[Pool] p3=%p (p1=%p と同じはず)\n", p3, p1);

    return 0;
}
```

```python title="tracemalloc で割り当て追跡とスナップショット比較（Python）"
import tracemalloc
import linecache

def display_top(snapshot, key_type: str = "lineno", limit: int = 5) -> None:
    stats = snapshot.statistics(key_type)
    print(f"\n上位 {limit} 件のメモリ割り当て:")
    for i, stat in enumerate(stats[:limit], 1):
        frame = stat.traceback[0]
        print(f"  {i}. {frame.filename}:{frame.lineno}")
        line = linecache.getline(frame.filename, frame.lineno).strip()
        if line:
            print(f"     {line}")
        print(f"     size={stat.size/1024:.1f} KB  count={stat.count}")

# スナップショット1: ベースライン
tracemalloc.start(25)   # スタックトレース深さ 25
snap1 = tracemalloc.take_snapshot()

# 何かメモリを消費する
heavy = {i: [j for j in range(100)] for i in range(1000)}

# スナップショット2: 割り当て後
snap2 = tracemalloc.take_snapshot()

# 差分を表示（スナップショット2 で増えた割り当て）
diff_stats = snap2.compare_to(snap1, "lineno")
print("=== スナップショット差分（増加順） ===")
for stat in diff_stats[:5]:
    print(f"  {stat}")

display_top(snap2)

# 現在の使用量
current, peak = tracemalloc.get_traced_memory()
print(f"\n現在: {current/1024:.1f} KB  ピーク: {peak/1024:.1f} KB")

tracemalloc.stop()
del heavy  # オブジェクトを解放
```

## 使用場面

- **OS 設計（スラブアロケータ）**: Linux カーネルが固定サイズオブジェクトを高速割り当て
- **組み込みシステム（フリーリスト）**: ヒープフラグメントが許されない環境での静的プール管理
- **JVM GC（世代別 GC）**: Young/Old 世代に分けたバンプアロケーション + コンパクション
- **ゲームエンジン**: フレームアロケータ（フレーム末に一括 reset）で断片化ゼロを実現
- **Web サーバ**: リクエストスコープのバンプアロケータでメモリ管理を単純化（nginx/arena）

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
