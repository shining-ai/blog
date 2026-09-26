import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Return-Oriented Programming（ROP）の概念と防御

## ROP とは

> Return-Oriented Programming（ROP）とは、プログラム中にすでに存在するコード断片（ガジェット）を連鎖させることで、NX ビットや DEP によって新たなコードの実行が禁止されていても任意の処理を実行する攻撃技術の概念である。

スタックバッファオーバーフローへの対策として **NX ビット（Non-eXecutable bit）/ DEP（Data Execution Prevention）** が導入され、スタックやヒープに注入したシェルコードを直接実行することができなくなった。しかし ROP はこれを迂回する。

**ROP の仕組み（概念的な説明）：**
プログラムの実行ファイルや共有ライブラリ（libc 等）には、`ret` 命令で終わる短いコード断片（ガジェット）が無数に存在する。例：
- `pop rdi; ret` — rdi レジスタに値をセット
- `pop rsi; pop r15; ret` — rsi・r15 に値をセット
- `syscall; ret` — システムコールを呼び出す

これらを **スタック上に並べたリターンアドレスの連鎖** として実行することで、チューリング完全な処理（シェルの起動・ファイル読み取りなど）が実現できてしまう。ROP は「コードを注入しない」ため NX では防げない。

**ROP が使われるシナリオ：**
1. BOF でスタック上のリターンアドレスを書き換える
2. スタックに「ガジェットアドレスの配列」を積む
3. 関数が `ret` するたびに次のガジェットが呼び出される

## ROP 攻撃と防御機構の対応

| 攻撃技術 | 説明 | 対抗する防御機構 |
|---------|------|---------------|
| ret2libc | libc の `system()` 関数にジャンプ | ASLR でアドレスをランダム化 |
| ROP チェーン | ガジェットを連鎖させて任意処理 | CFI（制御フロー整合性） |
| JIT スプレー | JIT コンパイラの出力コードをガジェットとして利用 | ASLR・コード署名 |
| ret2plt | PLT 経由で関数を呼び出す | PIE・ASLR |
| Stack Pivot | rsp を攻撃者制御領域に移動 | Shadow Stack（Intel CET） |

```python
# ROP 防御機構の解説と確認ツール（教育・防御目的）
import subprocess
import shutil

def check_binary_protections(binary_path: str) -> dict:
    """
    バイナリの各種セキュリティ保護機構を確認する。
    checksec ツールまたは readelf を使って保護状態を把握する。
    """
    results = {
        "binary": binary_path,
        "nx": False,       # NX: スタック実行禁止
        "pie": False,      # PIE: 位置独立実行ファイル（ASLR 有効化に必要）
        "canary": False,   # Stack Canary: スタック破壊検出
        "relro": "None",   # RELRO: GOT 書き換え防止
    }

    # checksec ツールが利用可能な場合
    if shutil.which("checksec"):
        result = subprocess.run(
            ["checksec", "--file", binary_path, "--output", "json"],
            capture_output=True, text=True
        )
        print(f"checksec 出力: {result.stdout}")
        return results

    # readelf でプログラムヘッダを確認（NX の確認）
    if shutil.which("readelf"):
        result = subprocess.run(
            ["readelf", "-l", binary_path],
            capture_output=True, text=True
        )
        if "GNU_STACK" in result.stdout:
            # GNU_STACK の RWE フラグを確認
            # RW  → NX 有効（実行不可）
            # RWE → NX 無効（実行可能、危険）
            results["nx"] = "RWE" not in result.stdout

    return results


# === Intel CET (Control-flow Enforcement Technology) の解説 ===
cet_features = {
    "Shadow Stack (SHSTK)": {
        "仕組み": "通常のスタックとは別に Shadow Stack を保持し、ret 時にリターンアドレスを照合",
        "対抗": "ROP・stack pivot・戻り先の改ざん全般",
        "サポート": "Linux Kernel 5.7+, glibc 2.28+, Intel Tiger Lake以降",
    },
    "Indirect Branch Tracking (IBT)": {
        "仕組": "間接 jmp/call の着地点に ENDBR64 命令を必須化",
        "対抗": "JOP (Jump-Oriented Programming)",
        "サポート": "Linux Kernel 5.7+, GCC -fcf-protection=full",
    },
}

print("=== ROP への対抗技術 ===\n")
for feature, info in cet_features.items():
    print(f"[{feature}]")
    for key, val in info.items():
        print(f"  {key}: {val}")
    print()

# GCC でのコンパイル時に有効化するオプション
print("=== コンパイル時の ROP 対策オプション（GCC/Clang）===")
compile_options = [
    ("-fcf-protection=full",    "Intel CET の IBT + Shadow Stack を有効化"),
    ("-fstack-protector-strong", "スタックカナリアで BOF を検出（ROP の入り口を防ぐ）"),
    ("-pie -fPIE",              "PIE 有効化で ASLR によるアドレスランダム化"),
    ("-Wl,-z,now -Wl,-z,relro", "GOT を読み取り専用にして関数ポインタ改ざんを防ぐ"),
]
for opt, desc in compile_options:
    print(f"  {opt:35s}  {desc}")
```

## 使用場面

- バイナリの `checksec` による保護状態確認と CI での自動チェック
- C/C++ プロジェクトのコンパイルオプション強化（CFI・CET の有効化）
- CTF の Pwn 問題で ROP チェーンの構造を学ぶ（教育目的）
- セキュアなバイナリ配布のためのビルドパイプライン整備
- Kernel の CET 対応状況の確認と有効化（サーバ設定）

## 参考文献

- [Hovav Shacham - The Geometry of Innocent Flesh on the Bone: Return-into-libc without Function Calls (2007)](https://hovav.net/ucsd/dist/geometry.pdf)
- [Intel - Control-flow Enforcement Technology Preview](https://www.intel.com/content/www/us/en/developer/articles/technical/technical-look-control-flow-enforcement-technology.html)
- [ROPgadget Tool](https://github.com/JonathanSalwan/ROPgadget)
- [CWE-693: Protection Mechanism Failure](https://cwe.mitre.org/data/definitions/693.html)

<AffiliateBanner site="security_navi" />
