---
sidebar_position: 0
displayed_sidebar: operatingSystemSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# C のメモリモデル (C Memory Model)

## C のメモリ構造とは

C プログラムのメモリ構造とは、

> 実行時のプロセスアドレス空間をテキスト・データ・BSS・ヒープ・スタックの各セグメントに分割して管理する仕組み

です。
<br/>

セグメントごとに異なるライフタイムと用途があります。
ヒープは明示的な割り当て/解放が必要であり、メモリリークや二重解放が典型的なバグになります。

## アドレス空間の配置（x86-64 Linux）


```
高アドレス
  カーネル空間（アクセス不可）
  スタック  ← 関数ローカル変数・戻りアドレス（下方向に成長）
  ↓
  (未使用)
  ↑
  ヒープ    ← malloc/free（上方向に成長）
  BSS       ← 初期化されていないグローバル・静的変数
  データ    ← 初期化済みグローバル・静的変数
  テキスト  ← 実行コード（read-only）
低アドレス
```

## セグメント詳細

| セグメント | 内容 | ライフタイム |
| --- | --- | --- |
| テキスト | 機械語命令 | プロセス全体 |
| データ | 初期化済みグローバル変数 | プロセス全体 |
| BSS | 未初期化グローバル変数 | プロセス全体（0 で初期化） |
| ヒープ | malloc で確保した領域 | free まで |
| スタック | ローカル変数・引数・戻りアドレス | 関数呼び出し中 |

## 実装

```c title="各セグメントの確認（C）"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* データセグメント（初期化済みグローバル） */
int global_init = 42;

/* BSS セグメント（未初期化グローバル） */
int global_uninit;

/* テキストセグメント（コード） */
void print_addresses(void) {
    /* スタック */
    int local_var = 100;
    char local_arr[16];

    /* ヒープ */
    char *heap_ptr = malloc(64);
    if (!heap_ptr) return;
    strcpy(heap_ptr, "heap data");

    printf("テキスト  (関数):    %p\n", (void*)print_addresses);
    printf("データ   (global):   %p → %d\n", (void*)&global_init, global_init);
    printf("BSS      (global):   %p → %d\n", (void*)&global_uninit, global_uninit);
    printf("スタック (local):    %p → %d\n", (void*)&local_var, local_var);
    printf("ヒープ   (malloc):   %p → %s\n", (void*)heap_ptr, heap_ptr);

    (void)local_arr;
    free(heap_ptr);
}

int main(void) {
    print_addresses();
    return 0;
}
```

```python title="ctypes でアドレス確認（Python）"
import ctypes
import sys

# Python オブジェクトのアドレス
x = 42
lst = [1, 2, 3]
s = "hello"

print(f"int id:  {id(x):#x}")
print(f"list id: {id(lst):#x}")
print(f"str id:  {id(s):#x}")

# C malloc のラッパーでヒープを確認
libc = ctypes.CDLL("libc.so.6")
ptr = libc.malloc(64)
print(f"malloc:  {ptr:#x}")
libc.free(ptr)
```

## 使用場面

- **メモリデバッグ**: Valgrind・AddressSanitizer でリーク検出
- **スタックオーバーフロー**: 再帰が深すぎるとスタック枯渇
- **セキュリティ**: バッファオーバーフローによる ROP チェーンの悪用
- **組み込み**: リンカスクリプトでセグメント配置を明示的に制御

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
