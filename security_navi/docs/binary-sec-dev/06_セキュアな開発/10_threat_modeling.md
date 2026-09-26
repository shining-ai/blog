import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 脅威モデリング（STRIDE）

## 脅威モデリングとは

> 脅威モデリングとは、システムの設計段階で「攻撃者がどのように悪用するか」を体系的に検討し、設計上のセキュリティリスクを早期に発見・対処するプロセスであり、修正コストが低い設計フェーズで脆弱性の根本原因を取り除ける。

脅威モデリングは「考えられる最悪のケースを事前に考える」作業である。開発チーム・セキュリティエンジニア・アーキテクトが協力して、システムの **データフロー図（DFD）** を作成し、各コンポーネントや信頼境界に対してどんな攻撃が成立するかを列挙する。

**STRIDE** は Microsoft が考案した脅威の分類モデルで、頭文字からなる6種類の脅威カテゴリを表す。各カテゴリに対して「セキュリティ特性で何が侵害されるか」と「対策」が対応付けられているため、脅威を漏れなく検討できる。

**脅威モデリングの手順（4ステップ）：**
1. **何を構築しているか**：システムの DFD（データフロー図）を作成する
2. **何が問題になりうるか**：STRIDE で脅威を列挙する
3. **どう対処するか**：各脅威への対策を設計に組み込む
4. **作業は適切だったか**：見直しとレビューを実施する

## STRIDE モデルの詳細

| 脅威カテゴリ | 意味 | 侵害されるセキュリティ特性 | 対策例 |
|------------|------|--------------------------|--------|
| **S**poofing（なりすまし）| 他者のID を偽る | 認証（Authentication） | MFA・強力な認証・証明書 |
| **T**ampering（改ざん）| データを不正に変更する | 完全性（Integrity） | デジタル署名・ハッシュ・HMAC |
| **R**epudiation（否認）| 行為を否定できる状態 | 否認不能性（Non-repudiation） | 監査ログ・タイムスタンプ |
| **I**nformation Disclosure（情報漏洩）| 権限なしにデータを閲覧 | 機密性（Confidentiality） | 暗号化・アクセス制御 |
| **D**enial of Service（サービス拒否）| サービスを利用不能にする | 可用性（Availability） | レート制限・スケーリング |
| **E**levation of Privilege（権限昇格）| 不正に高い権限を取得 | 認可（Authorization） | 最小権限・RBAC |

```python
# STRIDE 脅威モデリングの実装例（教育目的）
from dataclasses import dataclass, field
from enum import Enum

class STRIDECategory(Enum):
    SPOOFING = "Spoofing（なりすまし）"
    TAMPERING = "Tampering（改ざん）"
    REPUDIATION = "Repudiation（否認）"
    INFO_DISCLOSURE = "Information Disclosure（情報漏洩）"
    DOS = "Denial of Service（サービス拒否）"
    ELEVATION = "Elevation of Privilege（権限昇格）"

class RiskLevel(Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"

@dataclass
class Threat:
    """特定された脅威の記録"""
    id: str
    component: str           # 対象コンポーネント（例: "ログイン API"）
    category: STRIDECategory
    description: str
    risk: RiskLevel
    mitigations: list[str] = field(default_factory=list)
    status: str = "Open"     # Open / Mitigated / Accepted

@dataclass
class ThreatModel:
    """システムの脅威モデル"""
    system_name: str
    threats: list[Threat] = field(default_factory=list)

    def add_threat(self, threat: Threat) -> None:
        self.threats.append(threat)

    def get_by_risk(self, risk: RiskLevel) -> list[Threat]:
        return [t for t in self.threats if t.risk == risk]

    def print_report(self) -> None:
        print(f"\n=== 脅威モデルレポート: {self.system_name} ===")
        print(f"脅威総数: {len(self.threats)} 件\n")

        for risk in [RiskLevel.HIGH, RiskLevel.MEDIUM, RiskLevel.LOW]:
            threats = self.get_by_risk(risk)
            if threats:
                print(f"[{risk.value} リスク: {len(threats)} 件]")
                for t in threats:
                    print(f"  ID: {t.id}  [{t.category.value}]")
                    print(f"  コンポーネント: {t.component}")
                    print(f"  脅威: {t.description}")
                    print(f"  対策:")
                    for m in t.mitigations:
                        print(f"    - {m}")
                    print(f"  状態: {t.status}\n")


# === Web アプリケーションの脅威モデル例 ===
model = ThreatModel("ECサイト（Web アプリケーション）")

model.add_threat(Threat(
    id="T-001",
    component="ログイン API",
    category=STRIDECategory.SPOOFING,
    description="攻撃者が窃取したパスワードで正規ユーザーになりすます（クレデンシャルスタッフィング）",
    risk=RiskLevel.HIGH,
    mitigations=[
        "多要素認証（MFA）の必須化",
        "ログイン試行の失敗回数制限とアカウントロック",
        "Passkeys / FIDO2 への移行",
    ]
))

model.add_threat(Threat(
    id="T-002",
    component="注文データ API",
    category=STRIDECategory.TAMPERING,
    description="攻撃者が送信中の注文データ（数量・価格）を改ざんする",
    risk=RiskLevel.HIGH,
    mitigations=[
        "HTTPS（TLS 1.2+）による通信の暗号化",
        "サーバサイドでの価格・在庫の再検証",
        "リクエスト署名（HMAC）によるデータ完全性の確認",
    ]
))

model.add_threat(Threat(
    id="T-003",
    component="管理画面",
    category=STRIDECategory.ELEVATION,
    description="一般ユーザーが URL 推測や IDOR で管理機能にアクセスする",
    risk=RiskLevel.HIGH,
    mitigations=[
        "サーバサイドでの認可チェック（RBAC）の徹底",
        "管理画面を別サブドメイン・IP 制限付きで分離",
        "すべてのリクエストで権限確認を実施",
    ]
))

model.add_threat(Threat(
    id="T-004",
    component="ログシステム",
    category=STRIDECategory.REPUDIATION,
    description="攻撃者がログを消去・改ざんして証跡を消す",
    risk=RiskLevel.MEDIUM,
    mitigations=[
        "ログを書き込み専用のリモートサーバ（SIEM）に転送",
        "ログファイルのデジタル署名・タイムスタンプ",
        "ログ削除の操作自体をログに記録する",
    ]
))

model.print_report()
```

## 使用場面

- 新機能・新サービスの設計時に DFD を作成してSTRIDE で脅威を列挙する
- スプリント計画にセキュリティ要件として脅威モデリングの結果を追加する
- OWASP Threat Dragon を使って DFD とSTRIDE 脅威の図を作成する
- セキュリティ要件として「T-001 の MFA 実装」を Issue・チケットに落とし込む
- ペネトレーションテストのスコープ設定に脅威モデルを活用する

## 参考文献

- [Microsoft - Threat Modeling (STRIDE)](https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool)
- [OWASP Threat Dragon](https://owasp.org/www-project-threat-dragon/)
- [OWASP - Threat Modeling Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html)
- [Adam Shostack - Threat Modeling: Designing for Security (Wiley)](https://www.wiley.com/en-us/Threat+Modeling%3A+Designing+for+Security-p-9781118809990)

<AffiliateBanner site="security_navi" />
