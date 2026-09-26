---
sidebar_position: 4
displayed_sidebar: operatingSystemSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# POSIX API (fork / exec / wait / pipe)

## POSIX APIとは

POSIX APIとは、

> POSIX（Portable Operating System Interface）はUnix系OSのシステムコールAPIを標準化した規格で、IEEE Std 1003.1として定義されている

です。<br/>

POSIX準拠により、Linux・macOS・FreeBSD等の異なるUnix系OS間でソースコードレベルの移植性が得られます。`fork`/`exec`/`wait`/`pipe`はシェルやデーモンプロセスの基本となるAPIです。

## 主要 POSIX API

| API | シグネチャ | 機能 |
| --- | --- | --- |
| `fork` | `pid_t fork(void)` | 呼び出しプロセスの完全コピーを子プロセスとして生成 |
| `execvp` | `int execvp(const char *file, char *const argv[])` | 現在のプロセスイメージを新プログラムで置換 |
| `waitpid` | `pid_t waitpid(pid_t pid, int *status, int opts)` | 子プロセスの終了を待ちリソースを回収 |
| `pipe` | `int pipe(int pipefd[2])` | プロセス間通信用の匿名パイプを作成 |
| `dup2` | `int dup2(int oldfd, int newfd)` | ファイルディスクリプタを複製・リダイレクト |
| `open` | `int open(const char *path, int flags, ...)` | ファイルを開いてFDを返す |
| `close` | `int close(int fd)` | ファイルディスクリプタを閉じる |
| `read` | `ssize_t read(int fd, void *buf, size_t n)` | FDからバイト列を読み取る |
| `write` | `ssize_t write(int fd, const void *buf, size_t n)` | FDへバイト列を書き込む |

## fork / exec / wait の動作フロー

```
親プロセス (PID=100)
  │
  ├─ fork() 呼び出し
  │   ├─ 親: fork() → 子のPID(例:101) を返す
  │   └─ 子: fork() → 0 を返す（ここから子プロセスの実行）
  │
  │   子プロセス (PID=101)
  │     └─ execvp("ls", ["ls", "-l", NULL])
  │           → プロセスイメージが "ls" に置換される
  │           → 成功すれば execvp は返らない
  │
  └─ waitpid(101, &status, 0)
       → 子が終了するまでブロック
       → 終了コードを status に格納して返る
```

## パイプの仕組み

```
pipe(fd) で作成:
  fd[0] ← 読み取り端（read 専用）
  fd[1] ← 書き込み端（write 専用）

カーネル内のリングバッファ（デフォルト64KB）を介して通信:

  書き手プロセス ─── write(fd[1], data) ──→ [カーネルバッファ] ──→ read(fd[0]) ─── 読み手プロセス

  バッファが満杯のとき write はブロック
  バッファが空のとき  read  はブロック
  全 fd[1] が close されたとき read は EOF(0) を返す

シェルのパイプライン "ls | grep .c" の実装:
  親 ─┬── fork() → 子1 (ls)
     │              └─ dup2(fd[1], STDOUT_FILENO)
     │                 close(fd[0]); execvp("ls", ...)
     └── fork() → 子2 (grep)
                    └─ dup2(fd[0], STDIN_FILENO)
                       close(fd[1]); execvp("grep", ...)
```

## ファイルディスクリプタの継承

```
fork() 後の FD 継承:

  親プロセス    子プロセス
  fd 0(stdin) ──┬── fd 0(stdin)   ← 同じファイルテーブルエントリを共有
  fd 1(stdout)  ├── fd 1(stdout)
  fd 2(stderr)  ├── fd 2(stderr)
  fd 3(socket)  └── fd 3(socket)  ← 子で使わなければ必ず close が必要

注意: 子で不要なFDを閉じないと
  ・パイプのEOFが送られない（fd[1]の参照カウントが減らない）
  ・セキュリティリスク（機密FDの漏洩）
```

## 実装

