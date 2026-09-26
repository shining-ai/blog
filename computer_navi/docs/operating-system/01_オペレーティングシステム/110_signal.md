---
sidebar_position: 11
displayed_sidebar: operatingSystemSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# シグナルと例外処理 (Signals & Exception Handling)

## シグナルとは

シグナルとは、

> OS がプロセスに非同期イベントを通知するためのソフトウェア割り込み機構

です。
<br/>

シグナルはカーネル・他プロセス・プロセス自身のいずれからも送信でき、プロセスはシグナルを「無視」「デフォルト動作」「ハンドラで捕捉」の3通りで処理できます。
ただし SIGKILL と SIGSTOP は捕捉・無視できません。

## 主要シグナル一覧

| シグナル | 番号 | デフォルト動作 | 説明 |
| --- | --- | --- | --- |
| `SIGTERM` | 15 | プロセス終了 | 終了要求（グレースフルシャットダウンに使用） |
| `SIGKILL` | 9 | プロセス強制終了 | 捕捉・無視・ブロック不可 |
| `SIGINT` | 2 | プロセス終了 | Ctrl+C による割り込み |
| `SIGSEGV` | 11 | コアダンプ+終了 | 不正メモリアクセス（セグメンテーション違反） |
| `SIGALRM` | 14 | プロセス終了 | `alarm()` タイマーの満了 |
| `SIGCHLD` | 17 | 無視 | 子プロセスの状態変化（終了・停止） |
| `SIGUSR1` | 10 | プロセス終了 | ユーザ定義シグナル 1 |
| `SIGUSR2` | 12 | プロセス終了 | ユーザ定義シグナル 2 |

## シグナルハンドラの登録: sigaction vs signal

| 関数 | 推奨度 | 特徴 |
| --- | --- | --- |
| `signal()` | 非推奨 | シンプルだが移植性の問題あり、自動リセットされる実装も存在 |
| `sigaction()` | 推奨 | `sa_flags` で詳細制御可能、POSIX 標準、動作が一貫 |

主要な `sa_flags`:

| フラグ | 効果 |
| --- | --- |
| `SA_RESTART` | シグナルで中断されたシステムコールを自動再開 |
| `SA_SIGINFO` | ハンドラに `siginfo_t`（送信元PID・理由）を渡す |
| `SA_NODEFER` | ハンドラ実行中に同じシグナルをブロックしない |

## シグナルマスクと async-signal-safe

`sigprocmask()` でシグナルの配送を一時的にブロックできます（クリティカルセクションの保護）。

シグナルハンドラ内で呼び出してよい関数は **async-signal-safe** な関数に限られます。

- 呼び出し可能: `write`, `_exit`, `sigprocmask`, `kill`, `sem_post`
- 呼び出し禁止: `malloc`, `printf`, `exit`, `pthread_mutex_lock`（デッドロックの危険）

## 実装

```c title="SIGINT と SIGTERM のグレースフルシャットダウン（C）"
#include <stdio.h>
#include <stdlib.h>
#include <signal.h>
#include <string.h>
#include <unistd.h>
#include <errno.h>

/* volatile sig_atomic_t: シグナルハンドラから安全にアクセスできる型 */
static volatile sig_atomic_t g_running = 1;
static volatile sig_atomic_t g_reload  = 0;

/* async-signal-safe: write() のみ使用 */
static void handle_shutdown(int signo) {
    const char *msg;
    if (signo == SIGTERM) {
        msg = "\n[ハンドラ] SIGTERM 受信 - シャットダウン開始\n";
    } else {
        msg = "\n[ハンドラ] SIGINT 受信 - シャットダウン開始\n";
    }
    write(STDERR_FILENO, msg, strlen(msg));
    g_running = 0;
}

static void handle_reload(int signo) {
    (void)signo;
    const char *msg = "[ハンドラ] SIGUSR1 受信 - 設定リロード\n";
    write(STDERR_FILENO, msg, strlen(msg));
    g_reload = 1;
}

static void setup_signals(void) {
    struct sigaction sa;
    memset(&sa, 0, sizeof(sa));

    /* SIGINT / SIGTERM: グレースフルシャットダウン */
    sa.sa_handler = handle_shutdown;
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = SA_RESTART;  /* システムコールを自動再開 */

    if (sigaction(SIGINT,  &sa, NULL) < 0) { perror("sigaction SIGINT");  exit(1); }
    if (sigaction(SIGTERM, &sa, NULL) < 0) { perror("sigaction SIGTERM"); exit(1); }

    /* SIGUSR1: 設定リロード */
    sa.sa_handler = handle_reload;
    if (sigaction(SIGUSR1, &sa, NULL) < 0) { perror("sigaction SIGUSR1"); exit(1); }

    /* SIGCHLD: ゾンビ防止（子プロセスの自動回収） */
    sa.sa_handler = SIG_DFL;
    sa.sa_flags   = SA_RESTART | SA_NOCLDWAIT;
    if (sigaction(SIGCHLD, &sa, NULL) < 0) { perror("sigaction SIGCHLD"); exit(1); }
}

int main(void) {
    setup_signals();
    printf("デーモン起動 (PID=%d) - Ctrl+C または kill %d で終了\n",
           getpid(), getpid());

    int tick = 0;
    while (g_running) {
        if (g_reload) {
            printf("[メイン] 設定リロード実行中...\n");
            g_reload = 0;
        }
        printf("[メイン] tick=%d\n", tick++);
        sleep(1);
    }

    /* クリーンアップ処理（グレースフルシャットダウン） */
    printf("[メイン] クリーンアップ完了 - 終了します\n");
    return 0;
}
```

