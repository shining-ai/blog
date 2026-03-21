FROM node:20

WORKDIR /app

RUN corepack enable && corepack prepare yarn@1.22.22 --activate

CMD ["/bin/bash"]
