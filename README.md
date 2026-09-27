# blog
document風のブログ環境の構築


## 初回構築
必要なファイルをDockerコンテナ内で作成して、ローカルにコピーする
```
 docker build -t docusaurus-setup .
 docker run -itd --name docusaurus-init docusaurus-setup
 docker cp docusaurus-init:/app/my-website ./my-website
 docker rm -f docusaurus-init 
```


## ローカル起動
サイトを1つ指定して起動する（サービス名はディレクトリ名と同じ）
```
 docker compose up -d theory_navi
 docker compose logs -f theory_navi
 docker compose stop theory_navi
```
全サイト起動は `docker compose up -d`、停止は `docker compose down`
初回はコンテナ内で `yarn install` が走るため数分かかる

| ポート | ディレクトリ | サイト名 |
| --- | --- | --- |
| 3003 | algorithm_navi | アルゴリズムナビ |
| 3004 | system_navi | システムナビ |
| 3005 | ml_navi | 機械学習ナビ |
| 3006 | theory_navi | 計算理論ナビ |
| 3007 | network_navi | ネットワークナビ |
| 3008 | db_navi | データベースナビ |
| 3009 | language_navi | プログラミング言語ナビ |
| 3010 | software_navi | ソフトウェア工学ナビ |
| 3011 | cloud_navi | クラウドナビ |
| 3012 | security_navi | セキュリティナビ |
| 3013 | graphics_navi | グラフィックスナビ |
