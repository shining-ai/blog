import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Docker Compose

## Docker Compose とは

> Docker Compose とは、複数のコンテナで構成されるアプリケーションをYAMLファイルで宣言的に定義し、単一のコマンドで起動・停止・管理するためのツールである。

実際のアプリケーションは複数のサービスで構成されることがほとんどだ。Webサーバ・アプリケーションサーバ・データベース・キャッシュサーバなどが連携して動作する。これらを毎回`docker run`コマンドで個別に起動・ネットワーク設定するのは手間がかかり、ミスも起きやすい。

Docker Composeを使えば、この複数コンテナ構成を`docker-compose.yml`（v2以降は`compose.yml`）に記述し、`docker compose up`一発で全サービスを起動できる。開発環境の共有や、新メンバーのオンボーディングを大幅に効率化できる。

Compose v2ではDocker本体に統合され、`docker-compose`（ハイフン）から`docker compose`（スペース）に変更された。ヘルスチェック・依存関係・ボリューム・ネットワークなどを柔軟に設定できる。

**プロファイル機能**を使えば開発用サービス（テストDB・モニタリングツールなど）と本番用サービスを分けて管理できる。**環境変数ファイル（.env）**と組み合わせることで、環境ごとに設定を切り替えることも容易だ。

## docker compose の主要コマンド

| コマンド | 用途 |
|---------|------|
| `docker compose up -d` | サービスをバックグラウンドで起動 |
| `docker compose down` | サービスの停止・削除 |
| `docker compose ps` | サービスの状態確認 |
| `docker compose logs -f` | ログのフォロー |
| `docker compose exec <svc> sh` | サービスコンテナに入る |
| `docker compose build` | イメージのビルド |
| `docker compose pull` | イメージのプル |

```yaml
# compose.yml — Web + API + DB + Redis の構成例

name: myapp

services:
  # フロントエンド
  web:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - API_URL=http://api:8080
    depends_on:
      api:
        condition: service_healthy
    restart: unless-stopped

  # バックエンドAPI
  api:
    build:
      context: ./backend
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgres://user:password@db:5432/mydb
      - REDIS_URL=redis://redis:6379
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  # PostgreSQL
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: mydb
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d mydb"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis キャッシュ
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:

networks:
  default:
    driver: bridge
```

## 使用場面

- ローカル開発環境でマイクロサービスの全スタックを再現する場合
- E2Eテストで実際のデータベースやキャッシュを含む環境を起動する場合
- 開発チーム全員が同じ環境で作業するための標準化
- 小規模な本番環境でのシンプルなマルチコンテナデプロイ

## 参考文献

- [Docker Compose 公式ドキュメント](https://docs.docker.com/compose/)
- [Compose ファイルリファレンス](https://docs.docker.com/compose/compose-file/)
- [Docker Compose ベストプラクティス](https://docs.docker.com/compose/production/)

<AffiliateBanner site="cloud_navi" />
