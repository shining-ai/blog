import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Docker 入門（イメージ・コンテナ・レジストリ）

## Docker とは

> Docker とは、コンテナ技術を使ってアプリケーションをパッケージ化・配布・実行するためのプラットフォームであり、「ビルドしたらどこでも動く」という一貫した実行環境を提供する。

Dockerはコンテナ技術を開発者が手軽に扱えるようにした立役者だ。2013年に登場して以来、アプリケーション開発・デプロイのあり方を大きく変えた。

**Dockerイメージ**はアプリケーションとその依存関係を含む読み取り専用のテンプレートで、レイヤー構造を持つ。各レイヤーはファイルシステムの変更差分を表し、共通するレイヤーは複数のイメージ間でキャッシュ共有される。

**コンテナ**はイメージから生成される実行インスタンスだ。イメージに書き込みレイヤーを追加したもので、コンテナを削除するとその書き込みレイヤーも消える。データを永続化したい場合はボリュームを使う。

**レジストリ**はイメージを保存・配布するためのリポジトリサービスだ。Docker Hubはパブリックなレジストリとして最も広く使われており、AWS ECR・GCR・GitHub Container Registryなどのプライベートレジストリも広く利用されている。

Dockerのアーキテクチャはクライアントサーバモデルになっており、`docker`コマンド（クライアント）がDockerデーモン（`dockerd`）にリクエストを送り、デーモンがコンテナの管理を行う。

## Docker の主要コンポーネント

| コンポーネント | 役割 |
|--------------|------|
| Dockerfile | イメージのビルド定義ファイル |
| イメージ | 実行環境のテンプレート（読み取り専用） |
| コンテナ | イメージから生成した実行インスタンス |
| レジストリ | イメージの保存・配布サービス |
| ボリューム | 永続データの保存領域 |
| ネットワーク | コンテナ間通信の仮想ネットワーク |

```bash
# Docker のインストール確認
docker --version
docker info

# イメージのpull
docker pull nginx:1.25-alpine

# コンテナの起動（デタッチモード・ポートマッピング）
docker run -d -p 8080:80 --name web nginx:1.25-alpine

# 起動中のコンテナ一覧
docker ps

# コンテナ内でコマンド実行
docker exec -it web sh

# ログの確認
docker logs web

# コンテナの停止・削除
docker stop web
docker rm web

# イメージのビルド
docker build -t myapp:v1.0 .

# イメージをレジストリにプッシュ
docker tag myapp:v1.0 myregistry.example.com/myapp:v1.0
docker push myregistry.example.com/myapp:v1.0

# ボリュームを使ったデータ永続化
docker run -d -v mydata:/var/lib/mysql mysql:8.0

# ネットワークの作成とコンテナ接続
docker network create mynet
docker run -d --network mynet --name db mysql:8.0
docker run -d --network mynet --name app myapp:v1.0
```

## 使用場面

- ローカル開発環境と本番環境の差異を排除したい場合
- マイクロサービスの各コンポーネントを独立してビルド・デプロイする場合
- CI/CDパイプラインでテスト環境を毎回クリーンな状態から起動する場合
- 異なるバージョンのミドルウェアを同一マシンで並行稼働させる場合

## 参考文献

- [Docker 公式ドキュメント](https://docs.docker.com/)
- [Docker Hub](https://hub.docker.com/)
- [OCI Image Specification](https://github.com/opencontainers/image-spec)

<AffiliateBanner site="cloud_navi" />
