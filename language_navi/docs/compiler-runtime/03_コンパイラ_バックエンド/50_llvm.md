import AffiliateBanner from '@site/src/components/AffiliateBanner';

# LLVM の概要

## LLVM とは

> LLVM（Low Level Virtual Machine）とは、モジュール式・再利用可能なコンパイラおよびツールチェーンのフレームワークであり、LLVM IR と呼ばれる汎用の中間表現を中心に、強力な最適化パスと複数ターゲット向けのバックエンドを提供する。

2000年代初頭に Chris Lattner が UI ンランク大学の研究プロジェクトとして開始した LLVM は、現在では Apple・Google・Meta・Arm など多数の企業が開発に参加するオープンソースプロジェクトに成長している。Clang（C/C++）・Rustc・Swift・Kotlin/Native・Emscripten など、現代の主要コンパイラの多くが LLVM をバックエンドとして使用している。

LLVM の核心は **LLVM IR** という SSA 形式の中間表現である。フロントエンド（Clang など）は LLVM IR を生成し、LLVM の最適化パスが IR を変換し、バックエンドが x86-64・ARM・RISC-V・WebAssembly などターゲット向けの機械語を生成する。この設計により「フロントエンドを変えるだけで新言語をサポート」「バックエンドを変えるだけで新CPU をサポート」できる。

**LLVM ツールチェーン** は多数のツールで構成される。`clang` はCフロントエンド、`llvm-as` は LLVM IR のアセンブラ、`opt` は最適化ツール、`llc` は機械語生成器、`lld` はリンカである。

## LLVM のアーキテクチャ

| コンポーネント | 役割 | 具体例 |
|--------------|------|--------|
| フロントエンド | ソース言語 → LLVM IR | Clang (C/C++), rustc, swiftc |
| LLVM IR | 言語・アーキテクチャ非依存の SSA 形式 IR | .ll ファイル |
| 最適化パス（opt） | IR に対する変換パスの集合 | mem2reg, inline, instcombine |
| バックエンド（llc） | LLVM IR → 機械語 / アセンブリ | x86-64, AArch64, WASM, RISC-V |
| lld | 高速リンカ | ELF / Mach-O / PE リンク |
| LLDB | LLVM ベースのデバッガ | macOS, Linux でのデバッグ |

```python
# Python (llvmlite) を使って LLVM IR を生成・JIT 実行するデモ
# 事前に: pip install llvmlite

try:
    from llvmlite import ir, binding

    # 1. LLVM モジュールと関数の定義
    module = ir.Module(name="example")
    fn_type = ir.FunctionType(ir.IntType(32), [ir.IntType(32), ir.IntType(32)])
    func = ir.Function(module, fn_type, name="add")

    # 2. 基本ブロックと命令の追加
    block = func.append_basic_block(name="entry")
    builder = ir.IRBuilder(block)

    a, b = func.args
    a.name, b.name = "a", "b"
    result = builder.add(a, b, name="result")
    builder.ret(result)

    # 3. 生成された LLVM IR を表示
    print("=== 生成された LLVM IR ===")
    print(module)

    # 4. JIT コンパイルして実行
    binding.initialize()
    binding.initialize_native_target()
    binding.initialize_native_asmprinter()

    target = binding.Target.from_default_triple()
    target_machine = target.create_target_machine()

    with binding.create_mcjit_compiler(
        binding.parse_assembly(str(module)), target_machine
    ) as ee:
        ee.finalize_object()
        fn_ptr = ee.get_function_address("add")

        import ctypes
        c_add = ctypes.CFUNCTYPE(ctypes.c_int32, ctypes.c_int32, ctypes.c_int32)(fn_ptr)
        print(f"add(3, 4) = {c_add(3, 4)}")   # 7
        print(f"add(10, 20) = {c_add(10, 20)}") # 30

except ImportError:
    print("llvmlite が未インストール。以下の LLVM IR を手動で確認してください。")
```

```llvm
; llvmlite で生成される LLVM IR の例
; ファイル: example.ll

; モジュール定義
source_filename = "example"
target datalayout = "e-m:e-p270:32:32-p271:32:32-p272:64:64-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64-unknown-linux-gnu"

; 関数定義: int add(int a, int b)
define i32 @add(i32 %a, i32 %b) {
entry:
  %result = add i32 %a, %b
  ret i32 %result
}

; より複雑な例: max(a, b) 関数
define i32 @max(i32 %a, i32 %b) {
entry:
  %cond = icmp sgt i32 %a, %b    ; a > b ?
  br i1 %cond, label %then, label %else

then:
  ret i32 %a

else:
  ret i32 %b
}

; コマンドラインツールでの使用:
; llvm-as example.ll -o example.bc   # バイトコードに変換
; opt -O2 example.bc -o example_opt.bc  # 最適化
; llc example_opt.bc -o example.s    # アセンブリに変換
; clang example.s -o example          # 実行ファイルに変換
```

## 使用場面

- Rust・Swift・Clang などのコンパイラのバックエンドとして機械語生成に使用
- Emscripten による C/C++ コードの WebAssembly へのコンパイル
- llvmlite や LLVM C API を使った Python・C から LLVM IR を生成する DSL・特化型コンパイラの開発
- Julia・Numba などの科学計算言語の JIT コンパイラバックエンドとして使用

## 参考文献

- [LLVM 公式ドキュメント](https://llvm.org/docs/)
- [LLVM Language Reference Manual (IR 仕様)](https://llvm.org/docs/LangRef.html)
- Lattner, C. & Adve, V. (2004). LLVM: A compilation framework for lifelong program analysis & transformation. *CGO 2004*.
- [llvmlite ドキュメント](https://llvmlite.readthedocs.io/)

<AffiliateBanner site="language_navi" />
