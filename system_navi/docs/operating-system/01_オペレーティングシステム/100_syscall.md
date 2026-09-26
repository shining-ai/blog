---
sidebar_position: 10
displayed_sidebar: operatingSystemSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# システムコールの仕組み (System Call Mechanism)

## システムコールとは

システムコールとは、

> ユーザ空間プロセスがカーネルサービスを呼び出すための保護された境界越えの仕組み

です。
<br/>

ユーザ空間とカーネル空間は CPU の特権レベルによって分離されており、アプリケーションは直接カーネルのコードを呼び出せません。
システムコールはこの境界を安全に越えるための唯一の合法的な入口です。

## 特権レベル（プロテクションリング）

| リング | 名称 | 権限 | 用途 |
| --- | --- | --- | --- |
| Ring 0 | カーネルモード | すべての命令・レジスタにアクセス可 | OS カーネル |
| Ring 1, 2 | （現代 OS では未使用） | — | 仮想化の一部 |
| Ring 3 | ユーザモード | 限定的な命令のみ実行可 | アプリケーション |

x86-64 では `syscall` 命令でリング3からリング0へ遷移し、`sysret` で戻ります。

## システムコール呼び出しの流れ

```
アプリケーション
      ↓ printf() / fread() など
  libc（glibc）ラッパー関数
      ↓ システムコール番号を rax にセット、引数を rdi/rsi/rdx/r10/r8/r9 にセット
  syscall 命令（CPLがRing3→Ring0へ）
      ↓
  カーネルのエントリポイント（entry_SYSCALL_64）
      ↓
  sys_call_table[rax] → カーネルハンドラ（例: sys_read）
      ↓
  ハンドラ実行（ページキャッシュ・ドライバ経由など）
      ↓
  sysret 命令（Ring0→Ring3へ復帰）
      ↓
  libc ラッパーがエラーチェック（rax < 0 なら errno にセット）
      ↓
アプリケーションへ返値
```

## Linux 主要システムコール番号表（x86-64）

| 番号 | 名前 | 説明 |
| --- | --- | --- |
| 0 | `read` | ファイルディスクリプタから読み取り |
| 1 | `write` | ファイルディスクリプタへ書き込み |
| 2 | `open` | ファイルを開く |
| 3 | `close` | ファイルディスクリプタを閉じる |
| 9 | `mmap` | メモリマップドファイル / 匿名マッピング |
| 57 | `fork` | プロセスを複製 |
| 59 | `execve` | プログラムを実行 |
| 60 | `exit` | プロセスを終了 |
| 62 | `kill` | プロセスにシグナルを送信 |
| 231 | `exit_group` | スレッドグループ全体を終了 |

## vDSO による高速化

一部のシステムコール（`gettimeofday`・`clock_gettime`・`time`）はカーネル遷移が不要な vDSO（virtual Dynamic Shared Object）で実装されています。

| 方式 | レイテンシ | 説明 |
| --- | --- | --- |
| 通常のシステムコール | ~100–1000 ns | Ring3→Ring0 の特権遷移が発生 |
| vDSO 経由 | ~数 ns | カーネルが共有メモリにマップしたコードを直接呼び出し |

```bash
# vDSO のマッピングを確認
cat /proc/self/maps | grep vdso
```

## 実装

```c title="syscall() で生のシステムコールを呼び出す（C）"
#include <stdio.h>
#include <unistd.h>
#include <sys/syscall.h>
#include <sys/types.h>
#include <string.h>
#include <errno.h>

int main(void) {
    /* syscall() を使ってlibc を介さず直接カーネルを呼び出す */

    /* SYS_getpid: 自プロセスのPIDを取得 */
    pid_t pid = (pid_t)syscall(SYS_getpid);
    printf("getpid() via syscall: %d\n", pid);

    /* SYS_write: 標準出力へ直接書き込み */
    const char *msg = "SYS_write による直接出力\n";
    ssize_t written = syscall(SYS_write, STDOUT_FILENO, msg, strlen(msg));
    printf("書き込みバイト数: %zd\n", written);

    /* SYS_getuid: ユーザIDを取得 */
    uid_t uid = (uid_t)syscall(SYS_getuid);
    printf("UID: %u\n", uid);

    /* エラーハンドリング: 存在しないファイルを開く */
    int fd = (int)syscall(SYS_open, "/nonexistent/file", 0 /* O_RDONLY */, 0);
    if (fd < 0) {
        errno = -fd > 0 ? -fd : errno;  /* syscall はエラーを負値で返す */
        printf("open 失敗（期待通り）: errno=%d (%s)\n", errno, strerror(errno));
    }

    return 0;
}

/*
 * strace でトレース:
 *   strace -e trace=read,write,open,getpid ./a.out
 *
 * システムコール番号の一覧:
 *   /usr/include/asm/unistd_64.h
 *   または: ausyscall --dump
 */
```

```python title="ctypes で libc 関数を呼び出し、strace ラッパー（Python）"
import ctypes
import ctypes.util
import os
import subprocess

# libc をロード
libc_name = ctypes.util.find_library('c')
libc = ctypes.CDLL(libc_name, use_errno=True)

# getpid: 自プロセスのPIDを取得
libc.getpid.restype = ctypes.c_int
pid = libc.getpid()
print(f"getpid() via libc: {pid}")

# gettid: スレッドIDを取得（Linux 専用、libc に直接ラップなし）
try:
    import ctypes
    SYS_gettid = 186  # x86-64
    tid = libc.syscall(SYS_gettid)
    print(f"gettid() via syscall: {tid}")
except Exception as e:
    print(f"gettid 取得失敗: {e}")

# write: ファイルディスクリプタへ直接書き込み
msg = b"ctypes SYS_write test\n"
libc.write.argtypes = [ctypes.c_int, ctypes.c_char_p, ctypes.c_size_t]
libc.write.restype = ctypes.c_ssize_t
libc.write(1, msg, len(msg))

# --- strace ラッパー: 子プロセスのシステムコールをトレース ---
def strace_run(cmd: list, syscalls: list = None):
    """コマンドを strace でトレースして出力を返す"""
    strace_args = ['strace']
    if syscalls:
        strace_args += ['-e', f"trace={','.join(syscalls)}"]
    strace_args += ['-c']  # システムコール統計を表示
    strace_args += cmd

    try:
        result = subprocess.run(
            strace_args,
            capture_output=True,
            text=True,
            timeout=10
        )
        print("=== strace 統計 ===")
        print(result.stderr)  # strace は stderr に出力
    except FileNotFoundError:
        print("strace がインストールされていません")
    except subprocess.TimeoutExpired:
        print("タイムアウト")

# /bin/true のシステムコール統計を表示
strace_run(['/bin/true'], syscalls=['read', 'write', 'open', 'close', 'execve'])
```

## 使用場面

- **セキュリティサンドボックス（seccomp）**: 許可するシステムコールを制限し攻撃面を削減（Docker・Chrome のサンドボックス）
- **strace / ptrace**: デバッグツールがシステムコールをインターセプトしてトレース
- **gVisor**: システムコールをユーザ空間で再実装したコンテナランタイム
- **eBPF**: カーネルのシステムコールフックでパフォーマンス計測・セキュリティポリシー適用
- **Wasm / WASI**: WebAssembly のシステムコールインタフェースの設計指針

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
