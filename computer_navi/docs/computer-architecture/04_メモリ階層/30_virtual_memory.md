---
sidebar_position: 3
displayed_sidebar: computerArchitectureSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 仮想メモリとページング (Virtual Memory & Paging)

## 仮想メモリとは

仮想メモリとは、

> 各プロセスに独立した仮想アドレス空間を提供し、物理メモリとのマッピングをOSがページテーブルで管理する仕組み

です。
<br/>

プロセスはあたかも連続した大きなメモリを独占しているかのように見えますが、実際にはOSが仮想アドレスを物理アドレスに変換します。これによりプロセス間の隔離、スワッピング、共有メモリ、コピーオンライトなどが実現されます。

## ページングの仕組み

仮想アドレスはページ単位（通常 4 KiB）に分割され、ページテーブルが仮想ページ番号（VPN）を物理フレーム番号（PFN）に変換します。

```
仮想アドレス [VPN | ページオフセット]
                ↓ ページテーブル参照
物理アドレス [PFN | ページオフセット]
```

## x86-64 の 4 段階ページテーブル

x86-64 では 48 ビットの仮想アドレス空間を 4 段階のページテーブルで管理します。各レベルは 512 エントリ（9 ビット）を持ちます。

```
仮想アドレス（64 ビット）:
 63      48 47    39 38    30 29    21 20    12 11       0
 [ 符号拡張 |  PML4  |  PDPT  |   PD   |   PT   | オフセット ]
              9 bit    9 bit    9 bit    9 bit    12 bit

PML4  (Page Map Level 4)  … CR3 レジスタが指す
  └─ PDPT (Page Directory Pointer Table)
       └─ PD   (Page Directory)
            └─ PT   (Page Table)
                 └─ 物理フレーム (4 KiB)
```

| レベル | 名称 | エントリ数 | カバー範囲 |
| --- | --- | --- | --- |
| 4 | PML4 | 512 | 512 GiB/エントリ |
| 3 | PDPT | 512 | 1 GiB/エントリ |
| 2 | PD | 512 | 2 MiB/エントリ |
| 1 | PT | 512 | 4 KiB/エントリ |

## ページテーブルエントリ (PTE) のビットフィールド

| ビット | フラグ名 | 意味 |
| --- | --- | --- |
| 0 | Present (P) | 1=ページが物理メモリに存在（0=ページフォルト発生） |
| 1 | Writable (R/W) | 1=書込可、0=読取専用 |
| 2 | User/Supervisor (U/S) | 1=ユーザ空間からアクセス可 |
| 3 | Write-Through (PWT) | 1=ライトスルーキャッシュ |
| 4 | Cache Disable (PCD) | 1=キャッシュ無効（MMIO等） |
| 5 | Accessed (A) | CPU が読取時にセット（ページ置換アルゴリズムが参照） |
| 6 | Dirty (D) | CPU が書込時にセット（スワップアウト要否の判断） |
| 7 | Page Size (PS) | 1=大ページ（PDでは2MiB、PDPTでは1GiB） |
| 12〜51 | PFN | 物理フレーム番号（40 ビット） |
| 63 | No-Execute (NX/XD) | 1=コード実行禁止（データ領域保護） |

## メモリマップ（x86-64 Linux）

| 領域 | 仮想アドレス範囲 | 説明 |
| --- | --- | --- |
| カーネル空間 | `0xFFFF800000000000` 〜 `0xFFFFFFFFFFFFFFFF` | カーネルコード・データ・VMALLOC |
| ユーザ空間上限 | `0x00007FFFFFFFFFFF` | ユーザ空間の最大アドレス |
| スタック | `0x00007FFF00000000` 付近（下方向に伸長） | スレッドスタック |
| ヒープ | `0x0000000000600000` 付近（上方向に伸長） | malloc/brk/mmap |
| テキスト/データ | `0x0000000000400000` 付近 | 実行ファイルのロード先 |

## 実装

