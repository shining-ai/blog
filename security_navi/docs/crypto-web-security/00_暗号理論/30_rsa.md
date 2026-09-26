import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 公開鍵暗号（RSA の数学的背景）

## RSA とは

> RSA は、大きな整数の素因数分解の困難さを安全性の根拠とする公開鍵暗号アルゴリズムで、1977年に Rivest・Shamir・Adleman の3名によって発表された。

RSA の安全性は「大きな合成数 N = p × q を素因数分解することは現実的に不可能」という数論的困難性に基づく。鍵ペアは公開鍵（N, e）と秘密鍵（N, d）で構成され、公開鍵で暗号化したデータは対応する秘密鍵でのみ復号できる。

**鍵生成の手順：**
1. 大きな素数 p と q を選ぶ（各1024〜2048ビット）
2. N = p × q を計算する（公開）
3. オイラーのトーシェント関数 φ(N) = (p-1)(q-1) を計算
4. gcd(e, φ(N)) = 1 となる公開指数 e を選ぶ（通常 e = 65537）
5. e × d ≡ 1 (mod φ(N)) となる秘密指数 d を計算（拡張ユークリッド法）

**暗号化：** C = M^e mod N
**復号：** M = C^d mod N

RSA は直接データを暗号化するのではなく、通常は AES の鍵（セッション鍵）を暗号化するハイブリッド暗号方式で使われる。また、デジタル署名にも利用される（秘密鍵で署名し公開鍵で検証）。

パディングには PKCS#1 v1.5 と OAEP（Optimal Asymmetric Encryption Padding）があり、現在は OAEP の使用が推奨される。PKCS#1 v1.5 は Bleichenbacher 攻撃に脆弱なため新規実装では避けるべきである。

## RSA 鍵長とセキュリティレベル

| 鍵長 | 等価対称鍵強度 | 推奨期限 |
|------|--------------|---------|
| 1024 bit | ~80 bit | 非推奨（廃止済み） |
| 2048 bit | ~112 bit | 2030年まで |
| 3072 bit | ~128 bit | 2030年以降も使用可 |
| 4096 bit | ~140 bit | 長期利用に適切 |

## RSA vs ECC 比較

| 項目 | RSA-2048 | ECC-256 |
|------|----------|---------|
| セキュリティ強度 | 112 bit | 128 bit |
| 鍵サイズ | 2048 bit | 256 bit |
| 署名速度 | 遅い | 速い |
| 量子耐性 | なし | なし |

```python
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend

# --- RSA 鍵ペア生成 ---
private_key = rsa.generate_private_key(
    public_exponent=65537,   # e: フェルマー素数 F4
    key_size=2048,           # N のビット長
    backend=default_backend()
)
public_key = private_key.public_key()

# --- OAEP パディングによる暗号化（推奨）---
plaintext = b"RSA encryption with OAEP padding"
ciphertext = public_key.encrypt(
    plaintext,
    padding.OAEP(
        mgf=padding.MGF1(algorithm=hashes.SHA256()),
        algorithm=hashes.SHA256(),
        label=None
    )
)

# --- 復号 ---
recovered = private_key.decrypt(
    ciphertext,
    padding.OAEP(
        mgf=padding.MGF1(algorithm=hashes.SHA256()),
        algorithm=hashes.SHA256(),
        label=None
    )
)
print(f"復号結果: {recovered}")

# --- PSS パディングによるデジタル署名 ---
message = b"Document to be signed"
signature = private_key.sign(
    message,
    padding.PSS(
        mgf=padding.MGF1(hashes.SHA256()),
        salt_length=padding.PSS.MAX_LENGTH
    ),
    hashes.SHA256()
)

# 検証
try:
    public_key.verify(
        signature,
        message,
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=padding.PSS.MAX_LENGTH
        ),
        hashes.SHA256()
    )
    print("署名検証: 成功")
except Exception as e:
    print(f"署名検証: 失敗 - {e}")
```

## 使用場面

- TLS ハンドシェイクでのセッション鍵交換（現在は ECDHE が主流）
- S/MIME や PGP でのメール暗号化
- コード署名証明書での署名検証
- SSH 公開鍵認証（RSA または Ed25519）

## 参考文献

- [RFC 8017 - PKCS #1 RSA Cryptography Specifications](https://www.rfc-editor.org/rfc/rfc8017)
- [NIST SP 800-56B - RSA Key Establishment](https://csrc.nist.gov/publications/detail/sp/800-56b/rev-2/final)
- [A Method for Obtaining Digital Signatures and Public-Key Cryptosystems - Rivest, Shamir, Adleman (1978)](https://dl.acm.org/doi/10.1145/359340.359342)

<AffiliateBanner site="security_navi" />
