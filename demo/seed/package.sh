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
tar -cf ../../dist/astrix-demo-seed.tar meridian.db vellum.db proof.db fieldnotes.db
gzip -n -f ../../dist/astrix-demo-seed.tar
cd ../../dist
if command -v sha256sum >/dev/null 2>&1; then
  sha256sum astrix-demo-seed.tar.gz > astrix-demo-seed.tar.gz.sha256
else
  shasum -a 256 astrix-demo-seed.tar.gz > astrix-demo-seed.tar.gz.sha256
fi
cat astrix-demo-seed.tar.gz.sha256
