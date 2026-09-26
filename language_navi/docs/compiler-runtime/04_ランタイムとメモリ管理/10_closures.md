import AffiliateBanner from '@site/src/components/AffiliateBanner';

# クロージャとアップバリュー

## クロージャとは

> クロージャ（Closure）とは、関数とその定義時のレキシカルスコープ（自由変数の束縛）を一緒にカプセル化したオブジェクトであり、関数を定義した環境が消滅した後も、その環境の変数（アップバリュー）を参照し続けることができる。

クロージャは「データ + 振る舞い」を組み合わせた軽量なオブジェクトとして機能する。関数型プログラミングの基盤となる概念であり、JavaScript・Python・Rust・Go・Swift など現代の主要言語のほぼすべてがクロージャをサポートする。

**アップバリュー（Upvalue）** は Lua が使う用語で、クロージャが参照するが自分のスコープ外で定義された変数を指す。Python では「自由変数（free variable）」と呼ぶ。クロージャが参照する変数はスタックフレームが消えた後も生き続けなければならないため、ランタイムはその変数をヒープに移動（ボックス化）して参照を維持する。

クロージャの実装方法は言語によって異なる。Python は `__closure__` 属性として cell オブジェクトの配列を保持する。Lua は各クロージャが upvalue ポインタを配列で保持する。Rust はクロージャを `Fn`・`FnMut`・`FnOnce` トレイトを実装する匿名構造体として表現し、キャプチャする変数をフィールドとして格納する。

## 各言語のクロージャとキャプチャ方式

| 言語 | キャプチャ方式 | 変更可否 | 実装の特徴 |
|------|-------------|---------|-----------|
| Python | 参照（cell オブジェクト） | `nonlocal` で可 | `__closure__` に cell のタプル |
| JavaScript | 参照（スコープチェーン） | 可（let/const） | 環境レコードを保持 |
| Rust | 値コピー or 参照 or 所有権移動 | `move` キーワードで制御 | 匿名構造体 + Fn トレイト |
| Go | 参照ポインタ | 可 | ヒープに変数を移動 |
| Swift | 値コピー（デフォルト）or 参照 | `[weak self]` 等でキャプチャリスト | ARC と連携 |

```python
# Python でクロージャとアップバリューの動作を詳細に確認する

import dis
import types

# --- 基本的なクロージャ ---
def make_counter(start: int = 0):
    """クロージャを返す: count は upvalue (cell) として保持される"""
    count = start  # このローカル変数が upvalue になる

    def increment(step: int = 1) -> int:
        nonlocal count  # 外側スコープの count を変更する宣言
        count += step
        return count

    return increment

counter = make_counter(10)
print(counter())    # 11
print(counter(5))   # 16
print(counter())    # 17

# make_counter のスタックフレームはもう存在しないが
# count の値 (17) はクロージャが保持し続ける

# --- クロージャの内部構造を調べる ---
print("\n=== クロージャの内部構造 ===")
print(f"関数名: {counter.__name__}")
print(f"自由変数: {counter.__code__.co_freevars}")   # ('count',)
print(f"クロージャセル数: {len(counter.__closure__)}")  # 1
cell = counter.__closure__[0]
print(f"cell の現在値: {cell.cell_contents}")   # 17 (現在のカウント値)


# --- クロージャでプライベート状態を実現 ---
def make_bank_account(initial: float):
    """クロージャでオブジェクト指向のカプセル化を模倣する"""
    _balance = initial  # プライベート変数（外から直接アクセス不可）

    def deposit(amount: float) -> float:
        nonlocal _balance
        if amount <= 0:
            raise ValueError("入金額は正の値でなければなりません")
        _balance += amount
        return _balance

    def withdraw(amount: float) -> float:
        nonlocal _balance
        if amount > _balance:
            raise ValueError("残高不足")
        _balance -= amount
        return _balance

    def get_balance() -> float:
        return _balance

    # 操作関数の辞書を返す（「オブジェクト」の代わり）
    return {'deposit': deposit, 'withdraw': withdraw, 'balance': get_balance}


account = make_bank_account(1000.0)
account['deposit'](500.0)
print(f"\n残高: {account['balance']()}")   # 1500.0
account['withdraw'](200.0)
print(f"残高: {account['balance']()}")    # 1300.0


# --- よくある落とし穴: ループ内でのクロージャ ---
print("\n=== ループ内クロージャの落とし穴 ===")

# 問題: すべてのクロージャが i の最後の値を参照してしまう
funcs_bad = [lambda: i for i in range(3)]
print("問題あり:", [f() for f in funcs_bad])   # [2, 2, 2] -- 全て 2!

# 解決1: デフォルト引数で値をキャプチャ
funcs_good1 = [lambda i=i: i for i in range(3)]
print("解決1:", [f() for f in funcs_good1])    # [0, 1, 2]

# 解決2: ファクトリ関数でスコープを作る
def make_func(i):
    return lambda: i
funcs_good2 = [make_func(i) for i in range(3)]
print("解決2:", [f() for f in funcs_good2])    # [0, 1, 2]
```

## 使用場面

- イベントハンドラ・コールバック関数へのコンテキスト情報の受け渡し
- デコレータパターン（Python の `@lru_cache`・`@wraps`）の実装基盤
- 関数型プログラミングの map・filter・reduce における部分適用・カリー化
- モジュールのプライベート変数のカプセル化（JavaScript のモジュールパターン）

## 参考文献

- Nystrom, R. (2021). *Crafting Interpreters*, Chapter 25: Closures.（[無料公開](https://craftinginterpreters.com/closures.html)）
- [Python — 自由変数と nonlocal](https://docs.python.org/ja/3/reference/executionmodel.html#free-variables)
- [MDN — JavaScript クロージャ](https://developer.mozilla.org/ja/docs/Web/JavaScript/Closures)

<AffiliateBanner site="language_navi" />
