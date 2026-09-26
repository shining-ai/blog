import AffiliateBanner from '@site/src/components/AffiliateBanner';

# コンパイラの全体構造

## コンパイラとは

> コンパイラとは、あるプログラミング言語で書かれたソースコードを、別の言語（通常は機械語や中間表現）へ変換するプログラムであり、字句解析・構文解析・意味解析・最適化・コード生成という複数のフェーズで構成される。

コンパイラは大きく「フロントエンド」「ミドルエンド」「バックエンド」の三層に分かれる。フロントエンドはソースコードを読み取り、意味を持った構造（AST）へ変換する。ミドルエンドは言語非依存の中間表現（IR）に変換し最適化を行う。バックエンドはターゲットアーキテクチャ向けの機械語を生成する。

この分離設計により、フロントエンドを差し替えるだけで新言語に対応でき、バックエンドを差し替えることで別のCPUをサポートできる。LLVMはまさにこの思想で構築されており、Rust・Swift・Clang・KotlinネイティブなどがLLVMバックエンドを共有している。

## コンパイラの処理フェーズ

| フェーズ | 入力 | 出力 | 主な処理 |
|---------|------|------|----------|
| 字句解析（Lexer） | ソースコード（文字列） | トークン列 | 空白除去・キーワード認識 |
| 構文解析（Parser） | トークン列 | AST | 文法規則への適合確認 |
| 意味解析（Semantic Analysis） | AST | 注釈付きAST | 型検査・スコープ解析 |
| 中間コード生成 | 注釈付きAST | IR | 三番地コード・SSA形式 |
| 最適化（Optimization） | IR | 最適化済みIR | 定数畳み込み・デッドコード除去 |
| コード生成（Code Gen） | 最適化済みIR | 機械語 / アセンブリ | レジスタ割り付け・命令選択 |

```python
# Pythonで極小コンパイラのパイプラインを表現する

# 1. 字句解析: 文字列 → トークン
import re
from dataclasses import dataclass
from typing import Iterator

@dataclass
class Token:
    kind: str
    value: str

def tokenize(source: str) -> list[Token]:
    patterns = [
        ('NUMBER',  r'\d+'),
        ('PLUS',    r'\+'),
        ('MINUS',   r'-'),
        ('STAR',    r'\*'),
        ('SLASH',   r'/'),
        ('LPAREN',  r'\('),
        ('RPAREN',  r'\)'),
        ('SKIP',    r'\s+'),
    ]
    tokens = []
    pos = 0
    while pos < len(source):
        for kind, pattern in patterns:
            m = re.match(pattern, source[pos:])
            if m:
                if kind != 'SKIP':
                    tokens.append(Token(kind, m.group()))
                pos += len(m.group())
                break
    return tokens

tokens = tokenize("3 + 5 * (2 - 1)")
for t in tokens:
    print(t)
# Token(kind='NUMBER', value='3')
# Token(kind='PLUS', value='+')
# ...

# 2. 構文解析: トークン → AST（次の記事で詳解）
# 3. 意味解析: 型チェック・スコープ解析
# 4. コード生成: ターゲットコードを出力
```

```
コンパイラのパイプライン（概念図）:

  ソースコード
       |
       v
  [字句解析器 Lexer]
       | トークン列
       v
  [構文解析器 Parser]
       | 抽象構文木 (AST)
       v
  [意味解析器 Semantic Analyzer]
       | 注釈付きAST
       v
  [中間コード生成器 IR Generator]
       | IR (Three-Address Code / SSA)
       v
  [最適化器 Optimizer]
       | 最適化済みIR
       v
  [コード生成器 Code Generator]
       |
       v
  機械語 / アセンブリ
```

## 使用場面

- 新しいプログラミング言語を設計・実装する場合
- DSL（ドメイン固有言語）を開発してビジネスロジックを表現する場合
- トランスパイラ（TypeScript → JavaScript、Babel等）を実装する場合
- 静的解析ツールやリンター・コードフォーマッタを構築する場合

## 参考文献

- Aho, A. V. et al. (2006). *Compilers: Principles, Techniques, and Tools* (2nd ed.). Addison-Wesley.（通称「ドラゴンブック」）
- Appel, A. W. (1998). *Modern Compiler Implementation in ML*. Cambridge University Press.
- [LLVM 公式ドキュメント](https://llvm.org/docs/)

<AffiliateBanner site="language_navi" />
