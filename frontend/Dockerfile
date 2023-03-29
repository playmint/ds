# Install dependencies only when needed
FROM node:16-alpine AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
RUN apk add --update python3 make g++\
   && rm -rf /var/cache/apk/*
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY core/package*.json ./core/
RUN npm ci

# build the contracts to get the abi
FROM playmint/foundry:v0.8.17 AS contracts
ENV FOUNDRY_SOLC_VERSION=0.8.17
ENV FOUNDRY_OFFLINE=true
WORKDIR /contracts
COPY contracts /contracts
RUN forge build

# build static site
FROM node:16-alpine AS builder
ARG NEXT_PUBLIC_DEFAULT_COG_WS_ENDPOINT="ws://localhost:8080/query"
ARG NEXT_PUBLIC_DEFAULT_COG_HTTP_ENDPOINT="http://localhost:8080/query"
ENV NEXT_TELEMETRY_DISABLED 1
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY frontend ./frontend
# explicitly copy the ds-unity folder so build explodes if missing
COPY frontend/public/ds-unity ./frontend/public/ds-unity
COPY core ./core
COPY contracts/lib/cog/services/schema/*.graphqls ./contracts/lib/cog/services/schema/
COPY --from=contracts /contracts/out/Actions.sol/Actions.json ./contracts/out/Actions.sol/Actions.json
RUN npm install -w core
RUN npm run build -w core
RUN npm run export -w frontend

# output image
FROM caddy:2.6.4
COPY --from=builder /app/frontend/out /usr/share/caddy

