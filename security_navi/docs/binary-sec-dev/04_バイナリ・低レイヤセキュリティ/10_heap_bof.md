import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ヒープオーバーフロー（原理と防御機構）

## ヒープオーバーフローとは

> ヒープオーバーフローとは、ヒープ領域（`malloc`・`new` で動的確保されたメモリ）のバッファ境界を超えてデータを書き込むことで、隣接するヒープチャンクのメタデータや関数ポインタを改ざんし、任意コード実行につながる脆弱性である。

スタックバッファオーバーフローがスタック上のリターンアドレスを標的にするのに対し、ヒープオーバーフローはヒープアロケータの内部構造（チャンクヘッダ・フリーリスト・管理ポインタ）を改ざんする。

**glibc malloc のチャンク構造：**
```
確保済みチャンク
┌──────────────────────┐
│ prev_size (8B)       │ 前チャンクが解放済みの場合のサイズ
├──────────────────────┤
│ size (8B)            │ チャンクサイズ + フラグビット
├──────────────────────┤
│ データ領域           │ ← malloc() が返すポインタ
│  [buf: Nバイト]      │
└──────────────────────┘

解放済みチャンク（free list に入ったもの）
┌──────────────────────┐
│ prev_size            │
├──────────────────────┤
│ size + フラグ        │
├──────────────────────┤
│ fd（前方チャンク）   │ ← これらを改ざんされると
├──────────────────────┤    任意アドレス書き込みに発展
│ bk（後方チャンク）   │
└──────────────────────┘
```

隣接チャンクの `size` や `fd`/`bk` ポインタを書き換えることで、`free()` 時の unlink 処理を悪用して任意アドレスへの書き込みが可能になる（unlink 攻撃）。現代の glibc には安全チェックが追加されているが、Use-After-Free や double free と組み合わせた攻撃は今日でも発見される。

## ヒープ脆弱性の種類と防御

| 脆弱性 | 概要 | 防御策 |
|--------|------|--------|
| ヒープオーバーフロー | バッファ末尾を超えた書き込み | `malloc` サイズの明示的検証・AddressSanitizer |
| Use-After-Free (UAF) | 解放済みポインタの再使用 | ポインタを解放後すぐに NULL 化 |
| Double Free | 同一ポインタを 2 回 `free` | free 後の NULL 化・unique_ptr の使用 |
| Integer Overflow（サイズ計算） | `n * size` のオーバーフローで小さい領域確保 | `reallocarray`・乗算前のチェック |
| Heap Spray | ヒープに多数のシェルコードを散布 | ASLR・DEP/NX・型安全なメモリ管理 |

```c
/* ===================================================
 * 教育目的: ヒープ操作の安全なパターンと危険なパターン
 * ================================================== */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

/* 【悪い例】整数オーバーフローによる小さすぎるバッファ確保 */
void *vulnerable_alloc(size_t n, size_t elem_size) {
    /* n=0x40000001, elem_size=4 の場合:
     * n * elem_size = 0x100000004 → 32bit では 4 になる（オーバーフロー）
     * 4 バイトしか確保されないのに大量データを書き込むと BOF */
    return malloc(n * elem_size);
}

/* 【良い例】乗算前にオーバーフローを検査 */
void *safe_alloc(size_t n, size_t elem_size) {
    /* reallocarray は内部でオーバーフローチェックを行う（glibc 2.26+）*/
    return reallocarray(NULL, n, elem_size);
}

/* 【悪い例】Use-After-Free */
void vulnerable_uaf(void) {
    char *ptr = malloc(64);
    free(ptr);
    /* ptr はダングリングポインタになったが、NULL 化していない */
    strcpy(ptr, "UAF!");  /* 解放済みメモリへの書き込み = 未定義動作 */
}

/* 【良い例】解放後に NULL 化 */
void safe_free(char **ptr) {
    if (ptr && *ptr) {
        free(*ptr);
        *ptr = NULL;  /* ダングリングポインタを NULL にして再使用を防ぐ */
    }
}

/* 【良い例】C++ では RAII（スマートポインタ）でメモリ管理 */
/*
#include <memory>
void safe_cpp_example() {
    auto ptr = std::make_unique<char[]>(64);
    // スコープを抜けると自動解放される。double free も UAF も起きない
}
*/
```

```python
# ヒープ脆弱性の検出ツールと防御技術の解説

heap_defenses = {
    "AddressSanitizer (ASan)": {
        "説明": "ヒープ・スタック・グローバル変数のバッファ越境・UAF・double free を実行時に検出",
        "有効化": "gcc/clang: -fsanitize=address -g",
        "オーバーヘッド": "実行時間 約 2倍、メモリ 約 2倍（開発・テスト時に使用）",
    },
    "Heap Guard Pages": {
        "説明": "ヒープ確保領域の前後にアクセス禁止のガードページを配置してオーバーフローを検出",
        "有効化": "Electric Fence・Valgrind の --tool=memcheck",
        "オーバーヘッド": "高い（本番環境には不向き）",
    },
    "Safe Unlinking": {
        "説明": "glibc malloc の unlink 処理で fd/bk ポインタの整合性チェックを実施",
        "有効化": "glibc 2.3.4 以降でデフォルト有効",
        "オーバーヘッド": "ほぼなし",
    },
    "tcache/fastbin 保護": {
        "説明": "glibc の tcache double free 検出（確保済みチャンクに key を書き込む）",
        "有効化": "glibc 2.26 以降でデフォルト有効",
        "オーバーヘッド": "ほぼなし",
    },
}

print("=== ヒープ保護機構一覧 ===")
for name, info in heap_defenses.items():
    print(f"\n[{name}]")
    for key, val in info.items():
        print(f"  {key}: {val}")

print("\n=== C++ における安全なメモリ管理のベストプラクティス ===")
cpp_best_practices = [
    "raw pointer の代わりに std::unique_ptr / std::shared_ptr を使用する",
    "配列には std::vector<T> を使用し、添字アクセスには at() で境界チェック",
    "new/delete を直接使わず、make_unique / make_shared を使用する",
    "Rust を採用することでオーナーシップシステムによりコンパイル時にメモリ安全性を保証",
]
for i, practice in enumerate(cpp_best_practices, 1):
    print(f"  {i}. {practice}")
```

## 使用場面

- C/C++ のメモリ管理コードの安全な書き直し（UAF・double free の排除）
- AddressSanitizer を CI パイプラインに組み込んでヒープ脆弱性を継続的に検出
- `reallocarray` を使った整数オーバーフロー安全なメモリ確保
- CTF の Pwn 問題でヒープ構造の理解を深める（教育目的）
- C++ から Rust へのリライトによる根本的なメモリ安全性確保

## 参考文献

- [CWE-122: Heap-based Buffer Overflow](https://cwe.mitre.org/data/definitions/122.html)
- [CWE-416: Use After Free](https://cwe.mitre.org/data/definitions/416.html)
- [Google - AddressSanitizer](https://github.com/google/sanitizers/wiki/AddressSanitizer)
- [glibc malloc internals](https://sourceware.org/glibc/wiki/MallocInternals)

<AffiliateBanner site="security_navi" />
