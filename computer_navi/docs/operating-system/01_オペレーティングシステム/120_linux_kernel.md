---
sidebar_position: 12
displayed_sidebar: operatingSystemSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Linux カーネルの概要 (Linux Kernel Overview)

## Linuxカーネルとは

Linuxカーネルとは、

> Linus Torvaldsが1991年に開発を始めたモノリシック型OSカーネルで、現在もっとも広く使われているOSの中核

です。<br/>

1991年にLinus Torvaldsが"386用の無料OS"としてメーリングリストに投稿したことが起源です。現在はAndroidスマートフォン・クラウドサーバ・スーパーコンピュータ・組み込み機器の大多数で動作しており、GitHubで数千人の開発者が継続的にコントリビュートしています。

## カーネルアーキテクチャの比較

| アーキテクチャ | 代表的OS | 特徴 | 長所 | 短所 |
| --- | --- | --- | --- | --- |
| モノリシック | Linux・FreeBSD | カーネル全機能が同一アドレス空間 | 高速・コンテキストスイッチが少ない | 一部バグが全体に影響 |
| マイクロカーネル | Minix・GNU Hurd・QNX | 最小機能のみカーネル・他はサーバプロセス | 安定性・分離性が高い | IPC通信オーバーヘッドが大きい |
| ハイブリッドカーネル | Windows NT・macOS XNU | モノリシックとマイクロカーネルの中間 | バランスが良い | 設計が複雑 |

## Linuxカーネルの主要サブシステム

| サブシステム | ソースディレクトリ | 概要 |
| --- | --- | --- |
| プロセス管理・スケジューラ | `kernel/sched/` | CFSスケジューラ・プロセス生成・シグナル |
| メモリ管理 | `mm/` | バディシステム・スラブ・OOM killer・mmap |
| VFS（仮想ファイルシステム） | `fs/` | ext4/XFS/FAT32等のドライバ統合 |
| ネットワークスタック | `net/` | TCP/IP・Netfilter・ソケット |
| デバイスドライバ | `drivers/` | ブロック・キャラクタ・ネットワーク・GPU |
| セキュリティ | `security/` | LSM・SELinux・AppArmor・Landlock |

## カーネルバージョン体系

```
バージョン番号: major.minor.patch-localver

例: 6.6.30-lts
    ↑ major=6（メジャー）
      ↑ minor=6（機能追加）
          ↑ patch=30（バグ修正のみ）

LTS（Long Term Support）リリース:
  5.4  : 2019年〜2025年末
  5.10 : 2020年〜2026年末
  5.15 : 2021年〜2026年末
  6.1  : 2022年〜2026年末
  6.6  : 2023年〜2026年末

stable: 最新安定版（現在は 6.x 系）
rc    : リリース候補版（6.x-rc1〜rc8）
```

## コンテナ関連機能

### 名前空間（Namespaces）

| 名前空間 | 分離するリソース | 用途 |
| --- | --- | --- |
| PID namespace | プロセスID | コンテナ内で PID 1 からのプロセスツリー |
| Network namespace | NIC・ルーティング・ポート | コンテナごとの独立したネットワーク |
| Mount namespace | ファイルシステムマウント | コンテナのルートファイルシステム分離 |
| UTS namespace | ホスト名・ドメイン名 | コンテナごとの独立したホスト名 |
| IPC namespace | System V IPC・POSIX MQ | IPC リソースの分離 |
| User namespace | UID/GID マッピング | コンテナ内 root を非特権ホスト UID にマップ |

### cgroups v2

```
cgroups v2（Control Groups v2）の階層例:

  /sys/fs/cgroup/
    ├─ system.slice/
    │   └─ sshd.service/
    │       ├─ memory.max    ← メモリ上限
    │       ├─ cpu.max       ← CPU帯域（例: 50000 100000 = 50%）
    │       └─ pids.max      ← プロセス数上限
    └─ docker/
        └─ <container-id>/
            ├─ memory.current
            └─ cpu.stat
```

## 実装

