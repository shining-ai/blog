import AffiliateBanner from '@site/src/components/AffiliateBanner';

# スコープと名前解決

## スコープと名前解決とは

> スコープ（Scope）とは、識別子（変数・関数・型名など）が有効である（参照できる）プログラム上の範囲であり、名前解決（Name Resolution）とは識別子の参照先を決定する処理である。コンパイラの意味解析フェーズで行われる。

スコープには「ブロックスコープ」「関数スコープ」「モジュールスコープ」「グローバルスコープ」などがある。多くの言語はネストしたスコープ（lexical scoping / 静的スコープ）を採用しており、内側のスコープから外側のスコープへと順番に名前を探索する。これを「スコープチェーン」と呼ぶ。

名前解決の実装は「シンボルテーブル（Symbol Table）」を使って行う。シンボルテーブルはスコープごとに作成される辞書で、変数名→型・宣言位置・メモリオフセットなどを格納する。スコープのネストはスタック（またはツリー）で表現し、名前解決時はスタックをボトムから上方向に検索する。

シャドウイング（shadowing）とは、内側のスコープで外側と同名の変数を宣言した際に、内側の宣言が外側を隠す現象である。Python・JavaScript・Rust などすべての主要言語で起こりうる。クロージャはスコープ解析と深く関係しており、関数が定義された時点のスコープを「キャプチャ」して保持する。

## スコープの種類と探索順序

| スコープ種別 | 範囲 | 例（Python LEGB） |
|------------|------|-----------------|
| ローカル (L) | 関数・ブロック内 | 関数内の変数 |
| エンクロージング (E) | 内包する関数 | クロージャのキャプチャ変数 |
| グローバル (G) | モジュール全体 | モジュールレベルの変数 |
| ビルトイン (B) | 言語組み込み | `len`, `print` など |

```python
# スコープチェーンとシンボルテーブルの実装
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional, Any

# --- シンボルテーブル（スコープ1つ分） ---
@dataclass
class SymbolTable:
    name: str                                   # スコープ名（デバッグ用）
    parent: Optional['SymbolTable'] = None      # 外側のスコープ
    symbols: dict[str, Any] = field(default_factory=dict)

    def define(self, name: str, info: Any) -> None:
        """現在のスコープに名前を定義する"""
        if name in self.symbols:
            raise NameError(f"'{name}' は既にこのスコープで定義されています")
        self.symbols[name] = info

    def resolve(self, name: str) -> Any:
        """名前を現在のスコープから外側へ向かって解決する"""
        if name in self.symbols:
            return self.symbols[name]
        if self.parent is not None:
            return self.parent.resolve(name)
        raise NameError(f"未定義の名前: '{name}'")

    def resolve_local(self, name: str) -> Optional[Any]:
        """現在のスコープのみで名前を検索する（シャドウイング確認用）"""
        return self.symbols.get(name)


# --- スコープ付き評価器 ---
class ScopedInterpreter:
    def __init__(self):
        # グローバルスコープを作成
        self.global_scope = SymbolTable("global")
        self.current_scope = self.global_scope

    def enter_scope(self, name: str) -> SymbolTable:
        """新しいスコープに入る"""
        new_scope = SymbolTable(name, parent=self.current_scope)
        self.current_scope = new_scope
        return new_scope

    def exit_scope(self) -> None:
        """現在のスコープを抜けて外側のスコープに戻る"""
        assert self.current_scope.parent is not None, "グローバルスコープを抜けられません"
        self.current_scope = self.current_scope.parent

    def declare(self, name: str, value: Any) -> None:
        self.current_scope.define(name, value)

    def lookup(self, name: str) -> Any:
        return self.current_scope.resolve(name)

    def assign(self, name: str, value: Any) -> None:
        """代入: 名前が存在するスコープを探して値を更新"""
        scope = self.current_scope
        while scope is not None:
            if name in scope.symbols:
                scope.symbols[name] = value
                return
            scope = scope.parent
        raise NameError(f"未定義変数への代入: '{name}'")


# 動作確認
interp = ScopedInterpreter()

# グローバルスコープ
interp.declare('x', 10)
interp.declare('y', 20)
print(f"global x = {interp.lookup('x')}")  # 10

# 関数スコープに入る
interp.enter_scope('function:f')
interp.declare('x', 99)   # シャドウイング: グローバルの x を隠す
interp.declare('z', 5)
print(f"local x = {interp.lookup('x')}")   # 99（ローカルの x）
print(f"outer y = {interp.lookup('y')}")   # 20（グローバルから解決）

# ネストしたブロックスコープ
interp.enter_scope('block')
interp.declare('w', 42)
print(f"block w = {interp.lookup('w')}")   # 42
print(f"block x = {interp.lookup('x')}")   # 99（関数スコープから解決）
interp.exit_scope()

# ブロックスコープを抜けた後は w が見えない
try:
    interp.lookup('w')
except NameError as e:
    print(f"エラー: {e}")   # 未定義の名前: 'w'

interp.exit_scope()
# 関数スコープを抜けた後は x = 10（グローバル）
print(f"back to global x = {interp.lookup('x')}")  # 10

# スコープチェーンの可視化
def print_scope_chain(scope: SymbolTable, indent: int = 0) -> None:
    prefix = "  " * indent
    print(f"{prefix}[{scope.name}] {list(scope.symbols.keys())}")
    if scope.parent:
        print_scope_chain(scope.parent, indent + 1)

print("\nスコープチェーン（現在のスコープから外側へ）:")
print_scope_chain(interp.current_scope)
```

## 使用場面

- 変数の宣言と参照の対応付け（コンパイラ・インタプリタの意味解析フェーズ）
- クロージャにキャプチャされる変数の決定（自由変数解析）
- JavaScript の `var` / `let` / `const` のスコープ差異の実装
- Python の LEGB ルールやモジュールシステムの名前解決実装

## 参考文献

- Aho, A. V. et al. (2006). *Compilers: Principles, Techniques, and Tools* (2nd ed.). Addison-Wesley.
- Nystrom, R. (2021). *Crafting Interpreters*, Chapter 11: Resolving and Binding.（[無料公開](https://craftinginterpreters.com/resolving-and-binding.html)）
- [MDN — JavaScript のスコープ](https://developer.mozilla.org/ja/docs/Glossary/Scope)

<AffiliateBanner site="language_navi" />
