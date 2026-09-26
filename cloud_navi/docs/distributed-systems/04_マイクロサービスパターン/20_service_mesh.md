import AffiliateBanner from '@site/src/components/AffiliateBanner';

# サービスメッシュ（Istio・Envoy）

## サービスメッシュとは

> サービスメッシュ（Service Mesh）とは、マイクロサービス間の通信を管理するインフラストラクチャレイヤーであり、各サービスのサイドカープロキシ（Envoy）を通してサービスディスカバリ・ロードバランシング・相互TLS・サーキットブレーカー・テレメトリを、アプリケーションコードを変更せずに実現する仕組みである。

マイクロサービスが増えると、サービス間通信の管理が爆発的に複雑になる。リトライ・タイムアウト・サーキットブレーカー・相互TLS・トレーシングを各サービスで個別実装すると膨大なコードになる。サービスメッシュはこれをインフラ層に引き下げる。

**Envoy** はC++で書かれた高性能プロキシだ。各マイクロサービスのPodにサイドカーコンテナとして注入され、全ての受信・送信トラフィックをプロキシする。HTTP/2・gRPC・TCP対応、高機能なロードバランシング、詳細なテレメトリ収集が特徴だ。

**Istio** はEnvoyを制御するコントロールプレーンだ。`istiod`（Pilot・Citadel・Galleyが統合）がEnvoyの設定を管理する。**Pilot**はサービスディスカバリとルーティングルールをEnvoyに配布する。**Citadel**は証明書を管理してサービス間の相互TLS（mTLS）を実現する。**Mixer**（廃止済み）はポリシー適用とテレメトリ収集を担っていた。

**トラフィック管理**ではVirtualServiceとDestinationRuleというカスタムリソースで高度なルーティングを設定できる。カナリアリリース（新バージョンに5%だけトラフィックを流す）、A/Bテスト、障害注入テストなどをYAMLで設定できる。

## Istio のコンポーネント

| コンポーネント | 場所 | 役割 |
|--------------|------|------|
| Envoy Proxy | データプレーン（各Pod） | 実際のトラフィックを処理 |
| istiod | コントロールプレーン | Envoy の設定を管理・配布 |
| VirtualService | 設定 | ルーティングルール定義 |
| DestinationRule | 設定 | 宛先ポリシー（LB・mTLS・CB）定義 |
| Gateway | 設定 | 外部からのトラフィックのエントリポイント |
| PeerAuthentication | 設定 | mTLS モードの設定 |

```yaml
# Istio による高度なトラフィック管理設定例

# ===== VirtualService: ルーティングルール =====
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: order-service
  namespace: default
spec:
  hosts:
    - order-service
  http:
    # カナリアリリース: v2 に5%のトラフィックを流す
    - match:
        - headers:
            canary:
              exact: "true"    # ヘッダーがある場合は常にv2へ
      route:
        - destination:
            host: order-service
            subset: v2
    - route:
        - destination:
            host: order-service
            subset: v1          # 95%は既存バージョン
          weight: 95
        - destination:
            host: order-service
            subset: v2          # 5%を新バージョンに
          weight: 5
      # タイムアウト設定
      timeout: 3s
      # リトライ設定
      retries:
        attempts: 3
        perTryTimeout: 1s
        retryOn: "5xx,reset,connect-failure,retriable-4xx"

---
# ===== DestinationRule: 宛先ポリシー =====
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: order-service
  namespace: default
spec:
  host: order-service
  # mTLS: サービス間通信を相互TLSで暗号化
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL       # Istio が管理する証明書で mTLS
    # サーキットブレーカー設定
    outlierDetection:
      consecutive5xxErrors: 5  # 5xx が5回連続でエジェクト
      interval: 10s            # 検査間隔
      baseEjectionTime: 30s    # エジェクト期間
      maxEjectionPercent: 50   # 最大エジェクト割合
    # コネクションプール設定（過負荷防止）
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
  # サブセット定義（カナリアリリース用）
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2

---
# ===== PeerAuthentication: mTLS ポリシー =====
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: default
spec:
  mtls:
    mode: STRICT               # STRICT: mTLS のみ許可

---
# ===== Gateway: 外部トラフィックのエントリポイント =====
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: main-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: main-cert    # cert-manager で管理する証明書
      hosts:
        - "api.example.com"

---
# ===== VirtualService for Gateway =====
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: main-vs
  namespace: default
spec:
  hosts:
    - "api.example.com"
  gateways:
    - main-gateway
  http:
    - match:
        - uri:
            prefix: /api/v1/orders
      route:
        - destination:
            host: order-service
            port:
              number: 8080
    - match:
        - uri:
            prefix: /api/v1/inventory
      route:
        - destination:
            host: inventory-service
            port:
              number: 8080
```

## 使用場面

- KubernetesクラスタのサービスにmTLSを適用してゼロトラストなサービス間通信を実現する場合
- カナリアリリースやA/Bテストをアプリケーションコードを変更せずにインフラレベルで制御する場合
- Jaeger・KialiとIstioを組み合わせて分散トレーシングとサービスマップを可視化する場合
- サーキットブレーカーと障害注入（Fault Injection）でカオスエンジニアリングを実施する場合

## 参考文献

- [Istio ドキュメント](https://istio.io/latest/docs/)
- [Envoy Proxy ドキュメント](https://www.envoyproxy.io/docs/)
- [Service Mesh Interface (SMI)](https://smi-spec.io/)

<AffiliateBanner site="cloud_navi" />
