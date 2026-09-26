import AffiliateBanner from '@site/src/components/AffiliateBanner';

# フォーマット文字列攻撃（防御方法中心）

## フォーマット文字列攻撃とは

> フォーマット文字列攻撃とは、`printf` などのフォーマット関数にユーザー入力をフォーマット文字列として直接渡すことで、攻撃者がスタック上のメモリを読み取ったり、`%n` を用いて任意アドレスに値を書き込んだりできる脆弱性である。

C 言語の `printf` 系関数は、`%d`・`%s`・`%x`・`%n` などのフォーマット指定子を使ってスタックから引数を順次取り出す。フォーマット文字列が攻撃者に制御されると、引数として渡されていない値もスタックから読み取られてしまう。

**典型的な脆弱なコード：**
```c
// 【危険】ユーザー入力をフォーマット文字列として渡している
printf(user_input);          // 絶対に NG

// 【安全】フォーマット文字列を固定する
printf("%s", user_input);    // OK
```

**`%n` の危険性：**
`%n` は「これまでに出力した文字数」を対応する引数のアドレスに書き込む特殊な指定子である。これにより、スタック上のアドレスを通じて任意メモリへの書き込みが可能になる。

**情報漏洩の仕組み：**
`%x %x %x %x` のような入力を与えると、スタック上の値を16進数で順番に出力できる。カナリア値・libc のアドレス・rbp の値などを読み取れてしまう。

## フォーマット文字列攻撃の種類と防御

| 攻撃種別 | 使用する指定子 | 被害 | 防御 |
|---------|-------------|------|------|
| メモリリード | `%x`, `%s`, `%p` | スタック・ヒープ内の機密値読み取り | フォーマット文字列を固定 |
| 任意アドレス書き込み | `%n`, `%hn` | 任意アドレスへの値書き込み（GOT 上書き等） | `_FORTIFY_SOURCE` で `%n` を制限 |
| カナリア値リーク | `%p` / `%x` の連打 | ASLR・カナリア迂回の補助 | カナリア + ASLR + PIE の組み合わせ |
| Blind フォーマット | `%c` / `%d` の組み合わせ | バイト単位でのメモリ探索 | 入力バリデーション |

```c
/* ===================================================
 * 教育目的: フォーマット文字列脆弱性の安全なコードへの修正
 * ================================================== */
#include <stdio.h>
#include <string.h>
#include <syslog.h>

/* 【悪い例 1】printf にユーザー入力を直接渡す */
void log_message_vulnerable(const char *user_input) {
    printf(user_input);    /* 危険: %x %x %x などでスタックが漏洩 */
}

/* 【良い例 1】フォーマット文字列を固定する */
void log_message_safe(const char *user_input) {
    printf("%s\n", user_input);  /* OK: ユーザー入力は常に引数として渡す */
}

/* 【悪い例 2】syslog にユーザー入力を直接渡す */
void syslog_vulnerable(const char *user_input) {
    syslog(LOG_INFO, user_input);  /* 危険 */
}

/* 【良い例 2】syslog も同様にフォーマット文字列を固定 */
void syslog_safe(const char *user_input) {
    syslog(LOG_INFO, "%s", user_input);  /* OK */
}

/* 【悪い例 3】snprintf でもフォーマット文字列に注意 */
void format_log_vulnerable(char *buf, size_t size, const char *user_input) {
    snprintf(buf, size, user_input);  /* 危険: user_input が fmt として解釈 */
}

/* 【良い例 3】 */
void format_log_safe(char *buf, size_t size, const char *user_input) {
    snprintf(buf, size, "%s", user_input);  /* OK */
}
```

```python
# Python での静的解析：フォーマット文字列脆弱性パターンの検出
import re
import sys
from pathlib import Path

# フォーマット文字列脆弱性の典型パターン（C/C++ コード向け）
VULNERABLE_PATTERNS = [
    # printf 系関数に変数を直接渡している
    (r'\bprintf\s*\(\s*[a-zA-Z_]\w*\s*\)', "printf に変数を直接渡している"),
    (r'\bfprintf\s*\(\s*\w+\s*,\s*[a-zA-Z_]\w*\s*\)', "fprintf に変数を直接渡している"),
    (r'\bsprintf\s*\(\s*\w+\s*,\s*[a-zA-Z_]\w*\s*\)', "sprintf に変数を直接渡している"),
    (r'\bsyslog\s*\(\s*[A-Z_]+\s*,\s*[a-zA-Z_]\w*\s*\)', "syslog に変数を直接渡している"),
    (r'\bvprintf\s*\(\s*[a-zA-Z_]\w*\s*,', "vprintf に変数を直接渡している（注意）"),
]

def scan_for_format_string_bugs(source_code: str) -> list[dict]:
    """
    C/C++ ソースコードからフォーマット文字列脆弱性の
    候補パターンを検出する（誤検知の可能性あり・手動確認必須）。
    """
    findings = []
    for line_num, line in enumerate(source_code.splitlines(), 1):
        for pattern, description in VULNERABLE_PATTERNS:
            if re.search(pattern, line):
                findings.append({
                    "line": line_num,
                    "code": line.strip(),
                    "issue": description,
                    "severity": "High",
                })
    return findings


# テスト用ソースコード
sample_code = """
#include <stdio.h>
void show_error(const char *msg) {
    printf(msg);             // 脆弱
    fprintf(stderr, msg);    // 脆弱
    printf("%s\\n", msg);    // 安全
}
"""

print("=== フォーマット文字列脆弱性スキャン ===")
findings = scan_for_format_string_bugs(sample_code)
if findings:
    for f in findings:
        print(f"  [Line {f['line']}] [{f['severity']}] {f['issue']}")
        print(f"    コード: {f['code']}")
else:
    print("  脆弱なパターンは検出されませんでした。")

print("\n=== 修正チェックリスト ===")
checklist = [
    "printf/fprintf/syslog の第1引数（または第2引数）は必ずリテラル文字列にする",
    'コンパイル時に -Wformat=2 を有効化して危険なパターンを警告する',
    "-D_FORTIFY_SOURCE=2 で %n の使用を制限する",
    "SAST ツール（Coverity・Semgrep）でフォーマット文字列パターンを継続的に検出する",
    "コードレビューでユーザー入力がフォーマット文字列になっていないか確認する",
]
for i, item in enumerate(checklist, 1):
    print(f"  {i}. {item}")
```

## 使用場面

- C/C++ コードのセキュリティレビューで `printf(var)` パターンの検出
- SAST ツール（Semgrep・Coverity）へのフォーマット文字列脆弱性ルール追加
- コンパイル時警告 `-Wformat=2` の有効化と CI への組み込み
- レガシー C コードの安全な書き直し（全 `printf` の引数を確認）
- CTF の Pwn 問題でフォーマット文字列の原理を学ぶ（教育目的）

## 参考文献

- [CWE-134: Use of Externally-Controlled Format String](https://cwe.mitre.org/data/definitions/134.html)
- [CERT C - FIO30-C: Exclude user input from format strings](https://wiki.sei.cmu.edu/confluence/display/c/FIO30-C.+Exclude+user+input+from+format+strings)
- [OWASP - Format String Attack](https://owasp.org/www-community/attacks/Format_string_attack)
- [GCC - Warning Options: -Wformat](https://gcc.gnu.org/onlinedocs/gcc/Warning-Options.html)

<AffiliateBanner site="security_navi" />
