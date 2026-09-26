---
sidebar_position: 8
displayed_sidebar: operatingSystemSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ファイルシステム (File System)

## ファイルシステムとは

ファイルシステムとは、

> ストレージデバイス上にファイルとディレクトリの階層構造を管理するOSのサブシステム

です。<br/>

OSはVFS（Virtual File System）という抽象化レイヤを通じて、ext4・XFS・FAT32など異なる実装を統一的な`open`/`read`/`write`インタフェースで扱えるようにしています。ファイルシステムはinode・ディレクトリエントリ・ブロックの3つの概念を中心に構成されます。

## VFS（Virtual File System）

VFSはカーネル内に存在する統一抽象化レイヤで、アプリケーションが同一のシステムコールで異なるファイルシステムを操作できるようにします。

```
アプリケーション
  │ open() / read() / write() / stat()
  ▼
VFS（仮想ファイルシステム）
  ├─ ext4 ドライバ  ← /dev/sda1
  ├─ XFS  ドライバ  ← /dev/sdb1
  ├─ FAT32ドライバ  ← /dev/sdc1（USBメモリ）
  ├─ procfs         ← /proc（仮想・プロセス情報）
  └─ tmpfs          ← /tmp（RAM上ファイルシステム）
```

## inodeの構造

inodeはファイルのメタデータを格納するデータ構造です。ファイル名は**含まれません**（ディレクトリエントリが担当します）。

```
inode 構造体（概略）:
  - ファイルタイプ（通常・ディレクトリ・シンボリックリンク等）
  - パーミッション（rwxrwxrwx）
  - 所有者 UID / GID
  - ファイルサイズ
  - タイムスタンプ（atime / mtime / ctime）
  - リンクカウント（ハードリンク数）
  - 直接ブロックポインタ × 12
  - 間接ブロックポインタ（1段・2段・3段）
  - 拡張属性ポインタ（ext4はextentベース）

確認コマンド:
  ls -i /etc/passwd           → inode番号を表示
  stat /etc/passwd            → 全メタデータを表示
```

## ディレクトリエントリ

ディレクトリはファイル名とinode番号のマッピングテーブルです。

```
ディレクトリ /home/user/ の内容（概念図）:
  ┌──────────┬──────────┐
  │ inode番号 │ ファイル名  │
  ├──────────┼──────────┤
  │    2      │ .        │（自身）
  │    5      │ ..       │（親）
  │   42      │ hello.c  │
  │   57      │ README   │
  └──────────┴──────────┘

ハードリンク: 同一inodeを複数のディレクトリエントリが指す
シンボリックリンク: 別のinodeを持ち、ターゲットパスを中身に格納
```

## ext4のジャーナリング

ext4はWAL（Write-Ahead Logging）方式で、クラッシュ後のデータ整合性を保証します。

```
書き込みフロー:
  1. ジャーナル（ログ）にメタデータ変更を記録
  2. ジャーナルにコミットレコードを書き込む（ここで永続化確定）
  3. 実際のデータブロックとメタデータを更新
  4. ジャーナルの該当エントリを解放（チェックポイント）

クラッシュ時の復旧:
  - fsckがジャーナルを読み、コミット済みなら再実行（redo）
  - 未コミットの変更は破棄 → 整合性が保たれる
```

## ファイルシステム比較

| ファイルシステム | 最大ファイルサイズ | 最大ボリューム | ジャーナリング | 主な用途 |
| --- | --- | --- | --- | --- |
| FAT32 | 4GB | 2TB | なし | USBメモリ・SDカード |
| exFAT | 16EB | 128PB | なし | 大容量フラッシュ |
| ext4 | 16TB | 1EB | あり（WAL） | Linuxサーバ汎用 |
| XFS | 8EB | 8EB | あり（WAL） | 大規模ファイル・動画編集 |
| NTFS | 256TB | 256TB | あり（MFT） | Windows汎用 |
| btrfs | 16EB | 16EB | CoW | Linuxデスクトップ・スナップショット |
| ZFS | 16EB | 256ZB | CoW+チェックサム | NAS・エンタープライズストレージ |

## 実装

