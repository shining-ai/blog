import AffiliateBanner from '@site/src/components/AffiliateBanner';

# CI/CD パイプラインの設計

## CI/CD とは

> CI（継続的インテグレーション）とは、コードの変更をメインブランチに頻繁にマージし、自動ビルド・テストで品質を継続的に検証するプラクティスであり、CD（継続的デリバリー/デプロイ）とは検証済みコードを本番環境またはステージング環境に自動的に届けるプロセスである。

**CI（Continuous Integration）**の核心は「頻繁なマージ + 自動テスト」である。コードをメインブランチから長期間乖離させると統合コストが指数的に増大する（マージ地獄）。CI は自動ビルド・単体テスト・リンター・静的解析をコミットごとに実行し、問題を即座に検知する。

**CD（Continuous Delivery）**は CI を通ったコードがステージング環境に自動デプロイされ、手動承認後に本番へ届けられる状態を指す。**CD（Continuous Deployment）**は承認なしに本番へ自動デプロイする最も進んだ形態である。

パイプラインの典型的な構成は **Lint → Unit Test → Build → Integration Test → Deploy to Staging → Smoke Test → Deploy to Production** である。各ステージは失敗したら即停止（Fail Fast）し、問題を早期に検知する。セキュリティ（SAST・依存関係スキャン）・パフォーマンステスト・コンテナイメージスキャンをパイプラインに組み込むことでセキュリティシフトレフトを実現する。

## CI/CD パイプラインのステージ

| ステージ | 内容 | ツール例 |
|---------|------|---------|
| Lint / 静的解析 | コードスタイル・型チェック | ESLint・ruff・mypy |
| Unit Test | 単体テスト・カバレッジ | pytest・Jest・JUnit |
| Build | コンパイル・コンテナイメージ作成 | Docker・npm build |
| Security Scan | 脆弱性・依存関係チェック | Trivy・Snyk・Dependabot |
| Integration Test | 結合テスト・E2E テスト | Playwright・Cypress |
| Deploy (Staging) | ステージング環境へデプロイ | ArgoCD・Helm・GitHub Actions |
| Deploy (Production) | 本番環境へデプロイ（Blue-Green・Canary） | Argo Rollouts・Spinnaker |

```yaml
# GitHub Actions による CI/CD パイプラインの設計例

name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # ===== ステージ1: Lint + 静的解析 =====
  lint:
    name: Lint & Static Analysis
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install dependencies
        run: |
          pip install ruff mypy

      - name: Run ruff (linter)
        run: ruff check src/

      - name: Run mypy (type checker)
        run: mypy src/

  # ===== ステージ2: Unit Test =====
  test:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: lint  # lint が通った後に実行
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install dependencies
        run: pip install -r requirements.txt pytest pytest-cov

      - name: Run tests with coverage
        run: |
          pytest tests/unit/ \
            --cov=src \
            --cov-report=xml \
            --cov-fail-under=80   # カバレッジ80%未満は失敗

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: coverage.xml

  # ===== ステージ3: Build & Security Scan =====
  build:
    name: Build & Security Scan
    runs-on: ubuntu-latest
    needs: test
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -t ${{ env.IMAGE_NAME }}:${{ github.sha }} .

      - name: Scan for vulnerabilities (Trivy)
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.IMAGE_NAME }}:${{ github.sha }}
          format: "sarif"
          severity: "CRITICAL,HIGH"
          exit-code: "1"   # CRITICAL/HIGH の脆弱性があれば失敗

      - name: Push to registry (mainブランチのみ)
        if: github.ref == 'refs/heads/main'
        run: |
          echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u $ --password-stdin
          docker push ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}

  # ===== ステージ4: Deploy to Staging =====
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment:
      name: staging
      url: https://staging.example.com
    steps:
      - name: Deploy to Kubernetes (Staging)
        run: |
          kubectl set image deployment/app \
            app=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
            --namespace staging

      - name: Run smoke tests
        run: |
          sleep 30  # デプロイ完了待ち
          curl -f https://staging.example.com/health || exit 1

  # ===== ステージ5: Deploy to Production (手動承認) =====
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: deploy-staging
    environment:
      name: production        # GitHub Environments で手動承認を設定
      url: https://example.com
    steps:
      - name: Deploy to Production (Blue-Green)
        run: |
          # Blue-Green デプロイ: 新バージョンを green に、検証後に traffic を切り替え
          kubectl set image deployment/app-green \
            app=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
            --namespace production
```

## 使用場面

- チームで日次・週次のデプロイサイクルを確立するとき
- 本番事故を防ぐためにデプロイ前のゲートを自動化するとき
- マイクロサービスの複数サービスを独立してデプロイするとき
- セキュリティコンプライアンス（DORA メトリクスの改善）が必要なとき

## 参考文献

- Humble, J. & Farley, D. (2010). *Continuous Delivery*. Addison-Wesley.
- [GitHub Actions ドキュメント](https://docs.github.com/en/actions)
- DORA (2023). *Accelerate State of DevOps Report*.

<AffiliateBanner site="software_navi" />
