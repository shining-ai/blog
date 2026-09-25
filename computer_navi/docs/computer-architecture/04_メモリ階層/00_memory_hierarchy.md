---
sidebar_position: 0
displayed_sidebar: computerArchitectureSidebar
---

# メモリ階層の全体像

## 概要

メモリ階層とは、

> 速度・容量・コストのトレードオフを最適化するために、複数の記憶装置を階層的に組み合わせたコンピュータのメモリ設計

です。

プログラムの**局所性**（近くのアドレスを繰り返しアクセスする傾向）を利用し、高速な上位層に頻繁アクセスするデータを置くことで性能を向上させます。

## 階層構造

```
レジスタ      〜300ps  数十〜数百バイト   コスト: 最高
↓
L1キャッシュ  1-4ns    32KB〜256KB       コスト: 高
↓
L2キャッシュ  4-10ns   256KB〜4MB        コスト: 中高
↓
L3キャッシュ  10-30ns  4MB〜32MB         コスト: 中
↓
DRAM（主記憶）50-100ns 4GB〜数百GB      コスト: 低
↓
SSD           100μs   数百GB〜数TB      コスト: 最低
↓
HDD           10ms    数TB〜数百TB       コスト: 最安
```

## 局所性の原理

| 種類 | 説明 | 例 |
|---|---|---|
| 時間的局所性 | 最近アクセスしたデータは再アクセスされやすい | ループ変数・ループカウンタ |
| 空間的局所性 | アクセスしたアドレス近傍もアクセスされやすい | 配列の順次走査 |
| 順次局所性 | 命令は連続的に実行される | 直線的なプログラムコード |

## 性能指標

| 指標 | 説明 |
|---|---|
| ヒット率 | キャッシュで要求が満たされる割合 |
| ミスペナルティ | ミス時に下位層から取得する時間 |
| 有効アクセス時間 | = ヒット率×キャッシュ時間 + (1−ヒット率)×主記憶時間 |
| AMAT | Average Memory Access Time |

## 実装：キャッシュヒット率の測定

```c title="メモリアクセスパターンの比較"
#include <stdio.h>
#include <time.h>
#define N 1024

int mat[N][N];

// 行優先アクセス（キャッシュフレンドリー）
void row_major(void) {
    for (int i = 0; i < N; i++)
        for (int j = 0; j < N; j++)
            mat[i][j] = i + j;
}

// 列優先アクセス（キャッシュミス多発）
void col_major(void) {
    for (int j = 0; j < N; j++)
        for (int i = 0; i < N; i++)
            mat[i][j] = i + j;
}

int main(void) {
    clock_t t1 = clock(); row_major(); clock_t t2 = clock();
    clock_t t3 = clock(); col_major(); clock_t t4 = clock();
    printf("row_major: %.3f s\n", (double)(t2-t1)/CLOCKS_PER_SEC);
    printf("col_major: %.3f s\n", (double)(t4-t3)/CLOCKS_PER_SEC);
    // 通常 col_major は row_major の数倍遅い
    return 0;
}
```

## 使用場面

- **ループ最適化**: ループの反転・タイリングでキャッシュ効率を向上
- **データ構造設計**: AoS（Array of Structs）vs SoA（Struct of Arrays）
- **NUMA 対応**: マルチソケット構成でメモリ局所性を意識した設計