```c title="最小限のLinuxカーネルモジュール（hello_module.c）"
/* hello_module.c - 最小限のカーネルモジュール
 *
 * ビルド:
 *   obj-m += hello_module.o
 *   make -C /lib/modules/$(uname -r)/build M=$(pwd) modules
 *
 * 操作:
 *   sudo insmod hello_module.ko   # ロード
 *   sudo rmmod  hello_module      # アンロード
 *   dmesg | tail                  # カーネルログ確認
 */

#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/init.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Demo");
MODULE_DESCRIPTION("Hello World kernel module");
MODULE_VERSION("1.0");

static int __init hello_init(void)
{
    printk(KERN_INFO "hello_module: ロード完了 - カーネル %s\n",
           utsname()->release);
    return 0;  /* 0 以外を返すとロード失敗 */
}

static void __exit hello_exit(void)
{
    printk(KERN_INFO "hello_module: アンロード完了\n");
}

module_init(hello_init);
module_exit(hello_exit);
```

```python title="/proc・/sys 仮想FSからカーネル情報を取得（Python）"
import pathlib
import os

def read_proc_cpuinfo() -> None:
    """CPU情報を /proc/cpuinfo から取得"""
    p = pathlib.Path("/proc/cpuinfo")
    if not p.exists():
        print("  /proc/cpuinfo が見つかりません（Linux専用）")
        return

    info = {}
    with p.open() as f:
        for line in f:
            if "model name" in line and "model name" not in info:
                info["CPU"] = line.split(":", 1)[1].strip()
            if "cpu cores" in line and "cpu cores" not in info:
                info["コア数"] = line.split(":", 1)[1].strip()

    for k, v in info.items():
        print(f"  {k}: {v}")


def read_proc_meminfo() -> None:
    """メモリ情報を /proc/meminfo から取得"""
    p = pathlib.Path("/proc/meminfo")
    if not p.exists():
        return

    with p.open() as f:
        for line in f:
            if any(line.startswith(k) for k in
                   ("MemTotal", "MemFree", "MemAvailable", "SwapTotal")):
                key, val = line.split(":", 1)
                kb = int(val.strip().split()[0])
                print(f"  {key:15}: {kb // 1024:>8} MB")


def read_sysfs_kernel() -> None:
    """/sys/kernel/ からカーネル情報を取得"""
    base = pathlib.Path("/sys/kernel")
    if not base.exists():
        print("  /sys/kernel が見つかりません（Linux専用）")
        return

    interesting = ["ostype", "osrelease", "hostname"]
    proc_base = pathlib.Path("/proc/sys/kernel")
    for name in interesting:
        p = proc_base / name
        if p.exists():
            print(f"  {name:15}: {p.read_text().strip()}")


def read_kernel_version() -> None:
    """カーネルバージョンの確認"""
    try:
        uname = os.uname()
        print(f"  システム名: {uname.sysname}")
        print(f"  ホスト名  : {uname.nodename}")
        print(f"  リリース  : {uname.release}")
        print(f"  バージョン: {uname.version[:60]}...")
        print(f"  マシン    : {uname.machine}")
    except AttributeError:
        import platform
        print(f"  カーネル  : {platform.uname().release}")


print("=== CPU情報 ===")
read_proc_cpuinfo()
print("\n=== メモリ情報 ===")
read_proc_meminfo()
print("\n=== カーネルバージョン ===")
read_kernel_version()
print("\n=== sysfs カーネル情報 ===")
read_sysfs_kernel()
```

## 使用場面

- **コンテナ（Docker/Kubernetes）**: 名前空間・cgroups・Netfilterの組み合わせでコンテナ隔離を実現。Linuxカーネルの機能なしにコンテナは動かない
- **Androidカーネル**: Android 12以降はLinuxカーネル6.xをベース。ドライバ互換性のためGKI（Generic Kernel Image）が標準化された
- **組み込みLinux（Yocto/Buildroot）**: IoT機器・産業用コントローラでYoctoやBuildrootでカスタムカーネルを構築
- **セキュリティ（LSM/SELinux/AppArmor）**: LSM（Linux Security Modules）フレームワーク上にSELinux・AppArmor・BPF-LSMが実装される

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
