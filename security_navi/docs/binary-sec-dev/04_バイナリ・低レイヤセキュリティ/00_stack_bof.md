import AffiliateBanner from '@site/src/components/AffiliateBanner';

# スタックバッファオーバーフロー（原理と防御機構の解説）

## スタックバッファオーバーフローとは

> スタックバッファオーバーフローとは、スタック上に確保されたバッファに対して境界チェックなしにデータを書き込むことで、隣接するメモリ領域（リターンアドレスや保存済みレジスタ）を上書きし、プログラムの実行フローを乗っ取る脆弱性である。

C/C++ では配列の境界チェックが自動的に行われない。スタック上に `char buf[64]` というバッファを確保し、`strcpy` や `gets` のような危険な関数で64バイトを超えるデータを書き込むと、バッファの後ろに存在する **保存済み rbp** や **リターンアドレス（rip）** を上書きできる。

関数が `ret` 命令を実行するとき、スタックからリターンアドレスをポップして `rip` に設定する。このリターンアドレスを攻撃者が制御できると、任意のアドレスにジャンプさせられ、シェルコード実行や ROP チェーンにつながる。

**スタックフレームの構造（x86-64）：**
```
高いアドレス
┌─────────────────┐
│ 呼び出し元の引数 │
├─────────────────┤
│ リターンアドレス │ ← 上書き対象
├─────────────────┤
│ 保存済み rbp    │
├─────────────────┤
│ ローカル変数    │
│  [buf: 64B]     │ ← 書き込み開始点
└─────────────────┘
低いアドレス
```

## 危険な関数と安全な代替

| 危険な関数 | 問題点 | 安全な代替 |
|-----------|--------|-----------|
| `gets(buf)` | 入力サイズを一切チェックしない | `fgets(buf, sizeof(buf), stdin)` |
| `strcpy(dst, src)` | dst のサイズをチェックしない | `strncpy` または `strlcpy` |
| `sprintf(buf, fmt, ...)` | 書き込みサイズを指定しない | `snprintf(buf, sizeof(buf), fmt, ...)` |
| `scanf("%s", buf)` | 入力長を制限しない | `scanf("%63s", buf)` でサイズ指定 |
| `strcat(dst, src)` | dst の残りサイズをチェックしない | `strncat` または `strlcat` |

```c
/* ===================================================
 * 教育目的: スタック BOF の脆弱なコードと安全なコードの比較
 * 攻撃コードは含まない
 * =================================================== */

#include <stdio.h>
#include <string.h>
#include <stdlib.h>

/* 【悪い例】gets() を使った脆弱な関数 */
void vulnerable_read(void) {
    char buf[64];
    /* gets() は削除済み関数（C11 で廃止）。入力サイズを一切チェックしない。
     * 64 バイトを超える入力でリターンアドレスを上書きできる。 */
    gets(buf);  /* WARNING: never use this */
    printf("入力: %s\n", buf);
}

/* 【良い例】fgets() を使った安全な関数 */
void safe_read(void) {
    char buf[64];
    /* fgets は最大 sizeof(buf)-1 バイトまでしか読み込まないため安全 */
    if (fgets(buf, sizeof(buf), stdin) == NULL) {
        return;
    }
    /* 末尾の改行を除去 */
    size_t len = strlen(buf);
    if (len > 0 && buf[len - 1] == '\n') {
        buf[len - 1] = '\0';
    }
    printf("入力: %s\n", buf);
}

/* 【悪い例】strcpy を使った脆弱な文字列コピー */
void vulnerable_copy(const char *src) {
    char dst[32];
    strcpy(dst, src);  /* src が 32 バイト以上なら BOF 発生 */
}

/* 【良い例】snprintf を使った安全なコピー */
void safe_copy(const char *src) {
    char dst[32];
    /* snprintf は dst のサイズを第2引数で指定し、超えた分は切り捨てる */
    snprintf(dst, sizeof(dst), "%s", src);
}
```

```python
# Python でのバッファサイズ検証のデモ（教育目的）
# Python 自体はスタック BOF の影響を受けないが、
# C 拡張モジュールや subprocess で呼び出す C コードには注意が必要

def demonstrate_boundary_check():
    """
    Python では境界チェックが自動的に行われる例。
    C では同等の操作でメモリ破壊が起きる。
    """
    buffer_size = 64
    buf = bytearray(buffer_size)

    # Python では IndexError が発生するため安全
    test_input = b"A" * 100
    try:
        for i, byte in enumerate(test_input):
            buf[i] = byte  # i >= 64 で IndexError
    except IndexError as e:
        print(f"Python の境界チェック: {e}")
        print("C では同様の操作でメモリが破壊される（エラーなし）")


# コンパイル時の防御オプション（gcc/clang）
compiler_defenses = {
    "-fstack-protector-strong": "スタックカナリアを挿入してスタック破壊を検出",
    "-D_FORTIFY_SOURCE=2":      "危険な libc 関数のコンパイル時・実行時チェック",
    "-pie -fPIE":               "PIE（Position Independent Executable）でASLRを有効化",
    "-z noexecstack":           "スタックの実行を禁止（NX ビット）",
    "-z relro -z now":          "GOT を読み取り専用にしてポインタ上書きを防ぐ",
}

print("\n=== C/C++ コンパイル時の防御オプション ===")
for option, description in compiler_defenses.items():
    print(f"  {option:30s}  {description}")

demonstrate_boundary_check()
```

## 使用場面

- C/C++ で書かれた既存コードの安全なバッファ操作への移行
- セキュアコーディングガイドラインの策定（`gets`・`strcpy` の使用禁止）
- 静的解析ツール（Coverity・Cppcheck）による危険な関数の検出
- CTF の Pwn 問題でスタック BOF の原理を学ぶ（教育目的）
- コンパイラの防御オプション（カナリア・NX・PIE）の有効化確認

## 参考文献

- [CWE-121: Stack-based Buffer Overflow](https://cwe.mitre.org/data/definitions/121.html)
- [CERT C Coding Standard - STR31-C](https://wiki.sei.cmu.edu/confluence/display/c/STR31-C.+Guarantee+that+storage+for+strings+has+sufficient+space+for+character+data+and+the+null+terminator)
- [GCC - Stack Smashing Protector](https://gcc.gnu.org/onlinedocs/gcc/Instrumentation-Options.html)
- [OWASP - Buffer Overflow](https://owasp.org/www-community/vulnerabilities/Buffer_Overflow)

<AffiliateBanner site="security_navi" />
