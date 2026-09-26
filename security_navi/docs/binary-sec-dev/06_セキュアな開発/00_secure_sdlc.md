import AffiliateBanner from '@site/src/components/AffiliateBanner';

# セキュア SDLC の考え方

## セキュア SDLC とは

> セキュア SDLC（Secure Software Development Life Cycle）とは、ソフトウェア開発のすべての段階（要件定義・設計・実装・テスト・デプロイ・運用）にセキュリティ活動を組み込むことで、脆弱性を早期発見・修正してセキュアなソフトウェアを継続的に提供するプロセスである。

従来の「開発後にセキュリティテストを実施する」アプローチでは、脆弱性が発見される頃には大量のコードが積み上がっており、修正コストが膨大になる。セキュア SDLC では「**シフトレフト（Shift Left）**」の概念のもと、セキュリティを開発プロセスの左側（早い段階）に持ってくることでコストと品質の両方を改善する。

**脆弱性修正コストの差：**
NIST の調査によると、要件定義フェーズで発見・修正した脆弱性のコストを 1 とすると、テストフェーズでは 15 倍、リリース後では 100 倍以上のコストがかかるとされている。

**代表的なセキュア SDLC フレームワーク：**
- **Microsoft SDL (Security Development Lifecycle)**：マイクロソフトが開発したフレームワーク
- **OWASP SAMM (Software Assurance Maturity Model)**：成熟度モデルとして組織の現状評価に使える
- **BSIMM (Building Security In Maturity Model)**：実際の組織の取り組みを調査してベンチマーク化

## フェーズ別のセキュリティ活動

| フェーズ | セキュリティ活動 | 主要ツール・手法 |
|---------|--------------|----------------|
| **要件定義** | セキュリティ要件の定義・法規制の確認 | OWASP ASVS・プライバシー影響評価 |
| **設計** | 脅威モデリング・設計レビュー | STRIDE・DFD・Attack Trees |
| **実装** | セキュアコーディング・コードレビュー | SAST・リンター・コーディング標準 |
| **テスト** | セキュリティテスト・DAST | DAST・ペネトレーションテスト・ファジング |
| **デプロイ** | セキュアな設定・シークレット管理 | IaC スキャン・シークレット管理ツール |
| **運用・監視** | 脆弱性管理・インシデント対応 | SCA・SIEM・脆弱性スキャン |