```c title="mmap と mprotect によるページ保護操作（C）"
#include <stdio.h>
#include <stdlib.h>
#include <sys/mman.h>
#include <signal.h>
#include <string.h>
#include <unistd.h>
#include <setjmp.h>

static sigjmp_buf jmp_env;

void segv_handler(int sig) {
    (void)sig;
    siglongjmp(jmp_env, 1);
}

int main(void) {
    const size_t PAGE = (size_t)getpagesize();

    /* 匿名ページを読書可能でマップ */
    char *buf = mmap(NULL, PAGE * 2,
                     PROT_READ | PROT_WRITE,
                     MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
    if (buf == MAP_FAILED) { perror("mmap"); return 1; }

    /* 1ページ目に書き込み */
    strcpy(buf, "Hello, Virtual Memory!");
    printf("書込後: %s\n", buf);

    /* 2ページ目を読取専用に変更 */
    if (mprotect(buf + PAGE, PAGE, PROT_READ) < 0) {
        perror("mprotect"); return 1;
    }

    /* SIGSEGV をキャッチして書込試行をテスト */
    struct sigaction sa = { .sa_handler = segv_handler };
    sigaction(SIGSEGV, &sa, NULL);

    if (sigsetjmp(jmp_env, 1) == 0) {
        buf[PAGE] = 'X';  /* 読取専用ページへの書込 → SIGSEGV */
        printf("書込成功（想定外）\n");
    } else {
        printf("SIGSEGV: 読取専用ページへの書込を正しくブロック\n");
    }

    /* PROT_NONE: アクセス完全禁止（Guard page に利用） */
    mprotect(buf, PAGE, PROT_NONE);

    /* MAP_SHARED: ファイルバックドマッピング（省略: 概念のみ）
     * fd = open("data.bin", O_RDWR);
     * mmap(NULL, size, PROT_READ|PROT_WRITE, MAP_SHARED, fd, 0);
     * → ファイルと同期。msync() で明示的フラッシュ */

    munmap(buf, PAGE * 2);
    return 0;
}
```

```python title="/proc/self/maps のパースと mmap モジュール（Python）"
import mmap
import os
import re

def parse_proc_maps() -> list[dict]:
    """現プロセスのメモリマップを /proc/self/maps から読み取る"""
    regions = []
    with open("/proc/self/maps", "r") as f:
        for line in f:
            # 例: 7f1234560000-7f1234570000 r--p 00000000 fd:01 123456 /lib/x86_64/libc.so
            m = re.match(
                r"([0-9a-f]+)-([0-9a-f]+)\s+([\w-]+)\s+([0-9a-f]+)\s+\S+\s+\d+\s*(.*)",
                line.strip()
            )
            if m:
                regions.append({
                    "start": int(m.group(1), 16),
                    "end":   int(m.group(2), 16),
                    "perms": m.group(3),
                    "offset": int(m.group(4), 16),
                    "name":  m.group(5).strip(),
                })
    return regions

def show_memory_map():
    regions = parse_proc_maps()
    print(f"{'Start':18} {'End':18} {'Perms':6} {'Name'}")
    print("-" * 70)
    for r in regions[:15]:  # 先頭15件を表示
        size_kb = (r["end"] - r["start"]) // 1024
        print(f"0x{r['start']:016x} 0x{r['end']:016x} {r['perms']:6} "
              f"{r['name'] or '[anonymous]'} ({size_kb} KiB)")

def demo_mmap():
    """Python の mmap モジュールでページを直接操作"""
    # 匿名マッピング（ファイルなし）
    with mmap.mmap(-1, mmap.PAGESIZE, access=mmap.ACCESS_WRITE) as m:
        m.write(b"Virtual Memory Demo\x00")
        m.seek(0)
        data = m.read(20)
        print(f"mmap 書込・読取: {data}")

    # コピーオンライトのデモ（ファイルバックド）
    with open("/tmp/cow_demo.bin", "w+b") as f:
        f.write(b"\x00" * mmap.PAGESIZE)
        f.flush()
        with mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_COPY) as m:
            # ACCESS_COPY = copy-on-write。変更はプロセス内にのみ反映
            m[0:5] = b"Hello"
            m.seek(0)
            print(f"CoW 読取: {m.read(5)}")  # Hello（ファイルは変更されない）

if __name__ == "__main__":
    print("=== /proc/self/maps ===")
    show_memory_map()
    print("\n=== mmap デモ ===")
    demo_mmap()
```

## 使用場面

- **プロセス隔離**: 各プロセスが独立した仮想アドレス空間を持つため、他プロセスのメモリを読み書きできない（セキュリティ・安定性の基盤）
- **スワップ**: 物理メモリ不足時にPTEのPresentビットを0にしてページをディスクに退避し、アクセス時にページフォルトで復元する
- **メモリマップドファイル（mmap）**: ファイルI/Oをページフォルトとして透過的に処理し、readシステムコールよりも効率的なファイルアクセスを提供
- **コピーオンライト（fork）**: fork直後は親子プロセスのPTEが同じ物理フレームを読取専用で参照し、書込み時にのみページをコピーすることでメモリ使用量を削減

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
