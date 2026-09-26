import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ブロック暗号モード（ECB・CBC・CTR・GCM）

## ブロック暗号モードとは

> ブロック暗号モードとは、固定長ブロックを処理するブロック暗号を可変長データに適用するための動作方式であり、選択するモードによってセキュリティ特性が大きく異なる。

AES などのブロック暗号は固定長（128ビット）のブロックしか処理できない。実際のデータは任意長であるため、複数ブロックをどのように結合して処理するかを定めた「動作モード」が必要になる。モードの選択を誤ると、暗号化していても情報が漏洩する致命的な脆弱性につながる。

**ECB（Electronic Codebook）**は最も単純なモードだが、同じ平文ブロックは常に同じ暗号文ブロックになるため、パターンが漏洩する。有名な「ECB ペンギン」の例（Linux マスコット Tux を ECB で暗号化すると輪郭が見える）で知られる欠陥がある。

**CBC（Cipher Block Chaining）**は前のブロックの暗号文を次のブロックの暗号化に XOR する方式。同じ平文でも異なる暗号文になるが、並列処理ができず、パディングオラクル攻撃の対象になりうる。

**CTR（Counter）**モードはカウンタ値を暗号化して鍵ストリームを生成し、平文と XOR する。ブロック暗号をストリーム暗号として使え、並列処理が可能。

**GCM（Galois/Counter Mode）**は CTR に認証（GHASH）を加えた AEAD（認証付き暗号）。暗号化と改ざん検出を同時に行える。TLS 1.3 では AES-GCM が標準的に使用される。

## モード別特性比較

| モード | パターン漏洩 | 並列化 | 認証 | 推奨度 |
|--------|------------|--------|------|--------|
| ECB | あり（危険） | 可 | なし | 非推奨 |
| CBC | なし | 復号のみ | なし | 限定的 |
| CTR | なし | 可 | なし | 用途次第 |
| GCM | なし | 可 | あり（AEAD） | 推奨 |

```python
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
import os

# --- GCM モード（推奨）: AEAD ---
def gcm_encrypt(plaintext: bytes, aad: bytes = b"") -> tuple:
    key = os.urandom(32)         # AES-256
    nonce = os.urandom(12)       # GCM 推奨: 96ビット nonce
    aesgcm = AESGCM(key)
    # aad: Additional Authenticated Data（暗号化はされないが認証される）
    ciphertext = aesgcm.encrypt(nonce, plaintext, aad)
    return key, nonce, ciphertext

def gcm_decrypt(key, nonce, ciphertext, aad=b"") -> bytes:
    aesgcm = AESGCM(key)
    # 認証タグ不正時は InvalidTag 例外を送出
    return aesgcm.decrypt(nonce, ciphertext, aad)

plaintext = b"Sensitive data requiring confidentiality and integrity"
aad = b"header:user-id=42"  # 認証するが暗号化しないデータ

key, nonce, ct = gcm_encrypt(plaintext, aad)
recovered = gcm_decrypt(key, nonce, ct, aad)

print(f"GCM 暗号文 (hex): {ct.hex()}")
print(f"復号結果: {recovered}")
print(f"(暗号文末尾16バイトが認証タグ: {ct[-16:].hex()})")

# --- ECB の危険性デモ（同じブロックが同じ暗号文になる）---
ecb_key = os.urandom(16)
block_a = b"AAAAAAAAAAAAAAAA"  # 16バイト
block_b = b"BBBBBBBBBBBBBBBB"
same_blocks = block_a + block_a + block_b  # A, A, B

cipher = Cipher(algorithms.AES(ecb_key), modes.ECB(), backend=default_backend())
enc = cipher.encryptor()
ecb_ct = enc.update(same_blocks) + enc.finalize()

# ECB では同じ平文ブロックは同じ暗号文ブロックになる
print(f"\nECB ブロック1: {ecb_ct[0:16].hex()}")
print(f"ECB ブロック2: {ecb_ct[16:32].hex()}")  # ブロック1と同じ！
print(f"ECB ブロック3: {ecb_ct[32:48].hex()}")
print(f"ブロック1==ブロック2: {ecb_ct[0:16] == ecb_ct[16:32]}")
```

## 使用場面

- TLS 1.3 のレコード暗号化には AES-128-GCM または AES-256-GCM を使用
- ディスク暗号化には XTS モードが使われる（セクタ単位の処理に適している）
- 新規実装では必ず GCM（AEAD）を選択し、ECB は絶対に使用しない
- CTR モードは nonce の再利用が禁忌（同じ鍵と nonce で暗号化すると鍵ストリームが漏洩）

## 参考文献

- [NIST SP 800-38A - Block Cipher Modes](https://csrc.nist.gov/publications/detail/sp/800-38a/final)
- [NIST SP 800-38D - GCM Mode](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
- [Authenticated Encryption - Wikipedia](https://en.wikipedia.org/wiki/Authenticated_encryption)

<AffiliateBanner site="security_navi" />