```python
# セキュア SDLC の各フェーズで実施すべきチェック項目
from dataclasses import dataclass, field
from enum import Enum

class Phase(Enum):
    REQUIREMENTS = "要件定義"
    DESIGN = "設計"
    IMPLEMENTATION = "実装"
    TESTING = "テスト"
    DEPLOYMENT = "デプロイ"
    OPERATIONS = "運用"

@dataclass
class SecurityActivity:
    """セキュリティ活動の定義"""
    phase: Phase
    activity: str
    tool_or_method: str
    priority: str  # High / Medium / Low


# セキュア SDLC チェックリスト
ACTIVITIES: list[SecurityActivity] = [
    # 要件定義
    SecurityActivity(Phase.REQUIREMENTS, "認証・認可要件の定義（OWASP ASVS L1〜L3）", "OWASP ASVS", "High"),
    SecurityActivity(Phase.REQUIREMENTS, "個人情報・機密データの取り扱い要件", "プライバシー影響評価", "High"),
    SecurityActivity(Phase.REQUIREMENTS, "コンプライアンス要件の確認（PCI DSS・HIPAA・GDPR）", "法規制チェックリスト", "High"),

    # 設計
    SecurityActivity(Phase.DESIGN, "脅威モデリングの実施（STRIDE・PASTA）", "OWASP Threat Dragon", "High"),
    SecurityActivity(Phase.DESIGN, "最小権限の原則の適用", "設計レビュー", "High"),
    SecurityActivity(Phase.DESIGN, "機密データの暗号化設計", "暗号化ガイドライン", "High"),
    SecurityActivity(Phase.DESIGN, "認証・セッション管理の設計", "OWASP Cheat Sheet", "High"),

    # 実装
    SecurityActivity(Phase.IMPLEMENTATION, "SAST ツールを CI パイプラインに組み込む", "Semgrep・SonarQube", "High"),
    SecurityActivity(Phase.IMPLEMENTATION, "依存パッケージの脆弱性スキャン（SCA）", "Dependabot・Snyk", "High"),
    SecurityActivity(Phase.IMPLEMENTATION, "シークレットのハードコーディング禁止", "git-secrets・truffleHog", "High"),
    SecurityActivity(Phase.IMPLEMENTATION, "セキュアコーディングガイドラインの遵守", "コーディング標準文書", "Medium"),

    # テスト
    SecurityActivity(Phase.TESTING, "DAST によるブラックボックステスト", "OWASP ZAP・Burp Suite", "High"),
    SecurityActivity(Phase.TESTING, "ファジングテストの実施", "AFL++・libFuzzer", "Medium"),
    SecurityActivity(Phase.TESTING, "ペネトレーションテスト（リリース前）", "外部ペンテスト会社", "High"),

    # デプロイ
    SecurityActivity(Phase.DEPLOYMENT, "IaC（Terraform 等）のセキュリティスキャン", "Checkov・tfsec", "High"),
    SecurityActivity(Phase.DEPLOYMENT, "コンテナイメージの脆弱性スキャン", "Trivy・Grype", "High"),
    SecurityActivity(Phase.DEPLOYMENT, "シークレットを Vault 等で管理", "HashiCorp Vault・AWS Secrets Manager", "High"),

    # 運用
    SecurityActivity(Phase.OPERATIONS, "継続的な脆弱性スキャン", "Qualys・Tenable", "High"),
    SecurityActivity(Phase.OPERATIONS, "セキュリティパッチの迅速な適用", "パッチ管理プロセス", "High"),
    SecurityActivity(Phase.OPERATIONS, "SIEM によるセキュリティ監視", "Splunk・Elastic SIEM", "High"),
]


def print_sdlc_checklist() -> None:
    """フェーズ別にチェックリストを出力する"""
    current_phase = None
    for activity in ACTIVITIES:
        if activity.phase != current_phase:
            current_phase = activity.phase
            print(f"\n=== {current_phase.value} ===")
        priority_mark = "[!]" if activity.priority == "High" else "[ ]"
        print(f"  {priority_mark} {activity.activity}")
        print(f"       → {activity.tool_or_method}")


print("=== セキュア SDLC チェックリスト ===")
print_sdlc_checklist()

print("\n\n=== DevSecOps パイプラインの構成例 ===")
pipeline_stages = [
    ("コミット時",   ["git-secrets（シークレット検出）", "リンター", "ユニットテスト"]),
    ("PR レビュー", ["SAST（Semgrep）", "SCA（Dependabot）", "コードレビュー"]),
    ("ビルド時",     ["コンテナイメージスキャン（Trivy）", "IaC スキャン（Checkov）"]),
    ("ステージング", ["DAST（OWASP ZAP）", "インテグレーションテスト"]),
    ("本番デプロイ", ["変更管理承認", "デプロイ後の自動スキャン"]),
    ("本番監視",     ["SIEM アラート", "脆弱性スキャン（週次）", "ペンテスト（年次）"]),
]
for stage, tools in pipeline_stages:
    print(f"  [{stage}]")
    for t in tools:
        print(f"    - {t}")
```

## 使用場面

- 開発チームへのセキュア SDLC 導入時のロードマップ作成
- CI/CD パイプラインへの SAST・SCA・コンテナスキャンの組み込み
- OWASP SAMM を使った組織のセキュリティ成熟度評価
- セキュリティ要件を要件定義に含めるためのチェックリスト整備
- ペネトレーションテストの計画と契約（スコープの定義）

## 参考文献

- [Microsoft SDL - Security Development Lifecycle](https://www.microsoft.com/en-us/securityengineering/sdl)
- [OWASP SAMM - Software Assurance Maturity Model](https://owaspsamm.org/)
- [OWASP ASVS - Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/)
- [NIST SP 800-64 - Security Considerations in the System Development Life Cycle](https://csrc.nist.gov/publications/detail/sp/800-64/rev-2/final)

<AffiliateBanner site="security_navi" />
