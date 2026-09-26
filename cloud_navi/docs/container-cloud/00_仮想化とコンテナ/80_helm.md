import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Helm によるパッケージ管理

## Helm とは

> Helm とは Kubernetes 用のパッケージマネージャーであり、複数の Kubernetes マニフェストをチャートとしてまとめ、テンプレート化・バージョン管理・配布を可能にするツールである。

Kubernetesアプリケーションをデプロイするには多数のYAMLマニフェスト（Deployment・Service・ConfigMap・Ingress・Secret・HPA...）を管理しなければならない。これらをGit管理するだけでは、環境ごとの設定差分（本番とステージングでレプリカ数やイメージタグが異なるなど）を扱うのが難しい。

Helmはこの問題を**チャート**という概念で解決する。チャートはKubernetesリソースを定義するテンプレートの集まりで、`values.yaml`によって環境ごとに設定を注入できる。Goのテンプレートエンジンを使っているため、条件分岐やループなど柔軟な記述が可能だ。

`helm install`でチャートをデプロイすると**リリース**が作成される。リリースはバージョン管理されており、`helm upgrade`でアップグレード、`helm rollback`で以前のバージョンに戻せる。

**Helm Hub（Artifact Hub）**には公式・コミュニティのチャートが多数公開されており、nginx・PostgreSQL・Prometheusなどをすぐにデプロイできる。

## Helm の主要コマンド

| コマンド | 用途 |
|---------|------|
| `helm repo add` | チャートリポジトリの追加 |
| `helm search repo` | チャートの検索 |
| `helm install` | チャートのインストール（リリース作成） |
| `helm upgrade` | リリースのアップグレード |
| `helm rollback` | リリースのロールバック |
| `helm list` | リリース一覧の表示 |
| `helm uninstall` | リリースの削除 |

```bash
# Helm リポジトリの追加
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# チャートの検索
helm search repo bitnami/postgresql

# デフォルト値の確認
helm show values bitnami/postgresql

# カスタム values.yaml を使ったインストール
helm install my-db bitnami/postgresql \
  --namespace database \
  --create-namespace \
  --values ./my-postgres-values.yaml

# リリース一覧
helm list -A

# アップグレード
helm upgrade my-db bitnami/postgresql \
  --namespace database \
  --values ./my-postgres-values.yaml \
  --set image.tag=16.1.0

# ロールバック（前のリビジョンへ）
helm rollback my-db 1 -n database

# リリースの詳細確認
helm status my-db -n database

# 独自チャートの作成
helm create mychart
```

```yaml
# values.yaml — 環境別設定の例
# デフォルト値（開発環境）
replicaCount: 1

image:
  repository: myregistry.example.com/myapp
  tag: "latest"
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80

resources:
  requests:
    cpu: "100m"
    memory: "128Mi"
  limits:
    cpu: "500m"
    memory: "512Mi"

autoscaling:
  enabled: false
  minReplicas: 1
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

ingress:
  enabled: false
```

```yaml
# values-production.yaml — 本番環境で上書きする値
replicaCount: 3

image:
  tag: "v1.5.2"
  pullPolicy: Always

resources:
  requests:
    cpu: "500m"
    memory: "512Mi"
  limits:
    cpu: "2000m"
    memory: "2Gi"

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 30

ingress:
  enabled: true
  hostname: myapp.example.com
```

## 使用場面

- Prometheusスタック・cert-manager・ingress-nginxなどのインフラコンポーネントをクラスタにインストールする場合
- 複数環境（dev・staging・production）で同一チャートを設定値のみ変えてデプロイする場合
- GitOps（ArgoCD・Flux）でHelmリリースをGit管理してCI/CDに組み込む場合
- 社内の共通アプリテンプレートをチャートとして配布・標準化する場合

## 参考文献

- [Helm 公式ドキュメント](https://helm.sh/docs/)
- [Artifact Hub — Helm チャートのリポジトリ](https://artifacthub.io/)
- [Helm ベストプラクティス](https://helm.sh/docs/chart_best_practices/)

<AffiliateBanner site="cloud_navi" />
