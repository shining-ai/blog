import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Pod・Deployment・Service

## Pod とは

> Pod とは Kubernetes における最小のデプロイ単位であり、1つ以上のコンテナと共有ストレージ・ネットワークをまとめたグループである。

KubernetesではDockerコンテナを直接管理するのではなく、Podという抽象レイヤーを通じて管理する。Pod内のコンテナは同じIPアドレスとネットワーク名前空間を共有し、localhostで相互に通信できる。

しかしPodを直接作成することは少なく、通常は**Deployment**を使ってPodを管理する。DeploymentはPodのレプリカ数・ローリングアップデート戦略・ロールバックを管理する上位リソースだ。`spec.replicas`に指定した数のPodが常に稼働するよう、コントローラーが自動的に維持する。

**Service**はPodへのアクセスを安定させる仕組みだ。PodはスケールアウトやPod再起動のたびにIPアドレスが変わるため、直接IPを指定することはできない。Serviceはラベルセレクタを使って対象のPodを選択し、安定したDNS名・仮想IPを提供してロードバランシングを行う。

Serviceには複数の種別がある。`ClusterIP`はクラスタ内部からのみアクセス可能なデフォルト設定、`NodePort`はワーカーノードのポートを通じて外部公開、`LoadBalancer`はクラウドプロバイダーのロードバランサと統合する。

## Kubernetes リソースの種類比較

| リソース | 役割 |
|---------|------|
| Pod | 最小デプロイ単位。コンテナを包むグループ |
| Deployment | Podのライフサイクル管理・ローリングアップデート |
| ReplicaSet | 指定レプリカ数のPod維持（通常Deploymentが管理） |
| StatefulSet | 順序付き・永続IDを持つPodの管理（DB向け） |
| DaemonSet | 全ノードに1つずつPodを配置 |
| Service | Podへの安定したネットワークアクセス |

```yaml
# Deployment の例
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: production
  labels:
    app: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: myregistry.example.com/myapp:v1.2.0
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 20
---
# Service の例（ClusterIP）
apiVersion: v1
kind: Service
metadata:
  name: myapp-svc
  namespace: production
spec:
  selector:
    app: myapp
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
  type: ClusterIP
---
# 外部公開用 Service（LoadBalancer）
apiVersion: v1
kind: Service
metadata:
  name: myapp-lb
  namespace: production
spec:
  selector:
    app: myapp
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
  type: LoadBalancer
```

## 使用場面

- ステートレスなWebアプリケーションをDeploymentで複数レプリカ運用する場合
- マイクロサービス間の通信をService名（DNS）で解決する場合
- ローリングアップデートで無停止デプロイを実現する場合
- データベースのようなステートフルなアプリにStatefulSetを使う場合

## 参考文献

- [Kubernetes — Pod の概念](https://kubernetes.io/docs/concepts/workloads/pods/)
- [Kubernetes — Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Kubernetes — Service](https://kubernetes.io/docs/concepts/services-networking/service/)

<AffiliateBanner site="cloud_navi" />
