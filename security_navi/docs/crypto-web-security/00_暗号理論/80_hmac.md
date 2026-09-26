import AffiliateBanner from '@site/src/components/AffiliateBanner';

# MAC（HMAC）

## HMAC とは

> HMAC（Hash-based Message Authentication Code）は、共有秘密鍵とハッシュ関数を組み合わせて、メッセージの認証と完全性を同時に保証するメッセージ認証コードである。

MAC（Message Authentication Code）は、共有鍵を持つ二者間で、メッセージが改ざんされていないことと送信者が正当であることを検証する仕組みである。デジタル署名と異なり、検証者も同じ秘密鍵を持つため、否認防止には使えないが、処理が軽量である。

**HMAC の構造：**

```
HMAC(K, M) = H((K ⊕ opad) || H((K ⊕ ipad) || M))
```

- K：秘密鍵（ハッシュ関数のブロック長に合わせてパディング）
- opad：0x5c を繰り返したパッド
- ipad：0x36 を繰り返したパッド
- H：SHA-256 などのハッシュ関数
- M：認証するメッセージ

単純に `H(K || M)` のような「鍵付きハッシュ」では長さ拡張攻撃に脆弱になる。HMAC の二重ハッシュ構造はこれを防ぐ。

**HMAC vs デジタル署名の違い：**
- HMAC：共有鍵方式（高速・否認防止なし）
- デジタル署名：公開鍵方式（低速・否認防止あり）

HMAC-SHA256 は JWT の署名（HS256）、API 認証のリクエスト署名、TLS の MAC 計算など広く使われる。ただし JWT では秘密の共有が必要なため、マイクロサービス間などで鍵管理が複雑になる場合は RS256（RSA）や ES256（ECDSA）が好まれる。

## MAC アルゴリズムの比較

| アルゴリズム | 出力長 | 安全性 | 用途 |
|------------|--------|--------|------|
| HMAC-MD5 | 128 bit | 非推奨 | レガシーシステム |
| HMAC-SHA1 | 160 bit | 限定的 | 後方互換性 |
| HMAC-SHA256 | 256 bit | 安全 | 汎用・JWT(HS256) |
| HMAC-SHA512 | 512 bit | 安全 | 高安全性要求 |
| GMAC（GCM の認証部）| 128 bit | 安全 | TLS 1.3 |
| Poly1305 | 128 bit | 安全・高速 | ChaCha20-Poly1305 |

```python
import hmac
import hashlib
import secrets
import time

# === HMAC-SHA256 の基本的な使用 ===
secret_key = secrets.token_bytes(32)   # 256 bit の秘密鍵
message = b"Transfer $1000 to account 12345"

# HMAC 生成
mac = hmac.new(secret_key, message, hashlib.sha256)
mac_value = mac.hexdigest()
print(f"HMAC-SHA256: {mac_value}")

# HMAC 検証（定数時間比較を使う）
def verify_hmac(key: bytes, message: bytes, expected_mac: str) -> bool:
    computed = hmac.new(key, message, hashlib.sha256).hexdigest()
    # compare_digest で timing attack を防ぐ
    return hmac.compare_digest(computed, expected_mac)

# 正常なメッセージの検証
print(f"正常メッセージ検証: {verify_hmac(secret_key, message, mac_value)}")

# 改ざんされたメッセージの検証
tampered = b"Transfer $9000 to account 12345"
tampered_mac = hmac.new(secret_key, tampered, hashlib.sha256).hexdigest()
print(f"改ざんメッセージ: {verify_hmac(secret_key, tampered, mac_value)}")

# === API リクエスト署名の例 ===
def sign_api_request(api_key: bytes, method: str, path: str,
                     body: bytes, timestamp: int) -> str:
    """API リクエストへの HMAC 署名"""
    # 署名対象文字列の構築
    string_to_sign = f"{method}\n{path}\n{timestamp}\n".encode()
    string_to_sign += hashlib.sha256(body).hexdigest().encode()
    return hmac.new(api_key, string_to_sign, hashlib.sha256).hexdigest()

api_key = secrets.token_bytes(32)
ts = int(time.time())
sig = sign_api_request(
    api_key, "POST", "/api/transfer",
    b'{"amount": 1000}', ts
)
print(f"\nAPI 署名: {sig}")

# === timing attack の危険性デモ ===
# 絶対にやってはいけない: == で比較
# if computed == expected:  ← 文字列一致を最初のバイトから比較するため時間差が出る
# 正解: hmac.compare_digest を使う（定数時間比較）
```

## 使用場面

- JWT の HS256 署名（HMAC-SHA256）
- AWS、GitHub などの API リクエスト署名（X-Hub-Signature など）
- Web アプリのセッション Cookie の改ざん防止
- TLS レコードの MAC 計算（TLS 1.2 まで; TLS 1.3 は AEAD で代替）

## 参考文献

- [RFC 2104 - HMAC: Keyed-Hashing for Message Authentication](https://www.rfc-editor.org/rfc/rfc2104)
- [FIPS 198-1 - The Keyed-Hash Message Authentication Code (HMAC)](https://csrc.nist.gov/publications/detail/fips/198/1/final)
- [Cryptographic Attacks: HMAC Length Extension](https://blog.skullsecurity.org/2012/everything-you-need-to-know-about-hash-length-extension-attacks)

<AffiliateBanner site="security_navi" />
