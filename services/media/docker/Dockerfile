FROM golang:1.23

# install build essentials
RUN apt-get update
RUN apt-get install -y wget unzip nginx p7zip libnginx-mod-http-lua libnginx-mod-http-ndk build-essential pkg-config --no-install-recommends

RUN apt-get install -y --no-install-recommends ca-certificates git && \
    update-ca-certificates && \
    git config --global http.sslVerify false

# Install ImageMagick deps
RUN apt-get -q -y install libjpeg-dev libpng-dev libtiff-dev \
    libgif-dev libx11-dev --no-install-recommends

ENV IMAGEMAGICK_VERSION=6.9.10-11

RUN cd && \
	wget https://github.com/ImageMagick/ImageMagick6/archive/${IMAGEMAGICK_VERSION}.tar.gz && \
	tar xvzf ${IMAGEMAGICK_VERSION}.tar.gz && \
	cd ImageMagick* && \
	./configure \
	    --without-magick-plus-plus \
	    --without-perl \
	    --disable-openmp \
	    --with-gvc=no \
	    --disable-docs && \
	make -j$(nproc) && make install && \
	ldconfig /usr/local/lib

# Setup document root
RUN mkdir -p /app/src
RUN mkdir -p /app/storage
RUN mkdir -p /app/logs
RUN mkdir -p /app/tmp
RUN mkdir -p /app/ssl

WORKDIR /app/src

# go.mod, go.sum and reflex.conf live at the root of the build context (services/media/src/)
COPY ./src/go.mod .
COPY ./src/go.sum .
COPY ./src/reflex.conf .

# Remove the default Nginx configuration
RUN rm /etc/nginx/sites-enabled/default

ENV GONOSUMDB=*
ENV GONOSUMCHECK=*
ENV GOPROXY=direct
ENV GOINSECURE=*

RUN go mod download

RUN go version
RUN go env GOVERSION
# Inline vars on go install — picks up the same env but stated explicitly
# so the intent is clear if this layer is ever extracted to a separate stage.
RUN GONOSUMDB=* GONOSUMCHECK=* GOPROXY=direct GOINSECURE=* \
    go install github.com/cespare/reflex@v0.3.1

COPY docker/setup/nginx.conf /etc/nginx/nginx.conf

# Configure the deploy module
COPY docker/deploy/deploy.sh /deploy.sh
RUN chmod +x /deploy.sh

EXPOSE 8080

# Set the entry point to the deploy script
ENTRYPOINT ["/deploy.sh"]