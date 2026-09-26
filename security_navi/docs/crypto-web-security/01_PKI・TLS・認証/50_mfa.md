import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 多要素認証（TOTP・FIDO2）

## 多要素認証とは

> 多要素認証（MFA: Multi-Factor Authentication）は、「知識」「所持」「生体」の異なるカテゴリから複数の要素を組み合わせて本人確認を行うことで、パスワード単体よりもはるかに強力な認証を実現する仕組みである。

パスワードのみの認証は、フィッシング・漏洩・総当たりによって突破されうる。MFA は攻撃者がパスワードを入手しても、もう一つの要素を持っていなければログインできないよう設計されている。

**認証要素の分類：**
- **知識要素（Something you know）**：パスワード、PIN、秘密の質問
- **所持要素（Something you have）**：スマートフォン、ハードウェアトークン、スマートカード
- **生体要素（Something you are）**：指紋、顔認証、虹彩

**TOTP（Time-based One-Time Password）：**
RFC 6238 で標準化。共有秘密鍵と現在時刻（30秒単位）から HMAC-SHA1 を計算し、6桁のコードを生成する。Google Authenticator などが実装しており、SMS 認証より安全である（SIM スワッピング攻撃に対して）。ただしフィッシングサイトで入力された場合はリアルタイムで悪用されうる。

**FIDO2 / WebAuthn：**
W3C と FIDO Alliance が標準化した最新の認証方式。デバイス内の秘密鍵でチャレンジに署名することで認証する。**フィッシング耐性**がある（オリジン（ドメイン）が鍵に紐付いているため、偽サイトでは使用不可）。パスキー（Passkey）として各プラットフォームに統合されている。

## MFA 方式の比較

| 方式 | 所持要素 | フィッシング耐性 | 利便性 | セキュリティ強度 |
|------|---------|----------------|--------|----------------|
| SMS OTP | スマートフォン | なし | 高い | 低〜中 |
| TOTP | 認証アプリ | なし | 中程度 | 中程度 |
| FIDO2 ハードウェアキー | セキュリティキー | あり | 中程度 | 非常に高い |
| パスキー（FIDO2） | デバイス内蔵 | あり | 高い | 非常に高い |

```python
# pip install pyotp qrcode
import pyotp
import qrcode
import base64
import os
import time

# === TOTP の実装 ===
class TOTPAuthenticator:
    """TOTP による二段階認証の実装例"""

    @staticmethod
    def generate_secret() -> str:
        """ユーザー登録時にサーバ側で生成する共有秘密鍵"""
        return pyotp.random_base32()

    @staticmethod
    def get_provisioning_uri(secret: str, email: str, issuer: str) -> str:
        """認証アプリに読み込ませる QR コードの URI を生成"""
        totp = pyotp.TOTP(secret)
        return totp.provisioning_uri(name=email, issuer_name=issuer)

    @staticmethod
    def verify_token(secret: str, token: str, valid_window: int = 1) -> bool:
        """
        TOTP トークンの検証
        valid_window=1 は前後 30 秒のドリフトを許容（時刻ずれ対策）
        """
        totp = pyotp.TOTP(secret)
        return totp.verify(token, valid_window=valid_window)

    @staticmethod
    def get_current_token(secret: str) -> str:
        """現在の TOTP トークンを取得（デバッグ・テスト用）"""
        return pyotp.TOTP(secret).now()

# 使用例：ユーザー登録フロー
secret = TOTPAuthenticator.generate_secret()
print(f"生成された秘密鍵（DB に保存）: {secret}")

uri = TOTPAuthenticator.get_provisioning_uri(
    secret=secret,
    email="user@example.com",
    issuer="MyApp"
)
print(f"QR URI: {uri[:60]}...")

# 現在のトークンを生成して検証
current_token = TOTPAuthenticator.get_current_token(secret)
print(f"現在のトークン: {current_token}")
print(f"検証結果: {TOTPAuthenticator.verify_token(secret, current_token)}")
print(f"誤ったトークン: {TOTPAuthenticator.verify_token(secret, '000000')}")

# 注意事項
print("""
セキュリティ上の注意:
- 秘密鍵は暗号化して DB に保存すること
- リプレイ攻撃防止のため、使用済みトークンを記録すること
- バックアップコードを提供し、デバイス紛失に備えること
- FIDO2/パスキーへの移行も検討すること
""")
```

## 使用場面

- Webアプリケーションのログイン画面への MFA 追加
- 管理者アカウントや特権操作に対する追加認証
- VPN や SSH アクセスの二段階認証
- パスキーを使ったパスワードレス認証の実装

## 参考文献

- [RFC 6238 - TOTP: Time-Based One-Time Password Algorithm](https://www.rfc-editor.org/rfc/rfc6238)
- [FIDO2 / WebAuthn 仕様](https://fidoalliance.org/fido2/)
- [OWASP - Multifactor Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)
- [NIST SP 800-63B - MFA ガイドライン](https://pages.nist.gov/800-63-3/sp800-63b.html)

<AffiliateBanner site="security_navi" />
