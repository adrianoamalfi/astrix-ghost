FROM alpine:3.20

# Install once at build time so recreating populated volumes works offline.
RUN apk add --no-cache ca-certificates curl openssl sqlite tar
