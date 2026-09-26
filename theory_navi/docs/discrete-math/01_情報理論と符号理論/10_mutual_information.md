import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 相互情報量と条件付きエントロピー

## 相互情報量とは

> 相互情報量 I(X;Y) とは2つの確率変数 X と Y が「どれだけ互いの情報を共有しているか」を測る非負の量であり、I(X;Y) = H(X) - H(X|Y) = H(Y) - H(Y|X) と表される。

**条件付きエントロピー** H(X|Y) は、Y の値を知った後の X の残りの不確実性を測ります。H(X|Y) = Σ_y p(y) H(X|Y=y) = -Σ_{x,y} p(x,y) log_2 p(x|y) と定義されます。Y の観測によって X の不確実性が下がるため、常に H(X|Y) ≤ H(X) が成立します（情報処理不等式）。

**相互情報量** I(X;Y) = H(X) + H(Y) - H(X,Y) = H(X) - H(X|Y) は、Y の観測によって X の不確実性がどれだけ減ったか（または逆方向）を示します。I(X;Y) = 0 は X と Y が独立であることと同値です。相互情報量は対称 I(X;Y) = I(Y;X) で常に非負です。

**KL ダイバージェンス**（相対エントロピー）D_KL(P||Q) = Σ p(x) log(p(x)/q(x)) は2つの分布 P と Q の「距離」を表す非対称な非負量です（距離の公理は満たさない）。相互情報量は I(X;Y) = D_KL(P(X,Y) || P(X)P(Y)) と表せ、同時分布と周辺分布の積との「ずれ」を測ります。

## 情報量の関係

| 量 | 定義 | 意味 |
|----|------|------|
| H(X) | -Σ p(x) log p(x) | X の不確実性 |
| H(X\|Y) | H(X,Y) - H(Y) | Y を知った後の X の不確実性 |
| H(X,Y) | -Σ p(x,y) log p(x,y) | X と Y の同時不確実性 |
| I(X;Y) | H(X) - H(X\|Y) | X と Y の共有情報量 |
| D_KL(P\|\|Q) | Σ p log(p/q) | P と Q の相違度 |

```python
import math
from itertools import product

def entropy(probs):
    return -sum(p * math.log2(p) for p in probs if p > 0)

def joint_entropy(joint):
    """joint: {(x,y): p(x,y)} の辞書"""
    return -sum(p * math.log2(p) for p in joint.values() if p > 0)

def conditional_entropy(joint):
    """H(X|Y): joint は {(x,y): p(x,y)}"""
    # 周辺分布 p(y)
    py = {}
    for (x, y), p in joint.items():
        py[y] = py.get(y, 0) + p
    # H(X,Y) - H(Y)
    return joint_entropy(joint) - entropy(py.values())

def mutual_information(joint):
    """I(X;Y) = H(X) + H(Y) - H(X,Y)"""
    px = {}
    py = {}
    for (x, y), p in joint.items():
        px[x] = px.get(x, 0) + p
        py[y] = py.get(y, 0) + p
    return entropy(px.values()) + entropy(py.values()) - joint_entropy(joint)

def kl_divergence(p: dict, q: dict) -> float:
    """D_KL(P||Q)"""
    return sum(p[x] * math.log2(p[x] / q[x]) for x in p if p[x] > 0)

# 例: BSC (Binary Symmetric Channel) p=0.1
# X: 入力, Y: 出力
p_err = 0.1
joint_bsc = {
    (0, 0): 0.5 * (1 - p_err),
    (0, 1): 0.5 * p_err,
    (1, 0): 0.5 * p_err,
    (1, 1): 0.5 * (1 - p_err),
}

hx = entropy([0.5, 0.5])
hy_given_x = conditional_entropy({(y,x): p for (x,y),p in joint_bsc.items()})  # H(X|Y)
hx_given_y = conditional_entropy(joint_bsc)
ixy = mutual_information(joint_bsc)

print(f"H(X) = {hx:.4f} bit")
print(f"H(X|Y) = {hx_given_y:.4f} bit")
print(f"I(X;Y) = {ixy:.4f} bit")
print(f"チャネル容量 (等確率入力): {ixy:.4f} bit")

# KL ダイバージェンスの例
P = {0: 0.5, 1: 0.5}         # 公平コイン
Q = {0: 0.9, 1: 0.1}         # 偏ったコイン
print(f"D_KL(P||Q) = {kl_divergence(P, Q):.4f}")  # P から Q へのずれ
print(f"D_KL(Q||P) = {kl_divergence(Q, P):.4f}")  # 非対称を確認
```

## 使用場面

- **通信路容量**: チャネル容量 C = max_{P(X)} I(X;Y) は最大転送可能情報量を与える
- **特徴選択**: 機械学習の特徴選択で目的変数との相互情報量が高い特徴を選ぶ
- **独立性検定**: I(X;Y) = 0 が独立性の尺度として使われ、依存関係を検出する
- **変分推論**: KL ダイバージェンスは VAE などの変分ベイズ法の目的関数に現れる

## 参考文献

- Cover, T. M. & Thomas, J. A. "Elements of Information Theory" (Wiley)
- MacKay, D. J. C. "Information Theory, Inference and Learning Algorithms" (Cambridge, 無料PDF公開)

<AffiliateBanner site="theory_navi" />
