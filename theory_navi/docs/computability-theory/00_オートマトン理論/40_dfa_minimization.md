import AffiliateBanner from '@site/src/components/AffiliateBanner';

# DFA の最小化

## DFA の最小化とは

> DFA の最小化とは、与えられた DFA と等価（同じ言語を認識する）でありながら状態数が最少の DFA を求める手続きであり、区別不能な状態を同一視することで実現される。

同じ正規言語を認識する DFA は無数に存在しますが、そのなかで状態数が最少の DFA（最小 DFA）は実質的に一意（同型を除いて）に定まります。これはミュアーヒル-ネロードの定理（Myhill-Nerode theorem）に基づいており、言語の「等価クラス」の数が最小 DFA の状態数と一致します。

最小化の主要アルゴリズムはホップクロフトのアルゴリズム（Hopcroft's algorithm）またはテーブル充填法（Table-Filling algorithm / Mark algorithm）です。テーブル充填法の手順は次の通りです。まず受理状態と非受理状態のペアを「区別可能」として印をつけます。次に状態ペア (p, q) に対し、ある記号 a によって遷移先 (δ(p,a), δ(q,a)) が区別可能なら (p, q) も区別可能とします。区別可能なペアがなくなるまで繰り返し、最後に区別不能な状態を統合します。

最小 DFA はパターンマッチング・コンパイラ・ハードウェア設計で状態数削減のために使われます。

## テーブル充填法の手順

| ステップ | 操作 |
|---------|------|
| 1. 初期化 | 受理状態と非受理状態の全ペアを区別可能としてマーク |
| 2. 伝播 | δ(p,a) と δ(q,a) が区別可能なら (p,q) も区別可能にマーク |
| 3. 反復 | 変化がなくなるまで 2 を繰り返す |
| 4. 統合 | マークされていないペアは区別不能 → 同一視して状態を統合 |
| 5. 結果 | 等価クラスを新しい状態とした最小 DFA を構築 |

```python
def minimize_dfa(states, alphabet, transition, start, accept):
    """テーブル充填法による DFA 最小化"""
    # (p, q) のペア（p < q の辞書順）を管理
    state_list = sorted(states)
    n = len(state_list)
    idx = {s: i for i, s in enumerate(state_list)}

    # distinguishable[i][j] = True なら (state_list[i], state_list[j]) は区別可能
    dist = [[False] * n for _ in range(n)]

    # 初期化: 受理 vs 非受理
    for i in range(n):
        for j in range(i + 1, n):
            p, q = state_list[i], state_list[j]
            if (p in accept) != (q in accept):
                dist[i][j] = True

    # 不動点まで繰り返す
    changed = True
    while changed:
        changed = False
        for i in range(n):
            for j in range(i + 1, n):
                if dist[i][j]:
                    continue
                p, q = state_list[i], state_list[j]
                for a in alphabet:
                    dp = transition.get((p, a))
                    dq = transition.get((q, a))
                    if dp is None or dq is None:
                        continue
                    ii, jj = sorted([idx[dp], idx[dq]])
                    if ii != jj and dist[ii][jj]:
                        dist[i][j] = True
                        changed = True
                        break

    # 等価クラスを構築（Union-Find の簡易版）
    parent = {s: s for s in states}
    def find(x):
        while parent[x] != x:
            x = parent[x]
        return x
    for i in range(n):
        for j in range(i + 1, n):
            if not dist[i][j]:
                ri, rj = find(state_list[i]), find(state_list[j])
                if ri != rj:
                    parent[rj] = ri  # 統合

    classes = {}
    for s in states:
        r = find(s)
        classes.setdefault(r, []).append(s)

    print("等価クラス（区別不能な状態のグループ）:")
    for rep, members in sorted(classes.items()):
        print(f"  {{{', '.join(sorted(members))}}}")
    return classes

# 例: 最小化が必要な DFA（冗長な状態を持つ）
# 言語: {w | w は b を含む}
# 状態: q0(開始), q1(b を読んだ=受理), q2(q0 と等価な冗長状態)
states = {'q0', 'q1', 'q2'}
alphabet = {'a', 'b'}
transition = {
    ('q0', 'a'): 'q2',
    ('q0', 'b'): 'q1',
    ('q1', 'a'): 'q1',
    ('q1', 'b'): 'q1',
    ('q2', 'a'): 'q0',  # q2 は q0 と等価
    ('q2', 'b'): 'q1',
}
minimize_dfa(states, alphabet, transition, 'q0', {'q1'})
# q0 と q2 が等価クラスに統合される
```

## 使用場面

- **コンパイラ最適化**: 字句解析器の DFA を最小化して実行速度と使用メモリを削減する
- **ハードウェア論理合成**: 有限状態機械の状態数を最小化して回路の面積と電力消費を削減する
- **パターンマッチング**: 大規模なテキスト処理で最小 DFA を使うことで高速なマッチングを実現する
- **等価性検査**: 2つの DFA が同じ言語を認識するかを最小化後に構造比較で確認する

## 参考文献

- Hopcroft, J. E. "An n log n algorithm for minimizing states in a finite automaton" (1971)
- Sipser, M. "Introduction to the Theory of Computation" (Cengage Learning)
- 富田悦次・横森貴「オートマトン・言語理論」(森北出版)

<AffiliateBanner site="theory_navi" />
