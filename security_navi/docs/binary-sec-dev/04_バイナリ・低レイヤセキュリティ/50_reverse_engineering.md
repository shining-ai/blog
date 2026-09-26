import AffiliateBanner from '@site/src/components/AffiliateBanner';

# リバースエンジニアリング入門（Ghidra）

## リバースエンジニアリングとは

> リバースエンジニアリングとは、ソースコードが入手できないバイナリ（実行ファイル・DLL・ファームウェア）を解析して、その動作・アルゴリズム・脆弱性を理解する技術であり、マルウェア解析・脆弱性研究・CTF・ソフトウェア互換性検証などで活用される。

リバースエンジニアリングは攻撃目的だけでなく、防御目的でも重要な技術である。インシデントレスポンスでのマルウェア解析・組み込みデバイスのファームウェア検証・古いソフトウェアの動作理解など、セキュリティエンジニアに求められる幅広い場面で使用される。

**Ghidra** は NSA（米国国家安全保障局）がオープンソースとして公開した無料の逆アセンブラ・逆コンパイラであり、IDA Pro の有力な代替ツールとして広く使われている。x86・ARM・MIPS・PowerPC など多様なアーキテクチャに対応している。

**静的解析の流れ：**
1. `file` コマンドでファイル形式確認（ELF・PE・Mach-O）
2. `strings` でハードコードされた文字列を確認
3. `nm` / `objdump` でシンボル・インポート関数を確認
4. Ghidra でインポートして逆アセンブル・逆コンパイル
5. 怪しい関数を特定してコードを読み解く

## Ghidra の主要機能

| 機能 | 説明 | 活用場面 |
|------|------|---------|
| 逆アセンブラ | バイナリを機械語 → アセンブリに変換 | 実行フローの把握 |
| 逆コンパイラ | アセンブリ → C 風コードに変換 | アルゴリズムの理解 |
| 関数グラフ | 制御フローを視覚的に表示 | 複雑な分岐の把握 |
| クロスリファレンス | 関数・変数の参照関係を追跡 | 重要関数の発見 |
| スクリプト実行 | Python/Java API で解析を自動化 | バッチ解析・シグネチャ生成 |
| シンボル管理 | 関数・変数の名前を付け直す | 解析結果の整理 |

```python
# Ghidra の Python スクリプト API を使った自動解析の例
# （Ghidra の Script Manager 上で実行する）

# ===================================================
# Ghidra Script: 危険な関数呼び出しを検索する
# ファイル: find_dangerous_functions.py
# ===================================================

"""
このスクリプトは Ghidra の Script Manager から実行する。
危険な関数（gets, strcpy, system 等）の呼び出し箇所を
自動的に列挙して、脆弱性調査の出発点とする。
"""

# Ghidra API（Script Manager 内でのみ有効）
# from ghidra.program.model.listing import CodeUnitIterator

DANGEROUS_FUNCTIONS = [
    "gets", "strcpy", "strcat", "sprintf", "scanf",
    "system", "popen", "exec", "execve", "execl",
    "printf",   # フォーマット文字列の可能性
]


def find_dangerous_calls():
    """
    プログラム内の危険な関数呼び出しを列挙する。
    Ghidra Script Manager 内で実行することを想定。
    """
    # Ghidra スクリプト環境でのみ利用可能な変数: currentProgram, monitor
    # ここでは疑似コードとして示す

    findings = []

    # 実際の Ghidra スクリプトでは以下のように書く
    ghidra_script_code = """
    # Ghidra Python Script (実際のコード)
    from ghidra.program.model.symbol import SymbolType

    func_manager = currentProgram.getFunctionManager()
    symbol_table = currentProgram.getSymbolTable()

    for func_name in DANGEROUS_FUNCTIONS:
        symbols = symbol_table.getSymbols(func_name)
        for symbol in symbols:
            refs = getReferencesTo(symbol.getAddress())
            for ref in refs:
                caller_func = func_manager.getFunctionContaining(ref.getFromAddress())
                caller_name = caller_func.getName() if caller_func else "unknown"
                print(f"[!] {func_name}() が {caller_name}() の "
                      f"{ref.getFromAddress()} から呼ばれています")
    """
    return ghidra_script_code


# コマンドラインでの基本的なバイナリ調査フロー
print("=== バイナリ静的解析の基本フロー ===\n")

analysis_steps = [
    ("file ./target",
     "ファイル形式の確認（ELF 64-bit / PE32+ / Mach-O）"),
    ("strings ./target | grep -E '(http|password|flag|key|secret)'",
     "ハードコードされた文字列・パスワード・URL の確認"),
    ("nm -D ./target 2>/dev/null | grep -E '(gets|strcpy|system)'",
     "危険な動的シンボルの確認"),
    ("objdump -d ./target | head -100",
     "エントリポイント付近のアセンブリ確認"),
    ("readelf -h ./target",
     "ELF ヘッダの確認（アーキテクチャ・エントリポイント）"),
    ("ldd ./target",
     "依存共有ライブラリの確認"),
]

for cmd, desc in analysis_steps:
    print(f"  $ {cmd}")
    print(f"    → {desc}\n")

print("=== Ghidra の起動と基本操作 ===")
ghidra_steps = [
    "ghidraRun（GUIの起動）またはanalyzeHeadless（バッチ解析）",
    "New Project → Import File でバイナリを読み込む",
    "Auto Analyze で自動解析を実行（関数検出・型推定）",
    "Symbol Tree でエクスポート関数・main 関数を探す",
    "逆コンパイラウィンドウで C 風コードを読む",
    "怪しい関数名を右クリック → Rename で意味のある名前を付ける",
    "Script Manager → find_dangerous_functions.py を実行",
]
for i, step in enumerate(ghidra_steps, 1):
    print(f"  {i}. {step}")
```

## 使用場面

- インシデントレスポンスでのマルウェアサンプル解析
- IoT デバイスのファームウェアセキュリティ検証
- CTF の Rev（Reversing）問題でバイナリを解析する（学習目的）
- 脆弱性発見後のパッチ差分解析（パッチを当てる前後のバイナリ比較）
- レガシーシステムのソースコードが失われた場合の動作理解

## 参考文献

- [Ghidra - NSA GitHub](https://github.com/NationalSecurityAgency/ghidra)
- [Ghidra Book - The Definitive Guide (No Starch Press)](https://nostarch.com/GhidraBook)
- [OpenSecurityTraining2 - Intro to Reverse Engineering](https://ost2.fyi/)
- [CTF Field Guide - Reversing](https://trailofbits.github.io/ctf/reversing/)

<AffiliateBanner site="security_navi" />
