
# build the contracts to get the abi
FROM playmint/foundry:v0.8.17 AS contracts
ENV FOUNDRY_SOLC_VERSION=0.8.17
ENV FOUNDRY_OFFLINE=true
WORKDIR /contracts
COPY contracts /contracts
RUN forge build

# build frontend
FROM node:bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && \
    apt-get install -y python3 python3-pip
RUN rm -rf /var/cache/apk/*
COPY package*.json ./
COPY frontend ./frontend
COPY docs ./docs
COPY frontend/public/ds-unity ./frontend/public/ds-unity
COPY core ./core
COPY cli ./cli
COPY --from=contracts /contracts/lib/cog/services/schema/*.graphqls ./contracts/lib/cog/services/schema/
COPY --from=contracts /contracts/out/Actions.sol/Actions.json ./contracts/out/Actions.sol/Actions.json
RUN npm ci
RUN npm run build:abi -w core
RUN npm run build:graphql -w core
ENV NEXT_TELEMETRY_DISABLED 1
WORKDIR /app
RUN npm install sharp
RUN npm run export -w frontend

# output image
FROM caddy:2.6.4
COPY --from=builder /app/frontend/out /usr/share/caddy
COPY frontend/Caddyfile /etc/caddy/Caddyfile

