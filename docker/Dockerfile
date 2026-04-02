FROM nginx:1.27.1-alpine

RUN sed -i 's|https://dl-cdn.alpinelinux.org|http://dl-cdn.alpinelinux.org|g' /etc/apk/repositories && \
    apk update && \
    apk add --no-cache ca-certificates && \
    update-ca-certificates

# Install PHP, Nginx, and other required packages
RUN apk --no-cache add nano curl nginx p7zip supervisor nghttp2 \
    php83 php83-fpm php83-mysqli php83-json php83-openssl php83-curl \
    php83-zlib php83-xml php83-simplexml php83-phar php83-intl php83-dom php83-xmlreader php83-ctype php83-session \
    php83-mbstring php83-gd php83-pdo php83-pdo_pgsql php83-pdo_mysql \
    php83-posix php83-fileinfo php83-tokenizer php83-xmlwriter

# Configure nginx
COPY docker/config/nginx.conf /etc/nginx/nginx.conf

# Configure PHP-FPM
COPY docker/config/fpm-pool.conf /etc/php83/php-fpm.d/www.conf
RUN rm /etc/php83/php.ini
COPY docker/config/php.ini /etc/php83/php.ini

# Configure supervisord
COPY docker/config/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Setup document root
RUN mkdir -p /app/src
RUN mkdir -p /app/vendor
RUN mkdir -p /app/tests
RUN mkdir -p /var/run


RUN chown -R nobody:nobody /var/run
#RUN chown -R nobody:nobody /var/lib/nginx && \
#        chmod -R 777 /var/lib/nginx
RUN chmod +x /app/src/
RUN chmod +x /app/vendor/
RUN chmod +x /app/tests/
RUN chmod +x /var/run


# Add application
WORKDIR /app/src
COPY --chown=nobody src /app/src
COPY --chown=nobody vendor /app/vendor
COPY --chown=nobody tests /app/tests

RUN chown -R nobody:nobody /app/src
RUN chown -R nobody:nobody /app/vendor
RUN chown -R nobody:nobody /app/tests

# Configure supervisord
COPY docker/deploy/deploy.sh /deploy.sh
RUN chown -R nobody:nobody /deploy.sh
RUN chmod +x /deploy.sh

# Switch to use a non-root user from here on
#USER nobody

# Expose the port nginx is reachable on
EXPOSE 8080 4443

# Set the entry point to the deploy script
ENTRYPOINT ["/deploy.sh"]

# Configure a healthcheck to validate that everything is up&running
HEALTHCHECK --timeout=10s CMD curl --silent --fail http://localhost:8080/fpm-ping
