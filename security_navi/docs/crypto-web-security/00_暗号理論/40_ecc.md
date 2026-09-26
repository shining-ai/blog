import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 楕円曲線暗号（ECC）

## ECC とは

> 楕円曲線暗号（ECC: Elliptic Curve Cryptography）は、有限体上の楕円曲線における離散対数問題（ECDLP）の困難さを安全性の根拠とする公開鍵暗号方式である。

ECC は RSA と比較して、はるかに短い鍵長で同等のセキュリティ強度を実現できる。256ビットの ECC 鍵は RSA-3072 と同程度の安全性を持つとされており、モバイルデバイスや IoT など計算資源が制限された環境での利用に特に適している。

**楕円曲線の定義：** y² = x³ + ax + b（mod p）という方程式で定義される点の集合に無限遠点を加えたもの。曲線上の点には加算演算が定義でき、これを繰り返すことで「スカラー倍算」を行える。

**スカラー倍算の困難性：** 点 G（ベースポイント）に対し d 回加算した点 Q = dG を計算するのは容易だが、Q と G から d を逆算する（楕円曲線離散対数問題）のは現在の計算技術では困難とされる。

**主要な曲線：**
- **P-256（secp256r1）**：NIST が標準化。TLS で広く使用
- **Curve25519**：Bernstein 設計。高速・安全性評価が高い。Signal/SSH での利用
- **secp256k1**：Bitcoin が採用した曲線

ECC ベースの署名アルゴリズム ECDSA や、鍵交換の ECDH は現代の TLS・SSH・コード署名で標準的に使われる。

## ECC vs RSA セキュリティ強度比較

| 対称鍵強度 | RSA 鍵長 | ECC 鍵長 |
|-----------|---------|---------|
| 80 bit | 1024 bit | 160 bit |
| 112 bit | 2048 bit | 224 bit |
| 128 bit | 3072 bit | 256 bit |
| 192 bit | 7680 bit | 384 bit |
| 256 bit | 15360 bit | 521 bit |

## 主要 ECC 曲線の特徴

| 曲線名 | 鍵長 | 用途 | 特徴 |
|--------|------|------|------|
| P-256 | 256 bit | TLS, コード署名 | NIST標準 |
| P-384 | 384 bit | 高安全性要求 | NSA Suite B |
| Curve25519 | 255 bit | ECDH (X25519) | 高速・タイミング攻撃耐性 |
| Ed25519 | 255 bit | デジタル署名 | 決定論的署名 |
| secp256k1 | 256 bit | Bitcoin, Ethereum | 暗号通貨 |

```python
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey
from cryptography.hazmat.primitives import serialization

# --- Ed25519 デジタル署名 ---
# 鍵生成
signing_key = Ed25519PrivateKey.generate()
verify_key = signing_key.public_key()

# 署名
message = b"Message authenticated with Ed25519"
signature = signing_key.sign(message)
print(f"署名長: {len(signature)} バイト（固定64バイト）")

# 検証
try:
    verify_key.verify(signature, message)
    print("Ed25519 署名検証: 成功")
except Exception:
    print("署名検証: 失敗")

# --- X25519 ECDH 鍵交換 ---
# アリスとボブがそれぞれ鍵ペアを生成
alice_private = X25519PrivateKey.generate()
alice_public = alice_private.public_key()

bob_private = X25519PrivateKey.generate()
bob_public = bob_private.public_key()

# 相手の公開鍵を使って共有秘密を計算
alice_shared = alice_private.exchange(bob_public)
bob_shared = bob_private.exchange(alice_public)

print(f"\nアリスの共有秘密: {alice_shared.hex()}")
print(f"ボブの共有秘密:   {bob_shared.hex()}")
print(f"共有秘密は一致: {alice_shared == bob_shared}")

# 公開鍵のシリアライズ（送信用）
pub_bytes = alice_public.public_bytes(
    encoding=serialization.Encoding.Raw,
    format=serialization.PublicFormat.Raw
)
print(f"\nX25519 公開鍵: {pub_bytes.hex()} ({len(pub_bytes)} バイト)")
```

## 使用場面

- TLS 1.3 の鍵交換（X25519 が最も一般的）
- SSH 鍵認証（Ed25519 が推奨されている）
- Bitcoin・Ethereum のアドレス生成と署名（secp256k1）
- Signal Protocol の二重ラチェットアルゴリズム

## 参考文献

- [RFC 8422 - ECC Cipher Suites for TLS](https://www.rfc-editor.org/rfc/rfc8422)
- [RFC 8032 - Edwards-Curve Digital Signature Algorithm (EdDSA)](https://www.rfc-editor.org/rfc/rfc8032)
- [NIST SP 800-186 - Recommendations for Discrete Logarithm-Based Cryptography: Elliptic Curve Domain Parameters](https://csrc.nist.gov/publications/detail/sp/800-186/final)

<AffiliateBanner site="security_navi" />
