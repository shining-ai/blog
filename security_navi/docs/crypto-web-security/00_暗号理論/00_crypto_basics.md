import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 暗号の基礎概念（機密性・完全性・認証）

## 暗号の基礎概念とは

> 暗号技術とは、情報を第三者に読めない形式に変換し、正当な受信者だけが元の情報を取り出せるようにする技術体系である。

現代の暗号技術は「機密性（Confidentiality）」「完全性（Integrity）」「認証（Authentication）」という3つの基本目標を中心に設計されている。これらはしばしば **CIA トライアド** と呼ばれ、情報セキュリティの根幹をなす概念である。

**機密性**は、許可された者だけが情報にアクセスできることを保証する。AES や RSA といった暗号アルゴリズムが機密性の実現を担う。

**完全性**は、データが転送・保存中に改ざんされていないことを保証する。ハッシュ関数や MAC（Message Authentication Code）が使われ、1ビットでも変化があれば検出できる。

**認証**は、通信相手が本当に主張する主体であることを確認する。デジタル署名や証明書によって実現され、なりすましを防ぐ。

暗号の安全性は「計算量的安全性」に基づく。現在の計算機能力では解読に天文学的な時間がかかることを安全性の根拠とするアプローチである。ただし量子コンピュータの登場により、一部の暗号（RSA・ECC）は将来的に危殆化する可能性があり、量子耐性暗号への移行が進んでいる。

## CIA トライアド の比較

| 概念 | 英語 | 目的 | 主要技術 |
|------|------|------|----------|
| 機密性 | Confidentiality | 盗聴防止 | AES, RSA, ECDH |
| 完全性 | Integrity | 改ざん検出 | SHA-256, HMAC, デジタル署名 |
| 認証 | Authentication | なりすまし防止 | 証明書, TOTP, FIDO2 |

## 暗号プリミティブの分類

| 種類 | 例 | 用途 |
|------|-----|------|
| 共通鍵暗号 | AES-256 | 大量データの暗号化 |
| 公開鍵暗号 | RSA-2048, ECDSA | 鍵交換・署名 |
| ハッシュ関数 | SHA-256, SHA-3 | 完全性検証 |
| MAC | HMAC-SHA256 | 認証付き完全性 |
| 鍵交換 | Diffie-Hellman, ECDH | セッション鍵生成 |

```python
import hashlib
import hmac
import os
from cryptography.fernet import Fernet

# --- 機密性: 共通鍵暗号 ---
key = Fernet.generate_key()
cipher = Fernet(key)
plaintext = b"Secret message"
ciphertext = cipher.encrypt(plaintext)
decrypted = cipher.decrypt(ciphertext)
print(f"暗号文: {ciphertext[:30]}...")
print(f"復号結果: {decrypted}")

# --- 完全性: ハッシュ関数 ---
data = b"Important document"
digest = hashlib.sha256(data).hexdigest()
print(f"SHA-256: {digest}")

# 1バイト変更でもハッシュは完全に変わる
tampered = b"Important documens"
tampered_digest = hashlib.sha256(tampered).hexdigest()
print(f"改ざん後: {tampered_digest}")
print(f"改ざん検出: {digest != tampered_digest}")

# --- 認証: HMAC ---
secret_key = os.urandom(32)
mac = hmac.new(secret_key, data, hashlib.sha256).hexdigest()
print(f"HMAC: {mac}")
```

## 使用場面

- HTTPS 通信（TLS）では3つすべての概念が使われる（暗号化・MAC・証明書認証）
- ファイル転送時の整合性確認にハッシュ値を使う
- API 認証での HMAC による署名検証
- パスワードの安全な保存における一方向ハッシュ化

## 参考文献

- [NIST Cryptographic Standards and Guidelines](https://csrc.nist.gov/projects/cryptographic-standards-and-guidelines)
- [RFC 4949 - Internet Security Glossary](https://www.rfc-editor.org/rfc/rfc4949)
- [Introduction to Modern Cryptography - Katz & Lindell](https://www.cs.umd.edu/~jkatz/imc.html)

<AffiliateBanner site="security_navi" />
