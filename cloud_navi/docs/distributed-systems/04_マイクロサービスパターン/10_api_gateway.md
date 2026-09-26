import AffiliateBanner from '@site/src/components/AffiliateBanner';

# API ゲートウェイ

## API ゲートウェイとは

> API ゲートウェイ（API Gateway）とは、クライアントとバックエンドの複数のマイクロサービスの間に位置する単一のエントリポイントであり、認証・認可・レート制限・ルーティング・ロードバランシング・ログ・SSL終端などの横断的関心事を一元管理するミドルウェアである。

マイクロサービスアーキテクチャでは、注文サービス・在庫サービス・ユーザーサービスなど多数のサービスが存在する。クライアントが各サービスを直接呼び出すと、クライアントがサービスのアドレスを全て知る必要があり、各サービスで認証ロジックを重複実装することになる。API ゲートウェイはこの問題を解決するファサードだ。

**主要機能**として、**認証・認可**（JWT検証・OAuth2トークン確認を一箇所で処理）、**レート制限**（DoS攻撃対策・クライアントごとのAPI呼び出し上限）、**リクエストルーティング**（パスやホストヘッダーに基づいて適切なサービスにプロキシ）、**SSL終端**（ゲートウェイで証明書を処理し、内部はHTTPで通信）、**リクエスト/レスポンス変換**（レガシーサービスのインターフェースをクライアントに合わせて変換）がある。

**BFF（Backend for Frontend）パターン**はAPI ゲートウェイの発展形だ。モバイルアプリ・Webアプリ・サードパーティAPIで求めるデータ形式が異なる場合、それぞれ専用のゲートウェイ（BFF）を設ける。モバイル向けBFFはレスポンスを軽量化し、Web向けBFFは複数サービスのデータを集約できる。

代表的な実装としてAWSではAmazon API Gateway、KubernetesではIngress Controller（NGINX・Traefik）、Kong・Envoy・Istio Ingress Gatewayが広く使われる。

## API ゲートウェイの主要機能

| 機能 | 説明 | 実装例 |
|------|------|--------|
| ルーティング | パス・ホストによる転送先決定 | `/api/orders/*` → 注文サービス |
| 認証・認可 | JWT/OAuth2 トークン検証 | Authorization ヘッダーの検証 |
| レート制限 | API 呼び出し頻度の制限 | 100 req/min per client |
| SSL 終端 | HTTPS を内部で HTTP に変換 | Let's Encrypt 証明書を管理 |
| ロードバランシング | 複数インスタンスへの分散 | Round Robin・最小接続数 |
| キャッシュ | レスポンスのキャッシュ | GET リクエストの TTL キャッシュ |
| ログ・メトリクス | アクセスログ・レイテンシ計測 | Datadog・CloudWatch |

```yaml
# Kong API Gateway の設定例 (declarative config)
# Kong は高機能なオープンソース API ゲートウェイ

_format_version: "3.0"

services:
  # 注文サービスへのルーティング
  - name: order-service
    url: http://order-service:8080
    routes:
      - name: order-route
        paths:
          - /api/v1/orders
        methods:
          - GET
          - POST
          - PUT
    plugins:
      # JWT 認証プラグイン
      - name: jwt
        config:
          claims_to_verify:
            - exp
          key_claim_name: kid
      # レート制限プラグイン
      - name: rate-limiting
        config:
          minute: 100          # 1分間に100リクエスト
          hour: 2000           # 1時間に2000リクエスト
          policy: redis        # Redis で分散カウント管理
          redis_host: redis
          redis_port: 6379

  # 在庫サービスへのルーティング
  - name: inventory-service
    url: http://inventory-service:8080
    routes:
      - name: inventory-route
        paths:
          - /api/v1/inventory
        methods:
          - GET
    plugins:
      - name: jwt
        config:
          claims_to_verify:
            - exp
      # レスポンスキャッシュ（在庫は短期間のキャッシュが有効）
      - name: proxy-cache
        config:
          response_code:
            - 200
          request_method:
            - GET
          content_type:
            - application/json
          cache_ttl: 30        # 30秒キャッシュ
          strategy: memory

  # ユーザーサービス（認証不要のパブリックAPI）
  - name: user-service
    url: http://user-service:8080
    routes:
      - name: user-auth-route
        paths:
          - /api/v1/auth
        methods:
          - POST
    # 認証不要（ログイン・登録エンドポイント）

# グローバルプラグイン（全サービスに適用）
plugins:
  # CORS 設定
  - name: cors
    config:
      origins:
        - https://example.com
        - https://app.example.com
      methods:
        - GET
        - POST
        - PUT
        - DELETE
      headers:
        - Authorization
        - Content-Type
      max_age: 3600

  # アクセスログ
  - name: http-log
    config:
      http_endpoint: http://log-aggregator:8080/kong-logs
      method: POST
```

```python
# AWS API Gateway + Lambda オーソライザーの実装例

import json
import os
import jwt  # PyJWT

SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key')

def lambda_handler(event, context):
    """
    AWS Lambda オーソライザー
    API Gateway はすべてのリクエストをここに通して認証する
    """
    token = event.get('authorizationToken', '')
    method_arn = event['methodArn']

    if not token.startswith('Bearer '):
        return generate_policy('user', 'Deny', method_arn)

    try:
        token_value = token[7:]  # "Bearer " を除去
        payload = jwt.decode(token_value, SECRET_KEY, algorithms=['HS256'])
        user_id = payload.get('sub')
        # 検証成功: アクセスを許可
        return generate_policy(user_id, 'Allow', method_arn, payload)
    except jwt.ExpiredSignatureError:
        return generate_policy('user', 'Deny', method_arn)
    except jwt.InvalidTokenError:
        return generate_policy('user', 'Deny', method_arn)


def generate_policy(principal_id: str, effect: str,
                    resource: str, context: dict = None) -> dict:
    """IAM ポリシードキュメントを生成"""
    policy = {
        'principalId': principal_id,
        'policyDocument': {
            'Version': '2012-10-17',
            'Statement': [{
                'Action': 'execute-api:Invoke',
                'Effect': effect,
                'Resource': resource
            }]
        }
    }
    if context:
        # バックエンドサービスに渡すコンテキスト情報
        policy['context'] = {
            'userId': context.get('sub', ''),
            'role': context.get('role', 'user')
        }
    return policy
```

## 使用場面

- マイクロサービスの認証・認可ロジックをAPI Gatewayに集約し、各サービスの実装をシンプルにする場合
- モバイルアプリ・Webアプリで必要なデータが異なる場合にBFFパターンでそれぞれ最適化する場合
- サードパーティへのAPIとして公開する際にレート制限・APIキー管理・使用量モニタリングを行う場合
- KubernetesでIngress Controllerとして外部からのトラフィックをルーティングする場合

## 参考文献

- [Kong Gateway ドキュメント](https://docs.konghq.com/)
- [AWS API Gateway ドキュメント](https://docs.aws.amazon.com/apigateway/)
- [Microservices Patterns — Chris Richardson](https://microservices.io/patterns/apigateway.html)

<AffiliateBanner site="cloud_navi" />
