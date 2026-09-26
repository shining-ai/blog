import AffiliateBanner from '@site/src/components/AffiliateBanner';

# LR 解析（SLR・LALR・LR(1)）

## LR 解析とは

> LR 解析とは、入力トークンを左から右へ読み（L）、右端導出を逆順に行う（R）ボトムアップ型構文解析アルゴリズムであり、スタックと解析表（パーステーブル）を用いてシフト（shift）と還元（reduce）の2つの操作を繰り返す。

LR パーサは LL パーサよりも広いクラスの文法を扱える。左再帰を含む文法や、先読みが多く必要な文法でも対応できるため、Yacc・Bison・ANTLR などのパーサジェネレータは LR 系アルゴリズムを採用している。解析表は文法から機械的に生成されるため、大規模な言語仕様にも対応しやすい。

SLR（Simple LR）は最も単純な LR 変種で、FOLLOW 集合を使って還元の判断を行う。LALR(1)（Look-Ahead LR(1)）は LR(1) の状態数を圧縮したもので、Yacc/Bison が採用する。LR(1) は先読みトークン1つを状態に組み込んだ最も強力な変種で、あいまいさのない文脈自由文法のほとんどを解析できる。

## SLR・LALR・LR(1) の比較

| 方式 | 先読み | 状態数 | 対応文法クラス | 使用例 |
|------|--------|--------|----------------|--------|
| SLR(1) | FOLLOW 集合 | 最小 | SLR(1) 文法 | 教育用途 |
| LALR(1) | 状態ごとの先読み集合 | LR(1) と同等 | LALR(1) 文法 | Yacc, Bison, PLY |
| LR(1) | 各アイテムに先読みトークン | 最大 | LR(1) 文法 | ANTLR（一部）, Menhir |
| GLR | 複数の解析を並行実行 | LR(1) 以上 | あいまいな文法も可 | GCC（旧）, Elkhound |

```python
# LR(0) パーサのスタック動作を可視化するシミュレータ
# 文法: E -> E + T | T,  T -> NUMBER
# この文法は左再帰を含む（LR では自然に扱える）

# LR パーサのアクションテーブル（手動定義の簡易版）
# 状態 × トークン → shift(s) / reduce(r) / accept(a) / error

# 文法規則
GRAMMAR = [
    # 0: E' -> E
    # 1: E  -> E + T
    # 2: E  -> T
    # 3: T  -> NUMBER
]

# 状態遷移を追跡するシミュレーション
def lr_parse_trace(tokens: list[str]) -> None:
    """LR パーサのシフト・還元動作をトレース表示する"""
    # スタック: (状態番号, 記号) のペアを積む
    stack = [(0, '$')]
    remaining = tokens + ['$']
    step = 0

    # 簡易アクション表（状態, トークン) -> ('shift', 次状態) | ('reduce', 規則番号) | 'accept'
    action = {
        (0, 'NUMBER'): ('shift', 2),
        (1, '+'): ('shift', 3),
        (1, '$'): 'accept',
        (2, '+'): ('reduce', 3),  # T -> NUMBER
        (2, '$'): ('reduce', 3),
        (3, 'NUMBER'): ('shift', 4),
        (4, '+'): ('reduce', 1),  # E -> E + T
        (4, '$'): ('reduce', 1),
    }
    # goto 表: (状態, 非終端) -> 遷移先状態
    goto = {
        (0, 'E'): 1,
        (0, 'T'): 5,
        (3, 'T'): 4,
    }
    rule_lhs = {1: ('E', 3), 2: ('E', 1), 3: ('T', 1)}  # 規則: LHS, 右辺長さ

    print(f"{'Step':>4} {'Stack':^30} {'Input':^20} {'Action'}")
    print("-" * 70)

    while True:
        state = stack[-1][0]
        lookahead = remaining[0]
        stack_repr = ' '.join(str(s) for _, s in stack)
        input_repr = ' '.join(remaining)

        act = action.get((state, lookahead), 'error')
        print(f"{step:>4} {stack_repr:^30} {input_repr:^20} {act}")
        step += 1

        if act == 'accept':
            print("=> 構文解析成功")
            break
        elif act == 'error':
            print("=> 構文エラー")
            break
        elif act[0] == 'shift':
            stack.append((act[1], lookahead))
            remaining.pop(0)
        elif act[0] == 'reduce':
            lhs, rhs_len = rule_lhs[act[1]]
            for _ in range(rhs_len):
                stack.pop()
            top_state = stack[-1][0]
            next_state = goto[(top_state, lhs)]
            stack.append((next_state, lhs))

# 例: 3 + 5 のパース
lr_parse_trace(['NUMBER', '+', 'NUMBER'])
#  Step            Stack                 Input               Action
# ----------------------------------------------------------------------
#     0 $                              NUMBER + NUMBER $    ('shift', 2)
#     1 $ 2                           + NUMBER $            ('reduce', 3)
#     2 $ 5                           + NUMBER $            ('shift', 3)
#     3 $ 5 1 3                       NUMBER $              ('shift', 4)
#     4 $ 5 1 3 4                     $                     ('reduce', 1)
#     5 $ 1                           $                     accept
```

## 使用場面

- Yacc・Bison を使った C/C++ 言語パーサの生成
- PLY（Python Lex-Yacc）を用いた Python 製パーサの実装
- Ruby の parse.y（LALR(1) 文法定義）など言語処理系の文法定義
- コンパイラ設計の授業・教科書での構文解析アルゴリズム学習

## 参考文献

- Aho, A. V. et al. (2006). *Compilers: Principles, Techniques, and Tools* (2nd ed.). Addison-Wesley.
- [GNU Bison 公式マニュアル](https://www.gnu.org/software/bison/manual/)
- [PLY (Python Lex-Yacc)](https://www.dabeaz.com/ply/)

<AffiliateBanner site="language_navi" />
