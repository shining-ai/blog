import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ハッシュ関数（SHA-256・SHA-3）

## ハッシュ関数とは

> 暗号学的ハッシュ関数は、任意長の入力から固定長の出力（ダイジェスト）を生成する一方向関数であり、原像計算困難性・衝突困難性・第二原像計算困難性の3つの安全性要件を満たすべき関数である。

ハッシュ関数は暗号技術の重要な構成要素で、デジタル署名・パスワード保存・データ完全性検証など幅広い用途に使われる。

**3つの安全性要件：**
1. **原像計算困難性（一方向性）**：ダイジェスト h から元の入力 m を求めることが計算上困難
2. **第二原像計算困難性**：入力 m1 が与えられたとき、H(m1) = H(m2) となる別の入力 m2 を見つけることが困難
3. **衝突困難性**：H(m1) = H(m2) となる任意の m1 ≠ m2 のペアを見つけることが困難

**SHA-2 ファミリー（SHA-256・SHA-512）**は、MD（Merkle-Damgård）構造を採用した NIST 標準ハッシュ関数。SHA-256 は 32バイト（256ビット）の出力を生成し、現在広く使われている。

**SHA-3（Keccak）**は SHA-2 とは設計哲学が異なるスポンジ構造を採用し、同じアルゴリズムの弱点に依存しないバックアップとして NIST が 2015年に標準化した。

**MD5・SHA-1 は廃止済み**：MD5 は 1996年に衝突例が見つかり、SHA-1 も 2017年に Google が衝突を実証（SHAttered 攻撃）。どちらも新規実装では使用してはならない。

## ハッシュ関数の比較

| 関数 | 出力長 | 構造 | セキュリティ | 状態 |
|------|--------|------|------------|------|
| MD5 | 128 bit | MD 構造 | 衝突攻撃あり | 廃止 |
| SHA-1 | 160 bit | MD 構造 | 衝突実証済み | 廃止 |
| SHA-256 | 256 bit | MD 構造 | 安全 | 推奨 |
| SHA-512 | 512 bit | MD 構造 | 安全 | 推奨 |
| SHA3-256 | 256 bit | スポンジ | 安全 | 推奨 |
| BLAKE3 | 可変 | ツリー構造 | 安全・高速 | 注目 |

```python
import hashlib

data = b"The quick brown fox jumps over the lazy dog"

# --- 各ハッシュ関数の出力比較 ---
algorithms_to_test = [
    ("MD5", hashlib.md5),           # 非推奨
    ("SHA-1", hashlib.sha1),        # 非推奨
    ("SHA-256", hashlib.sha256),    # 推奨
    ("SHA-512", hashlib.sha512),    # 推奨
    ("SHA3-256", hashlib.sha3_256), # 推奨
    ("SHA3-512", hashlib.sha3_512), # 推奨
]

print("=== ハッシュ関数の出力比較 ===")
for name, func in algorithms_to_test:
    digest = func(data).hexdigest()
    print(f"{name:10} ({len(func(data).digest()):3}B): {digest[:32]}...")

# --- 雪崩効果のデモ ---
print("\n=== 雪崩効果（1文字変更でもハッシュが大きく変わる）===")
data1 = b"Hello World"
data2 = b"Hello world"  # 'W' -> 'w' の1文字変更

h1 = hashlib.sha256(data1).hexdigest()
h2 = hashlib.sha256(data2).hexdigest()

print(f"SHA-256('{data1.decode()}'): {h1}")
print(f"SHA-256('{data2.decode()}'): {h2}")

# ビットレベルでの差分を計算
bits1 = bin(int(h1, 16))[2:].zfill(256)
bits2 = bin(int(h2, 16))[2:].zfill(256)
diff_bits = sum(b1 != b2 for b1, b2 in zip(bits1, bits2))
print(f"異なるビット数: {diff_bits}/256 ({diff_bits/256*100:.1f}%)")

# --- ファイル完全性チェック ---
def file_hash(filepath: str, algorithm: str = "sha256") -> str:
    h = hashlib.new(algorithm)
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()

# --- SHAKE (可変長出力) ---
shake = hashlib.shake_256(data)
print(f"\nSHAKE-256 (16B): {shake.hexdigest(16)}")
print(f"SHAKE-256 (32B): {shake.hexdigest(32)}")
print(f"SHAKE-256 (64B): {shake.hexdigest(64)}")
```

## 使用場面

- デジタル署名でのダイジェスト生成（署名するのはデータそのものではなくハッシュ値）
- Git でのオブジェクト識別（コミット・ツリー・ブロブの識別に SHA-1、移行中）
- ブロックチェーンでのブロック連結（Bitcoin は SHA-256 の二重ハッシュ）
- パスワードハッシュの基礎（ただし PBKDF2・bcrypt・Argon2 などの KDF と組み合わせる）

## 参考文献

- [FIPS 180-4 - SHA Standard](https://csrc.nist.gov/publications/detail/fips/180/4/final)
- [FIPS 202 - SHA-3 Standard](https://csrc.nist.gov/publications/detail/fips/202/final)
- [SHAttered - SHA-1 Collision (2017)](https://shattered.io/)

<AffiliateBanner site="security_navi" />
