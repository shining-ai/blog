import AffiliateBanner from '@site/src/components/AffiliateBanner';

# スタックフレームと呼び出し規約

## スタックフレームとは

> スタックフレーム（Stack Frame）とは、関数が呼び出された際にコールスタック上に確保される、その関数専用のメモリ領域であり、ローカル変数・引数・戻りアドレス・呼び出し元のフレームポインタなどを格納する。関数が戻ると対応するフレームは破棄される。

プログラムの実行中、関数の呼び出しのたびに新しいスタックフレームがスタックの「上」に積まれ（push）、関数が終了すると取り除かれる（pop）。このため再帰呼び出しも自然に扱える。スタックは通常数 MB〜8 MB 程度のサイズ制限があり、深い再帰や大量のローカル変数はスタックオーバーフロー（Stack Overflow）を引き起こす。

**呼び出し規約（Calling Convention）** は、引数の渡し方・戻り値の置き場所・どのレジスタを呼び出し元・先が保存するかを定めたルールである。OS・アーキテクチャごとに異なる。x86-64 Linux/macOS では System V AMD64 ABI が使われ、最初の6つの整数引数を rdi・rsi・rdx・rcx・r8・r9 レジスタで渡す。Windows の x64 ABI ではレジスタの使い方が異なる。

## System V AMD64 ABI のスタックフレーム構造

| スタック上の位置（アドレス降順） | 内容 |
|-------------------------------|------|
| ... (高アドレス) |  |
| 呼び出し元のローカル変数 | 呼び出し元フレームの一部 |
| スタック上の引数（7個目以降） | 呼び出し前に push される |
| 戻りアドレス（ret addr） | call 命令が自動的に push |
| 保存された rbp（フレームポインタ） | push rbp でフレーム確立 |
| ローカル変数領域 | sub rsp, N で確保 |
| ... (低アドレス) ← rsp |  |

```python
# Python でスタックフレームの動作を可視化する
import sys

def factorial(n: int, depth: int = 0) -> int:
    """スタックフレームの積み重なりを可視化する階乗関数"""
    indent = "  " * depth
    frame = sys._getframe()
    print(f"{indent}→ factorial({n}) "
          f"[フレームID: {id(frame):#x}, depth={depth}]")

    if n <= 1:
        print(f"{indent}← 底: 1 を返す")
        return 1

    result = n * factorial(n - 1, depth + 1)
    print(f"{indent}← factorial({n}) = {result} を返す")
    return result

print("=== 再帰呼び出しとスタックフレーム ===")
ans = factorial(4)
print(f"\n最終結果: {ans}")

# スタックの深さを確認
def stack_depth(n=0):
    try:
        stack_depth(n + 1)
    except RecursionError:
        return n

print(f"\nPython の最大再帰深度: {sys.getrecursionlimit()}")
```

```c
/* C 言語の関数呼び出しがアセンブリでどう見えるか */

/* ソースコード */
int add(int a, int b) {
    int result = a + b;   /* ローカル変数 */
    return result;
}

int main() {
    int x = add(3, 4);
    return 0;
}

/* 生成される x86-64 アセンブリ（System V AMD64 ABI） */
/*
add:
    push    rbp              ; 呼び出し元のフレームポインタを保存
    mov     rbp, rsp         ; フレームポインタを現在のスタックポインタに設定
    sub     rsp, 16          ; ローカル変数のためのスペースを確保
    mov     DWORD PTR [rbp-4], edi   ; a = 第1引数 (edi)
    mov     DWORD PTR [rbp-8], esi   ; b = 第2引数 (esi)
    mov     edx, DWORD PTR [rbp-4]   ; edx = a
    mov     eax, DWORD PTR [rbp-8]   ; eax = b
    add     eax, edx         ; eax = a + b
    mov     DWORD PTR [rbp-12], eax  ; result = a + b
    mov     eax, DWORD PTR [rbp-12] ; 戻り値 = result
    leave                    ; rsp = rbp; pop rbp (フレーム解放)
    ret                      ; 戻りアドレスにジャンプ

main:
    push    rbp
    mov     rbp, rsp
    sub     rsp, 16
    mov     esi, 4           ; 第2引数 b = 4
    mov     edi, 3           ; 第1引数 a = 3
    call    add              ; add を呼び出し（戻りアドレスを push してジャンプ）
    mov     DWORD PTR [rbp-4], eax   ; x = 戻り値 (eax)
    mov     eax, 0           ; return 0
    leave
    ret
*/
```

## 使用場面

- バッファオーバーフロー・スタックオーバーフロー脆弱性の理解とデバッグ
- 末尾呼び出し最適化（TCO）の実装によるスタックフレームの再利用
- デバッガのバックトレース（backtrace）機能でのコールスタック解析
- 言語ランタイムの実装（例外処理・継続・コルーチンのスタック管理）

## 参考文献

- [System V AMD64 ABI](https://gitlab.com/x86-psABIs/x86-64-ABI)
- Patterson, D. A. & Hennessy, J. L. (2020). *Computer Organization and Design* (6th ed.). Morgan Kaufmann.
- [GDB — バックトレースの読み方](https://sourceware.org/gdb/current/onlinedocs/gdb/Backtrace.html)

<AffiliateBanner site="language_navi" />
