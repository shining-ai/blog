import AffiliateBanner from '@site/src/components/AffiliateBanner';

# SAST・DAST・SCA ツール

## SAST・DAST・SCA とは

> SAST（静的アプリケーションセキュリティテスト）・DAST（動的アプリケーションセキュリティテスト）・SCA（ソフトウェアコンポジション解析）は、開発から運用の各フェーズでアプリケーションの脆弱性を自動的に発見するための3種類の補完的なセキュリティテスト手法である。

現代の Web アプリケーションは数万行のコードと数百の依存ライブラリで構成される。人間によるコードレビューやペネトレーションテストだけでは網羅的な検査が困難であり、自動化ツールによる継続的な脆弱性検出が不可欠である。

**3種類の違い：**
- **SAST**：ソースコードや中間表現を解析する「ホワイトボックス」テスト。実行不要。実装フェーズで早期発見できる。
- **DAST**：実行中のアプリケーションにリクエストを送って応答を確認する「ブラックボックス」テスト。実際の動作を検証できる。
- **SCA**：使用しているオープンソースライブラリの既知の脆弱性（CVE）を検出する。依存関係の管理が対象。

## 3種類の比較

| 項目 | SAST | DAST | SCA |
|------|------|------|-----|
| 解析対象 | ソースコード・バイナリ | 実行中アプリ | 依存ライブラリ |
| 実行タイミング | コミット・ビルド時 | テスト・ステージング | コミット・ビルド時 |
| 検出できる脆弱性 | SQL インジェクション・XSS（コードパターン） | 実際の認証バイパス・IDOR | 既知 CVE・ライセンス違反 |
| 誤検知 | 多い（False Positive が多い） | 少ない（実際に動作で確認） | 少ない（CVE DB と照合） |
| 代表的 OSS ツール | Semgrep・SonarQube | OWASP ZAP・Nuclei | Dependabot・OWASP Dependency-Check |
| 代表的商用ツール | Checkmarx・Fortify | Burp Suite Enterprise・Invicti | Snyk・WhiteSource |

```python
# CI パイプラインへの SAST・DAST・SCA 統合例（GitHub Actions 設定のコメント付き解説）

# GitHub Actions ワークフローの構成例
pipeline_config = """
# .github/workflows/security.yml

name: Security Scan Pipeline

on: [push, pull_request]

jobs:
  # ========== SAST: 静的コード解析 ==========
  sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Semgrep: オープンソースの SAST ツール
      # Python/JS/Go/Java など多言語対応、OWASP ルールセット使用可能
      - name: Semgrep SAST Scan
        uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/owasp-top-ten
            p/python
            p/secrets
        env:
          SEMGREP_APP_TOKEN: ${{ secrets.SEMGREP_APP_TOKEN }}

  # ========== SCA: 依存関係の脆弱性スキャン ==========
  sca:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Trivy: コンテナイメージ + 依存パッケージの脆弱性スキャン
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'        # ファイルシステムスキャン
          scan-ref: '.'
          format: 'sarif'        # GitHub Security タブで確認可能
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'  # 重大・高リスクのみ検出

      - name: Upload Trivy scan results to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'

  # ========== DAST: 動的アプリケーションテスト ==========
  dast:
    runs-on: ubuntu-latest
    needs: [deploy-staging]    # ステージング環境のデプロイ後に実行
    steps:
      - name: OWASP ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.10.0
        with:
          target: 'https://staging.example.com'   # テスト対象 URL
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a'                         # 認証付きスキャン
"""

# Semgrep のカスタムルール例（Python の SQL インジェクション検出）
semgrep_custom_rule = """
# .semgrep/custom-rules.yml
rules:
  - id: python-string-concat-sql
    patterns:
      - pattern: |
          $QUERY = "..." + $USER_INPUT
          $DB.execute($QUERY)
    message: |
      SQL クエリの文字列連結は SQL インジェクションの原因になります。
      プリペアドステートメントを使用してください。
    severity: ERROR
    languages: [python]
    metadata:
      category: security
      cwe: CWE-89
      owasp: A03:2021 - Injection
"""

print("=== セキュリティスキャンツールの選定ガイド ===\n")

tool_guide = {
    "SAST ツール選定基準": [
        "対応言語（Python・Java・Go・TypeScript 等）",
        "誤検知の少なさと調整可能なルール",
        "CI/CD との統合容易性（GitHub Actions・GitLab CI）",
        "SARIF 形式での出力（GitHub Security タブに統合可能）",
    ],
    "DAST ツール選定基準": [
        "認証フロー（JWT・セッションクッキー）への対応",
        "スキャン速度と網羅性のバランス",
        "API テスト（OpenAPI / GraphQL）への対応",
        "誤検知の報告機能と除外設定",
    ],
    "SCA ツール選定基準": [
        "CVE データベースの更新頻度",
        "修正バージョンの自動 PR 作成機能（Dependabot 等）",
        "ライセンス違反の検出（GPL 汚染等）",
        "SBOM（ソフトウェア部品表）の出力対応",
    ],
}

for category, criteria in tool_guide.items():
    print(f"[{category}]")
    for c in criteria:
        print(f"  - {c}")
    print()

print(pipeline_config)
print(semgrep_custom_rule)
```

## 使用場面

- GitHub Actions・GitLab CI への SAST（Semgrep）・SCA（Trivy・Dependabot）の組み込み
- ステージング環境で OWASP ZAP によるリリース前の DAST を自動実行
- SBOM（ソフトウェア部品表）を生成してサプライチェーンセキュリティを管理
- セキュリティゲート（重大な脆弱性があればデプロイを停止）の実装
- 新規 CVE が発表されたときに影響を受けるシステムを迅速に特定

## 参考文献

- [Semgrep - OSS SAST Tool](https://semgrep.dev/)
- [OWASP ZAP - DAST Tool](https://www.zaproxy.org/)
- [Trivy - Container & Filesystem Scanner](https://trivy.dev/)
- [OWASP - Dependency-Check](https://owasp.org/www-project-dependency-check/)

<AffiliateBanner site="security_navi" />
