FROM node:18-bookworm-slim
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y git curl bash python3 make gcc g++ && \
    apt-get clean 

# foundry
SHELL ["/bin/bash", "-c"]
ENV PATH "/root/.foundry/bin:$PATH"
RUN curl -L https://foundry.paradigm.xyz | bash \
    && foundryup --version nightly-ca67d15f4abd46394b324c50e21e66f306a1162d \
    && which forge

# copy in contracts
RUN mkdir -p /contracts
WORKDIR /contracts
COPY contracts/lib ./lib
COPY contracts/src ./src
COPY contracts/script ./script
COPY contracts/test ./test
COPY contracts/remappings.txt ./
COPY contracts/foundry.toml ./
COPY contracts/entrypoint.sh ./
RUN forge build

# install ds-cli
WORKDIR /
COPY package*.json ./
COPY cli ./cli
COPY core ./core
RUN npm config set fetch-retry-maxtimeout 300000 \
    && npm install -g npm@9 \
    && npm ci \
    && npm run build -w core \
    && npm run build -w cli \
    && npm install -g ./cli
RUN ds version

# env
WORKDIR /contracts
ENV DOCKER=true
ENV NODE_ENV=production
ENTRYPOINT ["/contracts/entrypoint.sh"]
CMD []
