FROM golang:1.23

# install build essentials
RUN apt-get update
RUN apt-get install -y wget unzip nginx p7zip libnginx-mod-http-lua libnginx-mod-http-ndk build-essential pkg-config --no-install-recommends

RUN apt-get install -y --no-install-recommends ca-certificates git && \
    update-ca-certificates && \
    git config --global http.sslVerify false

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
# Allow go build to update go.sum automatically when new dependencies are
# introduced via the volume-mounted source tree (e.g. lego/v4 on first boot).
ENV GOFLAGS=-mod=mod

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