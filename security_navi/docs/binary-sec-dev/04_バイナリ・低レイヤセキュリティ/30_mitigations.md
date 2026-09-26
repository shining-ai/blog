import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ASLR・PIE・Canary・NX の仕組み（防御機構の詳解）

## バイナリ防御機構とは

> ASLR・PIE・Stack Canary・NX は、バッファオーバーフローや ROP 攻撃を困難にするためにOS・コンパイラ・ハードウェアが提供する多層的な防御機構であり、これらを組み合わせることで攻撃の成功確率を大幅に低下させる。

各防御機構は単独では迂回される可能性があるが、組み合わせることで多層防御（Defense in Depth）が実現される。それぞれの仕組みと限界を理解することが、セキュアなバイナリの構築に不可欠である。

## 4つの防御機構の詳細

| 防御機構 | 提供主体 | 防御対象 | 限界・迂回方法 |
|---------|---------|---------|--------------|
| **NX ビット** | CPU + OS | シェルコードの直接実行 | ROP で迂回可能 |
| **ASLR** | OS カーネル | アドレスの推測 | 情報リーク脆弱性があれば迂回可能 |
| **PIE** | コンパイラ | 実行ファイル自身のベースアドレス固定 | ASLR がなければ無意味 |
| **Stack Canary** | コンパイラ | スタック上のリターンアドレス改ざん | カナリア値のリーク・フォーマット文字列攻撃 |

### NX ビット（No-eXecute）/ DEP

CPU の NX ビット（AMD: XD ビット、Intel: Execute Disable ビット）により、スタック・ヒープ・データ領域に「実行不可」属性を設定できる。OS はページテーブルにこの属性を設定し、実行しようとすると General Protection Fault が発生する。

### ASLR（Address Space Layout Randomization）

OS カーネルがプロセス起動時にスタック・ヒープ・共有ライブラリのベースアドレスをランダム化する。攻撃者がシェルコードや libc 関数のアドレスを固定値として使えなくなる。Linux では `/proc/sys/kernel/randomize_va_space` で制御できる（2 = 完全ランダム化）。

### PIE（Position Independent Executable）

実行ファイル本体（テキストセグメント・GOT・PLT）のロードアドレスをランダム化するために必要。PIE を有効にしないと、ASLR が有効でも実行ファイル自身の関数アドレスは固定のままになる。`-fPIE -pie` でコンパイルする。

### Stack Canary（スタックカナリア）

関数プロローグでスタック上のローカル変数とリターンアドレスの間にランダムな「カナリア値」を書き込む。関数エピローグで値が変化していた場合、`__stack_chk_fail` が呼び出されてプログラムを異常終了させる。

```python
# 各防御機構の有効化確認スクリプト（Linux）
import subprocess
import os
import re

def check_aslr() -> str:
    """ASLR の有効化レベルを確認する"""
    try:
        with open("/proc/sys/kernel/randomize_va_space") as f:
            level = int(f.read().strip())
        levels = {
            0: "無効（危険）",
            1: "部分的（スタック・共有ライブラリのみ）",
            2: "完全（スタック・ヒープ・共有ライブラリ・実行ファイル）",
        }
        return f"{level} - {levels.get(level, '不明')}"
    except FileNotFoundError:
        return "確認不可（非 Linux 環境）"


def check_nx(pid: int) -> bool:
    """
    実行中プロセスのスタックに NX が設定されているか確認する。
    /proc/PID/maps でスタック領域のパーミッションを確認。
    """
    try:
        with open(f"/proc/{pid}/maps") as f:
            for line in f:
                if "[stack]" in line:
                    # パーミッションフィールド: rwxp の 'x' があると実行可能（NX 無効）
                    perms = line.split()[1]
                    return "x" not in perms  # 'x' がない = NX 有効
    except (FileNotFoundError, PermissionError):
        pass
    return False


def check_canary_in_binary(binary_path: str) -> bool:
    """
    バイナリに __stack_chk_fail シンボルが存在するか確認する。
    存在すればカナリアが有効（-fstack-protector でコンパイルされている）。
    """
    try:
        result = subprocess.run(
            ["nm", binary_path],
            capture_output=True, text=True
        )
        return "__stack_chk_fail" in result.stdout
    except FileNotFoundError:
        return False


def check_pie(binary_path: str) -> bool:
    """
    バイナリが PIE 有効かを確認する。
    ELF ヘッダの Type が ET_DYN であれば PIE。
    """
    try:
        result = subprocess.run(
            ["file", binary_path],
            capture_output=True, text=True
        )
        return "pie executable" in result.stdout.lower() or \
               "shared object" in result.stdout.lower()
    except FileNotFoundError:
        return False


# 現在のシステム状態確認
print("=== バイナリ保護機構の確認 ===\n")
print(f"ASLR 設定: {check_aslr()}")
print(f"現在プロセス NX: {check_nx(os.getpid())}")

# コンパイラオプションのまとめ
print("\n=== セキュアなバイナリのビルドコマンド例（gcc）===")
gcc_command = """
gcc -O2                          \\
    -fstack-protector-strong     \\  # Stack Canary
    -D_FORTIFY_SOURCE=2          \\  # libc 関数の安全チェック
    -pie -fPIE                   \\  # PIE 有効化
    -Wl,-z,relro                 \\  # GOT を読み取り専用（Partial RELRO）
    -Wl,-z,now                   \\  # GOT を起動時に解決（Full RELRO）
    -Wl,-z,noexecstack           \\  # スタック実行禁止（NX）
    -fcf-protection=full         \\  # Intel CET
    -o secure_binary source.c
"""
print(gcc_command)

print("=== 各防御機構が防ぐ攻撃の対応表 ===")
attacks = {
    "シェルコード注入": ["NX ビット"],
    "リターンアドレス上書き": ["Stack Canary"],
    "ret2libc / ROP (固定アドレス)": ["ASLR", "PIE"],
    "GOT 上書き": ["Full RELRO"],
    "ROP (アドレスリーク後)": ["CFI / Intel CET"],
}
for attack, defenses in attacks.items():
    print(f"  {attack:35s} → {', '.join(defenses)}")
```

## 使用場面

- ビルドシステム（CMake・Makefile）への `-fstack-protector-strong` 等の一括適用
- CI パイプラインでの `checksec` による保護状態の自動検証
- OS の ASLR 設定確認（`/proc/sys/kernel/randomize_va_space` が 2 か確認）
- セキュリティ要件の高いシステム（金融・医療）での Full RELRO・PIE の強制
- CTF の Pwn 問題で各保護機構の有無を確認して攻略方針を立てる（学習目的）

## 参考文献

- [PaX - ASLR Patch for Linux](https://pax.grsecurity.net/docs/aslr.txt)
- [GCC - Stack Smashing Protection](https://gcc.gnu.org/onlinedocs/gcc/Instrumentation-Options.html)
- [Checksec - Binary Security Audit Tool](https://github.com/slimm609/checksec.sh)
- [Linux Kernel - ASLR Documentation](https://www.kernel.org/doc/html/latest/admin-guide/sysctl/kernel.html#randomize-va-space)

<AffiliateBanner site="security_navi" />
