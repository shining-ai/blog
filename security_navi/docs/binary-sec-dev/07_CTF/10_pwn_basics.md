import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 典型的な Pwn 問題の学び方（教育目的）

## Pwn カテゴリとは

> CTF の Pwn（バイナリエクスプロイテーション）カテゴリは、提供されたバイナリプログラムの脆弱性を見つけて利用し、リモートサーバ上で任意コード実行やシェル取得を目指す問題形式で、スタック BOF・フォーマット文字列・ヒープ脆弱性などを体系的に学べる。

Pwn 問題に取り組むことで、バッファオーバーフロー・メモリ管理・アセンブリ言語・デバッガの使い方・バイナリの保護機構（ASLR・NX・PIE・Canary）などを実際に手を動かしながら学べる。これらはセキュリティエンジニアがバイナリの脆弱性を評価し、防御機構を設計するための基礎知識となる。

**教育目的の注意点：**
学んだ技術は CTF のような許可された環境でのみ使用すること。ここで紹介するのはセキュリティ教育・防御設計のための理解を目的とした内容である。

**典型的な Pwn 問題の種類：**
1. **ret2win**：BOF でリターンアドレスを特定の関数（win()）のアドレスに書き換える
2. **ret2shellcode**：NX が無効なバイナリでスタックに注入したコードを実行する（古い問題）
3. **ret2libc**：libc の関数（system("/bin/sh")）のアドレスにジャンプする
4. **ROP チェーン**：ガジェットを連鎖させて任意の処理を実行する
5. **フォーマット文字列**：`%x` / `%n` でメモリリード・ライトを行う
6. **ヒープ Pwn**：tcache / fastbin の構造を悪用する

## Pwn 問題解法の一般的なフロー

| ステップ | 内容 | ツール |
|---------|------|--------|
| 1. 保護機構確認 | checksec でバイナリの保護状態を確認 | checksec |
| 2. 静的解析 | Ghidra でメイン関数・危険な関数を特定 | Ghidra・strings |
| 3. 動的解析 | GDB + pwndbg でオフセットとクラッシュを確認 | GDB + pwndbg |
| 4. エクスプロイト作成 | pwntools でペイロードを組み立てる | pwntools（Python） |
| 5. 検証 | ローカル → リモートの順でフラグ取得 | pwntools process/remote |

```python
# Pwn 入門: pwntools の基本的な使い方（教育目的）
# pip install pwntools で導入可能

from pwn import *

# ===================================================
# pwntools の基本的な機能の説明
# これは学習用のコード例であり、
# 実際の問題解法は自分が管理・許可されたシステムに対してのみ使用すること
# ===================================================


def demonstrate_pwntools_basics():
    """pwntools の基本 API の使い方を示す"""

    # バイナリ情報の読み込み
    # elf = ELF("./challenge")
    # print(f"アーキテクチャ: {elf.arch}")
    # print(f"main のアドレス: {hex(elf.symbols['main'])}")
    # print(elf.checksec())  # 保護機構の確認

    # パターン生成（オフセットの特定）
    # cyclic() は "aaabaaacaaadaaae..." のような非繰り返しパターンを生成する
    pattern = cyclic(100)
    print(f"パターン（100バイト）: {pattern[:30]}...")

    # オフセットの特定（クラッシュ時の rsp 値から計算）
    # GDB でクラッシュした後の rsp の値を調べ、cyclic_find() でオフセットを計算する
    # offset = cyclic_find(0x61616164)  # rsp の最初の4バイトを整数として渡す
    # print(f"オフセット: {offset}")

    # ペイロードの組み立て
    # offset = 72  # 実際のオフセット（問題によって異なる）
    # win_addr = 0x401196  # win() 関数のアドレス（Ghidra で確認）
    # payload = flat([b"A" * offset, win_addr])  # ペイロード = パディング + リターンアドレス

    # プロセスの起動と対話
    # p = process("./challenge")
    # p.sendlineafter(b"Input: ", payload)
    # p.interactive()  # シェルとのインタラクティブな対話

    # ROP チェーンの例
    # elf = ELF("./challenge")
    # rop = ROP(elf)
    # rop.call('system', [next(elf.search(b'/bin/sh\x00'))])
    # payload = flat([b"A" * offset, rop.chain()])

    print("pwntools の主要 API:")
    api_examples = {
        "ELF('./binary')": "バイナリのシンボル・セクション情報を読み込む",
        "ROP(elf)": "ROP ガジェットを検索してチェーンを構築する",
        "cyclic(n)": "n バイトの de Bruijn パターンを生成",
        "cyclic_find(value)": "クラッシュ時のレジスタ値からオフセットを特定",
        "flat([a, b, c])": "リストをフラットなバイト列に変換（アーキテクチャに応じてエンディアン処理）",
        "p64(addr)": "64ビットアドレスをリトルエンディアンのバイト列に変換",
        "u64(bytes)": "8バイトをリトルエンディアンで64ビット整数に変換",
        "process(binary)": "ローカルプロセスとして起動して通信",
        "remote(host, port)": "リモートサーバに接続して通信",
        "p.sendline(data)": "データを送信して改行を追加",
        "p.recvuntil(delim)": "指定のデリミタまで受信",
        "p.interactive()": "インタラクティブモードに切り替える",
    }
    for api, desc in api_examples.items():
        print(f"  {api:35s}  {desc}")


demonstrate_pwntools_basics()

# GDB + pwndbg でのオフセット特定の手順
print("\n=== GDB でのオフセット特定の手順 ===")
steps = [
    "1. $ gdb ./challenge",
    "2. pwndbg> cyclic 100  # パターンを生成",
    "3. pwndbg> run          # 実行して SIGSEGV を発生させる",
    "4. pwndbg> cyclic -l $rsp  # rsp から直接オフセットを計算",
    "   またはクラッシュ時の RSP の値を cyclic_find() に渡す",
    "5. オフセット確認後、Ghidra で win() / system() のアドレスを調べる",
    "6. pwntools でペイロードを組み立ててフラグを取得する",
]
for step in steps:
    print(f"  {step}")
```

## 使用場面

- pwn.college・picoCTF の Binary Exploitation 問題での学習
- セキュリティ研究者がバイナリの脆弱性原理を理解するための実習
- 社内セキュリティトレーニングでの BOF・ROP の体験学習
- Pwn 問題の作問（どのような脆弱性が学習効果が高いかを理解する）
- 本番コードのセキュアコーディングガイドライン策定の根拠理解

## 参考文献

- [pwn.college - Binary Exploitation](https://pwn.college/)
- [pwntools Documentation](https://docs.pwntools.com/)
- [LiveOverflow - Binary Exploitation YouTube Playlist](https://www.youtube.com/playlist?list=PLhixgUqwRTjxglIswKp9mpkfPNfHkzyeN)
- [picoCTF - Binary Exploitation Problems](https://picoctf.org/)

<AffiliateBanner site="security_navi" />