```c title="POSIX API（open/read/write/close/stat/mmap）の基本的な使い方（C）"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <fcntl.h>
#include <unistd.h>
#include <sys/stat.h>
#include <sys/mman.h>

int main(void) {
    const char *path = "/tmp/fs_demo.txt";
    const char *msg  = "Hello, Filesystem!\n";

    /* ─── open / write / close ─── */
    int fd = open(path, O_WRONLY | O_CREAT | O_TRUNC, 0644);
    if (fd < 0) { perror("open"); return 1; }
    write(fd, msg, strlen(msg));
    close(fd);

    /* ─── stat でメタデータ取得 ─── */
    struct stat st;
    if (stat(path, &st) == 0) {
        printf("inode番号    : %lu\n", (unsigned long)st.st_ino);
        printf("ファイルサイズ: %lld バイト\n", (long long)st.st_size);
        printf("リンクカウント: %lu\n", (unsigned long)st.st_nlink);
        printf("パーミッション: %o\n", (unsigned)st.st_mode & 0777);
    }

    /* ─── mmap で読み取り ─── */
    fd = open(path, O_RDONLY);
    if (fd < 0) { perror("open(rdonly)"); return 1; }

    void *addr = mmap(NULL, (size_t)st.st_size, PROT_READ, MAP_PRIVATE, fd, 0);
    if (addr == MAP_FAILED) { perror("mmap"); close(fd); return 1; }

    printf("mmap内容: %.*s", (int)st.st_size, (char *)addr);
    munmap(addr, (size_t)st.st_size);
    close(fd);

    /* ─── open / read ─── */
    fd = open(path, O_RDONLY);
    char buf[256] = {0};
    ssize_t n = read(fd, buf, sizeof(buf) - 1);
    if (n > 0) printf("read内容: %s", buf);
    close(fd);

    unlink(path);  /* ファイル削除（inode参照がなくなれば実際に消える） */
    return 0;
}
```

```python title="pathlib と os.stat で inode 情報取得・os.scandir() でディレクトリ列挙（Python）"
import os
import stat
import pathlib
from datetime import datetime

def show_inode_info(path: str) -> None:
    """ファイルのinode情報を表示"""
    p = pathlib.Path(path)
    if not p.exists():
        print(f"{path} が存在しません")
        return

    st = p.stat()
    mode = stat.filemode(st.st_mode)
    mtime = datetime.fromtimestamp(st.st_mtime).strftime("%Y-%m-%d %H:%M:%S")

    print(f"パス           : {p.resolve()}")
    print(f"inode番号      : {st.st_ino}")
    print(f"パーミッション  : {mode}")
    print(f"サイズ          : {st.st_size} バイト")
    print(f"リンクカウント  : {st.st_nlink}")
    print(f"最終更新時刻    : {mtime}")
    print(f"デバイスID      : {st.st_dev}")


def scan_directory(path: str) -> None:
    """os.scandir() でディレクトリを効率的に列挙"""
    print(f"\n=== {path} の内容 ===")
    try:
        with os.scandir(path) as it:
            entries = sorted(it, key=lambda e: e.name)
            for entry in entries[:20]:  # 最大20件表示
                st = entry.stat(follow_symlinks=False)
                kind = "DIR " if entry.is_dir(follow_symlinks=False) else \
                       "LINK" if entry.is_symlink() else "FILE"
                print(f"  [{kind}] inode={st.st_ino:>8}  {entry.name}")
    except PermissionError:
        print("  アクセス拒否")


def compare_hardlinks(path: str) -> None:
    """ハードリンクの確認: 同一inodeを共有するか検証"""
    link_path = path + ".hardlink"
    try:
        os.link(path, link_path)
        st1 = os.stat(path)
        st2 = os.stat(link_path)
        print(f"\n=== ハードリンク確認 ===")
        print(f"  オリジナル inode: {st1.st_ino}, リンク数: {st1.st_nlink}")
        print(f"  ハードリンク inode: {st2.st_ino}, リンク数: {st2.st_nlink}")
        print(f"  同一inode: {st1.st_ino == st2.st_ino}")
    finally:
        if os.path.exists(link_path):
            os.unlink(link_path)


# テストファイル作成
test_file = "/tmp/python_fs_demo.txt"
pathlib.Path(test_file).write_text("Hello, Python Filesystem!\n")

show_inode_info(test_file)
scan_directory("/tmp")
compare_hardlinks(test_file)

os.unlink(test_file)
```

## 使用場面

- **フラッシュストレージ（FAT32/exFAT）**: カメラ・スマートフォンのSDカードはFAT32/exFATを使用。互換性と単純さが優先される
- **Linuxサーバ（ext4/XFS）**: ext4はDebuntu/RHELのデフォルト。XFSは大容量ファイルや並列I/Oが多い環境で優れる
- **macOS（APFS）**: Apple File Systemはコピーオンライト・スナップショット・暗号化・SSD最適化を統合
- **NAS（ZFS）**: ZFSはRAID-Z・自己修復チェックサム・重複排除・スナップショットを一体で提供

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