```python title="signal.signal() でSIGINT/SIGTERMをハンドル（Python）"
import signal
import sys
import time
import os

# --- グレースフルシャットダウン（Dockerコンテナの終了処理） ---
class GracefulShutdown:
    """
    Docker の SIGTERM → 10秒後 SIGKILL に対応したシャットダウン処理。
    コンテナは通常 ENTRYPOINT のプロセスが PID 1 として動く。
    """

    def __init__(self):
        self.running = True
        self._setup_handlers()

    def _setup_handlers(self):
        signal.signal(signal.SIGTERM, self._on_sigterm)
        signal.signal(signal.SIGINT,  self._on_sigint)
        # SIGUSR1: 設定リロード
        if hasattr(signal, 'SIGUSR1'):
            signal.signal(signal.SIGUSR1, self._on_reload)

    def _on_sigterm(self, signum, frame):
        print(f"\n[シグナル] SIGTERM({signum}) 受信 - グレースフルシャットダウン開始")
        self.running = False

    def _on_sigint(self, signum, frame):
        print(f"\n[シグナル] SIGINT({signum}) 受信 (Ctrl+C)")
        self.running = False

    def _on_reload(self, signum, frame):
        print(f"[シグナル] SIGUSR1({signum}) 受信 - 設定リロード")

    def run(self):
        print(f"サービス起動 (PID={os.getpid()})")
        print("終了: Ctrl+C または kill -SIGTERM " + str(os.getpid()))

        tick = 0
        while self.running:
            print(f"[メイン] 処理中... tick={tick}")
            tick += 1
            # signal.pause() の代わりに time.sleep() で割り込みを受けられる
            try:
                time.sleep(1)
            except InterruptedError:
                pass  # SA_RESTART 相当

        # クリーンアップ（DB 切断・一時ファイル削除など）
        print("[メイン] クリーンアップ中...")
        time.sleep(0.5)  # 後処理を模擬
        print("[メイン] 終了完了")
        sys.exit(0)


# --- SIGALRM を使ったタイムアウト実装 ---
class Timeout:
    """関数の実行に制限時間を設けるコンテキストマネージャ"""

    def __init__(self, seconds: int, message: str = "タイムアウト"):
        self.seconds = seconds
        self.message = message

    def _handler(self, signum, frame):
        raise TimeoutError(self.message)

    def __enter__(self):
        signal.signal(signal.SIGALRM, self._handler)
        signal.alarm(self.seconds)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        signal.alarm(0)  # アラームをキャンセル
        return False


# 使用例
if __name__ == '__main__':
    # タイムアウト例
    try:
        with Timeout(seconds=2, message="処理が2秒を超えました"):
            print("重い処理を開始...")
            time.sleep(5)  # 2秒でタイムアウト
    except TimeoutError as e:
        print(f"[タイムアウト] {e}")

    # グレースフルシャットダウン
    service = GracefulShutdown()
    service.run()
```

## 使用場面

- **デーモンのグレースフルシャットダウン**: SIGTERM でリクエスト処理を完了してから終了（nginx, systemd サービス）
- **タイムアウト実装**: `SIGALRM` + `alarm()` で関数実行に制限時間を設定
- **watchdog**: SIGUSR1/SIGUSR2 でプロセスに設定リロードや状態ダンプを要求
- **Dockerコンテナ**: PID 1 プロセスが SIGTERM を正しくハンドルしないとゾンビが残る
- **デバッガ**: ptrace + SIGTRAP でブレークポイントを実装

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
