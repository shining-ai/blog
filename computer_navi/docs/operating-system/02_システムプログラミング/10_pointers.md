---
sidebar_position: 1
displayed_sidebar: operatingSystemSidebar
---

# ポインタと配列

## 概要

ポインタとは、

> 変数のメモリアドレスを格納する変数であり、C 言語においてメモリ直接操作・動的メモリ・データ構造・関数ポインタの基盤

です。

C のポインタは強力ですが、誤用するとセグフォルト・バッファオーバーフロー・脆弱性を引き起こします。

## ポインタの基本

```c title="ポインタの宣言と操作"
#include <stdio.h>

int main(void) {
    int  x = 42;
    int *p = &x;        // p は x のアドレスを保持

    printf("x   = %d\n",  x);       // 42
    printf("&x  = %p\n",  (void*)&x);
    printf("p   = %p\n",  (void*)p);  // &x と同じ
    printf("*p  = %d\n", *p);       // 42（逆参照）

    *p = 100;           // p の指す先を変更
    printf("x   = %d\n",  x);       // 100

    return 0;
}
```

## ポインタ演算

```c title="ポインタ演算"
#include <stdio.h>

int main(void) {
    int arr[] = {10, 20, 30, 40, 50};
    int *p = arr;  // arr は先頭要素のアドレス

    for (int i = 0; i < 5; i++) {
        printf("arr[%d] = %d, *(p+%d) = %d\n",
               i, arr[i], i, *(p + i));
    }
    // ポインタに整数を加算すると sizeof(型) 分ずれる
    // p+1 は p + 4バイト（int が4バイトの場合）

    return 0;
}
```

## 配列とポインタの関係

```c
int arr[5] = {1, 2, 3, 4, 5};

// 以下はすべて等価
arr[i]      // 添字アクセス
*(arr + i)  // ポインタ演算
*(i + arr)  // 加算は可換
i[arr]      // C の文法上も valid（添字演算子はポインタ演算のシンタックスシュガー）
```

## ポインタの種類

| 種類 | 宣言 | 説明 |
|---|---|---|
| 基本ポインタ | `int *p` | int 型変数へのポインタ |
| const ポインタ | `const int *p` | 指す先を変更不可 |
| ポインタ const | `int * const p` | ポインタ自体を変更不可 |
| ダブルポインタ | `int **pp` | ポインタへのポインタ |
| 関数ポインタ | `int (*fp)(int, int)` | 関数へのポインタ |
| void ポインタ | `void *p` | 任意型への汎用ポインタ |

## 関数ポインタの例

```c title="コールバック関数"
#include <stdio.h>
#include <stdlib.h>

int compare_asc(const void *a, const void *b) {
    return (*(int*)a - *(int*)b);
}

int compare_desc(const void *a, const void *b) {
    return (*(int*)b - *(int*)a);
}

int main(void) {
    int arr[] = {5, 2, 8, 1, 9, 3};
    int n = sizeof(arr) / sizeof(arr[0]);

    // qsort に関数ポインタを渡す
    qsort(arr, n, sizeof(int), compare_asc);
    for (int i = 0; i < n; i++) printf("%d ", arr[i]);
    printf("\n");  // 1 2 3 5 8 9

    qsort(arr, n, sizeof(int), compare_desc);
    for (int i = 0; i < n; i++) printf("%d ", arr[i]);
    printf("\n");  // 9 8 5 3 2 1

    return 0;
}
```

## 使用場面

- **データ構造**: 連結リスト・木構造の next/parent ポインタ
- **動的メモリ**: malloc の戻り値はポインタ
- **カーネル開発**: デバイスドライバの I/O アドレス直接操作
- **インタプリタ**: VM のオペコードディスパッチテーブル
