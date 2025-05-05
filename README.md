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

