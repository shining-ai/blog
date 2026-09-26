import AffiliateBanner from '@site/src/components/AffiliateBanner';

# クラウドネイティブの考え方（12 Factor App）

## クラウドネイティブとは

> クラウドネイティブとは、クラウド環境の弾力性・スケーラビリティ・運用効率を最大限に活かすために設計されたアプリケーションのアーキテクチャ手法であり、コンテナ・マイクロサービス・宣言的API・不変インフラを中核とする。

クラウドに「移行する」だけでは真のメリットは得られない。クラウドのスケーリング・耐障害性・運用自動化を活かすには、アプリケーション自体をクラウド向けに設計する必要がある。

**12 Factor App**はHerokuの開発者が2012年に提唱したクラウドネイティブアプリケーションの方法論だ。SaaSアプリケーションを構築するための12の原則を定義しており、現在もクラウドネイティブ設計の基本として広く参照されている。

12原則の中で特に重要なものを挙げると、**III. 設定（Config）**はコードと設定を分離し環境変数で管理すること、**IV. バックエンドサービス**はDBやキャッシュをアタッチされたリソースとして扱うこと、**VI. プロセス**はステートレスな実行プロセスとしてアプリを設計すること、**VIII. 並行性**はプロセスを増やすことでスケールすること、**XI. ログ**はログをイベントストリームとして扱うことなどだ。

CNCFはクラウドネイティブをさらに発展させ、コンテナ・サービスメッシュ・マイクロサービス・不変インフラ・宣言的APIを組み合わせたエコシステムを定義している。

## 12 Factor App の原則一覧

| # | 原則 | 概要 |
|---|------|------|
| I | コードベース | 1つのコードベースから複数デプロイ |
| II | 依存関係 | 依存を明示的に宣言・分離する |
| III | 設定 | 設定を環境変数に保存する |
| IV | バックエンドサービス | サービスをアタッチされたリソースとして扱う |
| V | ビルド・リリース・実行 | 3ステージを厳密に分離する |
| VI | プロセス | ステートレスなプロセスとして実行する |
| VII | ポートバインディング | ポートバインディングでサービスを公開する |
| VIII | 並行性 | プロセスモデルでスケールアウトする |
| IX | 廃棄容易性 | 高速起動・グレースフルシャットダウン |
| X | 開発/本番の等価性 | すべての環境をできる限り同じにする |
| XI | ログ | ログをイベントストリームとして扱う |
| XII | 管理プロセス | 管理タスクを1回限りのプロセスで実行する |

```python
# 12 Factor App の原則 III「設定」の実践例
# NG: コードに設定をハードコード
# database_url = "postgres://user:password@localhost/mydb"

# OK: 環境変数から読み込む
import os
from urllib.parse import urlparse

database_url = os.environ.get('DATABASE_URL')
if not database_url:
    raise RuntimeError("DATABASE_URL environment variable is required")

redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379')
port = int(os.environ.get('PORT', '8080'))

# 12 Factor App 原則 XI「ログ」の実践例
# NG: ファイルへのログ出力
# logging.FileHandler('/var/log/app.log')

# OK: 標準出力への出力（収集はインフラ側に任せる）
import logging
import json
import sys

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            'timestamp': self.formatTime(record),
            'level': record.levelname,
            'message': record.getMessage(),
            'module': record.module,
        }
        return json.dumps(log_data, ensure_ascii=False)

handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(JSONFormatter())
logger = logging.getLogger(__name__)
logger.addHandler(handler)
logger.setLevel(logging.INFO)

logger.info("Application started", extra={'port': port})
```

```yaml
# Kubernetes でのシークレットと ConfigMap を使った設定管理
# 原則 III: 設定を環境変数から注入する
apiVersion: v1
kind: ConfigMap
metadata:
  name: myapp-config
data:
  PORT: "8080"
  LOG_LEVEL: "info"
  REDIS_URL: "redis://redis-service:6379"
---
apiVersion: v1
kind: Secret
metadata:
  name: myapp-secret
type: Opaque
stringData:
  DATABASE_URL: "postgres://user:password@db-service:5432/mydb"
  SECRET_KEY: "supersecretkey"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      containers:
        - name: myapp
          image: myapp:v1.0
          envFrom:
            - configMapRef:
                name: myapp-config
            - secretRef:
                name: myapp-secret
```

## 使用場面

- Kubernetesやコンテナプラットフォームにアプリケーションをデプロイする設計段階
- マイクロサービスへの分割を検討する際のアーキテクチャ原則として
- 既存のモノリシックアプリケーションをクラウドに最適化する際のガイドライン
- CI/CDパイプラインと組み合わせたデプロイ戦略の設計

## 参考文献

- [The Twelve-Factor App](https://12factor.net/ja/)
- [CNCF — クラウドネイティブの定義](https://github.com/cncf/toc/blob/main/DEFINITION.md)
- [Google Cloud — クラウドネイティブアーキテクチャ](https://cloud.google.com/architecture/framework)

<AffiliateBanner site="cloud_navi" />
