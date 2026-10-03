#!/bin/sh
# Build the release artifact consumed by demo/docker-compose.yml.
set -eu

cd "$(dirname "$0")"

for db in meridian.db vellum.db proof.db fieldnotes.db; do
  if [ ! -f "$db" ]; then
    echo "Missing $db" >&2
    exit 1
  fi
done

mkdir -p ../../dist
tar -czf ../../dist/astrix-demo-seed.tar.gz meridian.db vellum.db proof.db fieldnotes.db
sha256sum ../../dist/astrix-demo-seed.tar.gz > ../../dist/astrix-demo-seed.tar.gz.sha256

cat ../../dist/astrix-demo-seed.tar.gz.sha256
