---
sidebar_position: 2
displayed_sidebar: operatingSystemSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# スタックとヒープ (Stack and Heap)

## スタックとヒープとは

スタックとヒープとは、

> スタックは関数呼び出しに伴い自動管理されるLIFO（後入れ先出し）メモリ領域、ヒープはプログラマが実行時に動的に確保・解放できるメモリ領域

です。
<br/>

両者はプロセスの仮想アドレス空間内で共存します。
スタックは高アドレスから低アドレス方向に成長し、ヒープは低アドレスから高アドレス方向に伸びます。

## スタックとヒープの比較

| 項目 | スタック | ヒープ |
| --- | --- | --- |
| 割当方式 | コンパイラが自動（SP レジスタ操作） | プログラマが明示的に `malloc` / `new` |
| 解放方式 | 関数リターン時に自動解放 | プログラマが明示的に `free` / `delete` |
| 速度 | 非常に高速（SP の加減算のみ） | 低速（アロケータのヘッダ操作・探索が必要） |
| デフォルトサイズ | 8 MB（Linux のデフォルト） | 仮想アドレス空間全体（GB オーダー） |
| 断片化 | 発生しない（LIFO 構造のため） | 外部断片化が発生しうる |
| スレッド共有 | スレッドごとに独立 | プロセス内全スレッドで共有 |

## スタックフレームの構造（x86-64 呼び出し規約）

```
高アドレス
┌─────────────────────────┐
│  呼び出し元のフレーム    │
│  ...                    │
├─────────────────────────┤  ← 呼び出し直前の RSP
│  戻りアドレス (8 B)      │  call 命令が push
├─────────────────────────┤
│  保存した RBP (8 B)      │  push rbp
├─────────────────────────┤  ← RBP（フレームポインタ）
│  ローカル変数            │
│  ...                    │
├─────────────────────────┤
│  関数引数の退避領域      │
│  （7 番目以降の引数）    │
└─────────────────────────┘  ← RSP（スタックポインタ）
低アドレス
```

引数 1〜6 は RDI, RSI, RDX, RCX, R8, R9 レジスタで渡されます（System V AMD64 ABI）。

## スタックオーバーフロー

再帰が深すぎるとスタックがデフォルト上限（Linux: 8 MB）を超え、**SIGSEGV** が発生します。
`ulimit -s` でスタックサイズを変更できますが、無制限にするとカーネルが隣接メモリを侵害する危険があります。

## 実装

```c title="スタック深度の確認とヒープ操作（C）"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* スタック深度を測定する再帰関数 */
static long stack_depth_bytes(void *first_sp, int depth) {
    char local_var;   /* このローカル変数のアドレスがスタック上の目印 */
    if (depth >= 10000) {
        /* スタック使用量 = 最初の SP と現在の SP の差 */
        return (long)((char *)first_sp - &local_var);
    }
    return stack_depth_bytes(first_sp, depth + 1);
}

/* ヒープ: 動的配列の確保と解放 */
int *create_dynamic_array(int n) {
    int *arr = (int *)malloc(n * sizeof(int));
    if (!arr) {
        perror("malloc failed");
        return NULL;
    }
    for (int i = 0; i < n; i++) arr[i] = i * i;
    return arr;
}

/* realloc で動的拡張 */
int *resize_array(int *arr, int old_n, int new_n) {
    int *new_arr = (int *)realloc(arr, new_n * sizeof(int));
    if (!new_arr) { free(arr); return NULL; }
    for (int i = old_n; i < new_n; i++) new_arr[i] = i * i;
    return new_arr;
}

int main(void) {
    /* スタック深度 */
    char sp_anchor;
    long used = stack_depth_bytes(&sp_anchor, 0);
    printf("10000 回再帰後のスタック使用量: %ld バイト (%.1f KB)\n",
           used, used / 1024.0);

    /* ヒープ操作 */
    int  n   = 5;
    int *arr = create_dynamic_array(n);
    if (!arr) return 1;

    printf("動的配列 (n=%d): ", n);
    for (int i = 0; i < n; i++) printf("%d ", arr[i]);
    printf("\n");

    arr = resize_array(arr, n, n * 2);
    if (!arr) return 1;
    printf("拡張後 (n=%d): ", n * 2);
    for (int i = 0; i < n * 2; i++) printf("%d ", arr[i]);
    printf("\n");

    free(arr);   /* 必ず解放 */
    return 0;
}
```

```python title="sys.setrecursionlimit と tracemalloc によるヒープ追跡（Python）"
import sys
import tracemalloc

# --- スタック：再帰深度の制御 ---
DEFAULT_LIMIT = sys.getrecursionlimit()
print(f"デフォルトの再帰上限: {DEFAULT_LIMIT}")

sys.setrecursionlimit(500)

def count_recursion(n: int) -> int:
    if n == 0:
        return 0
    return 1 + count_recursion(n - 1)

try:
    result = count_recursion(499)
    print(f"499 段階再帰: {result}")
except RecursionError as e:
    print(f"RecursionError: {e}")

# 上限を戻す
sys.setrecursionlimit(DEFAULT_LIMIT)

# --- ヒープ：tracemalloc でメモリ割り当て追跡 ---
tracemalloc.start()

# メモリを消費する処理
data = []
for i in range(100_000):
    data.append(i * i)

snapshot = tracemalloc.take_snapshot()
stats = snapshot.statistics("lineno")

print("\n[tracemalloc] 上位5件のメモリ割り当て:")
for stat in stats[:5]:
    print(f"  {stat}")

tracemalloc.stop()

# --- ヒープとスタックの境界を確認（CPython の id() はアドレス） ---
import ctypes

x = 42
heap_obj = [1, 2, 3]
print(f"\nint リテラル id: {id(x):#x}  (CPython キャッシュ領域)")
print(f"list id        : {id(heap_obj):#x}  (ヒープ上のオブジェクト)")
```

## 使用場面

- **再帰アルゴリズム（スタック）**: DFS・フィボナッチ・分割統治法
- **関数呼び出しチェーン（スタック）**: コールスタックのデバッグ・スタックトレース
- **動的データ構造（ヒープ）**: リスト・ツリー・グラフのノード管理
- **コルーチン**: スタックをヒープに移して切り替える（Rust の async / Go の goroutine）
- **大きなバッファ（ヒープ）**: 画像データ・ネットワークバッファなど実行時サイズが決まるデータ

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
