import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 字句解析（トークナイザ・正規表現）

## 字句解析とは

> 字句解析（Lexical Analysis）とは、ソースコードの文字列を意味のある最小単位（トークン）の列に分割する処理であり、コンパイラの最初のフェーズである。字句解析器はレキサー（Lexer）またはトークナイザ（Tokenizer）とも呼ばれる。

字句解析器の仕事は「文字の並びをカテゴリ付きの塊（トークン）に変換する」ことである。たとえば `int x = 42;` というソースコードは、`[KEYWORD("int"), IDENT("x"), EQ("="), NUMBER("42"), SEMI(";")]` というトークン列に変換される。このトークン列が次の構文解析器（パーサ）への入力となる。

字句解析の実装には正規表現が広く使われる。各トークン種別を正規表現で定義し、先頭から最長一致で認識する（最長一致の原則）。Flex（LEX）のようなレキサージェネレータは正規表現定義から自動的に有限オートマトン（DFA）を生成する。現代ではhandwritten lexerの方が高速で柔軟なため、GCC・Clang・Rustコンパイラは手書きのレキサーを使っている。

## トークンの種類と正規表現パターン

| トークン種別 | 正規表現パターン例 | 例 |
|-------------|-----------------|-----|
| 整数リテラル | `[0-9]+` | `42`, `100` |
| 浮動小数点 | `[0-9]+\.[0-9]*` | `3.14` |
| 識別子 | `[a-zA-Z_][a-zA-Z0-9_]*` | `x`, `myVar` |
| 文字列リテラル | `"[^"]*"` | `"hello"` |
| キーワード | 識別子のうち予約語 | `if`, `while` |
| 演算子 | `[+\-*/=<>!]` | `+`, `==` |
| コメント | `//[^\n]*` | `// comment` |

```python
# 実用的なレキサーの実装
import re
from dataclasses import dataclass
from typing import Iterator

@dataclass
class Token:
    kind: str
    value: str
    line: int
    col: int

class LexerError(Exception):
    pass

class Lexer:
    # トークン定義: (種別, パターン) のリスト (優先順位順)
    TOKEN_PATTERNS = [
        ('COMMENT',   r'//[^\n]*'),
        ('FLOAT',     r'\d+\.\d*'),
        ('INT',       r'\d+'),
        ('STRING',    r'"[^"]*"'),
        ('KEYWORD',   r'\b(if|else|while|for|return|int|float|def)\b'),
        ('IDENT',     r'[a-zA-Z_][a-zA-Z0-9_]*'),
        ('OP',        r'==|!=|<=|>=|[+\-*/=<>!]'),
        ('LPAREN',    r'\('),
        ('RPAREN',    r'\)'),
        ('LBRACE',    r'\{'),
        ('RBRACE',    r'\}'),
        ('SEMI',      r';'),
        ('COMMA',     r','),
        ('NEWLINE',   r'\n'),
        ('WHITESPACE',r'[ \t]+'),
    ]

    def __init__(self, source: str):
        self.source = source
        self.pos = 0
        self.line = 1
        self.col = 1
        # 全パターンを結合した正規表現を事前コンパイル
        self.master = re.compile(
            '|'.join(f'(?P<{k}>{p})' for k, p in self.TOKEN_PATTERNS)
        )

    def tokenize(self) -> list[Token]:
        tokens = []
        for m in self.master.finditer(self.source):
            kind = m.lastgroup
            value = m.group()
            tok = Token(kind, value, self.line, self.col)

            if kind == 'NEWLINE':
                self.line += 1
                self.col = 1
                continue
            elif kind in ('WHITESPACE', 'COMMENT'):
                self.col += len(value)
                continue

            tokens.append(tok)
            self.col += len(value)

        return tokens


# 動作確認
source = '''
int x = 42;
if (x > 10) {
    return x + 1;
}
'''

lexer = Lexer(source)
tokens = lexer.tokenize()
for tok in tokens:
    print(f"{tok.kind:12} | {tok.value!r}")

# KEYWORD      | 'int'
# IDENT        | 'x'
# OP           | '='
# INT          | '42'
# SEMI         | ';'
# ...
```

```typescript
// TypeScriptでのシンプルなレキサー
type TokenKind = "NUMBER" | "PLUS" | "MINUS" | "STAR" | "SLASH"
               | "LPAREN" | "RPAREN" | "EOF";

interface Token {
    kind: TokenKind;
    value: string;
    pos: number;
}

function tokenize(src: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;

    while (i < src.length) {
        const ch = src[i];

        if (/\s/.test(ch)) { i++; continue; }

        if (/\d/.test(ch)) {
            let j = i;
            while (j < src.length && /\d/.test(src[j])) j++;
            tokens.push({ kind: "NUMBER", value: src.slice(i, j), pos: i });
            i = j;
            continue;
        }

        const ops: Record<string, TokenKind> = {
            "+": "PLUS", "-": "MINUS", "*": "STAR",
            "/": "SLASH", "(": "LPAREN", ")": "RPAREN"
        };
        if (ch in ops) {
            tokens.push({ kind: ops[ch], value: ch, pos: i++ });
            continue;
        }

        throw new Error(`Unexpected character: ${ch} at ${i}`);
    }

    tokens.push({ kind: "EOF", value: "", pos: i });
    return tokens;
}
```

## 使用場面

- プログラミング言語コンパイラの最初のフェーズ実装
- 設定ファイルパーサ（JSON・TOML・YAML）の実装
- SQLパーサやテンプレートエンジンのトークナイザ
- コードハイライター・シンタックスハイライターの実装

## 参考文献

- Aho, A. V. et al. (2006). *Compilers: Principles, Techniques, and Tools* (2nd ed.). Addison-Wesley.
- [Flex — 高速レキサージェネレータ](https://github.com/westes/flex)
- [Python re モジュール](https://docs.python.org/ja/3/library/re.html)

<AffiliateBanner site="language_navi" />