```c title="fork+execvp+pipe+dup2 でシェルパイプライン実装（ls | grep .c）（C）"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/wait.h>

int main(void) {
    int pipefd[2];
    if (pipe(pipefd) < 0) { perror("pipe"); return 1; }

    /* ─── 子プロセス1: ls を実行、stdout → パイプ書き込み端 ─── */
    pid_t pid1 = fork();
    if (pid1 < 0) { perror("fork1"); return 1; }

    if (pid1 == 0) {
        /* 子1: stdout を fd[1] にリダイレクト */
        dup2(pipefd[1], STDOUT_FILENO);
        close(pipefd[0]);  /* 読み取り端は不要 */
        close(pipefd[1]);  /* dup2済みなので元FDを閉じる */

        char *argv[] = {"ls", "-la", NULL};
        execvp("ls", argv);
        perror("execvp ls");
        exit(1);
    }

    /* ─── 子プロセス2: grep を実行、stdin ← パイプ読み取り端 ─── */
    pid_t pid2 = fork();
    if (pid2 < 0) { perror("fork2"); return 1; }

    if (pid2 == 0) {
        /* 子2: stdin を fd[0] にリダイレクト */
        dup2(pipefd[0], STDIN_FILENO);
        close(pipefd[1]);  /* 書き込み端は不要（EOFを送るために必ず閉じる） */
        close(pipefd[0]);

        char *argv[] = {"grep", ".c", NULL};
        execvp("grep", argv);
        perror("execvp grep");
        exit(1);
    }

    /* ─── 親: 両端を閉じて子の終了を待つ ─── */
    close(pipefd[0]);
    close(pipefd[1]);

    int status;
    waitpid(pid1, &status, 0);
    printf("ls 終了コード: %d\n", WEXITSTATUS(status));
    waitpid(pid2, &status, 0);
    printf("grep 終了コード: %d\n", WEXITSTATUS(status));

    return 0;
}
```

```python title="subprocess.Popen・os.fork・os.pipe の使用例（Python）"
import os
import subprocess
import sys

# ─── subprocess.Popen でパイプライン（推奨）────────────────────────────────────
def popen_pipeline():
    print("=== subprocess.Popen パイプライン ===")
    # ls -la | grep .py
    p1 = subprocess.Popen(["ls", "-la"], stdout=subprocess.PIPE)
    p2 = subprocess.Popen(["grep", ".py"],
                          stdin=p1.stdout,
                          stdout=subprocess.PIPE)
    p1.stdout.close()  # p2 が p1 の stdout を引き継いだので親では閉じる
    output, _ = p2.communicate()
    p1.wait()
    print(output.decode())

# ─── os.fork + os.pipe（POSIXの直接実装）────────────────────────────────────
def fork_pipe_demo():
    print("=== os.fork + os.pipe デモ ===")
    r_fd, w_fd = os.pipe()

    pid = os.fork()
    if pid == 0:
        # 子プロセス: パイプに書き込む
        os.close(r_fd)
        msg = b"Hello from child process!\n"
        os.write(w_fd, msg)
        os.close(w_fd)
        os._exit(0)
    else:
        # 親プロセス: パイプから読み取る
        os.close(w_fd)
        data = os.read(r_fd, 1024)
        os.close(r_fd)
        _, status = os.waitpid(pid, 0)
        print(f"子からのメッセージ: {data.decode().rstrip()}")
        print(f"子の終了コード: {os.WEXITSTATUS(status)}")

# ─── subprocess.run で簡単な実行 ──────────────────────────────────────────────
def simple_run():
    print("\n=== subprocess.run ===")
    result = subprocess.run(
        ["uname", "-a"],
        capture_output=True,
        text=True
    )
    print(f"stdout: {result.stdout.rstrip()}")
    print(f"returncode: {result.returncode}")


popen_pipeline()
simple_run()

# fork はメインプロセスのみで実行（マルチスレッド環境での fork は非推奨）
if sys.platform != "win32":
    fork_pipe_demo()
```

## 使用場面

- **シェル実装**: BashやZshはコマンド実行のたびに`fork+execvp+waitpid`を行い、パイプは`pipe+dup2`で連結する
- **デーモンプロセス（double fork）**: `fork()`を2回行いセッションリーダーから切り離し、制御端末を持たないデーモンを作成する
- **並列処理**: `fork`による並列ワーカーはCPUバウンドな処理でGILを回避できる（Python multiprocessingの基盤）
- **テストランナー**: pytestやJestは各テストをサブプロセスで実行し、クラッシュがランナー本体に影響しないよう分離する

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
