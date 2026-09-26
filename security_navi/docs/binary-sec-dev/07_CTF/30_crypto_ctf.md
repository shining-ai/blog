import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 典型的な Crypto 問題の学び方（教育目的）

## CTF の Crypto カテゴリとは

> CTF の Crypto（暗号）カテゴリは、実際の暗号実装の弱点（鍵の短さ・XOR の性質・RSA のパラメータミス等）を数学的に分析して暗号文を解読し、フラグを取得する問題形式で、暗号理論と実装の両面から深い理解が得られる。

Crypto 問題は純粋な数学的思考力が求められる半面、アルゴリズムが理解できれば Python で比較的少ないコードで解けることが多い。また、実際の暗号実装の「落とし穴」を学ぶことで、セキュアな暗号設計の重要性を実感できる。

**CTF Crypto でよく出題されるテーマ：**
1. **古典暗号**：Caesar・Vigenere・置換暗号（頻度分析）
2. **XOR 暗号**：ワンタイムパッドの再利用・繰り返し鍵
3. **RSA の弱点**：小さい指数・同一 n・共通係数・低エントロピー素数
4. **AES の脆弱なモード**：ECB ペンギン・CBC ビットフリッピング・パディングオラクル
5. **ハッシュ**：長さ拡張攻撃・ハッシュ衝突
6. **ECC（楕円曲線）**：無効曲線攻撃・離散対数問題

## 典型的な Crypto 脆弱性と対策

| 脆弱性 | 問題のある実装 | 攻撃手法 | 正しい実装 |
|--------|-------------|---------|-----------|
| RSA 小さい公開指数 | e=3 で暗号化した平文が m^3 < n の場合 | 三乗根を取るだけで復号 | e=65537・パディング（OAEP）を使用 |
| XOR 鍵の再利用 | 同じ鍵で複数のメッセージを暗号化 | 既知平文で鍵を復元 | ストリーム暗号は鍵を絶対に再利用しない |
| AES-ECB | ブロックが独立に暗号化される | 同一ブロックの並び替えで改ざん | AES-GCM または AES-CBC + 認証 |
| 弱い乱数 | 時刻シードの乱数で RSA 鍵生成 | 素数の候補が少ないため列挙可能 | OS の CSPRNG（secrets モジュール）を使用 |

