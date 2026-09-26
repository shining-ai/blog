import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Diffie-Hellman 鍵交換

## Diffie-Hellman 鍵交換とは

> Diffie-Hellman 鍵交換（DH）は、盗聴されている可能性のある通信路を通じて、共有秘密鍵を安全に確立できるプロトコルで、1976年に Whitfield Diffie と Martin Hellman が発表した革命的な暗号プロトコルである。

DH 以前は、暗号鍵を事前に安全な経路で交換する必要があった。DH はこの問題を解決し「鍵配送問題」に対する最初の実用的な解決策となった。安全性は離散対数問題（DLP）の困難さに基づく。

**プロトコルの流れ：**
1. 公開パラメータ：大きな素数 p と原始根 g を共有
2. アリスは秘密値 a を選び、A = g^a mod p を送信
3. ボブは秘密値 b を選び、B = g^b mod p を送信
4. アリスは S = B^a mod p = g^(ab) mod p を計算
5. ボブは S = A^b mod p = g^(ab) mod p を計算
6. 両者が同じ共有秘密 S を得る

盗聴者は A と B を知っていても、a または b（離散対数）を求めることが困難なため共有秘密を得られない。

**ECDH（楕円曲線 DH）**は同じ概念を楕円曲線上で実装したもので、より短い鍵長で同等の安全性を実現する。TLS 1.3 では静的 DH は廃止され、前方秘匿性を持つ **ECDHE**（Ephemeral ECDH）が必須となっている。

前方秘匿性（Perfect Forward Secrecy）とは、長期秘密鍵が将来漏洩しても過去の通信は解読できないという性質で、鍵交換ごとに使い捨ての鍵ペアを使う Ephemeral DH で実現される。

## DH vs ECDH 比較

| 項目 | DH（有限体） | ECDH（楕円曲線） |
|------|------------|----------------|
| 安全性根拠 | 有限体上の離散対数問題 | 楕円曲線離散対数問題 |
| 128bit安全性の鍵長 | 3072 bit | 256 bit |
| 処理速度 | 遅い | 高速 |
| TLS 1.3 での採用 | 廃止傾向 | ECDHE が主流 |

## TLS 1.3 で使われる鍵交換グループ

| グループ名 | 種類 | セキュリティ強度 |
|-----------|------|--------------|
| x25519 | ECDH | ~128 bit |
| x448 | ECDH | ~224 bit |
| ffdhe2048 | 有限体 DH | ~112 bit |
| ffdhe4096 | 有限体 DH | ~140 bit |

```python
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes, serialization
import os

# === ECDHE (X25519) 鍵交換のデモ ===
# TLS 1.3 と同様の方式

# 1. アリス側: Ephemeral 鍵ペアを生成
alice_ephemeral_private = X25519PrivateKey.generate()
alice_ephemeral_public = alice_ephemeral_private.public_key()

# 2. ボブ側: Ephemeral 鍵ペアを生成
bob_ephemeral_private = X25519PrivateKey.generate()
bob_ephemeral_public = bob_ephemeral_private.public_key()

# 3. 公開鍵を交換（ネットワーク経由でも安全）
alice_pub_bytes = alice_ephemeral_public.public_bytes(
    encoding=serialization.Encoding.Raw,
    format=serialization.PublicFormat.Raw
)
bob_pub_bytes = bob_ephemeral_public.public_bytes(
    encoding=serialization.Encoding.Raw,
    format=serialization.PublicFormat.Raw
)

print(f"アリスの公開鍵: {alice_pub_bytes.hex()}")
print(f"ボブの公開鍵:   {bob_pub_bytes.hex()}")

# 4. 共有秘密の計算（両者が同じ値を得る）
alice_shared_secret = alice_ephemeral_private.exchange(bob_ephemeral_public)
bob_shared_secret = bob_ephemeral_private.exchange(alice_ephemeral_public)

print(f"\n共有秘密一致: {alice_shared_secret == bob_shared_secret}")

# 5. HKDF で共有秘密からセッション鍵を導出
def derive_session_key(shared_secret: bytes, salt: bytes = None) -> bytes:
    if salt is None:
        salt = os.urandom(32)
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,      # 256 bit のセッション鍵
        salt=salt,
        info=b"session key derivation"
    )
    return hkdf.derive(shared_secret)

session_key = derive_session_key(alice_shared_secret)
print(f"導出されたセッション鍵: {session_key.hex()}")
print(f"(鍵交換後、エフェメラル鍵ペアは破棄 → 前方秘匿性)")
```

## 使用場面

- TLS 1.3 ハンドシェイクでのセッション鍵確立（X25519 が最も一般的）
- SSH セッション確立での鍵交換
- Signal・WhatsApp などのエンドツーエンド暗号化メッセージング
- IPsec VPN での IKE（Internet Key Exchange）プロトコル

## 参考文献

- [New Directions in Cryptography - Diffie & Hellman (1976)](https://ee.stanford.edu/~hellman/publications/24.pdf)
- [RFC 7919 - Negotiated Finite Field Diffie-Hellman Ephemeral Parameters for TLS](https://www.rfc-editor.org/rfc/rfc7919)
- [RFC 8446 - TLS 1.3](https://www.rfc-editor.org/rfc/rfc8446)

<AffiliateBanner site="security_navi" />
