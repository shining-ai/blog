import AffiliateBanner from '@site/src/components/AffiliateBanner';

# OWASP Top 10 の概要

## OWASP Top 10 とは

> OWASP Top 10 は、OWASP（Open Worldwide Application Security Project）が定期的に公開する、Web アプリケーションにおける最も重大なセキュリティリスクのランキングであり、開発者・セキュリティエンジニア向けの教育的ガイドラインである。

OWASP は非営利団体として世界中のセキュリティ専門家が参加し、実際の攻撃事例やデータをもとに Top 10 を策定する。最新版は **2021 年版**であり、アクセス制御の不備やインジェクション、安全でない設計などが主要リスクとして挙げられている。

**なぜ Top 10 を学ぶべきか：**
- 実際に多発する攻撃パターンを体系的に理解できる
- セキュリティ要件の定義・コードレビューの基準として活用できる
- PCI DSS・ISO 27001 などのコンプライアンスでも参照される
- 開発者がセキュリティを「後付け」でなく設計段階から考えるきっかけになる

OWASP Top 10 はあくまで「広く知られる主要リスク」のリストであり、すべての脆弱性を網羅するものではない。より詳細な評価には **OWASP Application Security Verification Standard（ASVS）** や **CVSS スコアリング** を組み合わせる。

## OWASP Top 10 2021 一覧

| 順位 | カテゴリ | 主な内容 |
|-----|---------|---------|
| A01 | アクセス制御の不備 | 認可チェック漏れ、IDOR、権限昇格 |
| A02 | 暗号化の失敗 | 平文送信、弱い暗号、鍵管理の不備 |
| A03 | インジェクション | SQL インジェクション、コマンドインジェクション、XSS |
| A04 | 安全でない設計 | 脅威モデリング・セキュア設計の欠如 |
| A05 | セキュリティ設定ミス | デフォルト設定、不要機能の有効化、エラー情報漏洩 |
| A06 | 脆弱・古いコンポーネント | 未パッチライブラリ・フレームワーク |
| A07 | 識別と認証の失敗 | 弱いパスワード、セッション固定、MFA 欠如 |
| A08 | ソフトウェアとデータの整合性の失敗 | 安全でない CI/CD、逆シリアル化 |
| A09 | セキュリティログとモニタリングの失敗 | 攻撃検知・証跡取得の不備 |
| A10 | サーバサイドリクエストフォージェリ（SSRF） | 内部リソースへの不正アクセス |

```python
# OWASP Top 10 2021 の分類と対策の概要をプログラム的に整理

owasp_top10_2021 = {
    "A01:2021": {
        "name": "アクセス制御の不備 (Broken Access Control)",
        "example": "ユーザー ID を変えて他人のデータにアクセス（IDOR）",
        "defense": [
            "最小権限の原則を適用",
            "サーバサイドで必ず認可チェックを実施",
            "デフォルトでアクセスを拒否する設計",
        ],
    },
    "A02:2021": {
        "name": "暗号化の失敗 (Cryptographic Failures)",
        "example": "HTTP で個人情報を送信、MD5 でパスワードを保存",
        "defense": [
            "HTTPS の強制、HSTS の設定",
            "パスワードは Argon2/bcrypt でハッシュ",
            "機密データの保存を最小化",
        ],
    },
    "A03:2021": {
        "name": "インジェクション (Injection)",
        "example": "SQL インジェクション、OS コマンドインジェクション、XSS",
        "defense": [
            "プリペアドステートメントの使用",
            "入力値の検証・エスケープ",
            "最小権限の DB アカウント",
        ],
    },
    "A04:2021": {
        "name": "安全でない設計 (Insecure Design)",
        "example": "セキュリティ要件の未定義、脅威モデリングの欠如",
        "defense": [
            "設計段階からの脅威モデリング",
            "セキュリティ設計パターンの活用",
            "セキュアな開発ライフサイクル（SDL）",
        ],
    },
    "A07:2021": {
        "name": "識別と認証の失敗 (Identification and Authentication Failures)",
        "example": "弱いパスワードポリシー、ブルートフォース対策なし",
        "defense": [
            "MFA の強制",
            "レート制限・アカウントロック",
            "セキュアなセッション管理",
        ],
    },
}

for code, info in owasp_top10_2021.items():
    print(f"\n[{code}] {info['name']}")
    print(f"  攻撃例: {info['example']}")
    print(f"  防御策: {', '.join(info['defense'])}")
```

## 使用場面

- Webアプリケーションの設計・開発時のセキュリティチェックリストとして活用
- コードレビューやペネトレーションテストの基準として参照
- セキュリティ教育・トレーニングのカリキュラム設計
- 脆弱性診断レポートの分類基準として使用

## 参考文献

- [OWASP Top 10 2021 公式サイト](https://owasp.org/www-project-top-ten/)
- [OWASP ASVS - アプリケーションセキュリティ検証標準](https://owasp.org/www-project-application-security-verification-standard/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [CWE Top 25 Most Dangerous Software Weaknesses](https://cwe.mitre.org/top25/)

<AffiliateBanner site="security_navi" />
