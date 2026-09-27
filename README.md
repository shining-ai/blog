# blog

コンピュータサイエンスを分野ごとに解説する Docusaurus サイト群のモノレポ。
各サイトは独立したディレクトリで、それぞれ別のサブドメインで公開する。

## サイト一覧

| ディレクトリ | サイト名 | ポート | 公開URL |
| --- | --- | --- | --- |
| `algorithm_navi` | アルゴリズムナビ | 3003 | https://algorithm.nisshingeppo.com |
| `system_navi` | システムナビ | 3004 | https://system.nisshingeppo.com |
| `ml_navi` | 機械学習ナビ | 3005 | https://ml.nisshingeppo.com |
| `theory_navi` | 計算理論ナビ | 3006 | https://theory.nisshingeppo.com |
| `network_navi` | ネットワークナビ | 3007 | https://network.nisshingeppo.com |
| `db_navi` | データベースナビ | 3008 | https://db.nisshingeppo.com |
| `language_navi` | プログラミング言語ナビ | 3009 | https://language.nisshingeppo.com |
| `software_navi` | ソフトウェア工学ナビ | 3010 | https://software.nisshingeppo.com |
| `cloud_navi` | クラウドナビ | 3011 | https://cloud.nisshingeppo.com |
| `security_navi` | セキュリティナビ | 3012 | https://security.nisshingeppo.com |
| `graphics_navi` | グラフィックスナビ | 3013 | https://graphics.nisshingeppo.com |

サイト名とディレクトリ名、サブドメインは対応している（`algorithm_navi` → アルゴリズムナビ → `algorithm.`）。

## ローカルでの動作確認

Docker Compose でサイトごとに1コンテナを立てる。サービス名はディレクトリ名と同じ。

### 1つのサイトだけ起動する

普段はこちらを使う。全サイトを起動すると時間もメモリも食うため、触るサイトだけ立てるのが速い。

```bash
docker compose up -d theory_navi
```

起動後 http://localhost:3006 で開く。指定したサービスだけが起動し、他のポートは開かない。

ログを追う場合:

```bash
docker compose logs -f theory_navi
```

`client compiled successfully` が出れば表示できる状態。MDX の書き方に問題があると
`MDX compilation failed for file ...` がここに出るので、ビルドが通らないときは必ず確認する。

停止:

```bash
docker compose stop theory_navi
```

### 全サイトを起動する

```bash
docker compose up -d
```

11サイトすべてが 3003〜3013 で立ち上がる。

停止（コンテナを削除する）:

```bash
docker compose down
```

### 初回起動は時間がかかる

`node_modules` は named volume に置いているため、そのサイトを初めて起動したときは
コンテナ内で `yarn install` が走る。1サイトあたり数分かかり、その間 HTTP は応答しない。
2回目以降は volume が再利用されるので速い。

記事を追加・編集した場合はホットリロードが効くので、コンテナの再起動は不要。
`docusaurus.config.ts` や `sidebars.ts` を変更したときは再起動する。

```bash
docker compose restart theory_navi
```

### 依存を追加したとき

`package.json` を変更した場合はコンテナを作り直して `yarn install` を再実行させる。

```bash
docker compose up -d --force-recreate theory_navi
```

## 記事を書くときの注意

Docusaurus 3 は `.md` も MDX として解釈するため、本文中の記号がビルドを壊すことがある。

| 記号 | 問題 | 対処 |
| --- | --- | --- |
| `{` | JavaScript の式として解釈される | `\{` とエスケープする。数式なら下記の KaTeX を使う |
| `<<` `<:` `<M>` など | JSX タグの開始として解釈される | `\<` とエスケープする |

`<` の直後が空白なら問題ない（`a < b` はそのまま書ける）。
コードブロックとインラインコードの中は解釈されないので、エスケープは不要。

数式は `ml_navi` のみ KaTeX を有効にしている（`remark-math` + `rehype-katex`）。
`$...$` と `$$...$$` がそのまま書ける。他サイトで数式を使う場合は同じ設定を追加する。

## 初回構築

必要なファイルをDockerコンテナ内で作成して、ローカルにコピーする

```
 docker build -t docusaurus-setup .
 docker run -itd --name docusaurus-init docusaurus-setup
 docker cp docusaurus-init:/app/my-website ./my-website
 docker rm -f docusaurus-init
```

> この手順は `Dockerfile` に `yarn create docusaurus my-website classic --typescript` が
> あった時代のもので、現在の `Dockerfile` からその行は削除されている（96fc98d）ため、
> このままでは `docker cp` が失敗する。新しいサイトを追加する際は手順の見直しが必要。

## 構成

- `docker-compose.yml` — 11サイト分のサービス定義。`node_modules` と `.docusaurus` は
  ホストのバインドマウントに隠されないよう named volume に分離している
- `Dockerfile` — 全サイト共通。`node:20` に corepack で yarn 1.22.22 を固定
- `cs_navi_all_sitemap.md` — サイト群全体の構成とトピック配置
- パッケージマネージャは **yarn** に統一している（`package-lock.json` は `.gitignore` 済み）

## デプロイ

Vercel でサイトごとに Project を作り、Root Directory にディレクトリ名を指定する。
Production Branch は全 Project とも `main`。詳細は Issue を参照。
