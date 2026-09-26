import AffiliateBanner from '@site/src/components/AffiliateBanner';

# デジタル署名

## デジタル署名とは

> デジタル署名は、公開鍵暗号を利用して電子文書の認証・完全性・否認防止を実現する技術であり、送信者が秘密鍵でダイジェストを署名し、受信者が公開鍵で検証する仕組みである。

デジタル署名は「誰が」「何に」署名したかを証明する。物理的な手書き署名と異なり、1ビットでも文書が変更されると検証が失敗するため完全性も保証する。

**デジタル署名の3つの性質：**
1. **認証（Authentication）**：署名は秘密鍵の持ち主のみが生成できるため、送信者を証明する
2. **完全性（Integrity）**：文書が改ざんされると署名検証が失敗する
3. **否認防止（Non-repudiation）**：後から「署名していない」と主張できない

**署名の手順：**
1. 文書のハッシュ値 h = H(M) を計算
2. 秘密鍵で h に署名 → 署名値 σ
3. 文書 M と署名 σ を送信
4. 受信者は公開鍵で σ を検証し、H(M) と一致するか確認

**主要な署名方式：**
- **RSA-PSS**：RSA と SHA-256 の組み合わせ。大規模な PKI インフラで広く使用
- **ECDSA**：楕円曲線を使った署名。TLS 証明書・コード署名に普及
- **Ed25519**：Edwards 曲線を使った署名。決定論的（乱数不使用）で安全性評価が高い

ECDSA は乱数生成の品質に依存し、同じ乱数を2回使うと秘密鍵が漏洩する危険がある（Sony PS3 が被害を受けた事例）。Ed25519 はこの問題を回避した設計になっている。

## 署名方式の比較

| 方式 | 鍵長 | 署名長 | 速度 | 乱数依存 | 用途 |
|------|------|--------|------|---------|------|
| RSA-PSS-2048 | 2048 bit | 256 B | 遅い | 不要 | PKI, コード署名 |
| ECDSA P-256 | 256 bit | ~72 B | 速い | 必要（危険） | TLS証明書 |
| Ed25519 | 255 bit | 64 B | 最速 | 不要（決定論的） | SSH, Signal |
| Ed448 | 448 bit | 114 B | 速い | 不要 | 高安全性要求 |

```python
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.asymmetric import ec, padding
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.exceptions import InvalidSignature

# === Ed25519 デジタル署名 ===
print("=== Ed25519 署名 ===")
private_key = Ed25519PrivateKey.generate()
public_key = private_key.public_key()

document = b"This contract is agreed upon by both parties."
signature = private_key.sign(document)
print(f"署名長: {len(signature)} バイト")
print(f"署名 (hex): {signature.hex()}")

# 正常な検証
try:
    public_key.verify(signature, document)
    print("検証成功: 文書は改ざんされていない")
except InvalidSignature:
    print("検証失敗")

# 改ざんされた文書の検証
tampered = b"This contract is agreed upon by one party."
try:
    public_key.verify(signature, tampered)
    print("検証成功 (危険!)")
except InvalidSignature:
    print("改ざん検出: 署名検証失敗")

# === ECDSA P-256 署名 ===
print("\n=== ECDSA P-256 署名 ===")
ecdsa_private = ec.generate_private_key(ec.SECP256R1())
ecdsa_public = ecdsa_private.public_key()

message = b"Signed with ECDSA P-256"
ecdsa_sig = ecdsa_private.sign(message, ec.ECDSA(hashes.SHA256()))
print(f"ECDSA 署名長: {len(ecdsa_sig)} バイト (ASN.1 DER)")

try:
    ecdsa_public.verify(ecdsa_sig, message, ec.ECDSA(hashes.SHA256()))
    print("ECDSA 検証成功")
except InvalidSignature:
    print("ECDSA 検証失敗")

# 公開鍵のエクスポート (PEM 形式)
pub_pem = public_key.public_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PublicFormat.SubjectPublicKeyInfo
)
print(f"\nEd25519 公開鍵 (PEM):\n{pub_pem.decode()}")
```

## 使用場面

- TLS/HTTPS の証明書署名（認証局が ECDSA または RSA で署名）
- ソフトウェア配布でのコード署名（マルウェアの混入を防ぐ）
- Git のコミット署名（`git commit -S`）
- PDF・Microsoft Office ドキュメントの電子署名
- 電子政府における電子公文書への署名

## 参考文献

- [FIPS 186-5 - Digital Signature Standard](https://csrc.nist.gov/publications/detail/fips/186/5/final)
- [RFC 8032 - Edwards-Curve Digital Signature Algorithm (EdDSA)](https://www.rfc-editor.org/rfc/rfc8032)
- [ECDSA Nonce Reuse Attack (PS3 Case)](https://www.bbc.com/news/technology-12116051)

<AffiliateBanner site="security_navi" />
