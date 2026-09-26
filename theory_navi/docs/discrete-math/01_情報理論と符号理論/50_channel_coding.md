import AffiliateBanner from '@site/src/components/AffiliateBanner';

# チャネル符号化定理（シャノンの第2定理）

## チャネル符号化定理とは

> シャノンの第2定理（チャネル符号化定理）は「通信路容量 C を超えない転送速度 R < C で通信するとき、符号長を十分に長くすることで誤り確率を任意に小さくする符号が存在する」という定理である。

チャネル符号化（Channel Coding）は、雑音のある通信路を通じた信頼性の高い通信を実現する技術です。通信路に送られた記号は誤って受信されることがあり、その誤り率は通信路モデルで記述されます。最も基本的な**二値対称通信路**（BSC: Binary Symmetric Channel）では各ビットが確率 p で反転します。

**チャネル容量** C は C = max_{P(X)} I(X;Y) ビット/チャンネル使用で定義され、シャノンの第2定理はこの容量が到達可能であることを保証します。BSC の容量は C = 1 - H_b(p) = 1 - (-p log_2 p - (1-p) log_2(1-p)) です（p = 0 か p = 1 で C = 1、p = 1/2 で C = 0）。

逆定理も成立し、R > C の速度では誤り確率を0に近づけることは不可能です。シャノンの定理は存在定理であり、具体的な符号構成を与えませんが、**ランダム符号化**の証明が鍵となります。実用的な符号として畳み込み符号・LDPC 符号・ターボ符号がシャノン限界に迫る性能を持ちます。

## 主要な通信路モデルと容量

| 通信路 | パラメータ | 容量 C |
|--------|-----------|--------|
| 二値対称通信路 (BSC) | 反転確率 p | 1 - H_b(p) |
| 二値消失通信路 (BEC) | 消失確率 ε | 1 - ε |
| AWGN 通信路 | SNR = S/N | (1/2) log_2(1 + SNR) |
| 無雑音通信路 | — | log_2(|X|) |
| 完全雑音通信路 | p = 1/2 | 0 |

```python
import math

# 1. 二値エントロピー関数
def h_binary(p: float) -> float:
    """H_b(p) = -p log_2(p) - (1-p) log_2(1-p)"""
    if p <= 0 or p >= 1:
        return 0.0
    return -p * math.log2(p) - (1-p) * math.log2(1-p)

# 2. BSC のチャネル容量
def bsc_capacity(p: float) -> float:
    """二値対称通信路の容量 C = 1 - H_b(p)"""
    return 1 - h_binary(p)

# 3. BEC のチャネル容量
def bec_capacity(epsilon: float) -> float:
    """二値消失通信路の容量 C = 1 - ε"""
    return 1 - epsilon

# 4. AWGN チャネル容量（シャノン-ハートレーの式）
def awgn_capacity(snr_linear: float) -> float:
    """C = (1/2) log_2(1 + SNR) [bit/channel use]"""
    return 0.5 * math.log2(1 + snr_linear)

# BSC の容量テーブル
print("BSC チャネル容量:")
print(f"{'誤り率 p':>10} | {'容量 C (bit)':>12}")
print("-" * 28)
for p in [0.0, 0.01, 0.05, 0.1, 0.2, 0.5]:
    print(f"{p:>10.3f} | {bsc_capacity(p):>12.4f}")

# AWGN チャネル容量（SNR を dB で入力）
print("\nAWGN チャネル容量（シャノン限界）:")
print(f"{'SNR (dB)':>10} | {'SNR (linear)':>14} | {'容量 (bit/Hz)':>14}")
print("-" * 44)
for snr_db in [-5, 0, 5, 10, 20, 30]:
    snr_lin = 10 ** (snr_db / 10)
    C = awgn_capacity(snr_lin) * 2  # 帯域幅 1Hz あたり
    print(f"{snr_db:>10} | {snr_lin:>14.2f} | {C:>14.4f}")

# 繰り返し符号の誤り率（レート R = 1/n のブロック符号）
def repetition_code_error(p: float, n: int) -> float:
    """n 回繰り返し符号の多数決復号誤り率"""
    # 過半数以上が誤りのとき復号失敗
    from math import comb
    error = 0.0
    for k in range(n//2 + 1, n + 1):
        error += comb(n, k) * (p**k) * ((1-p)**(n-k))
    return error

p = 0.1
print(f"\n繰り返し符号 (p={p}) の誤り率:")
for n in [1, 3, 5, 7, 11]:
    rate = 1 / n
    err = repetition_code_error(p, n)
    print(f"  n={n}, R={rate:.3f}: Pe = {err:.6f}")
```

## 使用場面

- **通信システム設計**: Wi-Fi・LTE・5G の変調・符号化方式（MCS）選択にシャノン限界を参照する
- **LDPC・ターボ符号**: 4G/5G・衛星通信でシャノン限界に 0.1 dB 以内に迫る実用符号
- **光通信**: 光ファイバ伝送でのフォワード誤り訂正（FEC）の設計基準
- **深宇宙探査**: Voyager・Curiosity などの宇宙探査機の通信にチャネル符号化が使われた

## 参考文献

- Shannon, C. E. "A Mathematical Theory of Communication" (Bell System Technical Journal, 1948)
- Proakis, J. G. "Digital Communications" (McGraw-Hill)

<AffiliateBanner site="theory_navi" />
