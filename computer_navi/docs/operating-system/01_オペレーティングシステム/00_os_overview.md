---
sidebar_position: 0
displayed_sidebar: operatingSystemSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# OS の概要 (OS Overview)

## OS とは

OS（オペレーティングシステム）とは、

> ハードウェアリソース（CPU・メモリ・I/O）を管理し、アプリケーションに統一されたインタフェースを提供するシステムソフトウェア

です。
<br/>

OS は「リソース管理者」と「仮想マシン」の2つの役割を担います。
アプリケーションはシステムコールを通じて OS のサービスを利用します。

## OS の主要機能


| 機能 | 説明 |
| --- | --- |
| プロセス管理 | 生成・スケジューリング・終了・IPC |
| メモリ管理 | 仮想アドレス空間・ページング・スワップ |
| ファイルシステム | ディレクトリ・権限・ブロックデバイス |
| I/O 管理 | デバイスドライバ・バッファリング |
| ネットワーク | TCP/IP スタック・ソケット |
| セキュリティ | 権限管理・名前空間・capabilities |

## カーネルとユーザ空間

```
ユーザ空間                カーネル空間
  アプリケーション           プロセス管理
      ↓ システムコール →     メモリ管理
  標準ライブラリ(glibc)      ファイルシステム
                              デバイスドライバ
                                ↓
                            ハードウェア
```

## 実装

```c title="fork/execve によるプロセス生成（C）"
#include <stdio.h>
#include <unistd.h>
#include <sys/wait.h>
#include <errno.h>
#include <string.h>

int main(void) {
    pid_t pid = fork();
    if (pid < 0) {
        perror("fork");
        return 1;
    }

    if (pid == 0) {
        /* 子プロセス */
        char *const args[] = {"ls", "-la", NULL};
        execvp("ls", args);
        /* execvp が成功したらここに到達しない */
        fprintf(stderr, "execvp failed: %s\n", strerror(errno));
        return 1;
    }

    /* 親プロセス */
    int status;
    waitpid(pid, &status, 0);
    if (WIFEXITED(status))
        printf("子プロセス終了コード: %d\n", WEXITSTATUS(status));
    return 0;
}
```

```python title="プロセス一覧と情報取得（Python）"
import os
import subprocess

# 現在のプロセス情報
print(f"PID:  {os.getpid()}")
print(f"PPID: {os.getppid()}")
print(f"UID:  {os.getuid()}")

# サブプロセス実行
result = subprocess.run(
    ["uname", "-r"],
    capture_output=True,
    text=True
)
print(f"カーネルバージョン: {result.stdout.strip()}")

# /proc 経由でプロセス一覧（Linux）
try:
    pids = [int(p) for p in os.listdir('/proc') if p.isdigit()]
    print(f"実行中プロセス数: {len(pids)}")
except PermissionError:
    pass
```

## 使用場面

- **コンテナ**: namespaces + cgroups による OS レベル仮想化
- **セキュリティ**: seccomp でシステムコールをフィルタリング
- **デバッグ**: strace でシステムコールトレース
- **パフォーマンス**: perf でカーネルイベント計測

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
