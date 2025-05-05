FROM node:18

WORKDIR /app

RUN corepack enable

# プロジェクトを作成
RUN corepack enable
RUN yarn create docusaurus my-website classic --typescript

WORKDIR /app/my-website

CMD ["/bin/bash"]
