FROM node:16.13.2-alpine as builder
WORKDIR /tmp

# dependencies
RUN mkdir frontend
COPY ./package*.json ./frontend/
RUN	(cd frontend && npm install)

# build config
ARG NEXT_PUBLIC_CHAIN_ID
ARG NEXT_PUBLIC_GOOGLE_TAG_MANAGER
ARG NEXT_PUBLIC_ENABLE_BEST_LOOT_CALCULATION=1
ARG NEXT_PUBLIC_MAINNET_RELAY_URL
ARG NEXT_PUBLIC_RINKEBY_RELAY_URL
ARG NEXT_TELEMETRY_DISABLED=1

# ensure all the required args exist
RUN echo "checking build args" \
	&& test -n "$NEXT_PUBLIC_CHAIN_ID" \
	&& test -n "$NEXT_PUBLIC_GOOGLE_TAG_MANAGER" \
	&& echo "ok"

# build
COPY . ./frontend
RUN (cd frontend && npm run build)

# final image
FROM nginx:1.21.5
RUN rm -rf /usr/share/nginx/html
COPY --from=builder /tmp/frontend/out /usr/share/nginx/html
COPY unity-ui /usr/share/nginx/html/seeker-soul-minter

# nginx config for nextjs apps
COPY ./redirects.conf /etc/nginx/redirects.conf
RUN echo '                                               \
	server_tokens off;                                   \
	server {                                             \
		listen       80;                                 \
		root   /usr/share/nginx/html;                    \
		include /etc/nginx/redirects.conf;               \
		location /_next/static {                         \
			add_header Cache-Control "max-age=31536000"; \
		}                                                \
		location / {                                     \
			try_files $uri.html  $uri $uri/ /index.html; \
			add_header Cache-Control "no-cache";         \
		}                                                \
	}                                                    \
' > /etc/nginx/conf.d/default.conf

