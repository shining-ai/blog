import AffiliateBanner from '@site/src/components/AffiliateBanner';

# メモリフォレンジクス（Volatility）

## メモリフォレンジクスとは

> メモリフォレンジクスとは、コンピュータの RAM（揮発性メモリ）のダンプを取得・解析することで、実行中プロセス・ネットワーク接続・暗号化キー・マルウェアのメモリ内コードなど、ディスクには存在しない証拠を発見する手法である。

マルウェアの中には「ファイルレスマルウェア（Fileless Malware）」と呼ばれる種類があり、ディスクに実行ファイルを書かずにメモリ上だけで動作するため、通常のアンチウイルスやディスクフォレンジクスでは検出が困難である。メモリフォレンジクスはこのような高度な脅威の唯一の証拠源となることがある。

**メモリダンプに含まれる情報：**
- 実行中（および最近終了した）プロセスとその引数
- 開いているファイル・レジストリハンドル
- ネットワーク接続とソケット情報
- プロセスのメモリ空間（注入されたシェルコードを含む）
- キャッシュされた認証情報（パスワードハッシュ・TLS セッションキー）
- クリップボードの内容・ブラウザのセッション

**Volatility** は Python で書かれたオープンソースのメモリフォレンジクスフレームワークであり、Windows・Linux・macOS のメモリダンプを解析できる。プラグインを追加することで機能を拡張できる。

## メモリダンプの取得ツールと Volatility プラグイン

| 用途 | ツール / プラグイン | 説明 |
|------|-------------------|------|
| **ダンプ取得 (Linux)** | LiME (Loadable Kernel Module) | カーネルモジュールとしてロードして取得 |
| **ダンプ取得 (Windows)** | WinPmem・DumpIt | 管理者権限で実行してダンプを保存 |
| **ダンプ取得 (クラウド VM)** | AWS / Azure のスナップショット API | 実行中 VM のメモリを安全に取得 |
| **プロセス一覧** | `windows.pslist` / `windows.pstree` | 実行中プロセスを列挙 |
| **プロセス隠蔽検出** | `windows.psscan` | EPROCESS 構造体を直接スキャン（ルートキット対策） |
| **ネットワーク接続** | `windows.netstat` | アクティブな TCP/UDP 接続を表示 |
| **DLL インジェクション検出** | `windows.malfind` | RWX なメモリ領域を探し注入コードを検出 |
| **コマンド履歴** | `windows.cmdline` / `windows.cmdscan` | 各プロセスのコマンドライン引数 |
| **ハイブ抽出** | `windows.registry.hivelist` | レジストリハイブのメモリアドレスを表示 |

```python
# Volatility 3 を使ったメモリフォレンジクスの基本操作（コマンド例とPython API）
import subprocess
import json
import shutil
from pathlib import Path

VOLATILITY_CMD = "vol"  # Volatility 3: python3 vol.py または pip install volatility3

def run_volatility(dump_path: str, plugin: str, extra_args: list[str] | None = None) -> str:
    """
    Volatility プラグインを実行して出力を返す。
    Volatility 3 がインストールされている環境が必要。
    """
    if not shutil.which(VOLATILITY_CMD) and not shutil.which("vol3"):
        return "Volatility がインストールされていません"

    cmd = [VOLATILITY_CMD, "-f", dump_path, plugin]
    if extra_args:
        cmd.extend(extra_args)

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        return result.stdout or result.stderr
    except subprocess.TimeoutExpired:
        return "タイムアウト"
    except FileNotFoundError:
        return "Volatility が見つかりません"


def analyze_memory_dump(dump_path: str) -> None:
    """
    メモリダンプの基本解析フローを実行する。
    各プラグインの出力を確認して不審な点を特定する。
    """
    print(f"=== メモリフォレンジクス解析: {Path(dump_path).name} ===\n")

    plugins_to_run = [
        ("windows.info",      "OS 情報とビルド番号の確認"),
        ("windows.pslist",    "実行中プロセスの一覧"),
        ("windows.psscan",    "EPROCESS スキャン（隠蔽プロセス検出）"),
        ("windows.netstat",   "ネットワーク接続の一覧"),
        ("windows.malfind",   "不審な RWX メモリ領域の検出"),
        ("windows.cmdline",   "各プロセスのコマンドライン引数"),
        ("windows.dlllist",   "ロードされた DLL の一覧"),
    ]

    for plugin, description in plugins_to_run:
        print(f"[{plugin}] {description}")
        # 実際の解析では以下のコメントを外して実行する
        # output = run_volatility(dump_path, plugin)
        # print(output[:500])  # 出力の最初の500文字
        print(f"  $ vol -f {dump_path} {plugin}\n")


# Volatility 3 のコマンド例集
print("=== Volatility 3 基本コマンド集 ===\n")

commands = {
    "OS 情報の確認": "vol -f memory.dmp windows.info",
    "プロセス一覧（ツリー表示）": "vol -f memory.dmp windows.pstree",
    "隠蔽プロセスの検出": "vol -f memory.dmp windows.psscan",
    "ネットワーク接続": "vol -f memory.dmp windows.netstat",
    "コードインジェクション検出": "vol -f memory.dmp windows.malfind",
    "プロセスのメモリをダンプ": "vol -f memory.dmp windows.memdump --pid 1234 --dump-dir ./output",
    "ハッシュダンプ（パスワード）": "vol -f memory.dmp windows.hashdump",
    "コマンド履歴": "vol -f memory.dmp windows.cmdline",
    "ファイルスキャン": "vol -f memory.dmp windows.filescan",
    "ファイルの抽出": "vol -f memory.dmp windows.dumpfiles --physaddr 0x... --dump-dir ./output",
    "レジストリキーの確認": "vol -f memory.dmp windows.registry.printkey --key \"SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run\"",
}

for desc, cmd in commands.items():
    print(f"  [{desc}]")
    print(f"    $ {cmd}\n")

print("=== ファイルレスマルウェア検出の手順 ===\n")
fileless_detection = [
    "1. windows.psscan で pslist にないプロセスを発見（ルートキットによる隠蔽）",
    "2. windows.malfind で RWX パーミッションの不審なメモリ領域を特定",
    "3. windows.memdump で不審プロセスのメモリを抽出",
    "4. 抽出したダンプを strings / YARA でシェルコード・IOC を検索",
    "5. windows.netstat で C2 サーバへの接続を特定してブロックリストに追加",
]
for step in fileless_detection:
    print(f"  {step}")
```

## 使用場面

- ファイルレスマルウェア・PowerShell ベース攻撃の証拠収集
- ランサムウェア感染時の暗号化キーのメモリ内残存確認
- インシデント後に侵害された認証情報の特定（hashdump 等）
- 仮想マシン（クラウド）のライブフォレンジクス（スナップショット取得）
- CTF の Forensics 問題でメモリダンプを解析する（学習目的）

## 参考文献

- [Volatility 3 - GitHub](https://github.com/volatilityfoundation/volatility3)
- [Volatility Foundation - Documentation](https://volatility3.readthedocs.io/)
- [LiME - Linux Memory Extractor](https://github.com/504ensicsLabs/LiME)
- [The Art of Memory Forensics (Wiley)](https://www.memoryanalysis.net/)

<AffiliateBanner site="security_navi" />
