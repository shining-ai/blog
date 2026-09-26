import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 動的解析とデバッガ（GDB・pwndbg）

## 動的解析とは

> 動的解析とは、プログラムを実際に実行しながらその挙動を観察する解析手法であり、デバッガを使ったレジスタ・メモリの観察やシステムコールのトレースにより、静的解析では判明しにくい実行時の動作・脆弱性の挙動を把握できる。

静的解析（バイナリを実行せずに読む）と動的解析（実際に動かして観察する）は相補的な関係にある。難読化・パッキングされたマルウェアや、条件分岐が複雑なバイナリは動的解析が有効である。

**GDB（GNU Debugger）** は Linux 標準のデバッガで、プログラムの一時停止（ブレークポイント）・レジスタ/メモリの確認・シングルステップ実行などを実現する。**pwndbg** は GDB のプラグインで、スタック・ヒープ・レジスタの状態をわかりやすく表示し、CTF や脆弱性研究に特化した機能を追加する。

**動的解析で観察できること：**
- 実行時の引数・環境変数・ファイル操作（`strace` / `ltrace`）
- メモリの状態：スタック・ヒープ・マップされた領域
- 各命令実行時のレジスタ値
- 関数の実際の呼び出し引数と戻り値
- BOF が発生する瞬間のメモリ破壊の状況

## GDB / pwndbg の主要コマンド

| コマンド | 短縮 | 説明 |
|---------|------|------|
| `run [args]` | `r` | プログラムを実行 |
| `break *0xaddr` / `break func` | `b` | ブレークポイントの設定 |
| `continue` | `c` | 次のブレークポイントまで続行 |
| `next` | `n` | 次の行へ（関数呼び出しはステップオーバー） |
| `step` | `s` | 次の命令へ（関数の中に入る） |
| `x/10gx $rsp` | | $rsp からの8バイト × 10 を16進で表示 |
| `info registers` | `i r` | 全レジスタの値を表示 |
| `disassemble func` | `disas` | 関数のアセンブリを表示 |
| `backtrace` | `bt` | コールスタックを表示 |
| `vmmap` | (pwndbg) | メモリマップを表示 |

```python
# GDB/pwndbg を使った動的解析のワークフロー（学習目的）
# 実際の操作は端末で GDB を起動して行う

gdb_workflow = """
=== GDB + pwndbg の基本的な使い方 ===

1. インストール
   # pwndbg のインストール
   git clone https://github.com/pwndbg/pwndbg.git
   cd pwndbg && ./setup.sh

2. 解析対象を GDB で起動
   $ gdb ./target_binary
   # または引数付きで
   $ gdb --args ./target_binary arg1 arg2

3. 基本的なデバッグセッション（pwndbg コマンド）
   pwndbg> checksec          # 保護機構の確認
   pwndbg> info functions    # 関数一覧
   pwndbg> break main        # main にブレークポイント
   pwndbg> run               # 実行開始
   pwndbg> context           # レジスタ・スタック・逆アセンブルを一括表示
   pwndbg> next              # 1行進む
   pwndbg> x/20gx $rsp       # スタックの内容を確認

4. 特定アドレスにブレークポイントを設定
   pwndbg> break *0x401234   # アドレスでブレーク
   pwndbg> continue
   pwndbg> info registers    # レジスタ確認
   pwndbg> x/s $rdi          # rdi が指す文字列を表示

5. ヒープの調査（pwndbg 専用）
   pwndbg> heap              # ヒープチャンクを一覧表示
   pwndbg> bins              # フリービンの状態を表示
   pwndbg> vis_heap_chunks   # ヒープをビジュアライズ

6. 実行中のメモリマップ確認
   pwndbg> vmmap             # セグメントの権限（r/w/x）を確認
   pwndbg> search -s "flag"  # メモリ内を文字列検索
"""

# strace / ltrace による動的解析
syscall_analysis = """
=== strace / ltrace によるシステムコール・ライブラリ呼び出しのトレース ===

# strace: システムコールをすべてトレース
$ strace ./target 2>&1 | head -50
  → open/read/write/execve などのシステムコールと引数が表示される

# 特定のシステムコールだけ表示
$ strace -e trace=network,file ./target
  → ネットワーク接続・ファイル操作のみトレース

# ltrace: 共有ライブラリの呼び出しをトレース
$ ltrace ./target 2>&1 | head -50
  → strcmp, malloc, fopen などの libc 呼び出しが表示される
  → 認証バイパスの調査（strcmp の引数にパスワードが表示される場合がある）

# より詳細なシステムコールの解析
$ strace -f -o strace.log ./target   # フォーク先も含めてファイルに保存
"""

print(gdb_workflow)
print(syscall_analysis)

# pwntools との連携（CTF・PoC 開発）
pwntools_example = """
=== pwntools: デバッグを自動化するフレームワーク（教育・PoC 目的）===

from pwn import *

# 対象バイナリを起動（GDB でアタッチ可能）
elf = ELF("./target")
p = process(elf.path)

# gdb.attach(p, gdbscript="break main\\ncontinue")  # GDB でアタッチ

# バイナリ情報の確認
print(elf.checksec())
print(f"main アドレス: {hex(elf.symbols['main'])}")

# 入出力操作
p.recvuntil(b"Input: ")
p.sendline(b"hello")
output = p.recvline()
print(output)
"""
print(pwntools_example)
```

## 使用場面

- マルウェアサンプルの動作確認（サンドボックス内での strace/ltrace 解析）
- 脆弱性の PoC 作成前に BOF の発生箇所をデバッガで特定（教育目的）
- CTF の Pwn 問題でスタック・ヒープの状態を確認しながら学習
- GDB で本番クラッシュのコアダンプを事後解析（`gdb binary core`）
- CI での AddressSanitizer との組み合わせによる脆弱性の特定

## 参考文献

- [GDB - Official Documentation](https://www.gnu.org/software/gdb/documentation/)
- [pwndbg - GitHub](https://github.com/pwndbg/pwndbg)
- [pwntools - Exploit Development Library](https://docs.pwntools.com/)
- [OpenSecurityTraining2 - Debuggers 1011](https://ost2.fyi/)

<AffiliateBanner site="security_navi" />
