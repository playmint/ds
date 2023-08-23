FROM node:18-alpine AS builder
RUN apk add --update python3 make g++\
   && rm -rf /var/cache/apk/*
WORKDIR /app
COPY docs ./docs
RUN cd docs && npm ci && npm run build

# output image
FROM caddy:2.6.4
COPY --from=builder /app/docs/build /usr/share/caddy
COPY frontend/Caddyfile /etc/caddy/Caddyfile

