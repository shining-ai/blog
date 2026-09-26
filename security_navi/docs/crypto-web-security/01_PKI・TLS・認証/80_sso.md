import AffiliateBanner from '@site/src/components/AffiliateBanner';

# SSO（シングルサインオン）

## SSO とは

> SSO（Single Sign-On）は、ユーザーが一度認証を行うだけで、複数のサービスやアプリケーションに再認証なしでアクセスできる仕組みであり、IdP（Identity Provider）が認証を一元管理する。

企業では多数の業務システムを利用するが、それぞれにログインを繰り返すのは利便性とセキュリティの両面で問題がある。SSO はユーザー認証を IdP に集約し、各サービス（SP: Service Provider）は IdP の認証結果を信頼することでシームレスなアクセスを実現する。

**SSO の主要プロトコル：**

- **SAML 2.0**（Security Assertion Markup Language）：XML ベース。企業向けの老舗規格。IdP が XML の「アサーション」を署名付きで SP に渡す。SalesforceやWorkdayなど多くのエンタープライズ製品が対応
- **OAuth 2.0 + OIDC**：JSON/REST ベース。現代的な Web・モバイルアプリ向け。Google や Microsoft の「〇〇でログイン」はこの組み合わせ
- **LDAP / Kerberos**：社内ネットワーク向け。Active Directory と組み合わせて使われる

**SSO のセキュリティ上の注意点：**
SSO は「単一障害点」になりうる。IdP が侵害された場合、すべての連携サービスが危険にさらされる。このため IdP 自体には強力な MFA を強制し、アクセスログを厳密に監視する必要がある。また、SP 側での**セッションタイムアウト**と**SLO（Single Log-Out）**の実装も重要である。

**IdP 主導 vs SP 主導：**
- **SP 主導**：ユーザーが SP にアクセス → SP が IdP にリダイレクト → 認証後 SP に戻る（一般的）
- **IdP 主導**：IdP のダッシュボードからアプリを起動。CSRF に対して注意が必要

## SSO プロトコル比較

| プロトコル | フォーマット | 用途 | 特徴 |
|-----------|------------|------|------|
| SAML 2.0 | XML | エンタープライズ | 成熟、複雑、証明書管理が必要 |
| OIDC | JSON/JWT | Web・モバイル | シンプル、開発しやすい |
| Kerberos | バイナリ | 社内 AD 環境 | チケットベース、オフライン不可 |
| CAS | XML/JSON | 大学・教育機関 | シンプルな実装 |

```python
# SAML 2.0 SP の認証フロー概念実装（python3-saml を使用）
# pip install python3-saml

# === SAML レスポンスの検証ポイント ===
def validate_saml_response_checklist(saml_response_b64: str) -> dict:
    """
    SAML アサーションの検証チェックリスト
    実際の実装では python3-saml や onelogin/python-saml を使用すること
    """
    checks = {
        "署名の検証": "IdP の公開鍵証明書で XML 署名を検証する",
        "Issuer の確認": "アサーションの Issuer が信頼する IdP の EntityID と一致するか",
        "Audience の確認": "Audience Restriction が自分の SP EntityID を含むか",
        "有効期限の確認": "NotOnOrAfter が現在時刻より未来か（時刻同期に注意）",
        "InResponseTo の確認": "SP が送った AuthnRequest の ID と一致するか（リプレイ防止）",
        "SubjectConfirmation": "Bearer 方式の場合、送信先 ACS URL が一致するか",
    }
    return checks

# === OIDC による SSO 実装のポイント ===
oidc_best_practices = {
    "Discovery": "/.well-known/openid-configuration から IdP のメタデータを取得",
    "state": "CSRF 防止のためセッションに保存したランダム値を検証",
    "nonce": "ID トークンのリプレイ攻撃防止",
    "jwks_uri": "IdP の公開鍵セットを取得して ID トークンの署名を検証",
    "aud 検証": "ID トークンの aud が自分の client_id と一致するか確認",
    "iss 検証": "ID トークンの iss が信頼する IdP の issuer と一致するか確認",
}

print("SAML 2.0 検証チェックリスト:")
for item, description in validate_saml_response_checklist("").items():
    print(f"  [{item}]: {description}")

print("\nOIDC SSO 実装のベストプラクティス:")
for key, val in oidc_best_practices.items():
    print(f"  [{key}]: {val}")

# SLO（Single Log-Out）の重要性
slo_notes = """
SLO（シングルログアウト）の実装ポイント:
1. SP 側でローカルセッションを削除する
2. IdP に SLO リクエストを送信する
3. IdP は他の SP にもログアウトを通知する（SAML SLO）
4. フロントチャネル SLO: ブラウザリダイレクトで各 SP を呼び出す
5. バックチャネル SLO: サーバ間通信で各 SP のセッションを削除する
"""
print(slo_notes)
```

## 使用場面

- 企業の社内ポータルと業務システムの統合認証（SAML + Active Directory）
- SaaS アプリケーションへの従業員アクセス管理（Okta・Azure AD・Google Workspace）
- 消費者向けサービスでの「Google / Apple でログイン」（OIDC）
- 大学・研究機関の学術系フェデレーション認証（Shibboleth / eduGAIN）

## 参考文献

- [OASIS SAML 2.0 仕様](https://docs.oasis-open.org/security/saml/v2.0/)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [OWASP - SAML Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SAML_Security_Cheat_Sheet.html)
- [Okta - SSO のしくみ](https://www.okta.com/jp/identity-101/single-sign-on/)

<AffiliateBanner site="security_navi" />
