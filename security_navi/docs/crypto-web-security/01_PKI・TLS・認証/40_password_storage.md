import AffiliateBanner from '@site/src/components/AffiliateBanner';

# パスワードの安全な保存（bcrypt・Argon2）

## パスワードの安全な保存とは

> パスワードの安全な保存とは、データベース漏洩時に元のパスワードを復元できないようにするため、ソルト付きの計算コストの高いハッシュ関数（bcrypt・Argon2 など）でパスワードをハッシュ化して保存する手法である。

平文や単純な MD5・SHA-1 ハッシュでパスワードを保存することは危険である。データベースが漏洩した際、レインボーテーブル攻撃や総当たり攻撃によって元のパスワードが復元されてしまう。

**避けるべき保存方法：**
- 平文保存：論外
- 可逆暗号化：鍵が漏洩すると全件復号される
- MD5 / SHA-1 / SHA-256 の単純ハッシュ：GPU を使ったブルートフォースに脆弱
- ソルトなしハッシュ：レインボーテーブルで一致するものを探索できる

**推奨される保存方法：**
パスワード専用のハッシュ関数を使い、**ソルト**（ユーザーごとのランダム値）を付加して計算する。計算コストが高いため、攻撃者の総当たりを現実的でなくする。

- **bcrypt**：1999年設計。コストファクターで計算時間を調整。広く実績がある
- **Argon2**：2015年 Password Hashing Competition 優勝。メモリ・CPU・並列度の三つを調整でき、GPU による並列攻撃に強い。現在の推奨

**認証フロー：**
1. 登録時：ソルトを生成 → `hash = Argon2(password, salt)` → DB に `hash` のみ保存
2. 認証時：入力パスワードと保存済み hash を比較（`argon2.verify(password, hash)`）

## アルゴリズム比較

| アルゴリズム | 設計年 | メモリコスト | 並列耐性 | 推奨度 |
|-------------|--------|-------------|---------|--------|
| MD5 | 1992 | なし | 低い | 使用禁止 |
| SHA-256 | 2001 | なし | 低い | パスワード用途は不可 |
| bcrypt | 1999 | 固定（4KB） | 中程度 | 現在も許容 |
| scrypt | 2009 | 調整可能 | 高い | 良好 |
| Argon2id | 2015 | 調整可能 | 最高 | 推奨 |

```python
# pip install argon2-cffi bcrypt
import argon2
import bcrypt
import os

# === Argon2id による安全なパスワードハッシュ（推奨）===
ph = argon2.PasswordHasher(
    time_cost=3,       # 反復回数（多いほど遅く、安全）
    memory_cost=65536, # メモリ使用量 KB（64 MB）
    parallelism=4,     # 並列スレッド数
    hash_len=32,
    salt_len=16,
)

def hash_password_argon2(password: str) -> str:
    """Argon2id でパスワードをハッシュ化"""
    return ph.hash(password)

def verify_password_argon2(password: str, stored_hash: str) -> bool:
    """パスワードを検証（タイミング攻撃対策済み）"""
    try:
        ph.verify(stored_hash, password)
        # リハッシュが必要かチェック（パラメータ更新時）
        if ph.check_needs_rehash(stored_hash):
            return True  # 実際には rehash して DB 更新が必要
        return True
    except argon2.exceptions.VerifyMismatchError:
        return False

# 使用例
password = "MySecurePassword123!"
hashed = hash_password_argon2(password)
print(f"ハッシュ（Argon2id）: {hashed[:60]}...")
print(f"検証（正しいPW）: {verify_password_argon2(password, hashed)}")
print(f"検証（誤ったPW）: {verify_password_argon2('wrong', hashed)}")

# === bcrypt による実装（レガシーシステムとの互換性）===
def hash_password_bcrypt(password: str, rounds: int = 12) -> bytes:
    """bcrypt でパスワードをハッシュ化（rounds=12 が現在の最低推奨値）"""
    salt = bcrypt.gensalt(rounds=rounds)
    return bcrypt.hashpw(password.encode("utf-8"), salt)

def verify_password_bcrypt(password: str, stored_hash: bytes) -> bool:
    """bcrypt パスワード検証"""
    return bcrypt.checkpw(password.encode("utf-8"), stored_hash)

hashed_bcrypt = hash_password_bcrypt(password)
print(f"\nハッシュ（bcrypt）: {hashed_bcrypt[:40]}...")
print(f"検証（正しいPW）: {verify_password_bcrypt(password, hashed_bcrypt)}")
```

## 使用場面

- Webアプリケーションのユーザーパスワード登録・認証処理
- データベース漏洩時の被害を最小化するための設計
- パスワード強度の検証と適切なポリシーの実装
- 既存の弱いハッシュ（MD5 など）から安全なアルゴリズムへの移行

## 参考文献

- [OWASP - Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Argon2 仕様書（RFC 9106）](https://www.rfc-editor.org/rfc/rfc9106)
- [NIST SP 800-63B - Digital Identity Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [Password Hashing Competition](https://www.password-hashing.net/)

<AffiliateBanner site="security_navi" />