```python
# CTF Crypto の典型的な解法例（教育目的）
import math
from functools import reduce

# ===================================================
# 教育目的: 暗号の弱点を理解するためのコード
# 実際の CTF 問題は許可されたプラットフォームで解くこと
# ===================================================

# === 1. Caesar 暗号のブルートフォース ===
def caesar_brute_force(ciphertext: str) -> list[tuple[int, str]]:
    """
    Caesar 暗号を総当たりで解読する。
    英字のみシフトし、大文字小文字を保持する。
    """
    results = []
    for shift in range(26):
        decrypted = ""
        for c in ciphertext:
            if c.isalpha():
                base = ord('A') if c.isupper() else ord('a')
                decrypted += chr((ord(c) - base - shift) % 26 + base)
            else:
                decrypted += c
        results.append((shift, decrypted))
    return results


# === 2. XOR 鍵の再利用攻撃（Many-Time Pad）===
def xor_bytes(a: bytes, b: bytes) -> bytes:
    """2つのバイト列の XOR を取る"""
    return bytes(x ^ y for x, y in zip(a, b))


def xor_analysis_demo():
    """
    XOR ワンタイムパッドの鍵再利用の問題を示す。
    同じ鍵 K で c1 = m1 ^ K, c2 = m2 ^ K を暗号化すると、
    c1 ^ c2 = m1 ^ m2 となり、鍵なしで平文同士の XOR が得られる。
    既知平文攻撃でどちらか一方の平文がわかれば鍵が判明する。
    """
    key = b"secretkey12345678"
    m1 = b"Hello, World!    "
    m2 = b"flag{xor_reuse!} "

    c1 = xor_bytes(m1, key)
    c2 = xor_bytes(m2, key)

    # 攻撃: c1 ^ c2 = m1 ^ m2
    m1_xor_m2 = xor_bytes(c1, c2)

    # m1 が既知ならば m2 = (m1 ^ m2) ^ m1
    recovered_m2 = xor_bytes(m1_xor_m2, m1)
    print(f"XOR 鍵再利用: 既知平文 m1 から m2 を復元: {recovered_m2}")

    # 鍵の復元: key = c1 ^ m1
    recovered_key = xor_bytes(c1, m1)
    print(f"鍵の復元: {recovered_key}")


# === 3. RSA の小さい指数攻撃 ===
def rsa_small_exponent_attack(c: int, e: int) -> int | None:
    """
    RSA で e が小さく（例: e=3）かつ m^e < n の場合、
    単純に e 乗根を取るだけで復号できてしまう。
    CTF では e=3 で m が小さい場合に有効。
    """
    # m^e < n の場合は通常の整数として e 乗根を計算できる
    # Python 3.11+ では int.bit_length() と math.isqrt の組み合わせで正確な根を計算可能

    # 簡略化した実装（教育目的）
    m = round(c ** (1 / e))

    # 近傍を確認
    for candidate in range(max(0, m - 2), m + 3):
        if candidate ** e == c:
            return candidate
    return None


# === 4. AES-ECB の特性（ブロックが独立）===
def demonstrate_aes_ecb_weakness():
    """
    AES-ECB モードでは同一の入力ブロック（16バイト）が
    常に同一の暗号文ブロックに変換される。
    これにより、パターンが漏洩してしまう。
    """
    print("\n=== AES-ECB の脆弱性 ===")
    print("同じ 16 バイトブロックは常に同じ暗号文ブロックになる")
    print("→ 繰り返しパターンが暗号文からも見えてしまう（ECB ペンギン問題）")
    print("→ CTF では admin=true のブロックを別のリクエストからコピーして権限昇格する問題が多い")
    print("対策: AES-GCM（認証付き暗号化）または AES-CBC + HMAC を使用する")


# === 解法の流れ ===
print("=== CTF Crypto 解法フロー ===\n")

crypto_workflow = [
    "1. 暗号文の形式確認（Base64・Hex・バイナリ）",
    "2. 使用している暗号アルゴリズムの特定（問題文・コードから）",
    "3. パラメータの確認（RSA ならば n, e, c のサイズ）",
    "4. 脆弱性の特定（小さい指数・鍵再利用・ECB・弱い乱数）",
    "5. 攻撃コードを Python で実装（gmpy2・pycryptodome が便利）",
    "6. フラグを取得して形式（flag{...}）を確認",
]
for step in crypto_workflow:
    print(f"  {step}")

# デモ実行
print("\n=== Caesar 暗号 ブルートフォース ===")
cipher = "Ifmmp, Xpsme!"
for shift, plain in caesar_brute_force(cipher)[:5]:
    print(f"  シフト {shift:2d}: {plain}")

print("\n=== XOR 鍵再利用攻撃デモ ===")
xor_analysis_demo()
demonstrate_aes_ecb_weakness()

print("\n=== RSA 小さい指数攻撃デモ ===")
# e=3, m=42 の場合: c = 42^3 = 74088
e, m_original = 3, 42
c = m_original ** e
recovered = rsa_small_exponent_attack(c, e)
print(f"  暗号文 c = {m_original}^{e} = {c}")
print(f"  復号結果: {recovered}  (元の値: {m_original})")
```

## 使用場面

- CryptoHack・picoCTF の Crypto 問題で暗号の弱点を体験的に学ぶ
- RSA・AES の実装レビューで「e が小さすぎないか」「ECB モードを使っていないか」を確認する
- SageMath・gmpy2 を使った数論的計算の習熟
- 暗号ライブラリの選定（古い・危険な実装を避けるための知識の習得）
- セキュアな暗号実装の設計（OAEP・GCM・CSPRNG の重要性の理解）

## 参考文献

- [CryptoHack - Cryptography Learning Platform](https://cryptohack.org/)
- [SageMath - Mathematical Software](https://www.sagemath.org/)
- [pycryptodome - Python Cryptography Library](https://pycryptodome.readthedocs.io/)
- [An Introduction to Mathematical Cryptography (Springer)](https://link.springer.com/book/10.1007/978-1-4939-1711-2)

<AffiliateBanner site="security_navi" />
