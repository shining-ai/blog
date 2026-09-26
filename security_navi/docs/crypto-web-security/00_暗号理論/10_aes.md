import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 共通鍵暗号（AES の仕組み）

## AES とは

> AES（Advanced Encryption Standard）は、米国国立標準技術研究所（NIST）が2001年に標準化した共通鍵ブロック暗号で、現在最も広く使われる対称暗号アルゴリズムである。

AES はベルギーの暗号研究者 Joan Daemen と Vincent Rijmen が設計した Rijndael アルゴリズムを基に標準化された。128ビットのブロックサイズを持ち、鍵長として128・192・256ビットをサポートする。AES-128 は10ラウンド、AES-192 は12ラウンド、AES-256 は14ラウンドの変換を繰り返す。

**AES の処理は4つのステップの繰り返しで構成される：**

1. **SubBytes**：非線形の S-Box によるバイト置換（混乱性を高める）
2. **ShiftRows**：行方向のバイトシフト（拡散性を提供）
3. **MixColumns**：列方向の行列演算（さらに拡散）
4. **AddRoundKey**：ラウンド鍵とのXOR演算

この構造は SPN（Substitution-Permutation Network）と呼ばれ、各ラウンドで徐々に入力と出力の関係が複雑になる（雪崩効果）。鍵の1ビット変化が出力の約半分のビットを変化させるほど強力な拡散性を持つ。

AES は現在も解読に対して安全とされており、量子コンピュータに対してもグローバーのアルゴリズムにより実効鍵長が半減するが、AES-256 は128ビット相当の安全性を維持できるため量子後も使用可能とされる。

## AES 仕様比較

| バリアント | 鍵長 | ラウンド数 | 安全性レベル |
|------------|------|-----------|-------------|
| AES-128 | 128 bit | 10 | 128 bit |
| AES-192 | 192 bit | 12 | 192 bit |
| AES-256 | 256 bit | 14 | 256 bit（量子後128 bit相当） |

## S-Box の概念（簡略）

| 入力（例） | GF(2⁸)逆数 | アフィン変換後 |
|-----------|-----------|--------------|
| 0x00 | - | 0x63 |
| 0x01 | 0x01 | 0x7c |
| 0x53 | 0xca | 0xed |

```python
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
import os

def aes_encrypt_cbc(plaintext: bytes, key: bytes) -> tuple[bytes, bytes]:
    """AES-CBC モードで暗号化する"""
    iv = os.urandom(16)  # ランダムな初期化ベクトル
    # PKCS7 パディングを適用
    pad_len = 16 - (len(plaintext) % 16)
    padded = plaintext + bytes([pad_len] * pad_len)
    cipher = Cipher(
        algorithms.AES(key),
        modes.CBC(iv),
        backend=default_backend()
    )
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(padded) + encryptor.finalize()
    return iv, ciphertext

def aes_decrypt_cbc(iv: bytes, ciphertext: bytes, key: bytes) -> bytes:
    """AES-CBC モードで復号する"""
    cipher = Cipher(
        algorithms.AES(key),
        modes.CBC(iv),
        backend=default_backend()
    )
    decryptor = cipher.decryptor()
    padded = decryptor.update(ciphertext) + decryptor.finalize()
    # パディング除去
    pad_len = padded[-1]
    return padded[:-pad_len]

# AES-256 鍵の生成（32バイト = 256ビット）
key = os.urandom(32)
plaintext = b"Hello, AES encryption!"

iv, ciphertext = aes_encrypt_cbc(plaintext, key)
recovered = aes_decrypt_cbc(iv, ciphertext, key)

print(f"平文: {plaintext}")
print(f"IV: {iv.hex()}")
print(f"暗号文: {ciphertext.hex()}")
print(f"復号: {recovered}")
```

## 使用場面

- TLS 1.3 での通信暗号化（AES-GCM が主流）
- ファイルシステムの暗号化（BitLocker, FileVault）
- データベースの機密フィールド暗号化
- VPN トンネルの暗号化（IPsec, WireGuard）

## 参考文献

- [FIPS 197 - Advanced Encryption Standard](https://csrc.nist.gov/publications/detail/fips/197/final)
- [NIST AES Development](https://csrc.nist.gov/projects/cryptographic-standards-and-guidelines/archived-crypto-projects/aes-development)
- [The Design of Rijndael - Daemen & Rijmen](https://link.springer.com/book/10.1007/978-3-662-04722-4)

<AffiliateBanner site="security_navi" />
