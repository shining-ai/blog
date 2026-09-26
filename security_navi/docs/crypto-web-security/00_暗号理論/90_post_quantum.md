import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 量子耐性暗号（格子暗号の概要）

## 量子耐性暗号とは

> 量子耐性暗号（Post-Quantum Cryptography: PQC）は、量子コンピュータによる攻撃に対しても安全性を維持できる暗号アルゴリズムの総称で、格子問題・符号理論・多変数多項式・ハッシュ関数を安全性の根拠とする。

現在広く使われている RSA・ECC・DH は、量子コンピュータ上のショアのアルゴリズムによって効率的に解読できる。十分な規模の量子コンピュータが実現した場合、これらの暗号に守られた通信（TLS, SSH, コード署名など）は危殆化する。

**「Harvest Now, Decrypt Later」攻撃：**現在の暗号通信を傍受・保存しておき、将来量子コンピュータで解読するという現実的脅威がある。機密保持期間が長い政府・医療・金融データは今すぐ PQC への移行が必要とされる。

**NIST の PQC 標準化（2024年）：**
- **ML-KEM**（旧 CRYSTALS-Kyber）：鍵カプセル化機構（KEM）。格子問題の一種である Module Learning With Errors（MLWE）に基づく
- **ML-DSA**（旧 CRYSTALS-Dilithium）：デジタル署名。格子問題に基づく
- **SLH-DSA**（旧 SPHINCS+）：ハッシュ関数ベースの署名。格子を使わない保守的な設計
- **FN-DSA**（旧 FALCON）：NTRU 格子に基づく署名

**格子問題とは：**高次元格子上の「最短ベクトル問題（SVP）」や「最近ベクトル問題（CVP）」は古典コンピュータでも量子コンピュータでも困難とされる数学的問題である。

AES-256・SHA-256 などの対称暗号・ハッシュ関数は量子コンピュータへの耐性が比較的高い（グローバーのアルゴリズムで実効鍵長が半減するが十分な強度を維持）。

## 量子攻撃に対する脆弱性

| アルゴリズム | 従来の攻撃 | 量子攻撃 | 対応策 |
|------------|----------|---------|--------|
| RSA-2048 | 2^112 | 多項式時間（ショア） | ML-KEM に移行 |
| ECDH P-256 | 2^128 | 多項式時間（ショア） | X25519/ML-KEM に移行 |
| AES-128 | 2^128 | 2^64（グローバー） | AES-256 へ |
| SHA-256 | 2^128 | 2^85（グローバー） | SHA-384以上へ |
| HMAC-SHA256 | 2^256 | 2^128 | 現状維持可 |

## NIST PQC 標準（2024年）

| 標準名 | 旧名 | 種類 | 安全性根拠 |
|--------|------|------|-----------|
| FIPS 203 ML-KEM | CRYSTALS-Kyber | KEM | MLWE（格子） |
| FIPS 204 ML-DSA | CRYSTALS-Dilithium | 署名 | MLWE（格子） |
| FIPS 205 SLH-DSA | SPHINCS+ | 署名 | ハッシュ関数 |
| FIPS 206 FN-DSA | FALCON | 署名 | NTRU格子 |

```python
# 注: Python での PQC 実装は liboqs-python などの外部ライブラリが必要
# ここでは概念的なデモと移行戦略を示す

# --- ハイブリッド鍵交換の概念 ---
# 現在の推奨: X25519 + ML-KEM のハイブリッド方式
# どちらか一方が解読されても安全性を維持する

class HybridKEMConcept:
    """
    X25519（古典） + ML-KEM-768（量子耐性）のハイブリッド KEM の概念
    TLS 1.3 での実装例: X25519MLKEM768 (RFC 9420 参照)
    """
    def __init__(self):
        self.description = """
        1. Classical: X25519 ECDH で共有秘密 ss_classical を生成
        2. PQC:       ML-KEM で共有秘密 ss_pqc を生成
        3. 結合:      ss = KDF(ss_classical || ss_pqc)

        量子コンピュータが X25519 を解読しても、
        ML-KEM が安全なら通信は守られる。
        逆に ML-KEM に未知の弱点があっても、
        X25519 が安全なら守られる。
        """

# --- 移行計画のチェックリスト ---
migration_checklist = {
    "鍵交換": {
        "現状": "X25519 / P-256",
        "移行先": "X25519MLKEM768 (ハイブリッド)",
        "期限": "2030年まで",
    },
    "デジタル署名": {
        "現状": "ECDSA P-256 / RSA-2048",
        "移行先": "ML-DSA-65 または SLH-DSA",
        "期限": "2030年まで",
    },
    "共通鍵暗号": {
        "現状": "AES-128-GCM",
        "移行先": "AES-256-GCM",
        "期限": "推奨: 今すぐ",
    },
    "ハッシュ関数": {
        "現状": "SHA-256",
        "移行先": "SHA-384 または SHA-512",
        "期限": "段階的に移行",
    },
}

for category, info in migration_checklist.items():
    print(f"\n【{category}】")
    for k, v in info.items():
        print(f"  {k}: {v}")

print("""
=== 優先対応が必要なシステム ===
1. 長期機密データを扱うシステム（医療、法務、政府）
2. デジタル署名の有効期間が長いもの（コード署名証明書）
3. 量子安全性を要求する規制対象システム
""")
```

## 使用場面

- NIST は2030年を目途に PQC への移行を推奨しており、新規システムでは早期採用を検討
- Google・Cloudflare は TLS において X25519MLKEM768 のハイブリッド方式を試験導入済み
- SSH での利用：OpenSSH 9.0 以降で ML-KEM を含む PQC 鍵交換をサポート
- 長期保存が必要な電子署名（公文書等）では SLH-DSA（ハッシュベース）が堅実な選択

## 参考文献

- [NIST Post-Quantum Cryptography Standardization](https://csrc.nist.gov/projects/post-quantum-cryptography)
- [FIPS 203 ML-KEM](https://csrc.nist.gov/pubs/fips/203/final)
- [NIST IR 8413 - Status Report on the Third Round of the NIST PQC Standardization Process](https://csrc.nist.gov/publications/detail/nistir/8413/final)
- [Open Quantum Safe (liboqs)](https://openquantumsafe.org/)

<AffiliateBanner site="security_navi" />
