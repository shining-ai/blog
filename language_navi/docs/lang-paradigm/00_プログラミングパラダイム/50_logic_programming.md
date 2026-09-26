import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 論理プログラミング（Prolog）

## 論理プログラミングとは

> 論理プログラミングとは、述語論理（一階述語論理）を基盤とし、「何をしたいか」（目標）を宣言するだけでシステムが自動的に証明・探索を行ってプログラムを実行するパラダイムである。

論理プログラミングの代表言語はProlog（Programming in Logic, 1972年, Alain Colmerauer）である。Prologではプログラムを「ファクト（事実）」と「ルール（規則）」の集合として記述し、「クエリ（質問）」を与えると、システムがバックトラッキング（試行錯誤）によって解を探索する。

命令型プログラムとの本質的な違いは「手順を書かない」点にある。たとえば「AはBの親であり、BはCの祖先である場合、AはCの祖先である」というルールを宣言すれば、Prologは自動的に推論を行う。人工知能・定理証明・自然言語処理・制約充足問題（CSP）の分野で強力なツールとなる。現代でもAspect-Oriented ProgrammingやDatalogとして論理プログラミングの考え方は生き続けている。

## 命令型 vs 論理型の比較

| 比較軸 | 命令型（Python等） | 論理型（Prolog） |
|--------|-------------------|-----------------|
| 記述スタイル | 手順を「どのように」書く | 関係を「何が成り立つか」書く |
| 実行制御 | プログラマが制御フローを指定 | 処理系が自動的に探索・バックトラック |
| データ | 変数は値を保持（可変） | 変数は「未束縛の項」（単一化）|
| 強み | 手続き処理・パフォーマンス | 探索・推論・制約充足 |
| 代表言語 | C, Python, Java | Prolog, Datalog, Mercury |

```prolog
% Prologのファクトとルール

% ファクト: 親子関係の定義
parent(tom, bob).
parent(tom, liz).
parent(bob, ann).
parent(bob, pat).

% ルール: 祖先関係を再帰的に定義
ancestor(X, Y) :- parent(X, Y).
ancestor(X, Y) :- parent(X, Z), ancestor(Z, Y).

% クエリ（?- で開始）:
% ?- ancestor(tom, ann).
% true.

% ?- ancestor(tom, Who).
% Who = bob ;
% Who = liz ;
% Who = ann ;
% Who = pat ;
% false.


% リストの操作
member(X, [X|_]).
member(X, [_|T]) :- member(X, T).

% ?- member(b, [a, b, c]).
% true.

% 自然数の足し算（ペアノ算術）
nat(0).
nat(s(X)) :- nat(X).

add(0, Y, Y).
add(s(X), Y, s(Z)) :- add(X, Y, Z).

% ?- add(s(s(0)), s(0), R).
% R = s(s(s(0))).  % 2 + 1 = 3
```

```python
# Pythonでバックトラッキングを模倣する（論理型のエッセンス）
def solve_nqueens(n: int):
    """Nクイーン問題: バックトラッキングで解を探索"""
    def is_safe(board, row, col):
        for r in range(row):
            c = board[r]
            if c == col or abs(c - col) == abs(r - row):
                return False
        return True

    def backtrack(board, row):
        if row == n:
            yield board[:]
            return
        for col in range(n):
            if is_safe(board, row, col):
                board[row] = col
                yield from backtrack(board, row + 1)
                # 暗黙のバックトラック: 次のcolを試す

    yield from backtrack([0] * n, 0)

solutions = list(solve_nqueens(4))
print(f"4-Queens solutions: {len(solutions)}")  # 2
print(solutions[0])  # [1, 3, 0, 2]
```

## 使用場面

- 知識ベースを使った推論エンジンや専門家システムの構築
- 制約充足問題（スケジューリング・パズル解法）の解決
- 自然言語処理での文法解析
- Datalogを用いたデータベースクエリや静的解析ツール

## 参考文献

- Sterling, L. & Shapiro, E. (1994). *The Art of Prolog*. MIT Press.
- Clocksin, W. F. & Mellish, C. S. (2003). *Programming in Prolog*. Springer.
- [SWI-Prolog 公式ドキュメント](https://www.swi-prolog.org/pldoc/doc_for?object=manual)

<AffiliateBanner site="language_navi" />
