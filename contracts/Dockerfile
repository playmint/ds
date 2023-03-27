FROM playmint/foundry:v0.8.17

ENV FOUNDRY_SOLC_VERSION=0.8.17
ENV FOUNDRY_OFFLINE=true

# deps
RUN apk add watchexec --repository=https://dl-cdn.alpinelinux.org/alpine/edge/testing
RUN apk add curl bash

# workdir
RUN mkdir -p /contracts
WORKDIR /contracts

COPY lib ./lib
COPY src ./src
COPY script ./script
COPY test ./test
COPY remappings.txt ./
COPY foundry.toml ./
COPY entrypoint.sh ./

RUN forge build

ENV DOCKER=true
ENV NODE_ENV=production
ENTRYPOINT ["/contracts/entrypoint.sh"]
CMD []
