---
sidebar_position: 1
displayed_sidebar: operatingSystemSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ポインタ (Pointers)

## ポインタとは

ポインタとは、

> 変数のメモリアドレスを値として保持する変数で、間接参照によりアドレスが指す値を読み書きできる

です。
<br/>

ポインタを使うことで動的なメモリ管理・配列操作・関数ポインタ・データ構造の実装が可能になります。
誤った使い方は未定義動作・セキュリティ脆弱性を引き起こします。

## ポインタの基本操作


| 演算子 | 意味 | 例 |
| --- | --- | --- |
| `&x` | x のアドレス取得 | `int *p = &x;` |
| `*p` | p が指す値（間接参照） | `int v = *p;` |
| `p + n` | n 要素分進めたアドレス | `*(p+2)` = `p[2]` |
| `p++` | 1要素分アドレスをインクリメント | 配列走査 |

## ポインタと配列

```c
int a[3] = {10, 20, 30};
int *p = a;          // p は a[0] を指す

p[1]  == *(p + 1) == a[1]  // 全て同じ（20）
```

## 実装

```c title="ポインタの基本と応用（C）"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* 値渡し vs ポインタ渡し */
void swap_by_value(int a, int b) {
    int tmp = a; a = b; b = tmp;  /* 呼び出し元に影響しない */
}

void swap_by_ptr(int *a, int *b) {
    int tmp = *a; *a = *b; *b = tmp;  /* 呼び出し元も変わる */
}

/* 関数ポインタ */
typedef int (*compare_fn)(int, int);

int ascending(int a, int b)  { return a - b; }
int descending(int a, int b) { return b - a; }

void bubble_sort(int *arr, int n, compare_fn cmp) {
    for (int i = 0; i < n - 1; i++)
        for (int j = 0; j < n - i - 1; j++)
            if (cmp(arr[j], arr[j+1]) > 0) {
                int tmp = arr[j]; arr[j] = arr[j+1]; arr[j+1] = tmp;
            }
}

/* 動的メモリ確保 */
int *create_array(int n) {
    int *p = malloc(n * sizeof(int));
    if (!p) return NULL;
    for (int i = 0; i < n; i++) p[i] = i * i;
    return p;
}

int main(void) {
    /* swap */
    int x = 3, y = 7;
    swap_by_value(x, y);
    printf("値渡し後: x=%d y=%d\n", x, y);   /* 変わらない */
    swap_by_ptr(&x, &y);
    printf("ptr渡し後: x=%d y=%d\n", x, y);  /* 交換される */

    /* 関数ポインタ */
    int arr[] = {5, 2, 8, 1, 9, 3};
    int n = sizeof(arr) / sizeof(arr[0]);
    bubble_sort(arr, n, ascending);
    printf("昇順: ");
    for (int i = 0; i < n; i++) printf("%d ", arr[i]);
    printf("\n");

    /* 動的確保 */
    int *dyn = create_array(5);
    if (dyn) {
        printf("二乗: ");
        for (int i = 0; i < 5; i++) printf("%d ", dyn[i]);
        printf("\n");
        free(dyn);
    }
    return 0;
}
```

```python title="ctypes でポインタ操作（Python）"
import ctypes

# C の int へのポインタ相当
x = ctypes.c_int(42)
p = ctypes.pointer(x)

print(f"値: {p.contents.value}")          # 42
print(f"アドレス: {ctypes.addressof(x):#x}")

# 配列のポインタ走査
arr = (ctypes.c_int * 5)(10, 20, 30, 40, 50)
p_arr = ctypes.cast(arr, ctypes.POINTER(ctypes.c_int))
for i in range(5):
    print(f"p_arr[{i}] = {p_arr[i]}")
```

## 使用場面

- **OS カーネル**: デバイスレジスタへの MMIO アクセス
- **データ構造**: リスト・木のノード接続
- **コールバック**: イベントハンドラを関数ポインタで登録
- **FFI**: Python/Rust から C ライブラリを呼び出す際のバインディング

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
