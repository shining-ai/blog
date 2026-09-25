---
sidebar_position: 0
displayed_sidebar: operatingSystemSidebar
---

# C 言語とメモリモデル

## 概要

C 言語のメモリモデルとは、

> プログラムが実行時に使用するメモリ領域の種類と管理方法を規定するモデルで、スタック・ヒープ・静的領域の3つに分類される

です。

C は OS のメモリ管理を直接扱える低レベル言語であり、メモリモデルを理解することがバグの少ないシステムプログラムの作成に不可欠です。

## メモリ領域の種類

```
高アドレス
┌──────────────┐
│    スタック   │  関数呼び出し時に自動確保・解放
│    ↓          │  ローカル変数・引数・戻りアドレス
│               │
│    ↑          │
│    ヒープ     │  malloc/free で動的確保・解放
├──────────────┤
│ BSS セグメント│  未初期化グローバル変数（ゼロ初期化）
│ データセグメント│  初期化済みグローバル変数・静的変数
│ テキストセグメント│ コード・文字列リテラル（読み取り専用）
低アドレス
└──────────────┘
```

## 各領域の特性

| 領域 | 確保 | 解放 | サイズ | 速度 |
|---|---|---|---|---|
| スタック | 自動（関数エントリ） | 自動（関数リターン） | 数MB（通常8MB） | 最速 |
| ヒープ | 手動（malloc） | 手動（free） | GBまで可 | 中程度 |
| 静的 | プログラム開始時 | プログラム終了時 | コンパイル時決定 | 高速 |

## スタックの動作

```c title="スタックフレームの確認"
#include <stdio.h>

void inner(int x) {
    int local = x * 2;
    printf("inner: &local = %p\n", (void*)&local);
}

void outer(void) {
    int local = 42;
    printf("outer: &local = %p\n", (void*)&local);
    inner(local);
    // inner 終了後、inner のスタックフレームは消える
}

int main(void) {
    outer();
    return 0;
}
// outer のアドレス > inner のアドレス（スタックは高→低に成長）
```

## 動的メモリ管理

```c title="malloc/free の正しい使い方"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

int main(void) {
    // 動的配列
    int n = 100;
    int *arr = malloc(n * sizeof(int));
    if (!arr) { perror("malloc"); return 1; }

    for (int i = 0; i < n; i++) arr[i] = i;
    printf("arr[50] = %d\n", arr[50]);

    free(arr);    // 解放
    arr = NULL;   // ダングリングポインタ防止

    // realloc でサイズ変更
    int *buf = malloc(10 * sizeof(int));
    buf = realloc(buf, 20 * sizeof(int));  // 拡張
    free(buf);

    return 0;
}
```

## 典型的なバグ

| バグ | 説明 | 結果 |
|---|---|---|
| バッファオーバーフロー | 配列の境界外書き込み | SIGSEGV・脆弱性 |
| メモリリーク | free 忘れ | メモリ枯渇 |
| 二重解放 | free 済みポインタの再 free | ヒープ破壊 |
| ダングリングポインタ | free 後のポインタ使用 | 未定義動作 |
| NULL 参照 | NULL ポインタの逆参照 | SIGSEGV |

## 使用場面

- **OS カーネル**: デバイスドライバ・メモリアロケータの実装
- **組み込みシステム**: 制限されたメモリの効率的な管理
- **パフォーマンスクリティカルなコード**: ゲームエンジン・データベースのバッファ管理
