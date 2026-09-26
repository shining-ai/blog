import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Dockerfile のベストプラクティス

## Dockerfile とは

> Dockerfile とは、Dockerイメージを自動的にビルドするためのテキスト形式の設定ファイルであり、ベースイメージの選択からアプリケーションのセットアップまでを宣言的に記述する。

Dockerfileの品質はイメージのセキュリティ・サイズ・ビルド速度に直接影響する。適切に書かれたDockerfileはイメージサイズを最小化し、レイヤーキャッシュを活用して高速なビルドを実現し、セキュリティリスクを低減する。

**マルチステージビルド**は最も重要なベストプラクティスの一つだ。ビルド時に必要なコンパイラやビルドツールを含む「ビルドステージ」と、実行時に必要なバイナリのみを含む「ランタイムステージ」を分離することで、最終イメージを大幅に軽量化できる。

**レイヤーキャッシュ**を意識した命令の順序も重要だ。変更頻度の低い命令（OSパッケージのインストール）を先に、変更頻度の高い命令（アプリケーションコードのコピー）を後に配置することで、不要なレイヤーの再ビルドを避けられる。

**非rootユーザー**での実行はセキュリティ上の基本原則だ。コンテナがrootで動作していると、コンテナエスケープの際のリスクが高まる。

## Dockerfile の主要命令

| 命令 | 用途 |
|------|------|
| FROM | ベースイメージの指定 |
| RUN | ビルド時のコマンド実行 |
| COPY / ADD | ファイルのコピー |
| ENV | 環境変数の設定 |
| EXPOSE | ポートの公開宣言 |
| USER | 実行ユーザーの切り替え |
| ENTRYPOINT | コンテナ起動時のメインコマンド |
| CMD | ENTRYPOINT へのデフォルト引数 |

```dockerfile
# ---- ベストプラクティスに沿った Dockerfile 例（Go アプリケーション）----

# --- ステージ1: ビルド ---
FROM golang:1.22-alpine AS builder

# セキュリティアップデートを適用し、不要なキャッシュを削除
RUN apk update && apk add --no-cache git ca-certificates tzdata

WORKDIR /build

# 依存関係ファイルを先にコピー（キャッシュ効率化）
COPY go.mod go.sum ./
RUN go mod download

# ソースコードをコピーしてビルド
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/server ./cmd/server

# --- ステージ2: 実行環境 ---
FROM scratch

# タイムゾーンと証明書をビルドステージからコピー
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# バイナリのみをコピー
COPY --from=builder /app/server /server

# 非rootユーザーで実行
USER 65534:65534

EXPOSE 8080

ENTRYPOINT ["/server"]
```

```dockerfile
# ---- Node.js アプリケーションの例 ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

# 非rootユーザーを作成
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

USER nextjs
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

## 使用場面

- 本番環境向けのイメージを軽量・セキュアに作成する場合
- CI/CDパイプラインで再現性の高いビルドを実現する場合
- コンパイル言語（Go・Java・Rust）のバイナリを最小イメージで配布する場合
- セキュリティスキャンを通過するために不要なパッケージを排除する場合

## 参考文献

- [Dockerfile ベストプラクティス — Docker 公式](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Docker マルチステージビルド](https://docs.docker.com/build/building/multi-stage/)
- [Google — コンテナビルドのベストプラクティス](https://cloud.google.com/architecture/best-practices-for-building-containers)

<AffiliateBanner site="cloud_navi" />
