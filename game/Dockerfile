FROM nginxinc/nginx-unprivileged:alpine-slim
COPY --chown=101:101 nginx.conf /etc/nginx/conf.d/default.conf
COPY --chown=101:101 index.html /usr/share/nginx/html/index.html
COPY --chown=101:101 js/ /usr/share/nginx/html/js/
COPY --chown=101:101 styles/ /usr/share/nginx/html/styles/
EXPOSE 8080
