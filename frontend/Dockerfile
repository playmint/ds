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

# build static site
FROM node:16-alpine AS builder
ENV NEXT_TELEMETRY_DISABLED 1
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY frontend ./frontend
COPY core ./core
RUN npm run export -w frontend

# output image
FROM caddy:2.6.4
COPY --from=builder /app/frontend/out /usr/share/caddy

