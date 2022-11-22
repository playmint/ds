# final image
FROM nginx:1.21.5
RUN rm -rf /usr/share/nginx/html
COPY unity-ui /usr/share/nginx/html/

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