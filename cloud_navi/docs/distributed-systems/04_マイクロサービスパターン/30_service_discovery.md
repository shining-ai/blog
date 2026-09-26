import AffiliateBanner from '@site/src/components/AffiliateBanner';

# サービスディスカバリ

## サービスディスカバリとは

> サービスディスカバリ（Service Discovery）とは、マイクロサービス環境でサービスインスタンスのネットワークアドレス（IPアドレス・ポート）を動的に解決する仕組みであり、クラウドネイティブ環境でインスタンスが頻繁にスケールイン・アウトする状況でサービス間通信を可能にするための基盤技術である。

オンプレミスの固定環境では各サービスのIPアドレスが変わらないため、設定ファイルにハードコードできた。しかしKubernetesやコンテナ環境では、Podが起動するたびに異なるIPが割り当てられ、オートスケーリングで数が変わる。これに対応するのがサービスディスカバリだ。

**クライアントサイドディスカバリ（Client-Side Discovery）**: クライアントがサービスレジストリに直接問い合わせてインスタンスリストを取得し、自分でロードバランシングを行う。NETFLIXのEureka + Ribbon（Spring Cloud）がこのパターンの代表例だ。クライアントにロードバランシングロジックが必要で言語ごとに実装が必要だが、柔軟なロードバランシング戦略を取れる。

**サーバーサイドディスカバリ（Server-Side Discovery）**: クライアントはロードバランサーやAPI Gatewayにリクエストを送り、それがサービスレジストリを参照してルーティングする。Kubernetes Service・AWS Application Load Balancer・Istioがこのパターンだ。クライアントはディスカバリを意識しなくてよい。

**サービスレジストリ**はインスタンスの登録・更新・削除・検索を行うデータストアだ。代表的なものとしてConsul・etcd・Eureka・ZooKeeperがある。Kubernetesではetcd + kube-proxyがこの役割を担う。

Kubernetesでは**Service**リソースがサービスディスカバリの抽象化だ。PodにラベルセレクターでEndpointsを紐付け、CoreDNSがDNSベースのサービスディスカバリを提供する。

## ディスカバリパターンの比較

| パターン | ロジックの場所 | 代表実装 | 特徴 |
|---------|--------------|---------|------|
| クライアントサイド | クライアント自身 | Eureka + Ribbon | 柔軟なLB、言語ごと実装が必要 |
| サーバーサイド | ロードバランサー | Kubernetes Service・ALB | クライアントシンプル |
| DNS ベース | DNS サーバー | CoreDNS・Route53 | 標準的、TTLによるキャッシュに注意 |
| サービスメッシュ | サイドカープロキシ | Istio・Consul Connect | 高機能、オーバーヘッドあり |

```yaml
# Kubernetes でのサービスディスカバリ設定例

# ===== Deployment: 注文サービスの Pod 定義 =====
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-service
      version: v1
  template:
    metadata:
      labels:
        app: order-service    # Service がこのラベルで Pod を選択
        version: v1
    spec:
      containers:
        - name: order-service
          image: myapp/order-service:1.2.0
          ports:
            - containerPort: 8080
          # ヘルスチェック: Readiness が OK の Pod のみ Service に追加
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 20

---
# ===== Service: DNS 名を提供するサービスディスカバリ =====
apiVersion: v1
kind: Service
metadata:
  name: order-service        # DNS: order-service.production.svc.cluster.local
  namespace: production
spec:
  selector:
    app: order-service       # このラベルを持つ Pod にルーティング
  ports:
    - protocol: TCP
      port: 80               # Service のポート（クライアントが使う）
      targetPort: 8080       # Pod のポート
  type: ClusterIP            # クラスタ内部からのみアクセス可能

---
# ===== Headless Service: DNS でPod IPを直接解決（StatefulSet 用）=====
apiVersion: v1
kind: Service
metadata:
  name: order-service-headless
  namespace: production
spec:
  clusterIP: None            # ヘッドレス: ロードバランサーなしで Pod IP を直接返す
  selector:
    app: order-service
  ports:
    - port: 8080
```

```python
# Consul を使ったサービスディスカバリの実装例

import consul
import random
from typing import Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class ConsulServiceDiscovery:
    """
    Consul を使ったサービスディスカバリクライアント
    """
    def __init__(self, consul_host: str = 'localhost', consul_port: int = 8500):
        self.client = consul.Consul(host=consul_host, port=consul_port)

    def register_service(
        self,
        service_id: str,
        service_name: str,
        host: str,
        port: int,
        tags: list = None
    ) -> None:
        """サービスインスタンスをレジストリに登録"""
        self.client.agent.service.register(
            name=service_name,
            service_id=service_id,
            address=host,
            port=port,
            tags=tags or [],
            # ヘルスチェック設定
            check=consul.Check.http(
                url=f"http://{host}:{port}/health",
                interval="10s",   # 10秒ごとにチェック
                timeout="2s",
                deregister="60s"  # 60秒応答なしでデレジスト
            )
        )
        logger.info(f"サービス登録: {service_name} @ {host}:{port}")

    def deregister_service(self, service_id: str) -> None:
        """サービスをレジストリから削除（シャットダウン時）"""
        self.client.agent.service.deregister(service_id)
        logger.info(f"サービス削除: {service_id}")

    def discover(self, service_name: str) -> Optional[Tuple[str, int]]:
        """
        ヘルシーなサービスインスタンスをランダムに1つ選択
        クライアントサイドロードバランシング
        """
        index, services = self.client.health.service(
            service_name,
            passing=True   # ヘルスチェックが通っているもののみ
        )
        if not services:
            logger.warning(f"サービスが見つかりません: {service_name}")
            return None

        # ランダム選択（Round Robinなどより高度なLBも実装可能）
        service = random.choice(services)
        host = service['Service']['Address']
        port = service['Service']['Port']
        logger.info(f"サービス発見: {service_name} @ {host}:{port}")
        return (host, port)


# 使用例
sd = ConsulServiceDiscovery()

# サービス起動時に登録
sd.register_service(
    service_id="order-service-1",
    service_name="order-service",
    host="10.0.1.100",
    port=8080,
    tags=["v1", "production"]
)

# 呼び出し時にアドレスを動的に解決
endpoint = sd.discover("order-service")
if endpoint:
    host, port = endpoint
    print(f"注文サービスに接続: {host}:{port}")
```

## 使用場面

- Kubernetesで `order-service.production.svc.cluster.local` というDNS名でサービスを呼び出す場合
- オートスケーリングするサービスのインスタンスリストを動的に取得してロードバランシングする場合
- ConsulやetcdをサービスレジストリとしてKubernetes外のVMやコンテナに適用する場合
- Istioのサービスメッシュでサービスディスカバリとトラフィック管理を統合する場合

## 参考文献

- [Consul ドキュメント](https://developer.hashicorp.com/consul/docs)
- [Kubernetes — Service](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Microservices Patterns — Chris Richardson](https://microservices.io/patterns/service-registry.html)

<AffiliateBanner site="cloud_navi" />
