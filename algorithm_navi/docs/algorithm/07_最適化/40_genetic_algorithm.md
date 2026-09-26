import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 遺伝的アルゴリズム (Genetic Algorithm)

## 遺伝的アルゴリズムとは

遺伝的アルゴリズム（GA）とは、

> 生物の進化（選択・交叉・突然変異）を模倣し、解の集団を世代ごとに進化させることで最適解に近づく集団ベースのメタヒューリスティクス

です。
<br/>

単一解を改善する局所探索・焼きなまし法と異なり、**解の集団（個体群）を並列に探索**するため、多様な探索空間のカバーと局所最適回避を両立できます。

## 進化のサイクル

```
世代 t の個体群 P(t):
  個体1: [1, 0, 1, 1, 0]  適応度: 12
  個体2: [0, 1, 1, 0, 1]  適応度:  9
  個体3: [1, 1, 0, 1, 0]  適応度: 14
  個体4: [0, 0, 1, 0, 1]  適応度:  6

                    ↓ 選択（ルーレット or トーナメント）
親1: [1, 1, 0, 1, 0]  親2: [1, 0, 1, 1, 0]

                    ↓ 交叉（一点交叉）
子1: [1, 1, 0 | 1, 0]  → [1, 1, 0, 1, 0]
子2: [1, 0, 1 | 1, 0]  → [1, 0, 1, 1, 0]

                    ↓ 突然変異（ビット反転）
子1': [1, 1, 0, 0, 0]  （4番目が反転）

世代 t+1: 既存の個体群と子世代をマージして次世代を構成
```

## 主要なオペレータ

| オペレータ | 役割 | 代表的な手法 |
| --- | --- | --- |
| 選択 | 優秀な個体を親として選ぶ | ルーレット・トーナメント・ランク |
| 交叉 | 2つの親から子を生成 | 一点・二点・一様交叉・順列交叉(OX) |
| 突然変異 | 多様性を維持 | ビット反転・スワップ・挿入 |
| エリート保存 | 最良個体を次世代に引き継ぐ | エリート戦略 |

## 実装

```python title="遺伝的アルゴリズム（汎用）"
import random
from typing import Callable

def genetic_algorithm(
    pop_size:    int,
    chrom_len:   int,
    fitness_fn:  Callable[[list], float],
    generations: int = 200,
    cx_rate:     float = 0.8,
    mut_rate:    float = 0.02,
    elite_n:     int   = 2,
) -> tuple[list, float]:
    """
    0-1 染色体の遺伝的アルゴリズム（最大化）
    fitness_fn: 染色体リスト → 適応度
    """
    # 初期集団
    pop = [[random.randint(0,1) for _ in range(chrom_len)]
           for _ in range(pop_size)]

    def tournament(pop, fits, k=3):
        """トーナメント選択"""
        cands = random.sample(range(len(pop)), k)
        return pop[max(cands, key=lambda i: fits[i])]

    best_chrom, best_fit = None, float('-inf')

    for gen in range(generations):
        fits = [fitness_fn(c) for c in pop]

        # エリート保存
        elite_idx = sorted(range(len(pop)), key=lambda i: fits[i], reverse=True)[:elite_n]
        new_pop   = [pop[i][:] for i in elite_idx]

        # 交叉と突然変異で新世代を生成
        while len(new_pop) < pop_size:
            p1 = tournament(pop, fits)
            p2 = tournament(pop, fits)

            # 一点交叉
            if random.random() < cx_rate:
                pt = random.randint(1, chrom_len - 1)
                c1 = p1[:pt] + p2[pt:]
                c2 = p2[:pt] + p1[pt:]
            else:
                c1, c2 = p1[:], p2[:]

            # 突然変異
            for child in (c1, c2):
                for i in range(chrom_len):
                    if random.random() < mut_rate:
                        child[i] ^= 1
                new_pop.append(child)

        pop = new_pop[:pop_size]

        # 最良解の更新
        for c in pop:
            f = fitness_fn(c)
            if f > best_fit:
                best_fit, best_chrom = f, c[:]

    return best_chrom, best_fit
```

```python title="ナップサック問題への適用"
def knapsack_fitness(chrom, weights, values, capacity):
    total_w = sum(w * g for w, g in zip(weights, chrom))
    total_v = sum(v * g for v, g in zip(values,  chrom))
    if total_w > capacity:
        return 0  # 制約違反はペナルティ
    return total_v

weights  = [2, 3, 4, 5, 6, 2, 3]
values   = [3, 4, 5, 6, 7, 2, 4]
capacity = 12

best, best_val = genetic_algorithm(
    pop_size=50, chrom_len=len(weights),
    fitness_fn=lambda c: knapsack_fitness(c, weights, values, capacity),
    generations=300,
)
selected = [f"item{i}" for i, g in enumerate(best) if g]
print(f"最大価値: {best_val}")
print(f"選択: {selected}")
```

```python title="順列染色体（TSP など）の交叉: Order Crossover (OX)"
def order_crossover(parent1: list[int], parent2: list[int]) -> list[int]:
    """順列を保つ交叉（Order Crossover）"""
    n     = len(parent1)
    a, b  = sorted(random.sample(range(n), 2))
    child = [-1] * n
    # 区間 [a, b] をそのままコピー
    child[a:b+1] = parent1[a:b+1]
    # 残りを parent2 の順で埋める
    fill_vals = [x for x in parent2 if x not in child]
    idx = 0
    for i in range(n):
        if child[i] == -1:
            child[i] = fill_vals[idx]
            idx += 1
    return child
```

## 焼きなまし法との比較

| | 焼きなまし法 | 遺伝的アルゴリズム |
| --- | --- | --- |
| 解の数 | 単一 | 集団（多様性） |
| 局所最適の回避 | 確率的受理 | 交叉による多様性 |
| 並列化 | 難しい | 容易（個体ごとに並列評価） |
| チューニング | T初期値・冷却率 | 集団サイズ・交叉率・突然変異率 |
| 適用のしやすさ | 高い | 染色体設計が必要 |

## 使用場面

- **スケジューリング**: ジョブショップ問題・シフト最適化
- **機械学習の AutoML**: ハイパーパラメータ最適化・ニューラルネットアーキテクチャ探索
- **エンジニアリング設計**: 翼形状・アンテナ形状の最適化
- **組合せ最適化**: TSP・ナップサック・グラフ彩色

## 参考文献

<AffiliateBanner site="antbook" />
