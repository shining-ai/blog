import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 依存関係の脆弱性管理（SCA）

## 依存関係の脆弱性管理とは

> 依存関係の脆弱性管理（SCA: Software Composition Analysis）とは、アプリケーションが利用するオープンソースライブラリや外部パッケージに含まれる既知の脆弱性（CVE）を継続的に検出・修正するプロセスであり、現代のソフトウェア開発においてサプライチェーンリスク管理の中心となる。

現代の Web アプリケーションのコードのうち **70〜90%** が直接・間接の依存ライブラリで構成されているとされる。2021年の Log4Shell（CVE-2021-44228）は Java の Log4j ライブラリの脆弱性で、世界中の無数のシステムに影響を与えた。依存関係を把握していなかった組織は対応に数週間を要した。

**推移的依存（Transitive Dependency）の問題：**
直接インポートするライブラリが依存しているライブラリ（間接依存）まで含めると、依存の総数は数百〜数千になる。脆弱性は直接依存より間接依存に含まれることが多い。

**SBOM（Software Bill of Materials）：**
ソフトウェア部品表。使用している全ライブラリのリストとバージョンを記録した文書。新たな CVE が発表されたとき、影響を受けるシステムを即座に特定するために不可欠。米国では政府調達で SBOM の提出が義務化されつつある。

## SCA ツールと対応エコシステム

| ツール | エコシステム | 特徴 | 費用 |
|--------|------------|------|------|
| **Dependabot** | npm・pip・Maven・Go・RubyGems 等 | GitHub 組み込み・自動 PR 作成 | 無料 |
| **Snyk** | 同上 + コンテナ・IaC | 修正提案・ライセンスチェック | Free / Pro |
| **Trivy** | OCI コンテナ・OS パッケージ・言語 | 高速・SBOM 出力対応 | 無料（OSS） |
| **OWASP Dependency-Check** | Java・.NET・Python・Node 等 | OWASP 公式・SARIF 出力 | 無料（OSS） |
| **pip-audit** | Python pip | Python 専用・高速 | 無料（OSS） |
| **npm audit** | Node.js npm | npm 組み込み | 無料 |

```python
# 依存関係の脆弱性管理の自動化（Python pip-audit の活用）
import subprocess
import json
import sys
from dataclasses import dataclass

@dataclass
class Vulnerability:
    """検出された脆弱性の情報"""
    package: str
    installed_version: str
    vuln_id: str          # CVE ID または PYSEC ID
    fix_versions: list[str]
    description: str
    severity: str

def run_pip_audit() -> list[Vulnerability]:
    """
    pip-audit を実行して Python 依存パッケージの脆弱性を検出する。
    pip install pip-audit が必要。
    """
    result = subprocess.run(
        [sys.executable, "-m", "pip_audit", "--format", "json"],
        capture_output=True, text=True
    )

    if result.returncode not in (0, 1):  # 1は脆弱性が見つかった場合
        print(f"pip-audit の実行エラー: {result.stderr}")
        return []

    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError:
        return []

    vulns = []
    for dep in data.get("dependencies", []):
        for vuln in dep.get("vulns", []):
            vulns.append(Vulnerability(
                package=dep.get("name", ""),
                installed_version=dep.get("version", ""),
                vuln_id=vuln.get("id", ""),
                fix_versions=vuln.get("fix_versions", []),
                description=vuln.get("description", "")[:100],
                severity=vuln.get("aliases", ["UNKNOWN"])[0],
            ))
    return vulns


def parse_requirements(req_file: str) -> dict[str, str]:
    """requirements.txt を解析してパッケージ名とバージョンを返す"""
    packages: dict[str, str] = {}
    try:
        with open(req_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    if "==" in line:
                        name, version = line.split("==", 1)
                        packages[name.strip().lower()] = version.strip()
                    elif ">=" in line:
                        name = line.split(">=")[0].strip()
                        packages[name.lower()] = ">= (バージョン固定推奨)"
    except FileNotFoundError:
        pass
    return packages


# SBOM（ソフトウェア部品表）の生成
def generate_sbom(req_file: str) -> dict:
    """
    requirements.txt から簡易的な SBOM を生成する。
    実際の運用では cyclonedx-bom や syft を使うことを推奨。
    """
    from datetime import datetime, timezone

    packages = parse_requirements(req_file)
    sbom = {
        "bomFormat": "CycloneDX",
        "specVersion": "1.4",
        "serialNumber": f"urn:sbom:{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
        "components": [
            {"type": "library", "name": name, "version": version}
            for name, version in packages.items()
        ],
        "metadata": {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "tools": [{"name": "custom-sbom-generator", "version": "1.0"}],
        },
    }
    return sbom


print("=== 依存関係の脆弱性管理ベストプラクティス ===\n")

best_practices = {
    "バージョン固定": [
        "requirements.txt や package.json で == を使って正確なバージョンを固定する",
        "lock ファイル（poetry.lock・package-lock.json）を必ず VCS に含める",
        "依存の更新は自動 PR（Dependabot）を通じて定期的に実施する",
    ],
    "継続的なスキャン": [
        "pip-audit / npm audit / trivy を CI パイプラインに組み込む",
        "CRITICAL・HIGH の CVE はマージをブロックするセキュリティゲートを設定する",
        "週次でスケジュールスキャンを実施して新規 CVE に対応する",
    ],
    "SBOM の管理": [
        "リリースごとに SBOM を生成して保存する",
        "新しい CVE が公表されたとき SBOM を照合して影響範囲を即座に特定する",
        "SBOM フォーマットは CycloneDX または SPDX を使用する",
    ],
    "ライセンス管理": [
        "GPL ライセンスのライブラリをプロプライエタリ製品に混在させないよう確認する",
        "Trivy・Fossa でライセンス互換性を自動チェックする",
    ],
}

for category, practices in best_practices.items():
    print(f"[{category}]")
    for p in practices:
        print(f"  - {p}")
    print()
```

## 使用場面

- Log4Shell のような新規 CVE 発表時の影響を受けるシステムの即時特定
- Dependabot を有効化して依存関係の自動更新 PR を受け取る設定
- コンテナイメージの Trivy スキャンを CI/CD に組み込んで脆弱な OS パッケージを検出
- SBOM を生成して顧客・規制機関への提出や内部管理に活用
- 新しいライブラリ採用前の CVE 履歴・メンテナンス状況の調査

## 参考文献

- [OWASP - Dependency-Check](https://owasp.org/www-project-dependency-check/)
- [Trivy - OSS Vulnerability Scanner](https://trivy.dev/)
- [CycloneDX SBOM Standard](https://cyclonedx.org/)
- [CISA - Software Bill of Materials](https://www.cisa.gov/sbom)

<AffiliateBanner site="security_navi" />
